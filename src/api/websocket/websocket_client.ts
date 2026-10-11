import WebSocket from "ws";

const ws = new WebSocket(
    "ws://localhost:8080"
);

ws.on("open", () => {

    console.log(
        "Connected to WebSocket server"
    );

    ws.send(JSON.stringify({
        type: "subscribe",
        channel: "orderbook",
        symbol: "BTCUSDT"
    }));
});

ws.on("message", (message) => {

    console.log(
        "Server response:",
        message.toString()
    );
});

ws.on("close", () => {

    console.log("Connection closed");
});

ws.on("error", (error) => {

    console.log("WebSocket error:", error);
});