const messagesWindow = document.getElementById("messages");

function AddMessage(message) {
  const newMessage = document.createElement("div");
  newMessage.textContent = message.text;
  messagesWindow.appendChild(newMessage);
  messagesWindow.scrollTop = messagesWindow.scrollHeight;
}

let chat_ws;
function chat_connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  chat_ws = new WebSocket(`${protocol}//${location.host}/chat`);
  chat_ws.onopen = () => console.log("chat connected");
  chat_ws.onmessage = (evt) => {
    const m = JSON.parse(evt.data);
    AddMessage(m);
  };
  chat_ws.onclose = () => {
    console.log("chat disconnected, retrying in 1s");
    setTimeout(connect, 1000);
  };
}

chat_connect();

document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const messageInput = document.getElementById("messageInput");
  const text = messageInput.value.trim();
  if (!text || !chat_ws || chat_ws.readyState !== WebSocket.OPEN) return;
  chat_ws.send(JSON.stringify({ text }));
  messageInput.value = "";
  messageInput.focus();
});
