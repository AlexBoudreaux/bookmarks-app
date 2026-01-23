import { NextRequest, NextResponse } from 'next/server'
import ogs from 'open-graph-scraper'
import { supabase } from '@/lib/supabase'

interface OGResult {
  ogTitle?: string
  ogDescription?: string
  ogImage?: Array<{ url: string }>
  ogSiteName?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: Array<{ url: string }>
  favicon?: string
  success?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { url, bookmarkId } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch OG metadata with custom user agent to avoid blocking
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

    const { error, result } = await ogs({
      url,
      timeout: 10,
      fetchOptions: { headers: { 'user-agent': userAgent } },
    }) as { error: boolean; result: OGResult }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch metadata' },
        { status: 500 }
      )
    }

    // Extract OG data with Twitter card fallback
    const title = result.ogTitle || result.twitterTitle
    const description = result.ogDescription || result.twitterDescription
    const image = result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url
    const siteName = result.ogSiteName
    const favicon = result.favicon

    // Cache og_image to database if bookmarkId provided
    if (bookmarkId && image) {
      const { error: dbError } = await supabase
        .from('bookmarks')
        .update({ og_image: image })
        .eq('id', bookmarkId)

      if (dbError) {
        console.error('Failed to cache og_image:', dbError)
      }
    }

    return NextResponse.json({
      title,
      description,
      image,
      siteName,
      favicon,
    })
  } catch (error) {
    console.error('Error in OG route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    )
  }
}
