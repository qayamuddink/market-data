import {sql } from "./client";

async function main(){
    const result = await sql `SELECT  NOW() AS current_time`
    console.log(result);

    await sql.end();
    
}

main()