// CSV-driven visualization state
const csvState = {
  samples: [],
  rawText: "",
  fileName: "",
};

let csvInputEl = null;
let plotCanvas = null;
let plotCtx = null;

export function connectSensor() {
  if (csvInputEl) {
    csvInputEl.click();
  }
}

export function startAcc() {
  if (!csvState.samples.length) {
    appendLog("Load a CSV before refreshing the plot.");
    return;
  }
  plotSamples(csvState.samples);
  setStatus("Plot refreshed");
}

export function stopAcc() {
  clearVisualization();
  appendLog("Cleared the current dataset from the view.");
  setStatus("Waiting for CSV");
}

export function downloadCsv() {
  if (!csvState.rawText) {
    appendLog("No CSV loaded yet.");
    return;
  }

  const blob = new Blob([csvState.rawText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = csvState.fileName || "accelerometer.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  appendLog(`Downloaded ${anchor.download}`);
}

function handleCsvSelection(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  setStatus(`Loading ${file.name}...`);
  file
    .text()
    .then((text) => {
      const dataset = parseCsv(text);
      csvState.samples = dataset.samples;
      csvState.rawText = text;
      csvState.fileName = file.name;
      csvInputEl.value = "";

      if (!dataset.samples.length) {
        appendLog("No numeric samples found in this file.");
        setStatus("CSV parsing failed");
        enableActionButtons(false);
        updateMeta(null);
        clearVisualization();
        return;
      }

      updateMeta({
        fileName: file.name,
        count: dataset.samples.length,
        durationMs: dataset.durationMs,
        range: dataset.range,
      });
      plotSamples(dataset.samples);
      setStatus(`Loaded ${dataset.samples.length} samples`);
      appendLog(`Parsed CSV: ${file.name}`);
      enableActionButtons(true);
    })
    .catch((error) => {
      console.error("Failed to read CSV", error);
      appendLog(`CSV load error: ${error.message ?? error}`);
      setStatus("CSV load failed");
    });
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const samples = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    const columns = line.split(",").map((value) => value.trim());
    if (columns.length < 2) {
      continue;
    }

    const timestamp = Number(columns[0].replace(/[^\d.-]/g, ""));
    const value = Number(columns[1]);
    if (Number.isFinite(timestamp) && Number.isFinite(value)) {
      samples.push({ timestamp, value });
    }
  }

  const durationMs =
    samples.length > 1
      ? samples[samples.length - 1].timestamp - samples[0].timestamp
      : 0;
  const minValue = Math.min(...samples.map((s) => s.value));
  const maxValue = Math.max(...samples.map((s) => s.value));

  return {
    samples,
    durationMs,
    range: { min: minValue, max: maxValue },
  };
}

function plotSamples(samples) {
  if (!plotCtx || !plotCanvas) {
    return;
  }

  const width = plotCanvas.width;
  const height = plotCanvas.height;
  plotCtx.clearRect(0, 0, width, height);

  if (!samples.length) {
    return;
  }

  const minTime = samples[0].timestamp;
  const maxTime = samples[samples.length - 1].timestamp;
  const minValue = Math.min(...samples.map((s) => s.value));
  const maxValue = Math.max(...samples.map((s) => s.value));
  const valueRange = maxValue - minValue || 1;
  const timeRange = maxTime - minTime || 1;

  plotCtx.fillStyle = "#0f172a";
  plotCtx.fillRect(0, 0, width, height);

  plotCtx.strokeStyle = "#38bdf8";
  plotCtx.lineWidth = 2;
  plotCtx.beginPath();

  samples.forEach((sample, index) => {
    const x = ((sample.timestamp - minTime) / timeRange) * width;
    const y = height - ((sample.value - minValue) / valueRange) * height;
    if (index === 0) {
      plotCtx.moveTo(x, y);
    } else {
      plotCtx.lineTo(x, y);
    }
  });

  plotCtx.stroke();
}

function updateMeta(meta) {
  const fileEl = document.getElementById("meta-file");
  const sampleEl = document.getElementById("meta-samples");
  const durationEl = document.getElementById("meta-duration");
  const rangeEl = document.getElementById("meta-range");

  if (!meta) {
    fileEl.textContent = "—";
    sampleEl.textContent = "0";
    durationEl.textContent = "—";
    rangeEl.textContent = "—";
    return;
  }

  fileEl.textContent = meta.fileName;
  sampleEl.textContent = meta.count.toLocaleString();
  const seconds = (meta.durationMs / 1000).toFixed(2);
  durationEl.textContent =
    meta.durationMs > 0 ? `${seconds}s` : "Single sample";
  rangeEl.textContent = `${meta.range.min.toFixed(
    3
  )} → ${meta.range.max.toFixed(3)}`;
}

function clearVisualization() {
  csvState.samples = [];
  csvState.rawText = "";
  csvState.fileName = "";
  updateMeta(null);
  if (plotCtx && plotCanvas) {
    plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
  }
}

function enableActionButtons(enabled) {
  const ids = ["start-btn", "stop-btn", "download-btn"];
  ids.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !enabled;
    }
  });
}

// Updates the friendly status string in the UI.
function setStatus(message) {
  const el = document.getElementById("status-text");
  if (el) {
    el.textContent = `Status: ${message}`;
  }
}

// Prepends a timestamped entry to the on-screen log.
function appendLog(message) {
  const el = document.getElementById("log-output");
  if (el) {
    const timestamp = new Date().toLocaleTimeString();
    el.textContent = `[${timestamp}] ${message}\n${el.textContent}`.trim();
  }
}

// Wires button clicks to their matching handler functions.
function wireControls() {
  plotCanvas = document.getElementById("plot");
  plotCtx = plotCanvas?.getContext("2d") ?? null;
  csvInputEl = document.getElementById("csv-input");
  if (csvInputEl) {
    csvInputEl.addEventListener("change", handleCsvSelection);
  }

  const buttonMap = [
    { id: "connect-btn", handler: connectSensor },
    { id: "start-btn", handler: startAcc },
    { id: "stop-btn", handler: stopAcc },
    { id: "download-btn", handler: downloadCsv },
  ];

  for (const { id, handler } of buttonMap) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", handler);
    }
  }

  enableActionButtons(false);
}

// Decide whether to wait for DOMContentLoaded or run immediately.
if (document.readyState === "loading") {
  // If the DOM is still loading, wait until it finishes to wire up buttons.
  document.addEventListener("DOMContentLoaded", wireControls);
} else {
  // Otherwise everything is ready now, so wire controls right away.
  wireControls();
}
