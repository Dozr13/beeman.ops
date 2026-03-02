#!/usr/bin/env python3
import signal
signal.signal(signal.SIGPIPE, signal.SIG_DFL)

import os, json, socket
from datetime import datetime, timezone

PORT_DEFAULT = 4028

def now_iso():
  return datetime.now(timezone.utc).isoformat()

def read_json_response(s: socket.socket, max_bytes=512_000) -> dict:
  """
  Read until timeout (miner usually responds once) and parse JSON.
  We do NOT assume a single recv() contains the full JSON.
  """
  chunks = []
  total = 0
  while True:
    try:
      b = s.recv(4096)
      if not b:
        break
      chunks.append(b)
      total += len(b)
      if total >= max_bytes:
        break
    except socket.timeout:
      break

  data = b"".join(chunks).decode(errors="ignore").strip()

  # Sometimes junk may precede JSON; try to locate the first '{'
  i = data.find("{")
  if i > 0:
    data = data[i:]

  return json.loads(data)

def q(ip: str, cmd="summary", port=PORT_DEFAULT, timeout_s=2.0) -> dict:
  s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  s.settimeout(timeout_s)
  s.connect((ip, port))
  # Whatsminer is happier with newline-terminated command.
  s.sendall((f'{{"command":"{cmd}"}}' + "\n").encode())
  j = read_json_response(s)
  s.close()
  return j

def pick_summary(j: dict) -> tuple[str, dict, dict]:
  """
  Whatsminer typical:
    STATUS: [ { STATUS: "S", Msg: "Summary" } ]
    SUMMARY: [ { ...fields... } ]
  """
  if isinstance(j.get("SUMMARY"), list) and j["SUMMARY"]:
    return "S", j["SUMMARY"][0], j
  # Some firmwares return Msg as dict
  if isinstance(j.get("Msg"), dict):
    return "S", j["Msg"], j
  return "E", {"error": "unknown json shape"}, j

def to_float(x):
  try:
    return float(x)
  except Exception:
    return None

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

      # IMPORTANT FOR UI:
      # We write Whatsminer MHS numbers into ghs_* keys (as JSON numbers).
      # The web UI in this repo auto-detects large values and converts them to TH/s display.
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

      # keep raw for debugging
      "raw": None,
    }

    try:
      j = q(ip, "summary")
      rec["reachable"] = True
      rec["api_4028"] = True

      st, p, raw = pick_summary(j)
      rec["raw"] = raw

      if st != "S":
        rec["status"] = "ERR"
        rec["error"] = p.get("error")
        print(json.dumps(rec, separators=(",",":")))
        continue

      rec["status"] = "OK"

      # Whatsminer summary uses MHS fields (megahash/s)
      rec["ghs_av"]  = to_float(p.get("MHS av"))
      rec["ghs_5s"]  = to_float(p.get("MHS 5s"))
      rec["ghs_1m"]  = to_float(p.get("MHS 1m"))
      rec["ghs_5m"]  = to_float(p.get("MHS 5m"))
      rec["ghs_15m"] = to_float(p.get("MHS 15m"))

      rec["accepted"] = p.get("Accepted")
      rec["rejected"] = p.get("Rejected")
      rec["temp_c"]   = to_float(p.get("Temperature"))
      rec["fan_in"]   = p.get("Fan Speed In")
      rec["fan_out"]  = p.get("Fan Speed Out")
      rec["power_w"]  = to_float(p.get("Power"))

      # flag obvious "up but not hashing"
      if (rec["ghs_av"] == 0.0 and rec["ghs_5s"] == 0.0):
        rec["status"] = "ZERO_HASH"

      print(json.dumps(rec, separators=(",",":")))

    except Exception as e:
      rec["error"] = str(e)
      print(json.dumps(rec, separators=(",",":")))

if __name__ == "__main__":
  main()
