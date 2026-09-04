import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ShoppingCart, ShieldCheck, Wallet, TrendingUp, Search, ChevronRight, X, AlertTriangle } from "lucide-react";

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
  const [viewingOrder, setViewingOrder] = useState(null); // Controls the read-only modal

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
      {/* SEARCH BAR */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 999, padding: "10px 16px", marginBottom: 16 }}>
        <Search size={16} color={T.inkFaint} />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search orders, customers"
          style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, color: T.ink, fontFamily: "'Work Sans', sans-serif" }}
        />
      </div>

      {/* ACTIVE WARRANTY (Needs Attention) */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 8px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, textTransform: "uppercase", letterSpacing: 0.5 }}>Active Warranty</span>
          <button onClick={() => onNavigate({ type: "warranty" })} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
            View all
          </button>
        </div>
        
        <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {reminders.length === 0 ? (
            <div style={{ textAlign: "center", fontSize: 12, color: T.inkFaint, padding: "12px 0" }}>
              All warranties are healthy.
            </div>
          ) : (
            reminders.slice(0, 3).map(({ o, w }) => (
              <div
                key={o.id}
                onClick={() => setViewingOrder(o)}
                style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{o.customer}</div>
                  <div style={{ fontSize: 11.5, color: T.inkMuted }}>{settings.apps.find((a) => a.id === o.appId)?.label || "—"}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.negative, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={12} />
                  {w.status === "expired" ? `Expired ${Math.abs(w.daysLeft)}d ago` : w.daysLeft === 0 ? "Expires today" : `${w.daysLeft}d left`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4 STAT BOXES (Unclickable, matching the provided screenshot) */}
      <div style={{ background: T.bgElevated, borderRadius: 16, padding: "18px 16px", marginBottom: 16, border: `1px solid ${T.cardBorder}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <StatCard T={T} icon={<ShoppingCart size={16} />} label="Total orders" value={stats.totalOrders} color={T.accent} />
          <StatCard T={T} icon={<Wallet size={16} />} label="Total profit" value={formatIDR(stats.totalProfit)} color={T.positive} />
          <StatCard T={T} icon={<Wallet size={16} />} label="Today's profit" value={formatIDR(stats.todaysProfit)} color={T.accent} />
          <StatCard T={T} icon={<TrendingUp size={16} />} label="Monthly profit" value={formatIDR(stats.monthlyProfit)} color={T.positive} />
        </div>
      </div>

      {/* ROUND DIAGRAM (PIE CHART) */}
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

      {/* READ-ONLY VIEW MODAL */}
      {viewingOrder && (
        <OrderViewModal T={T} order={viewingOrder} settings={settings} onClose={() => setViewingOrder(null)} />
      )}
    </div>
  );
}

// Flat, unclickable stat layout matching the provided image
function StatCard({ T, icon, label, value, color }) {
  return (
    <div style={{ textAlign: "left", fontFamily: "'Work Sans', sans-serif" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 10 }}>
        {icon}
      </div>
      <div style={{ fontSize: 11.5, color: T.inkMuted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Fraunces', serif", color: T.ink, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// Simple read-only modal for viewing order details
function OrderViewModal({ T, order, settings, onClose }) {
  const app = settings.apps.find((a) => a.id === order.appId)?.label || "Unknown App";
  const plan = settings.plans.find((p) => p.id === order.planId)?.label || "—";
  const platform = settings.platforms.find((p) => p.id === order.platformId)?.label || "—";
  const duration = settings.durations.find((d) => d.id === order.durationId)?.label || "—";

  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg, borderRadius: "16px 16px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: 0, fontWeight: 600 }}>Order Details</h3>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 5, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", color: T.inkMuted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ViewField T={T} label="Customer">{order.customer}</ViewField>
          <ViewField T={T} label="Platform">{platform}</ViewField>
          <ViewField T={T} label="App & Plan">{app} — {plan} ({duration})</ViewField>
          <ViewField T={T} label="Account Data">{order.account}</ViewField>
          <ViewField T={T} label="Password">{order.password}</ViewField>
          <ViewField T={T} label="Contact">{order.contact || "—"}</ViewField>
          <ViewField T={T} label="Notes">{order.notes || "—"}</ViewField>
        </div>
      </div>
    </div>
  );
}

function ViewField({ T, label, children }) {
  return (
    <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 500 }}>{children}</div>
    </div>
  );
}
