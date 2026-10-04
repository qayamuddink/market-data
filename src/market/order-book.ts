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
    
    matchOrder(order: Order) : ExecuteTrade[] {
        const trades: ExecuteTrade[] = [];

        let remainingQuantity = order.quantity;

        if(order.side === "BUY") {

        // Incoming order is BUY.
        // Therefore, we look for a SELL order.

           while(remainingQuantity > 0){
             const bestAsk = this.getBestAsk();
            if(!bestAsk) {
                break;
            }
            // buy price must be >= sell price
            if(order.price < bestAsk.price){
                break;
            }

            const matchedOrder = bestAsk.orders[0];
            // if(order.quantity !== matchedOrder?.quantity){
            //     return undefined
            // }

            if (!matchedOrder) {
                break;
            }
            const tradeQuantity = Math.min(
                remainingQuantity,
                matchedOrder.quantity
            )

            matchedOrder.quantity -= tradeQuantity;
            remainingQuantity -= tradeQuantity;

            console.log("remaining buy quantity:", remainingQuantity);
            
            // if(remainingQuantity > 0){
            //     this.addOrder({
            //         ...order,
            //         quantity: remainingQuantity
            //     })
            // }

            // sell order completely filled
            if (matchedOrder.quantity === 0){
                bestAsk.orders.shift()
            }

            //no sell orders left at this place
            if(bestAsk.orders.length === 0){
                this.asks.delete(bestAsk.price)
            }

            const trade: ExecuteTrade = {
                id: `trade-${Date.now()}`,
                symbol: order.symbol,
                price: matchedOrder.price,
                quantity: tradeQuantity,
                buyOrderId: order.id,
                sellOrderId: matchedOrder.id,
                timestamp: Date.now()
            };
            trades.push(trade)
            
           }

           if (remainingQuantity > 0) {
                this.addOrder({
                    ...order,
                    quantity: remainingQuantity
                });
            }
           return trades;
        }

        while(remainingQuantity > 0){
             // Incoming order is SELL.
    // Therefore, we look for a BUY order.
        const bestBid = this.getBestBid();
            if(!bestBid) {
                break;
            }
             // SELL price must be <= BUY price
            if(order.price > bestBid?.price){
                break;
            }

            const matchedOrder = bestBid.orders[0];
            
            if(!matchedOrder) {
                return trades;
            }
            const tradeQuantity = Math.min(
                remainingQuantity,
                matchedOrder.quantity
            )

            matchedOrder.quantity -= tradeQuantity;
            remainingQuantity -= tradeQuantity;

            //  remainingQuantity = order.quantity - tradeQuantity;

            
            
            console.log("Remaining sell quantity: " ,remainingQuantity);
            

            if (matchedOrder.quantity === 0) {
                bestBid.orders.shift()
            }

            if(bestBid.orders.length === 0){
                this.bids.delete(bestBid.price)
            }

           const trade: ExecuteTrade = {
                id: `trade-${Date.now()}`,
                symbol: order.symbol,
                price: matchedOrder.price,
                quantity: tradeQuantity,
                buyOrderId: matchedOrder.id,
                sellOrderId: order.id,
                timestamp: Date.now()
            };
            trades.push(trade)
        }

        if(remainingQuantity > 0){
            this.addOrder({
                ...order,
                quantity: remainingQuantity
            })
        }

        return trades;

    }

}