const QUANTITY_SCALE = 100_000_000;
const PRICE_SCALE = 100;

export function quantityToUnits(quantity: number): number {
    return Math.round(quantity * QUANTITY_SCALE);
}

export function unitsToQuantity(units: number): number {
    return units / QUANTITY_SCALE;
}

export function priceToUnits(price: number): number {
    return Math.round(price * PRICE_SCALE);
}

export function unitsToPrice(units: number): number {
    return units / PRICE_SCALE;
}