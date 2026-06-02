import type { Room, Player, CafeSlot, BoardColor, MenuItem } from "../hooks/useRoom";
import { AREA_COLORS } from "../lib/colors";
import { useState } from "react";

interface Props {
  room: Room;
  myId: string;
  selectedCafe: CafeSlot | null;
  onCafeSetup: (name: string, menuItems: MenuItem[], seats: number) => void;
  onCsr: (amount: number | null) => void;
  onAction: (body: Record<string, unknown>) => void;
}

const MENU_LABELS: Record<string, string> = {
  kopi: "☕ Kopi", teh: "🍵 Teh", kue: "🍰 Kue", croissant: "🥐 Croissant",
};
const DEFAULT_PRICES: Record<string, number> = { kopi: 3, teh: 2, kue: 4, croissant: 5 };

function PhaseTag({ phase }: { phase: string }) {
  const map: Record<string, { label: string; color: string }> = {
    cafe_setup: { label: "Setup Kafe", color: "#fbbf24" },
    csr: { label: "CSR", color: "#a78bfa" },
    operational: { label: "Operasional", color: "#34d399" },
    lembur_offer: { label: "Tawaran Lembur", color: "#f97316" },
    customer_input: { label: "Input Pelanggan", color: "#60a5fa" },
    revenue: { label: "Pendapatan", color: "#34d399" },
    end_game_sell: { label: "Akhir Permainan", color: "#f43f5e" },
    finished: { label: "Selesai!", color: "#fbbf24" },
  };
  const info = map[phase] || { label: phase, color: "#888" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${info.color}22`, color: info.color, border: `1px solid ${info.color}44` }}>
      {info.label}
    </span>
  );
}

function PlayerCard({ player, isMe, isTurn }: { player: Player; isMe: boolean; isTurn: boolean }) {
  const col = AREA_COLORS[player.boardColor];
  return (
    <div className={`relative glass rounded-xl p-2.5 transition-all ${isTurn ? "ring-2" : ""}`} style={isTurn ? { ringColor: col.hex } as React.CSSProperties : {}}>
      {isTurn && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: col.hex }} />
      )}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: col.hex }} />
        <span className="text-xs font-semibold text-white truncate flex-1">{player.name}</span>
        {isMe && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Kamu</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <div>
          <div className="hud-label">Uang</div>
          <div className="text-xs font-bold text-white">Rp.{player.money}</div>
        </div>
        <div>
          <div className="hud-label">KAP</div>
          <div className="text-xs font-bold" style={{ color: "#fbbf24" }}>{player.kapScore}</div>
        </div>
        {player.hutang > 0 && (
          <div className="col-span-2">
            <div className="hud-label">Hutang</div>
            <div className="text-xs font-bold text-red-400">Rp.{player.hutang}</div>
          </div>
        )}
      </div>
      {/* KAP bars */}
      <div className="mt-2 space-y-0.5">
        {(["kreativitas","socialNetworking","internalLocus"] as (keyof typeof player.kap)[]).map(k => (
          <div key={k} className="flex items-center gap-1">
            <div className="hud-label w-10 truncate">{k === "kreativitas" ? "Kreat" : k === "socialNetworking" ? "Social" : "Locus"}</div>
            <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(player.kap[k] / 7) * 100}%`, backgroundColor: col.hex }} />
            </div>
            <div className="text-[9px] text-white/50 w-3">{player.kap[k]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CafeSetupPanel({ cafe, onSubmit }: {
  cafe: CafeSlot;
  onSubmit: (name: string, items: MenuItem[], seats: number) => void;
}) {
  const [cafeName, setCafeName] = useState("Kafe Saya");
  const [seats, setSeats] = useState(2);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([{ type: "kopi", count: 1, price: 3 }]);

  function toggleMenu(type: string) {
    if (menuItems.find(m => m.type === type)) {
      setMenuItems(menuItems.filter(m => m.type !== type));
    } else {
      setMenuItems([...menuItems, { type, count: 1, price: DEFAULT_PRICES[type] || 3 }]);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 max-w-xs">
      <div className="text-sm font-bold text-white">⚙️ Setup Kafe Awal</div>
      <div>
        <label className="hud-label">Nama Kafe</label>
        <input value={cafeName} onChange={e => setCafeName(e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-xs text-white mt-1" />
      </div>
      <div>
        <label className="hud-label mb-1.5 block">Menu</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MENU_LABELS).map(([type, label]) => {
            const active = menuItems.some(m => m.type === type);
            return (
              <button key={type} onClick={() => toggleMenu(type)} className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${active ? "border-primary bg-primary/20 text-primary" : "border-white/10 text-white/50"}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="hud-label">Tempat Duduk: {seats}</label>
        <input type="range" min={1} max={8} value={seats} onChange={e => setSeats(Number(e.target.value))} className="w-full mt-1 accent-primary" />
      </div>
      <button
        onClick={() => onSubmit(cafeName, menuItems, seats)}
        className="w-full py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition"
      >
        Konfirmasi Setup
      </button>
      <div className="text-[10px] text-muted-foreground">Cafe: {cafe.name} (Slot {cafe.slotIndex})</div>
    </div>
  );
}

function CsrPanel({ onSubmit }: { onSubmit: (amount: number | null) => void }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-2 max-w-xs">
      <div className="text-sm font-bold text-white">🌿 CSR — Tanggung Jawab Sosial</div>
      <div className="text-xs text-muted-foreground">Pilih donasi CSR kamu di ronde ini</div>
      <div className="flex flex-col gap-2 mt-2">
        <button onClick={() => onSubmit(4)} className="w-full py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition">
          Rp.4 → +1 KAP Sosial
        </button>
        <button onClick={() => onSubmit(7)} className="w-full py-2 rounded-xl bg-purple-600/20 border border-purple-600/40 text-purple-200 text-xs font-bold hover:bg-purple-600/30 transition">
          Rp.7 → +2 KAP Sosial
        </button>
        <button onClick={() => onSubmit(null)} className="w-full py-2 rounded-xl bg-white/6 border border-white/10 text-white/50 text-xs hover:bg-white/10 transition">
          Lewati (tidak berdonasi)
        </button>
      </div>
    </div>
  );
}

function ActionPanel({ room, myPlayer, onAction }: { room: Room; myPlayer: Player; onAction: (body: Record<string, unknown>) => void }) {
  const [action, setAction] = useState<"upgrade"|"social"|"expand"|null>(null);
  const myCafes = room.cafes.filter(c => c.ownerId === myPlayer.id);
  const [selCafe, setSelCafe] = useState(myCafes[0]?.id || "");
  const [selArea, setSelArea] = useState<BoardColor>("merah");
  const [upgradeType, setUpgradeType] = useState("add_menu");
  const [menuType, setMenuType] = useState("kopi");
  const [bidType, setBidType] = useState<"open_bid"|"buyout">("buyout");
  const [expandArea, setExpandArea] = useState<BoardColor>("merah");
  const [bidPrice, setBidPrice] = useState(3);
  const areas: BoardColor[] = ["merah","biru","kuning","hijau"];

  function submit() {
    if (!action) return;
    if (action === "upgrade") {
      onAction({ playerId: myPlayer.id, action, cafeId: selCafe, upgradeType, menuType });
    } else if (action === "social") {
      onAction({ playerId: myPlayer.id, action, area: selArea });
    } else if (action === "expand") {
      onAction({
        playerId: myPlayer.id, action, bidType,
        expandSpecs: { area: expandArea, bidPrice, menuItems: [{ type: "kopi", count: 1, price: 3 }], seats: 2 },
      });
    }
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 max-w-xs">
      <div className="text-sm font-bold text-white">⚡ Pilih Aksi</div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { id: "upgrade", icon: "🔧", label: "Upgrade" },
          { id: "social", icon: "🤝", label: "Sosial" },
          { id: "expand", icon: "🏗️", label: "Expand" },
        ].map(a => (
          <button
            key={a.id}
            onClick={() => setAction(a.id as "upgrade"|"social"|"expand")}
            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${action === a.id ? "border-primary bg-primary/20 text-white" : "border-white/10 text-white/50 hover:text-white"}`}
          >
            <div>{a.icon}</div>{a.label}
          </button>
        ))}
      </div>

      {action === "upgrade" && (
        <div className="space-y-2">
          <div>
            <label className="hud-label">Cafe Milikmu</label>
            <select value={selCafe} onChange={e => setSelCafe(e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white mt-1">
              {myCafes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="hud-label">Tipe Upgrade</label>
            <select value={upgradeType} onChange={e => setUpgradeType(e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white mt-1">
              <option value="add_menu">Tambah Menu</option>
              <option value="raise_price">Naikkan Harga</option>
              <option value="add_seats">Tambah Kursi</option>
            </select>
          </div>
          {(upgradeType === "add_menu" || upgradeType === "raise_price") && (
            <div>
              <label className="hud-label">Menu</label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {Object.entries(MENU_LABELS).map(([t, l]) => (
                  <button key={t} onClick={() => setMenuType(t)} className={`text-[10px] px-1.5 py-1 rounded-lg border transition-all ${menuType === t ? "border-primary/60 bg-primary/20 text-white" : "border-white/8 text-white/40"}`}>{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {action === "social" && (
        <div>
          <label className="hud-label">Pilih Area</label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {areas.map(a => {
              const col = AREA_COLORS[a];
              return (
                <button key={a} onClick={() => setSelArea(a)} className={`text-xs py-1.5 rounded-lg border transition-all ${selArea === a ? "text-white" : "text-white/40"}`} style={selArea === a ? { borderColor: col.hex, backgroundColor: `${col.hex}22` } : { borderColor: "rgba(255,255,255,0.08)" }}>
                  {col.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">Biaya: Rp.{myPlayer.kap.socialNetworking + 1}</div>
        </div>
      )}

      {action === "expand" && (
        <div className="space-y-2">
          <div>
            <label className="hud-label">Area Ekspansi</label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {areas.map(a => {
                const col = AREA_COLORS[a];
                return (
                  <button key={a} onClick={() => setExpandArea(a)} className={`text-xs py-1.5 rounded-lg border transition-all ${expandArea === a ? "text-white" : "text-white/40"}`} style={expandArea === a ? { borderColor: col.hex, backgroundColor: `${col.hex}22` } : { borderColor: "rgba(255,255,255,0.08)" }}>
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="hud-label">Tipe Pembelian</label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button onClick={() => setBidType("buyout")} className={`text-xs py-1.5 rounded-lg border transition-all ${bidType === "buyout" ? "border-primary/60 bg-primary/20 text-white" : "border-white/8 text-white/40"}`}>Buy Out</button>
              <button onClick={() => setBidType("open_bid")} className={`text-xs py-1.5 rounded-lg border transition-all ${bidType === "open_bid" ? "border-primary/60 bg-primary/20 text-white" : "border-white/8 text-white/40"}`}>Open Bid</button>
            </div>
          </div>
          <div>
            <label className="hud-label">Harga Bid: Rp.{bidPrice} (BuyOut: Rp.{bidPrice * 3})</label>
            <input type="range" min={1} max={10} value={bidPrice} onChange={e => setBidPrice(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>
      )}

      {action && (
        <button onClick={submit} className="w-full py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition">
          Konfirmasi Aksi
        </button>
      )}
    </div>
  );
}

export function HUD({ room, myId, selectedCafe, onCafeSetup, onCsr, onAction }: Props) {
  const myPlayer = room.players.find(p => p.id === myId);
  const isMyTurn = room.players[room.currentTurnIndex]?.id === myId;
  const [showAction, setShowAction] = useState(false);

  if (!myPlayer) return null;

  const needsCafeSetup = room.phase === "cafe_setup" && !myPlayer.cafeSetupDone;
  const needsCsr = room.phase === "csr" && !myPlayer.csrPaidThisRound;
  const canAct = room.phase === "operational" && isMyTurn;

  const myCafeForSetup = room.cafes.find(c => c.id === `${myPlayer.boardColor}-1` && !c.isSetup);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-3 py-2 flex items-center justify-between pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(10,15,30,0.9) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2">
          <div className="font-['Orbitron'] font-bold text-sm text-white">DO IT 3D</div>
          <PhaseTag phase={room.phase} />
        </div>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <span>Ronde {room.currentRonde}/4</span>
          <span>Put. {room.currentPutaran}/2</span>
          <span className="font-bold text-white">{room.code}</span>
        </div>
      </div>

      {/* Left side: Player list */}
      <div className="absolute top-12 left-2 space-y-1.5 pointer-events-auto w-44">
        {room.players.map((p, i) => (
          <PlayerCard key={p.id} player={p} isMe={p.id === myId} isTurn={i === room.currentTurnIndex} />
        ))}
      </div>

      {/* Right side: Action panels */}
      <div className="absolute top-12 right-2 pointer-events-auto">
        {needsCafeSetup && myCafeForSetup && (
          <CafeSetupPanel
            cafe={myCafeForSetup}
            onSubmit={(name, items, seats) => onCafeSetup(name, items, seats)}
          />
        )}
        {needsCsr && !needsCafeSetup && (
          <CsrPanel onSubmit={onCsr} />
        )}
        {canAct && !showAction && (
          <button
            onClick={() => setShowAction(true)}
            className="glass rounded-2xl px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition"
            style={{ border: "1px solid #3b82f644" }}
          >
            ⚡ Giliran kamu! Aksi?
          </button>
        )}
        {canAct && showAction && (
          <ActionPanel room={room} myPlayer={myPlayer} onAction={(body) => { onAction(body); setShowAction(false); }} />
        )}
      </div>

      {/* Bottom: Selected cafe info */}
      {selectedCafe && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass rounded-2xl px-4 py-2.5 pointer-events-auto flex items-center gap-4 text-xs text-white" style={{ minWidth: 280 }}>
          <div>
            <div className="hud-label">Kafe</div>
            <div className="font-bold">{selectedCafe.name}</div>
          </div>
          <div>
            <div className="hud-label">Kursi</div>
            <div className="font-bold">{selectedCafe.seats}</div>
          </div>
          <div>
            <div className="hud-label">Menu</div>
            <div className="font-bold">{selectedCafe.menuItems.length} jenis</div>
          </div>
          <div>
            <div className="hud-label">Pemilik</div>
            <div className="font-bold">{room.players.find(p => p.id === selectedCafe.ownerId)?.name || "—"}</div>
          </div>
          {selectedCafe.socialCustomers > 0 && (
            <div>
              <div className="hud-label">Tamu Sosial</div>
              <div className="font-bold text-yellow-400">+{selectedCafe.socialCustomers}</div>
            </div>
          )}
        </div>
      )}

      {/* Turn indicator banner */}
      {isMyTurn && room.phase === "operational" && !showAction && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-center animate-pulse">
            <div className="text-2xl font-['Orbitron'] font-black text-white/20 tracking-widest">GILIRAN MU</div>
          </div>
        </div>
      )}

      {/* Waiting */}
      {room.status === "waiting" && (
        <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none">
          <div className="glass rounded-2xl px-6 py-4 text-center pointer-events-auto">
            <div className="text-white font-bold text-sm mb-1">Menunggu pemain... ({room.players.length}/{room.maxPlayers})</div>
            <div className="text-[11px] text-muted-foreground mb-3">Kode: <span className="font-['Orbitron'] text-white font-bold tracking-widest">{room.code}</span></div>
            {myPlayer.isHost && (
              <div className="text-[10px] text-muted-foreground">
                Kembali ke app companion untuk mulai permainan
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game finished */}
      {room.status === "finished" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="glass rounded-3xl p-8 text-center max-w-sm w-full mx-4">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-xl font-black text-white mb-1">Permainan Selesai!</div>
            <div className="space-y-2 mt-4">
              {[...room.players].sort((a, b) => (b.finalKAP ?? b.kapScore) - (a.finalKAP ?? a.kapScore)).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 glass rounded-xl p-2.5">
                  <div className="text-lg">{["🥇","🥈","🥉","4️⃣"][i]}</div>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: AREA_COLORS[p.boardColor].hex }} />
                  <div className="flex-1 text-sm font-semibold text-white">{p.name}</div>
                  <div className="text-sm font-bold text-yellow-400">{p.finalKAP ?? p.kapScore} KAP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
