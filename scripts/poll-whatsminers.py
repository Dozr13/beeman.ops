#!/usr/bin/env python3
import signal
signal.signal(signal.SIGPIPE, signal.SIG_DFL)

import os, json, socket
from datetime import datetime, timezone

# Usage:
#   python3 scripts/poll-whatsminers.py 192.168.1.101 192.168.1.102 ...
# or
#   IPS="192.168.1.101 192.168.1.102" python3 scripts/poll-whatsminers.py

def now_iso():
  return datetime.now(timezone.utc).isoformat()

def q(ip: str, cmd="summary", port=4028, timeout_s=2.0) -> dict:
  s = socket.socket()
  s.settimeout(timeout_s)
  s.connect((ip, port))
  s.send(f'{{"command":"{cmd}"}}'.encode())
  data = s.recv(65535)
  s.close()
  return json.loads(data.decode(errors="ignore"))

def pick_payload(j: dict):
  # Error shape
  if isinstance(j.get("STATUS"), str) and j.get("STATUS") == "E":
    return "E", {"error": j.get("Msg") or j.get("Description") or "error"}, j
  # Shape B: STATUS="S", Msg is object
  if isinstance(j.get("STATUS"), str) and j.get("STATUS") == "S" and isinstance(j.get("Msg"), dict):
    return "S", j["Msg"], j
  # Shape A: SUMMARY array
  if isinstance(j.get("SUMMARY"), list) and j["SUMMARY"]:
    return "S", j["SUMMARY"][0], j
  return "?", {"error": "unknown json shape"}, j

def to_float(x):
  try:
    return float(x)
  except Exception:
    return None

def mhs_to_ghs(mhs):
  # Whatsminer returns MH/s. 1000 MH/s = 1 GH/s.
  return (mhs / 1000.0) if mhs is not None else None

def main():
  ips = []
  if len(os.sys.argv) > 1:
    ips = os.sys.argv[1:]
  else:
    env = os.environ.get("IPS","").strip()
    if env:
      ips = env.split()

  if not ips:
    raise SystemExit("No IPs provided. Use: IPS='ip1 ip2' python3 scripts/poll-whatsminers.py")

  ts = now_iso()

  for ip in ips:
    rec = {
      "ip": ip,
      "ts": ts,
      "reachable": False,
      "api_4028": False,

      "status": "ERR",
      "error": None,

      # UI/API expects ghs_* numeric
      "ghs_av": None,
      "ghs_5s": None,
      "ghs_1m": None,
      "ghs_5m": None,
      "ghs_15m": None,

      "accepted": None,
      "rejected": None,
      "temp_c": None,
      "fan_in": None,
      "fan_out": None,
      "power_w": None,

      "raw": None,
    }

    try:
      j = q(ip, "summary")
      rec["reachable"] = True
      rec["api_4028"] = True

      st, p, raw = pick_payload(j)
      rec["raw"] = raw

      if st != "S":
        rec["status"] = "ERR"
        rec["error"] = p.get("error")
        print(json.dumps(rec, separators=(",",":")))
        continue

      # Whatsminer summary typically returns MH/s fields.
      mhs_av  = to_float(p.get("MHS av"))
      mhs_5s  = to_float(p.get("MHS 5s"))
      mhs_1m  = to_float(p.get("MHS 1m"))
      mhs_5m  = to_float(p.get("MHS 5m"))
      mhs_15m = to_float(p.get("MHS 15m"))

      rec["ghs_av"]  = mhs_to_ghs(mhs_av)
      rec["ghs_5s"]  = mhs_to_ghs(mhs_5s)
      rec["ghs_1m"]  = mhs_to_ghs(mhs_1m)
      rec["ghs_5m"]  = mhs_to_ghs(mhs_5m)
      rec["ghs_15m"] = mhs_to_ghs(mhs_15m)

      rec["accepted"] = p.get("Accepted")
      rec["rejected"] = p.get("Rejected")
      rec["temp_c"]   = to_float(p.get("Temperature"))
      rec["fan_in"]   = p.get("Fan Speed In")
      rec["fan_out"]  = p.get("Fan Speed Out")
      rec["power_w"]  = to_float(p.get("Power"))

      rec["status"] = "OK"
      # Flag obvious "up but not hashing"
      if (rec["ghs_av"] == 0.0 and rec["ghs_5s"] == 0.0):
        rec["status"] = "ZERO_HASH"

      print(json.dumps(rec, separators=(",",":")))

    except Exception as e:
      rec["error"] = str(e)
      print(json.dumps(rec, separators=(",",":")))

if __name__ == "__main__":
  main()
