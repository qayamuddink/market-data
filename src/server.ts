import express from "express";
import { getLatestPrice } from "./market/price";
import "./exchange/websocket";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status:"ok"
    })
})


app.get("/price" , (req,res) => {
    res.json(getLatestPrice());
})

app.get("/market" , (req,res) => {
    const market = getLatestPrice();
    res.json({
        symbol:market.symbol,
        price:market.price,
        timestamp:market.timestamp
    })
})



app.listen(3000, () => {
    console.log("Market data server running on port 3000");
})