#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { readFileSync } from 'fs'
import { pgTable, uuid, text, integer } from 'drizzle-orm/pg-core'
import { isNull, eq, count, asc } from 'drizzle-orm'

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.+)$/)
  if (match) {
    const value = match[2].trim()
    envVars[match[1].trim()] = value.replace(/^["']|["']$/g, '')
  }
}

const databaseUrl = envVars.neon_DATABASE_URL
if (!databaseUrl) {
  console.error('neon_DATABASE_URL not found in .env.local')
  process.exit(1)
}

const sql = neon(databaseUrl)
const db = drizzle(sql)

const categories = pgTable('categories', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  parentId: uuid('parent_id'),
  sortOrder: integer('sort_order'),
})

async function verifyCategories() {
  const mainCategories = await db
    .select({ id: categories.id, name: categories.name, sortOrder: categories.sortOrder })
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(asc(categories.sortOrder))

  console.log(`\nFound ${mainCategories.length} main categories:\n`)

  for (const mainCat of mainCategories) {
    console.log(`${mainCat.sortOrder}. ${mainCat.name}`)

    const subCategories = await db
      .select({ name: categories.name, sortOrder: categories.sortOrder })
      .from(categories)
      .where(eq(categories.parentId, mainCat.id))
      .orderBy(asc(categories.sortOrder))

    if (subCategories.length > 0) {
      for (const subCat of subCategories) {
        console.log(`   ${subCat.sortOrder}. ${subCat.name}`)
      }
    }
    console.log()
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(categories)

  console.log(`Total categories (main + sub): ${total}\n`)
}

verifyCategories()
