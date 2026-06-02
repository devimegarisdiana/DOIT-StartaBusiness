import type { BoardColor } from "../hooks/useRoom";

export const AREA_COLORS: Record<BoardColor, { hex: string; label: string; glow: string; bg: string; text: string; border: string }> = {
  merah:  { hex: "#ef4444", label: "Merah",  glow: "#ef4444", bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/40" },
  biru:   { hex: "#3b82f6", label: "Biru",   glow: "#3b82f6", bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/40" },
  kuning: { hex: "#eab308", label: "Kuning", glow: "#eab308", bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" },
  hijau:  { hex: "#22c55e", label: "Hijau",  glow: "#22c55e", bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/40" },
};

export const BOARD_COLORS: BoardColor[] = ["merah", "biru", "kuning", "hijau"];

export function areaColor(area: BoardColor) { return AREA_COLORS[area]; }
