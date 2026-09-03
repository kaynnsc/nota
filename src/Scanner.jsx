import React, { useState } from "react";
import { ScanLine, FileText, Image as ImageIcon, Loader2, Check, X, ArrowRight } from "lucide-react";

// Recognized label keywords (Indonesian + English) mapped to order fields.
// Longer/more specific keys are checked first so e.g. "no hp" doesn't get
// swallowed by a looser rule.
const FIELD_PATTERNS = [
  { keys: ["nama customer", "nama pemesan", "nama", "name", "customer"], field: "customer" },
  { keys: ["no hp", "no. hp", "no wa", "whatsapp", "wa", "kontak", "telepon", "phone", "hp"], field: "contact" },
  { keys: ["aplikasi", "produk", "layanan", "app"], field: "appId", lookup: "apps" },
  { keys: ["plan", "paket"], field: "planId", lookup: "plans" },
  { keys: ["durasi", "duration", "masa aktif"], field: "durationId", lookup: "durations" },
  { keys: ["order dari", "platform", "kode"], field: "platformId", lookup: "platforms" },
  { keys: ["data akun", "email", "akun", "username"], field: "account" },
  { keys: ["password", "kata sandi", "pass"], field: "password" },
  { keys: ["harga jual", "harga", "price", "total"], field: "sellPrice", numeric: true },
  { keys: ["catatan", "notes", "note"], field: "notes" },
];

function lookupMatch(list, value) {
  const v = value.toLowerCase();
  return list.find((o) => v.includes(o.label.toLowerCase()) || o.label.toLowerCase().includes(v));
}

export function parseOrderText(text, settings) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const matched = {};
  const unmatched = [];

  lines.forEach((line) => {
    const m = line.match(/^[-*•]?\s*([^:：]+)[:：]\s*(.+)$/);
    if (!m) return;
    const label = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (!value) return;

    const pattern = FIELD_PATTERNS.find((p) => p.keys.some((k) => label.includes(k)));
    if (!pattern) return;

    if (pattern.lookup) {
      const list = settings[pattern.lookup] || [];
      const found = lookupMatch(list, value);
      if (found) {
        matched[pattern.field] = found.id;
        matched[`${pattern.field}_label`] = found.label;
      } else {
        unmatched.push({ field: pattern.field, raw: value, lookup: pattern.lookup });
      }
    } else if (pattern.numeric) {
      matched[pattern.field] = parseFloat(value.replace(/[^\d.]/g, "")) || 0;
    } else {
      matched[pattern.field] = value;
    }
  });

  return { matched, unmatched };
}

