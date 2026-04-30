import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function POST(request) {
  try {
    const { item_id, borrower, quantity, admin, price, event_date } = await request.json()
    const supabase = getSupabase()

    // Check available quantity
    const { data: item, error: itemErr } = await supabase
      .from('items').select('available_qty').eq('id', item_id).single()
    if (itemErr || !item) return NextResponse.json({ error: 'פריט לא נמצא' }, { status: 404 })
    if (item.available_qty < quantity) return NextResponse.json({ error: 'אין מספיק יחידות זמינות' }, { status: 400 })

    // Insert loan — include event_date (may be null)
    const { error: loanErr } = await supabase.from('loans').insert({
      item_id,
      borrower,
      quantity,
      admin,
      payment: price ?? -1,
      event_date: event_date || null,
      date_taken: new Date().toISOString(),
    })
    if (loanErr) throw loanErr

    // Decrement available_qty
    const { error: updateErr } = await supabase
      .from('items').update({ available_qty: item.available_qty - quantity }).eq('id', item_id)
    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/loans error:', err)
    if (loanErr) return NextResponse.json({ raw: loanErr }, { status: 500 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
