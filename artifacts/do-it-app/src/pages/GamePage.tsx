import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "/api";

type BoardColor = "merah" | "biru" | "kuning" | "hijau";
type ActionChoice = "upgrade" | "social" | "expand";
type GamePhase = "csr" | "operational" | "revenue" | "lembur_offer" | "between_rounds" | "finished";

interface KAP {
  kreativitas: number;
  socialNetworking: number;
  internalLocus: number;
  toleransiAmbiguitas: number;
  bersediaRisiko: number;
}

interface Transaction {
  id: string; keterangan: string; jumlah: number;
  tipe: "pemasukan" | "pengeluaran"; waktu: string; ronde: number;
}

interface Player {
  id: string; name: string; boardColor: BoardColor; isHost: boolean;
  money: number; hutang: number; kap: KAP; kapScore: number;
  transactions: Transaction[]; lastAction: ActionChoice | null;
  csrPaidThisRound: boolean; lemburThisRound: boolean;
}

interface Room {
  code: string; hostId: string; players: Player[];
  maxPlayers: number; modalAwal: number;
  currentTurnIndex: number; status: "waiting" | "playing" | "finished";
  currentRonde: number; currentPutaran: number;
  phase: GamePhase; actedThisPutaran: string[];
}

type AppPhase = "lobby" | "create" | "join" | "waiting" | "game";

const BOARD_COLORS: { value: BoardColor; label: string; emoji: string; bg: string; text: string }[] = [
  { value: "merah",  label: "Merah – Hotel",   emoji: "🏨", bg: "#fee2e2", text: "#dc2626" },
  { value: "biru",   label: "Biru – Sekolah",  emoji: "🏫", bg: "#dbeafe", text: "#2563eb" },
  { value: "kuning", label: "Kuning – Kantor",  emoji: "🏢", bg: "#fef9c3", text: "#ca8a04" },
  { value: "hijau",  label: "Hijau – Taman",   emoji: "🌳", bg: "#dcfce7", text: "#16a34a" },
];

const PHASE_LABELS: Record<GamePhase, string> = {
  csr: "Fase CSR",
  operational: "Fase Operasional",
  revenue: "Hitung Pendapatan",
  lembur_offer: "Tawaran Lembur",
  between_rounds: "Antar Ronde",
  finished: "Selesai",
};

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function colorStyle(bc: BoardColor) {
  const c = BOARD_COLORS.find(x => x.value === bc)!;
  return { background: c.bg, color: c.text };
}

