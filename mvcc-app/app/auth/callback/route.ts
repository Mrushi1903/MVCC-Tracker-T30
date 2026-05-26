import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allow-list of internal paths we'll redirect to after sign-in. Prevents an
// open-redirect bug where someone passes ?next=https://evil.com.
const ALLOWED_NEXT = new Set([
  '/t30/admin',
  '/t30/availability',
])

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Send the user back to whichever flow initiated the sign-in. Default
  // to the admin page (legacy behaviour) when no hint is provided.
  const next = requestedNext && ALLOWED_NEXT.has(requestedNext) ? requestedNext : '/t30/admin'
  return NextResponse.redirect(new URL(next, request.url))
}
