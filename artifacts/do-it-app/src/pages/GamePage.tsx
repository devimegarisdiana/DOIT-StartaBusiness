import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = "/api";

type RoomStatus = "waiting" | "playing" | "finished";

interface Transaction {
  id: string;
  keterangan: string;
  jumlah: number;
  tipe: "pemasukan" | "pengeluaran";
  waktu: string;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  transactions: Transaction[];
}

interface Room {
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  modalAwal: number;
  currentTurnIndex: number;
  status: RoomStatus;
}

type Phase = "lobby" | "create" | "join" | "waiting" | "playing" | "finished";

export default function GamePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("lobby");

  // Identity
  const [myId, setMyId] = useState("");
  const [room, setRoom] = useState<Room | null>(null);

  // Create form
  const [createName, setCreateName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [modalAwal, setModalAwal] = useState("500000");

  // Join form
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Transaction form
  const [showForm, setShowForm] = useState(false);
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tipe, setTipe] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Poll room state every 2.5s when in waiting/playing
  const pollRoom = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API}/rooms/${code}`);
      if (!res.ok) return;
      const data: Room = await res.json();
      setRoom(data);
      if (data.status === "playing") setPhase("playing");
      if (data.status === "finished") setPhase("finished");
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    if ((phase === "waiting" || phase === "playing") && room?.code) {
      const iv = setInterval(() => pollRoom(room.code), 2500);
      return () => clearInterval(iv);
    }
  }, [phase, room?.code, pollRoom]);

  function formatRp(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

  function getSaldo(player: Player, modal: number) {
    return player.transactions.reduce(
      (acc, tx) => acc + (tx.tipe === "pemasukan" ? tx.jumlah : -tx.jumlah),
      modal
    );
  }

  async function handleCreate() {
    if (!createName.trim()) return setErr("Nama tidak boleh kosong");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: createName.trim(), maxPlayers, modalAwal: parseInt(modalAwal) || 500000 }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error || "Gagal membuat room");
      setMyId(data.playerId);
      await pollRoom(data.code);
      setPhase("waiting");
    } catch { setErr("Gagal terhubung ke server"); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!joinName.trim()) return setErr("Nama tidak boleh kosong");
    if (!joinCode.trim()) return setErr("Kode room tidak boleh kosong");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/rooms/${joinCode.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error || "Gagal bergabung");
      setMyId(data.playerId);
      await pollRoom(joinCode.toUpperCase());
      setPhase("waiting");
    } catch { setErr("Gagal terhubung ke server"); }
    finally { setLoading(false); }
  }

  async function handleStart() {
    if (!room) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/rooms/${room.code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myId }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      await pollRoom(room.code);
      setPhase("playing");
    } finally { setLoading(false); }
  }

  async function handleAddTx() {
    if (!room || !keterangan.trim() || !jumlah) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/rooms/${room.code}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myId, keterangan, jumlah: parseInt(jumlah), tipe }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setKeterangan(""); setJumlah(""); setShowForm(false);
      await pollRoom(room.code);
    } finally { setLoading(false); }
  }

  async function handleDeleteTx(txId: string) {
    if (!room) return;
    await fetch(`${API}/rooms/${room.code}/transactions/${txId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: myId }),
    });
    await pollRoom(room.code);
  }

  async function handleNextTurn() {
    if (!room) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/rooms/${room.code}/next-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myId }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      await pollRoom(room.code);
      if (data.status === "finished") setPhase("finished");
    } finally { setLoading(false); }
  }

  // ── LOBBY ──
  if (phase === "lobby") {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
          <button onClick={() => navigate("/")} className="text-white text-2xl">‹</button>
          <div>
            <h1 className="text-white font-black text-lg">Mulai Game</h1>
            <p className="text-blue-300 text-xs">Buat atau gabung room permainan</p>
          </div>
          <span className="ml-auto text-3xl">🧮</span>
        </div>
        <div className="px-4 py-6 flex flex-col gap-4">
          {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
          <button onClick={() => { setErr(""); setPhase("create"); }}
            className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm text-left w-full active:scale-95 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "#e8f4ff" }}>🏠</div>
            <div>
              <h3 className="font-black text-gray-800 text-base">Buat Room Baru</h3>
              <p className="text-xs text-gray-400 mt-0.5">Jadi host, dapatkan kode room untuk dibagikan ke pemain lain</p>
            </div>
          </button>
          <button onClick={() => { setErr(""); setPhase("join"); }}
            className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm text-left w-full active:scale-95 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "#e8ffe8" }}>🚪</div>
            <div>
              <h3 className="font-black text-gray-800 text-base">Gabung Room</h3>
              <p className="text-xs text-gray-400 mt-0.5">Masukkan kode room dari host untuk bergabung</p>
            </div>
          </button>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h4 className="font-black text-gray-700 text-sm mb-2">📖 Cara Bermain</h4>
            <div className="flex flex-col gap-2">
              {[
                ["1", "#2478d4", "Host buat room, atur jumlah pemain (2–4) dan modal awal"],
                ["2", "#28a745", "Bagikan kode 4 huruf ke semua pemain"],
                ["3", "#f0a020", "Tiap pemain bergantian catat transaksi di giliran masing-masing"],
                ["4", "#9b59b6", "Lihat hasil keuangan semua tim di akhir game"],
              ].map(([n, c, t]) => (
                <div key={n} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5" style={{ background: c }}>
                    {n}
                  </div>
                  <p className="text-xs text-gray-500 leading-snug">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CREATE ROOM ──
  if (phase === "create") {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
          <button onClick={() => { setErr(""); setPhase("lobby"); }} className="text-white text-2xl">‹</button>
          <h1 className="text-white font-black text-lg">Buat Room</h1>
        </div>
        <div className="px-4 py-5 flex flex-col gap-4">
          {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 text-sm mb-2">Nama Kamu (Host)</h3>
            <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder="Masukkan namamu..."
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-400" />
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 text-sm mb-3">Jumlah Pemain</h3>
            <div className="flex gap-2">
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)}
                  className="flex-1 py-3 rounded-xl font-black text-lg transition-all"
                  style={{ background: maxPlayers === n ? "#1a3a6b" : "#f0f4ff", color: maxPlayers === n ? "#fff" : "#1a3a6b", border: maxPlayers === n ? "none" : "2px solid #d0dcf0" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 text-sm mb-1">Modal Awal per Pemain</h3>
            <p className="text-xs text-gray-400 mb-3">Sesuaikan dengan kartu modal dalam game</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {["250000","500000","750000","1000000"].map(v => (
                <button key={v} onClick={() => setModalAwal(v)}
                  className="px-3 py-2 rounded-xl font-bold text-xs transition-all"
                  style={{ background: modalAwal === v ? "#28a745" : "#f0f4ff", color: modalAwal === v ? "#fff" : "#28a745", border: modalAwal === v ? "none" : "2px solid #c8e8d0" }}>
                  {formatRp(parseInt(v))}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm font-semibold">Rp</span>
              <input type="number" value={modalAwal} onChange={e => setModalAwal(e.target.value)}
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-green-400"
                placeholder="Nominal lain..." />
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #1a3a6b, #2478d4)" }}>
            {loading ? "Membuat room..." : "🏠 Buat Room"}
          </button>
        </div>
      </div>
    );
  }

  // ── JOIN ROOM ──
  if (phase === "join") {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
          <button onClick={() => { setErr(""); setPhase("lobby"); }} className="text-white text-2xl">‹</button>
          <h1 className="text-white font-black text-lg">Gabung Room</h1>
        </div>
        <div className="px-4 py-5 flex flex-col gap-4">
          {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 text-sm mb-2">Namamu</h3>
            <input type="text" value={joinName} onChange={e => setJoinName(e.target.value)}
              placeholder="Masukkan namamu..."
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-400" />
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 text-sm mb-2">Kode Room</h3>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Contoh: AB3X"
              maxLength={4}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-2xl font-black text-center text-gray-800 outline-none focus:border-blue-400 tracking-widest" />
          </div>
          <button onClick={handleJoin} disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #28a745, #20c058)" }}>
            {loading ? "Bergabung..." : "🚪 Gabung Room"}
          </button>
        </div>
      </div>
    );
  }

  // ── WAITING LOBBY ──
  if (phase === "waiting" && room) {
    const isHost = room.hostId === myId;
    const myPlayer = room.players.find(p => p.id === myId);
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
          <div className="flex-1">
            <h1 className="text-white font-black text-lg">Ruang Tunggu</h1>
            <p className="text-blue-300 text-xs">Menunggu pemain lain bergabung...</p>
          </div>
        </div>
        <div className="px-4 py-5 flex flex-col gap-4">
          {/* Room code */}
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kode Room</p>
            <div className="text-5xl font-black tracking-widest" style={{ color: "#1a3a6b" }}>{room.code}</div>
            <p className="text-xs text-gray-400 mt-2">Bagikan kode ini ke teman-temanmu</p>
          </div>
          {/* Players list */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-700 text-sm">Pemain</h3>
              <span className="text-xs font-bold text-gray-400">{room.players.length}/{room.maxPlayers}</span>
            </div>
            {room.players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black" style={{ background: ["#2478d4","#28a745","#f0a020","#9b59b6"][i] || "#888" }}>
                  {p.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                  {p.id === myId && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">Kamu</span>}
                </div>
                {p.isHost && <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">Host 👑</span>}
              </div>
            ))}
            {room.players.length < room.maxPlayers && (
              <div className="flex items-center gap-3 px-4 py-3 opacity-40">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg">+</div>
                <span className="text-sm text-gray-400">Menunggu pemain...</span>
              </div>
            )}
          </div>
          {/* Info */}
          <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-around">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-0.5">Modal Awal</div>
              <div className="font-black text-sm text-green-600">{formatRp(room.modalAwal)}</div>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-0.5">Pemainku</div>
              <div className="font-black text-sm text-gray-700">{myPlayer?.name}</div>
            </div>
          </div>
          {isHost ? (
            <button onClick={handleStart} disabled={loading || room.players.length < 2}
              className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
              style={{ background: room.players.length >= 2 ? "linear-gradient(135deg, #28a745, #20c058)" : "#ccc" }}>
              {loading ? "Memulai..." : room.players.length < 2 ? "Minimal 2 pemain untuk mulai" : "🎮 Mulai Permainan!"}
            </button>
          ) : (
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl mb-1 animate-pulse">⏳</div>
              <p className="text-sm font-bold text-gray-500">Menunggu host memulai permainan...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PLAYING ──
  if (phase === "playing" && room) {
    const currentPlayer = room.players[room.currentTurnIndex];
    const isMyTurn = currentPlayer?.id === myId;
    const myPlayer = room.players.find(p => p.id === myId)!;
    const myIndex = room.players.findIndex(p => p.id === myId);

    return (
      <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#d6eeff" }}>
        {/* Header */}
        <div className="flex-shrink-0" style={{ background: "#1a3a6b" }}>
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <div className="flex-1">
              <h1 className="text-white font-black text-base">Hitung Keuangan</h1>
              <p className="text-blue-300 text-[10px]">Room: <span className="font-black tracking-wider">{room.code}</span></p>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-blue-300">Giliranku ke-{myIndex + 1}</div>
              <div className="font-black text-sm" style={{ color: getSaldo(myPlayer, room.modalAwal) >= room.modalAwal ? "#4ade80" : "#f87171" }}>
                {formatRp(getSaldo(myPlayer, room.modalAwal))}
              </div>
            </div>
          </div>
          {/* Turn indicator row */}
          <div className="flex gap-1 px-3 pb-3 overflow-x-auto">
            {room.players.map((p, i) => {
              const isCurrent = i === room.currentTurnIndex;
              const isDone = i < room.currentTurnIndex;
              const saldo = getSaldo(p, room.modalAwal);
              return (
                <div key={p.id} className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-center min-w-[68px]"
                  style={{ background: isCurrent ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)", border: isCurrent ? "2px solid rgba(255,255,255,0.5)" : "2px solid transparent", opacity: isDone ? 0.5 : 1 }}>
                  <div className="text-white font-black text-[11px] truncate max-w-[64px]">{p.id === myId ? "Kamu" : p.name}</div>
                  <div className="font-bold text-[9px]" style={{ color: saldo > room.modalAwal ? "#4ade80" : saldo < room.modalAwal ? "#f87171" : "#93c5fd" }}>
                    {formatRp(saldo)}
                  </div>
                  {isDone && <div className="text-[8px] text-green-400">✓ selesai</div>}
                  {isCurrent && <div className="text-[8px] text-yellow-300">● giliran</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {/* Not my turn overlay */}
          {!isMyTurn && (
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <div className="text-5xl mb-2 animate-pulse">⏳</div>
              <h3 className="font-black text-gray-700 text-base">Bukan Giliranmu</h3>
              <p className="text-sm text-gray-400 mt-1">
                Sekarang giliran <span className="font-black text-gray-700">{currentPlayer?.name}</span> mencatat transaksi
              </p>
              <div className="mt-3 px-4 py-2 rounded-xl bg-blue-50">
                <p className="text-xs text-blue-500 font-semibold">Halaman ini otomatis update saat giliran berganti</p>
              </div>
            </div>
          )}

          {/* Saldo card — always visible for current player */}
          {isMyTurn && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Saldo Kamu</span>
                <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Giliran Kamu 🎯</span>
              </div>
              <div className="text-3xl font-black text-center mb-1"
                style={{ color: getSaldo(myPlayer, room.modalAwal) >= room.modalAwal ? "#16a34a" : "#dc2626" }}>
                {formatRp(getSaldo(myPlayer, room.modalAwal))}
              </div>
              <div className="flex justify-around mt-3">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Modal</div>
                  <div className="font-black text-xs text-gray-700">{formatRp(room.modalAwal)}</div>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <div className="text-xs text-gray-400">Masuk</div>
                  <div className="font-black text-xs text-green-600">
                    +{formatRp(myPlayer.transactions.filter(t => t.tipe === "pemasukan").reduce((a, t) => a + t.jumlah, 0))}
                  </div>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <div className="text-xs text-gray-400">Keluar</div>
                  <div className="font-black text-xs text-red-500">
                    -{formatRp(myPlayer.transactions.filter(t => t.tipe === "pengeluaran").reduce((a, t) => a + t.jumlah, 0))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All players summary (visible to all) */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h3 className="font-black text-gray-700 text-sm">Papan Skor</h3>
            </div>
            {room.players.map((p, i) => {
              const saldo = getSaldo(p, room.modalAwal);
              const untung = saldo > room.modalAwal;
              const rugi = saldo < room.modalAwal;
              const isCurrent = i === room.currentTurnIndex;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                  style={{ background: isCurrent ? "#f0f9ff" : "transparent" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm"
                    style={{ background: ["#2478d4","#28a745","#f0a020","#9b59b6"][i] || "#888" }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-800 text-sm">{p.id === myId ? `${p.name} (Kamu)` : p.name}</span>
                    {isCurrent && <span className="ml-1 text-[9px] text-yellow-600 font-bold">● giliran</span>}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm" style={{ color: untung ? "#16a34a" : rugi ? "#dc2626" : "#666" }}>
                      {formatRp(saldo)}
                    </div>
                    <div className="text-[10px]" style={{ color: untung ? "#16a34a" : rugi ? "#dc2626" : "#999" }}>
                      {untung ? `▲ +${formatRp(saldo - room.modalAwal)}` : rugi ? `▼ -${formatRp(room.modalAwal - saldo)}` : "±0"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transaction form & list — only when my turn */}
          {isMyTurn && (
            <>
              {showForm ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-black text-gray-800 text-sm mb-3">Tambah Transaksi</h3>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setTipe("pemasukan")}
                      className="flex-1 py-2 rounded-xl font-black text-sm transition-all"
                      style={{ background: tipe === "pemasukan" ? "#16a34a" : "#f0fdf4", color: tipe === "pemasukan" ? "#fff" : "#16a34a", border: tipe === "pemasukan" ? "none" : "2px solid #bbf7d0" }}>
                      ↑ Pemasukan
                    </button>
                    <button onClick={() => setTipe("pengeluaran")}
                      className="flex-1 py-2 rounded-xl font-black text-sm transition-all"
                      style={{ background: tipe === "pengeluaran" ? "#dc2626" : "#fff5f5", color: tipe === "pengeluaran" ? "#fff" : "#dc2626", border: tipe === "pengeluaran" ? "none" : "2px solid #fecaca" }}>
                      ↓ Pengeluaran
                    </button>
                  </div>
                  <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)}
                    placeholder="Keterangan (mis: Jual kopi, Beli bahan...)"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 mb-2" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 font-semibold text-sm">Rp</span>
                    <input type="number" value={jumlah} onChange={e => setJumlah(e.target.value)}
                      placeholder="Nominal..."
                      className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-400" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {["5000","10000","25000","50000","100000"].map(v => (
                      <button key={v} onClick={() => setJumlah(v)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-600 active:bg-gray-200">
                        {parseInt(v) >= 1000 ? parseInt(v)/1000+"rb" : v}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">Batal</button>
                    <button onClick={handleAddTx} disabled={!keterangan.trim() || !jumlah || loading}
                      className="flex-[2] py-3 rounded-xl font-black text-sm text-white disabled:opacity-50"
                      style={{ background: tipe === "pemasukan" ? "#16a34a" : "#dc2626" }}>
                      {loading ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowForm(true)}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #2478d4, #1a5fb0)" }}>
                  <span className="text-lg">+</span> Catat Transaksi Baru
                </button>
              )}

              {myPlayer.transactions.length > 0 && (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <h3 className="font-black text-gray-700 text-sm">Transaksi Saya ({myPlayer.transactions.length})</h3>
                  </div>
                  {[...myPlayer.transactions].reverse().map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                        style={{ background: tx.tipe === "pemasukan" ? "#16a34a" : "#dc2626" }}>
                        {tx.tipe === "pemasukan" ? "↑" : "↓"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800 text-sm truncate">{tx.keterangan}</div>
                        <div className="text-[10px] text-gray-400">{tx.waktu}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-black text-sm" style={{ color: tx.tipe === "pemasukan" ? "#16a34a" : "#dc2626" }}>
                          {tx.tipe === "pemasukan" ? "+" : "-"}{formatRp(tx.jumlah)}
                        </div>
                        <button onClick={() => handleDeleteTx(tx.id)} className="text-[10px] text-gray-300 hover:text-red-400">hapus</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => { if (confirm("Selesaikan giliran kamu dan lempar ke pemain berikutnya?")) handleNextTurn(); }}
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg, #f0a020, #e08010)" }}>
                {loading ? "Menyimpan..." : "✅ Selesai Giliran →"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── FINISHED ──
  if (phase === "finished" && room) {
    const sorted = [...room.players].sort((a, b) =>
      getSaldo(b, room.modalAwal) - getSaldo(a, room.modalAwal)
    );
    const medals = ["🥇","🥈","🥉","4️⃣"];
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        <div className="px-4 pt-6 pb-4 text-center" style={{ background: "#1a3a6b" }}>
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-white font-black text-xl">Permainan Selesai!</h1>
          <p className="text-blue-300 text-xs mt-1">Room: {room.code}</p>
        </div>
        <div className="px-4 py-5 flex flex-col gap-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h3 className="font-black text-gray-700 text-sm">Hasil Akhir</h3>
            </div>
            {sorted.map((p, i) => {
              const saldo = getSaldo(p, room.modalAwal);
              const selisih = saldo - room.modalAwal;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0"
                  style={{ background: i === 0 ? "#fffbeb" : "transparent" }}>
                  <span className="text-2xl">{medals[i]}</span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black"
                    style={{ background: ["#2478d4","#28a745","#f0a020","#9b59b6"][room.players.findIndex(pl => pl.id === p.id)] || "#888" }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-gray-800 text-sm">{p.name}{p.id === myId && " (Kamu)"}</div>
                    <div className="text-xs" style={{ color: selisih >= 0 ? "#16a34a" : "#dc2626" }}>
                      {selisih >= 0 ? `Untung +${formatRp(selisih)}` : `Rugi -${formatRp(Math.abs(selisih))}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-base" style={{ color: saldo >= room.modalAwal ? "#16a34a" : "#dc2626" }}>
                      {formatRp(saldo)}
                    </div>
                    <div className="text-[10px] text-gray-400">{p.transactions.length} transaksi</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate("/")}
            className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #1a3a6b, #2478d4)" }}>
            🏠 Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return null;
}
