import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { uid } from "./App";

const AUTH_DOC_REF = doc(db, "pricelist", "main");

function inputStyle(T) {
  return { border: `1px solid ${T.cardBorder}`, borderRadius: 6, padding: "8px 10px", background: T.bgElevated, color: T.ink, outline: "none", fontFamily: "'Work Sans', sans-serif", fontSize: 13 };
}
function ghostBtnStyle(T) {
  return { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "8px 12px", borderRadius: 8, border: `1px dashed ${T.cardBorder}`, background: "transparent", color: T.inkMuted, cursor: "pointer", fontFamily: "'Work Sans', sans-serif" };
}
function primaryBtnStyle(T) {
  return { background: T.accent, color: T.isDark ? "#06101D" : "#F4F9FF", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer", fontFamily: "'Work Sans', sans-serif" };
}
function iconBtnStyle(T) {
  return { display: "flex", alignItems: "center", justifyContent: "center", padding: 5, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", color: T.inkMuted };
}

function OptionSection({ T, title, list, onChange, hasColor, hasDays, hasContact, editingRef }) {
  const [open, setOpen] = useState(false);

  const update = (id, patch) => onChange(list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const remove = (id) => onChange(list.filter((o) => o.id !== id));
  const add = () => onChange([...list, { id: uid(), label: "New option", ...(hasColor ? { color: "#93AFC9" } : {}), ...(hasDays ? { days: 1 } : {}), ...(hasContact ? { contact: "" } : {}) }]);

  return (
    <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", cursor: "pointer" }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{title} <span style={{ color: T.inkFaint, fontWeight: 400, fontSize: 12 }}>({list.length})</span></span>
        {open ? <ChevronDown size={16} color={T.inkFaint} /> : <ChevronRight size={16} color={T.inkFaint} />}
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {list.map((opt) => (
              <div key={opt.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {hasColor && (
                  <input type="color" value={opt.color || "#93AFC9"} onChange={(e) => update(opt.id, { color: e.target.value })} style={{ width: 30, height: 30, padding: 0, border: `1px solid ${T.cardBorder}`, borderRadius: 6, background: "none", flexShrink: 0 }} />
                )}
                <input
                  defaultValue={opt.label}
                  onFocus={() => (editingRef.current = true)}
                  onBlur={(e) => { editingRef.current = false; update(opt.id, { label: e.target.value }); }}
                  onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                  style={{ ...inputStyle(T), flex: 1, minWidth: 0 }}
                />
                {hasDays && (
                  <input
                    type="number"
                    defaultValue={opt.days === null ? "" : opt.days}
                    placeholder="lifetime"
                    onFocus={() => (editingRef.current = true)}
                    onBlur={(e) => { editingRef.current = false; update(opt.id, { days: e.target.value === "" ? null : parseInt(e.target.value, 10) }); }}
                    style={{ ...inputStyle(T), width: 72, flexShrink: 0 }}
                    title="Days until expiry (leave blank for lifetime)"
                  />
                )}
                {hasContact && (
                  <input
                    defaultValue={opt.contact}
                    placeholder="Contact"
                    onFocus={() => (editingRef.current = true)}
                    onBlur={(e) => { editingRef.current = false; update(opt.id, { contact: e.target.value }); }}
                    style={{ ...inputStyle(T), width: 110, flexShrink: 0 }}
                  />
                )}
                <button onClick={() => remove(opt.id)} style={{ ...iconBtnStyle(T), color: T.negative, flexShrink: 0 }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button onClick={add} style={ghostBtnStyle(T)}><Plus size={12} /> Add option</button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage({ T, data, persist, authPassword, flashToast, editingRef }) {
  const { settings } = data;
  const [newPw, setNewPw] = useState("");

  const updateSettings = (patch) => persist({ ...data, settings: { ...settings, ...patch } });

  const changePassword = async () => {
    if (!newPw.trim()) return;
    try {
      await setDoc(AUTH_DOC_REF, { password: newPw.trim() }, { merge: true });
      flashToast("Password updated");
      setNewPw("");
    } catch (e) {
      flashToast("Couldn't update password");
    }
  };

  return (
    <div style={{ padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "4px 0 12px" }}>Dropdown lists</h2>
      <p style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
        Add, rename, recolor, or remove options here — every dropdown in the order form updates immediately, no code changes needed.
      </p>

      <OptionSection T={T} title="Platforms (Kode)" list={settings.platforms} onChange={(list) => updateSettings({ platforms: list })} hasColor editingRef={editingRef} />
      <OptionSection T={T} title="Apps (Aplikasi)" list={settings.apps} onChange={(list) => updateSettings({ apps: list })} hasColor editingRef={editingRef} />
      <OptionSection T={T} title="Plans" list={settings.plans} onChange={(list) => updateSettings({ plans: list })} editingRef={editingRef} />
      <OptionSection T={T} title="Durations (days until warranty expires)" list={settings.durations} onChange={(list) => updateSettings({ durations: list })} hasDays editingRef={editingRef} />
      <OptionSection T={T} title="Suppliers (First Hand)" list={settings.suppliers} onChange={(list) => updateSettings({ suppliers: list })} hasContact editingRef={editingRef} />

      <div style={{ marginTop: 24, borderTop: `1px solid ${T.cardBorder}`, paddingTop: 18 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Admin password</h2>
        <p style={{ fontSize: 12, color: T.inkMuted, marginBottom: 10 }}>
          Shared with your pricelist site — changing it here changes the login for both.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" style={{ ...inputStyle(T), flex: 1 }} />
          <button onClick={changePassword} style={primaryBtnStyle(T)}>Save</button>
        </div>
      </div>

      <div style={{ height: 30 }} />
    </div>
  );
}
