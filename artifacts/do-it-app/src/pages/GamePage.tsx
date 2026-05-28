import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "/api";

type BoardColor = "merah" | "biru" | "kuning" | "hijau";
type ActionChoice = "upgrade" | "social" | "expand";
type MenuType = "kopi" | "teh" | "kue" | "croissant";
type UpgradeType = "add_menu" | "raise_price" | "add_seats" | "move";
type GamePhase = "csr" | "operational" | "revenue" | "lembur_offer" | "finished";

interface MenuItem { type: MenuType; count: number; price: number; }
interface CafeSlot {
  id: string; area: BoardColor; name: string; basePrice: number;
  ownerId: string | null; menuItems: MenuItem[]; seats: number; socialCustomers: number;
}
interface PendingBid {
  cafeId: string; bidderId: string; cafeName: string; openPrice: number;
  responses: { playerId: string; accepted: boolean; counterPrice?: number }[];
  status: "pending" | "accepted" | "rejected" | "buyout";
}
interface KAP { kreativitas: number; socialNetworking: number; internalLocus: number; toleransiAmbiguitas: number; bersediaRisiko: number; }
interface Transaction { id: string; keterangan: string; jumlah: number; tipe: "pemasukan" | "pengeluaran"; waktu: string; ronde: number; }
interface Player {
  id: string; name: string; boardColor: BoardColor; isHost: boolean;
  money: number; hutang: number; kap: KAP; kapScore: number;
  transactions: Transaction[]; lastAction: ActionChoice | null;
  csrPaidThisRound: boolean; lemburThisRound: boolean;
}
interface Room {
  code: string; hostId: string; players: Player[];
  maxPlayers: number; modalAwal: number; currentTurnIndex: number;
  status: "waiting" | "playing" | "finished";
  currentRonde: number; currentPutaran: number;
  phase: GamePhase; actedThisPutaran: string[];
  cafes: CafeSlot[]; pendingBid: PendingBid | null;
}

type AppPhase = "lobby" | "create" | "join" | "waiting" | "game";

// Action step state machine
type ActionStep =
  | null
  | { action: "upgrade"; step: "select_cafe" }
  | { action: "upgrade"; step: "select_type"; cafeId: string; cafeName: string }
  | { action: "upgrade"; step: "select_menu"; cafeId: string; upgradeType: UpgradeType; cafeName: string }
  | { action: "upgrade"; step: "select_move_target"; cafeId: string; menuType: MenuType; cafeName: string }
  | { action: "social"; step: "select_area" }
  | { action: "expand"; step: "select_cafe" }
  | { action: "expand"; step: "bid_options"; cafeId: string; cafeName: string; basePrice: number }
  | { action: "expand"; step: "open_bid"; cafeId: string; cafeName: string; basePrice: number };

