import { getSurah } from "../data/surahs";

export interface AyahTiming {
  ayah: number;
  /** بداية الآية بالمللي ثانية */
  start: number;
  /** نهاية الآية بالمللي ثانية */
  end: number;
}

/** معرّف قراءة الشيخ محمد برهجي في Timing API الرسمي لموقع mp3quran */
const READ_ID = 340;
const CACHE_PREFIX = "barhaji_timing_v1_s";

interface ApiTimingRow {
  ayah: number;
  start_time: number;
  end_time: number;
}

function readCache(surah: number): AyahTiming[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + surah);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AyahTiming[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(surah: number, timings: AyahTiming[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + surah, JSON.stringify(timings));
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

/**
 * جلب فهرس توقيتات آيات السورة لقراءة الشيخ برهجي من واجهة mp3quran الرسمية،
 * مع تخزينه محليًا بحيث لا يُعاد جلبه مرة أخرى.
 */
export async function fetchTimings(surah: number): Promise<AyahTiming[] | null> {
  const cached = readCache(surah);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${READ_ID}`
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as ApiTimingRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const timings: AyahTiming[] = rows
      .filter((r) => typeof r.ayah === "number" && typeof r.start_time === "number")
      .map((r) => ({ ayah: r.ayah, start: r.start_time, end: r.end_time }))
      .sort((a, b) => a.ayah - b.ayah);
    if (timings.length === 0) return null;
    writeCache(surah, timings);
    return timings;
  } catch {
    return null;
  }
}

/**
 * تقدير احتياطي (يُستخدم فقط إذا تعذّر الوصول لفهرس التوقيتات الرسمي):
 * توزيع متساوٍ لمدة السورة على عدد الآيات.
 */
export function estimateTimings(surah: number, durationMs: number): AyahTiming[] {
  const count = getSurah(surah).ayahCount;
  const per = durationMs / count;
  return Array.from({ length: count }, (_, i) => ({
    ayah: i + 1,
    start: Math.round(i * per),
    end: Math.round((i + 1) * per),
  }));
}

/** إيجاد الآية الحالية من موضع التشغيل بالمللي ثانية */
export function ayahAtTime(timings: AyahTiming[], timeMs: number): number {
  if (timings.length === 0) return 1;
  if (timeMs < timings[0].start) return 1;
  for (let i = timings.length - 1; i >= 0; i--) {
    if (timeMs >= timings[i].start) return timings[i].ayah;
  }
  return timings[timings.length - 1].ayah;
}

/** بداية آية محددة بالمللي ثانية (الآية 1 تبدأ من أول الملف لتشمل البسملة) */
export function startOfAyah(timings: AyahTiming[], ayah: number): number {
  if (ayah <= 1) return 0;
  const t = timings.find((x) => x.ayah === ayah);
  return t ? t.start : 0;
}
