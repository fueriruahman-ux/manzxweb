import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const FREE_LIMIT_SECONDS = 90 * 60; // 1.5 jam per hari
const SYNC_EVERY_SECONDS = 20;

function fmt(sec){
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

  // Banner peringatan
  const banner = document.createElement("div");
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;padding:9px;text-align:center;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;background:rgba(10,10,12,0.85);color:#fff;z-index:99999;letter-spacing:.3px;";
  document.body.appendChild(banner);

  // Layar penuh kalau waktu abis
  const blockScreen = document.createElement("div");
  blockScreen.style.cssText = "position:fixed;inset:0;background:#0A0A0C;color:#fff;display:none;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:'Inter',sans-serif;z-index:100000;";
  blockScreen.innerHTML = `<div>
      <div style="font-weight:800;font-size:15px;margin-bottom:6px;">Waktu gratis hari ini abis 😴</div>
      <div style="font-size:12px;opacity:.7;">Tier Free dibatasi 1,5 jam/hari. Upgrade ke VIP biar nyala tanpa batas.</div>
    </div>`;
  document.body.appendChild(blockScreen);

  function lockOut(){
    if (containerEl) containerEl.style.display = "none";
    banner.style.display = "none";
    blockScreen.style.display = "flex";
  }

  if (usedBefore >= FREE_LIMIT_SECONDS) {
    lockOut();
    return { blocked: true, tier };
  }

  let elapsed = 0;
  const timer = setInterval(async () => {
    elapsed++;
    const total = usedBefore + elapsed;
    const remain = FREE_LIMIT_SECONDS - total;
    if (remain <= 0) {
      clearInterval(timer);
      await update(usageRef, { date: today, seconds: FREE_LIMIT_SECONDS });
      lockOut();
      return;
    }
    banner.textContent = `Tier akun Free — sisa waktu ${fmt(remain)}`;
    if (elapsed % SYNC_EVERY_SECONDS === 0) {
      update(usageRef, { date: today, seconds: total });
    }
  }, 1000);

  window.addEventListener("beforeunload", () => {
    update(usageRef, { date: today, seconds: usedBefore + elapsed });
  });

  return { blocked: false, tier };
}
