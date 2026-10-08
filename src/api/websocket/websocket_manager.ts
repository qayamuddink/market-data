import WebSocket from "ws";
import type { Subscription } from "./websocket_types";

export class WebSocketManager {
    private clients = new Set<WebSocket>();

    private subscriptions = new Map<
        WebSocket,
        Set<string>
    >();

    addClient(ws: WebSocket): void {
        this.clients.add(ws);
        this.subscriptions.set(ws, new Set());
    }

    removeClient(ws: WebSocket): void {
        this.clients.delete(ws);
        this.subscriptions.delete(ws);
    }

    subscribe(
        ws: WebSocket,
        subscription: Subscription
    ): void {
        const clientSubscriptions = this.subscriptions.get(ws);

        if (!clientSubscriptions) {
            return;
        }

        const key = this.createSubscriptionKey(
            subscription.channel,
            subscription.symbol
        );

        clientSubscriptions.add(key);
    }

    unsubscribe(
        ws: WebSocket,
        subscription: Subscription
    ): void {
        const clientSubscriptions = this.subscriptions.get(ws);

        if (!clientSubscriptions) {
            return;
        }

        const key = this.createSubscriptionKey(
            subscription.channel,
            subscription.symbol
        );

        clientSubscriptions.delete(key);
    }

    broadcast(
        channel: string,
        symbol: string,
        event: object
    ): void {
        const key = this.createSubscriptionKey(
            channel,
            symbol
        );

        const message = JSON.stringify(event);

        for (const client of this.clients) {
            const subscriptions = this.subscriptions.get(client);

            if (!subscriptions) {
                continue;
            }

            if (!subscriptions.has(key)) {
                continue;
            }

            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    private createSubscriptionKey(
        channel: string,
        symbol: string
    ): string {
        return `${channel}:${symbol}`;
    }
}