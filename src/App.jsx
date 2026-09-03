import React, { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Moon, Sun, Lock, Loader2, LayoutDashboard, ReceiptText, Settings as SettingsIcon, Check } from "lucide-react";
import Dashboard from "./Dashboard";
import OrdersPage from "./Orders";
import SettingsPage from "./Settings";

// Shares the admin password with the pricelist app — same Firestore project, same doc.
const AUTH_DOC_REF = doc(db, "pricelist", "main");
const DATA_DOC_REF = doc(db, "nota", "data");
const THEME_KEY = "nota-theme";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_SETTINGS = {
  platforms: [
    { id: uid(), label: "WA", color: "#22C55E" },
    { id: uid(), label: "Instagram", color: "#D946EF" },
    { id: uid(), label: "Telegram", color: "#38BDF8" },
  ],
  apps: [
    { id: uid(), label: "Netflix", color: "#DC2626" },
    { id: uid(), label: "Spotify", color: "#16A34A" },
    { id: uid(), label: "Alightmotion", color: "#EA580C" },
  ],
  plans: [
    { id: uid(), label: "Sharing" },
    { id: uid(), label: "Private" },
    { id: uid(), label: "Family" },
  ],
  durations: [
    { id: uid(), label: "1 Day", days: 1 },
    { id: uid(), label: "3 Days", days: 3 },
    { id: uid(), label: "1 Week", days: 7 },
    { id: uid(), label: "1 Month", days: 30 },
    { id: uid(), label: "3 Months", days: 90 },
    { id: uid(), label: "Lifetime", days: null },
  ],
  suppliers: [{ id: uid(), label: "Premstore", contact: "+62 877-6777-7777" }],
};

const DEFAULT_DATA = { settings: DEFAULT_SETTINGS, orders: [] };

const THEMES = {
  light: {
    bg: "#F2F7FE", bgElevated: "#FFFFFF", card: "#EAF2FC", cardBorder: "#D3E3F5",
    ink: "#142840", inkMuted: "#4C6C8C", inkFaint: "#93AFC9", accent: "#2563EB",
    accentSoft: "#DCE9FC", positive: "#1E9E64", negative: "#D64545", dangerSoft: "#FBEAE7",
    chipBg: "#DCE9FC", chipActiveBg: "#2563EB", chipActiveText: "#F4F9FF",
    navBg: "#FFFFFF", navBorder: "#D3E3F5", overlay: "rgba(20,40,64,0.4)", isDark: false,
  },
  dark: {
    bg: "#0A1424", bgElevated: "#101D33", card: "#101D33", cardBorder: "#1E3A5F",
    ink: "#E7EEF7", inkMuted: "#90AFCF", inkFaint: "#55749C", accent: "#3B82F6",
    accentSoft: "#142A46", positive: "#34D399", negative: "#F87171", dangerSoft: "#2A1A18",
    chipBg: "#142A46", chipActiveBg: "#3B82F6", chipActiveText: "#06101D",
    navBg: "#0D1A2E", navBorder: "#1E3A5F", overlay: "rgba(0,0,0,0.6)", isDark: true,
  },
};

