import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ShoppingCart, ShieldCheck, Wallet, TrendingUp, AlertTriangle, Search, ChevronRight } from "lucide-react";

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
      .sort((a, b) => a.w.daysLeft - b.w.daysLeft)
      .slice(0, 8);
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
      {/* 1. SEARCH BAR */}
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

      {/* 2. ACTIVE WARRANTY & ITS RECTANGLE BOX */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 8px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, textTransform: "uppercase", letterSpacing: 0.5 }}>Active Warranty</span>
          <ChevronRight size={16} color={T.ink} />
        </div>
        {/* The large box below Active Warranty */}
        <button 
          onClick={() => onNavigate({ type: "warranty" })}
          style={{ width: "100%", background: T.bgElevated, border: `1px solid ${T.inkMuted}`, borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 8, background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", color: T.positive }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Fraunces', serif", color: T.ink }}>{stats.activeWarranty}</div>
            <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 500 }}>Active & Lifetime Plans</div>
          </div>
        </button>
      </div>

      {/* 3. THE FOUR BOXES (INSIDE A WHITE BOUNDING BOX) */}
      <div style={{ background: T.bgElevated, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${T.cardBorder}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Using T.card for the inner boxes to match the grey fill in your mockup */}
          <StatCard T={T} icon={<ShoppingCart size={18} />} label="Total orders" value={stats.totalOrders} color={T.accent} onClick={() => onNavigate(null)} />
          <StatCard T={T} icon={<Wallet size={18} />} label="Total profit" value={formatIDR(stats.totalProfit)} color={T.positive} onClick={() => onNavigate(null)} />
          <StatCard T={T} icon={<Wallet size={18} />} label="Today's profit" value={formatIDR(stats.todaysProfit)} color={T.accent} onClick={() => onNavigate({ type: "today" })} />
          <StatCard T={T} icon={<TrendingUp size={18} />} label="Monthly profit" value={formatIDR(stats.monthlyProfit)} color={T.positive} onClick={() => onNavigate({ type: "month" })} />
        </div>
      </div>

      {/* 4. ROUND DIAGRAM (PIE CHART) - MOVED BELOW THE 4 BOXES */}
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

      {/* 5. BAR CHART */}
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

      {/* 6. REMINDERS */}
      {reminders.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.negative, display: "flex", alignItems: "center", gap: 6, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <AlertTriangle size={14} /> Needs attention ({reminders.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {reminders.map(({ o, w }) => (
              <div
                key={o.id}
                onClick={() => onNavigate({ type: "search", query: o.customer })}
                style={{ background: T.dangerSoft, border: `1px solid ${T.negative}33`, borderRadius: 12, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{o.customer}</div>
                  <div style={{ fontSize: 11.5, color: T.inkMuted }}>{settings.apps.find((a) => a.id === o.appId)?.label || "—"}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.negative, whiteSpace: "nowrap" }}>
                  {w.status === "expired" ? `Expired ${Math.abs(w.daysLeft)}d ago` : w.daysLeft === 0 ? "Expires today" : `${w.daysLeft}d left`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: T.inkFaint, textAlign: "center", padding: "8px 0 20px" }}>
        All totals above are calculated automatically from your order list.
      </div>
    </div>
  );
}

// Updated StatCard: Now flat (no border) and using T.card background to mimic the mockup's inner boxes
function StatCard({ T, icon, label, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: T.card, border: "none", borderRadius: 12, padding: 14, cursor: onClick ? "pointer" : "default", textAlign: "left", fontFamily: "'Work Sans', sans-serif" }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bgElevated, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 8, border: `1px solid ${T.cardBorder}` }}>
        {icon}
      </div>
      <div style={{ fontSize: 11.5, color: T.inkMuted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Fraunces', serif", color: T.ink, marginTop: 2 }}>{value}</div>
    </button>
  );
}
