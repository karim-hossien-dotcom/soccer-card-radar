/**
 * Player avatar — uses colored initials, never breaks.
 * Colors are deterministic based on player name hash.
 */

const colors = [
  "#10b981", "#f59e0b", "#ef4444", "#a78bfa", "#58a6ff",
  "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#6366f1",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function PlayerAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const bg = getColor(name);
  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        letterSpacing: "-0.02em",
        boxShadow: `0 0 0 2px rgba(0,0,0,0.3)`,
      }}
    >
      {initials}
    </div>
  );
}
