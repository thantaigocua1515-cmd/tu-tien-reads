const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, itemId, itemPrice } = req.body || {};
  if (!userId || !itemId || !itemPrice) {
    return res.status(400).json({ error: 'userId, itemId, and itemPrice are required' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  if ((profile.spirit_stones || 0) < Number(itemPrice)) {
    return res.status(400).json({ error: 'Not enough spirit stones' });
  }

  const { error: purchaseErr } = await supabase.from('purchases').insert({
    user_id: userId,
    item_id: itemId,
  });

  if (purchaseErr) {
    return res.status(500).json({ error: purchaseErr.message });
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ spirit_stones: (profile.spirit_stones || 0) - Number(itemPrice) })
    .eq('id', userId);

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message });
  }

  return res.status(200).json({ success: true });
};
