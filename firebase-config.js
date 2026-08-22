import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB23tMUXWn0dCXJf0LQ6nyhgFjDfAJisaI",
  authDomain: "subathon-feri.firebaseapp.com",
  databaseURL: "https://subathon-feri-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "subathon-feri",
  storageBucket: "subathon-feri.firebasestorage.app",
  messagingSenderId: "886179015275",
  appId: "1:886179015275:web:dc5b9e208f62b2d2ab1f2e"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Username TikTok dipakai sebagai "kunci" akun (bukan OAuth asli).
// Fungsi ini membersihkan karakter yang gak boleh dipakai di path Firebase.
export function sanitizeUsername(raw){
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[.#$\[\]\/\s]/g, "_");
}