function inputStyle(T) {
  return { border: `1px solid ${T.cardBorder}`, borderRadius: 6, padding: "9px 10px", background: T.bgElevated, color: T.ink, outline: "none", fontFamily: "'Work Sans', sans-serif", width: "100%", fontSize: 13 };
}
function primaryBtnStyle(T) {
  return { background: T.accent, color: T.isDark ? "#06101D" : "#F4F9FF", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, cursor: "pointer", fontFamily: "'Work Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
}
function tabBtnStyle(T, active) {
  return { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: active ? T.accent : T.card, color: active ? (T.isDark ? "#06101D" : "#F4F9FF") : T.inkMuted, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
}

export default function ScannerModal({ T, settings, onClose, onApply }) {
  const [mode, setMode] = useState("text"); // text | image
  const [rawText, setRawText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [preview, setPreview] = useState(null); // { matched, unmatched } once parsed

  const runOcr = async (file) => {
    setOcrBusy(true);
    setOcrError("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setRawText(data.text || "");
    } catch (e) {
      setOcrError("Couldn't read that image. Try a clearer photo, or switch to Paste text instead.");
    } finally {
      setOcrBusy(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) runOcr(file);
  };

  const doParse = () => {
    if (!rawText.trim()) return;
    setPreview(parseOrderText(rawText, settings));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, borderRadius: "16px 16px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <ScanLine size={18} color={T.accent} /> Scan order
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted }}><X size={16} /></button>
        </div>

        {!preview && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setMode("text")} style={tabBtnStyle(T, mode === "text")}><FileText size={14} /> Paste text</button>
              <button onClick={() => setMode("image")} style={tabBtnStyle(T, mode === "image")}><ImageIcon size={14} /> Scan image</button>
            </div>

            {mode === "image" && (
              <div style={{ marginBottom: 12 }}>
                <input type="file" accept="image/*" onChange={handleFile} disabled={ocrBusy} style={{ fontSize: 13, color: T.ink }} />
                {ocrBusy && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12.5, color: T.inkMuted }}>
                    <Loader2 size={14} className="animate-spin" /> Reading text from image…
                  </div>
                )}
                {ocrError && <p style={{ color: T.negative, fontSize: 12.5, marginTop: 8 }}>{ocrError}</p>}
                <p style={{ fontSize: 11, color: T.inkFaint, marginTop: 8 }}>
                  Works best with clear, well-lit screenshots. Recognized text appears below — check it over before parsing, since OCR isn't perfect.
                </p>
              </div>
            )}

            <div style={{ fontSize: 11.5, color: T.inkFaint, marginBottom: 6 }}>
              {mode === "image" ? "Recognized text (edit if needed)" : "Paste the buyer's filled-in order format"}
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder={"Nama: Budi\nNo HP: 08123456789\nAplikasi: Netflix\nPlan: Sharing\nDurasi: 1 Bulan\nHarga: 45000"}
              style={{ ...inputStyle(T), resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
            <button onClick={doParse} disabled={!rawText.trim()} style={{ ...primaryBtnStyle(T), marginTop: 12, width: "100%", opacity: rawText.trim() ? 1 : 0.5 }}>
              Parse text <ArrowRight size={14} />
            </button>
            <p style={{ fontSize: 11, color: T.inkFaint, marginTop: 10 }}>
              Recognizes labeled lines like "Label: value" — works with Indonesian or English labels (Nama/Name, Aplikasi/App, Durasi/Duration, Harga/Price, etc.).
            </p>
          </>
        )}

        {preview && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Here's what was recognized:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {Object.keys(preview.matched).filter((k) => !k.endsWith("_label")).length === 0 && preview.unmatched.length === 0 && (
                <div style={{ fontSize: 13, color: T.inkFaint, fontStyle: "italic" }}>Nothing recognizable — try adjusting the text format or editing it above.</div>
              )}
              {Object.entries(preview.matched).filter(([k]) => !k.endsWith("_label")).map(([field, value]) => (
                <div key={field} style={{ display: "flex", justifyContent: "space-between", background: T.accentSoft, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
                  <span style={{ color: T.inkMuted, textTransform: "capitalize" }}>{fieldLabel(field)}</span>
                  <span style={{ color: T.ink, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={12} color={T.positive} /> {preview.matched[`${field}_label`] || value}
                  </span>
                </div>
              ))}
              {preview.unmatched.map((u, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", background: T.dangerSoft, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
                  <span style={{ color: T.inkMuted, textTransform: "capitalize" }}>{fieldLabel(u.field)}</span>
                  <span style={{ color: T.negative }}>"{u.raw}" — no matching option, pick manually</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPreview(null)} style={{ ...primaryBtnStyle(T), flex: 1, background: T.card, color: T.inkMuted }}>Back</button>
              <button onClick={() => onApply(preview.matched)} style={{ ...primaryBtnStyle(T), flex: 2 }}>
                Use this data <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fieldLabel(field) {
  const map = { customer: "Customer", contact: "Contact", appId: "Aplikasi", planId: "Plan", durationId: "Durasi", platformId: "Kode", account: "Data akun", password: "Password", sellPrice: "Harga jual", notes: "Catatan" };
  return map[field] || field;
}
