import type { ExchangeEvent } from "./event";


export class EventBus {
    private listeners:  Array<(event: ExchangeEvent) => void> = [];

    subscribe (
        listener: (event: ExchangeEvent) => void
    ) : void {
        this.listeners.push(listener);
    }

    publish(event: ExchangeEvent) : void {
        for( const listener of this.listeners){
            listener(event)
        }
    } 

}