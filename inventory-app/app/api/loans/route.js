import { supabase } from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const { item_id, borrower, quantity } = await req.json()
    if (!item_id || !borrower || !quantity) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // Insert loan
    const { error } = await supabase.from('loans').insert({
      item_id,
      borrower,
      quantity,
      date_taken: new Date()
    })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })

    // Update available quantity
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('available_qty')
      .eq('id', item_id)
      .single()
    if (itemError) return new Response(JSON.stringify({ error: itemError.message }), { status: 400 })

    await supabase
      .from('items')
      .update({ available_qty: itemData.available_qty - quantity })
      .eq('id', item_id)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
