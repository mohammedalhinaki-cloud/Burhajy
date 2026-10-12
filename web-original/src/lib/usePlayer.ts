import { useCallback, useEffect, useRef, useState } from "react";
import { getSurah, surahAudioUrl, surahAudioUrlFallback } from "../data/surahs";
import {
  AyahTiming,
  ayahAtTime,
  estimateTimings,
  fetchTimings,
  startOfAyah,
} from "./timings";
import { saveLastPosition } from "./storage";

export type TimingSource = "official" | "estimated" | "none";

export interface PlayerState {
  surah: number | null;
  currentAyah: number;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTimeMs: number;
  durationMs: number;
  timingSource: TimingSource;
  error: string | null;
}

export interface PlayerApi extends PlayerState {
  playSurahFromAyah: (surah: number, ayah: number) => Promise<void>;
  resumeAt: (surah: number, positionMs: number) => Promise<void>;
  togglePlay: () => void;
  nextAyah: () => void;
  prevAyah: () => void;
  seekToMs: (ms: number) => void;
}

export function usePlayer(): PlayerApi {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null) {
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;
  }

  const [surah, setSurah] = useState<number | null>(null);
  const [currentAyah, setCurrentAyah] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [timingSource, setTimingSource] = useState<TimingSource>("none");
  const [error, setError] = useState<string | null>(null);

  const timingsRef = useRef<AyahTiming[] | null>(null);
  const surahRef = useRef<number | null>(null);
  const pendingSeekMsRef = useRef<number | null>(null);
  const lastSaveRef = useRef(0);
  const triedFallbackRef = useRef(false);

  const persist = useCallback((force = false) => {
    const a = audioRef.current!;
    const s = surahRef.current;
    if (!s) return;
    const now = Date.now();
    if (!force && now - lastSaveRef.current < 1500) return;
    lastSaveRef.current = now;
    const ms = Math.floor(a.currentTime * 1000);
    const t = timingsRef.current;
    const ayah = t && t.length ? ayahAtTime(t, ms) : 1;
    saveLastPosition({ surah: s, ayah, positionMs: ms });
  }, []);

  const ensureTimings = useCallback(async (s: number): Promise<void> => {
    const official = await fetchTimings(s);
    if (surahRef.current !== s) return;
    if (official) {
      timingsRef.current = official;
      setTimingSource("official");
      return;
    }
    const a = audioRef.current!;
    if (a.duration && isFinite(a.duration)) {
      timingsRef.current = estimateTimings(s, a.duration * 1000);
      setTimingSource("estimated");
    } else {
      timingsRef.current = null;
      setTimingSource("none");
    }
  }, []);

  const loadSurah = useCallback((s: number) => {
    const a = audioRef.current!;
    surahRef.current = s;
    triedFallbackRef.current = false;
    timingsRef.current = null;
    setSurah(s);
    setTimingSource("none");
    setError(null);
    setDurationMs(0);
    setCurrentTimeMs(0);
    a.src = surahAudioUrl(s);
    a.load();
  }, []);

  const applySeek = useCallback((ms: number) => {
    const a = audioRef.current!;
    if (a.readyState >= 1 && isFinite(a.duration)) {
      a.currentTime = ms / 1000;
      pendingSeekMsRef.current = null;
    } else {
      pendingSeekMsRef.current = ms;
    }
    setCurrentTimeMs(ms);
  }, []);

  const playSurahFromAyah = useCallback(
    async (s: number, ayah: number) => {
      const a = audioRef.current!;
      const sameSurah = surahRef.current === s && a.src;
      if (!sameSurah) loadSurah(s);
      setCurrentAyah(ayah);
      setIsBuffering(true);

      if (!timingsRef.current || !sameSurah) await ensureTimings(s);
      if (surahRef.current !== s) return;

      let startMs = 0;
      if (ayah > 1) {
        if (timingsRef.current) {
          startMs = startOfAyah(timingsRef.current, ayah);
        } else {
          // لا توقيتات بعد — ننتظر البيانات الوصفية ثم نقدّر
          pendingSeekMsRef.current = -ayah; // إشارة خاصة: قدّر عند توفر المدة
        }
      }
      if (pendingSeekMsRef.current === null || pendingSeekMsRef.current >= 0) {
        applySeek(startMs);
      }
      try {
        await a.play();
      } catch {
        setIsBuffering(false);
        setError("تعذّر بدء التشغيل. تحقق من اتصال الإنترنت ثم أعد المحاولة.");
      }
    },
    [applySeek, ensureTimings, loadSurah]
  );

  const resumeAt = useCallback(
    async (s: number, positionMs: number) => {
      const a = audioRef.current!;
      if (surahRef.current !== s || !a.src) loadSurah(s);
      setIsBuffering(true);
      void ensureTimings(s);
      applySeek(positionMs);
      const t = timingsRef.current;
      setCurrentAyah(t ? ayahAtTime(t, positionMs) : 1);
      try {
        await a.play();
      } catch {
        setIsBuffering(false);
        setError("تعذّر بدء التشغيل. تحقق من اتصال الإنترنت ثم أعد المحاولة.");
      }
    },
    [applySeek, ensureTimings, loadSurah]
  );

  const togglePlay = useCallback(() => {
    const a = audioRef.current!;
    if (!surahRef.current) return;
    if (a.paused) {
      void a.play().catch(() => setError("تعذّر التشغيل."));
    } else {
      a.pause();
    }
  }, []);

  const nextAyah = useCallback(() => {
    const s = surahRef.current;
    const t = timingsRef.current;
    if (!s || !t) return;
    const count = getSurah(s).ayahCount;
    const a = audioRef.current!;
    const cur = ayahAtTime(t, a.currentTime * 1000);
    const target = Math.min(cur + 1, count);
    setCurrentAyah(target);
    applySeek(startOfAyah(t, target));
    if (a.paused) void a.play().catch(() => undefined);
  }, [applySeek]);

  const prevAyah = useCallback(() => {
    const s = surahRef.current;
    const t = timingsRef.current;
    if (!s || !t) return;
    const a = audioRef.current!;
    const ms = a.currentTime * 1000;
    const cur = ayahAtTime(t, ms);
    // لو تجاوزنا بداية الآية الحالية بأكثر من ثانيتين نعود لبدايتها، وإلا للآية السابقة
    const curStart = startOfAyah(t, cur);
    const target = ms - curStart > 2000 ? cur : Math.max(cur - 1, 1);
    setCurrentAyah(target);
    applySeek(startOfAyah(t, target));
    if (a.paused) void a.play().catch(() => undefined);
  }, [applySeek]);

  const seekToMs = useCallback(
    (ms: number) => {
      applySeek(ms);
      const t = timingsRef.current;
      if (t) setCurrentAyah(ayahAtTime(t, ms));
      persist(true);
    },
    [applySeek, persist]
  );

  // أحداث عنصر الصوت
  useEffect(() => {
    const a = audioRef.current!;

    const onLoadedMetadata = () => {
      setDurationMs(a.duration * 1000);
      const pending = pendingSeekMsRef.current;
      if (pending !== null) {
        if (pending < 0) {
          // إشارة التقدير: -ayah
          const ayah = -pending;
          const s = surahRef.current!;
          if (!timingsRef.current) {
            timingsRef.current = estimateTimings(s, a.duration * 1000);
            setTimingSource("estimated");
          }
          a.currentTime = startOfAyah(timingsRef.current, ayah) / 1000;
        } else {
          a.currentTime = pending / 1000;
        }
        pendingSeekMsRef.current = null;
      }
    };

    const onTimeUpdate = () => {
      const ms = a.currentTime * 1000;
      setCurrentTimeMs(ms);
      const t = timingsRef.current;
      if (t) setCurrentAyah(ayahAtTime(t, ms));
      persist();
    };

    const onPlay = () => {
      setIsPlaying(true);
      setError(null);
    };
    const onPause = () => {
      setIsPlaying(false);
      persist(true);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    const onEnded = () => {
      const s = surahRef.current;
      persist(true);
      if (s && s < 114) {
        // متابعة تلقائية للسورة التالية
        void playSurahFromAyahRef.current(s + 1, 1);
      } else {
        setIsPlaying(false);
      }
    };

    const onError = () => {
      const s = surahRef.current;
      if (s && !triedFallbackRef.current && a.src.includes("/audio/")) {
        triedFallbackRef.current = true;
        const pos = a.currentTime;
        a.src = surahAudioUrlFallback(s);
        a.load();
        if (pos > 0) pendingSeekMsRef.current = pos * 1000;
        void a.play().catch(() => undefined);
        return;
      }
      setIsBuffering(false);
      setIsPlaying(false);
      setError("تعذّر تحميل التلاوة. تحقق من اتصال الإنترنت.");
    };

    a.addEventListener("loadedmetadata", onLoadedMetadata);
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, [persist]);

  // مرجع دائري لاستخدام playSurahFromAyah داخل onEnded
  const playSurahFromAyahRef = useRef(playSurahFromAyah);
  useEffect(() => {
    playSurahFromAyahRef.current = playSurahFromAyah;
  }, [playSurahFromAyah]);

  // حفظ الموضع عند إخفاء الصفحة أو إغلاقها
  useEffect(() => {
    const onHide = () => persist(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [persist]);

  // أزرار التحكم في شاشة القفل والإشعارات (MediaSession)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (surah) {
      ms.metadata = new MediaMetadata({
        title: `سورة ${getSurah(surah).name}`,
        artist: "الشيخ أ.د. محمد برهجي",
        album: "المصحف المرتل — حفص عن عاصم",
      });
    }
    ms.setActionHandler("play", () => void audioRef.current!.play().catch(() => undefined));
    ms.setActionHandler("pause", () => audioRef.current!.pause());
    ms.setActionHandler("previoustrack", () => prevAyah());
    ms.setActionHandler("nexttrack", () => nextAyah());
    try {
      ms.setActionHandler("seekto", (d) => {
        if (d.seekTime != null) seekToMs(d.seekTime * 1000);
      });
    } catch {
      /* غير مدعوم في بعض المتصفحات */
    }
    ms.playbackState = isPlaying ? "playing" : "paused";
  }, [surah, isPlaying, nextAyah, prevAyah, seekToMs]);

  return {
    surah,
    currentAyah,
    isPlaying,
    isBuffering,
    currentTimeMs,
    durationMs,
    timingSource,
    error,
    playSurahFromAyah,
    resumeAt,
    togglePlay,
    nextAyah,
    prevAyah,
    seekToMs,
  };
}