const FONT_LINK = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&display=swap');
html, body, #root { margin: 0; padding: 0; width: 100%; }
* { box-sizing: border-box; }
body { overflow-x: hidden; }
`;

export default function App() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "dark"; } catch (e) { return false; }
  });
  const [authPassword, setAuthPassword] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [data, setData] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState("");
  const editingRef = useRef(false);

  const T = dark ? THEMES.dark : THEMES.light;

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) {}
    document.body.style.background = T.bg;
    document.documentElement.style.background = T.bg;
  }, [dark, T.bg]);

  const flashToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  // watch the shared admin password
  useEffect(() => {
    const unsub = onSnapshot(AUTH_DOC_REF, (snap) => {
      setAuthPassword(snap.exists() ? snap.data().password || "admin123" : "admin123");
      setAuthLoaded(true);
    }, () => { setAuthPassword("admin123"); setAuthLoaded(true); });
    return () => unsub();
  }, []);

  // watch nota data — only actually needed once logged in, but cheap to keep subscribed
  useEffect(() => {
    const unsub = onSnapshot(DATA_DOC_REF, (snap) => {
      if (!snap.exists()) {
        setDoc(DATA_DOC_REF, DEFAULT_DATA).catch(() => {});
        setData(DEFAULT_DATA);
      } else if (!editingRef.current) {
        const d = snap.data();
        setData({ settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) }, orders: d.orders || [] });
      }
      setDataLoaded(true);
    }, () => { setData(DEFAULT_DATA); setDataLoaded(true); });
    return () => unsub();
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    try { await setDoc(DATA_DOC_REF, next); } catch (e) { flashToast("Couldn't save — check your connection"); }
  }, []);

  const handleLogin = () => {
    if (pwInput === authPassword) { setIsLoggedIn(true); setPwInput(""); setLoginError(""); }
    else setLoginError("Incorrect password.");
  };

  if (!authLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <Loader2 className="animate-spin" color={T.accent} size={26} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Work Sans', sans-serif", padding: 20 }}>
        <style>{FONT_LINK}</style>
        <div style={{ width: "100%", maxWidth: 340, background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent }}>
              <Lock size={20} />
            </div>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, textAlign: "center", margin: "0 0 4px", color: T.ink }}>Nota — Admin Rekap</h1>
          <p style={{ fontSize: 13, color: T.inkMuted, textAlign: "center", margin: "0 0 18px" }}>Admin access only. Use the same password as your pricelist site.</p>
          <input
            type="password" autoFocus value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            style={{ width: "100%", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "10px 12px", background: T.bg, color: T.ink, outline: "none", fontSize: 14, fontFamily: "'Work Sans', sans-serif" }}
          />
          {loginError && <p style={{ color: T.negative, fontSize: 12.5, marginTop: 8 }}>{loginError}</p>}
          <button
            onClick={handleLogin}
            style={{ width: "100%", marginTop: 14, background: T.accent, color: T.isDark ? "#06101D" : "#F4F9FF", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Work Sans', sans-serif" }}
          >
            Log in
          </button>
          <button onClick={() => setDark(!dark)} style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", width: "100%", marginTop: 16, background: "transparent", border: "none", color: T.inkFaint, fontSize: 12, cursor: "pointer" }}>
            {dark ? <Sun size={13} /> : <Moon size={13} />} {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>
    );
  }

  if (!dataLoaded || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <Loader2 className="animate-spin" color={T.accent} size={26} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: T.bg, fontFamily: "'Work Sans', sans-serif", color: T.ink }}>
      <style>{FONT_LINK}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 90 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600, margin: 0 }}>Nota</h1>
          <button onClick={() => setDark(!dark)} style={{ width: 36, height: 36, borderRadius: "50%", background: T.card, border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, cursor: "pointer" }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {tab === "dashboard" && <Dashboard T={T} data={data} />}
        {tab === "orders" && <OrdersPage T={T} data={data} persist={persist} flashToast={flashToast} editingRef={editingRef} />}
        {tab === "settings" && <SettingsPage T={T} data={data} persist={persist} authPassword={authPassword} flashToast={flashToast} editingRef={editingRef} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.navBg, borderTop: `1px solid ${T.navBorder}`, display: "flex", justifyContent: "space-around", padding: "12px 20px calc(12px + env(safe-area-inset-bottom))", zIndex: 20 }}>
        <button onClick={() => setTab("dashboard")} style={navBtn(T, tab === "dashboard")}><LayoutDashboard size={19} /></button>
        <button onClick={() => setTab("orders")} style={navBtn(T, tab === "orders")}><ReceiptText size={19} /></button>
        <button onClick={() => setTab("settings")} style={navBtn(T, tab === "settings")}><SettingsIcon size={19} /></button>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 74, left: "50%", transform: "translateX(-50%)", background: T.accent, color: T.isDark ? "#06101D" : "#F4F9FF", padding: "10px 18px", borderRadius: 6, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, zIndex: 30 }}>
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

function navBtn(T, active) {
  return { border: "none", background: "transparent", cursor: "pointer", color: active ? T.accent : T.inkMuted, display: "flex", alignItems: "center", justifyContent: "center", padding: 6 };
}
