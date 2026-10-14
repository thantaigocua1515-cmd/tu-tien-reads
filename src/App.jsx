import { useEffect, useMemo, useState } from 'react';
import {
  Flame,
  LogOut,
  Sparkles,
  ShieldCheck,
  Settings2,
  Users,
  Coins,
  BookOpen,
  BookText,
  MoonStar,
  SunMedium,
  ChevronRight,
  Mail,
  Lock,
  UserPlus,
  UploadCloud,
  Sword,
  Trophy,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { getRealmFromXp, formatSeconds } from './data/realms';

const OPENAPI_URL = 'https://truyenok.online/api/v1/openapi.json';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterContent, setChapterContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [autoScroll, setAutoScroll] = useState(true);
  const [readingActive, setReadingActive] = useState(false);
  const [defaultLoadout, setDefaultLoadout] = useState({});
  const [openapiSummary, setOpenapiSummary] = useState('Đang kiểm tra OpenAPI...');
  const [message, setMessage] = useState('');

  const currentRealm = useMemo(() => getRealmFromXp(profile?.xp || 0), [profile?.xp]);

  useEffect(() => {
    const loadSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setSession(sessionData.session);
        await ensureProfile(sessionData.session.user.id, sessionData.session.user.email);
        await loadProfile(sessionData.session.user.id);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        await ensureProfile(nextSession.user.id, nextSession.user.email);
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    loadSession();
    loadDefaultLoadout();
    discoverOpenApi();

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!readingActive || !session?.user) return;

    const interval = setInterval(async () => {
      if (!profile) return;

      try {
        const response = await fetch('/api/reading/award-xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            xpGain: 10,
            secondsGain: 10,
          }),
        });

        const json = await response.json();
        if (response.ok) {
          setProfile((prev) => ({ ...prev, ...json.profile }));
          if (json.realmBreakthrough) {
            alert(`Đột phá cảnh giới! Bạn đã thành ${json.profile.realm}. +${json.bonusStones} Linh Thạch.`);
          }
        }
      } catch (err) {
        console.error('XP award failed:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [readingActive, session, profile?.id]);

  const ensureProfile = async (id, email) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error);
      return;
    }

    if (!data) {
      const username = email?.split('@')[0] || 'tutien_reader';
      const { error: insertError } = await supabase.from('profiles').insert({
        id,
        username,
        display_name: username,
        realm: 'Luyện Khí',
        xp: 0,
        spirit_stones: 0,
        total_reading_seconds: 0,
        role: 'user',
        is_admin: false,
        status: 'active',
        avatar_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=200&q=80',
      });

      if (insertError) console.error('Profile insert error:', insertError);
    }
  };

  const loadProfile = async (id) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return;
    }
    setProfile(data);
  };

  const loadDefaultLoadout = async () => {
    const { data, error } = await supabase.from('system_settings').select('*').eq('key', 'default_loadout').single();
    if (!error && data) setDefaultLoadout(data.value || {});
  };

  const discoverOpenApi = async () => {
    try {
      const doc = await fetchJson(OPENAPI_URL);
      const paths = Object.keys(doc?.paths || {});
      const storyPaths = paths.filter((p) => /(truyen|novel|story|book)/i.test(p));
      const chapterPaths = paths.filter((p) => /(chuong|chapter|content)/i.test(p));
      setOpenapiSummary(`Kiểm tra thành công: ${storyPaths.length} endpoint truyện • ${chapterPaths.length} endpoint chương`);
    } catch (err) {
      console.error(err);
      setOpenapiSummary('Không thể đọc schema OpenAPI, nhưng hệ thống sẽ thử nhiều mẫu URL fallback.');
    }
  };

  const handleSignUp = async (email, password) => {
    if (!email || !password) return alert('Nhập email và mật khẩu.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    setMessage('Đăng ký thành công. Nếu xác thực email được bật, hãy kiểm tra hộp thư.');
    alert('Đăng ký thành công.');
  };

  const handleSignIn = async (email, password) => {
    if (!email || !password) return alert('Nhập email và mật khẩu.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }
    setMessage('Đăng nhập thành công.');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setStories([]);
    setChapters([]);
    setSelectedChapter(null);
    setChapterContent('');
  };

  const handleUploadAvatar = async (file) => {
    if (!session?.user) return alert('Bạn phải đăng nhập trước.');

    const fileName = `${session.user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: false });
    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    const { error } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
    if (!error) {
      await loadProfile(session.user.id);
      alert('Tải ảnh đại diện thành công.');
    } else {
      alert(error.message);
    }
  };

  const searchStories = async () => {
    if (!searchQuery.trim()) return;

    const candidates = [
      `https://truyenok.online/api/v1/truyen?search=${encodeURIComponent(searchQuery)}`,
      `https://truyenok.online/api/v1/search?keyword=${encodeURIComponent(searchQuery)}`,
      `https://truyenok.online/api/v1/truyen/list?title=${encodeURIComponent(searchQuery)}`,
      `https://truyenok.online/api/v1/novel?title=${encodeURIComponent(searchQuery)}`,
      `https://truyenok.online/api/v1/truyen?keyword=${encodeURIComponent(searchQuery)}`,
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();

        let items = [];
        if (Array.isArray(json)) items = json;
        else if (Array.isArray(json.data)) items = json.data;
        else if (Array.isArray(json.items)) items = json.items;
        else if (Array.isArray(json.results)) items = json.results;
        else if (json.data && Array.isArray(json.data.items)) items = json.data.items;

        if (items.length > 0) {
          setStories(items.slice(0, 30));
          return;
        }
      } catch (err) {
        console.warn('Search candidate failed:', url, err);
      }
    }

    alert('Không tìm thấy truyện qua các endpoint mặc định. Hãy thử từ khóa khác hoặc kiểm tra OpenAPI.');
  };

  const loadStoryChapters = async (story) => {
    setSelectedStory(story);
    setChapters([]);
    setSelectedChapter(null);
    setChapterContent('');

    const storyId = story.id || story._id || story.slug || story.story_id;
    const candidates = [
      `https://truyenok.online/api/v1/truyen/${storyId}/chapters`,
      `https://truyenok.online/api/v1/truyen/${storyId}/chuong`,
      `https://truyenok.online/api/v1/truyen/${storyId}/dschuong`,
      `https://truyenok.online/api/v1/chuong/${storyId}`,
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();

        let items = [];
        if (Array.isArray(json)) items = json;
        else if (Array.isArray(json.data)) items = json.data;
        else if (Array.isArray(json.items)) items = json.items;
        else if (json.data && Array.isArray(json.data.items)) items = json.data.items;

        if (items.length > 0) {
          setChapters(items);
          return;
        }
      } catch (err) {
        console.warn('Chapters candidate failed:', url, err);
      }
    }

    alert('Không thể phân tích danh sách chương từ API nguồn. Hãy thử truyện khác.');
  };

  const loadChapterContent = async (chapter) => {
    setSelectedChapter(chapter);
    setChapterContent('Đang tải nội dung chương...');

    const storyId = selectedStory?.id || selectedStory?._id || selectedStory?.slug || selectedStory?.story_id;
    const chapterId = chapter.id || chapter._id || chapter.slug || chapter.chapter_id;

    const candidates = [];
    if (storyId && chapterId) {
      candidates.push(`https://truyenok.online/api/v1/truyen/${storyId}/chuong/${chapterId}`);
      candidates.push(`https://truyenok.online/api/v1/truyen/${storyId}/chapter/${chapterId}`);
    }
    if (chapterId) {
      candidates.push(`https://truyenok.online/api/v1/chuong/${chapterId}`);
      candidates.push(`https://truyenok.online/api/v1/chapter/${chapterId}`);
    }

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();

        let content = '';
        if (typeof json === 'string') content = json;
        else if (json.content) content = json.content;
        else if (json.data && json.data.content) content = json.data.content;
        else if (json.text) content = json.text;
        else if (json.data && json.data.text) content = json.data.text;

        if (content) {
          setChapterContent(content);
          return;
        }
      } catch (err) {
        console.warn('Content candidate failed:', url, err);
      }
    }

    setChapterContent('<p>Không thể đọc nội dung chương tự động từ API nguồn. Vui lòng thử truyện khác hoặc kiểm tra OpenAPI của nguồn.</p>');
  };

  const startReading = () => {
    if (!session?.user) return alert('Bạn cần đăng nhập để tu luyện.');
    setReadingActive(true);
  };

  const stopReading = () => {
    setReadingActive(false);
  };

  const handleBuyItem = async (item) => {
    if (!session?.user || !profile) return alert('Bạn cần đăng nhập.');

    if ((profile.spirit_stones || 0) < Number(item.price)) {
      alert('Không đủ Linh Thạch.');
      return;
    }

    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          itemId: item.id,
          itemPrice: item.price,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        alert(json.error || 'Mua thất bại.');
        return;
      }

      await loadProfile(session.user.id);
      alert(`Bạn đã mua ${item.name}.`);
    } catch (err) {
      alert('Không thể thực hiện mua hàng.');
      console.error(err);
    }
  };

  const adminMode = Boolean(profile?.is_admin || profile?.role === 'admin');

  return (
    <div className={`${darkMode ? 'theme-dark' : 'theme-light'} min-h-screen px-3 py-6 text-slate-100`}>
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 rounded-2xl border border-yellow-500/20 bg-slate-900/60 p-4 shadow-gold backdrop-blur-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-emerald-500 text-xl font-black text-slate-950">
                T
              </div>
              <div>
                <div className="text-2xl font-black text-yellow-300">Tu Tiên Reads</div>
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Cultivation & Novel Platform</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {session?.user ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
                    <img
                      src={profile?.avatar_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=200&q=80'}
                      alt="avatar"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">{profile?.display_name || profile?.username}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">{profile?.realm || 'Luyện Khí'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
                    <Flame className="h-4 w-4" />
                    Qi {profile?.xp || 0}
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <AuthPanel onSignIn={handleSignIn} onSignUp={handleSignUp} onUploadAvatar={handleUploadAvatar} />
              )}
            </div>
          </div>

          {message && (
            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
              {message}
            </div>
          )}
        </header>

        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)_330px]">
          <div className="space-y-6">
            <ProfilePanel profile={profile} defaultLoadout={defaultLoadout} />
            <ShopPanel profile={profile} onBuy={handleBuyItem} />
          </div>

          <ReaderPanel
            stories={stories}
            chapters={chapters}
            selectedStory={selectedStory}
            selectedChapter={selectedChapter}
            chapterContent={chapterContent}
            onSearch={searchStories}
            onSelectStory={loadStoryChapters}
            onSelectChapter={loadChapterContent}
            onToggleTheme={() => setDarkMode((prev) => !prev)}
            onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
            autoScroll={autoScroll}
            darkMode={darkMode}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            onStartReading={startReading}
            onStopReading={stopReading}
            readingActive={readingActive}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            openapiSummary={openapiSummary}
          />

          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4 shadow-gold">
              <div className="mb-3 flex items-center gap-2 text-lg font-bold text-yellow-300">
                <Sparkles className="h-5 w-5" />
                Cảnh giới hiện tại
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-900/20 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Đẳng cấp</div>
                <div className="mt-2 text-2xl font-black text-yellow-300">{currentRealm.name}</div>
                <div className="mt-2 text-sm text-slate-300">{currentRealm.description}</div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>Tiến độ</span>
                  <span>{profile?.xp || 0} XP</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-emerald-400 to-cyan-400"
                    style={{
                      width: `${Math.min(100, ((profile?.xp || 0) / Math.max(864000, profile?.xp || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <AdminPanel
              adminMode={adminMode}
              defaultLoadout={defaultLoadout}
              setDefaultLoadout={setDefaultLoadout}
              onReloadProfile={() => session?.user && loadProfile(session.user.id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthPanel({ onSignIn, onSignUp, onUploadAvatar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState(null);

  return (
    <div className="w-full max-w-md rounded-2xl border border-emerald-400/20 bg-slate-900/70 p-4 shadow-gold backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-lg font-bold text-yellow-300">
        <Lock className="h-5 w-5" />
        Thần Nhãn Tài Khoản
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-slate-800/80 px-3 py-2">
          <Mail className="h-4 w-4 text-emerald-300" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email tu tiên"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-slate-800/80 px-3 py-2">
          <Lock className="h-4 w-4 text-emerald-300" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSignIn(email, password)}
            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Đăng nhập
          </button>
          <button
            onClick={() => onSignUp(email, password)}
            className="flex-1 rounded-xl bg-yellow-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-400"
          >
            <span className="inline-flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Đăng ký
            </span>
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-yellow-400/40 bg-slate-800/60 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-300">
            <span>Ảnh đại diện</span>
            <span className="inline-flex items-center gap-2 rounded bg-slate-700 px-2 py-1 text-xs text-yellow-200">
              <UploadCloud className="h-4 w-4" />
              Chọn ảnh
            </span>
            <input
              type="file"
              accept="image/*,.gif,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {file && (
            <div className="mt-3 flex items-center justify-between">
              <span className="truncate text-xs text-slate-300">{file.name}</span>
              <button
                onClick={() => onUploadAvatar(file)}
                className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500"
              >
                Tải lên
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReaderPanel({
  stories,
  chapters,
  selectedStory,
  selectedChapter,
  chapterContent,
  onSearch,
  onSelectStory,
  onSelectChapter,
  onToggleTheme,
  onToggleAutoScroll,
  autoScroll,
  darkMode,
  fontSize,
  onFontSizeChange,
  onStartReading,
  onStopReading,
  readingActive,
  searchQuery,
  setSearchQuery,
  openapiSummary,
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4 shadow-gold backdrop-blur-sm">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-xl font-bold text-yellow-300">
          <BookOpen className="h-5 w-5" />
          Truyện tu tiên
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:border-emerald-500"
          >
            {darkMode ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
          </button>
          <button
            onClick={onToggleAutoScroll}
            className={`rounded-lg px-3 py-2 text-sm ${autoScroll ? 'bg-emerald-600' : 'bg-slate-800'} text-white`}
          >
            Auto Scroll
          </button>
          <button
            onClick={readingActive ? onStopReading : onStartReading}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${readingActive ? 'bg-red-600' : 'bg-yellow-500 text-slate-900'}`}
          >
            {readingActive ? 'Dừng tu luyện' : 'Bắt đầu tu luyện'}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.2fr_2.1fr_1.2fr]">
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-200">Tìm truyện</div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tên truyện, từ khóa..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={onSearch}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Tìm kiếm
            </button>
            <a
              href="https://truyenok.online/api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-yellow-400/40 bg-slate-800 px-3 py-2 text-sm text-yellow-200"
            >
              OpenAPI
            </a>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">{openapiSummary}</div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-200">Danh sách truyện</div>
          <div className="max-h-[260px] space-y-2 overflow-y-auto">
            {stories.length === 0 && <div className="text-sm text-slate-400">Chưa có truyện nào</div>}
            {stories.slice(0, 12).map((story) => {
              const label = story.name || story.title || story.ten || 'Truyện';
              return (
                <button
                  key={story.id || story.slug || story._id || `${label}-${Math.random()}`}
                  onClick={() => onSelectStory(story)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-left transition hover:border-slate-500"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{label}</div>
                    <div className="truncate text-[11px] text-slate-400">{story.author || story.tac_gia || 'Không rõ'}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-200">Thiết lập</div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-400">Cỡ chữ</label>
              <input
                type="range"
                min="14"
                max="28"
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="mt-1 text-xs text-slate-300">{fontSize}px</div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-xs text-slate-300">
              <div className="mb-1 flex items-center gap-2 text-slate-300">
                <BookText className="h-4 w-4 text-yellow-300" />
                Truyện đang đọc
              </div>
              <div className="font-semibold text-white">
                {selectedStory ? (selectedStory.name || selectedStory.title || selectedStory.ten || 'Truyện') : 'Chưa chọn'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {selectedChapter ? (selectedChapter.title || selectedChapter.name || selectedChapter.ten || 'Chương') : 'Chưa chọn chương'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_2.2fr]">
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-200">Chương</div>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {chapters.length === 0 && <div className="text-sm text-slate-400">Chưa có chương nào</div>}
            {chapters.map((chapter, index) => {
              const chapterKey = chapter.id || chapter.slug || chapter._id || `chapter-${index}`;
              const chapterLabel = chapter.title || chapter.name || chapter.ten || `Chương ${index + 1}`;
              return (
                <button
                  key={chapterKey}
                  onClick={() => onSelectChapter(chapter)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-slate-500"
                >
                  {chapterLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`reader-content rounded-xl border p-5 text-pretty ${darkMode ? 'border-emerald-500/20 bg-slate-900/80' : 'border-slate-300 bg-[#f9f3de]/80 text-slate-900'} max-h-[70vh] overflow-y-auto`}
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: chapterContent || '<p>Chưa có nội dung chương.</p>' }}
        />
      </div>
    </div>
  );
}

function ProfilePanel({ profile, defaultLoadout }) {
  const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=200&q=80';

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4 shadow-gold backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-3">
        <img src={avatar} alt="avatar" className="h-16 w-16 rounded-full border-2 border-yellow-300 object-cover" />
        <div>
          <div className="text-lg font-bold text-yellow-300">{profile?.display_name || profile?.username || 'Thần tiên'}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">{profile?.realm || 'Luyện Khí'}</div>
        </div>
      </div>

      <div className="grid gap-3">
        <StatBox icon={<Flame className="h-4 w-4" />} label="Qi" value={profile?.xp || 0} />
        <StatBox icon={<Trophy className="h-4 w-4" />} label="Linh Thạch" value={profile?.spirit_stones || 0} />
        <StatBox icon={<Sword className="h-4 w-4" />} label="Thời gian đọc" value={formatSeconds(profile?.total_reading_seconds || 0)} />
      </div>

      <div className="mt-5 space-y-3">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Trang bị</div>
        <div className="grid grid-cols-3 gap-2">
          <LoadoutSlot label="Khung" image={profile?.avatar_frame || defaultLoadout?.frame || 'https://images.unsplash.com/photo-1608181831406-6dca4c9ff592?auto=format&fit=crop&w=500&q=80'} />
          <LoadoutSlot label="Pháp bảo" image={profile?.artifact || defaultLoadout?.artifact || 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=500&q=80'} />
          <LoadoutSlot label="Pháp tướng" image={profile?.manifestation || defaultLoadout?.manifestation || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=500&q=80'} />
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
      <div className="flex items-center gap-2 text-slate-300">
        {icon}
        <span className="text-xs uppercase tracking-[0.15em]">{label}</span>
      </div>
      <div className="text-sm font-semibold text-yellow-300">{value}</div>
    </div>
  );
}

function LoadoutSlot({ label, image }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-2 text-center">
      <div className="mb-2 text-[10px] uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <img src={image} alt={label} className="mx-auto h-16 w-16 rounded-lg object-cover" />
    </div>
  );
}

function ShopPanel({ profile, onBuy }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase.from('shop_items').select('*').order('created_at', { ascending: false });
      setItems(data || []);
    }
    fetchItems();
  }, []);

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-slate-900/70 p-4 shadow-gold backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-bold text-yellow-300">
        <Coins className="h-5 w-5" />
        Cửa hàng Linh Thạch
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400">Cửa hàng đang trống.</div>}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center gap-3">
              <img src={item.asset_url} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{item.name}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-emerald-300">{item.item_type}</div>
                <div className="mt-1 text-xs text-slate-400">{item.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-yellow-300">{item.price}</div>
                <button
                  onClick={() => onBuy(item)}
                  disabled={(profile?.spirit_stones || 0) < item.price}
                  className={`mt-2 rounded-lg px-2 py-1 text-xs font-semibold ${((profile?.spirit_stones || 0) >= item.price) ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                  Mua
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({ adminMode, defaultLoadout, setDefaultLoadout, onReloadProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [currentLoadout, setCurrentLoadout] = useState(defaultLoadout || {});
  const [shopEditor, setShopEditor] = useState({
    name: '',
    item_type: 'frame',
    asset_url: '',
    price: 200,
    description: '',
  });

  useEffect(() => {
    if (!adminMode) return;

    async function loadProfiles() {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error) setProfiles(data || []);
    }

    loadProfiles();
  }, [adminMode]);

  const updateLoadout = async () => {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'default_loadout',
      value: currentLoadout,
    });
    if (!error) {
      setDefaultLoadout(currentLoadout);
      alert('Đã cập nhật loadout mặc định.');
    } else {
      alert(error.message);
    }
  };

  const saveShopItem = async () => {
    const { error } = await supabase.from('shop_items').insert([
      {
        name: shopEditor.name,
        item_type: shopEditor.item_type,
        asset_url: shopEditor.asset_url,
        price: Number(shopEditor.price),
        description: shopEditor.description,
      },
    ]);

    if (!error) {
      alert('Đã thêm vật phẩm vào shop.');
      setShopEditor({ name: '', item_type: 'frame', asset_url: '', price: 200, description: '' });
    } else {
      alert(error.message);
    }
  };

  const toggleAdminStatus = async (profileId, roleValue, statusValue) => {
    const { error } = await supabase.from('profiles').update({
      role: roleValue,
      is_admin: roleValue === 'admin',
      status: statusValue,
    }).eq('id', profileId);

    if (error) {
      alert(error.message);
      return;
    }

    alert('Đã cập nhật trạng thái người dùng.');
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data);
    onReloadProfile();
  };

  if (!adminMode) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
        Chỉ quản trị viên mới xem được bảng điều khiển.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4 shadow-gold backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-bold text-yellow-300">
        <ShieldCheck className="h-5 w-5" />
        Bảng điều khiển Admin
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Users className="h-4 w-4 text-emerald-300" />
            Quản lý người dùng
          </div>

          <div className="max-h-52 space-y-2 overflow-y-auto">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-2">
                <div>
                  <div className="text-sm font-medium text-white">{p.display_name || p.username}</div>
                  <div className="text-[11px] text-slate-400">{p.role} • {p.status}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAdminStatus(p.id, p.role === 'admin' ? 'user' : 'admin', p.status)}
                    className="rounded bg-emerald-600 px-2 py-1 text-[10px] text-white"
                  >
                    {p.role === 'admin' ? 'Gỡ admin' : 'Cấp admin'}
                  </button>
                  <button
                    onClick={() => toggleAdminStatus(p.id, p.role, p.status === 'banned' ? 'active' : 'banned')}
                    className="rounded bg-red-600 px-2 py-1 text-[10px] text-white"
                  >
                    {p.status === 'banned' ? 'Mở khóa' : 'Cấm'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Settings2 className="h-4 w-4 text-yellow-300" />
            Loadout mặc định
          </div>
          <div className="space-y-2">
            <input
              value={currentLoadout.frame || ''}
              onChange={(e) => setCurrentLoadout({ ...currentLoadout, frame: e.target.value })}
              placeholder="Frame URL"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <input
              value={currentLoadout.artifact || ''}
              onChange={(e) => setCurrentLoadout({ ...currentLoadout, artifact: e.target.value })}
              placeholder="Artifact URL"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <input
              value={currentLoadout.manifestation || ''}
              onChange={(e) => setCurrentLoadout({ ...currentLoadout, manifestation: e.target.value })}
              placeholder="Manifestation URL"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button onClick={updateLoadout} className="rounded-lg bg-yellow-500 px-3 py-2 text-sm font-semibold text-slate-900">
              Lưu loadout
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
          <div className="mb-3 text-sm font-semibold text-slate-200">Thêm vật phẩm shop</div>
          <div className="space-y-2">
            <input
              value={shopEditor.name}
              onChange={(e) => setShopEditor({ ...shopEditor, name: e.target.value })}
              placeholder="Tên vật phẩm"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <select
              value={shopEditor.item_type}
              onChange={(e) => setShopEditor({ ...shopEditor, item_type: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
            >
              <option value="frame">Frame</option>
              <option value="artifact">Artifact</option>
              <option value="manifestation">Manifestation</option>
            </select>
            <input
              value={shopEditor.asset_url}
              onChange={(e) => setShopEditor({ ...shopEditor, asset_url: e.target.value })}
              placeholder="Asset URL"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <input
              type="number"
              value={shopEditor.price}
              onChange={(e) => setShopEditor({ ...shopEditor, price: e.target.value })}
              placeholder="Giá Linh Thạch"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <input
              value={shopEditor.description}
              onChange={(e) => setShopEditor({ ...shopEditor, description: e.target.value })}
              placeholder="Mô tả"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button onClick={saveShopItem} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
              Thêm vào shop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
