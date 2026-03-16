import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const token = request.cookies.get('gmach_session')?.value
    if (!token) return NextResponse.json({ role: null }, { status: 401 })

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get the user from the token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ role: null }, { status: 401 })

    // Role is stored in user_metadata: { role: 'admin' } or { role: 'viewer' }
    const role = user.user_metadata?.role || 'viewer'
    return NextResponse.json({ role })

  } catch (err) {
    console.error('Auth me error:', err)
    return NextResponse.json({ role: 'viewer' })
  }
}