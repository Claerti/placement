// Global states
let canvas_ws;
let isDrawing = false;
let color = 0xff0000;
const protocol = location.protocol === "https:" ? "wss:" : "ws:";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

async function initializeCanvas() {
  try {
    const response = await fetch(
      `${location.protocol}//${location.host}/config`,
    );
    const config = await response.json();

    canvas.width = config.width;
    canvas.height = config.height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas_connect();
  } catch (err) {
    console.error("Failed to initialize canvas:", err);
  }
}

function drawPixel(x, y, colorToDraw) {
  let hex;

  // Logic: 0 is white, otherwise convert number to hex
  if (colorToDraw === 0) {
    hex = "ffffff";
  } else {
    hex = colorToDraw.toString(16).padStart(6, "0");
  }

  ctx.fillStyle = `#${hex}`;
  ctx.fillRect(x, y, 1, 1);
}

function canvas_connect() {
  canvas_ws = new WebSocket(`${protocol}//${location.host}/canvas`);

  canvas_ws.onopen = () => console.log("Canvas connected");

  canvas_ws.onmessage = (event) => {
    const m = JSON.parse(event.data);

    // Case 1: Initial load of the whole board
    if (m.fullGrid) {
      console.log("Received full grid");
      m.fullGrid.forEach((row, x) => {
        row.forEach((pixelColor, y) => {
          drawPixel(x, y, pixelColor);
        });
      });
      return; // Stop here
    }

    // Case 2: Reset command
    if (m.reset) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Case 3: Single pixel update (Standard path)
    drawPixel(m.x, m.y, m.color);
  };

  canvas_ws.onclose = () => {
    console.log("Disconnected, retrying in 1s");
    setTimeout(canvas_connect, 1000);
  };
}

function handlePaint(e) {
  if (!canvas_ws || canvas_ws.readyState !== WebSocket.OPEN) return;

  const rect = canvas.getBoundingClientRect();

  // Calculate how many 'real' pixels are in one 'css' pixel
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Transform mouse position to canvas resolution
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);

  // Boundary check
  if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
    // Local draw (for immediate feedback)
    drawPixel(x, y, color);
    // Server send
    canvas_ws.send(JSON.stringify({ x, y, color }));
  }
}

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  handlePaint(e); // Paint immediately on click, don't wait for movement
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) handlePaint(e);
});

window.addEventListener("mouseup", () => {
  isDrawing = false;
});

document.getElementById("resetButton").addEventListener("click", () => {
  if (canvas_ws?.readyState === WebSocket.OPEN) {
    canvas_ws.send(JSON.stringify({ x: 0, y: 0, color: 0, reset: true }));
  }
});

document.getElementById("colorPicker").addEventListener("input", (e) => {
  color = parseInt(e.target.value.slice(1), 16);
});

// Start the app
initializeCanvas();
