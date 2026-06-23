import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from '../lib/db/schema'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const db = drizzle(pool, { schema })

async function seed() {
  console.log('Seeding database...')

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123'
  const adminHash = await bcrypt.hash(adminPassword, 12)

  const [admin] = await db.insert(schema.users)
    .values({ username: 'admin', passwordHash: adminHash, role: 'admin' })
    .onConflictDoUpdate({ target: schema.users.username, set: { passwordHash: adminHash } })
    .returning()
  console.log('Admin user:', admin.username)

  const reporterHash = await bcrypt.hash('reporter123', 12)
  const [reporter] = await db.insert(schema.users)
    .values({ username: 'reporter', passwordHash: reporterHash, role: 'reporter' })
    .onConflictDoUpdate({ target: schema.users.username, set: { passwordHash: reporterHash } })
    .returning()
  console.log('Reporter user:', reporter.username)

  const [event] = await db.insert(schema.events)
    .values({ name: 'Annual Conference 2025', description: 'Our annual company conference', eventDate: '2025-09-15', status: 'active' })
    .returning()
  console.log('Event:', event.name)

  const busData = [
    { busNumber: '1', busName: 'Alpha', groupLeaderName: 'Sarah Johnson', groupLeaderContact: '+1-555-0101', capacity: 45 },
    { busNumber: '2', busName: 'Beta', groupLeaderName: 'Mike Chen', groupLeaderContact: '+1-555-0102', capacity: 40 },
    { busNumber: '3', busName: 'Gamma', groupLeaderName: 'Lisa Park', groupLeaderContact: '+1-555-0103', capacity: 35 },
  ]
  const createdBuses: typeof schema.buses.$inferSelect[] = []
  for (const b of busData) {
    const [bus] = await db.insert(schema.buses).values({ ...b, eventId: event.id }).returning()
    createdBuses.push(bus)
    console.log(`Bus #${bus.busNumber}: ${bus.busName}`)
  }

  const user1Hash = await bcrypt.hash('user1pass', 12)
  const [user1] = await db.insert(schema.users).values({ username: 'leader1', passwordHash: user1Hash, role: 'user' })
    .onConflictDoUpdate({ target: schema.users.username, set: { passwordHash: user1Hash } }).returning()
  const user2Hash = await bcrypt.hash('user2pass', 12)
  const [user2] = await db.insert(schema.users).values({ username: 'leader2', passwordHash: user2Hash, role: 'user' })
    .onConflictDoUpdate({ target: schema.users.username, set: { passwordHash: user2Hash } }).returning()

  await db.insert(schema.userBuses).values({ userId: user1.id, busId: createdBuses[0].id }).onConflictDoNothing()
  await db.insert(schema.userBuses).values({ userId: user1.id, busId: createdBuses[1].id }).onConflictDoNothing()
  await db.insert(schema.userBuses).values({ userId: user2.id, busId: createdBuses[2].id }).onConflictDoNothing()
  console.log('Users: leader1 (buses 1&2), leader2 (bus 3)')

  const names = ['Alice Thompson','Bob Martinez','Carol White','David Lee','Eva Brown','Frank Wilson','Grace Kim','Henry Davis','Iris Patel','Jack Robinson','Kelly Adams','Liam Harris','Maya Clark','Nathan Scott','Olivia Turner','Paul Garcia','Quinn Baker','Rachel Moore','Sam Anderson','Tina Jackson','Uma Taylor','Victor Lewis','Wendy Hall','Xavier Young','Yara Walker','Zoe Hall','Aaron King','Beth Wright','Chris Lopez','Diana Reed']
  const genders = ['F','M','F','M','F','M','F','M','F','M','F','M','F','M','F','M','F','F','M','F','F','M','F','M','F','F','M','F','M','F']
  const rows = names.map((name, i) => ({
    eventId: event.id,
    refId: 'MBR' + String(i + 1).padStart(4, '0'),
    name,
    gender: genders[i],
    age: 22 + i,
    assignedBusId: i < 10 ? createdBuses[0].id : i < 20 ? createdBuses[1].id : i < 27 ? createdBuses[2].id : null,
  }))
  await db.insert(schema.passengers).values(rows).onConflictDoNothing()
  console.log(`${rows.length} passengers created`)

  console.log('\nSeed complete!')
  console.log('  Admin:    admin /', adminPassword)
  console.log('  Leader 1: leader1 / user1pass')
  console.log('  Leader 2: leader2 / user2pass')
  console.log('  Reporter: reporter / reporter123')
  await pool.end()
}

seed().catch(e => { console.error(e); process.exit(1) })
