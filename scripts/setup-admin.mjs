import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const email = 'khangitvns123@gmail.com';

async function setAdmin() {
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const target = userList.users.find((u) => u.email === email);
  if (!target) throw new Error(`User not found: ${email}`);

  const { error } = await supabase
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

  if (error) throw error;

  console.log('Admin role assigned:', email);
}

setAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
