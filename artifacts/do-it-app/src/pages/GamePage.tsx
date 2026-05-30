import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "/api";

type BoardColor = "merah" | "biru" | "kuning" | "hijau";
type ActionChoice = "upgrade" | "social" | "expand";
type MenuType = "kopi" | "teh" | "kue" | "croissant";
type UpgradeType = "add_menu" | "raise_price" | "add_seats" | "move";
type GamePhase = "cafe_setup" | "csr" | "operational" | "lembur_offer" | "customer_input" | "revenue" | "end_game_sell" | "finished";

interface MenuItem { type: MenuType; count: number; price: number; }
interface CafeSlot {
  id: string; area: BoardColor; slotIndex: number; name: string;
  bidPrice: number; buyoutPrice: number; ownerId: string | null;
  menuItems: MenuItem[]; seats: number; socialCustomers: number; isSetup: boolean;
}
interface PlayerAreaLevel { area: BoardColor; level: number; }
interface CustomerInput { area: BoardColor; menuSought: MenuType[]; customerCount: number; playerId: string; }
interface PendingBid {
  cafeId: string; bidderId: string; cafeName: string; openPrice: number;
  responses: { playerId: string; accepted: boolean }[];
  status: "pending" | "accepted" | "rejected";
}
interface KAP { kreativitas: number; socialNetworking: number; internalLocus: number; toleransiAmbiguitas: number; bersediaRisiko: number; }
interface Transaction { id: string; keterangan: string; jumlah: number; tipe: "pemasukan" | "pengeluaran"; waktu: string; ronde: number; }
interface Player {
  id: string; name: string; boardColor: BoardColor; isHost: boolean;
  money: number; hutang: number; kap: KAP; kapScore: number;
  transactions: Transaction[]; lastAction: ActionChoice | null;
  csrPaidThisRound: boolean; lemburThisRound: boolean;
  areaLevels: PlayerAreaLevel[]; cafeSetupDone: boolean; cafesSold: boolean; finalKAP?: number;
}
interface Room {
  code: string; hostId: string; players: Player[];
  maxPlayers: number; modalAwal: number; currentTurnIndex: number;
  status: "waiting" | "playing" | "finished";
  currentRonde: number; currentPutaran: number;
  phase: GamePhase; actedThisPutaran: string[];
  cafes: CafeSlot[]; pendingBid: PendingBid | null;
  customerInputs: CustomerInput[];
}

type AppPhase = "lobby" | "create" | "join" | "waiting" | "game";

// Action UI state machine
type ActionStep =
  | null
  | { action: "upgrade"; step: "select_cafe" }
  | { action: "upgrade"; step: "select_type"; cafeId: string; cafeName: string }
  | { action: "upgrade"; step: "select_menu"; cafeId: string; upgradeType: UpgradeType; cafeName: string }
  | { action: "upgrade"; step: "select_move_target"; cafeId: string; menuType: MenuType }
  | { action: "social"; step: "select_area" }
  | { action: "expand"; step: "select_area" }
  | { action: "expand"; step: "input_specs"; targetArea: BoardColor }
  | { action: "expand"; step: "bid_options"; targetArea: BoardColor }
  | { action: "expand"; step: "open_bid"; targetArea: BoardColor };

const BOARD_COLORS: { value: BoardColor; label: string; sublabel: string; emoji: string; bg: string; text: string; border: string }[] = [
  { value: "merah",  label: "Merah",  sublabel:"Hotel",   emoji:"🏨", bg:"#fee2e2", text:"#dc2626", border:"#fca5a5" },
  { value: "biru",   label: "Biru",   sublabel:"Sekolah", emoji:"🏫", bg:"#dbeafe", text:"#2563eb", border:"#93c5fd" },
  { value: "kuning", label: "Kuning", sublabel:"Kantor",  emoji:"🏢", bg:"#fef9c3", text:"#ca8a04", border:"#fde047" },
  { value: "hijau",  label: "Hijau",  sublabel:"Taman",   emoji:"🌳", bg:"#dcfce7", text:"#16a34a", border:"#86efac" },
];
const MENU_INFO: Record<MenuType, { emoji: string; label: string; defaultPrice: number }> = {
  kopi:      { emoji:"☕", label:"Kopi",      defaultPrice:3 },
  teh:       { emoji:"🍵", label:"Teh",       defaultPrice:2 },
  kue:       { emoji:"🎂", label:"Kue",        defaultPrice:4 },
  croissant: { emoji:"🥐", label:"Croissant", defaultPrice:5 },
};
const MENU_TYPES: MenuType[] = ["kopi","teh","kue","croissant"];
const SOCIAL_PRIORITY: Record<BoardColor, BoardColor[]> = {
  merah:  ["merah","kuning","hijau","biru"],
  biru:   ["biru","merah","kuning","hijau"],
  kuning: ["kuning","hijau","biru","merah"],
  hijau:  ["hijau","biru","merah","kuning"],
};

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function bcInfo(bc: BoardColor) { return BOARD_COLORS.find(x=>x.value===bc)!; }
function colorStyle(bc: BoardColor) { const c=bcInfo(bc); return { background:c.bg, color:c.text }; }

function KAPBar({ label, value, max=7, color }: { label:string; value:number; max?:number; color:string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-28 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width:`${(value/max)*100}%`, background:color }}/>
      </div>
      <span className="text-[10px] font-black w-4 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

