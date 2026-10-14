const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { id, name, item_type, asset_url, price, description } = req.body || {};

  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({ error: 'id is required for delete' });
    }

    const { error } = await supabase.from('shop_items').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  if (!name || !item_type || !asset_url || !price) {
    return res.status(400).json({ error: 'name, item_type, asset_url, and price are required' });
  }

  const payload = {
    name,
    item_type,
    asset_url,
    price: Number(price),
    description: description || '',
  };

  if (req.method === 'PUT' && id) {
    const { data, error } = await supabase
      .from('shop_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, item: data });
  }

  const { data, error } = await supabase
    .from('shop_items')
    .insert([payload])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ success: true, item: data });
};
