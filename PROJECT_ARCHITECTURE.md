# Project Architecture & Connection Points

## High-Level Flow

```
+----------------+        GSP BLE         +-------------------------+
| Movesense      |  (HELLO / CONFIG /     | python-datalogger-tool  |
| Sensor (BLE)   |<---------------------->|  (sensor_command.py)    |
|  /Meas/Acc/..  |        DATA packets    +-----------+-------------+
+----------------+                                   |
                                                     | SBEM files
                                                     v
                                           +-------------------------+
                                           | Conversion scripts      |
                                           |  ms_json2csv.py         |
                                           |  csv2edf.py / plot_csv  |
                                           +-----------+-------------+
                                                       | CSV / JSON
                                                       v
                                           +-------------------------+
                                           | Web UI (index.html,     |
                                           |  styles.css, main.js)   |
                                           |  Canvas visualization   |
                                           +-------------------------+
```

- **Sensor layer**: The Movesense device advertises the GATT SensorData Protocol (service `34802252-7185-4d5d-b431-630e7050e8f0`) and exposes `/Meas/Acc/<rate>` and `/Time/Detailed` paths for logging.
- **Python datalogger layer**:
  - `sensor_command.py` wraps Bleak to discover devices by serial suffix, send GSP commands (HELLO, PUT_DATALOGGER_CONFIG, PUT_DATALOGGER_STATE, FETCH_LOG, CLEAR_LOGBOOK), and stream SBEM data to disk.
  - `datalogger_tool.py` provides the CLI commands (`status`, `config`, `start`, `stop`, `fetch`, `erasemem`) and orchestrates retries across multiple serials.
  - `auto_acc_log.py` automates an entire session (status → config → start/stop → fetch → CSV).
- **Conversion layer**: `ms_json2csv.py` reads SBEM content, groups samples per stream (e.g. `/Meas/Acc/52`), reconstructs timestamps, and writes CSV files; `csv2edf.py` and `plot_csv.py` offer downstream formats and visualization.
- **Web UI layer**: `index.html`, `styles.css`, and `main.js` provide a lightweight browser interface where users load the generated CSVs, inspect metadata, plot the waveform, and re-download files.

## Detailed Component Map

```
┌──────────────────────────────┐
│ Movesense Sensor             │
│ - Advertises BLE + GSP UUIDs │
│ - Stores logs in flash       │
└──────────────┬───────────────┘
               │ GSP (BLE / SBEM packets)
┌──────────────▼───────────────┐
│ sensor_command.py            │
│ - BleakClient discover/connect│
│ - send_command(), fetch_data()│
│ - Handles notifications,      │
│   writes SBEM files           │
└──────────────┬───────────────┘
               │ Async helpers
┌──────────────▼───────────────┐
│ datalogger_tool.py CLI       │
│ - status/config/start/stop   │
│ - fetch/erasemem             │
│ - Retry logic per serial     │
└──────────────┬───────────────┘
               │ Automation hook
┌──────────────▼───────────────┐
│ auto_acc_log.py              │
│ - Runs full session          │
│ - Tracks new SBEM files      │
│ - Calls ms_json2csv.py       │
└──────────────┬───────────────┘
               │ CSV output
┌──────────────▼───────────────┐
│ Web Viewer                   │
│   index.html                 │
│   styles.css                 │
│   main.js                    │
│ - File picker (Load CSV)     │
│ - Metadata panel             │
│ - Canvas plot + download     │
└──────────────────────────────┘
```

## Connection Points

| Layer                | File(s)                                       | Responsibilities                                                                 | Interfaces                                               |
| -------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| BLE / Sensor Control | `sensor_command.py`                           | Discover devices, maintain BLE connection, marshal GSP frames, stream SBEM data. | GATT writes (`34800001`), notifications (`34800002`).    |
| CLI Orchestration    | `datalogger_tool.py`, `auto_acc_log.py`       | User-facing commands, retries, automation, and conversion hand-off.              | Calls async helpers, launches `ms_json2csv.py`.          |
| Data Conversion      | `ms_json2csv.py`, `csv2edf.py`, `plot_csv.py` | Translate SBEM to structured formats, convert to EDF+, quick MATLAB-style plots. | Reads SBEM files produced by fetch, writes CSV/JSON/EDF. |
| Web Visualization    | `index.html`, `styles.css`, `main.js`         | Browser UI for loading CSVs, computing statistics, plotting, and re-downloading. | Consumes CSV exported by Python scripts.                 |

## Typical Data Flow

1. `auto_acc_log.py` or manual CLI commands use GSP to configure `/Meas/Acc/<rate>` and `/Time/Detailed`, then start logging.
2. After the test, `fetch` streams SBEM logs to `./logs/Movesense_log_<id>_<serial>.sbem`.
3. `ms_json2csv.py` converts those SBEM files to CSV with `Timestamp_ms` and `Value` columns.
4. The user opens `index.html`, clicks **Load CSV**, and the browser plots the waveform via `main.js`.
5. Optional converters (`csv2edf.py`) archive data in other formats; the raw SBEM files remain for traceability.

This architecture cleanly separates BLE privileges and SBEM decoding (Python) from visualization and sharing (web), making the workflow cross-platform and easy to extend.