function MenuEditor({ items, onChange }: { items: MenuItem[]; onChange: (items: MenuItem[]) => void }) {
  function toggle(type: MenuType) {
    const existing = items.find(m=>m.type===type);
    if (existing) onChange(items.filter(m=>m.type!==type));
    else onChange([...items, { type, count:1, price:MENU_INFO[type].defaultPrice }]);
  }
  function setPrice(type: MenuType, price: number) {
    onChange(items.map(m=>m.type===type?{...m,price}:m));
  }
  function setCount(type: MenuType, count: number) {
    onChange(items.map(m=>m.type===type?{...m,count:Math.max(1,count)}:m));
  }
  return (
    <div className="flex flex-col gap-2">
      {MENU_TYPES.map(mt=>{
        const info=MENU_INFO[mt];
        const item=items.find(m=>m.type===mt);
        return (
          <div key={mt} className="rounded-xl border-2 overflow-hidden" style={{ borderColor:item?"#2478d4":"#e5e7eb" }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background:item?"#eff6ff":"#fafafa" }}>
              <button onClick={()=>toggle(mt)} className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor:item?"#2478d4":"#d1d5db", background:item?"#2478d4":"white" }}>
                {item&&<span className="text-white text-[10px]">✓</span>}
              </button>
              <span className="text-lg">{info.emoji}</span>
              <span className="font-bold text-sm text-gray-700 flex-1">{info.label}</span>
            </div>
            {item&&(
              <div className="flex gap-3 px-3 py-2 border-t border-blue-100 bg-blue-50">
                <div className="flex-1">
                  <div className="text-[10px] text-gray-400 mb-1">Harga (Rp)</div>
                  <input type="number" value={item.price} onChange={e=>setPrice(mt,Number(e.target.value))} min={1}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-blue-400"/>
                </div>
                <div className="w-16">
                  <div className="text-[10px] text-gray-400 mb-1">Jumlah</div>
                  <input type="number" value={item.count} onChange={e=>setCount(mt,Number(e.target.value))} min={1}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-blue-400"/>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function GamePage() {
  const navigate = useNavigate();
  const [appPhase, setAppPhase] = useState<AppPhase>("lobby");
  const [myId, setMyId] = useState("");
  const [room, setRoom] = useState<Room|null>(null);

  // Forms
  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState<BoardColor>("merah");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [modalAwal, setModalAwal] = useState("10");
  const [joinName, setJoinName] = useState("");
  const [joinColor, setJoinColor] = useState<BoardColor>("biru");
  const [joinCode, setJoinCode] = useState("");

  // Cafe setup
  const [setupCafeName, setSetupCafeName] = useState("");
  const [setupBidPrice, setSetupBidPrice] = useState("");
  const [setupMenuItems, setSetupMenuItems] = useState<MenuItem[]>([]);
  const [setupSeats, setSetupSeats] = useState("2");

  // Action flow
  const [actionStep, setActionStep] = useState<ActionStep>(null);
  const [hutangMode, setHutangMode] = useState(false);
  // Expand specs form
  const [expandBidPrice, setExpandBidPrice] = useState("");
  const [expandMenuItems, setExpandMenuItems] = useState<MenuItem[]>([]);
  const [expandSeats, setExpandSeats] = useState("2");
  const [expandCafeName, setExpandCafeName] = useState("");
  const [expandOpenBid, setExpandOpenBid] = useState("");

  // Revenue form
  const [pendapatan, setPendapatan] = useState("");
  const [bebanOps, setBebanOps] = useState("");
  // Customer input
  const [custMenuSought, setCustMenuSought] = useState<MenuType[]>([]);
  const [custCount, setCustCount] = useState("1");
  // End-game sell
  const [salePrice, setSalePrice] = useState("");
  // Debt
  const [showDebt, setShowDebt] = useState(false);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtAction, setDebtAction] = useState<"borrow"|"repay">("borrow");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const pollRoom = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API}/rooms/${code}`);
      if (res.status === 404) {
        // Room hilang (server restart atau kode salah) — kembali ke Home
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        setRoom(null);
        setAppPhase("home");
        setErr("Room tidak ditemukan. Server mungkin restart — buat room baru.");
        return;
      }
      if (!res.ok) return;
      const data: Room = await res.json();
      setRoom(data);
      if (data.status==="playing"||data.status==="finished") setAppPhase("game");
    } catch {/* ignore network errors */}
  }, []);

  useEffect(() => {
    if ((appPhase==="waiting"||appPhase==="game") && room?.code) {
      pollingRef.current = setInterval(()=>pollRoom(room.code), 2500);
      return ()=>{ if (pollingRef.current) clearInterval(pollingRef.current); };
    }
  }, [appPhase, room?.code, pollRoom]);

  async function post(path: string, body: object) {
    const res = await fetch(`${API}/rooms/${room!.code}${path}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ playerId:myId, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||"Error");
    await pollRoom(room!.code);
    return data;
  }

  async function handleCreate() {
    if (!createName.trim()) return setErr("Nama tidak boleh kosong");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/rooms`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ hostName:createName.trim(), boardColor:createColor, maxPlayers, modalAwal:parseFloat(modalAwal)||10 }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setMyId(data.playerId);
      await pollRoom(data.code);
      setAppPhase("waiting");
    } catch { setErr("Gagal terhubung"); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!joinName.trim()||!joinCode.trim()) return setErr("Lengkapi semua field");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/rooms/${joinCode.toUpperCase()}/join`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ playerName:joinName.trim(), boardColor:joinColor }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setMyId(data.playerId);
      await pollRoom(joinCode.toUpperCase());
      setAppPhase("waiting");
    } catch { setErr("Gagal terhubung"); }
    finally { setLoading(false); }
  }

  async function handleStart(testMode=false) {
    setLoading(true);
    try { await post("/start",{testMode}); }
    catch(e:unknown){ setErr(e instanceof Error?e.message:"Error"); }
    finally { setLoading(false); }
  }

  async function submitAction(body: object) {
    setLoading(true); setErr("");
    try {
      await post("/action",body);
      setActionStep(null); setHutangMode(false);
      setExpandBidPrice(""); setExpandMenuItems([]); setExpandSeats("2"); setExpandCafeName(""); setExpandOpenBid("");
    } catch(e:unknown){ setErr(e instanceof Error?e.message:"Error"); }
    finally { setLoading(false); }
  }

  const myPlayer = room?.players.find(p=>p.id===myId);
  const isHost = room?.hostId===myId;

  // ── LOBBY ──────────────────────────────────────────────────────────────
  if (appPhase==="lobby") return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background:"#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background:"#1a3a6b" }}>
        <button onClick={()=>navigate("/")} className="text-white text-2xl">‹</button>
        <div><h1 className="text-white font-black text-lg">Mulai Game</h1><p className="text-blue-300 text-xs">Buat atau gabung room</p></div>
        <span className="ml-auto text-3xl">🧮</span>
      </div>
      <div className="px-4 py-5 flex flex-col gap-4">
        {err&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
        {[{icon:"🏠",title:"Buat Room Baru",desc:"Jadi host, atur sesi & mulai permainan",phase:"create" as const,color:"#e8f4ff"},
          {icon:"🚪",title:"Gabung Room",desc:"Masukkan kode room dari host",phase:"join" as const,color:"#e8ffe8"}].map(item=>(
          <button key={item.phase} onClick={()=>{setErr("");setAppPhase(item.phase);}}
            className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm text-left w-full active:scale-95 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background:item.color }}>{item.icon}</div>
            <div><h3 className="font-black text-gray-800 text-base">{item.title}</h3><p className="text-xs text-gray-400 mt-0.5">{item.desc}</p></div>
          </button>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h4 className="font-black text-gray-700 text-sm mb-3">📖 Alur Permainan</h4>
          {[["🎯","4 Ronde","2 putaran aksi + opsi lembur"],["☕","Setup Cafe","Input karakteristik cafe di awal"],["🎮","Aksi","Upgrade / Social / Expand"],["👥","Pelanggan","Input data pelanggan akhir ronde"],["🏆","Menang","KAP tertinggi, Rp.10=1 KAP"]].map(([ic,ti,de])=>(
            <div key={ti} className="flex gap-3 mb-2 last:mb-0"><span className="text-lg">{ic}</span><div><span className="font-black text-gray-700 text-xs">{ti} </span><span className="text-gray-400 text-xs">{de}</span></div></div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── CREATE ─────────────────────────────────────────────────────────────
  if (appPhase==="create") return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background:"#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background:"#1a3a6b" }}>
        <button onClick={()=>{setErr("");setAppPhase("lobby");}} className="text-white text-2xl">‹</button>
        <h1 className="text-white font-black text-lg">Buat Room</h1>
      </div>
      <div className="px-4 py-5 flex flex-col gap-4">
        {err&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Nama Kamu (Host)</h3>
          <input value={createName} onChange={e=>setCreateName(e.target.value)} placeholder="Masukkan namamu..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400"/>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Pilih Warna Board</h3>
          <div className="grid grid-cols-2 gap-2">
            {BOARD_COLORS.map(c=>(
              <button key={c.value} onClick={()=>setCreateColor(c.value)}
                className="p-3 rounded-xl flex items-center gap-2 border-2 transition-all"
                style={{ background:createColor===c.value?c.bg:"#f8f8f8", borderColor:createColor===c.value?c.text:"#e5e7eb" }}>
                <span className="text-xl">{c.emoji}</span>
                <div><div className="text-xs font-black" style={{ color:c.text }}>{c.label}</div><div className="text-[10px] text-gray-400">{c.sublabel}</div></div>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Jumlah Pemain</h3>
          <div className="flex gap-2">{[2,3,4].map(n=>(
            <button key={n} onClick={()=>setMaxPlayers(n)} className="flex-1 py-3 rounded-xl font-black text-lg"
              style={{ background:maxPlayers===n?"#1a3a6b":"#f0f4ff", color:maxPlayers===n?"#fff":"#1a3a6b" }}>{n}</button>
          ))}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Modal Awal per Pemain</h3>
          <p className="text-xs text-gray-400 mb-2">Default: Rp.10 (sesuai aturan permainan)</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {["10","20","50","100"].map(v=>(
              <button key={v} onClick={()=>setModalAwal(v)} className="px-3 py-1.5 rounded-xl font-bold text-xs"
                style={{ background:modalAwal===v?"#1a3a6b":"#f0f4ff", color:modalAwal===v?"#fff":"#1a3a6b" }}>Rp.{v}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm font-semibold">Rp</span>
            <input type="number" value={modalAwal} onChange={e=>setModalAwal(e.target.value)}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-400"/>
          </div>
        </div>
        <button onClick={handleCreate} disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
          style={{ background:"linear-gradient(135deg,#1a3a6b,#2478d4)" }}>
          {loading?"Membuat...":"🏠 Buat Room"}
        </button>
      </div>
    </div>
  );

  // ── JOIN ───────────────────────────────────────────────────────────────
  if (appPhase==="join") return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background:"#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background:"#1a3a6b" }}>
        <button onClick={()=>{setErr("");setAppPhase("lobby");}} className="text-white text-2xl">‹</button>
        <h1 className="text-white font-black text-lg">Gabung Room</h1>
      </div>
      <div className="px-4 py-5 flex flex-col gap-4">
        {err&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Kode Room</h3>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Contoh: AB3X" maxLength={4}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-3xl font-black text-center tracking-widest outline-none focus:border-blue-400"/>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-2">Namamu</h3>
          <input value={joinName} onChange={e=>setJoinName(e.target.value)} placeholder="Masukkan namamu..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400"/>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-black text-gray-800 text-sm mb-3">Pilih Warna Board</h3>
          <div className="grid grid-cols-2 gap-2">
            {BOARD_COLORS.map(c=>(
              <button key={c.value} onClick={()=>setJoinColor(c.value)}
                className="p-3 rounded-xl flex items-center gap-2 border-2 transition-all"
                style={{ background:joinColor===c.value?c.bg:"#f8f8f8", borderColor:joinColor===c.value?c.text:"#e5e7eb" }}>
                <span className="text-xl">{c.emoji}</span>
                <div><div className="text-xs font-black" style={{ color:c.text }}>{c.label}</div><div className="text-[10px] text-gray-400">{c.sublabel}</div></div>
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleJoin} disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
          style={{ background:"linear-gradient(135deg,#28a745,#20c058)" }}>
          {loading?"Bergabung...":"🚪 Gabung Room"}
        </button>
      </div>
    </div>
  );

  // ── WAITING ────────────────────────────────────────────────────────────
  if (appPhase==="waiting"&&room) {
    const takenColors=room.players.map(p=>p.boardColor);
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background:"#d6eeff" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ background:"#1a3a6b" }}>
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
              const bc=bcInfo(p.boardColor);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg" style={colorStyle(p.boardColor)}>{bc.emoji}</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                    {p.id===myId&&<span className="ml-2 text-[10px] bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">Kamu</span>}
                    <div className="text-xs" style={{ color:bc.text }}>{bc.label} – {bc.sublabel}</div>
                  </div>
                  {p.isHost&&<span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">Host 👑</span>}
                  <span className="text-sm font-bold text-gray-400">#{i+1}</span>
                </div>
              );
            })}
            {room.players.length<room.maxPlayers&&Array.from({length:room.maxPlayers-room.players.length}).map((_,i)=>{
              const avail=BOARD_COLORS.filter(c=>!takenColors.includes(c.value));
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 opacity-35">
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300">{avail[i]?.emoji||"?"}</div>
                  <span className="text-sm text-gray-400">Menunggu pemain...</span>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-around text-center">
            <div><div className="text-xs text-gray-400">Modal Awal</div><div className="font-black text-sm text-green-600">{formatRp(room.modalAwal)}</div></div>
            <div className="w-px bg-gray-100"/>
            <div><div className="text-xs text-gray-400">Pemain</div><div className="font-black text-sm text-gray-700">{room.maxPlayers} orang</div></div>
            <div className="w-px bg-gray-100"/>
            <div><div className="text-xs text-gray-400">Ronde</div><div className="font-black text-sm text-gray-700">4 Ronde</div></div>
          </div>
          {isHost?(
            <div className="flex flex-col gap-2">
              <button onClick={()=>handleStart(false)} disabled={loading||room.players.length<2}
                className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
                style={{ background:room.players.length>=2?"linear-gradient(135deg,#28a745,#20c058)":"#ccc" }}>
                {loading?"Memulai...":room.players.length<2?"Butuh minimal 2 pemain":"🎮 Mulai Permainan!"}
              </button>
              <button onClick={()=>handleStart(true)} disabled={loading}
                className="w-full py-3 rounded-2xl font-black text-sm disabled:opacity-50 active:scale-95 border-2 border-dashed"
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
  if (appPhase==="game"&&room&&myPlayer) {
    const currentPlayer=room.players[room.currentTurnIndex];
    const isMyTurn=currentPlayer?.id===myId;
    const myActedCSR=myPlayer.csrPaidThisRound;
    const myActedRevenue=room.actedThisPutaran.includes(myId+"_rev");
    const myActedLembur=room.actedThisPutaran.includes(myId+"_lembur");
    const myActedCustomer=(room.customerInputs??[]).some(ci=>ci.playerId===myId);
    const myActedAction=room.actedThisPutaran.some(x=>x===myId);
    const myCafes=room.cafes.filter(c=>c.ownerId===myId);
    const bc=bcInfo(myPlayer.boardColor);
    const pendingBid=room.pendingBid;
    const isBidder=pendingBid?.bidderId===myId;
    const myBidResponse=pendingBid?.responses.find(r=>r.playerId===myId);
    const PHASE_LABELS: Record<string,string> = { cafe_setup:"Setup Cafe",csr:"CSR",operational:"Aksi",lembur_offer:"Lembur",customer_input:"Pelanggan",revenue:"Pendapatan",end_game_sell:"Jual Cafe",finished:"Selesai" };

    // ── FINISHED ──
    if (room.status==="finished") {
      const sorted=[...room.players].sort((a,b)=>(b.finalKAP??b.kapScore)-(a.finalKAP??a.kapScore));
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
              const moneyKAP=Math.floor(p.money/10);
              const debtPenalty=p.hutang>0?p.kap.bersediaRisiko:0;
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm" style={{ border:i===0?"2px solid #f59e0b":"none" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{["🥇","🥈","🥉","4️⃣"][i]}</span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={colorStyle(p.boardColor)}>{pbc.emoji}</div>
                    <div className="flex-1">
                      <div className="font-black text-gray-800 text-sm">{p.name}{p.id===myId?" (Kamu)":""}</div>
                      <div className="text-xs" style={{ color:pbc.text }}>{pbc.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-2xl" style={{ color:"#1a3a6b" }}>{p.finalKAP??p.kapScore}</div>
                      <div className="text-[10px] text-gray-400">KAP</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-[11px] text-gray-600 flex flex-col gap-0.5">
                    <div className="flex justify-between"><span>CSR KAP</span><span className="font-bold">+{p.csrKAP||0}</span></div>
                    <div className="flex justify-between"><span>Uang → KAP ({formatRp(p.money)} ÷ 10)</span><span className="font-bold">+{moneyKAP}</span></div>
                    {debtPenalty>0&&<div className="flex justify-between text-red-500"><span>Penalty Hutang (Bersedia Risiko lv{p.kap.bersediaRisiko})</span><span className="font-bold">-{debtPenalty}</span></div>}
                    {p.hutang>0&&<div className="flex justify-between text-red-500"><span>Sisa hutang</span><span className="font-bold">{formatRp(p.hutang)}</span></div>}
                  </div>
                </div>
              );
            })}
            <button onClick={()=>navigate("/")} className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-95"
              style={{ background:"linear-gradient(135deg,#1a3a6b,#2478d4)" }}>
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
                <span className="text-yellow-300 font-bold">Ronde {room.currentRonde}/4</span> · P{room.currentPutaran} ·{" "}
                <span className="text-blue-200 font-bold">{PHASE_LABELS[room.phase]||room.phase}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-black text-sm text-white">{formatRp(myPlayer.money)}</div>
              <div className="text-[10px] text-blue-300">KAP: <span className="text-yellow-300 font-black">{myPlayer.kapScore}</span></div>
            </div>
            {isHost&&<button onClick={()=>{if(confirm("Akhiri permainan sekarang?"))post("/finish-early",{})}} className="ml-1 text-red-300 text-[10px] font-bold border border-red-400 px-1.5 py-0.5 rounded-lg">Akhiri</button>}
          </div>
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
            {room.players.map(p=>{
              const pbc=bcInfo(p.boardColor);
              const isCurrent=p.id===currentPlayer?.id&&room.phase==="operational";
              return (
                <div key={p.id} className="flex-shrink-0 px-2 py-1 rounded-xl min-w-[60px]"
                  style={{ background:isCurrent?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)", border:isCurrent?"2px solid rgba(255,255,255,0.5)":"2px solid transparent" }}>
                  <div className="flex items-center gap-1"><span className="text-sm">{pbc.emoji}</span><span className="text-white font-black text-[10px] truncate max-w-[44px]">{p.id===myId?"Kamu":p.name}</span></div>
                  <div className="font-black text-[10px] text-yellow-300">{p.kapScore} KAP</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {err&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 font-semibold">{err}</div>}

          {/* ── PENDING BID ── */}
          {pendingBid?.status==="pending"&&!isBidder&&!myBidResponse&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏪</span>
                <div><h3 className="font-black text-purple-700 text-sm">Penawaran Expand!</h3>
                  <p className="text-xs text-gray-500">{room.players.find(p=>p.id===pendingBid.bidderId)?.name} ingin membeli <strong>{pendingBid.cafeName}</strong></p></div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 mb-3 text-center">
                <div className="text-xs text-gray-400 mb-0.5">Harga Penawaran</div>
                <div className="font-black text-xl text-purple-700">{formatRp(pendingBid.openPrice)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={async()=>{setLoading(true);try{await post("/bid-respond",{accepted:false})}catch(e:unknown){setErr(e instanceof Error?e.message:"Error")}finally{setLoading(false)}}} disabled={loading} className="flex-1 py-3 rounded-xl font-black text-sm bg-red-50 text-red-600 border border-red-200">✕ Tolak</button>
                <button onClick={async()=>{setLoading(true);try{await post("/bid-respond",{accepted:true})}catch(e:unknown){setErr(e instanceof Error?e.message:"Error")}finally{setLoading(false)}}} disabled={loading} className="flex-1 py-3 rounded-xl font-black text-sm text-white" style={{ background:"#9b59b6" }}>✓ Setuju</button>
              </div>
            </div>
          )}
          {pendingBid?.status==="pending"&&!isBidder&&myBidResponse&&(
            <div className="bg-purple-50 rounded-2xl p-3 text-center border border-purple-200">
              <span className="text-sm font-bold text-purple-600">Menunggu respons pemain lain untuk bid <strong>{pendingBid.cafeName}</strong>...</span>
            </div>
          )}
          {pendingBid&&pendingBid.status!=="pending"&&(
            <div className={`rounded-2xl p-3 text-center ${pendingBid.status==="accepted"?"bg-green-50 border border-green-200":"bg-red-50 border border-red-200"}`}>
              <span className={`text-sm font-bold ${pendingBid.status==="accepted"?"text-green-600":"text-red-600"}`}>
                {pendingBid.status==="accepted"?`✅ Bid ${pendingBid.cafeName} berhasil!`:`❌ Bid ${pendingBid.cafeName} ditolak`}
              </span>
            </div>
          )}
          {pendingBid?.status==="pending"&&isBidder&&(
            <div className="bg-purple-50 rounded-2xl p-3 text-center border border-purple-200">
              <div className="text-2xl mb-1 animate-pulse">⏳</div>
              <p className="text-sm font-bold text-purple-600">Menunggu pemain lain menyetujui bid <strong>{pendingBid.cafeName}</strong></p>
              <div className="flex gap-1 justify-center flex-wrap mt-2">
                {room.players.filter(p=>p.id!==myId).map(p=>{
                  const resp=pendingBid.responses.find(r=>r.playerId===p.id);
                  return <span key={p.id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${resp?resp.accepted?"bg-green-100 text-green-600":"bg-red-100 text-red-600":"bg-gray-100 text-gray-500"}`}>{p.name} {resp?resp.accepted?"✓":"✕":"⏳"}</span>;
                })}
              </div>
            </div>
          )}

          {/* ── CAFE SETUP ── */}
          {room.phase==="cafe_setup"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">☕</span><h3 className="font-black text-gray-800 text-base">Setup Cafe Awal</h3></div>
              <p className="text-xs text-gray-500 mb-4">Input karakteristik cafe milikmu di area <span className="font-black" style={{ color:bc.text }}>{bc.label} ({bc.sublabel})</span>. Sesuaikan dengan papan fisik.</p>
              {myPlayer.cafeSetupDone?(
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <span className="text-2xl">✅</span>
                  <p className="text-sm font-bold text-green-700 mt-1">Setup cafe selesai!</p>
                  <div className="flex gap-1 flex-wrap justify-center mt-2">
                    {room.players.map(p=>(
                      <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:p.cafeSetupDone?"#dcfce7":"#fee2e2", color:p.cafeSetupDone?"#16a34a":"#dc2626" }}>
                        {p.id===myId?"Kamu":p.name} {p.cafeSetupDone?"✓":"⏳"}
                      </span>
                    ))}
                  </div>
                </div>
              ):(
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Nama Cafe</label>
                    <input value={setupCafeName} onChange={e=>setSetupCafeName(e.target.value)} placeholder={`Kafe ${myPlayer.name}`}
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Jumlah Kursi</label>
                    <input type="number" value={setupSeats} onChange={e=>setSetupSeats(e.target.value)} min={1} placeholder="2"
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">Menu yang Tersedia</label>
                    <MenuEditor items={setupMenuItems} onChange={setSetupMenuItems}/>
                  </div>
                  <button onClick={async()=>{
                    setLoading(true);setErr("");
                    try{await post("/cafe-setup",{menuItems:setupMenuItems,seats:parseInt(setupSeats)||2,name:setupCafeName||undefined});}
                    catch(e:unknown){setErr(e instanceof Error?e.message:"Error");}
                    finally{setLoading(false);}
                  }} disabled={loading}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white disabled:opacity-50 active:scale-95"
                    style={{ background:"linear-gradient(135deg,#28a745,#20c058)" }}>
                    {loading?"Menyimpan...":"✅ Konfirmasi Setup Cafe"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CSR ── */}
          {room.phase==="csr"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">💝</span><h3 className="font-black text-gray-800 text-base">Fase CSR – Ronde {room.currentRonde}</h3></div>
              <p className="text-xs text-gray-500 mb-4">Bayar kontribusi untuk dapat KAP. Opsional, bisa skip.</p>
              {myActedCSR?(
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <span className="text-2xl">✅</span><p className="text-sm font-bold text-green-700 mt-1">Sudah memilih CSR</p>
                  <div className="flex gap-1 flex-wrap justify-center mt-2">
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
                    <button key={opt.amount} onClick={async()=>{setLoading(true);setErr("");try{await post("/csr",{amount:opt.amount})}catch(e:unknown){setErr(e instanceof Error?e.message:"Error")}finally{setLoading(false)}}}
                      disabled={loading||myPlayer.money<opt.amount}
                      className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 active:scale-95"
                      style={{ background:opt.color }}>
                      Bayar Rp.{opt.amount} → +{opt.kap} KAP{myPlayer.money<opt.amount?" (uang kurang)":""}
                    </button>
                  ))}
                  <button onClick={async()=>{setLoading(true);setErr("");try{await post("/csr",{amount:null})}catch(e:unknown){setErr(e instanceof Error?e.message:"Error")}finally{setLoading(false)}}}
                    disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-500">
                    Skip CSR (tidak bayar)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── OPERATIONAL ── */}
          {room.phase==="operational"&&(
            <>
              {isMyTurn&&!myActedAction&&!pendingBid?(
                <>
                  {/* Choose action */}
                  {actionStep===null&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1"><span className="text-2xl">🎮</span><h3 className="font-black text-gray-800 text-base">Giliran! Pilih Aksi</h3></div>
                      <p className="text-xs text-gray-400 mb-4">Aksi sama dengan pemain sebelumnya → Toleransi Ambiguitas +1</p>
                      <div className="flex flex-col gap-2">
                        {[
                          {action:"upgrade" as const,icon:"⬆️",label:"Upgrade",color:"#eff6ff",border:"#bfdbfe",text:"#1d4ed8",desc:`Kreativitas ${myPlayer.kap.kreativitas}→${Math.min(7,myPlayer.kap.kreativitas+1)}. Tambah menu, harga, kursi, atau pindah item.`},
                          {action:"social" as const,icon:"🤝",label:"Social",color:"#f0fdf4",border:"#bbf7d0",text:"#15803d",desc:`Social Networking ${myPlayer.kap.socialNetworking}→${Math.min(7,myPlayer.kap.socialNetworking+1)}. Bayar Rp.${myPlayer.kap.socialNetworking+1}, tambah pelanggan.`},
                          {action:"expand" as const,icon:"🏪",label:"Expand",color:"#faf5ff",border:"#e9d5ff",text:"#7e22ce",desc:`Locus of Control ${myPlayer.kap.internalLocus}→${Math.min(7,myPlayer.kap.internalLocus+1)}. Beli cafe via bidding atau buy out.`},
                        ].map(opt=>(
                          <button key={opt.action} onClick={()=>setActionStep({action:opt.action,step:opt.action==="upgrade"?"select_cafe":opt.action==="social"?"select_area":"select_area"})}
                            className="w-full p-3.5 rounded-xl text-left flex items-center gap-3 active:scale-95 border-2"
                            style={{ background:opt.color, borderColor:opt.border }}>
                            <span className="text-2xl">{opt.icon}</span>
                            <div className="flex-1"><div className="font-black text-sm" style={{ color:opt.text }}>{opt.label}</div><div className="text-xs text-gray-500">{opt.desc}</div></div>
                            <span className="text-gray-400 text-lg">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* UPGRADE FLOW */}
                  {actionStep?.action==="upgrade"&&actionStep.step==="select_cafe"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep(null)} className="text-gray-400 text-xl">‹</button><h3 className="font-black text-blue-700 text-base">⬆️ Pilih Cafe</h3></div>
                      {myCafes.length===0?(<p className="text-sm text-gray-400 text-center py-4">Belum punya cafe. Gunakan Expand untuk membeli.</p>):(
                        <div className="flex flex-col gap-2">
                          {myCafes.map(c=>{
                            const cbc=bcInfo(c.area);
                            return (
                              <button key={c.id} onClick={()=>setActionStep({action:"upgrade",step:"select_type",cafeId:c.id,cafeName:c.name})}
                                className="p-3 rounded-xl flex items-center gap-3 border-2 active:scale-95" style={{ background:cbc.bg, borderColor:cbc.text+"40" }}>
                                <span className="text-2xl">{cbc.emoji}</span>
                                <div className="flex-1 text-left">
                                  <div className="font-black text-sm" style={{ color:cbc.text }}>{c.name}</div>
                                  <div className="text-xs text-gray-500">🪑×{c.seats} · {c.menuItems.length===0?"Kosong":c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}×${m.count}@Rp${m.price}`).join(" ")}</div>
                                </div>
                                <span className="text-gray-400 text-lg">›</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {actionStep?.action==="upgrade"&&actionStep.step==="select_type"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep({action:"upgrade",step:"select_cafe"})} className="text-gray-400 text-xl">‹</button><h3 className="font-black text-blue-700 text-base">⬆️ {actionStep.cafeName}</h3></div>
                      <div className="flex flex-col gap-2">
                        {[
                          {type:"add_menu" as const,icon:"🍽",label:"Tambah Menu",desc:"Tambah item menu baru"},
                          {type:"raise_price" as const,icon:"💹",label:"Naikkan Harga",desc:"Naikkan harga menu yang ada +1"},
                          {type:"add_seats" as const,icon:"🪑",label:"Tambah Kursi",desc:`Kursi sekarang: ${myCafes.find(c=>c.id===actionStep.cafeId)?.seats||0}`},
                          {type:"move" as const,icon:"↔️",label:"Pindahkan Menu",desc:"Pindahkan menu ke cafe lain milikmu"},
                        ].map(opt=>(
                          <button key={opt.type} onClick={()=>{
                            if(opt.type==="add_seats"){submitAction({action:"upgrade",cafeId:actionStep.cafeId,upgradeType:"add_seats"});}
                            else setActionStep({action:"upgrade",step:"select_menu",cafeId:actionStep.cafeId,upgradeType:opt.type,cafeName:actionStep.cafeName});
                          }} className="p-3 rounded-xl flex items-center gap-3 border-2 border-blue-100 active:scale-95 bg-blue-50">
                            <span className="text-2xl">{opt.icon}</span>
                            <div className="flex-1 text-left"><div className="font-black text-blue-700 text-sm">{opt.label}</div><div className="text-xs text-gray-500">{opt.desc}</div></div>
                            <span className="text-gray-400 text-lg">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {actionStep?.action==="upgrade"&&actionStep.step==="select_menu"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep({action:"upgrade",step:"select_type",cafeId:actionStep.cafeId,cafeName:actionStep.cafeName})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-blue-700 text-base">{{add_menu:"Pilih Menu Baru",raise_price:"Naikkan Harga",move:"Pilih Menu (Pindah)"}[actionStep.upgradeType]}</h3></div>
                      <div className="grid grid-cols-2 gap-2">
                        {MENU_TYPES.map(mt=>{
                          const info=MENU_INFO[mt];
                          const cafe=myCafes.find(c=>c.id===actionStep.cafeId);
                          const hasItem=cafe?.menuItems.some(m=>m.type===mt);
                          const disabled=(actionStep.upgradeType==="raise_price"||actionStep.upgradeType==="move")&&!hasItem;
                          return (
                            <button key={mt} disabled={!!disabled}
                              onClick={()=>{
                                if(actionStep.upgradeType==="move")setActionStep({action:"upgrade",step:"select_move_target",cafeId:actionStep.cafeId,menuType:mt});
                                else submitAction({action:"upgrade",cafeId:actionStep.cafeId,upgradeType:actionStep.upgradeType,menuType:mt});
                              }}
                              className="p-3 rounded-xl flex flex-col items-center gap-1 border-2 border-blue-100 active:scale-95 disabled:opacity-30"
                              style={{ background:disabled?"#f5f5f5":"#eff6ff" }}>
                              <span className="text-2xl">{info.emoji}</span>
                              <span className="font-black text-blue-700 text-xs">{info.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {actionStep?.action==="upgrade"&&actionStep.step==="select_move_target"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep({action:"upgrade",step:"select_menu",cafeId:actionStep.cafeId,upgradeType:"move",cafeName:""})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-blue-700 text-base">↔️ Pindah ke Cafe Mana?</h3></div>
                      {myCafes.filter(c=>c.id!==actionStep.cafeId).length===0?(<p className="text-sm text-gray-400 text-center">Kamu hanya punya 1 cafe.</p>):(
                        <div className="flex flex-col gap-2">
                          {myCafes.filter(c=>c.id!==actionStep.cafeId).map(c=>{
                            const cbc=bcInfo(c.area);
                            return (
                              <button key={c.id} onClick={()=>submitAction({action:"upgrade",cafeId:actionStep.cafeId,upgradeType:"move",menuType:actionStep.menuType,targetCafeId:c.id})}
                                className="p-3 rounded-xl flex items-center gap-3 border-2 active:scale-95" style={{ background:cbc.bg, borderColor:cbc.text+"40" }}>
                                <span className="text-2xl">{cbc.emoji}</span>
                                <div className="flex-1 text-left">
                                  <div className="font-black text-sm" style={{ color:cbc.text }}>{c.name}</div>
                                  <div className="text-xs text-gray-500">{c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}×${m.count}`).join(" ")||"Kosong"}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SOCIAL FLOW */}
                  {actionStep?.action==="social"&&actionStep.step==="select_area"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1"><button onClick={()=>setActionStep(null)} className="text-gray-400 text-xl">‹</button><h3 className="font-black text-green-700 text-base">🤝 Social – Pilih Area</h3></div>
                      <p className="text-xs text-gray-400 mb-2">Social Networking: {myPlayer.kap.socialNetworking}→{Math.min(7,myPlayer.kap.socialNetworking+1)} · Biaya: <strong>Rp.{myPlayer.kap.socialNetworking+1}</strong></p>
                      <div className="flex items-center gap-2 mb-3 bg-amber-50 rounded-xl px-3 py-2">
                        <input type="checkbox" id="hutang" checked={hutangMode} onChange={e=>setHutangMode(e.target.checked)} className="w-4 h-4 accent-orange-500"/>
                        <label htmlFor="hutang" className="text-xs font-bold text-orange-600">Bayar via hutang (+Bersedia Risiko)</label>
                      </div>
                      {/* Social level info per area */}
                      <div className="mb-3 bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-gray-500 mb-2">Level Social Prioritas Area:</p>
                        {BOARD_COLORS.map(areaInfo=>{
                          const priority=SOCIAL_PRIORITY[areaInfo.value];
                          return (
                            <div key={areaInfo.value} className="flex items-center gap-1 mb-1 last:mb-0">
                              <span className="text-sm">{areaInfo.emoji}</span>
                              <span className="text-[10px] font-bold w-12" style={{ color:areaInfo.text }}>{areaInfo.label}</span>
                              <div className="flex gap-0.5 flex-1 overflow-x-auto">
                                {priority.map((pColor,rank)=>{
                                  const pInfo=bcInfo(pColor);
                                  const pPlayer=room.players.find(p=>p.boardColor===pColor);
                                  const lvl=pPlayer?.areaLevels?.find(al=>al.area===areaInfo.value)?.level??1;
                                  return (
                                    <div key={pColor} className="flex flex-col items-center px-1">
                                      <span className="text-[8px] text-gray-400">#{rank+1}</span>
                                      <span className="text-xs">{pInfo.emoji}</span>
                                      <span className="text-[9px] font-bold" style={{ color:pInfo.text }}>Lv{lvl}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {BOARD_COLORS.map(c=>{
                          const cafesInArea=(room.cafes??[]).filter(ca=>ca.area===c.value);
                          const totalCust=cafesInArea.reduce((s,ca)=>s+ca.socialCustomers,0);
                          const myLvl=(myPlayer.areaLevels??[]).find(al=>al.area===c.value)?.level??1;
                          return (
                            <button key={c.value} onClick={()=>submitAction({action:"social",area:c.value,hutang:hutangMode})}
                              className="p-3 rounded-xl flex flex-col items-center gap-1 border-2 active:scale-95"
                              style={{ background:c.bg, borderColor:c.text }}>
                              <span className="text-2xl">{c.emoji}</span>
                              <span className="font-black text-xs" style={{ color:c.text }}>{c.label}</span>
                              <div className="text-[10px] text-gray-500">👥{totalCust} · Lv{myLvl}→{Math.min(3,myLvl+1)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* EXPAND FLOW */}
                  {actionStep?.action==="expand"&&actionStep.step==="select_area"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep(null)} className="text-gray-400 text-xl">‹</button><h3 className="font-black text-purple-700 text-base">🏪 Expand – Pilih Area</h3></div>
                      <p className="text-xs text-gray-400 mb-4">Locus of Control: {myPlayer.kap.internalLocus}→{Math.min(7,myPlayer.kap.internalLocus+1)}. Pilih area yang memiliki lahan kosong.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {BOARD_COLORS.map(c=>{
                          const allCafes=room.cafes??[];
                          const slotsInArea=allCafes.filter(ca=>ca.area===c.value&&ca.slotIndex>1&&ca.ownerId===null);
                          const occupied=allCafes.filter(ca=>ca.area===c.value&&ca.ownerId!==null).length;
                          const available=slotsInArea.length;
                          return (
                            <button key={c.value} disabled={available===0}
                              onClick={()=>{setActionStep({action:"expand",step:"input_specs",targetArea:c.value});setExpandBidPrice("");setExpandMenuItems([]);setExpandSeats("2");setExpandCafeName("");setExpandOpenBid("");}}
                              className="p-3 rounded-xl flex flex-col items-center gap-1 border-2 active:scale-95 disabled:opacity-40"
                              style={{ background:c.bg, borderColor:c.text }}>
                              <span className="text-2xl">{c.emoji}</span>
                              <span className="font-black text-xs" style={{ color:c.text }}>{c.label}</span>
                              <span className="text-[10px] text-gray-500">{available} lahan kosong · {occupied} cafe</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {actionStep?.action==="expand"&&actionStep.step==="input_specs"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep({action:"expand",step:"select_area"})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-purple-700 text-base">🏪 Input Karakteristik Cafe</h3></div>
                      <div className="bg-purple-50 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                        <span className="text-lg">{bcInfo(actionStep.targetArea).emoji}</span>
                        <span className="text-xs font-bold" style={{ color:bcInfo(actionStep.targetArea).text }}>Area {bcInfo(actionStep.targetArea).label}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">Nama Cafe (opsional)</label>
                          <input value={expandCafeName} onChange={e=>setExpandCafeName(e.target.value)} placeholder={`Kafe ${bcInfo(actionStep.targetArea).label}`}
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-purple-400"/>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">Harga Bid (dari papan)</label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm">Rp</span>
                            <input type="number" value={expandBidPrice} onChange={e=>setExpandBidPrice(e.target.value)} placeholder="Harga bid"
                              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-purple-400"/>
                          </div>
                          {expandBidPrice&&<p className="text-xs text-purple-600 mt-1 font-bold">Buy Out: Rp.{(parseFloat(expandBidPrice)||0)*3} (3×)</p>}
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">Jumlah Kursi</label>
                          <input type="number" value={expandSeats} onChange={e=>setExpandSeats(e.target.value)} min={1}
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-purple-400"/>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-2 block">Menu yang Tersedia</label>
                          <MenuEditor items={expandMenuItems} onChange={setExpandMenuItems}/>
                        </div>
                        <button onClick={()=>{
                          if(!expandBidPrice){setErr("Masukkan harga bid");return;}
                          setActionStep({action:"expand",step:"bid_options",targetArea:actionStep.targetArea});
                        }} disabled={!expandBidPrice}
                          className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-50 active:scale-95"
                          style={{ background:"#9b59b6" }}>
                          Lanjut ke Pembelian →
                        </button>
                      </div>
                    </div>
                  )}
                  {actionStep?.action==="expand"&&actionStep.step==="bid_options"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep({action:"expand",step:"input_specs",targetArea:actionStep.targetArea})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-purple-700 text-base">🏪 Pilih Cara Beli</h3></div>
                      <div className="bg-purple-50 rounded-xl p-3 mb-3">
                        <div className="text-xs text-gray-500 mb-1">Area: <span className="font-bold" style={{ color:bcInfo(actionStep.targetArea).text }}>{bcInfo(actionStep.targetArea).label}</span> · {expandCafeName||"Cafe Baru"}</div>
                        <div className="flex justify-between text-xs font-bold text-purple-700 mt-1"><span>Harga Bid</span><span>Rp.{expandBidPrice}</span></div>
                        <div className="flex justify-between text-xs font-bold text-purple-700 mt-0.5"><span>Buy Out (3×)</span><span>Rp.{(parseFloat(expandBidPrice)||0)*3}</span></div>
                        <div className="text-xs text-gray-500 mt-1">{expandMenuItems.map(m=>`${MENU_INFO[m.type].emoji}×${m.count}@Rp${m.price}`).join(" ")||"Tanpa menu"} · 🪑×{expandSeats}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={()=>setActionStep({action:"expand",step:"open_bid",targetArea:actionStep.targetArea})}
                          className="w-full p-4 rounded-xl flex items-center gap-3 border-2 border-purple-200 active:scale-95 bg-purple-50">
                          <span className="text-2xl">🤝</span>
                          <div className="flex-1 text-left"><div className="font-black text-purple-700 text-sm">Open Bid</div><div className="text-xs text-gray-500">Tawar ke pemain lain, tunggu persetujuan (min Rp.{expandBidPrice}, max Rp.{(parseFloat(expandBidPrice)||0)*3})</div></div>
                        </button>
                        <button onClick={()=>submitAction({action:"expand",bidType:"buyout",hutang:myPlayer.money<(parseFloat(expandBidPrice)||0)*3,expandSpecs:{area:actionStep.targetArea,bidPrice:parseFloat(expandBidPrice)||0,menuItems:expandMenuItems,seats:parseInt(expandSeats)||2,name:expandCafeName||undefined}})}
                          disabled={loading}
                          className="w-full p-4 rounded-xl flex items-center gap-3 border-2 border-purple-300 active:scale-95 disabled:opacity-50"
                          style={{ background:"#9b59b6" }}>
                          <span className="text-2xl">💰</span>
                          <div className="flex-1 text-left"><div className="font-black text-white text-sm">Buy Out Langsung – Rp.{(parseFloat(expandBidPrice)||0)*3}</div><div className="text-xs text-purple-200">{myPlayer.money<(parseFloat(expandBidPrice)||0)*3?"Uang kurang → via hutang":"Bayar sekarang"}</div></div>
                        </button>
                      </div>
                    </div>
                  )}
                  {actionStep?.action==="expand"&&actionStep.step==="open_bid"&&(
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3"><button onClick={()=>setActionStep({action:"expand",step:"bid_options",targetArea:actionStep.targetArea})} className="text-gray-400 text-xl">‹</button>
                        <h3 className="font-black text-purple-700 text-base">🤝 Open Bid</h3></div>
                      <p className="text-xs text-gray-400 mb-3">Harga penawaranmu. Min: Rp.{expandBidPrice} · Max: Rp.{(parseFloat(expandBidPrice)||0)*3}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-gray-500 text-sm">Rp</span>
                        <input type="number" value={expandOpenBid} onChange={e=>setExpandOpenBid(e.target.value)} placeholder={expandBidPrice}
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-base font-bold outline-none focus:border-purple-400"/>
                      </div>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {[1,2,3].map(mult=>{
                          const v=String((parseFloat(expandBidPrice)||0)*mult);
                          return <button key={mult} onClick={()=>setExpandOpenBid(v)} className="px-3 py-1.5 rounded-xl font-bold text-xs border-2" style={{ borderColor:"#e9d5ff", background:expandOpenBid===v?"#9b59b6":"#faf5ff", color:expandOpenBid===v?"white":"#7e22ce" }}>{mult}× = Rp.{v}</button>;
                        })}
                      </div>
                      <button onClick={()=>submitAction({action:"expand",bidType:"open_bid",bidPrice:parseFloat(expandOpenBid)||parseFloat(expandBidPrice)||0,expandSpecs:{area:actionStep.targetArea,bidPrice:parseFloat(expandBidPrice)||0,menuItems:expandMenuItems,seats:parseInt(expandSeats)||2,name:expandCafeName||undefined}})}
                        disabled={loading||!expandOpenBid}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white disabled:opacity-50 active:scale-95" style={{ background:"#9b59b6" }}>
                        {loading?"Mengirim...":"Kirim Penawaran ke Semua →"}
                      </button>
                    </div>
                  )}
                </>
              ): !isMyTurn&&room.phase==="operational"?(
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-3xl animate-pulse">⏳</span>
                  <p className="text-sm font-bold text-gray-600 mt-1">Giliran <span className="text-gray-800">{currentPlayer?.name}</span> (Putaran {room.currentPutaran})</p>
                </div>
              ):myActedAction?(
                <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                  <span className="text-2xl">✅</span><p className="text-xs font-bold text-green-600 mt-1">Aksi selesai – Putaran {room.currentPutaran}</p>
                </div>
              ):null}

              {/* My cafes */}
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
                          <div className="text-[10px] text-gray-400">🪑×{c.seats} · {c.menuItems.length===0?"Kosong":c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}Rp${m.price}×${m.count}`).join(" ")}{c.socialCustomers>0?` · 👥×${c.socialCustomers}`:""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── LEMBUR ── */}
          {room.phase==="lembur_offer"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">⏰</span><h3 className="font-black text-gray-800 text-base">Tawaran Lembur</h3></div>
              <p className="text-xs text-gray-400 mb-4">Bayar <strong>Rp.5</strong> untuk satu putaran aksi ekstra.</p>
              {myActedLembur?(
                <div className="bg-green-50 rounded-xl p-3 text-center"><span className="text-2xl">✅</span><p className="text-sm font-bold text-green-700 mt-1">{myPlayer.lemburThisRound?"Memilih lembur":"Skip lembur"}</p></div>
              ):(
                <div className="flex gap-2">
                  <button onClick={async()=>{setLoading(true);setErr("");try{await post("/lembur",{lembur:true})}catch(e:unknown){setErr(e instanceof Error?e.message:"Error")}finally{setLoading(false)}}}
                    disabled={loading||myPlayer.money<5} className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40" style={{ background:"#f0a020" }}>
                    ⏰ Lembur (Rp.5)
                  </button>
                  <button onClick={async()=>{setLoading(true);setErr("");try{await post("/lembur",{lembur:false})}catch(e:unknown){setErr(e instanceof Error?e.message:"Error")}finally{setLoading(false)}}}
                    disabled={loading} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CUSTOMER INPUT ── */}
          {room.phase==="customer_input"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">👥</span><h3 className="font-black text-gray-800 text-base">Input Pelanggan Area {bc.label}</h3></div>
              <p className="text-xs text-gray-400 mb-4">Sesuaikan dengan kondisi di papan fisikmu. Ini menentukan pendapatan cafe di areamu.</p>
              {myActedCustomer?(
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <span className="text-2xl">✅</span><p className="text-sm font-bold text-green-700 mt-1">Data pelanggan tersimpan</p>
                  <p className="text-xs text-gray-400">Menunggu pemain lain...</p>
                  <div className="flex gap-1 flex-wrap justify-center mt-2">
                    {room.players.map(p=>(
                      <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:room.customerInputs.some(ci=>ci.playerId===p.id)?"#dcfce7":"#fee2e2", color:room.customerInputs.some(ci=>ci.playerId===p.id)?"#16a34a":"#dc2626" }}>
                        {p.id===myId?"Kamu":p.name} {room.customerInputs.some(ci=>ci.playerId===p.id)?"✓":"⏳"}
                      </span>
                    ))}
                  </div>
                </div>
              ):(
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">Menu yang Dicari Pelanggan (pilih 2-3)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MENU_TYPES.map(mt=>{
                        const info=MENU_INFO[mt];
                        const selected=custMenuSought.includes(mt);
                        return (
                          <button key={mt} onClick={()=>setCustMenuSought(prev=>prev.includes(mt)?prev.filter(m=>m!==mt):[...prev,mt])}
                            className="p-2.5 rounded-xl flex items-center gap-2 border-2 transition-all"
                            style={{ background:selected?"#eff6ff":"#fafafa", borderColor:selected?"#2478d4":"#e5e7eb" }}>
                            <span className="text-xl">{info.emoji}</span>
                            <span className="text-xs font-bold" style={{ color:selected?"#1d4ed8":"#666" }}>{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Jumlah Pelanggan di Areamu</label>
                    <p className="text-[10px] text-gray-400 mb-1">Default 1 + bonus dari aksi Social yang sudah dilakukan</p>
                    <input type="number" value={custCount} onChange={e=>setCustCount(e.target.value)} min={0} placeholder="1"
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-base font-bold outline-none focus:border-blue-400"/>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                    <strong>Bonus Social yang Ada:</strong>{" "}
                    {room.cafes.filter(c=>c.area===myPlayer.boardColor).reduce((s,c)=>s+c.socialCustomers,0)} pelanggan tambahan dari aksi Social
                  </div>
                  <button onClick={async()=>{
                    setLoading(true);setErr("");
                    try{await post("/customer-input",{menuSought:custMenuSought,customerCount:parseInt(custCount)||1});}
                    catch(e:unknown){setErr(e instanceof Error?e.message:"Error");}
                    finally{setLoading(false);}
                  }} disabled={loading}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white disabled:opacity-50 active:scale-95"
                    style={{ background:"linear-gradient(135deg,#16a34a,#15803d)" }}>
                    {loading?"Menyimpan...":"✅ Konfirmasi Data Pelanggan"}
                  </button>
                </div>
              )}
              {/* Show other players' customer inputs */}
              {room.customerInputs.length>0&&(
                <div className="mt-3 bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-500 mb-2">Data Pelanggan Yang Sudah Masuk:</p>
                  {room.customerInputs.map(ci=>{
                    const cbc=bcInfo(ci.area);
                    return (
                      <div key={ci.playerId} className="flex items-center gap-2 mb-1 last:mb-0">
                        <span className="text-sm">{cbc.emoji}</span>
                        <span className="text-xs font-bold" style={{ color:cbc.text }}>{cbc.label}</span>
                        <span className="text-xs text-gray-500">👥{ci.customerCount} · {ci.menuSought.map(m=>MENU_INFO[m].emoji).join("")}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── REVENUE / BEBAN OPERASIONAL ── */}
          {room.phase==="revenue"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">📊</span><h3 className="font-black text-gray-800 text-base">Pendapatan & Beban Operasional</h3></div>
              <p className="text-xs text-gray-400 mb-4">Hitung dari papan fisik. Pendapatan = pelanggan × harga menu. Beban = pajak cafe + biaya operasional.</p>
              {room.customerInputs.length>0&&(
                <div className="bg-blue-50 rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-bold text-blue-600 mb-1">Data Pelanggan Areamu:</p>
                  {room.customerInputs.filter(ci=>ci.area===myPlayer.boardColor).map(ci=>(
                    <div key={ci.playerId} className="text-xs text-gray-600">
                      👥 {ci.customerCount} pelanggan · Menu: {ci.menuSought.map(m=>`${MENU_INFO[m].emoji}${MENU_INFO[m].label}`).join(", ")||"-"}
                    </div>
                  ))}
                  {myCafes.map(c=>(
                    <div key={c.id} className="text-xs text-gray-600 mt-0.5">
                      {bcInfo(c.area).emoji} {c.name}: {c.menuItems.map(m=>`${MENU_INFO[m.type].emoji}Rp${m.price}×${m.count}`).join(" ")||"kosong"}
                    </div>
                  ))}
                </div>
              )}
              {myActedRevenue?(
                <div className="bg-green-50 rounded-xl p-3 text-center"><span className="text-2xl">✅</span><p className="text-sm font-bold text-green-700 mt-1">Pendapatan tercatat</p><p className="text-xs text-gray-400">Menunggu pemain lain...</p></div>
              ):(
                <>
                  <div className="flex flex-col gap-2 mb-3">
                    <div><label className="text-xs font-bold text-gray-600 mb-1 block">💵 Pendapatan Kotor</label>
                      <div className="flex items-center gap-2"><span className="text-gray-500 text-sm">Rp</span><input type="number" value={pendapatan} onChange={e=>setPendapatan(e.target.value)} placeholder="0" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-green-400"/></div></div>
                    <div><label className="text-xs font-bold text-gray-600 mb-1 block">🏛 Beban Operasional (pajak cafe, dll)</label>
                      <div className="flex items-center gap-2"><span className="text-gray-500 text-sm">Rp</span><input type="number" value={bebanOps} onChange={e=>setBebanOps(e.target.value)} placeholder="0" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-red-400"/></div></div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center mb-3">
                    <span className="text-xs text-gray-500">Hasil Bersih: </span>
                    <span className="font-black text-sm" style={{ color:(parseInt(pendapatan)||0)-(parseInt(bebanOps)||0)>=0?"#16a34a":"#dc2626" }}>
                      {formatRp((parseInt(pendapatan)||0)-(parseInt(bebanOps)||0))}
                    </span>
                  </div>
                  <button onClick={async()=>{setLoading(true);setErr("");try{await post("/revenue",{pendapatan:parseInt(pendapatan)||0,bebanOperasional:parseInt(bebanOps)||0});setPendapatan("");setBebanOps("");}catch(e:unknown){setErr(e instanceof Error?e.message:"Error");}finally{setLoading(false);}}}
                    disabled={loading} className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 active:scale-95"
                    style={{ background:"linear-gradient(135deg,#16a34a,#15803d)" }}>
                    {loading?"Menyimpan...":"✅ Konfirmasi Pendapatan"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── END GAME SELL ── */}
          {room.phase==="end_game_sell"&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><span className="text-2xl">🏪</span><h3 className="font-black text-gray-800 text-base">Jual Semua Cafe</h3></div>
              <p className="text-xs text-gray-400 mb-4">Permainan selesai! Jual semua cafemu. Hasil penjualan ditambah ke uangmu, lalu uang dikonversi ke KAP (Rp.10 = 1 KAP).</p>
              <div className="bg-amber-50 rounded-xl p-3 mb-3">
                <p className="text-xs font-bold text-amber-700 mb-1">Perhitungan Akhir:</p>
                <p className="text-[10px] text-gray-600">• Uang saat ini: {formatRp(myPlayer.money)}</p>
                <p className="text-[10px] text-gray-600">• + Hasil penjualan cafe</p>
                <p className="text-[10px] text-gray-600">• ÷ 10 = KAP dari uang</p>
                {myPlayer.hutang>0&&<p className="text-[10px] text-red-500">• Hutang belum lunas: -{myPlayer.kap.bersediaRisiko} KAP (Bersedia Risiko lv{myPlayer.kap.bersediaRisiko})</p>}
              </div>
              {myCafes.length>0&&(
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-bold text-gray-500 mb-1">Cafe yang dimiliki:</p>
                  {myCafes.map(c=>(
                    <div key={c.id} className="text-xs text-gray-600">{bcInfo(c.area).emoji} {c.name} (bid Rp.{c.bidPrice})</div>
                  ))}
                </div>
              )}
              {myPlayer.cafesSold?(
                <div className="bg-green-50 rounded-xl p-3 text-center"><span className="text-2xl">✅</span><p className="text-sm font-bold text-green-700 mt-1">Cafe sudah dijual</p><p className="text-xs text-gray-400">Menunggu pemain lain...</p></div>
              ):(
                <>
                  <div className="mb-3">
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Total Hasil Penjualan Cafe</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Rp</span>
                      <input type="number" value={salePrice} onChange={e=>setSalePrice(e.target.value)} placeholder="0"
                        className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-green-400"/>
                    </div>
                  </div>
                  <button onClick={async()=>{setLoading(true);setErr("");try{await post("/end-game-sell",{salePrice:parseInt(salePrice)||0});}catch(e:unknown){setErr(e instanceof Error?e.message:"Error");}finally{setLoading(false);}}}
                    disabled={loading} className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 active:scale-95"
                    style={{ background:"linear-gradient(135deg,#1a3a6b,#2478d4)" }}>
                    {loading?"Menyimpan...":"🏁 Konfirmasi Penjualan & Selesai"}
                  </button>
                </>
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
              <span className="text-xs font-bold text-red-500">Hutang Bank</span><span className="font-black text-sm text-red-600">{formatRp(myPlayer.hutang)}</span>
            </div>}
            {showDebt?(
              <div className="border-2 border-orange-200 rounded-xl p-3 mt-2">
                <div className="flex gap-2 mb-2">
                  {(["borrow","repay"] as const).map(a=>(
                    <button key={a} onClick={()=>setDebtAction(a)} className="flex-1 py-2 rounded-xl font-black text-xs"
                      style={{ background:debtAction===a?(a==="borrow"?"#16a34a":"#dc2626"):"#f5f5f5", color:debtAction===a?"#fff":"#666" }}>
                      {a==="borrow"?"💰 Pinjam":"💸 Bayar"}
                    </button>
                  ))}
                </div>
                {debtAction==="repay"&&<p className="text-[10px] text-orange-500 font-bold mb-2">Bayar hutang: Rp.3 pinjam → bayar Rp.4 · Bersedia Risiko -1</p>}
                <div className="flex items-center gap-2 mb-2"><span className="text-gray-500 text-sm">Rp</span><input type="number" value={debtAmount} onChange={e=>setDebtAmount(e.target.value)} className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-orange-400"/></div>
                <div className="flex gap-2">
                  <button onClick={()=>setShowDebt(false)} className="flex-1 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">Batal</button>
                  <button onClick={async()=>{setLoading(true);setErr("");try{await post("/debt",{action:debtAction,amount:parseInt(debtAmount)||0});setShowDebt(false);setDebtAmount("");}catch(e:unknown){setErr(e instanceof Error?e.message:"Error");}finally{setLoading(false);}}} disabled={loading||!debtAmount}
                    className="flex-1 py-2 rounded-xl font-black text-sm text-white disabled:opacity-50" style={{ background:debtAction==="borrow"?"#16a34a":"#dc2626" }}>
                    {loading?"...":"OK"}
                  </button>
                </div>
              </div>
            ):(
              <button onClick={()=>setShowDebt(true)} className="w-full py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 mt-1">💳 Kelola Hutang Bank</button>
            )}
          </div>

          {/* Leaderboard */}
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
