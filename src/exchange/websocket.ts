import { updatePrice } from "../market/price";
import type { Trade } from "../types/market";


function connect() {
    const ws = new WebSocket ("wss://stream.binance.com:9443/ws/btcusdt@trade")

    ws.onopen = () => {
        console.log("connected to exchange websocket");
    }

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const trade : Trade = {
            symbol:data.s,
            price:Number(data.p),
            quantity:Number(data.q),
            timestamp:data.E
        }

        // console.log(trade);

        updatePrice({
            symbol:trade.symbol,
            price:trade.price,
            timestamp:trade.timestamp
        })
        
    }


    ws.onerror = (error) => {
        console.error("Websocket error:" , error);
    }
    ws.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting...");

        setTimeout(() => {
            connect();
        }, 3000);
    };

}


connect()


