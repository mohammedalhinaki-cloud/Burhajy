import { useMemo, useState } from "react";
import { SURAHS, getSurah } from "../data/surahs";
import { LastPosition } from "../lib/storage";
import { HeadphonesIcon, PauseIcon, PlayIcon, SearchIcon } from "./Icons";

interface Props {
  lastPosition: LastPosition | null;
  onResume: () => void;
  onOpenSurah: (surah: number) => void;
  /** السورة قيد التشغيل حاليًا (للشريط السفلي) */
  nowPlaying: { surah: number; ayah: number; isPlaying: boolean } | null;
  onTogglePlay: () => void;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function HomeScreen({
  lastPosition,
  onResume,
  onOpenSurah,
  nowPlaying,
  onTogglePlay,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return SURAHS;
    const norm = (s: string) =>
      s
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/\s/g, "");
    const nq = norm(q);
    return SURAHS.filter(
      (s) => norm(s.name).includes(nq) || String(s.number) === q
    );
  }, [query]);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* الترويسة */}
      <header className="pattern-bg text-white px-5 pt-8 pb-6 rounded-b-3xl shadow-lg">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <HeadphonesIcon className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">
                المصحف المرتل
              </h1>
              <p className="text-emerald-100/90 text-sm">
                الشيخ أ.د. محمد برهجي — حفص عن عاصم
              </p>
            </div>
          </div>

          {/* زر متابعة الاستماع */}
          {lastPosition && (
            <button
              onClick={onResume}
              className="fade-up mt-5 w-full bg-amber-400 hover:bg-amber-300 active:scale-[0.99] transition text-emerald-950 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-md"
            >
              <span className="flex items-center gap-3 text-right">
                <span className="w-10 h-10 rounded-full bg-emerald-900/90 text-amber-300 flex items-center justify-center shrink-0">
                  <PlayIcon className="w-5 h-5" />
                </span>
                <span>
                  <span className="block font-extrabold text-base">
                    متابعة الاستماع
                  </span>
                  <span className="block text-sm text-emerald-900/80">
                    سورة {getSurah(lastPosition.surah).name}، الآية{" "}
                    {lastPosition.ayah} — عند {formatMs(lastPosition.positionMs)}
                  </span>
                </span>
              </span>
            </button>
          )}

          {/* البحث */}
          <div className="mt-4 relative">
            <input
              type="text"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن سورة بالاسم أو الرقم…"
              className="w-full rounded-2xl bg-white/95 text-emerald-950 placeholder:text-stone-400 pr-11 pl-4 py-3 text-base outline-none focus:ring-2 focus:ring-amber-300 shadow-inner"
            />
            <SearchIcon className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
      </header>

      {/* قائمة السور */}
      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full pb-28">
        {filtered.length === 0 ? (
          <p className="text-center text-stone-500 mt-10">
            لا توجد سورة مطابقة للبحث.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((s) => (
              <li key={s.number}>
                <button
                  onClick={() => onOpenSurah(s.number)}
                  className="w-full bg-white hover:bg-emerald-50 active:scale-[0.995] transition rounded-2xl px-4 py-3 flex items-center gap-4 shadow-sm border border-stone-100 text-right"
                >
                  <span className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full text-emerald-700/15" fill="currentColor">
                      <path d="M20 1l4.7 4.1 6.1-1 1.9 5.9 5.9 1.9-1 6.1L41.7 20l-4.1 4.7 1 6.1-5.9 1.9-1.9 5.9-6.1-1L20 41.7l-4.7-4.1-6.1 1-1.9-5.9-5.9-1.9 1-6.1L-1.7 20l4.1-4.7-1-6.1 5.9-1.9 1.9-5.9 6.1 1z" transform="scale(0.95) translate(1,1)" />
                    </svg>
                    <span className="relative text-emerald-800 font-bold text-sm">
                      {s.number}
                    </span>
                  </span>
                  <span className="flex-1">
                    <span className="block font-quran text-xl font-bold text-emerald-950 leading-snug">
                      سورة {s.name}
                    </span>
                    <span className="block text-xs text-stone-500 mt-0.5">
                      {s.ayahCount} آية
                    </span>
                  </span>
                  <PlayIcon className="w-5 h-5 text-emerald-600/70" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center text-xs text-stone-400 mt-8 leading-relaxed">
          التلاوات من المكتبة الصوتية للقرآن الكريم (mp3quran.net)
          <br />
          بصوت الشيخ أ.د. محمد برهجي — برواية حفص عن عاصم
        </p>
      </main>

      {/* شريط التشغيل السفلي */}
      {nowPlaying && (
        <div className="fixed bottom-0 inset-x-0 z-20">
          <div className="max-w-xl mx-auto m-3 bg-emerald-950 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 fade-up">
            <button
              onClick={onTogglePlay}
              aria-label={nowPlaying.isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              className="w-11 h-11 rounded-full bg-amber-400 text-emerald-950 flex items-center justify-center active:scale-95 transition shrink-0"
            >
              {nowPlaying.isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onOpenSurah(nowPlaying.surah)}
              className="flex-1 text-right"
            >
              <span className="block font-bold text-sm">
                سورة {getSurah(nowPlaying.surah).name}
              </span>
              <span className="block text-xs text-emerald-200/80">
                الآية {nowPlaying.ayah} — اضغط لفتح المشغّل
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
