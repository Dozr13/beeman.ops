#!/usr/bin/env python3
import csv, os, re, subprocess, sys, time, ipaddress
from pathlib import Path

PORTS = os.getenv("PORTS", "4028,4029")
TIMEOUT = int(os.getenv("TIMEOUT", "25"))              # seconds to wait for a DOWN transition
INTERVAL = float(os.getenv("INTERVAL", "2"))           # seconds between scans
RETURN_TIMEOUT = int(os.getenv("RETURN_TIMEOUT", "180"))  # seconds to wait for miner to come back UP

def run(cmd):
    return subprocess.run(cmd, text=True, capture_output=True)

def ip_key(ip: str):
    return tuple(int(x) for x in ip.split("."))

def get_subnet_default():
    # macOS (your case). If this fails, user can set SUBNET env var.
    r_ip = run(["ipconfig", "getifaddr", "en0"])
    r_mask = run(["ipconfig", "getoption", "en0", "subnet_mask"])
    ip = (r_ip.stdout or "").strip()
    mask = (r_mask.stdout or "").strip()
    if not ip or not mask:
        return None
    net = ipaddress.IPv4Network(f"{ip}/{mask}", strict=False)
    return str(net)

def parse_gnmap_open_hosts(stdout: str) -> list[str]:
    # From nmap -oG -, look for lines like:
    # Host: 192.168.1.31 ()  Ports: 4028/open/tcp//..., 4029/open/tcp//...
    ips = []
    for line in stdout.splitlines():
        if "Ports:" not in line:
            continue
        m = re.search(r"Host:\s+(\d{1,3}(?:\.\d{1,3}){3})", line)
        if m:
            ips.append(m.group(1))
    return ips

def discover_miners(subnet: str) -> list[str]:
    cmd = [
        "sudo", "nmap",
        "-p", PORTS,
        "--open",
        "-n",
        "--max-retries", "1",
        "--host-timeout", "2s",
        subnet,
        "-oG", "-"
    ]
    r = run(cmd)
    ips = parse_gnmap_open_hosts(r.stdout or "")
    return sorted(set(ips), key=ip_key)

def scan_up_from_list(ip_list_file: Path) -> list[str]:
    cmd = [
        "sudo", "nmap",
        "-p", PORTS,
        "--open",
        "-n",
        "--max-retries", "1",
        "--host-timeout", "2s",
        "-iL", str(ip_list_file),
        "-oG", "-"
    ]
    r = run(cmd)
    ips = parse_gnmap_open_hosts(r.stdout or "")
    return sorted(set(ips), key=ip_key)

def ping_once(ip: str):
    run(["ping", "-c", "1", ip])

def arp_mac(ip: str) -> str:
    r = run(["arp", "-n", ip])
    txt = (r.stdout or "") + "\n" + (r.stderr or "")
    m = re.search(r"(([0-9a-fA-F]{1,2}:){5}[0-9a-fA-F]{1,2})", txt)
    return m.group(1).lower() if m else ""

def read_csv(path: Path):
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        fields = r.fieldnames or []
        rows = list(r)
    return fields, rows

def write_csv(path: Path, fields, rows):
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

def build_todo_positions(rows):
    items = []
    for row in rows:
        pos = (row.get("Position") or "").strip()
        ip  = (row.get("Miner IP") or "").strip()
        m = re.match(r"^([A-Za-z])(\d+)$", pos)
        if not m:
            continue
        letter = m.group(1).upper()
        num = int(m.group(2))
        if ip == "":
            items.append((letter, num, pos))
    items.sort(key=lambda t: (t[0], t[1]))
    return [pos for _,_,pos in items]

def set_fields(rows, pos, ip, mac):
    hit = 0
    for row in rows:
        if (row.get("Position") or "").strip() == pos:
            row["Miner IP"] = ip
            if mac:
                row["Miner MAC"] = mac
            hit += 1
    if hit != 1:
        raise SystemExit(f"Expected exactly 1 row for Position={pos}, found {hit}")

