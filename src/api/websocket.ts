import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({
    port: 8080
});

const clients = new Set<WebSocket>();

export function broadcast(event: object): void {
    const message = JSON.stringify(event);

    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

wss.on("connection", (ws) => {
    console.log("Client connected");

    clients.add(ws);

    ws.on("message", (message) => {
        console.log("Received:", message.toString());

        broadcast({
            type: "broadcast",
            message: message.toString()
        });
    });

    ws.on("close", () => {
        console.log("Client disconnected");

        clients.delete(ws);
    });
});

console.log("WebSocket server started on port 8080");