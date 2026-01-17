import { supabase } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('date_taken', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
