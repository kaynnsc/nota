import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

function formatIDR(n) {
  const num = Number(n) || 0;
  return `Rp ${num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function Charts({ T, last7DaysChart, appDistribution }) {
  return (
    <>
      <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "16px 12px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.inkMuted, padding: "0 8px 8px" }}>Profit — last 7 days</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={last7DaysChart}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.inkFaint }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(v) => formatIDR(v)}
              contentStyle={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: T.ink }}
            />
            <Bar dataKey="profit" fill={T.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {appDistribution.length > 0 && (
        <div style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "16px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={appDistribution} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50} paddingAngle={2}>
                {appDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.inkMuted, marginBottom: 2 }}>Orders by app</div>
            {appDistribution.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <span style={{ color: T.ink }}>{d.name}</span>
                <span style={{ color: T.inkFaint, marginLeft: "auto" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
