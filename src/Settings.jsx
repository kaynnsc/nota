import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { uid } from "./App";

const AUTH_DOC_REF = doc(db, "pricelist", "main");

function inputStyle(T) {
  return { border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "10px 12px", background: T.bgElevated, color: T.ink, outline: "none", fontFamily: "'Work Sans', sans-serif", fontSize: 16 };
}
function ghostBtnStyle(T) {
  return { display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "10px 12px", borderRadius: 8, border: `1px dashed ${T.cardBorder}`, background: "transparent", color: T.inkMuted, cursor: "pointer", fontFamily: "'Work Sans', sans-serif" };
}
function primaryBtnStyle(T) {
  return { background: T.accent, color: T.isDark ? "#06101D" : "#F4F9FF", border: "none", borderRadius: 8, padding: "11px 16px", fontSize: 14.5, cursor: "pointer", fontFamily: "'Work Sans', sans-serif" };
}
function iconBtnStyle(T) {
  return { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: T.inkMuted, flexShrink: 0 };
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
              <div key={opt.id} style={{ border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {hasColor && (
                    <input type="color" value={opt.color || "#93AFC9"} onChange={(e) => update(opt.id, { color: e.target.value })} style={{ width: 34, height: 34, padding: 0, border: `1px solid ${T.cardBorder}`, borderRadius: 8, background: "none", flexShrink: 0 }} />
                  )}
                  <input
                    defaultValue={opt.label}
                    onFocus={() => (editingRef.current = true)}
                    onBlur={(e) => { editingRef.current = false; update(opt.id, { label: e.target.value }); }}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    style={{ ...inputStyle(T), flex: 1, minWidth: 0 }}
                  />
                  <button onClick={() => remove(opt.id)} style={{ ...iconBtnStyle(T), color: T.negative, flexShrink: 0 }}><Trash2 size={14} /></button>
                </div>
                {(hasDays || hasContact) && (
                  <div style={{ display: "flex", gap: 6, paddingLeft: hasColor ? 40 : 0 }}>
                    {hasDays && (
                      <input
                        type="number"
                        defaultValue={opt.days === null ? "" : opt.days}
                        placeholder="Lifetime (leave blank)"
                        onFocus={() => (editingRef.current = true)}
                        onBlur={(e) => { editingRef.current = false; update(opt.id, { days: e.target.value === "" ? null : parseInt(e.target.value, 10) }); }}
                        style={{ ...inputStyle(T), flex: 1 }}
                        title="Days until expiry"
                      />
                    )}
                    {hasContact && (
                      <input
                        defaultValue={opt.contact}
                        placeholder="Contact"
                        onFocus={() => (editingRef.current = true)}
                        onBlur={(e) => { editingRef.current = false; update(opt.id, { contact: e.target.value }); }}
                        style={{ ...inputStyle(T), flex: 1 }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={add} style={ghostBtnStyle(T)}><Plus size={12} /> Add option</button>
        </div>
      )}
    </div>
  );
}

function SupplierSection({ T, list, onChange, editingRef }) {
  const [open, setOpen] = useState(false);

  const updateSupplier = (id, patch) => onChange(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSupplier = (id) => onChange(list.filter((s) => s.id !== id));
  const addSupplier = () => onChange([...list, { id: uid(), label: "New supplier", contacts: [{ id: uid(), name: "Admin 1", contact: "" }] }]);

  const addContact = (supplierId) => {
    updateSupplier(supplierId, { contacts: [...(list.find((s) => s.id === supplierId)?.contacts || []), { id: uid(), name: "New admin", contact: "" }] });
  };
  const updateContact = (supplierId, contactId, patch) => {
    const supplier = list.find((s) => s.id === supplierId);
    if (!supplier) return;
    updateSupplier(supplierId, { contacts: supplier.contacts.map((c) => (c.id === contactId ? { ...c, ...patch } : c)) });
  };
  const removeContact = (supplierId, contactId) => {
    const supplier = list.find((s) => s.id === supplierId);
    if (!supplier) return;
    updateSupplier(supplierId, { contacts: supplier.contacts.filter((c) => c.id !== contactId) });
  };

  return (
    <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", cursor: "pointer" }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Suppliers (First Hand) <span style={{ color: T.inkFaint, fontWeight: 400, fontSize: 12 }}>({list.length})</span></span>
        {open ? <ChevronDown size={16} color={T.inkFaint} /> : <ChevronRight size={16} color={T.inkFaint} />}
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map((supplier) => (
            <div key={supplier.id} style={{ border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <input
                  defaultValue={supplier.label}
                  onFocus={() => (editingRef.current = true)}
                  onBlur={(e) => { editingRef.current = false; updateSupplier(supplier.id, { label: e.target.value }); }}
                  onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                  style={{ ...inputStyle(T), flex: 1, fontWeight: 500 }}
                  placeholder="Supplier name"
                />
                <button onClick={() => removeSupplier(supplier.id)} style={{ ...iconBtnStyle(T), color: T.negative, flexShrink: 0 }}><Trash2 size={13} /></button>
              </div>

              <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 6, paddingLeft: 2 }}>Admins / contacts for this supplier</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(supplier.contacts || []).map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 8 }}>
                    <input
                      defaultValue={c.name}
                      onFocus={() => (editingRef.current = true)}
                      onBlur={(e) => { editingRef.current = false; updateContact(supplier.id, c.id, { name: e.target.value }); }}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      style={{ ...inputStyle(T), width: 100, flexShrink: 0 }}
                      placeholder="Admin name"
                    />
                    <input
                      defaultValue={c.contact}
                      onFocus={() => (editingRef.current = true)}
                      onBlur={(e) => { editingRef.current = false; updateContact(supplier.id, c.id, { contact: e.target.value }); }}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      style={{ ...inputStyle(T), flex: 1, minWidth: 0 }}
                      placeholder="+62..."
                    />
                    <button onClick={() => removeContact(supplier.id, c.id)} style={{ ...iconBtnStyle(T), color: T.negative, flexShrink: 0 }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => addContact(supplier.id)} style={{ ...ghostBtnStyle(T), marginTop: 8, marginLeft: 8, padding: "6px 10px", fontSize: 11.5 }}>
                <Plus size={11} /> Add admin
              </button>
            </div>
          ))}
          <button onClick={addSupplier} style={ghostBtnStyle(T)}><Plus size={12} /> Add supplier</button>
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
      <SupplierSection T={T} list={settings.suppliers} onChange={(list) => updateSettings({ suppliers: list })} editingRef={editingRef} />

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
