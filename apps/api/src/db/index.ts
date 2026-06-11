import { createClient, Client } from "@libsql/client/web";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

let cachedDb: LibSQLDatabase<typeof schema> | null = null;
let cachedClient: Client | null = null;

export function getDb(url: string, token: string) {
  if (cachedDb && cachedClient) {
    return cachedDb;
  }
  
  cachedClient = createClient({
    url,
    authToken: token,
  });
  
  cachedDb = drizzle(cachedClient, { schema });
  return cachedDb;
}