def main():
    if len(sys.argv) < 2:
        print("Usage: auto_map_breakers.py <HUT_CODE>")
        sys.exit(1)

    hut = sys.argv[1]
    root = Path(__file__).resolve().parents[1]
    csv_path = root / f"packages/ops-data/huts/{hut}/mapping.csv"
    if not csv_path.exists():
        raise SystemExit(f"Missing CSV: {csv_path}")

    subnet = os.getenv("SUBNET") or get_subnet_default()
    if not subnet:
        raise SystemExit("Could not determine subnet. Set SUBNET, e.g. SUBNET=192.168.1.0/24")

    fields, rows = read_csv(csv_path)
    if "Miner IP" not in fields:
        raise SystemExit("CSV missing required column: Miner IP")
    if "Miner MAC" not in fields:
        fields.append("Miner MAC")
        for r in rows:
            r.setdefault("Miner MAC", "")

    todo = build_todo_positions(rows)
    if not todo:
        print("All Positions already have Miner IPs. Nothing to do.")
        return

    state_dir = Path(f"/tmp/beeman-auto-map-{hut}")
    state_dir.mkdir(parents=True, exist_ok=True)
    ip_list_file = state_dir / "miners.txt"

    print(f"HUT: {hut}")
    print(f"CSV: {csv_path}")
    print(f"SUBNET: {subnet}")
    print(f"PORTS: {PORTS}")
    print(f"TIMEOUT={TIMEOUT}s INTERVAL={INTERVAL}s RETURN_TIMEOUT={RETURN_TIMEOUT}s")
    print("")
    print("Discovering miners on subnet (sudo once)...")

    miners = discover_miners(subnet)
    if not miners:
        raise SystemExit("Found 0 miners (4028/4029 open). Wrong network or ports blocked.")

    ip_list_file.write_text("\n".join(miners) + "\n")
    print(f"Discovered miners: {len(miners)}")
    print("")

    prev_up = scan_up_from_list(ip_list_file)
    prev_set = set(prev_up)
    print(f"Currently UP: {len(prev_up)}")
    print("")

    for pos in todo:
        print("============================================================")
        print(f"NEXT: {pos}")
        print(f"Flip breaker OFF for {pos}. Waiting up to {TIMEOUT}s...")
        print("============================================================")

        found_ip = ""
        start = time.time()

        while True:
            now_up = scan_up_from_list(ip_list_file)
            now_set = set(now_up)

            newly_down = sorted(prev_set - now_set, key=ip_key)
            if len(newly_down) == 1:
                found_ip = newly_down[0]
                prev_set = now_set
                break
            if len(newly_down) > 1:
                print("ERROR: Multiple IPs went DOWN at once:")
                for ip in newly_down:
                    print(ip)
                print("Not writing anything. Turn breakers back ON and isolate, then rerun.")
                sys.exit(2)

            prev_set = now_set
            if time.time() - start >= TIMEOUT:
                print(f"TIMEOUT: No DOWN detected. Skipping {pos} (leaving blank).")
                found_ip = ""
                break
            time.sleep(INTERVAL)

        if not found_ip:
            continue

        # write IP immediately
        set_fields(rows, pos, found_ip, mac="")
        write_csv(csv_path, fields, rows)
        print(f"WROTE {pos} -> {found_ip}")

        print("")
        print(f"Now turn breaker ON for {pos}. Waiting for {found_ip} to come back UP...")

        start_up = time.time()
        came_back = False
        while time.time() - start_up < RETURN_TIMEOUT:
            now_up = scan_up_from_list(ip_list_file)
            if found_ip in now_up:
                came_back = True
                break
            time.sleep(2)

        if came_back:
            ping_once(found_ip)   # populate ARP
            mac = arp_mac(found_ip)
            if mac:
                set_fields(rows, pos, found_ip, mac=mac)
                write_csv(csv_path, fields, rows)
                print(f"UP again: {found_ip}  MAC: {mac}")
            else:
                print(f"UP again: {found_ip}  (MAC not found; leaving Miner MAC blank)")
        else:
            print(f"WARNING: {found_ip} did not come back UP within {RETURN_TIMEOUT}s. Continuing.")

        # refresh baseline after each successful step
        prev_set = set(scan_up_from_list(ip_list_file))

    filled = sum(1 for r in rows if (r.get("Miner IP") or "").strip())
    blank = sum(1 for r in rows if not (r.get("Miner IP") or "").strip())
    ips = [(r.get("Miner IP") or "").strip() for r in rows if (r.get("Miner IP") or "").strip()]
    dups = len(ips) - len(set(ips))

    print("")
    print("DONE. Stats:")
    print(f"filled: {filled}  blank: {blank}  dupe_ips: {dups}")

if __name__ == "__main__":
    main()
