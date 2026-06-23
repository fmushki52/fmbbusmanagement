# BusBoard — Event Passenger Confirmation

Production-ready web app for confirming bus passenger seating at events. Group leaders scan/type passenger Ref IDs to confirm boarding; admin manages events, buses, passengers and users; reporters export PDF/Excel summaries.

## Tech Stack

- **Next.js 16 App Router** + TypeScript
- **Drizzle ORM** + **Neon serverless Postgres**
- **Tailwind CSS** — glass/iOS theme, light + dark
- **jose** JWT sessions (httpOnly cookie)
- **exceljs** + **pdfkit** for reports
- **papaparse** + **exceljs** for CSV/Excel import

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env.local` and fill in:
   ```
   DATABASE_URL=<Neon pooled connection string>
   DIRECT_URL=<Neon direct (non-pooled) connection string>
   SESSION_SECRET=<random 32+ char string>
   SEED_ADMIN_PASSWORD=admin123
   ```

3. **Run migration** (creates all tables and indexes):
   ```bash
   node -e "
   const {Client}=require('@neondatabase/serverless')
   const fs=require('fs')
   require('dotenv').config({path:'.env.local'})
   async function run(){
     const sql=fs.readFileSync('lib/db/migrations/0001_initial.sql','utf8')
     const c=new Client(process.env.DATABASE_URL)
     await c.connect(); await c.query(sql); await c.end()
     console.log('Done')
   }
   run().catch(console.error)
   "
   ```
   
   Or with drizzle-kit: `npm run db:push`

4. **Seed demo data**:
   ```bash
   npm run seed
   ```
   Creates: 1 event, 3 buses, 30 passengers, admin + 2 leaders + 1 reporter.

5. **Dev server**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Credentials (after seed)

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Admin (full access) |
| leader1 | user1pass | User (buses 1 & 2) |
| leader2 | user2pass | User (bus 3) |
| reporter | reporter123 | Reporter (read-only) |

## Roles

- **admin** — full CRUD on events, buses, passengers, users; boarding override; reports
- **user** — boarding screen only; confirms passengers onto assigned bus; can see/remove own bus
- **reporter** — export event summaries and per-bus reports (PDF/Excel); no mutations

## Neon Connection

- Use the **pooled** `-pooler` connection string as `DATABASE_URL` (used by the app)
- Use the **direct** (non-pooled) connection as `DIRECT_URL` (used for migrations)
- The boarding transaction uses WebSocket pool for `FOR UPDATE` locking

## Deployment (Vercel)

```bash
vercel --prod
```

Set `DATABASE_URL`, `DIRECT_URL`, and `SESSION_SECRET` in Vercel environment variables.

Run migration against `DIRECT_URL` in the build step or separately before first deploy.

## Assumptions

- Neon region: `us-east-1` (co-locate Vercel function region for minimal latency)
- Sessions expire after 7 days
- Bulk import chunk size: 500 rows per INSERT batch
- Ref IDs are unique within an event (not globally)
- Reporter role has access to all events (no event-scoping implemented; easy to add via `reporter_events` table)
