export interface LastPosition {
  surah: number;
  ayah: number;
  /** موضع التشغيل بالمللي ثانية داخل ملف السورة */
  positionMs: number;
  updatedAt: number;
}

const KEY = "barhaji_last_position_v1";

export function loadLastPosition(): LastPosition | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LastPosition;
    if (
      typeof p.surah === "number" &&
      p.surah >= 1 &&
      p.surah <= 114 &&
      typeof p.positionMs === "number"
    ) {
      return p;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastPosition(p: Omit<LastPosition, "updatedAt">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}
