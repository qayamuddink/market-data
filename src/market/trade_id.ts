
let tradeId = 0 ;

export function generateTradeId() : string {
    tradeId++;
    return `trade-${tradeId}`
}