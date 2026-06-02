import { useState } from "react";
import { useLocation } from "wouter";
import type { BoardColor } from "../hooks/useRoom";
import { useRoom } from "../hooks/useRoom";
import { AREA_COLORS, BOARD_COLORS } from "../lib/colors";

type Tab = "create" | "join";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { createRoom, joinRoom } = useRoom(null);
  const [tab, setTab] = useState<Tab>("create");
  const [name, setName] = useState("");
  const [color, setColor] = useState<BoardColor>("merah");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [modalAwal, setModalAwal] = useState(10);
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { setErr("Masukkan nama pemain"); return; }
    setErr(""); setLoading(true);
    try {
      const { code, playerId } = await createRoom(name.trim(), color, maxPlayers, modalAwal);
      localStorage.setItem("doit3d_playerId", playerId);
      localStorage.setItem("doit3d_playerName", name.trim());
      setLocation(`/game/${code}`);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!name.trim()) { setErr("Masukkan nama pemain"); return; }
    if (!joinCode.trim()) { setErr("Masukkan kode room"); return; }
    setErr(""); setLoading(true);
    try {
      const { playerId, code } = await joinRoom(joinCode.trim().toUpperCase(), name.trim(), color);
      localStorage.setItem("doit3d_playerId", playerId);
      localStorage.setItem("doit3d_playerName", name.trim());
      setLocation(`/game/${code}`);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10 animate-slideup">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <span className="text-lg">🎲</span>
          </div>
          <div>
            <div className="font-['Orbitron'] font-bold text-lg text-white tracking-wide leading-tight">DO IT</div>
            <div className="text-xs text-muted-foreground">Board Game Online · 3D Edition</div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-white leading-tight">Mulai Berwirausaha</h1>
        <p className="text-muted-foreground mt-1.5 text-sm max-w-xs mx-auto">
          Bangun kafe, kelola keuangan, &amp; raih skor KAP tertinggi bersama teman!
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass rounded-2xl overflow-hidden shadow-2xl animate-slideup" style={{ animationDelay: "0.1s" }}>
        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {(["create", "join"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setErr(""); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "text-white border-b-2 border-primary bg-primary/8"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {t === "create" ? "🏗️ Buat Room" : "🔗 Gabung Room"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* Common: Name */}
          <div>
            <label className="hud-label block mb-1.5">Nama Pemain</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
              placeholder="Masukkan namamu..."
              maxLength={24}
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-primary/5 transition-all"
            />
          </div>

          {/* Join: Code */}
          {tab === "join" && (
            <div>
              <label className="hud-label block mb-1.5">Kode Room</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
                placeholder="XXXX"
                maxLength={4}
                className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-primary/5 transition-all font-['Orbitron'] tracking-widest text-center uppercase"
              />
            </div>
          )}

          {/* Color picker */}
          <div>
            <label className="hud-label block mb-2">Warna Area</label>
            <div className="grid grid-cols-4 gap-2">
              {BOARD_COLORS.map(c => {
                const info = AREA_COLORS[c];
                const active = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`relative rounded-xl py-3 text-xs font-bold transition-all ${
                      active ? "ring-2 ring-white/60 scale-105 shadow-lg" : "opacity-60 hover:opacity-90"
                    }`}
                    style={{
                      backgroundColor: `${info.hex}22`,
                      borderColor: active ? info.hex : "transparent",
                      border: `1.5px solid ${active ? info.hex : "rgba(255,255,255,0.08)"}`,
                      color: info.hex,
                    }}
                  >
                    <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: info.hex }} />
                    {info.label}
                    {active && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create-only options */}
          {tab === "create" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="hud-label block mb-1.5">Maks Pemain</label>
                <select
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                  className="w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60"
                >
                  {[2,3,4].map(n => <option key={n} value={n}>{n} Pemain</option>)}
                </select>
              </div>
              <div>
                <label className="hud-label block mb-1.5">Modal Awal (Rp.)</label>
                <select
                  value={modalAwal}
                  onChange={e => setModalAwal(Number(e.target.value))}
                  className="w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60"
                >
                  {[5,10,15,20].map(n => <option key={n} value={n}>Rp.{n}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Error */}
          {err && (
            <div className="flex items-center gap-2 bg-destructive/15 border border-destructive/30 rounded-xl px-3 py-2.5 text-sm text-red-400">
              <span>⚠️</span> {err}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={tab === "create" ? handleCreate : handleJoin}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-1"
            style={{
              background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(271 76% 65%))",
              boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
              color: "#fff",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                </svg>
                Loading...
              </span>
            ) : tab === "create" ? "🏗️ Buat Room" : "🚀 Gabung!"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground opacity-60 animate-slideup" style={{ animationDelay: "0.2s" }}>
        POLINEMA × Comic Cafe · UI Pack by DMAFORGE
      </p>
    </div>
  );
}
