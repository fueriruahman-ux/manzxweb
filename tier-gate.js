import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

export const FREE_LIMIT_SECONDS = 90 * 60; // 1.5 jam per hari
const SYNC_EVERY_SECONDS = 20;

export function fmt(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function todayStr(){
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pasang gerbang Free/VIP di halaman overlay.
 * db: instance Firebase database
 * uname: username yang lagi dipakai
 * containerEl: elemen utama yang bakal disembunyiin kalau waktu Free abis
 */
export async function applyTierGate(db, uname, containerEl){
  const profRef = ref(db, `users/${uname}/profile`);
  const usageRef = ref(db, `users/${uname}/usage`);

  const profSnap = await get(profRef);
  const tier = (profSnap.val() || {}).tier || "free";

  if (tier === "vip") return { blocked: false, tier };

  const today = todayStr();
  const usageSnap = await get(usageRef);
  let usage = usageSnap.val() || {};
  if (usage.date !== today) usage = { date: today, seconds: 0 };
  const usedBefore = usage.seconds || 0;

  // Gak ada elemen visual apapun di overlay ini — biar gak keliatan penonton.
  // Streamer cek sisa waktunya lewat dashboard, bukan dari overlay.
  function lockOut(){
    if (containerEl) containerEl.style.display = "none";
  }

  if (usedBefore >= FREE_LIMIT_SECONDS) {
    lockOut();
    return { blocked: true, tier };
  }

  let elapsed = 0;
  const timer = setInterval(async () => {
    elapsed++;
    const total = usedBefore + elapsed;
    if (total >= FREE_LIMIT_SECONDS) {
      clearInterval(timer);
      await update(usageRef, { date: today, seconds: FREE_LIMIT_SECONDS });
      lockOut();
      return;
    }
    if (elapsed % SYNC_EVERY_SECONDS === 0) {
      update(usageRef, { date: today, seconds: total });
    }
  }, 1000);

  window.addEventListener("beforeunload", () => {
    update(usageRef, { date: today, seconds: usedBefore + elapsed });
  });

  return { blocked: false, tier };
}
