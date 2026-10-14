const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    return res.status(500).json({ error: listErr.message });
  }

  const target = userList.users.find((u) => u.email === email);
  if (!target) {
    return res.status(404).json({ error: `User not found: ${email}` });
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: target.id,
      username: target.email.split('@')[0],
      display_name: target.email.split('@')[0],
      role: 'admin',
      is_admin: true,
      status: 'active',
    })
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, profile: data });
};
