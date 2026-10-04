import type { ExecuteTrade, Order , OrderBook as OrderBookType, PriceLevel } from "../types/order";

export class OrderBook {
    private bids : Map<number,PriceLevel> = new Map();
    private asks : Map<number, PriceLevel> = new Map();

    addOrder (order : Order): void{
        const book = order.side === "BUY"
            ? this.bids : this.asks

            const priceLevel = book.get(order.price);
            
            if (priceLevel) {
                priceLevel.orders.push(order)
                return
            }
            book.set(order.price,{
                price:order.price,
                orders:[order]
            })
        }

    getBook() : OrderBookType {
        return {
           bids: this.bids,
           asks: this.asks
        }
    }

    getBestBid(): PriceLevel | undefined {
        let bestBid: PriceLevel | undefined;

        for (const priceLevel of this.bids.values()) {
            if (!bestBid || priceLevel.price > bestBid.price) {
                bestBid = priceLevel;
            }
        }

        return bestBid;
    }

    getBestAsk(): PriceLevel | undefined {
        let bestAsk: PriceLevel | undefined;
        for(const priceLevel of this.asks.values()){
            if(!bestAsk || priceLevel.price < bestAsk.price){
            bestAsk = priceLevel
        }
        }
        return bestAsk
    }
    
    matchOrder(order: Order) : ExecuteTrade | undefined {
        if(order.side === "BUY") {
            const bestAsk = this.getBestAsk();
            if(!bestAsk) {
                return undefined;
            }
            if(order.price < bestAsk.price){
                return undefined;
            }

            const matchedOrder = bestAsk.orders[0];
            // if(order.quantity !== matchedOrder?.quantity){
            //     return undefined
            // }

            const 
            if (!matchedOrder) {
                return undefined;
            }

            return {
                id : `trade-${Date.now()}`,
                symbol: order.symbol,
                price: matchedOrder.price,
                quantity: order.quantity,
                buyOrderId: order.id,
                sellOrderId: matchedOrder.id,
                timestamp: Date.now()
            }
        }

        const bestBid = this.getBestBid();
            if(!bestBid) {
                return undefined
            }
            
            if(order.price > bestBid?.price){
                return undefined
            }

            const matchedOrder = bestBid.orders[0];
            
            if(order.quantity !== matchedOrder?.quantity) {
                return undefined;
            }

            return {
                id: `trade-${Date.now()}`,
                symbol: matchedOrder.symbol,
                price: matchedOrder.price,
                quantity: order.quantity,
                buyOrderId: matchedOrder.id,
                sellOrderId: order.id,
                timestamp: Date.now()
            }
    }
}