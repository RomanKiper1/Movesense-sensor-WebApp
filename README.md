How to run a Docker container
You run them locally on their own machine, in whatever terminal they normally use.

Typical workflow:

1. **Open a terminal** in the project root (`5. Movesense DataApp/`).

   - On Windows: PowerShell or Windows Terminal.
   - On macOS/Linux: default shell or VS Code terminal.

2. Run the build command there:

   ```
   docker build -t movesense-app .
   ```

3. After the "image" builds, run it from the same terminal:
   ```
   docker run --rm -it -p 8000:8000 movesense-app
   ```

So the commands go into their local terminal on the host machine that has Docker installed (and where the repo is cloned).

Anyone running that docker container gets a consistent python 3.11 environment with all dependencies already installed. That’s perfect for the web UI, CSV conversion, or scripting tasks.

Important Note: the container can’t access BLE on Windows/macOS, so people still need to run the datalogger on the host (their machine Windows or Mac) if they have to talk to the sensor.

# CSV-to-Web Workflow Guide

End-to-end instructions for collecting Movesense accelerometer data with the Python datalogger, converting it to CSV, and plotting it in the browser UI. Follow the section that matches your terminal environment:

- **VS Code Terminal (PowerShell default)**
- **VS Code Terminal configured for Git Bash**
- **Standalone PowerShell (Windows Terminal / classic PowerShell)**

All paths below assume the repository root `5. Movesense DataApp/` and the cloned `python-datalogger-tool/`.

---

## Prerequisites

1. Movesense sensor with datalogger firmware.
2. Sensor serial suffix (last digits printed on the back or in the Movesense mobile app), e.g. `244730`.
3. The project-local Python 3.11 virtual environment (already created at `python-datalogger-tool/.venv`). If not active, the commands below show how to activate it.
4. Optionally, keep the automated helper `auto_acc_log.py` handy—it runs status → config → start/stop → fetch → CSV in one shot.

---

## VS Code Terminal (PowerShell default)

1. **Open VS Code** in `5. Movesense DataApp/`.
2. **Terminal → New Terminal** (defaults to PowerShell) and run:

   ```powershell
   cd "python-datalogger-tool"
   .\.venv\Scripts\Activate.ps1
   python auto_acc_log.py --serial 244730 --rate 52 --output ./logs
   ```

   - The script shows live status, configures `/Meas/Acc/52` (+ `/Time/Detailed`), starts logging, and waits.
   - Perform the vibration test, then press **Enter** to stop when prompted.
   - The script fetches SBEM files into `./logs`, converts them to CSV, and prints their full paths.

3. **Launch the web UI**:
   - Open `index.html` in a browser (double-click or use VS Code’s “Open with Live Server”).
   - Click **Load CSV**, browse to the CSV printed in step 2 (e.g. `logs\Movesense_log_1_244730.csv`), and confirm.
   - Use **Refresh plot**, **Clear view**, and **Download copy** buttons as needed.

---

## VS Code Terminal (Git Bash profile)

1. In VS Code, choose **Terminal → New Terminal**, then select your Git Bash profile.
2. Run:

   ```bash
   cd "python-datalogger-tool"
   source .venv/Scripts/activate
   python auto_acc_log.py --serial 244730 --rate 52 --output ./logs
   ```

3. After the script finishes and reports the CSV file path, open `index.html` in your browser (or serve it via Live Server).
4. Click **Load CSV** → select the CSV (the dialog shows Windows-style paths even inside Git Bash).

---

## Standalone PowerShell (Windows Terminal / classic PowerShell)

1. Open PowerShell and navigate to the repo:

   ```powershell
   cd "C:\Studies\KTH\1. CM2015 HT25\Group project BM-Vibration\5. Movesense DataApp\python-datalogger-tool"
   .\.venv\Scripts\Activate.ps1
   ```

2. Kick off the automated pipeline:

   ```powershell
   python auto_acc_log.py --serial 244730 --rate 52 --output .\logs
   ```

3. After pressing Enter to stop logging, note the generated CSV path (e.g. `C:\...\logs\Movesense_log_1_244730.csv`).
4. Open `index.html` in any browser, click **Load CSV**, and pick that file to visualize the accelerometer trace.

---

## Manual (step-by-step) alternative

If you prefer explicit control instead of `auto_acc_log.py`, use the following commands inside an activated venv:

```powershell
python datalogger_tool.py status -s 244730
python datalogger_tool.py config -s 244730 -p "/Meas/Acc/52"
python datalogger_tool.py start -s 244730
# ...run your test...
python datalogger_tool.py stop -s 244730
python datalogger_tool.py fetch -s 244730 -o ./logs
python ms_json2csv.py ./logs/Movesense_log_1_244730.sbem
```

Then load the resulting CSV into the web UI as described earlier.

---

## Tips & Troubleshooting

- **BLE pairing errors**: If `status` or `start` fails, ensure the sensor isn’t connected elsewhere (Movesense mobile app, previous CLI session). Reboot the sensor and retry.
- **Multiple recordings**: Each fetch saves `Movesense_log_<id>_<serial>.sbem`. Conversion writes `*.csv` next to the SBEM, so you can archive every run.
- **Browser caching**: If you edit `main.js`/`styles.css`, refresh with cache disabled (Ctrl+Shift+R) before loading a new CSV.
- **CSV units**: `ms_json2csv.py` writes `Timestamp_ms` and the logged value (per axis or magnitude). The web UI expects a simple two-column CSV; if you export X/Y/Z separately, keep only the column you want to visualize.

You now have a repeatable process: collect accelerometer data via Python, automatically convert it, and visualize it instantly in the browser.
