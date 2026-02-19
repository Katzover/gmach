import { supabase } from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const { item_id, borrower, quantity, price } = await req.json()
    if (!item_id || !borrower || !quantity) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // Validate item exists
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('available_qty')
      .eq('id', item_id)
      .single()
    
    if (itemError || !itemData) {
      return new Response(JSON.stringify({ error: 'Item not found - index out of range' }), { status: 404 })
    }

    // Insert loan with price if provided
    const loanData = {
      item_id,
      borrower,
      quantity,
      date_taken: new Date()
    }
    if (price !== undefined && price !== null) {
      loanData.price = Number(price)
    }

    const { error } = await supabase.from('loans').insert(loanData)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })

    await supabase
      .from('items')
      .update({ available_qty: itemData.available_qty - quantity })
      .eq('id', item_id)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
