/**
 * Player avatar — uses colored initials, never breaks.
 * Colors are deterministic based on player name hash.
 */

const colors = [
  "#e53238", "#0d9f4f", "#2563eb", "#7c3aed", "#c77d15",
  "#dc2626", "#0a4d8c", "#059669", "#7c2d12", "#4338ca",
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
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        letterSpacing: "-0.02em",
      }}
    >
      {initials}
    </div>
  );
}
