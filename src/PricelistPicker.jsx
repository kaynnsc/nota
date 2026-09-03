import React, { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { Search, X, Loader2, ArrowRight, Sparkles } from "lucide-react";

const PRICELIST_DOC_REF = doc(db, "pricelist", "main");

const DURATION_TOKEN = /(\d+)\s*(hari|hr|day|days|minggu|mgg|week|weeks|bulan|bln|month|months|tahun|thn|year|years)/i;

// Converts a duration mention found in an item's name/unit into a day-count,
// regardless of whether it's written in Indonesian or English.
export function extractDurationDays(text) {
  if (!text) return null;
  const m = text.match(DURATION_TOKEN);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (/^(hari|hr|day|days)$/.test(unit)) return n * 1;
  if (/^(minggu|mgg|week|weeks)$/.test(unit)) return n * 7;
  if (/^(bulan|bln|month|months)$/.test(unit)) return n * 30;
  if (/^(tahun|thn|year|years)$/.test(unit)) return n * 365;
  return null;
}

// Strips the duration mention out of an item name to guess the underlying app/product name.
export function guessAppName(name) {
  let s = name.replace(DURATION_TOKEN, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s || name;
}

function formatIDR(n) {
  const num = Number(n) || 0;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export default function PricelistPicker({ T, settings, onClose, onPick }) {
  const [pricelist, setPricelist] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      PRICELIST_DOC_REF,
      (snap) => {
        setPricelist(snap.exists() ? snap.data().items || [] : []);
        setLoaded(true);
      },
      () => { setPricelist([]); setLoaded(true); }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!pricelist) return [];
    return pricelist.filter((it) => !query.trim() || (it.name + " " + it.category).toLowerCase().includes(query.toLowerCase()));
  }, [pricelist, query]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((it) => {
      if (!map[it.category]) map[it.category] = [];
      map[it.category].push(it);
    });
    return map;
  }, [filtered]);

  const previewFor = (item) => {
    const guessedApp = guessAppName(item.name);
    const matchedApp = settings.apps.find((a) => guessedApp.toLowerCase().includes(a.label.toLowerCase()) || a.label.toLowerCase().includes(guessedApp.toLowerCase()));
    const days = extractDurationDays(item.name) || extractDurationDays(item.unit);
    const matchedDuration = days ? settings.durations.find((d) => d.days === days) : null;
    return { guessedApp, matchedApp, matchedDuration };
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, borderRadius: "16px 16px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: 0, fontWeight: 600 }}>Pick from pricelist</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted }}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 999, padding: "9px 14px", marginBottom: 14 }}>
          <Search size={15} color={T.inkFaint} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 13.5, color: T.ink, fontFamily: "'Work Sans', sans-serif" }} />
        </div>

        {!loaded && (
          <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
            <Loader2 className="animate-spin" size={20} color={T.accent} />
          </div>
        )}

        {loaded && filtered.length === 0 && (
          <div style={{ textAlign: "center", color: T.inkFaint, fontSize: 13, padding: "24px 0" }}>
            No products found — check your pricelist has items, or that the Firebase project matches.
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>{category}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((item, i) => {
                const { guessedApp, matchedApp, matchedDuration } = previewFor(item);
                return (
                  <button
                    key={i}
                    onClick={() => onPick(item)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: T.inkFaint, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Sparkles size={10} />
                        {matchedApp ? `→ ${matchedApp.label}` : `→ new app "${guessedApp}"`}
                        {matchedDuration ? ` · ${matchedDuration.label}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: 13.5, color: T.positive }}>{formatIDR(item.price)}</span>
                      <ArrowRight size={14} color={T.inkFaint} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <p style={{ fontSize: 11, color: T.inkFaint, marginTop: 4 }}>
          Selling price and app are filled in automatically. Duration is matched when possible; if not, pick it manually in the form. Cost price is up to you since your pricelist doesn't track supplier cost.
        </p>
      </div>
    </div>
  );
}
