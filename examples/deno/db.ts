import { config } from "https://deno.land/x/dotenv/mod.ts";
import { Pool } from "https://deno.land/x/postgres/mod.ts";

const env = config({path:"../.env"});

/**
 * The authentication object to connect to the postgreSQL database.
 */
const pool = new Pool({
    user: env.user,
    password: env.password,
    database: env.database,
    hostname: env.hostname,
    port: env.port,
}, 4, true);

/**
 * Run a query on the postgreSQL database.
 *
 * @param q the postgreSQL query string
 */
export async function query(query: string) {
    const client = await pool.connect();
    let result;
    try {
        result = await client.queryObject(query);
    } finally {
        client.release();
    }
    return result;
}