function KAPBar({ label, value, max = 7, color }: { label: string; value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-24 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black w-4 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export default function GamePage() {
  const navigate = useNavigate();
  const [appPhase, setAppPhase] = useState<AppPhase>("lobby");
  const [myId, setMyId] = useState("");
  const [room, setRoom] = useState<Room | null>(null);

  // Forms
  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState<BoardColor>("merah");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [modalAwal, setModalAwal] = useState("500000");
  const [joinName, setJoinName] = useState("");
  const [joinColor, setJoinColor] = useState<BoardColor>("biru");
  const [joinCode, setJoinCode] = useState("");

  // Game action state
  const [pendapatan, setPendapatan] = useState("");
  const [pajak, setPajak] = useState("");
  const [hutangModal, setHutangModal] = useState(false);
  const [showDebt, setShowDebt] = useState(false);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtAction, setDebtAction] = useState<"borrow" | "repay">("borrow");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRoom = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API}/rooms/${code}`);
      if (!res.ok) return;
      const data: Room = await res.json();
      setRoom(data);
      if (data.status === "playing" || data.status === "finished") {
        setAppPhase("game");
      }
    } catch {/* ignore */ }
  }, []);

  useEffect(() => {
    if ((appPhase === "waiting" || appPhase === "game") && room?.code) {
      pollingRef.current = setInterval(() => pollRoom(room.code), 2500);
      return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }
  }, [appPhase, room?.code, pollRoom]);

  async function post(path: string, body: object) {
    const res = await fetch(`${API}/rooms/${room!.code}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: myId, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error");
    await pollRoom(room!.code);
    return data;
  }

  async function handleCreate() {
    if (!createName.trim()) return setErr("Nama tidak boleh kosong");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: createName.trim(), boardColor: createColor, maxPlayers, modalAwal: parseInt(modalAwal) || 500000 }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setMyId(data.playerId);
      await pollRoom(data.code);
      setAppPhase("waiting");
    } catch { setErr("Gagal terhubung ke server"); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!joinName.trim() || !joinCode.trim()) return setErr("Lengkapi semua field");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/rooms/${joinCode.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: joinName.trim(), boardColor: joinColor }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setMyId(data.playerId);
      await pollRoom(joinCode.toUpperCase());
      setAppPhase("waiting");
    } catch { setErr("Gagal terhubung ke server"); }
    finally { setLoading(false); }
  }

  async function handleStart() {
    setLoading(true);
    try { await post("/start", {}); setAppPhase("game"); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleAction(action: ActionChoice) {
    setLoading(true); setErr("");
    try { await post("/action", { action, hutang: hutangModal }); setHutangModal(false); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleCSR(amount: number | null) {
    setLoading(true); setErr("");
    try {
      if (amount === null) { await post("/csr-skip", {}); }
      else { await post("/csr", { amount }); }
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleRevenue() {
    setLoading(true); setErr("");
    try { await post("/revenue", { pendapatan: parseInt(pendapatan) || 0, pajak: parseInt(pajak) || 0 }); setPendapatan(""); setPajak(""); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleLembur(lembur: boolean) {
    setLoading(true); setErr("");
    try { await post("/lembur", { lembur }); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleDebt() {
    setLoading(true); setErr("");
    try {
      await post("/debt", { action: debtAction, amount: parseInt(debtAmount) || 0 });
      setShowDebt(false); setDebtAmount("");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleFinishEarly() {
    if (!confirm("Akhiri permainan sekarang?")) return;
    setLoading(true);
    try { await post("/finish-early", {}); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  const myPlayer = room?.players.find(p => p.id === myId);
  const isHost = room?.hostId === myId;

  // ── LOBBY ───────────────────────────────────────────────────────────────
  if (appPhase === "lobby") return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
        <button onClick={() => navigate("/")} className="text-white text-2xl">‹</button>
        <div><h1 className="text-white font-black text-lg">Mulai Game</h1>
          <p className="text-blue-300 text-xs">Buat atau gabung room</p></div>
        <span className="ml-auto text-3xl">🧮</span>
      </div>
      <div className="px-4 py-5 flex flex-col gap-4">
        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
        {[
          { icon: "🏠", title: "Buat Room Baru", desc: "Jadi host, atur sesi & mulai permainan", phase: "create" as const, color: "#e8f4ff" },
          { icon: "🚪", title: "Gabung Room", desc: "Masukkan kode room dari host", phase: "join" as const, color: "#e8ffe8" },
        ].map(item => (
          <button key={item.phase} onClick={() => { setErr(""); setAppPhase(item.phase); }}
            className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm text-left w-full active:scale-95 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: item.color }}>{item.icon}</div>
            <div>
              <h3 className="font-black text-gray-800 text-base">{item.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          </button>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h4 className="font-black text-gray-700 text-sm mb-3">📖 Alur Permainan</h4>
          {[
            ["🎯", "4 Ronde", "Setiap ronde terdiri dari 2 putaran + opsi lembur"],
            ["💰", "Fase CSR", "Bayar Rp.4 → +1 KAP, Rp.7 → +2 KAP (opsional)"],
            ["🎮", "Aksi", "Pilih: Upgrade (kreativitas), Social (jaringan), atau Expand (locus of control)"],
            ["📊", "Pendapatan", "Hitung pelanggan × harga menu, bayar pajak cafe"],
            ["🏆", "Menang", "Pemain dengan KAP tertinggi di akhir 4 ronde"],
          ].map(([icon, title, desc]) => (
            <div key={title as string} className="flex gap-3 mb-2.5 last:mb-0">
              <span className="text-lg flex-shrink-0">{icon}</span>
              <div>
                <span className="font-black text-gray-700 text-xs">{title} </span>
                <span className="text-gray-400 text-xs">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── CREATE ───────────────────────────────────────────────────────────────
  if (appPhase === "create") return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
        <button onClick={() => { setErr(""); setAppPhase("lobby"); }} className="text-white text-2xl">‹</button>
        <h1 className="text-white font-black text-lg">Buat Room</h1>
      </div>
      <div className="px-4 py-5 flex flex-col gap-4">
        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Nama Kamu (Host)</h3>
          <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Masukkan namamu..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Pilih Warna Board</h3>
          <div className="grid grid-cols-2 gap-2">
            {BOARD_COLORS.map(c => (
              <button key={c.value} onClick={() => setCreateColor(c.value)}
                className="p-3 rounded-xl flex items-center gap-2 border-2 transition-all"
                style={{ background: createColor === c.value ? c.bg : "#f8f8f8", borderColor: createColor === c.value ? c.text : "#e5e7eb" }}>
                <span className="text-xl">{c.emoji}</span>
                <span className="text-xs font-black" style={{ color: c.text }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Jumlah Pemain</h3>
          <div className="flex gap-2">
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setMaxPlayers(n)}
                className="flex-1 py-3 rounded-xl font-black text-lg transition-all"
                style={{ background: maxPlayers === n ? "#1a3a6b" : "#f0f4ff", color: maxPlayers === n ? "#fff" : "#1a3a6b" }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Modal Awal per Pemain</h3>
          <div className="flex gap-2 flex-wrap mb-2">
            {["250000","500000","750000","1000000"].map(v => (
              <button key={v} onClick={() => setModalAwal(v)}
                className="px-3 py-1.5 rounded-xl font-bold text-xs"
                style={{ background: modalAwal === v ? "#28a745" : "#f0f4ff", color: modalAwal === v ? "#fff" : "#28a745" }}>
                {formatRp(parseInt(v))}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Rp</span>
            <input type="number" value={modalAwal} onChange={e => setModalAwal(e.target.value)}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-green-400" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #1a3a6b, #2478d4)" }}>
          {loading ? "Membuat..." : "🏠 Buat Room"}
        </button>
      </div>
    </div>
  );

  // ── JOIN ─────────────────────────────────────────────────────────────────
  if (appPhase === "join") return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
        <button onClick={() => { setErr(""); setAppPhase("lobby"); }} className="text-white text-2xl">‹</button>
        <h1 className="text-white font-black text-lg">Gabung Room</h1>
      </div>
      <div className="px-4 py-5 flex flex-col gap-4">
        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Kode Room</h3>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Contoh: AB3X" maxLength={4}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-3xl font-black text-center text-gray-800 outline-none focus:border-blue-400 tracking-widest" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Namamu</h3>
          <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="Masukkan namamu..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Pilih Warna Board</h3>
          <div className="grid grid-cols-2 gap-2">
            {BOARD_COLORS.map(c => (
              <button key={c.value} onClick={() => setJoinColor(c.value)}
                className="p-3 rounded-xl flex items-center gap-2 border-2 transition-all"
                style={{ background: joinColor === c.value ? c.bg : "#f8f8f8", borderColor: joinColor === c.value ? c.text : "#e5e7eb" }}>
                <span className="text-xl">{c.emoji}</span>
                <span className="text-xs font-black" style={{ color: c.text }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleJoin} disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #28a745, #20c058)" }}>
          {loading ? "Bergabung..." : "🚪 Gabung Room"}
        </button>
      </div>
    </div>
  );

  // ── WAITING ROOM ─────────────────────────────────────────────────────────
  if (appPhase === "waiting" && room) {
    const takenColors = room.players.map(p => p.boardColor);
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
          <div className="flex-1"><h1 className="text-white font-black text-lg">Ruang Tunggu</h1>
            <p className="text-blue-300 text-xs">Menunggu pemain bergabung...</p></div>
        </div>
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kode Room</p>
            <div className="text-5xl font-black tracking-widest" style={{ color: "#1a3a6b" }}>{room.code}</div>
            <p className="text-xs text-gray-400 mt-1">Bagikan ke teman-temanmu</p>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between">
              <h3 className="font-black text-gray-700 text-sm">Pemain</h3>
              <span className="text-xs font-bold text-gray-400">{room.players.length}/{room.maxPlayers}</span>
            </div>
            {room.players.map((p, i) => {
              const bc = BOARD_COLORS.find(c => c.value === p.boardColor)!;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg" style={colorStyle(p.boardColor)}>{bc.emoji}</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                    {p.id === myId && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">Kamu</span>}
                    <div className="text-xs" style={{ color: bc.text }}>{bc.label}</div>
                  </div>
                  {p.isHost && <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">Host 👑</span>}
                  <span className="text-sm font-bold text-gray-600">#{i + 1}</span>
                </div>
              );
            })}
            {room.players.length < room.maxPlayers && (
              Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => {
                const available = BOARD_COLORS.filter(c => !takenColors.includes(c.value));
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 opacity-35">
                    <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-sm">{available[i]?.emoji || "?"}</div>
                    <span className="text-sm text-gray-400">Menunggu pemain...</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-around text-center">
            <div><div className="text-xs text-gray-400">Modal Awal</div><div className="font-black text-sm text-green-600">{formatRp(room.modalAwal)}</div></div>
            <div className="w-px bg-gray-100" />
            <div><div className="text-xs text-gray-400">Max Pemain</div><div className="font-black text-sm text-gray-700">{room.maxPlayers} orang</div></div>
            <div className="w-px bg-gray-100" />
            <div><div className="text-xs text-gray-400">Total Ronde</div><div className="font-black text-sm text-gray-700">4 Ronde</div></div>
          </div>
          {isHost
            ? <button onClick={handleStart} disabled={loading || room.players.length < 2}
                className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
                style={{ background: room.players.length >= 2 ? "linear-gradient(135deg,#28a745,#20c058)" : "#ccc" }}>
                {loading ? "Memulai..." : room.players.length < 2 ? "Butuh minimal 2 pemain" : "🎮 Mulai Permainan!"}
              </button>
            : <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <div className="text-2xl mb-1 animate-pulse">⏳</div>
                <p className="text-sm font-bold text-gray-500">Menunggu host memulai...</p>
              </div>
          }
        </div>
      </div>
    );
  }

  // ── GAME ─────────────────────────────────────────────────────────────────
  if (appPhase === "game" && room && myPlayer) {
    const currentPlayer = room.players[room.currentTurnIndex];
    const isMyTurn = currentPlayer?.id === myId;
    const myActedCSR = myPlayer.csrPaidThisRound;
    const myActedRevenue = room.actedThisPutaran.includes(myId + "_rev");
    const myActedLembur = room.actedThisPutaran.includes(myId + "_lembur");
    const myActedAction = room.actedThisPutaran.includes(myId);
    const bc = BOARD_COLORS.find(c => c.value === myPlayer.boardColor)!;

    // ── FINISHED ──
    if (room.status === "finished") {
      const sorted = [...room.players].sort((a, b) => b.kapScore - a.kapScore);
      const medals = ["🥇","🥈","🥉","4️⃣"];
      return (
        <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
          <div className="px-4 pt-6 pb-4 text-center" style={{ background: "#1a3a6b" }}>
            <div className="text-5xl mb-2">🏆</div>
            <h1 className="text-white font-black text-xl">Permainan Selesai!</h1>
            <p className="text-blue-300 text-xs mt-1">Room: {room.code}</p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <h3 className="font-black text-gray-700 text-sm">🏆 Ranking KAP Final</h3>
              </div>
              {sorted.map((p, i) => {
                const pbc = BOARD_COLORS.find(c => c.value === p.boardColor)!;
                return (
                  <div key={p.id} className="px-4 py-3.5 border-b border-gray-50 last:border-0"
                    style={{ background: i === 0 ? "#fffbeb" : "transparent" }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{medals[i]}</span>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-black" style={colorStyle(p.boardColor)}>{pbc.emoji}</div>
                      <div className="flex-1">
                        <div className="font-black text-gray-800 text-sm">{p.name}{p.id === myId && " (Kamu)"}</div>
                        <div className="text-xs" style={{ color: pbc.text }}>{pbc.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xl" style={{ color: "#1a3a6b" }}>{p.kapScore}</div>
                        <div className="text-[10px] text-gray-400">KAP</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 pl-12">
                      <KAPBar label="Kreativitas" value={p.kap.kreativitas} color="#2478d4" />
                      <KAPBar label="Social Network" value={p.kap.socialNetworking} color="#28a745" />
                      <KAPBar label="Locus of Control" value={p.kap.internalLocus} color="#9b59b6" />
                      <KAPBar label="Toleransi Ambiguitas" value={p.kap.toleransiAmbiguitas} color="#f0a020" />
                    </div>
                    <div className="flex justify-between mt-2 pl-12">
                      <span className="text-xs text-gray-400">Uang akhir: <span className="font-bold text-gray-700">{formatRp(p.money)}</span></span>
                      {p.hutang > 0 && <span className="text-xs text-red-500 font-bold">Hutang: {formatRp(p.hutang)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate("/")}
              className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg,#1a3a6b,#2478d4)" }}>
              🏠 Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#d6eeff" }}>
        {/* ── Top Bar ── */}
        <div className="flex-shrink-0" style={{ background: "#1a3a6b" }}>
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-base" style={colorStyle(myPlayer.boardColor)}>{bc.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-black text-sm truncate">{myPlayer.name}</div>
              <div className="text-blue-300 text-[10px]">
                <span className="font-bold text-yellow-300">Ronde {room.currentRonde}/4</span>
                {" · "}Putaran {room.currentPutaran}
                {" · "}<span className="font-bold text-blue-200">{PHASE_LABELS[room.phase]}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-black text-sm text-white">{formatRp(myPlayer.money)}</div>
              <div className="text-[10px] text-blue-300">KAP: <span className="text-yellow-300 font-black">{myPlayer.kapScore}</span></div>
            </div>
            {isHost && (
              <button onClick={handleFinishEarly} className="ml-1 text-red-300 text-[10px] font-bold border border-red-400 px-1.5 py-0.5 rounded-lg">Akhiri</button>
            )}
          </div>

          {/* Player mini-tabs */}
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
            {room.players.map(p => {
              const pbc = BOARD_COLORS.find(c => c.value === p.boardColor)!;
              const isCurrent = p.id === (room.phase === "operational" ? currentPlayer?.id : undefined);
              return (
                <div key={p.id} className="flex-shrink-0 px-2 py-1 rounded-xl min-w-[64px]"
                  style={{ background: isCurrent ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)", border: isCurrent ? "2px solid rgba(255,255,255,0.5)" : "2px solid transparent" }}>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{pbc.emoji}</span>
                    <span className="text-white font-black text-[10px] truncate max-w-[48px]">{p.id === myId ? "Kamu" : p.name}</span>
                  </div>
                  <div className="font-black text-[10px] text-yellow-300">{p.kapScore} KAP</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}

          {/* Debt modal */}
          {showDebt && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-orange-200">
              <h3 className="font-black text-gray-800 text-sm mb-3">💳 Kelola Hutang</h3>
              <div className="flex gap-2 mb-3">
                {(["borrow","repay"] as const).map(a => (
                  <button key={a} onClick={() => setDebtAction(a)}
                    className="flex-1 py-2 rounded-xl font-black text-xs transition-all"
                    style={{ background: debtAction === a ? (a === "borrow" ? "#16a34a" : "#dc2626") : "#f5f5f5",
                      color: debtAction === a ? "#fff" : "#666" }}>
                    {a === "borrow" ? "💰 Pinjam" : "💸 Bayar Hutang"}
                  </button>
                ))}
              </div>
              {debtAction === "repay" && <p className="text-[10px] text-orange-500 font-bold mb-2">⚠ Pinjam Rp.3 → Bayar Rp.4 (bunga ~33%)</p>}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-500 text-sm">Rp</span>
                <input type="number" value={debtAmount} onChange={e => setDebtAmount(e.target.value)}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-orange-400" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDebt(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">Batal</button>
                <button onClick={handleDebt} disabled={loading || !debtAmount}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-50"
                  style={{ background: debtAction === "borrow" ? "#16a34a" : "#dc2626" }}>
                  {loading ? "..." : "Konfirmasi"}
                </button>
              </div>
            </div>
          )}

          {/* ── CSR PHASE ── */}
          {room.phase === "csr" && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💝</span>
                <h3 className="font-black text-gray-800 text-base">Fase CSR – Ronde {room.currentRonde}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Bayar ke bank untuk mendapatkan poin KAP (Kebutuhan akan Berprestasi). Opsional — boleh skip.
              </p>
              {myActedCSR ? (
                <div className="text-center py-3 bg-green-50 rounded-xl">
                  <span className="text-2xl">✅</span>
                  <p className="text-sm font-bold text-green-700 mt-1">Sudah memilih CSR</p>
                  <p className="text-xs text-gray-400 mt-0.5">Menunggu pemain lain...</p>
                  <div className="flex justify-center gap-2 mt-3 flex-wrap">
                    {room.players.map(p => (
                      <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: p.csrPaidThisRound ? "#dcfce7" : "#fee2e2", color: p.csrPaidThisRound ? "#16a34a" : "#dc2626" }}>
                        {p.id === myId ? "Kamu" : p.name} {p.csrPaidThisRound ? "✓" : "⏳"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {[
                    { amount: 4, kap: 1, label: "Bayar Rp.4 → +1 KAP", color: "#2478d4" },
                    { amount: 7, kap: 2, label: "Bayar Rp.7 → +2 KAP", color: "#9b59b6" },
                  ].map(opt => (
                    <button key={opt.amount} onClick={() => handleCSR(opt.amount)} disabled={loading || myPlayer.money < opt.amount}
                      className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 active:scale-95 transition-transform"
                      style={{ background: opt.color }}>
                      {opt.label}
                      {myPlayer.money < opt.amount && " (uang kurang)"}
                    </button>
                  ))}
                  <button onClick={() => handleCSR(null)} disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-500">
                    Skip CSR
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── OPERATIONAL PHASE ── */}
          {room.phase === "operational" && (
            <>
              {isMyTurn && !myActedAction ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🎮</span>
                    <h3 className="font-black text-gray-800 text-base">Giliranmu! Pilih Aksi</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Pilih 1 aksi untuk putaran ini. Aksi yang sama dengan pemain sebelumnya akan menaikkan Toleransi Ambiguitas.</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { action: "upgrade" as const, icon: "⬆️", label: "Upgrade", desc: `Naikkan Kreativitas (level ${myPlayer.kap.kreativitas} → ${myPlayer.kap.kreativitas + 1})`, color: "#2478d4", kap: "Kreativitas" },
                      { action: "social" as const, icon: "🤝", label: "Social", desc: `Naikkan Social Networking (biaya Rp.${myPlayer.kap.socialNetworking + 1})`, color: "#28a745", kap: "Social" },
                      { action: "expand" as const, icon: "🏪", label: "Expand", desc: `Naikkan Locus of Control (level ${myPlayer.kap.internalLocus} → ${myPlayer.kap.internalLocus + 1})`, color: "#9b59b6", kap: "Locus" },
                    ].map(opt => (
                      <button key={opt.action} onClick={() => handleAction(opt.action)} disabled={loading}
                        className="w-full p-3.5 rounded-xl text-left flex items-center gap-3 active:scale-95 transition-transform disabled:opacity-60"
                        style={{ background: opt.color + "15", border: `2px solid ${opt.color}30` }}>
                        <span className="text-2xl">{opt.icon}</span>
                        <div className="flex-1">
                          <div className="font-black text-sm" style={{ color: opt.color }}>{opt.label}</div>
                          <div className="text-xs text-gray-500">{opt.desc}</div>
                        </div>
                        <span className="text-lg">›</span>
                      </button>
                    ))}
                  </div>
                  {myPlayer.kap.socialNetworking > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <input type="checkbox" id="hutang" checked={hutangModal} onChange={e => setHutangModal(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                      <label htmlFor="hutang" className="text-xs font-bold text-orange-600">Bayar aksi Social via hutang (naikkan Bersedia Risiko)</label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  {myActedAction ? (
                    <>
                      <span className="text-3xl">✅</span>
                      <p className="text-sm font-bold text-green-700 mt-1">Aksi selesai!</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {room.actedThisPutaran.filter(x => !x.includes("_")).length}/{room.players.length} pemain sudah beraksi
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl animate-pulse">⏳</span>
                      <p className="text-sm font-bold text-gray-600 mt-1">Giliran <span className="text-gray-800">{currentPlayer?.name}</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">Tunggu giliranmu...</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── REVENUE PHASE ── */}
          {room.phase === "revenue" && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📊</span>
                <h3 className="font-black text-gray-800 text-base">Hitung Pendapatan</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Hitung pelanggan × harga menu di areamamu, lalu masukkan pajak cafe.</p>
              {myActedRevenue ? (
                <div className="text-center py-3 bg-green-50 rounded-xl">
                  <span className="text-2xl">✅</span>
                  <p className="text-sm font-bold text-green-700 mt-1">Sudah input pendapatan</p>
                  <p className="text-xs text-gray-400">Menunggu pemain lain...</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">💵 Pendapatan (pelanggan × menu)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Rp</span>
                        <input type="number" value={pendapatan} onChange={e => setPendapatan(e.target.value)}
                          placeholder="0" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-green-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">🏛 Pajak Cafe</label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Rp</span>
                        <input type="number" value={pajak} onChange={e => setPajak(e.target.value)}
                          placeholder="0" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-red-400" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center mb-3">
                    <span className="text-xs text-gray-500">Hasil Bersih: </span>
                    <span className="font-black text-sm" style={{ color: (parseInt(pendapatan)||0) - (parseInt(pajak)||0) >= 0 ? "#16a34a" : "#dc2626" }}>
                      {formatRp((parseInt(pendapatan)||0) - (parseInt(pajak)||0))}
                    </span>
                  </div>
                  <button onClick={handleRevenue} disabled={loading}
                    className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 active:scale-95 transition-transform"
                    style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
                    {loading ? "Menyimpan..." : "✅ Konfirmasi Pendapatan"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── LEMBUR PHASE ── */}
          {room.phase === "lembur_offer" && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⏰</span>
                <h3 className="font-black text-gray-800 text-base">Tawaran Lembur</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Bayar <strong>Rp.5</strong> ke bank untuk 1 putaran lembur tambahan. Pemain yang skip tidak ikut lembur.
              </p>
              {myActedLembur ? (
                <div className="text-center py-3 bg-green-50 rounded-xl">
                  <span className="text-2xl">✅</span>
                  <p className="text-sm font-bold text-green-700 mt-1">{myPlayer.lemburThisRound ? "Memilih lembur!" : "Skip lembur"}</p>
                  <p className="text-xs text-gray-400">Menunggu pemain lain...</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => handleLembur(true)} disabled={loading || myPlayer.money < 5}
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40"
                    style={{ background: "#f0a020" }}>
                    ⏰ Lembur (Rp.5){myPlayer.money < 5 && " ✗"}
                  </button>
                  <button onClick={() => handleLembur(false)} disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── KAP Tracker ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-700 text-sm mb-3">📊 KAP Tracker — {myPlayer.name}</h3>
            <div className="flex flex-col gap-2 mb-3">
              <KAPBar label="Kreativitas" value={myPlayer.kap.kreativitas} color="#2478d4" />
              <KAPBar label="Social Networking" value={myPlayer.kap.socialNetworking} color="#28a745" />
              <KAPBar label="Locus of Control" value={myPlayer.kap.internalLocus} color="#9b59b6" />
              <KAPBar label="Toleransi Ambiguitas" value={myPlayer.kap.toleransiAmbiguitas} color="#f0a020" />
              <KAPBar label="Bersedia Risiko" value={myPlayer.kap.bersediaRisiko} max={5} color="#e84393" />
            </div>
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-blue-600">Total KAP</span>
              <span className="font-black text-xl text-blue-700">{myPlayer.kapScore}</span>
            </div>
            {myPlayer.hutang > 0 && (
              <div className="mt-2 flex items-center justify-between bg-red-50 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-red-500">Hutang</span>
                <span className="font-black text-sm text-red-600">{formatRp(myPlayer.hutang)}</span>
              </div>
            )}
            <button onClick={() => setShowDebt(!showDebt)}
              className="mt-2 w-full py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200">
              💳 Kelola Hutang Bank
            </button>
          </div>

          {/* ── All Players Leaderboard ── */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h3 className="font-black text-gray-700 text-sm">🏆 Papan KAP</h3>
            </div>
            {[...room.players].sort((a, b) => b.kapScore - a.kapScore).map((p, i) => {
              const pbc = BOARD_COLORS.find(c => c.value === p.boardColor)!;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-base w-5">{["🥇","🥈","🥉","4️⃣"][i]}</span>
                  <span className="text-xl">{pbc.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{p.id === myId ? `${p.name} (Kamu)` : p.name}</div>
                    <div className="text-[10px]" style={{ color: pbc.text }}>{pbc.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg" style={{ color: "#1a3a6b" }}>{p.kapScore}</div>
                    <div className="text-[10px] text-gray-400">{formatRp(p.money)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
