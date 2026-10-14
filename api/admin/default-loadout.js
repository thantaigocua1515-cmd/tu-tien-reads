const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frame, artifact, manifestation } = req.body || {};
  if (!frame && !artifact && !manifestation) {
    return res.status(400).json({ error: 'You must provide at least one value' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const payload = {
    key: 'default_loadout',
    value: {
      frame: frame || null,
      artifact: artifact || null,
      manifestation: manifestation || null,
    },
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, setting: data });
};