const BOARD_COLORS: { value: BoardColor; label: string; emoji: string; bg: string; text: string }[] = [
  { value: "merah",  label: "Merah – Hotel",   emoji: "🏨", bg: "#fee2e2", text: "#dc2626" },
  { value: "biru",   label: "Biru – Sekolah",  emoji: "🏫", bg: "#dbeafe", text: "#2563eb" },
  { value: "kuning", label: "Kuning – Kantor",  emoji: "🏢", bg: "#fef9c3", text: "#ca8a04" },
  { value: "hijau",  label: "Hijau – Taman",   emoji: "🌳", bg: "#dcfce7", text: "#16a34a" },
];
const MENU_INFO: Record<MenuType, { emoji: string; label: string; defaultPrice: number }> = {
  kopi:      { emoji: "☕", label: "Kopi",      defaultPrice: 3 },
  teh:       { emoji: "🍵", label: "Teh",       defaultPrice: 2 },
  kue:       { emoji: "🎂", label: "Kue",        defaultPrice: 4 },
  croissant: { emoji: "🥐", label: "Croissant", defaultPrice: 5 },
};
const MENU_TYPES: MenuType[] = ["kopi", "teh", "kue", "croissant"];

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function colorStyle(bc: BoardColor) {
  const c = BOARD_COLORS.find(x => x.value === bc)!;
  return { background: c.bg, color: c.text };
}
function bcInfo(bc: BoardColor) { return BOARD_COLORS.find(x => x.value === bc)!; }

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

  // Action flow
  const [actionStep, setActionStep] = useState<ActionStep>(null);
  const [hutangMode, setHutangMode] = useState(false);
  const [bidPriceInput, setBidPriceInput] = useState("");
  const [pendapatan, setPendapatan] = useState("");
  const [pajak, setPajak] = useState("");
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
      if (data.status === "playing" || data.status === "finished") setAppPhase("game");
    } catch {/* ignore */}
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

  async function handleStart(testMode = false) {
    setLoading(true);
    try { await post("/start", { testMode }); setAppPhase("game"); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function submitAction(body: object) {
    setLoading(true); setErr("");
    try {
      await post("/action", body);
      setActionStep(null); setHutangMode(false); setBidPriceInput("");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleCSR(amount: number | null) {
    setLoading(true); setErr("");
    try { amount === null ? await post("/csr-skip", {}) : await post("/csr", { amount }); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleRevenue() {
    setLoading(true); setErr("");
    try { await post("/revenue", { pendapatan: parseInt(pendapatan)||0, pajak: parseInt(pajak)||0 }); setPendapatan(""); setPajak(""); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleLembur(lembur: boolean) {
    setLoading(true); setErr("");
    try { await post("/lembur", { lembur }); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleBidRespond(accepted: boolean) {
    setLoading(true); setErr("");
    try { await post("/bid-respond", { accepted }); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleDebt() {
    setLoading(true); setErr("");
    try { await post("/debt", { action: debtAction, amount: parseInt(debtAmount)||0 }); setShowDebt(false); setDebtAmount(""); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  const myPlayer = room?.players.find(p => p.id === myId);
  const isHost = room?.hostId === myId;

  // ── LOBBY ──────────────────────────────────────────────────────────────
  if (appPhase === "lobby") return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
        <button onClick={() => navigate("/")} className="text-white text-2xl">‹</button>
        <div><h1 className="text-white font-black text-lg">Mulai Game</h1><p className="text-blue-300 text-xs">Buat atau gabung room</p></div>
        <span className="ml-auto text-3xl">🧮</span>
      </div>
      <div className="px-4 py-5 flex flex-col gap-4">
        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
        {[
          { icon:"🏠", title:"Buat Room Baru", desc:"Jadi host, atur sesi & mulai permainan", phase:"create" as const, color:"#e8f4ff" },
          { icon:"🚪", title:"Gabung Room", desc:"Masukkan kode room dari host", phase:"join" as const, color:"#e8ffe8" },
        ].map(item => (
          <button key={item.phase} onClick={() => { setErr(""); setAppPhase(item.phase); }}
            className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm text-left w-full active:scale-95 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: item.color }}>{item.icon}</div>
            <div><h3 className="font-black text-gray-800 text-base">{item.title}</h3><p className="text-xs text-gray-400 mt-0.5">{item.desc}</p></div>
          </button>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h4 className="font-black text-gray-700 text-sm mb-3">📖 Alur Permainan</h4>
          {[["🎯","4 Ronde","2 putaran + opsi lembur per ronde"],["💰","Fase CSR","Rp.4→+1KAP, Rp.7→+2KAP (opsional)"],["🎮","Aksi","Upgrade cafe / Social networking / Expand ke area baru"],["📊","Pendapatan","Pelanggan × harga menu, bayar pajak"],["🏆","Menang","KAP tertinggi di akhir 4 ronde"]].map(([ic,ti,de])=>(
            <div key={ti} className="flex gap-3 mb-2 last:mb-0"><span className="text-lg flex-shrink-0">{ic}</span><div><span className="font-black text-gray-700 text-xs">{ti} </span><span className="text-gray-400 text-xs">{de}</span></div></div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── CREATE ─────────────────────────────────────────────────────────────
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
          <input value={createName} onChange={e=>setCreateName(e.target.value)} placeholder="Masukkan namamu..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Pilih Warna Board</h3>
          <div className="grid grid-cols-2 gap-2">
            {BOARD_COLORS.map(c => (
              <button key={c.value} onClick={() => setCreateColor(c.value)}
                className="p-3 rounded-xl flex items-center gap-2 border-2 transition-all"
                style={{ background: createColor===c.value?c.bg:"#f8f8f8", borderColor: createColor===c.value?c.text:"#e5e7eb" }}>
                <span className="text-xl">{c.emoji}</span>
                <span className="text-xs font-black" style={{ color: c.text }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Jumlah Pemain</h3>
          <div className="flex gap-2">
            {[2,3,4].map(n=>(
              <button key={n} onClick={()=>setMaxPlayers(n)} className="flex-1 py-3 rounded-xl font-black text-lg transition-all"
                style={{ background: maxPlayers===n?"#1a3a6b":"#f0f4ff", color: maxPlayers===n?"#fff":"#1a3a6b" }}>{n}</button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Modal Awal per Pemain</h3>
          <div className="flex gap-2 flex-wrap mb-2">
            {["250000","500000","750000","1000000"].map(v=>(
              <button key={v} onClick={()=>setModalAwal(v)} className="px-3 py-1.5 rounded-xl font-bold text-xs"
                style={{ background: modalAwal===v?"#28a745":"#f0f4ff", color: modalAwal===v?"#fff":"#28a745" }}>{formatRp(parseInt(v))}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Rp</span>
            <input type="number" value={modalAwal} onChange={e=>setModalAwal(e.target.value)}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-green-400" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={loading} className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
          style={{ background:"linear-gradient(135deg,#1a3a6b,#2478d4)" }}>
          {loading?"Membuat...":"🏠 Buat Room"}
        </button>
      </div>
    </div>
  );

  // ── JOIN ───────────────────────────────────────────────────────────────
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
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Contoh: AB3X" maxLength={4}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-3xl font-black text-center tracking-widest outline-none focus:border-blue-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Namamu</h3>
          <input value={joinName} onChange={e=>setJoinName(e.target.value)} placeholder="Masukkan namamu..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Pilih Warna Board</h3>
          <div className="grid grid-cols-2 gap-2">
            {BOARD_COLORS.map(c=>(
              <button key={c.value} onClick={()=>setJoinColor(c.value)} className="p-3 rounded-xl flex items-center gap-2 border-2 transition-all"
                style={{ background: joinColor===c.value?c.bg:"#f8f8f8", borderColor: joinColor===c.value?c.text:"#e5e7eb" }}>
                <span className="text-xl">{c.emoji}</span>
                <span className="text-xs font-black" style={{ color: c.text }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleJoin} disabled={loading} className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
          style={{ background:"linear-gradient(135deg,#28a745,#20c058)" }}>
          {loading?"Bergabung...":"🚪 Gabung Room"}
        </button>
      </div>
    </div>
  );

  // ── WAITING ────────────────────────────────────────────────────────────
  if (appPhase === "waiting" && room) {
    const takenColors = room.players.map(p=>p.boardColor);
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background: "#1a3a6b" }}>
          <div className="flex-1"><h1 className="text-white font-black text-lg">Ruang Tunggu</h1><p className="text-blue-300 text-xs">Menunggu pemain bergabung...</p></div>
        </div>
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kode Room</p>
            <div className="text-5xl font-black tracking-widest" style={{ color:"#1a3a6b" }}>{room.code}</div>
            <p className="text-xs text-gray-400 mt-1">Bagikan ke teman-temanmu</p>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between">
              <h3 className="font-black text-gray-700 text-sm">Pemain</h3>
              <span className="text-xs font-bold text-gray-400">{room.players.length}/{room.maxPlayers}</span>
            </div>
            {room.players.map((p,i)=>{
              const bc=BOARD_COLORS.find(c=>c.value===p.boardColor)!;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg" style={colorStyle(p.boardColor)}>{bc.emoji}</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                    {p.id===myId&&<span className="ml-2 text-[10px] bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">Kamu</span>}
                    <div className="text-xs" style={{ color:bc.text }}>{bc.label}</div>
                  </div>
                  {p.isHost&&<span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">Host 👑</span>}
                  <span className="text-sm font-bold text-gray-400">#{i+1}</span>
                </div>
              );
            })}
            {room.players.length<room.maxPlayers&&Array.from({length:room.maxPlayers-room.players.length}).map((_,i)=>{
              const available=BOARD_COLORS.filter(c=>!takenColors.includes(c.value));
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 opacity-35">
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-sm">{available[i]?.emoji||"?"}</div>
                  <span className="text-sm text-gray-400">Menunggu pemain...</span>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-around text-center">
            <div><div className="text-xs text-gray-400">Modal Awal</div><div className="font-black text-sm text-green-600">{formatRp(room.modalAwal)}</div></div>
            <div className="w-px bg-gray-100" />
            <div><div className="text-xs text-gray-400">Max Pemain</div><div className="font-black text-sm text-gray-700">{room.maxPlayers} orang</div></div>
            <div className="w-px bg-gray-100" />
            <div><div className="text-xs text-gray-400">Ronde</div><div className="font-black text-sm text-gray-700">4 Ronde</div></div>
          </div>
          {isHost?(
            <div className="flex flex-col gap-2">
              <button onClick={()=>handleStart(false)} disabled={loading||room.players.length<2}
                className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
                style={{ background: room.players.length>=2?"linear-gradient(135deg,#28a745,#20c058)":"#ccc" }}>
                {loading?"Memulai...":room.players.length<2?"Butuh minimal 2 pemain":"🎮 Mulai Permainan!"}
              </button>
              <button onClick={()=>handleStart(true)} disabled={loading}
                className="w-full py-3 rounded-2xl font-black text-sm disabled:opacity-50 active:scale-95 transition-transform border-2 border-dashed"
                style={{ background:"#fffbeb", color:"#92400e", borderColor:"#f59e0b" }}>
                🧪 Mulai Testing Solo (hapus nanti)
              </button>
            </div>
          ):(
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl mb-1 animate-pulse">⏳</div>
              <p className="text-sm font-bold text-gray-500">Menunggu host memulai...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── GAME ───────────────────────────────────────────────────────────────
  if (appPhase === "game" && room && myPlayer) {
    const currentPlayer = room.players[room.currentTurnIndex];
    const isMyTurn = currentPlayer?.id === myId;
    const myActedCSR = myPlayer.csrPaidThisRound;
    const myActedRevenue = room.actedThisPutaran.includes(myId + "_rev");
    const myActedLembur = room.actedThisPutaran.includes(myId + "_lembur");
    const myActedAction = room.actedThisPutaran.includes(myId);
    const myCafes = room.cafes.filter(c => c.ownerId === myId);
    const bc = bcInfo(myPlayer.boardColor);
    const pendingBid = room.pendingBid;
    const isBidder = pendingBid?.bidderId === myId;
    const myBidResponse = pendingBid?.responses.find(r => r.playerId === myId);

    // ── FINISHED ──
    if (room.status === "finished") {
      const sorted = [...room.players].sort((a,b)=>b.kapScore-a.kapScore);
      return (
        <div className="flex flex-col flex-1 overflow-y-auto" style={{ background:"#d6eeff" }}>
          <div className="px-4 pt-6 pb-4 text-center" style={{ background:"#1a3a6b" }}>
            <div className="text-5xl mb-2">🏆</div>
            <h1 className="text-white font-black text-xl">Permainan Selesai!</h1>
            <p className="text-blue-300 text-xs mt-1">Room: {room.code}</p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-3">
            {sorted.map((p,i)=>{
              const pbc=bcInfo(p.boardColor);
              const pCafes=room.cafes.filter(c=>c.ownerId===p.id);
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: i===0?"2px solid #f59e0b":"none" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{["🥇","🥈","🥉","4️⃣"][i]}</span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-black" style={colorStyle(p.boardColor)}>{pbc.emoji}</div>
                    <div className="flex-1">
                      <div className="font-black text-gray-800 text-sm">{p.name}{p.id===myId?" (Kamu)":""}</div>
                      <div className="text-xs" style={{ color:pbc.text }}>{pbc.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-2xl" style={{ color:"#1a3a6b" }}>{p.kapScore}</div>
                      <div className="text-[10px] text-gray-400">KAP</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <KAPBar label="Kreativitas" value={p.kap.kreativitas} color="#2478d4"/>
                    <KAPBar label="Social Network" value={p.kap.socialNetworking} color="#28a745"/>
                    <KAPBar label="Locus of Control" value={p.kap.internalLocus} color="#9b59b6"/>
                    <KAPBar label="Toleransi Ambiguitas" value={p.kap.toleransiAmbiguitas} color="#f0a020"/>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Uang: <strong>{formatRp(p.money)}</strong></span>
                    <span className="text-xs text-gray-500">Cafe: <strong>{pCafes.length}</strong></span>
                    {p.hutang>0&&<span className="text-xs text-red-500">Hutang: {formatRp(p.hutang)}</span>}
                  </div>
                </div>
              );
            })}
            <button onClick={()=>navigate("/")} className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-95 transition-transform" style={{ background:"linear-gradient(135deg,#1a3a6b,#2478d4)" }}>
              🏠 Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 overflow-hidden" style={{ background:"#d6eeff" }}>
        {/* Top Bar */}
        <div className="flex-shrink-0" style={{ background:"#1a3a6b" }}>
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-base" style={colorStyle(myPlayer.boardColor)}>{bc.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-black text-sm truncate">{myPlayer.name}</div>
              <div className="text-blue-300 text-[10px]">
                <span className="font-bold text-yellow-300">Ronde {room.currentRonde}/4</span>{" · "}
                Putaran {room.currentPutaran}{" · "}
                <span className="font-bold text-blue-200">{{ csr:"CSR", operational:"Aksi", revenue:"Pendapatan", lembur_offer:"Lembur", finished:"Selesai" }[room.phase]}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-black text-sm text-white">{formatRp(myPlayer.money)}</div>
              <div className="text-[10px] text-blue-300">KAP: <span className="text-yellow-300 font-black">{myPlayer.kapScore}</span></div>
            </div>
            {isHost&&<button onClick={()=>{if(confirm("Akhiri permainan?"))post("/finish-early",{})}} className="ml-1 text-red-300 text-[10px] font-bold border border-red-400 px-1.5 py-0.5 rounded-lg">Akhiri</button>}
          </div>
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
            {room.players.map((p,i)=>{
              const pbc=bcInfo(p.boardColor);
              const isCurrent=p.id===currentPlayer?.id&&room.phase==="operational";
              return (
                <div key={p.id} className="flex-shrink-0 px-2 py-1 rounded-xl min-w-[60px]"
                  style={{ background: isCurrent?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)", border: isCurrent?"2px solid rgba(255,255,255,0.5)":"2px solid transparent" }}>
                  <div className="flex items-center gap-1"><span className="text-sm">{pbc.emoji}</span><span className="text-white font-black text-[10px] truncate max-w-[44px]">{p.id===myId?"Kamu":p.name}</span></div>
                  <div className="font-black text-[10px] text-yellow-300">{p.kapScore} KAP</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {err&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}

          {/* ── PENDING BID NOTIFICATION ── */}
          {pendingBid && pendingBid.status === "pending" && !isBidder && !myBidResponse && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏪</span>
                <div>
                  <h3 className="font-black text-purple-700 text-sm">Ada Penawaran Expand!</h3>
                  <p className="text-xs text-gray-500">{room.players.find(p=>p.id===pendingBid.bidderId)?.name} ingin membeli <strong>{pendingBid.cafeName}</strong></p>
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 mb-3 text-center">
                <div className="text-xs text-gray-400 mb-0.5">Harga Penawaran</div>
                <div className="font-black text-xl text-purple-700">{formatRp(pendingBid.openPrice)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>handleBidRespond(false)} disabled={loading}
                  className="flex-1 py-3 rounded-xl font-black text-sm bg-red-50 text-red-600 border border-red-200 disabled:opacity-50">
                  ✕ Tolak
                </button>
                <button onClick={()=>handleBidRespond(true)} disabled={loading}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-50"
                  style={{ background:"#9b59b6" }}>
                  ✓ Setuju
                </button>
              </div>
            </div>
          )}
          {pendingBid && pendingBid.status === "pending" && !isBidder && myBidResponse && (
            <div className="bg-purple-50 rounded-2xl p-3 text-center border border-purple-200">
              <span className="text-sm font-bold text-purple-600">Menunggu respons pemain lain untuk bidding {pendingBid.cafeName}...</span>
            </div>
          )}
          {pendingBid && pendingBid.status !== "pending" && (
            <div className={`rounded-2xl p-3 text-center ${pendingBid.status==="accepted"?"bg-green-50 border border-green-200":"bg-red-50 border border-red-200"}`}>
              <span className={`text-sm font-bold ${pendingBid.status==="accepted"?"text-green-600":"text-red-600"}`}>
                {pendingBid.status==="accepted"?`✅ Bid ${pendingBid.cafeName} berhasil!`:`❌ Bid ${pendingBid.cafeName} ditolak`}
              </span>
            </div>
          )}
          {pendingBid && pendingBid.status === "pending" && isBidder && (
            <div className="bg-purple-50 rounded-2xl p-3 text-center border border-purple-200">
              <div className="text-2xl mb-1 animate-pulse">⏳</div>
              <span className="text-sm font-bold text-purple-600">Menunggu pemain lain menyetujui bid {pendingBid.cafeName}...</span>
              <div className="mt-2 flex gap-1 justify-center flex-wrap">
                {room.players.filter(p=>p.id!==myId).map(p=>{
                  const resp=pendingBid.responses.find(r=>r.playerId===p.id);
                  return <span key={p.id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${resp?resp.accepted?"bg-green-100 text-green-600":"bg-red-100 text-red-600":"bg-gray-100 text-gray-500"}`}>{p.name} {resp?resp.accepted?"✓":"✕":"⏳"}</span>;
                })}
              </div>
            </div>
          )}

          {/* ── CSR PHASE ── */}
          {room.phase==="csr"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">💝</span><h3 className="font-black text-gray-800 text-base">Fase CSR – Ronde {room.currentRonde}</h3></div>
              <p className="text-xs text-gray-500 mb-4">Bayar untuk dapat poin KAP. Opsional.</p>
              {myActedCSR?(
                <div className="text-center py-3 bg-green-50 rounded-xl">
                  <span className="text-2xl">✅</span>
                  <p className="text-sm font-bold text-green-700 mt-1">Sudah memilih CSR</p>
                  <div className="flex justify-center gap-2 mt-2 flex-wrap">
                    {room.players.map(p=>(
                      <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:p.csrPaidThisRound?"#dcfce7":"#fee2e2", color:p.csrPaidThisRound?"#16a34a":"#dc2626" }}>
                        {p.id===myId?"Kamu":p.name} {p.csrPaidThisRound?"✓":"⏳"}
                      </span>
                    ))}
                  </div>
                </div>
              ):(
                <div className="flex flex-col gap-2">
                  {[{amount:4,kap:1,color:"#2478d4"},{amount:7,kap:2,color:"#9b59b6"}].map(opt=>(
                    <button key={opt.amount} onClick={()=>handleCSR(opt.amount)} disabled={loading||myPlayer.money<opt.amount}
                      className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 active:scale-95 transition-transform"
                      style={{ background:opt.color }}>
                      Bayar Rp.{opt.amount} → +{opt.kap} KAP{myPlayer.money<opt.amount?" (uang kurang)":""}
                    </button>
                  ))}
                  <button onClick={()=>handleCSR(null)} disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-500">Skip CSR</button>
                </div>
              )}
            </div>
          )}

          {/* ── OPERATIONAL PHASE ── */}
          {room.phase==="operational"&&(
            <>
              {isMyTurn && !myActedAction && !pendingBid ? (
                <>
                  {/* Step: choose action */}
                  {actionStep === null && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1"><span className="text-2xl">🎮</span><h3 className="font-black text-gray-800 text-base">Giliranmu! Pilih Aksi</h3></div>
                      <p className="text-xs text-gray-400 mb-4">Pilih 1 aksi. Aksi sama dengan pemain sebelumnya menaikkan Toleransi Ambiguitas.</p>
                      <div className="flex flex-col gap-2">
                        <button onClick={()=>setActionStep({action:"upgrade",step:"select_cafe"})}
                          className="w-full p-3.5 rounded-xl text-left flex items-center gap-3 active:scale-95 transition-transform"
                          style={{ background:"#eff6ff", border:"2px solid #bfdbfe" }}>
                          <span className="text-2xl">⬆️</span>
                          <div className="flex-1">
                            <div className="font-black text-blue-700 text-sm">Upgrade</div>
                            <div className="text-xs text-gray-500">Naikkan Kreativitas. Tambah menu, harga, kursi, atau pindahkan item ke cafe lain.</div>
                          </div>
                          <span className="text-gray-400 text-lg">›</span>
                        </button>
                        <button onClick={()=>setActionStep({action:"social",step:"select_area"})}
                          className="w-full p-3.5 rounded-xl text-left flex items-center gap-3 active:scale-95 transition-transform"
                          style={{ background:"#f0fdf4", border:"2px solid #bbf7d0" }}>
                          <span className="text-2xl">🤝</span>
                          <div className="flex-1">
                            <div className="font-black text-green-700 text-sm">Social</div>
                            <div className="text-xs text-gray-500">Naikkan Social Networking. Bayar Rp.{myPlayer.kap.socialNetworking+1}, tambah 1 pelanggan ke area pilihan.</div>
                          </div>
                          <span className="text-gray-400 text-lg">›</span>
                        </button>
                        <button onClick={()=>setActionStep({action:"expand",step:"select_cafe"})}
                          className="w-full p-3.5 rounded-xl text-left flex items-center gap-3 active:scale-95 transition-transform"
                          style={{ background:"#faf5ff", border:"2px solid #e9d5ff" }}>
                          <span className="text-2xl">🏪</span>
                          <div className="flex-1">
                            <div className="font-black text-purple-700 text-sm">Expand</div>
                            <div className="text-xs text-gray-500">Naikkan Locus of Control. Beli cafe melalui bidding atau buy out langsung.</div>
                          </div>
                          <span className="text-gray-400 text-lg">›</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── UPGRADE FLOW ── */}
                  {actionStep?.action==="upgrade" && actionStep.step==="select_cafe" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={()=>setActionStep(null)} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-blue-700 text-base">⬆️ Upgrade – Pilih Cafe</h3>
                      </div>
                      {myCafes.length===0?(<p className="text-sm text-gray-400 text-center py-4">Kamu belum punya cafe untuk di-upgrade.<br/>Gunakan Expand untuk membeli cafe.</p>):(
                        <div className="flex flex-col gap-2">
                          {myCafes.map(c=>{
                            const cbc=bcInfo(c.area);
                            return (
                              <button key={c.id} onClick={()=>setActionStep({action:"upgrade",step:"select_type",cafeId:c.id,cafeName:c.name})}
                                className="p-3 rounded-xl flex items-center gap-3 border-2 active:scale-95 transition-transform"
                                style={{ background:cbc.bg, borderColor:cbc.text+"40" }}>
                                <span className="text-2xl">{cbc.emoji}</span>
                                <div className="flex-1 text-left">
                                  <div className="font-black text-sm" style={{ color:cbc.text }}>{c.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {c.seats} kursi · {c.menuItems.length===0?"Belum ada menu":c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}×${m.count}`).join(" ")}
                                    {c.socialCustomers>0&&` · 👥×${c.socialCustomers}`}
                                  </div>
                                </div>
                                <span className="text-gray-400 text-lg">›</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {actionStep?.action==="upgrade" && actionStep.step==="select_type" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={()=>setActionStep({action:"upgrade",step:"select_cafe"})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-blue-700 text-base">⬆️ {actionStep.cafeName}</h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Kreativitas: {myPlayer.kap.kreativitas} → {Math.min(7,myPlayer.kap.kreativitas+1)}</p>
                      <div className="flex flex-col gap-2">
                        {[
                          {type:"add_menu" as const, icon:"🍽", label:"Tambah Menu", desc:"Tambah satu item menu baru ke cafe ini"},
                          {type:"raise_price" as const, icon:"💹", label:"Naikkan Harga", desc:"Naikkan harga menu yang sudah ada (+1)"},
                          {type:"add_seats" as const, icon:"🪑", label:"Tambah Kursi", desc:`Tambah 1 kursi (sekarang ${myCafes.find(c=>c.id===actionStep.cafeId)?.seats||0} kursi)`},
                          {type:"move" as const, icon:"↔️", label:"Pindahkan Item", desc:"Pindahkan menu ke cafe milikmu yang lain"},
                        ].map(opt=>(
                          <button key={opt.type}
                            onClick={()=>{
                              if(opt.type==="add_seats"){
                                submitAction({action:"upgrade",cafeId:actionStep.cafeId,upgradeType:"add_seats"});
                              } else {
                                setActionStep({action:"upgrade",step:"select_menu",cafeId:actionStep.cafeId,upgradeType:opt.type,cafeName:actionStep.cafeName});
                              }
                            }}
                            className="p-3 rounded-xl flex items-center gap-3 border-2 border-blue-100 active:scale-95 transition-transform bg-blue-50">
                            <span className="text-2xl">{opt.icon}</span>
                            <div className="flex-1 text-left">
                              <div className="font-black text-blue-700 text-sm">{opt.label}</div>
                              <div className="text-xs text-gray-500">{opt.desc}</div>
                            </div>
                            <span className="text-gray-400 text-lg">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {actionStep?.action==="upgrade" && actionStep.step==="select_menu" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={()=>setActionStep({action:"upgrade",step:"select_type",cafeId:actionStep.cafeId,cafeName:actionStep.cafeName})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-blue-700 text-base">
                          {{add_menu:"Pilih Menu Baru",raise_price:"Pilih Menu (naikkan harga)",move:"Pilih Menu (pindahkan)"}[actionStep.upgradeType]||"Pilih Menu"}
                        </h3>
                      </div>
                      {actionStep.upgradeType==="move" && myCafes.length<2 && (
                        <p className="text-sm text-red-500 font-bold text-center py-2">Kamu butuh minimal 2 cafe untuk memindahkan item.</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {MENU_TYPES.map(mt=>{
                          const info=MENU_INFO[mt];
                          const cafe=myCafes.find(c=>c.id===actionStep.cafeId);
                          const hasItem=cafe?.menuItems.some(m=>m.type===mt);
                          const disabled=(actionStep.upgradeType==="raise_price"||actionStep.upgradeType==="move")&&!hasItem;
                          return (
                            <button key={mt} disabled={!!disabled}
                              onClick={()=>{
                                if(actionStep.upgradeType==="move"){
                                  setActionStep({action:"upgrade",step:"select_move_target",cafeId:actionStep.cafeId,menuType:mt,cafeName:actionStep.cafeName});
                                } else {
                                  submitAction({action:"upgrade",cafeId:actionStep.cafeId,upgradeType:actionStep.upgradeType,menuType:mt});
                                }
                              }}
                              className="p-3 rounded-xl flex flex-col items-center gap-1 border-2 border-blue-100 active:scale-95 transition-transform disabled:opacity-30"
                              style={{ background: disabled?"#f5f5f5":"#eff6ff" }}>
                              <span className="text-2xl">{info.emoji}</span>
                              <span className="font-black text-blue-700 text-xs">{info.label}</span>
                              <span className="text-[10px] text-gray-400">Harga: Rp.{info.defaultPrice}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {actionStep?.action==="upgrade" && actionStep.step==="select_move_target" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={()=>setActionStep({action:"upgrade",step:"select_menu",cafeId:actionStep.cafeId,upgradeType:"move",cafeName:actionStep.cafeName})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-blue-700 text-base">↔️ Pindah ke Cafe Mana?</h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        {myCafes.filter(c=>c.id!==actionStep.cafeId).map(c=>{
                          const cbc=bcInfo(c.area);
                          return (
                            <button key={c.id} onClick={()=>submitAction({action:"upgrade",cafeId:actionStep.cafeId,upgradeType:"move",menuType:actionStep.menuType,targetCafeId:c.id})}
                              className="p-3 rounded-xl flex items-center gap-3 border-2 active:scale-95 transition-transform"
                              style={{ background:cbc.bg, borderColor:cbc.text+"40" }}>
                              <span className="text-2xl">{cbc.emoji}</span>
                              <div className="flex-1 text-left">
                                <div className="font-black text-sm" style={{ color:cbc.text }}>{c.name}</div>
                                <div className="text-xs text-gray-500">{c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}×${m.count}`).join(" ")||"Kosong"}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── SOCIAL FLOW ── */}
                  {actionStep?.action==="social" && actionStep.step==="select_area" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={()=>setActionStep(null)} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-green-700 text-base">🤝 Social – Pilih Area</h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        Social Networking: {myPlayer.kap.socialNetworking} → {Math.min(7,myPlayer.kap.socialNetworking+1)}<br/>
                        Biaya: <strong>Rp.{myPlayer.kap.socialNetworking+1}</strong> · Tambah 1 pelanggan ke area yang dipilih
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <input type="checkbox" id="hutang" checked={hutangMode} onChange={e=>setHutangMode(e.target.checked)} className="w-4 h-4 accent-orange-500"/>
                        <label htmlFor="hutang" className="text-xs font-bold text-orange-600">Bayar via hutang (naikkan Bersedia Risiko)</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {BOARD_COLORS.map(c=>{
                          const cafesInArea=room.cafes.filter(ca=>ca.area===c.value);
                          const totalCustomers=cafesInArea.reduce((s,ca)=>s+ca.socialCustomers,0);
                          return (
                            <button key={c.value} onClick={()=>submitAction({action:"social",area:c.value,hutang:hutangMode})}
                              className="p-3 rounded-xl flex flex-col items-center gap-1 border-2 active:scale-95 transition-transform"
                              style={{ background:c.bg, borderColor:c.text }}>
                              <span className="text-2xl">{c.emoji}</span>
                              <span className="font-black text-xs" style={{ color:c.text }}>{c.label.split(" – ")[1]}</span>
                              <span className="text-[10px] text-gray-500">👥 {totalCustomers} pelanggan</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── EXPAND FLOW ── */}
                  {actionStep?.action==="expand" && actionStep.step==="select_cafe" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={()=>setActionStep(null)} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-purple-700 text-base">🏪 Expand – Pilih Cafe</h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Pilih cafe yang ingin dibeli. Locus of Control: {myPlayer.kap.internalLocus}→{Math.min(7,myPlayer.kap.internalLocus+1)}</p>
                      {room.cafes.filter(c=>c.ownerId!==myId).length===0?(<p className="text-sm text-gray-400 text-center py-4">Tidak ada cafe yang bisa dibeli.</p>):(
                        <div className="flex flex-col gap-2">
                          {room.cafes.filter(c=>c.ownerId!==myId).map(c=>{
                            const cbc=bcInfo(c.area);
                            const ownerName=c.ownerId?room.players.find(p=>p.id===c.ownerId)?.name||"?":"Tersedia";
                            return (
                              <button key={c.id} onClick={()=>setActionStep({action:"expand",step:"bid_options",cafeId:c.id,cafeName:c.name,basePrice:c.basePrice})}
                                className="p-3 rounded-xl flex items-center gap-3 border-2 active:scale-95 transition-transform"
                                style={{ background:cbc.bg, borderColor:cbc.text+"50" }}>
                                <span className="text-2xl">{cbc.emoji}</span>
                                <div className="flex-1 text-left">
                                  <div className="font-black text-sm" style={{ color:cbc.text }}>{c.name}</div>
                                  <div className="text-xs text-gray-500">Pemilik: {ownerName} · Harga dasar: Rp.{c.basePrice}</div>
                                  <div className="text-xs text-gray-400">{c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}×${m.count}`).join(" ")||"Kosong"}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-[10px] text-purple-600 font-bold">Buy Out</div>
                                  <div className="font-black text-sm text-purple-700">Rp.{c.basePrice*3}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {actionStep?.action==="expand" && actionStep.step==="bid_options" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={()=>setActionStep({action:"expand",step:"select_cafe"})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-purple-700 text-base">🏪 {actionStep.cafeName}</h3>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3 mb-3">
                        <div className="flex justify-between text-xs font-bold text-purple-700">
                          <span>Harga dasar</span><span>Rp.{actionStep.basePrice}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-purple-700 mt-1">
                          <span>Max bid / Buy Out</span><span>Rp.{actionStep.basePrice*3}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={()=>setActionStep({action:"expand",step:"open_bid",cafeId:actionStep.cafeId,cafeName:actionStep.cafeName,basePrice:actionStep.basePrice})}
                          className="w-full p-4 rounded-xl flex items-center gap-3 border-2 border-purple-200 active:scale-95 transition-transform bg-purple-50">
                          <span className="text-2xl">🤝</span>
                          <div className="flex-1 text-left">
                            <div className="font-black text-purple-700 text-sm">Open Bid</div>
                            <div className="text-xs text-gray-500">Tawar ke pemain lain, tunggu persetujuan. Mulai dari Rp.{actionStep.basePrice}.</div>
                          </div>
                        </button>
                        <button onClick={()=>submitAction({action:"expand",cafeId:actionStep.cafeId,bidType:"buyout",hutang:myPlayer.money<actionStep.basePrice*3})}
                          className="w-full p-4 rounded-xl flex items-center gap-3 border-2 border-purple-300 active:scale-95 transition-transform"
                          style={{ background:"#9b59b6" }}>
                          <span className="text-2xl">💰</span>
                          <div className="flex-1 text-left">
                            <div className="font-black text-white text-sm">Buy Out Langsung</div>
                            <div className="text-xs text-purple-200">Bayar 3× harga = Rp.{actionStep.basePrice*3} sekarang juga.{myPlayer.money<actionStep.basePrice*3?" (Via hutang)":""}</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {actionStep?.action==="expand" && actionStep.step==="open_bid" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={()=>setActionStep({action:"expand",step:"bid_options",cafeId:actionStep.cafeId,cafeName:actionStep.cafeName,basePrice:actionStep.basePrice})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-purple-700 text-base">🤝 Open Bid: {actionStep.cafeName}</h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Tentukan harga penawaranmu. Min: Rp.{actionStep.basePrice} · Max: Rp.{actionStep.basePrice*3}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-gray-500 font-semibold text-sm">Rp</span>
                        <input type="number" value={bidPriceInput} onChange={e=>setBidPriceInput(e.target.value)}
                          placeholder={`${actionStep.basePrice}`} min={actionStep.basePrice} max={actionStep.basePrice*3}
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-base font-bold outline-none focus:border-purple-400"/>
                      </div>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {[1,2,3].map(mult=>(
                          <button key={mult} onClick={()=>setBidPriceInput(String(actionStep.basePrice*mult))}
                            className="px-3 py-1.5 rounded-xl font-bold text-xs border-2" style={{ borderColor:"#e9d5ff", background: bidPriceInput===String(actionStep.basePrice*mult)?"#9b59b6":"#faf5ff", color: bidPriceInput===String(actionStep.basePrice*mult)?"white":"#9b59b6" }}>
                            {mult}× = Rp.{actionStep.basePrice*mult}
                          </button>
                        ))}
                      </div>
                      <button onClick={()=>submitAction({action:"expand",cafeId:actionStep.cafeId,bidType:"open_bid",bidPrice:parseInt(bidPriceInput)||actionStep.basePrice})}
                        disabled={loading||!bidPriceInput}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white disabled:opacity-50 active:scale-95 transition-transform"
                        style={{ background:"#9b59b6" }}>
                        {loading?"Mengirim bid...":"Kirim Penawaran ke Semua Pemain →"}
                      </button>
                    </div>
                  )}
                </>
              ) : !isMyTurn && room.phase==="operational" ? (
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-3xl animate-pulse">⏳</span>
                  <p className="text-sm font-bold text-gray-600 mt-1">Giliran <span className="text-gray-800">{currentPlayer?.name}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Tunggu giliranmu...</p>
                </div>
              ) : myActedAction ? (
                <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                  <span className="text-2xl">✅</span>
                  <p className="text-xs font-bold text-green-600 mt-1">Aksi selesai — {room.actedThisPutaran.filter(x=>!x.includes("_")).length}/{room.players.length} pemain</p>
                </div>
              ) : null}

              {/* My cafes overview */}
              {myCafes.length>0&&(
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between">
                    <h3 className="font-black text-gray-700 text-sm">☕ Cafe Milikku</h3>
                    <span className="text-xs text-gray-400">{myCafes.length} cafe</span>
                  </div>
                  {myCafes.map(c=>{
                    const cbc=bcInfo(c.area);
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                        <span className="text-xl">{cbc.emoji}</span>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800 text-sm">{c.name}</div>
                          <div className="text-[10px] text-gray-400">
                            🪑×{c.seats} · {c.menuItems.length===0?"Belum ada menu":c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}${m.type}(Rp.${m.price})×${m.count}`).join(", ")}
                            {c.socialCustomers>0&&` · 👥×${c.socialCustomers}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── REVENUE PHASE ── */}
          {room.phase==="revenue"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">📊</span><h3 className="font-black text-gray-800 text-base">Hitung Pendapatan</h3></div>
              <p className="text-xs text-gray-400 mb-4">Hitung pelanggan × harga menu di cafe kamu, lalu masukkan pajak cafe.</p>
              {myCafes.length>0&&(
                <div className="bg-blue-50 rounded-xl p-3 mb-3">
                  <div className="text-xs font-bold text-blue-600 mb-1">Ringkasan Cafe-mu:</div>
                  {myCafes.map(c=>(
                    <div key={c.id} className="text-[10px] text-gray-600">
                      {bcInfo(c.area).emoji} {c.name}: 👥{c.socialCustomers} · {c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}Rp.${m.price}×${m.count}`).join(" ")||"kosong"}
                    </div>
                  ))}
                </div>
              )}
              {myActedRevenue?(
                <div className="text-center py-3 bg-green-50 rounded-xl">
                  <span className="text-2xl">✅</span><p className="text-sm font-bold text-green-700 mt-1">Pendapatan tercatat</p><p className="text-xs text-gray-400">Menunggu pemain lain...</p>
                </div>
              ):(
                <>
                  <div className="flex flex-col gap-2 mb-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">💵 Pendapatan</label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Rp</span>
                        <input type="number" value={pendapatan} onChange={e=>setPendapatan(e.target.value)} placeholder="0"
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-green-400"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">🏛 Pajak Cafe</label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Rp</span>
                        <input type="number" value={pajak} onChange={e=>setPajak(e.target.value)} placeholder="0"
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-red-400"/>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center mb-3">
                    <span className="text-xs text-gray-500">Hasil Bersih: </span>
                    <span className="font-black text-sm" style={{ color:(parseInt(pendapatan)||0)-(parseInt(pajak)||0)>=0?"#16a34a":"#dc2626" }}>
                      {formatRp((parseInt(pendapatan)||0)-(parseInt(pajak)||0))}
                    </span>
                  </div>
                  <button onClick={handleRevenue} disabled={loading}
                    className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 active:scale-95 transition-transform"
                    style={{ background:"linear-gradient(135deg,#16a34a,#15803d)" }}>
                    {loading?"Menyimpan...":"✅ Konfirmasi Pendapatan"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── LEMBUR PHASE ── */}
          {room.phase==="lembur_offer"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">⏰</span><h3 className="font-black text-gray-800 text-base">Tawaran Lembur</h3></div>
              <p className="text-xs text-gray-400 mb-4">Bayar <strong>Rp.5</strong> untuk 1 putaran ekstra. Pemain yang skip tidak ikut lembur.</p>
              {myActedLembur?(
                <div className="text-center py-3 bg-green-50 rounded-xl">
                  <span className="text-2xl">✅</span><p className="text-sm font-bold text-green-700 mt-1">{myPlayer.lemburThisRound?"Memilih lembur":"Skip lembur"}</p>
                </div>
              ):(
                <div className="flex gap-2">
                  <button onClick={()=>handleLembur(true)} disabled={loading||myPlayer.money<5}
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40"
                    style={{ background:"#f0a020" }}>⏰ Lembur (Rp.5){myPlayer.money<5?" ✗":""}</button>
                  <button onClick={()=>handleLembur(false)} disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">Skip</button>
                </div>
              )}
            </div>
          )}

          {/* ── KAP Tracker ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-700 text-sm mb-3">📊 KAP Tracker</h3>
            <div className="flex flex-col gap-2 mb-3">
              <KAPBar label="Kreativitas" value={myPlayer.kap.kreativitas} color="#2478d4"/>
              <KAPBar label="Social Networking" value={myPlayer.kap.socialNetworking} color="#28a745"/>
              <KAPBar label="Locus of Control" value={myPlayer.kap.internalLocus} color="#9b59b6"/>
              <KAPBar label="Toleransi Ambiguitas" value={myPlayer.kap.toleransiAmbiguitas} color="#f0a020"/>
              <KAPBar label="Bersedia Risiko" value={myPlayer.kap.bersediaRisiko} max={5} color="#e84393"/>
            </div>
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2 mb-2">
              <span className="text-xs font-bold text-blue-600">Total KAP</span>
              <span className="font-black text-xl text-blue-700">{myPlayer.kapScore}</span>
            </div>
            {myPlayer.hutang>0&&<div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2 mb-2">
              <span className="text-xs font-bold text-red-500">Hutang</span><span className="font-black text-sm text-red-600">{formatRp(myPlayer.hutang)}</span>
            </div>}
            {showDebt?(
              <div className="mt-2 border-2 border-orange-200 rounded-xl p-3">
                <div className="flex gap-2 mb-2">
                  {(["borrow","repay"] as const).map(a=>(
                    <button key={a} onClick={()=>setDebtAction(a)} className="flex-1 py-2 rounded-xl font-black text-xs"
                      style={{ background:debtAction===a?(a==="borrow"?"#16a34a":"#dc2626"):"#f5f5f5", color:debtAction===a?"#fff":"#666" }}>
                      {a==="borrow"?"💰 Pinjam":"💸 Bayar"}
                    </button>
                  ))}
                </div>
                {debtAction==="repay"&&<p className="text-[10px] text-orange-500 font-bold mb-2">Pinjam Rp.3 → Bayar Rp.4</p>}
                <div className="flex items-center gap-2 mb-2"><span className="text-gray-500 text-sm">Rp</span><input type="number" value={debtAmount} onChange={e=>setDebtAmount(e.target.value)} className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-orange-400"/></div>
                <div className="flex gap-2">
                  <button onClick={()=>setShowDebt(false)} className="flex-1 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">Batal</button>
                  <button onClick={handleDebt} disabled={loading||!debtAmount} className="flex-1 py-2 rounded-xl font-black text-sm text-white disabled:opacity-50" style={{ background:debtAction==="borrow"?"#16a34a":"#dc2626" }}>{loading?"...":"OK"}</button>
                </div>
              </div>
            ):(
              <button onClick={()=>setShowDebt(!showDebt)} className="w-full py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200">💳 Kelola Hutang Bank</button>
            )}
          </div>

          {/* Papan KAP semua pemain */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100"><h3 className="font-black text-gray-700 text-sm">🏆 Papan KAP</h3></div>
            {[...room.players].sort((a,b)=>b.kapScore-a.kapScore).map((p,i)=>{
              const pbc=bcInfo(p.boardColor);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-base w-5">{["🥇","🥈","🥉","4️⃣"][i]}</span>
                  <span className="text-xl">{pbc.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{p.id===myId?`${p.name} (Kamu)`:p.name}</div>
                    <div className="text-[10px]" style={{ color:pbc.text }}>{pbc.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg" style={{ color:"#1a3a6b" }}>{p.kapScore}</div>
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
