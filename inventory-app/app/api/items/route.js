import { supabase } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const { data, error } = await supabase.from('items').select('*')
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const name = formData.get('name')
    const qty = Number(formData.get('qty'))
    const image = formData.get('image')

    if (!name || !qty || !image) {
      return new Response(JSON.stringify({ error: 'Missing name, qty, or image' }), { status: 400 })
    }

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('items-images')
      .upload(`${Date.now()}_${image.name}`, image)

    if (uploadError) return new Response(JSON.stringify({ error: uploadError.message }), { status: 400 })

    // Get public URL
    const { data: publicData, error: urlError } = supabase.storage
      .from('items-images')
      .getPublicUrl(uploadData.path)

    if (urlError) return new Response(JSON.stringify({ error: urlError.message }), { status: 400 })

    const imageUrl = publicData.publicUrl

    const { error: insertError } = await supabase.from('items').insert({
      name,
      total_qty: qty,
      available_qty: qty,
      image_url: imageUrl
    })

    if (insertError) return new Response(JSON.stringify({ error: insertError.message }), { status: 400 })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const formData = await req.formData()
    const id = formData.get('id')
    const name = formData.get('name')
    const total_qty = Number(formData.get('total_qty'))
    const image = formData.get('image')

    if (!id || !name || !total_qty) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    let imageUrl
    if (image && image.size > 0) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('items-images')
        .upload(`${Date.now()}_${image.name}`, image)

      if (uploadError) return new Response(JSON.stringify({ error: uploadError.message }), { status: 400 })

      const { data: publicData, error: urlError } = supabase.storage
        .from('items-images')
        .getPublicUrl(uploadData.path)

      if (urlError) return new Response(JSON.stringify({ error: urlError.message }), { status: 400 })

      imageUrl = publicData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({
        name,
        total_qty,
        available_qty: total_qty, // optional: reset available qty
        ...(imageUrl ? { image_url: imageUrl } : {})
      })
      .eq('id', id)

    if (updateError) return new Response(JSON.stringify({ error: updateError.message }), { status: 400 })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
