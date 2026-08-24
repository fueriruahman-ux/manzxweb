// ============================================================
// BOT MANZXSUB — dengerin TikTok Live, update Firebase
// Gabungan: Timer + Alert + Musik (!play) jadi satu script
// (Versi 2.x tiktok-live-connector — pakai TikTokLiveConnection)
// ============================================================
// Cara pakai di Termux:
// 1. pkg install nodejs
// 2. npm install tiktok-live-connector
// 3. Ganti USERNAME dan YOUTUBE_API_KEY di bawah ini
// 4. Jalanin: node bot.js
// ============================================================

const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const USERNAME = "ferxmc7";  // username TikTok kamu (sama kayak di dashboard ManzXSub)
const FIREBASE_URL = "https://subathon-feri-default-rtdb.asia-southeast1.firebasedatabase.app";
const YOUTUBE_API_KEY = "GANTI_DENGAN_API_KEY_YOUTUBE_KAMU"; // buat fitur !play, isi nanti

const connection = new TikTokLiveConnection(USERNAME, {
  processInitialData: true,
  enableExtendedGiftInfo: true
});

connection.connect()
  .then(state => console.log(`✅ Terhubung ke live @${USERNAME}, roomId: ${state.roomId}`))
  .catch(err => console.error("❌ Gagal connect:", err.message));

connection.on('disconnected', () => console.log("⚠️ Koneksi putus, coba reconnect manual ya."));

// ================== GIFT -> TIMER + ALERT ==================
connection.on(WebcastEvent.GIFT, async (data) => {
  // Kalau gift dikirim beruntun (combo), tunggu sampai combo-nya selesai
  if (data.giftType === 1 && !data.repeatEnd) return;

  const coins = data.repeatCount || 1;
  const sender = data.uniqueId;
  const giftName = data.giftName;

  try {
    const timerRes = await fetch(`${FIREBASE_URL}/users/${USERNAME}/timer.json`);
    const timer = (await timerRes.json()) || {};
    const maxCoins = timer.maxCoins || 30;
    const minutesPerCoin = timer.minutesPerCoin || 3;
    const newTimerCoins = Math.min((timer.timerCoins || 0) + coins, maxCoins);
    const addedMinutes = Math.max(0, newTimerCoins - (timer.timerCoins || 0)) * minutesPerCoin;
    const base = Math.max(timer.timerEnd || 0, Date.now());

    await fetch(`${FIREBASE_URL}/users/${USERNAME}/timer.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timerCoins: newTimerCoins,
        timerEnd: base + addedMinutes * 60 * 1000,
        totalCoins: (timer.totalCoins || 0) + coins
      })
    });

    await fetch(`${FIREBASE_URL}/users/${USERNAME}/lastGift.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sender, gift: giftName, coins, ts: Date.now() })
    });

    console.log(`[Gift] @${sender} kirim ${giftName} x${coins}`);
  } catch (err) {
    console.error("[Gift] Error:", err.message);
  }
});

// ================== CHAT -> MUSIK (!play) ==================
connection.on(WebcastEvent.CHAT, async (data) => {
  const comment = data.comment || "";
  const sender = data.uniqueId;
  if (!comment.toLowerCase().startsWith("!play ")) return;

  const query = comment.slice(6).trim();
  if (!query) return;

  console.log(`[Musik] @${sender} minta: ${query}`);

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const video = searchData.items && searchData.items[0];
    if (!video) { console.log("[Musik] Lagu gak ketemu"); return; }

    await fetch(`${FIREBASE_URL}/users/${USERNAME}/music/currentSong.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: video.id.videoId,
        title: video.snippet.title,
        requestedBy: sender,
        ts: Date.now()
      })
    });
    console.log(`[Musik] Muter: ${video.snippet.title}`);
  } catch (err) {
    console.error("[Musik] Error:", err.message);
  }
});
