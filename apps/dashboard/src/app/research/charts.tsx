"use client";

import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

// ── World Cup Price Cycle Chart ──
const wcCycleData = [
  { year: "2013", ronaldo: 50, messi: 80, avg: 30 },
  { year: "2014 WC", ronaldo: 180, messi: 280, avg: 120 },
  { year: "2015", ronaldo: 120, messi: 200, avg: 70 },
  { year: "2016", ronaldo: 100, messi: 150, avg: 55 },
  { year: "2017", ronaldo: 90, messi: 130, avg: 50 },
  { year: "2018 WC", ronaldo: 250, messi: 300, avg: 180 },
  { year: "2019", ronaldo: 180, messi: 220, avg: 100 },
  { year: "2020", ronaldo: 350, messi: 500, avg: 280 },
  { year: "2021 Peak", ronaldo: 600, messi: 900, avg: 450 },
  { year: "2022 WC", ronaldo: 400, messi: 800, avg: 320 },
  { year: "2023", ronaldo: 280, messi: 350, avg: 180 },
  { year: "2024", ronaldo: 300, messi: 320, avg: 200 },
  { year: "2025", ronaldo: 350, messi: 380, avg: 250 },
  { year: "2026 WC", ronaldo: 550, messi: 600, avg: 400 },
];

