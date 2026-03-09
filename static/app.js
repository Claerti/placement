const width = 100;
const height = 50;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const pixelSize = canvas.width / width; // assume canvas width matches desired cells

function drawPixel(x, y, color) {
    // color is integer 0..0xFFFFFF; treat 0 as white
    let hex;
    if (color === 0) {
        hex = 'ffffff';
    } else {
        hex = color.toString(16).padStart(6, '0');
    }
    ctx.fillStyle = `#${hex}`;
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

// initialize canvas background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

let ws;
function connect() {
    // use wss:// for https pages, ws:// for http
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws`);
    ws.onopen = () => console.log('connected');
    ws.onmessage = (evt) => {
        const m = JSON.parse(evt.data);
        drawPixel(m.x, m.y, m.color);
    };
    ws.onclose = () => {
        console.log('disconnected, retrying in 1s');
        setTimeout(connect, 1000);
    };
}

connect();

canvas.addEventListener('click', (e) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const colorHex = document.getElementById('colorPicker').value;
    const color = parseInt(colorHex.slice(1), 16);
    ws.send(JSON.stringify({ x, y, color }));
});
