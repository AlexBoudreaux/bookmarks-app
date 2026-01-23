#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.+)$/)
  if (match) {
    const value = match[2].trim()
    // Remove quotes if present
    envVars[match[1].trim()] = value.replace(/^["']|["']$/g, '')
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyCategories() {
  // Get all main categories (parent_id is null)
  const { data: mainCategories, error: mainError } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .is('parent_id', null)
    .order('sort_order')

  if (mainError) {
    console.error('Error fetching main categories:', mainError)
    process.exit(1)
  }

  console.log(`\nFound ${mainCategories?.length} main categories:\n`)

  for (const mainCat of mainCategories || []) {
    console.log(`${mainCat.sort_order}. ${mainCat.name}`)

    // Get subcategories
    const { data: subCategories, error: subError } = await supabase
      .from('categories')
      .select('name, sort_order')
      .eq('parent_id', mainCat.id)
      .order('sort_order')

    if (subError) {
      console.error(`Error fetching subcategories for ${mainCat.name}:`, subError)
      continue
    }

    if (subCategories && subCategories.length > 0) {
      for (const subCat of subCategories) {
        console.log(`   ${subCat.sort_order}. ${subCat.name}`)
      }
    }
    console.log()
  }

  // Get total count
  const { count, error: countError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Error counting categories:', countError)
  } else {
    console.log(`Total categories (main + sub): ${count}\n`)
  }
}

verifyCategories()
