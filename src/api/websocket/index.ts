import { EventBus } from "../../events/event_bus";
import { WebSocketManager } from "./websocket_manager";
import { WebSocketServerManager } from "./websocket_server";

const eventBus = new EventBus();

const websocketManager = new WebSocketManager();

new WebSocketServerManager(
    eventBus,
    websocketManager
)