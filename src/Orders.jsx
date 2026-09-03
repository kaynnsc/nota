import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Plus, Trash2, Pencil, X, Upload, Download, Sheet, Loader2, Search } from "lucide-react";
import { uid } from "./App";
import { warrantyInfo } from "./Dashboard";

function formatIDR(n) {
  const num = Number(n) || 0;
  return `Rp ${num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function emptyOrder() {
  return {
    id: uid(), date: new Date().toISOString().slice(0, 10), customer: "", platformId: "", contact: "",
    appId: "", planId: "", durationId: "", account: "", password: "", supplierId: "", supplierContact: "",
    sellPrice: 0, costPrice: 0, notes: "", delivered: false,
  };
}

function parseCSV(text) {
  const delim = text.includes("\t") ? "\t" : ",";
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const splitLine = (line) => {
    if (delim === "\t") return line.split("\t");
    const out = []; let cur = ""; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const header = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => splitLine(l));
  return rows.map((r) => { const obj = {}; header.forEach((h, i) => (obj[h] = (r[i] || "").trim())); return obj; });
}

function findOrCreateOption(list, label, extra = {}) {
  if (!label) return { list, id: "" };
  const existing = list.find((o) => o.label.toLowerCase() === label.toLowerCase());
  if (existing) return { list, id: existing.id };
  const created = { id: uid(), label, ...extra };
  return { list: [...list, created], id: created.id };
}

export default function OrdersPage({ T, data, persist, flashToast, editingRef }) {
  const { orders, settings } = data;
  const [query, setQuery] = useState("");
  const [editingOrder, setEditingOrder] = useState(null); // order object being added/edited, or null
  const [showImport, setShowImport] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    return [...orders]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .filter((o) => !query.trim() || (o.customer + " " + o.account).toLowerCase().includes(query.toLowerCase()));
  }, [orders, query]);

  const saveOrder = (order) => {
    const exists = orders.some((o) => o.id === order.id);
    const nextOrders = exists ? orders.map((o) => (o.id === order.id ? order : o)) : [...orders, order];
    persist({ ...data, orders: nextOrders });
    setEditingOrder(null);
    flashToast(exists ? "Order updated" : "Order added");
  };

  const deleteOrder = (id) => {
    persist({ ...data, orders: orders.filter((o) => o.id !== id) });
  };

  const toggleDelivered = (id) => {
    persist({ ...data, orders: orders.map((o) => (o.id === id ? { ...o, delivered: !o.delivered } : o)) });
  };

  const exportExcel = () => {
    const rows = orders.map((o) => ({
      "Tanggal Order": o.date,
      "Nama Customer": o.customer,
      "Kode": settings.platforms.find((p) => p.id === o.platformId)?.label || "",
      "Keterangan": o.contact,
      "Aplikasi": settings.apps.find((a) => a.id === o.appId)?.label || "",
      "Plan": settings.plans.find((p) => p.id === o.planId)?.label || "",
      "Durasi": settings.durations.find((d) => d.id === o.durationId)?.label || "",
      "Data Akun": o.account,
      "Password": o.password,
      "First Hand": settings.suppliers.find((s) => s.id === o.supplierId)?.label || "",
      "Contact FH": o.supplierContact,
      "Harga Jual": o.sellPrice,
      "Harga Beli": o.costPrice,
      "Keuntungan": (Number(o.sellPrice) || 0) - (Number(o.costPrice) || 0),
      "Catatan": o.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Order");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rekap-order.xlsx";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashToast("Exported");
  };

  const rowsToOrders = (rows) => {
    let platforms = [...settings.platforms], apps = [...settings.apps], plans = [...settings.plans], suppliers = [...settings.suppliers];
    const newOrders = rows.map((row) => {
      const platformRes = findOrCreateOption(platforms, row["kode"] || row["platform"], { color: "#93AFC9" });
      platforms = platformRes.list;
      const appRes = findOrCreateOption(apps, row["aplikasi"] || row["app"], { color: "#93AFC9" });
      apps = appRes.list;
      const planRes = findOrCreateOption(plans, row["plan"]);
      plans = planRes.list;
      const supplierRes = findOrCreateOption(suppliers, row["first hand"] || row["firsthand"] || row["supplier"], { contact: row["contact fh"] || "" });
      suppliers = supplierRes.list;
      const durationLabel = row["durasi"] || row["duration"] || "";
      let duration = settings.durations.find((d) => d.label.toLowerCase() === durationLabel.toLowerCase());
      const durationId = duration ? duration.id : "";
      return {
        id: uid(),
        date: row["tanggal order"] || row["date"] || new Date().toISOString().slice(0, 10),
        customer: row["nama customer"] || row["customer"] || "",
        platformId: platformRes.id,
        contact: row["keterangan"] || row["contact"] || "",
        appId: appRes.id,
        planId: planRes.id,
        durationId,
        account: row["data akun"] || row["account"] || "",
        password: row["password"] || "",
        supplierId: supplierRes.id,
        supplierContact: row["contact fh"] || "",
        sellPrice: parseFloat(row["harga jual"] || row["sell price"] || 0) || 0,
        costPrice: parseFloat(row["harga beli"] || row["cost price"] || 0) || 0,
        notes: row["catatan"] || row["notes"] || "",
        delivered: false,
      };
    });
    return { newOrders, platforms, apps, plans, suppliers };
  };

  const applyImport = (rows) => {
    if (rows.length === 0) { setImportError("No recognizable rows found."); return; }
    const { newOrders, platforms, apps, plans, suppliers } = rowsToOrders(rows);
    persist({ settings: { ...settings, platforms, apps, plans, suppliers }, orders: [...orders, ...newOrders] });
    setShowImport(false);
    flashToast(`Imported ${newOrders.length} orders`);
  };

  const handleExcelFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportBusy(true); setImportError("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const normalized = rows.map((r) => { const lower = {}; Object.keys(r).forEach((k) => (lower[k.toLowerCase()] = String(r[k]))); return lower; });
        applyImport(normalized);
      } catch (err) { setImportError("Couldn't read that file."); }
      finally { setImportBusy(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsArrayBuffer(file);
  };

  const importFromUrl = async () => {
    if (!sheetUrl.trim()) return;
    setImportBusy(true); setImportError("");
    try {
      const res = await fetch(sheetUrl.trim());
      if (!res.ok) throw new Error("bad response");
      const text = await res.text();
      applyImport(parseCSV(text));
    } catch (err) { setImportError("Couldn't fetch that link. Try pasting cells instead."); }
    finally { setImportBusy(false); }
  };

  const importFromPaste = () => {
    if (!pasteText.trim()) return;
    applyImport(parseCSV(pasteText.trim()));
    setPasteText("");
  };

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 999, padding: "9px 14px", flex: 1 }}>
          <Search size={15} color={T.inkFaint} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders" style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 13.5, color: T.ink, fontFamily: "'Work Sans', sans-serif" }} />
        </div>
        <button onClick={() => setShowImport(true)} style={iconOnlyBtn(T)} title="Import"><Upload size={16} /></button>
        <button onClick={exportExcel} style={iconOnlyBtn(T)} title="Export"><Download size={16} /></button>
      </div>

      <button onClick={() => setEditingOrder(emptyOrder())} style={{ ...primaryBtnStyle(T), width: "100%", marginBottom: 14 }}>
        <Plus size={14} /> Add order
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", color: T.inkFaint, fontSize: 13.5, padding: "24px 0" }}>No orders yet.</div>}
        {filtered.map((o) => {
          const app = settings.apps.find((a) => a.id === o.appId);
          const profit = (Number(o.sellPrice) || 0) - (Number(o.costPrice) || 0);
          const w = warrantyInfo(o, settings);
          return (
            <div key={o.id} style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: app?.color || T.inkFaint, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {(app?.label || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customer || "Unnamed"}</span>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 13.5, color: T.positive, whiteSpace: "nowrap" }}>+{formatIDR(profit)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 1 }}>
                  {app?.label || "—"} · {o.date}
                  {w.status === "expired" && <span style={{ color: T.negative }}> · expired</span>}
                  {w.status === "expiring" && <span style={{ color: T.negative }}> · {w.daysLeft}d left</span>}
                </div>
              </div>
              <button
                onClick={() => toggleDelivered(o.id)}
                style={{ fontSize: 10.5, padding: "4px 9px", borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0, background: o.delivered ? `${T.positive}22` : T.card, color: o.delivered ? T.positive : T.inkFaint }}
              >
                {o.delivered ? "Taken" : "Pending"}
              </button>
              <button onClick={() => setEditingOrder(o)} style={iconBtnStyle(T)}><Pencil size={14} /></button>
              <button onClick={() => deleteOrder(o.id)} style={{ ...iconBtnStyle(T), color: T.negative }}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>

      {editingOrder && (
        <OrderForm T={T} order={editingOrder} settings={settings} onSave={saveOrder} onClose={() => setEditingOrder(null)} onSettingsChange={(s) => persist({ ...data, settings: s })} editingRef={editingRef} />
      )}

      {showImport && (
        <Modal T={T} title="Import orders" onClose={() => { setShowImport(false); setImportError(""); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>From Excel or CSV file</div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ fontSize: 13, color: T.ink }} />
            </div>
            <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Sheet size={13} /> From a public Google Sheet</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Published CSV link" style={{ ...inputStyle(T), flex: 1 }} />
                <button onClick={importFromUrl} disabled={importBusy} style={primaryBtnStyle(T)}>{importBusy ? <Loader2 size={14} className="animate-spin" /> : "Fetch"}</button>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Or paste cells directly</div>
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={5} placeholder={"Tanggal Order\tNama Customer\tKode\tAplikasi\tPlan\tDurasi\tHarga Jual\tHarga Beli"} style={{ ...inputStyle(T), fontFamily: "monospace", fontSize: 11.5, resize: "vertical" }} />
              <button onClick={importFromPaste} style={{ ...primaryBtnStyle(T), marginTop: 8 }}>Import pasted data</button>
            </div>
            {importError && <p style={{ color: T.negative, fontSize: 12.5, background: T.dangerSoft, padding: "8px 10px", borderRadius: 4 }}>{importError}</p>}
            <p style={{ fontSize: 11, color: T.inkFaint }}>
              Columns matching your sheet: Tanggal Order, Nama Customer, Kode, Keterangan, Aplikasi, Plan, Durasi, Data Akun, Password, First Hand, Contact FH, Harga Jual, Harga Beli, Catatan.
              New platforms/apps/plans/suppliers found in the file are added to your dropdown lists automatically.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function OrderForm({ T, order, settings, onSave, onClose, onSettingsChange, editingRef }) {
  const [form, setForm] = useState(order);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSupplierChange = (supplierId) => {
    const supplier = settings.suppliers.find((s) => s.id === supplierId);
    set({ supplierId, supplierContact: supplier ? supplier.contact : form.supplierContact });
  };

  const profit = (Number(form.sellPrice) || 0) - (Number(form.costPrice) || 0);

  return (
    <Modal T={T} title={order.customer || order.id ? "Edit order" : "New order"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} onFocus={() => (editingRef.current = true)} onBlur={() => (editingRef.current = false)}>
        <Field T={T} label="Tanggal order">
          <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} style={inputStyle(T)} />
        </Field>
        <Field T={T} label="Nama customer">
          <input value={form.customer} onChange={(e) => set({ customer: e.target.value })} style={inputStyle(T)} placeholder="Customer name" />
        </Field>
        <Field T={T} label="Kode (platform order masuk)">
          <select value={form.platformId} onChange={(e) => set({ platformId: e.target.value })} style={inputStyle(T)}>
            <option value="">— pilih —</option>
            {settings.platforms.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field T={T} label="Keterangan (kontak customer)">
          <input value={form.contact} onChange={(e) => set({ contact: e.target.value })} style={inputStyle(T)} placeholder="+62..." />
        </Field>
        <Field T={T} label="Aplikasi">
          <select value={form.appId} onChange={(e) => set({ appId: e.target.value })} style={inputStyle(T)}>
            <option value="">— pilih —</option>
            {settings.apps.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field T={T} label="Plan">
          <select value={form.planId} onChange={(e) => set({ planId: e.target.value })} style={inputStyle(T)}>
            <option value="">— pilih —</option>
            {settings.plans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field T={T} label="Durasi">
          <select value={form.durationId} onChange={(e) => set({ durationId: e.target.value })} style={inputStyle(T)}>
            <option value="">— pilih —</option>
            {settings.durations.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </Field>
        <Field T={T} label="Data akun">
          <input value={form.account} onChange={(e) => set({ account: e.target.value })} style={inputStyle(T)} placeholder="email@..." />
        </Field>
        <Field T={T} label="Password">
          <input value={form.password} onChange={(e) => set({ password: e.target.value })} style={inputStyle(T)} />
        </Field>
        <Field T={T} label="First hand (supplier)">
          <select value={form.supplierId} onChange={(e) => onSupplierChange(e.target.value)} style={inputStyle(T)}>
            <option value="">— pilih —</option>
            {settings.suppliers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field T={T} label="Contact FH">
          <input value={form.supplierContact} onChange={(e) => set({ supplierContact: e.target.value })} style={inputStyle(T)} />
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <Field T={T} label="Harga jual" style={{ flex: 1 }}>
            <input type="number" value={form.sellPrice} onChange={(e) => set({ sellPrice: parseFloat(e.target.value) || 0 })} style={inputStyle(T)} />
          </Field>
          <Field T={T} label="Harga beli" style={{ flex: 1 }}>
            <input type="number" value={form.costPrice} onChange={(e) => set({ costPrice: parseFloat(e.target.value) || 0 })} style={inputStyle(T)} />
          </Field>
        </div>
        <div style={{ background: T.accentSoft, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12.5, color: T.inkMuted }}>Keuntungan (auto)</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: profit >= 0 ? T.positive : T.negative }}>Rp {profit.toLocaleString("id-ID")}</span>
        </div>
        <Field T={T} label="Catatan">
          <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} style={{ ...inputStyle(T), resize: "vertical" }} />
        </Field>

        <button onClick={() => onSave(form)} style={{ ...primaryBtnStyle(T), marginTop: 6 }}>Save order</button>
      </div>
    </Modal>
  );
}

function Field({ T, label, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 11.5, color: T.inkFaint, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ children, onClose, title, T }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, borderRadius: "16px 16px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: 0, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={iconBtnStyle(T)}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function inputStyle(T) {
  return { border: `1px solid ${T.cardBorder}`, borderRadius: 6, padding: "9px 10px", background: T.bgElevated, color: T.ink, outline: "none", fontFamily: "'Work Sans', sans-serif", width: "100%", fontSize: 13.5 };
}
function primaryBtnStyle(T) {
  return { background: T.accent, color: T.isDark ? "#06101D" : "#F4F9FF", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, cursor: "pointer", fontFamily: "'Work Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
}
function iconBtnStyle(T) {
  return { display: "flex", alignItems: "center", justifyContent: "center", padding: 5, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", color: T.inkMuted, flexShrink: 0 };
}
function iconOnlyBtn(T) {
  return { display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, border: `1px solid ${T.cardBorder}`, background: T.bgElevated, cursor: "pointer", color: T.inkMuted, flexShrink: 0 };
}
