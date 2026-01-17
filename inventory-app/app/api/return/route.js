import { supabase } from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const { item_id, returner, quantity } = await req.json()

    // Fix: allow quantity = 0 (or check if missing)
    if (!item_id || !returner || quantity == null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty <= 0) {
      return new Response(JSON.stringify({ error: 'Quantity must be a positive number' }), { status: 400 })
    }

    // 1️⃣ Get all loans for this borrower and item
    const { data: loans, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('item_id', item_id)
      .eq('borrower', returner)

    if (loanError) return new Response(JSON.stringify({ error: loanError.message }), { status: 400 })

    // 2️⃣ Filter loans with remaining quantity to return
    const activeLoans = loans.filter(loan => (loan.quantity - (loan.returned_qty || 0)) > 0)
    if (!activeLoans.length) {
      return new Response(JSON.stringify({ error: 'No active loan found for this borrower' }), { status: 400 })
    }

    let remaining = qty
    for (const loan of activeLoans) {
      const availableToReturn = loan.quantity - (loan.returned_qty || 0)
      const returnNow = Math.min(availableToReturn, remaining)

      const { error: updateLoanError } = await supabase
        .from('loans')
        .update({ returned_qty: (loan.returned_qty || 0) + returnNow })
        .eq('id', loan.id)

      if (updateLoanError) {
        return new Response(JSON.stringify({ error: updateLoanError.message }), { status: 400 })
      }

      remaining -= returnNow
      if (remaining <= 0) break
    }

    if (remaining > 0) {
      return new Response(JSON.stringify({ error: 'Trying to return more than borrowed' }), { status: 400 })
    }

    // 3️⃣ Update available_qty in items
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('available_qty, total_qty')
      .eq('id', item_id)
      .single()

    if (itemError) return new Response(JSON.stringify({ error: itemError.message }), { status: 400 })

    const newQty = item.available_qty + qty
    if (newQty > item.total_qty) {
      return new Response(JSON.stringify({ error: 'Return exceeds total quantity' }), { status: 400 })
    }

    const { error: updateItemError } = await supabase
      .from('items')
      .update({ available_qty: newQty })
      .eq('id', item_id)

    if (updateItemError) {
      return new Response(JSON.stringify({ error: updateItemError.message }), { status: 400 })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
