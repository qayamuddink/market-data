import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({
    port: 8080
});

const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
    console.log("Client connected");

    clients.add(ws);

    ws.on("message", (message) => {
        console.log("Received:", message.toString());

        for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(
                    JSON.stringify({
                        type: "broadcast",
                        message: message.toString()
                    })
                );
            }
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");

        clients.delete(ws);
    });
});

console.log("WebSocket server started on port 8080");