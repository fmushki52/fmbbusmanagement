import { neon, Pool } from '@neondatabase/serverless'
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http'
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'

// HTTP driver singleton — for simple reads (no transactions)
const httpSql = neon(process.env.DATABASE_URL!)
export const db = drizzleHttp(httpSql, { schema })

// WebSocket Pool singleton — for transactions with FOR UPDATE
let _pool: Pool | null = null
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return _pool
}
export function getTxDb() {
  return drizzleWs(getPool(), { schema })
}