export function WorldCupCycleChart() {
  return (
    <div>
      <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        World Cup Price Cycles — Indexed Card Values (2013-2026)
      </h4>
      <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
        Base index = 100 at 2014 release. Shows how WC tournaments spike prices 200-300%, followed by 40-50% pullback.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={wcCycleData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="gradMessi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradRonaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAvg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd5" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#5c5c70" }} />
          <YAxis tick={{ fontSize: 10, fill: "#5c5c70" }} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2ddd5", borderRadius: "8px", fontSize: "0.7rem" }}
          />
          <Legend wrapperStyle={{ fontSize: "0.65rem" }} />
          <Area type="monotone" dataKey="messi" name="Messi" stroke="#7c3aed" fill="url(#gradMessi)" strokeWidth={2} />
          <Area type="monotone" dataKey="ronaldo" name="Ronaldo" stroke="#dc2626" fill="url(#gradRonaldo)" strokeWidth={2} />
          <Area type="monotone" dataKey="avg" name="Market Avg" stroke="#2563eb" fill="url(#gradAvg)" strokeWidth={1.5} strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Player Age vs Card Value Curve ──
const ageValueData = [
  { age: 17, rising: 15, peak: 0, legacy: 0 },
  { age: 18, rising: 35, peak: 0, legacy: 0 },
  { age: 19, rising: 55, peak: 0, legacy: 0 },
  { age: 20, rising: 70, peak: 0, legacy: 0 },
  { age: 21, rising: 80, peak: 0, legacy: 0 },
  { age: 22, rising: 85, peak: 0, legacy: 0 },
  { age: 23, rising: 90, peak: 90, legacy: 0 },
  { age: 24, rising: 0, peak: 95, legacy: 0 },
  { age: 25, rising: 0, peak: 100, legacy: 0 },
  { age: 26, rising: 0, peak: 100, legacy: 0 },
  { age: 27, rising: 0, peak: 98, legacy: 0 },
  { age: 28, rising: 0, peak: 95, legacy: 0 },
  { age: 29, rising: 0, peak: 88, legacy: 0 },
  { age: 30, rising: 0, peak: 80, legacy: 80 },
  { age: 31, rising: 0, peak: 0, legacy: 70 },
  { age: 32, rising: 0, peak: 0, legacy: 55 },
  { age: 33, rising: 0, peak: 0, legacy: 45 },
  { age: 34, rising: 0, peak: 0, legacy: 40 },
  { age: 35, rising: 0, peak: 0, legacy: 50 },
  { age: 36, rising: 0, peak: 0, legacy: 55 },
  { age: 37, rising: 0, peak: 0, legacy: 65 },
  { age: 38, rising: 0, peak: 0, legacy: 80 },
  { age: 39, rising: 0, peak: 0, legacy: 100 },
  { age: 40, rising: 0, peak: 0, legacy: 120 },
  { age: 41, rising: 0, peak: 0, legacy: 140 },
];

export function AgeValueCurve() {
  return (
    <div>
      <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Player Age vs Card Value — Lifecycle Model
      </h4>
      <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
        GOAT-tier players see "retirement premium" — cards spike at career end. Non-GOATs decline after 30.
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={ageValueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd5" />
          <XAxis dataKey="age" tick={{ fontSize: 10, fill: "#5c5c70" }} label={{ value: "Player Age", position: "insideBottom", offset: -2, fontSize: 10, fill: "#9b9bab" }} />
          <YAxis tick={{ fontSize: 10, fill: "#5c5c70" }} label={{ value: "Card Value Index", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9b9bab" }} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2ddd5", borderRadius: "8px", fontSize: "0.7rem" }} />
          <Legend wrapperStyle={{ fontSize: "0.65rem" }} />
          <Area type="monotone" dataKey="rising" name="Rising Stars" stroke="#0d9f4f" fill="#0d9f4f" fillOpacity={0.15} strokeWidth={2.5} />
          <Area type="monotone" dataKey="peak" name="Peak Years" stroke="#c77d15" fill="#c77d15" fillOpacity={0.15} strokeWidth={2.5} />
          <Area type="monotone" dataKey="legacy" name="GOAT Legacy" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Rookie Comparison Radar ──
const rookieRadarData = [
  { metric: "Goals", yamal: 95, karl: 60, nwaneri: 40, paz: 80, kroupi: 25 },
  { metric: "Assists", yamal: 75, karl: 55, nwaneri: 30, paz: 55, kroupi: 15 },
  { metric: "Rating", yamal: 95, karl: 75, nwaneri: 70, paz: 85, kroupi: 55 },
  { metric: "Hype", yamal: 100, karl: 70, nwaneri: 55, paz: 50, kroupi: 30 },
  { metric: "Card Value", yamal: 100, karl: 40, nwaneri: 25, paz: 35, kroupi: 10 },
  { metric: "Upside", yamal: 50, karl: 95, nwaneri: 90, paz: 85, kroupi: 95 },
];

export function RookieRadar() {
  return (
    <div>
      <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Rookie Comparison — Stats vs Card Value vs Upside
      </h4>
      <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
        Best buys = high upside + low current card value. Karl, Nwaneri, Kroupi show biggest gap.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={rookieRadarData}>
          <PolarGrid stroke="#e2ddd5" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#5c5c70" }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: "#9b9bab" }} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2ddd5", borderRadius: "8px", fontSize: "0.7rem" }} />
          <Legend wrapperStyle={{ fontSize: "0.6rem" }} />
          <Radar name="Yamal" dataKey="yamal" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2} />
          <Radar name="Karl" dataKey="karl" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} strokeWidth={2} />
          <Radar name="Nwaneri" dataKey="nwaneri" stroke="#0d9f4f" fill="#0d9f4f" fillOpacity={0.1} strokeWidth={2} />
          <Radar name="Paz" dataKey="paz" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
          <Radar name="Kroupi" dataKey="kroupi" stroke="#c77d15" fill="#c77d15" fillOpacity={0.1} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Market Boom/Crash/Recovery Timeline ──
const marketCycleData = [
  { period: "2019", volume: 80, avgPrice: 60 },
  { period: "2020 COVID", volume: 250, avgPrice: 180 },
  { period: "2021 Peak", volume: 450, avgPrice: 350 },
  { period: "2022 Crash", volume: 280, avgPrice: 180 },
  { period: "2023 Bottom", volume: 190, avgPrice: 130 },
  { period: "2024 Recovery", volume: 231, avgPrice: 160 },
  { period: "2025", volume: 280, avgPrice: 200 },
  { period: "2026 WC", volume: 400, avgPrice: 300 },
];

export function MarketCycleChart() {
  return (
    <div>
      <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Sports Card Market Cycle — Volume vs Prices (2019-2026)
      </h4>
      <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
        Volume recovered but individual card prices still 40% below 2021 peak. Soccer outperforming other sports.
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={marketCycleData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd5" />
          <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#5c5c70" }} />
          <YAxis tick={{ fontSize: 10, fill: "#5c5c70" }} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2ddd5", borderRadius: "8px", fontSize: "0.7rem" }} />
          <Legend wrapperStyle={{ fontSize: "0.65rem" }} />
          <Bar dataKey="volume" name="Sales Volume ($M/mo)" radius={[4, 4, 0, 0]}>
            {marketCycleData.map((entry, i) => (
              <Cell key={i} fill={entry.period.includes("Peak") ? "#dc2626" : entry.period.includes("Crash") || entry.period.includes("Bottom") ? "#9b9bab" : "#2563eb"} fillOpacity={0.7} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="avgPrice" name="Avg Card Price Index" stroke="#0d9f4f" strokeWidth={2.5} dot={{ r: 4, fill: "#0d9f4f" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Player Price Direction Bars ──
const playerDirectionData = [
  { player: "Yamal", direction: 85, color: "#0d9f4f" },
  { player: "Karl", direction: 75, color: "#0d9f4f" },
  { player: "Paz", direction: 70, color: "#0d9f4f" },
  { player: "Nwaneri", direction: 65, color: "#0d9f4f" },
  { player: "Lacey", direction: 55, color: "#0d9f4f" },
  { player: "Mainoo", direction: 30, color: "#c77d15" },
  { player: "Haaland", direction: 40, color: "#0d9f4f" },
  { player: "Mbappe", direction: 10, color: "#9b9bab" },
  { player: "Messi", direction: 60, color: "#7c3aed" },
  { player: "Ronaldo", direction: 55, color: "#7c3aed" },
  { player: "Endrick", direction: -20, color: "#dc2626" },
  { player: "Gyokeres", direction: -15, color: "#dc2626" },
];

export function PlayerDirectionChart() {
  return (
    <div>
      <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Card Price Momentum — Next 6 Months
      </h4>
      <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
        Positive = prices expected to rise. Negative = sell window. Based on form, World Cup, transfers, age.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={playerDirectionData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd5" horizontal={false} />
          <XAxis type="number" domain={[-30, 100]} tick={{ fontSize: 10, fill: "#5c5c70" }} />
          <YAxis type="category" dataKey="player" tick={{ fontSize: 11, fill: "#1a1a2e", fontWeight: 600 }} width={65} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2ddd5", borderRadius: "8px", fontSize: "0.7rem" }} />
          <Bar dataKey="direction" name="Momentum Score" radius={[0, 4, 4, 0]}>
            {playerDirectionData.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
