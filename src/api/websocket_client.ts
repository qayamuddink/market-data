const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
    console.log("Connected to WebSocket server");

    ws.send("hello");
};

ws.onmessage = (event) => {
    console.log("Server response:", event.data);

    ws.close();
};

ws.onclose = () => {
    console.log("Connection closed");
};