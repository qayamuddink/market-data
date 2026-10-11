
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
    console.log("Connected to WebSocket server");

    ws.send(JSON.stringify({
        type: "subscribe",
        channel: "ticker",
        symbol: "BTCUSDT"
    }));
});

ws.on("message", (message) => {
    console.log("Received:", message.toString());
});

ws.on("error", (error) => {
    console.log("WebSocket error:", error.message);
});
