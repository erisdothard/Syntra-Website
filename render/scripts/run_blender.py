#!/usr/bin/env python3
"""Run a Blender script headless with a hard timeout.

    python3 render/scripts/run_blender.py [--timeout SEC] [--blend FILE] script.py [-- script args]
"""
import subprocess, sys, time, os

BLENDER = "/Applications/Blender.app/Contents/MacOS/Blender"


def main(argv):
    timeout = 900
    blend = None
    args = list(argv)
    while args and args[0].startswith("--") and args[0] != "--":
        flag = args.pop(0)
        if flag == "--timeout":
            timeout = float(args.pop(0))
        elif flag == "--blend":
            blend = args.pop(0)
        else:
            raise SystemExit(f"unknown flag {flag}")
    if not args:
        raise SystemExit(__doc__)
    script = args.pop(0)
    cmd = [BLENDER, "-b", "--python-exit-code", "1"]
    if blend:
        cmd.append(blend)
    cmd += ["--python", script]
    if args:
        if args[0] != "--":
            cmd.append("--")
        cmd += args
    t0 = time.time()
    try:
        r = subprocess.run(cmd, timeout=timeout, text=True, capture_output=True)
    except subprocess.TimeoutExpired as e:
        print((e.stdout or "")[-4000:] if isinstance(e.stdout, str) else "")
        print(f"TIMEOUT after {timeout}s")
        return 124
    noise = ("| INFO:", "Draco", "BlenderMCP", "Server thread", "DeprecationWarning", "use_nodes")
    for line in r.stdout.splitlines():
        if not any(n in line for n in noise):
            print(line)
    err = [l for l in r.stderr.splitlines() if not any(n in l for n in noise)]
    if err:
        print("--- stderr ---")
        print("\n".join(err[-60:]))
    print(f"[run_blender] exit={r.returncode} wall={time.time()-t0:.1f}s")
    return r.returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
