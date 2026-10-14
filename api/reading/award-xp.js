const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, xpGain = 10, secondsGain = 10 } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
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
    return res.status(404).json({ error: 'User profile not found' });
  }

  const nextXp = (profile.xp || 0) + Number(xpGain);
  const nextSeconds = (profile.total_reading_seconds || 0) + Number(secondsGain);

  const realmOrder = [
    { key: 'luyen_khi', name: 'Luyện Khí', xpThreshold: 0 },
    { key: 'truc_co', name: 'Trúc Cơ', xpThreshold: 3600 },
    { key: 'kim_dan', name: 'Kim Đan', xpThreshold: 36000 },
    { key: 'nguyen_anh', name: 'Nguyên Anh', xpThreshold: 180000 },
    { key: 'hoa_than', name: 'Hóa Thần', xpThreshold: 864000 },
  ];

  let nextRealm = realmOrder[0];
  for (const realm of realmOrder) {
    if (nextXp >= realm.xpThreshold) nextRealm = realm;
  }

  const previousRealm = profile.realm || 'Luyện Khí';
  const bonusStones = previousRealm !== nextRealm.name ? 50 : 0;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      xp: nextXp,
      total_reading_seconds: nextSeconds,
      realm: nextRealm.name,
      spirit_stones: (profile.spirit_stones || 0) + bonusStones,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    success: true,
    profile: data,
    realmBreakthrough: previousRealm !== nextRealm.name,
    bonusStones,
  });
};
