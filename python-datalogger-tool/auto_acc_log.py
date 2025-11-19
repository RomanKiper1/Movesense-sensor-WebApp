#!/usr/bin/env python3
"""One-shot automation for Movesense accelerometer logging."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List


def run_cli(args_list: Iterable[str]) -> None:
    """Invoke datalogger_tool.py with the provided arguments."""
    cmd = [sys.executable, "datalogger_tool.py", *args_list]
    print(f"\n$ {' '.join(cmd)}")
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def run_converter(sbem_path: Path) -> None:
    """Convert a freshly downloaded SBEM file into CSV."""
    cmd = [sys.executable, "ms_json2csv.py", str(sbem_path)]
    print(f"\n$ {' '.join(cmd)}")
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def list_sbem_files(directory: Path) -> List[Path]:
    """Return all SBEM files in the given directory."""
    return sorted(directory.glob("*.sbem"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Automate a full accelerometer logging session."
    )
    parser.add_argument(
        "--serial",
        required=True,
        help="Sensor serial suffix (e.g. 244730).",
    )
    parser.add_argument(
        "--rate",
        type=int,
        default=52,
        help="Accelerometer sample rate for /Meas/Acc/<rate> (default: 52).",
    )
    parser.add_argument(
        "--output",
        default="./logs",
        help="Directory to store fetched SBEM/CSV files (default: ./logs).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    acc_path = f"/Meas/Acc/{args.rate}"
    print(f"Using sensor suffix {args.serial} with path {acc_path}")

    # 1. Show current status
    run_cli(["status", "-s", args.serial])

    # 2. Configure accelerometer logging
    run_cli(["config", "-s", args.serial, "-p", acc_path])

    # 3. Start logging
    run_cli(["start", "-s", args.serial])

    try:
        input("\nLogging… press Enter to stop recording (Ctrl+C to abort).\n")
    except KeyboardInterrupt:
        print("\nKeyboard interrupt received, stopping logging.")
    finally:
        # 4. Stop logging and confirm state
        run_cli(["stop", "-s", args.serial])
        run_cli(["status", "-s", args.serial])

    # 5. Fetch newly recorded logs
    before_fetch = {path.name for path in list_sbem_files(output_dir)}
    run_cli(["fetch", "-s", args.serial, "-o", str(output_dir)])
    after_fetch = list_sbem_files(output_dir)
    new_sbem = [path for path in after_fetch if path.name not in before_fetch]

    if not new_sbem:
        print("\nNo new SBEM files detected. Nothing to convert.")
        return

    # 6. Convert each SBEM file to CSV
    created_csv: List[Path] = []
    for sbem_path in new_sbem:
        run_converter(sbem_path)
        csv_path = sbem_path.with_suffix(".csv")
        if csv_path.exists():
            created_csv.append(csv_path)

    if not created_csv:
        print("\nFinished, but no CSV files were created.")
        return

    print("\nCSV files ready for visualization:")
    for csv_file in created_csv:
        print(f" • {csv_file}")


if __name__ == "__main__":
    main()
import argparse
import subprocess
import sys
import time
from pathlib import Path


REPO_DIR = Path(__file__).resolve().parent
PYTHON = Path(sys.executable)


def datalogger_cli(*args):
  """Convenience wrapper for python datalogger_tool.py <args>."""
  cmd = [str(PYTHON), "datalogger_tool.py", *args]
  subprocess.run(cmd, cwd=REPO_DIR, check=True)


def convert_sbem_to_csv(sbem_path: Path):
  """Invoke ms_json2csv.py to produce a CSV next to the SBEM file."""
  csv_path = sbem_path.with_suffix(".csv")
  cmd = [str(PYTHON), "ms_json2csv.py", str(sbem_path), str(csv_path)]
  subprocess.run(cmd, cwd=REPO_DIR, check=True)
  return csv_path


def main():
  parser = argparse.ArgumentParser(description="Automate accelerometer logging")
  parser.add_argument("--serial", required=True, help="Last digits of Movesense serial")
  parser.add_argument("--rate", type=int, default=52, help="Sample rate, e.g. 52")
  parser.add_argument("--output", default="./logs", help="Directory for fetched logs")
  parser.add_argument(
    "--duration",
    type=int,
    default=0,
    help="Optional duration in seconds before auto-stop (0 waits for Enter)",
  )
  args = parser.parse_args()

  serial = args.serial
  rate = args.rate
  output_dir = (REPO_DIR / args.output).resolve()
  output_dir.mkdir(parents=True, exist_ok=True)

  print(f"Using serial suffix {serial}, sample rate {rate} Hz")
  print("\n== STATUS ==")
  datalogger_cli("status", "-s", serial)

  print("\n== CONFIG ==")
  datalogger_cli("config", "-s", serial, "-p", f"/Meas/Acc/{rate}")

  print("\n== START ==")
  datalogger_cli("start", "-s", serial)

  if args.duration > 0:
    print(f"Recording for {args.duration} seconds ...")
    time.sleep(args.duration)
  else:
    input("Press Enter to stop logging...")

  print("\n== STOP ==")
  datalogger_cli("stop", "-s", serial)

  print("\n== FETCH ==")
  before_fetch = {p.resolve() for p in output_dir.glob("*.sbem")}
  datalogger_cli("fetch", "-s", serial, "-o", str(output_dir))
  after_fetch = {p.resolve() for p in output_dir.glob("*.sbem")}
  new_sbem = sorted(after_fetch - before_fetch)

  if not new_sbem:
    print("No new SBEM files detected.")
    return

  print("\n== CONVERT ==")
  created_csv = []
  for sbem_file in new_sbem:
    print(f"Converting {sbem_file.name} -> CSV")
    csv_file = convert_sbem_to_csv(sbem_file)
    created_csv.append(csv_file)

  print("\nCompleted. CSV files:")
  for csv_file in created_csv:
    print(f"  {csv_file}")


if __name__ == "__main__":
  main()

