import { supabase } from '@/lib/supabaseServer'

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params
    const item_id = (resolvedParams?.item_id || '').trim()

    console.log("item_id:", item_id)

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: "Missing item_id" }),
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('item_id', item_id)
      .order('date_taken', { ascending: false })

    if (error) {
      console.log("SUPABASE ERROR:", error)
      return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }

    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err) {
    console.log("CATCH ERROR:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}