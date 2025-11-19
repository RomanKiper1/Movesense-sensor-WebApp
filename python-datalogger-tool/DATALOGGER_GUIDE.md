# Movesense Python Datalogger — Quick Guide

## Overview

- Talks to Movesense sensors over BLE using the GATT SensorData Protocol (GSP) via the Bleak library.
- Supports configuring log paths, starting/stopping logging, fetching SBEM logs, converting to CSV/JSON/EDF+, and erasing device memory.
- Designed as a CLI (`datalogger_tool.py`) with helper conversion scripts and an optional ECG GUI.

## Repository Structure

```
python-datalogger-tool/
├── datalogger_tool.py            # CLI entry point (status/config/start/stop/fetch/erasemem)
├── sensor_command.py             # BLE + GSP helper class (device discovery, commands, SBEM parsing)
├── ms_json2csv.py                # SBEM JSON → CSV converter
├── csv2edf.py                    # CSV → EDF+ converter
├── plot_csv.py                   # Simple CSV visualizer
├── Movesense_ECG_datalogger_gui.py # GUI tailored for ECG logging
├── requirements.txt              # bleak, pandas, numpy, pyEDFlib, etc.
└── README.md                     # High-level instructions
```

## Device Selection

- All commands accept `-s/--serial_numbers`. Provide full serials or just the trailing digits.
- `SensorCommand` scans for BLE adverts whose device name ends with the supplied suffix.
- Uses fixed GSP UUIDs (hard-coded in `sensor_command.py`):
  - Service `34802252-7185-4d5d-b431-630e7050e8f0`
  - Write characteristic `34800001-7185-4d5d-b431-630e7050e8f0`
  - Notify characteristic `34800002-7185-4d5d-b431-630e7050e8f0`

## Configuring What to Log

- `config` subcommand accepts `-p/--path` values (e.g., `/Meas/Acc/52` or `/Sample/IntAcc/13`).
- Each path is sent as UTF-8, null-terminated strings. The tool automatically appends `/Time/Detailed` for timestamps.
- Example cheat sheet:
  ```
  serial_suffix = "244730"
  acc_path = "/Meas/Acc/52"
  extra_path = "/Time/Detailed"  # auto-added
  ```

## Typical Logging Workflow

```
# 1. Check device status
python datalogger_tool.py status -s 244730

# 2. Configure resource paths
python datalogger_tool.py config -s 244730 -p "/Meas/Acc/52"

# 3. Start logging
python datalogger_tool.py start -s 244730

# ...recording happens on the sensor...

# 4. Stop logging
python datalogger_tool.py stop -s 244730

# 5. Fetch SBEM logs
python datalogger_tool.py fetch -s 244730 -o ./logs

# 6. Convert / analyze
python ms_json2csv.py ./logs/Movesense_log_1_244730.sbem
python csv2edf.py ./logs/Movesense_log_1_244730.csv
```

## Output Formats and Locations

- `fetch` saves SBEM binaries named `Movesense_log_{log_id}_{serial}.sbem` in the folder given via `-o/--output` (defaults to current directory).
- Conversion helpers:
  - `ms_json2csv.py` → SBEM JSON/CSV for analytics (`output_format = "csv"`).
  - `csv2edf.py` → CSV to EDF+ for medical workflows.
  - `plot_csv.py` → quick visualization of CSV accelerometer traces.
- Suggested defaults:
  ```
  output_dir = "./logs"
  raw_output_format = "SBEM"
  post_convert_to = ["csv", "edf+"]
  ```

## Internal Architecture Summary

- `datalogger_tool.py`
  - Parses CLI options, manages retries, and runs per-device commands synchronously.
  - Delegates BLE work to coroutines (`fetch_status`, `configure_device`, etc.) executed via `run_async_command`.
- `sensor_command.py`
  - Wraps Bleak to discover devices, connect, and send GSP frames (HELLO, PUT_DATALOGGER_CONFIG, PUT_DATALOGGER_STATE, FETCH_LOG, CLEAR_LOGBOOK).
  - Parses command responses (`GSP_RESP_COMMAND_RESPONSE`) and data notifications (`GSP_RESP_DATA`, `GSP_RESP_DATA_PART2`), queuing them for callers.
  - Handles timestamp syncing, log fetching loops, and reconnection logic.
- Conversion scripts operate on the files pulled down by `fetch`, letting you produce CSV/JSON/EDF+ artifacts for downstream analysis.

## Suggested Workflow for Web Visualization

- Keep BLE + SBEM decoding on the Python side (this repo) so browsers stay sandboxed.
- Let the web app read the CSV/JSON files generated in `./logs` (or fetch them via a lightweight Python HTTP wrapper).
- Only visualization + UX happen in `index.html`/`main.js`, while all device control lives here.

Use this guide as a quick reference when configuring sensors, planning logging sessions, or onboarding teammates to the Movesense datalogger workflow.
