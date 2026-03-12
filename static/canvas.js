// We declare these at the top, but define them dynamically in initializeCanvas()
let height, width;
let canvas_ws;
let isDrawing = false;
const protocol = location.protocol === "https:" ? "wss:" : "ws:";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

async function initializeCanvas() {
  // 1. Fetch the true grid dimensions from the Go server
  const response = await fetch(`${location.protocol}//${location.host}/config`);
  const config = await response.json();

  width = config.width;
  height = config.height;

  // 2. Set the canvas's internal drawing resolution to match the grid exactly
  canvas.width = width;
  canvas.height = height;

  // 3. Initialize the background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. Connect to the WebSocket now that we're properly sized
  canvas_connect();
}

function drawPixel(x, y, color) {
  let hex;
  if (color === 0) {
    hex = "ffffff";
  } else {
    hex = color.toString(16).padStart(6, "0");
  }
  ctx.fillStyle = `#${hex}`;
  ctx.fillRect(x, y, 1, 1);
}

function canvas_connect() {
  canvas_ws = new WebSocket(`${protocol}//${location.host}/canvas`);

  canvas_ws.onopen = () => console.log("Canvas connected");

  canvas_ws.onmessage = (event) => {
    const m = JSON.parse(event.data);

    if (m.fullGrid) {
      m.fullGrid.forEach((row, x) => {
        row.forEach((color, y) => drawPixel(x, y, color));
      });
      return; // Exit here so we don't trigger the single-pixel logic below
    }

    if (m.reset) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      drawPixel(m.x, m.y, m.color);
    }
  };

  canvas_ws.onclose = () => {
    console.log("disconnected, retrying in 1s");
    setTimeout(canvas_connect, 1000);
  };
}

function handlePaint(e) {
  if (!canvas_ws || canvas_ws.readyState !== WebSocket.OPEN) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);

  if (x < 0 || x >= width || y < 0 || y >= height) return;

  const colorHex = document.getElementById("colorPicker").value;
  const color = parseInt(colorHex.slice(1), 16);
  canvas_ws.send(JSON.stringify({ x, y, color }));
}

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  handlePaint(e);
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    handlePaint(e);
  }
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

document.getElementById("resetButton").addEventListener("click", () => {
  if (!canvas_ws || canvas_ws.readyState !== WebSocket.OPEN) return;
  canvas_ws.send(JSON.stringify({ x: 0, y: 0, color: 0, reset: true }));
});

// Kick off the initialization
document.addEventListener("DOMContentLoaded", initializeCanvas);
