import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ShoppingCart, ShieldCheck, Wallet, Search, X, Edit2 } from "lucide-react";

function formatIDR(n) {
  const num = Number(n) || 0;
  return `Rp ${num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function warrantyInfo(order, settings) {
  const duration = settings.durations.find((d) => d.id === order.durationId);
  if (!duration || duration.days == null) return { status: "lifetime", daysLeft: null };
  const orderDate = new Date(order.date);
  const expiry = new Date(orderDate);
  expiry.setDate(expiry.getDate() + duration.days);
  const now = new Date();
  const diffMs = expiry.setHours(23, 59, 59, 999) - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= 2) return { status: "expiring", daysLeft };
  return { status: "active", daysLeft };
}

export default function Dashboard({ T, data, onNavigate }) {
  const { orders, settings } = data;
  const [searchInput, setSearchInput] = useState("");
  const [viewingOrder, setViewingOrder] = useState(null);

  const runSearch = () => {
    if (searchInput.trim()) onNavigate({ type: "search", query: searchInput.trim() });
  };

  const stats = useMemo(() => {
    const today = todayISO();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let todaysProfit = 0, monthlyProfit = 0, totalProfit = 0, totalRevenue = 0, activeWarranty = 0;
    orders.forEach((o) => {
      const profit = (Number(o.sellPrice) || 0) - (Number(o.costPrice) || 0);
      totalProfit += profit;
      totalRevenue += Number(o.sellPrice) || 0;
      if (o.date === today) todaysProfit += profit;
      const d = new Date(o.date);
      if (d.getMonth() === month && d.getFullYear() === year) monthlyProfit += profit;
      const w = warrantyInfo(o, settings);
      if (w.status === "active" || w.status === "expiring" || w.status === "lifetime") activeWarranty++;
    });

    return { totalOrders: orders.length, activeWarranty, todaysProfit, monthlyProfit, totalProfit, totalRevenue };
  }, [orders, settings]);

  const reminders = useMemo(() => {
    return orders
      .map((o) => ({ o, w: warrantyInfo(o, settings) }))
      .filter(({ w }) => w.status === "expiring" || w.status === "expired")
      .sort((a, b) => a.w.daysLeft - b.w.daysLeft);
  }, [orders, settings]);

  const last7DaysChart = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("id-ID", { weekday: "short" });
      const profit = orders.filter((o) => o.date === iso).reduce((sum, o) => sum + ((Number(o.sellPrice) || 0) - (Number(o.costPrice) || 0)), 0);
      days.push({ label, profit });
    }
    return days;
  }, [orders]);

  const appDistribution = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const app = settings.apps.find((a) => a.id === o.appId);
      const label = app ? app.label : "Other";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => {
      const app = settings.apps.find((a) => a.label === name);
      return { name, value, color: app ? app.color : "#93AFC9" };
    });
  }, [orders, settings]);

  return (
    <div style={{ padding: "0 20px" }}>
      {/* HERO: the number a shop owner checks first */}
      <div style={{ background: T.accent, borderRadius: 18, padding: "20px 20px", marginBottom: 12, color: T.isDark ? "#06101D" : "#F4F9FF" }}>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>Profit this month</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginTop: 4 }}>{formatIDR(stats.monthlyProfit)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 12.5, opacity: 0.9 }}>
          <span>Today: {formatIDR(stats.todaysProfit)}</span>
          <button onClick={() => onNavigate({ type: "month" })} style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "inherit", fontSize: 11.5, padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontWeight: 500 }}>
            View orders
          </button>
        </div>
      </div>

      {/* horizontal-scrolling secondary stats — no cramped grid, no wrapping on narrow phones */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 18, paddingBottom: 2 }}>
        <MiniStat T={T} icon={<ShoppingCart size={14} />} label="Total orders" value={stats.totalOrders} color={T.accent} onClick={() => onNavigate(null)} />
        <MiniStat T={T} icon={<ShieldCheck size={14} />} label="Active warranty" value={stats.activeWarranty} color={T.positive} onClick={() => onNavigate({ type: "warranty" })} />
        <MiniStat T={T} icon={<Wallet size={14} />} label="Total profit" value={formatIDR(stats.totalProfit)} color={T.positive} onClick={() => onNavigate(null)} />
      </div>

      {/* NEEDS ATTENTION */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>Needs attention</span>
          {reminders.length > 0 && (
            <button onClick={() => onNavigate({ type: "warranty" })} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              See all ({reminders.length})
            </button>
          )}
        </div>

        {reminders.length === 0 ? (
          <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "16px", textAlign: "center", fontSize: 12.5, color: T.inkFaint }}>
            All warranties are healthy — nothing expiring soon.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {reminders.slice(0, 3).map(({ o, w }) => (
              <div
                key={o.id}
                onClick={() => setViewingOrder(o)}
                style={{ background: T.dangerSoft, border: `1px solid ${T.negative}33`, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customer}</div>
                  <div style={{ fontSize: 11.5, color: T.inkMuted }}>{settings.apps.find((a) => a.id === o.appId)?.label || "—"}</div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: T.negative, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 8 }}>
                  {w.status === "expired" ? `Expired ${Math.abs(w.daysLeft)}d ago` : w.daysLeft === 0 ? "Expires today" : `${w.daysLeft}d left`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEARCH — secondary, not the first thing on the page */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
        <Search size={15} color={T.inkFaint} />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search orders or customers"
          style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 15, color: T.ink, fontFamily: "'Work Sans', sans-serif" }}
        />
      </div>
      {appDistribution.length > 0 && (
        <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "16px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={appDistribution} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50} paddingAngle={2}>
                {appDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>Orders by app</div>
            {appDistribution.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "2px", background: d.color, flexShrink: 0 }} />
                <span style={{ color: T.ink, fontWeight: 500 }}>{d.name}</span>
                <span style={{ color: T.inkFaint, marginLeft: "auto" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BAR CHART */}
      <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "16px 12px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, padding: "0 8px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Profit — last 7 days</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={last7DaysChart}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.inkFaint }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(v) => formatIDR(v)}
              contentStyle={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: T.ink }}
            />
            <Bar dataKey="profit" fill={T.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: 11, color: T.inkFaint, textAlign: "center", padding: "8px 0 20px" }}>
        All totals above are calculated automatically from your order list.
      </div>

      {/* READ-ONLY VIEW MODAL (Matching Orders style) */}
      {viewingOrder && (
        <OrderViewModal 
          T={T} 
          order={viewingOrder} 
          settings={settings} 
          onClose={() => setViewingOrder(null)} 
          onEdit={() => { 
            setViewingOrder(null); 
            onNavigate({ type: "search", query: viewingOrder.customer }); 
          }} 
        />
      )}
    </div>
  );
}

function MiniStat({ T, icon, label, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 8, background: T.bgElevated, border: `1px solid ${T.cardBorder}`,
        borderRadius: 999, padding: "9px 14px 9px 10px", cursor: onClick ? "pointer" : "default", fontFamily: "'Work Sans', sans-serif",
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 10.5, color: T.inkFaint, whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>{value}</div>
      </div>
    </button>
  );
}

function OrderViewModal({ T, order, settings, onClose, onEdit }) {
  const app = settings.apps.find((a) => a.id === order.appId)?.label || "—";
  const plan = settings.plans.find((p) => p.id === order.planId)?.label || "—";
  const platform = settings.platforms.find((p) => p.id === order.platformId)?.label || "—";
  const duration = settings.durations.find((d) => d.id === order.durationId)?.label || "—";
  const supplier = settings.suppliers.find((s) => s.id === order.supplierId)?.label || "—";
  const selectedSupplier = settings.suppliers.find((s) => s.id === order.supplierId);
  const supplierContactName = selectedSupplier?.contacts?.find((c) => c.id === order.supplierContactId)?.name || "";
  
  const profit = (Number(order.sellPrice) || 0) - (Number(order.costPrice) || 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, borderRadius: "16px 16px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: 0, fontWeight: 600 }}>View Order</h3>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 5, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", color: T.inkMuted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ textAlign: "center", paddingBottom: 14, marginBottom: 4, borderBottom: `1px dashed ${T.cardBorder}` }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: T.ink }}>{order.customer || "Unnamed"}</div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{app} · {plan} · {duration}</div>
          </div>

          <ReceiptRow T={T} label="Tanggal order" value={order.date || "—"} />
          <ReceiptRow T={T} label="Platform (Kode)" value={platform} />
          <ReceiptRow T={T} label="Kontak customer" value={order.contact || "—"} />
          <div style={{ height: 8 }} />
          <ReceiptRow T={T} label="Data akun" value={order.account || "—"} mono />
          <ReceiptRow T={T} label="Password" value={order.password || "—"} mono />
          <div style={{ height: 8 }} />
          <ReceiptRow T={T} label="First hand" value={supplier} />
          {supplierContactName && <ReceiptRow T={T} label="Admin / CP" value={`${supplierContactName} — ${order.supplierContact || ""}`} />}
          {!supplierContactName && order.supplierContact && <ReceiptRow T={T} label="Contact FH" value={order.supplierContact} />}
          <div style={{ height: 8 }} />
          <ReceiptRow T={T} label="Harga jual" value={`Rp ${(Number(order.sellPrice) || 0).toLocaleString("id-ID")}`} />
          <ReceiptRow T={T} label="Harga beli" value={`Rp ${(Number(order.costPrice) || 0).toLocaleString("id-ID")}`} />

          <div style={{ background: T.accentSoft, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 12.5, color: T.inkMuted }}>Keuntungan (auto)</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: profit >= 0 ? T.positive : T.negative }}>Rp {profit.toLocaleString("id-ID")}</span>
          </div>

          {order.notes && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: T.inkMuted, background: T.card, borderRadius: 8, padding: "10px 12px" }}>
              {order.notes}
            </div>
          )}

          <button onClick={onEdit} style={{ background: T.accent, color: T.isDark ? "#06101D" : "#F4F9FF", border: "none", borderRadius: 8, padding: "12px 16px", fontSize: 14.5, cursor: "pointer", fontFamily: "'Work Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
            <Edit2 size={16} /> Edit this order
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ T, label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 13 }}>
      <span style={{ color: T.inkFaint, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.ink, fontFamily: mono ? "monospace" : "'Work Sans', sans-serif", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}
