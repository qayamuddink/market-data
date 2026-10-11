
import { sql } from "./client";
import { readFile } from "node:fs/promises";

async function main() {
    await sql`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `;

    const name = "001_initial_schema.sql";

    const existing = await sql`
        SELECT name
        FROM schema_migrations
        WHERE name = ${name}
    `;

    if (existing.length > 0) {
        console.log(`Migration already applied: ${name}`);
        return;
    }

    const migration = await readFile(
        `migrations/${name}`,
        "utf8"
    );

    await sql.begin(async (transaction) => {
        await transaction.unsafe(migration);

        await transaction`
            INSERT INTO schema_migrations (name)
            VALUES (${name})
        `;
    });

    console.log(`Migration applied: ${name}`);
}

main()
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sql.end();
    });
