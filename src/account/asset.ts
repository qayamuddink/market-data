
export type Asset = "BTC" | "USDT";

export const ASSET_SCALE: Record<Asset, number> = {
    BTC: 100_000_000,
    USDT: 100
}

export function amountToUnits(asset: Asset, amount: number) : number {
    return Math.round(amount * ASSET_SCALE[asset])
}

export function unitsToAmount(asset: Asset, units: number): number {
    return units/ ASSET_SCALE[asset]
}

export function calculateQuoteAmount(
    price: number,
    quantity: number
): number {
    return Math.round((price * quantity) / ASSET_SCALE.BTC);
}