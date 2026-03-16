import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'נדרש אימייל וסיסמה' }, { status: 400 })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase env vars:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
      return NextResponse.json({ error: 'שגיאת תצורת שרת' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error || !data.session) {
      console.error('Supabase auth error:', error?.message)
      return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set('gmach_session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response

  } catch (err) {
    console.error('Login route crash:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}