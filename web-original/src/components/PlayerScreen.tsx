import { FormEvent, useEffect, useState } from "react";
import { getSurah } from "../data/surahs";
import { PlayerApi } from "../lib/usePlayer";
import {
  BackIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  SpinnerIcon,
} from "./Icons";

interface Props {
  surahNumber: number;
  player: PlayerApi;
  onBack: () => void;
}

function formatMs(ms: number): string {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function PlayerScreen({ surahNumber, player, onBack }: Props) {
  const surah = getSurah(surahNumber);
  const isCurrent = player.surah === surahNumber;

  const [ayahInput, setAyahInput] = useState("1");

  // مزامنة حقل رقم الآية مع الآية الجارية أثناء التشغيل
  useEffect(() => {
    if (isCurrent) setAyahInput(String(player.currentAyah));
  }, [isCurrent, player.currentAyah]);

  const clampAyah = (v: number) =>
    Math.min(Math.max(Math.round(v) || 1, 1), surah.ayahCount);

  const handlePlayFromAyah = (e?: FormEvent) => {
    e?.preventDefault();
    const ayah = clampAyah(Number(ayahInput));
    setAyahInput(String(ayah));
    void player.playSurahFromAyah(surahNumber, ayah);
  };

  const progress =
    isCurrent && player.durationMs > 0
      ? (player.currentTimeMs / player.durationMs) * 100
      : 0;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* الترويسة */}
      <header className="pattern-bg text-white px-5 pt-6 pb-20 rounded-b-[2.5rem] shadow-lg relative">
        <div className="max-w-xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-emerald-100 hover:text-white transition text-sm font-medium"
          >
            <BackIcon className="w-5 h-5" />
            قائمة السور
          </button>

          <div className="text-center mt-4">
            <p className="text-amber-300/90 text-sm font-medium">
              سورة رقم {surah.number} — {surah.ayahCount} آية
            </p>
            <h1 className="font-quran text-5xl font-bold mt-2 leading-tight">
              {surah.name}
            </h1>
            <p className="text-emerald-100/80 text-sm mt-2">
              الشيخ أ.د. محمد برهجي — حفص عن عاصم
            </p>
          </div>
        </div>
      </header>

      {/* بطاقة المشغل */}
      <main className="flex-1 px-4 max-w-xl mx-auto w-full -mt-12 pb-10">
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-5 fade-up">
          {/* اختيار رقم الآية */}
          <form
            onSubmit={handlePlayFromAyah}
            className="flex items-end gap-3 justify-center"
          >
            <label className="block text-right">
              <span className="block text-sm text-stone-500 mb-1.5">
                التشغيل من الآية رقم
              </span>
              <input
                type="number"
                min={1}
                max={surah.ayahCount}
                value={ayahInput}
                onChange={(e) => setAyahInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-28 text-center text-2xl font-bold text-emerald-900 bg-stone-50 border-2 border-stone-200 focus:border-emerald-600 rounded-2xl py-2.5 outline-none transition"
              />
            </label>
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] transition text-white font-bold rounded-2xl px-5 py-3.5 shadow-md"
            >
              تشغيل من هنا
            </button>
          </form>
          <p className="text-center text-xs text-stone-400 mt-2">
            من 1 إلى {surah.ayahCount}
          </p>

          {/* الحالة الحالية */}
          <div className="mt-5 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-center">
            {isCurrent ? (
              <p className="text-emerald-900 font-bold text-lg">
                الآية الحالية: {player.currentAyah}
                <span className="font-normal text-sm text-emerald-700/80 mr-2">
                  ({formatMs(player.currentTimeMs)} /{" "}
                  {formatMs(player.durationMs)})
                </span>
              </p>
            ) : (
              <p className="text-emerald-800/80 text-sm">
                اختر رقم الآية ثم اضغط «تشغيل من هنا»، أو اضغط زر التشغيل للبدء
                من أول السورة.
              </p>
            )}
            {isCurrent && player.timingSource === "estimated" && (
              <p className="text-amber-700 text-xs mt-1">
                تعذّر جلب فهرس التوقيتات الرسمي — يُستخدم تقدير تقريبي لمواضع
                الآيات.
              </p>
            )}
          </div>

          {/* شريط التقدم */}
          <div className="mt-5">
            <input
              type="range"
              className="seekbar w-full"
              style={{ "--progress": `${progress}%` } as React.CSSProperties}
              min={0}
              max={isCurrent ? Math.max(player.durationMs, 1) : 1}
              value={isCurrent ? player.currentTimeMs : 0}
              disabled={!isCurrent || player.durationMs <= 0}
              onChange={(e) => player.seekToMs(Number(e.target.value))}
            />
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>{isCurrent ? formatMs(player.currentTimeMs) : "0:00"}</span>
              <span>{isCurrent ? formatMs(player.durationMs) : "--:--"}</span>
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              onClick={() => player.prevAyah()}
              disabled={!isCurrent}
              className="flex flex-col items-center gap-1 text-emerald-800 disabled:opacity-30 active:scale-95 transition"
            >
              <span className="w-14 h-14 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center">
                <PrevIcon className="w-6 h-6" />
              </span>
              <span className="text-xs text-stone-500">الآية السابقة</span>
            </button>

            <button
              onClick={() =>
                isCurrent
                  ? player.togglePlay()
                  : void player.playSurahFromAyah(
                      surahNumber,
                      clampAyah(Number(ayahInput))
                    )
              }
              aria-label={
                isCurrent && player.isPlaying ? "إيقاف مؤقت" : "تشغيل"
              }
              className="w-20 h-20 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              {isCurrent && player.isBuffering ? (
                <SpinnerIcon className="w-8 h-8" />
              ) : isCurrent && player.isPlaying ? (
                <PauseIcon className="w-9 h-9" />
              ) : (
                <PlayIcon className="w-9 h-9" />
              )}
            </button>

            <button
              onClick={() => player.nextAyah()}
              disabled={!isCurrent}
              className="flex flex-col items-center gap-1 text-emerald-800 disabled:opacity-30 active:scale-95 transition"
            >
              <span className="w-14 h-14 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center">
                <NextIcon className="w-6 h-6" />
              </span>
              <span className="text-xs text-stone-500">الآية التالية</span>
            </button>
          </div>

          {player.error && isCurrent && (
            <p className="mt-4 text-center text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {player.error}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-5 leading-relaxed">
          يُحفظ موضع استماعك تلقائيًا — عند العودة ستكمل من الثانية نفسها.
          <br />
          يستمر التشغيل مع إطفاء الشاشة، مع أزرار تحكم في شاشة القفل.
        </p>
      </main>
    </div>
  );
}
