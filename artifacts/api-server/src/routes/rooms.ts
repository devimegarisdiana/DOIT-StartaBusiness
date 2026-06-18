import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type BoardColor = "merah" | "biru" | "kuning" | "hijau";
type ActionChoice = "upgrade" | "social" | "expand" | null;
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
  cafeId: string;
  expanderId: string;
  cafeName: string;
  openingPrice: number;
  buyoutPrice: number;
  currentPrice: number;
  currentHighBidderId: string;
  activePlayers: string[];
  turnOrder: string[];
  currentTurnPlayerId: string;
  status: "pending" | "sold";
  winnerId: string | null;
}
interface KAP { kreativitas: number; socialNetworking: number; internalLocus: number; toleransiAmbiguitas: number; bersediaRisiko: number; }
type Medal = MenuType;
interface Transaction { id: string; keterangan: string; jumlah: number; tipe: "pemasukan" | "pengeluaran"; waktu: string; ronde: number; }

interface Player {
  id: string; name: string; boardColor: BoardColor; isHost: boolean;
  isBot: boolean;
  joinedAt: number; money: number; hutang: number; kap: KAP;
  transactions: Transaction[]; lastAction: ActionChoice;
  csrPaidThisRound: boolean; lemburThisRound: boolean;
  csrKAP: number;
  medals: Medal[];
  medalKAP: number;
  areaLevels: PlayerAreaLevel[];
  cafeSetupDone: boolean;
  cafesSold: boolean;
  finalKAP?: number;
}

interface Room {
  code: string; hostId: string; players: Player[];
  maxPlayers: number; modalAwal: number; currentTurnIndex: number;
  status: "waiting" | "playing" | "finished";
  currentRonde: number; currentPutaran: number;
  phase: GamePhase; actedThisPutaran: string[];
  cafes: CafeSlot[];
  pendingBid: PendingBid | null;
  pendingExpand: null;
  customerInputs: CustomerInput[];
  createdAt: number;
}

// ─── File persistence ─────────────────────────────────────────────────────────

// process.cwd() = app root set by Passenger; fallback to HOME dir
const ROOMS_FILE = path.join(process.env.HOME || process.cwd(), "doit-rooms.json");
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function loadRoomsFromDisk(): Map<string, Room> {
  try {
    if (!fs.existsSync(ROOMS_FILE)) return new Map();
    const raw = fs.readFileSync(ROOMS_FILE, "utf8");
    const obj = JSON.parse(raw) as Record<string, Room>;
    const now = Date.now();
    const map = new Map<string, Room>();
    for (const [code, room] of Object.entries(obj)) {
      // Skip rooms older than TTL
      if (now - room.createdAt < ROOM_TTL_MS) map.set(code, room);
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveRoomsToDisk(map: Map<string, Room>) {
  try {
    const obj: Record<string, Room> = {};
    for (const [code, room] of map) obj[code] = room;
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(obj), "utf8");
  } catch { /* ignore */ }
}

const rooms = loadRoomsFromDisk();

function persist() {
  saveRoomsToDisk(rooms);
}

// Sync in-memory state from disk before every request so multiple
// Passenger workers (or process restarts) always see the latest data.
router.use((_req, _res, next) => {
  try {
    const fresh = loadRoomsFromDisk();
    for (const [code, room] of fresh) rooms.set(code, room);
    for (const code of rooms.keys()) {
      if (!fresh.has(code)) rooms.delete(code);
    }
  } catch { /* ignore */ }
  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function makePlayer(id: string, name: string, boardColor: BoardColor, isHost: boolean, modal: number): Player {
  const ALL_COLORS: BoardColor[] = ["merah", "biru", "kuning", "hijau"];
  return {
    id, name, boardColor, isHost, isBot: false, joinedAt: Date.now(),
    money: modal, hutang: 0,
    kap: { kreativitas: 0, socialNetworking: 0, internalLocus: 0, toleransiAmbiguitas: 0, bersediaRisiko: 0 },
    transactions: [], lastAction: null, csrPaidThisRound: false, lemburThisRound: false, csrKAP: 0, medals: [], medalKAP: 0,
    areaLevels: ALL_COLORS.map(area => ({ area, level: 1 })),
    cafeSetupDone: false, cafesSold: false,
  };
}

function addTx(player: Player, keterangan: string, jumlah: number, tipe: "pemasukan" | "pengeluaran", ronde: number) {
  player.transactions.push({
    id: generateId(), keterangan, jumlah, tipe,
    waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), ronde,
  });
}

function initCafeSlots(): CafeSlot[] {
  const areas: BoardColor[] = ["merah", "biru", "kuning", "hijau"];
  const slots: CafeSlot[] = [];
  for (const area of areas) {
    slots.push({ id: `${area}-1`, area, slotIndex: 1, name: "Cafe Saya", bidPrice: 0, buyoutPrice: 0, ownerId: null, menuItems: [], seats: 2, socialCustomers: 0, isSetup: false });
    for (let i = 2; i <= 4; i++) {
      slots.push({ id: `${area}-${i}`, area, slotIndex: i, name: `Lahan ${area} #${i}`, bidPrice: 0, buyoutPrice: 0, ownerId: null, menuItems: [], seats: 0, socialCustomers: 0, isSetup: false });
    }
  }
  return slots;
}

function assignMedals(room: Room) {
  const menuTypes: MenuType[] = ["kopi", "teh", "kue", "croissant"];
  room.players.forEach(p => { p.medals = []; p.medalKAP = 0; });
  for (const menu of menuTypes) {
    const counts = room.players.map(p => ({
      id: p.id,
      total: room.cafes.filter(c => c.ownerId === p.id).reduce((sum, c) => {
        const item = c.menuItems.find(m => m.type === menu);
        return sum + (item ? item.count : 0);
      }, 0),
    }));
    const maxCount = Math.max(...counts.map(c => c.total));
    if (maxCount <= 0) continue;
    counts.filter(c => c.total === maxCount).forEach(c => {
      const p = room.players.find(pl => pl.id === c.id);
      if (p) { p.medals.push(menu); p.medalKAP += 1; }
    });
  }
}

function calculateFinalKAP(player: Player): number {
  const k = player.kap;
  const base = k.kreativitas + k.socialNetworking + k.internalLocus + k.toleransiAmbiguitas + k.bersediaRisiko + (player.csrKAP || 0) + (player.medalKAP || 0);
  const ambPenalty = k.toleransiAmbiguitas >= 7 ? 3 : k.toleransiAmbiguitas >= 4 ? 2 : k.toleransiAmbiguitas >= 2 ? 1 : 0;
  return base - ambPenalty;
}

function advanceRonde(room: Room) {
  room.players.forEach(p => { p.csrPaidThisRound = false; p.lemburThisRound = false; p.lastAction = null; });
  room.cafes.forEach(c => { c.socialCustomers = 0; });
  room.customerInputs = [];
  if (room.currentRonde >= 4) {
    room.phase = "end_game_sell";
  } else {
    room.currentRonde += 1;
    room.currentPutaran = 1;
    room.phase = "csr";
    room.actedThisPutaran = [];
    room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
  }
}

function processBotTurns(room: Room) {
  const hasBots = room.players.some(p => p.isBot);
  if (!hasBots) return;

  let safety = 0;
  while (safety++ < 40) {
    const phase = room.phase;

    if (phase === "cafe_setup") {
      let acted = false;
      for (const bot of room.players.filter(p => p.isBot && !p.cafeSetupDone)) {
        const cafe = room.cafes.find(c => c.id === `${bot.boardColor}-1` && c.ownerId === bot.id);
        if (cafe) {
          cafe.name = `Kafe ${bot.name}`;
          cafe.menuItems = [{ type: "kopi", count: 1, price: 3 }];
          cafe.seats = 2; cafe.isSetup = true;
          bot.cafeSetupDone = true; acted = true;
        }
      }
      if (room.players.every(p => p.cafeSetupDone)) {
        room.phase = "csr"; room.currentTurnIndex = 0; continue;
      }
      if (!acted) break;
      continue;
    }

    if (phase === "csr") {
      let acted = false;
      for (const bot of room.players.filter(p => p.isBot && !p.csrPaidThisRound)) {
        bot.csrPaidThisRound = true; acted = true;
      }
      if (room.players.every(p => p.csrPaidThisRound)) {
        room.phase = "operational"; room.actedThisPutaran = [];
        room.currentTurnIndex = (room.currentRonde - 1) % room.players.length; continue;
      }
      if (!acted) break;
      continue;
    }

    if (phase === "operational") {
      const cur = room.players[room.currentTurnIndex];
      if (!cur || !cur.isBot) break;
      const botCafe = room.cafes.find(c => c.ownerId === cur.id && c.isSetup);
      if (botCafe) {
        const existing = botCafe.menuItems.find(m => m.type === "kopi");
        if (existing) existing.count += 1;
        else botCafe.menuItems.push({ type: "kopi", count: 1, price: 3 });
        cur.kap.kreativitas = Math.min(7, cur.kap.kreativitas + 1);
      }
      cur.lastAction = "upgrade";
      room.actedThisPutaran.push(cur.id);
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
      const acted2 = room.actedThisPutaran.filter(x => !x.includes("_")).length;
      if (acted2 >= room.players.length) {
        if (room.currentPutaran === 1) {
          room.currentPutaran = 2; room.actedThisPutaran = [];
          room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
          room.players.forEach(p => { p.lastAction = null; });
        } else if (room.currentPutaran === 2) {
          room.phase = "lembur_offer"; room.actedThisPutaran = [];
        } else {
          room.phase = "customer_input"; room.actedThisPutaran = [];
        }
      }
      continue;
    }

    if (phase === "lembur_offer") {
      let acted = false;
      for (const bot of room.players.filter(p => p.isBot && !room.actedThisPutaran.includes(p.id + "_lembur"))) {
        room.actedThisPutaran.push(bot.id + "_lembur"); acted = true;
      }
      if (room.players.every(p => room.actedThisPutaran.includes(p.id + "_lembur"))) {
        room.actedThisPutaran = [];
        if (room.players.some(p => p.lemburThisRound)) {
          room.phase = "operational"; room.currentPutaran = 3;
          room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
          room.players.forEach(p => { p.lastAction = null; });
        } else { room.phase = "customer_input"; }
        continue;
      }
      if (!acted) break;
      continue;
    }

    if (phase === "customer_input") {
      let acted = false;
      for (const bot of room.players.filter(p => p.isBot)) {
        const ownedAreas = [...new Set(room.cafes.filter(c => c.ownerId === bot.id && c.isSetup).map(c => c.area))] as BoardColor[];
        for (const area of ownedAreas) {
          if (!room.customerInputs.some(ci => ci.playerId === bot.id && ci.area === area)) {
            room.customerInputs.push({ area, menuSought: ["kopi"], customerCount: 2, playerId: bot.id });
            acted = true;
          }
        }
      }
      const allDoneBot = room.players.every(p => {
        const ownedAreas = [...new Set(room.cafes.filter(c => c.ownerId === p.id && c.isSetup).map(c => c.area))];
        if (ownedAreas.length === 0) return true;
        return ownedAreas.every(a => room.customerInputs.some(ci => ci.playerId === p.id && ci.area === a));
      });
      if (allDoneBot) { room.phase = "revenue"; room.actedThisPutaran = []; continue; }
      if (!acted) break;
      continue;
    }

    if (phase === "revenue") {
      let acted = false;
      for (const bot of room.players.filter(p => p.isBot && !room.actedThisPutaran.includes(p.id + "_rev"))) {
        room.actedThisPutaran.push(bot.id + "_rev"); acted = true;
      }
      if (room.players.every(p => room.actedThisPutaran.includes(p.id + "_rev"))) {
        advanceRonde(room); continue;
      }
      if (!acted) break;
      continue;
    }

    if (phase === "end_game_sell") {
      for (const bot of room.players.filter(p => p.isBot && !p.cafesSold)) {
        bot.cafesSold = true;
        room.cafes.filter(c => c.ownerId === bot.id).forEach(c => { c.ownerId = null; });
      }
      if (room.players.every(p => p.cafesSold)) {
        assignMedals(room);
        room.players.forEach(p => { p.finalKAP = calculateFinalKAP(p); });
        room.status = "finished"; room.phase = "finished";
      }
      break;
    }

    break;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/rooms", (req, res) => {
  const { hostName, boardColor, maxPlayers, modalAwal } = req.body as {
    hostName: string; boardColor?: BoardColor; maxPlayers?: number; modalAwal?: number;
  };
  if (!hostName?.trim()) { res.status(400).json({ error: "Nama wajib diisi" }); return; }
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();
  const hostId = generateId();
  const modal = Number(modalAwal) || 10;
  const room: Room = {
    code, hostId,
    players: [makePlayer(hostId, hostName.trim(), (boardColor as BoardColor) || "merah", true, modal)],
    maxPlayers: Number(maxPlayers) || 4,
    modalAwal: modal,
    status: "waiting",
    currentRonde: 0, currentPutaran: 0,
    phase: "cafe_setup", actedThisPutaran: [], currentTurnIndex: 0,
    cafes: initCafeSlots(),
    pendingBid: null, pendingExpand: null,
    customerInputs: [],
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  persist();
  res.json({ code, playerId: hostId });
});

router.get("/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  // Clear stale "sold" pendingBid (e.g. after server restart where setTimeout was lost)
  if (room.pendingBid?.status === "sold") { room.pendingBid = null; persist(); }
  res.json({
    ...room,
    players: room.players.map(p => ({
      ...p,
      kapScore: calculateFinalKAP(p),
    })),
  });
});

router.post("/rooms/:code/join", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.status !== "waiting") { res.status(400).json({ error: "Game sudah dimulai" }); return; }
  if (room.players.length >= room.maxPlayers) { res.status(400).json({ error: "Room penuh" }); return; }
  const { playerName, boardColor } = req.body as { playerName: string; boardColor: BoardColor };
  if (!playerName?.trim()) { res.status(400).json({ error: "Nama wajib diisi" }); return; }
  const takenColors = room.players.map(p => p.boardColor);
  const chosenColor: BoardColor = (boardColor && !takenColors.includes(boardColor)) ? boardColor : (["merah", "biru", "kuning", "hijau"] as BoardColor[]).find(c => !takenColors.includes(c)) || "merah";
  const playerId = generateId();
  room.players.push(makePlayer(playerId, playerName.trim(), chosenColor, false, room.modalAwal));
  persist();
  res.json({ playerId, code: room.code });
});

router.post("/rooms/:code/leave", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.status !== "waiting") { res.status(400).json({ error: "Game sudah dimulai" }); return; }
  const { playerId } = req.body as { playerId: string };
  const idx = room.players.findIndex(p => p.id === playerId && !p.isHost);
  if (idx === -1) { res.status(400).json({ error: "Pemain tidak ditemukan atau host tidak bisa leave" }); return; }
  room.players.splice(idx, 1);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/shuffle-order", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.status !== "waiting") { res.status(400).json({ error: "Game sudah dimulai" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host yang bisa mengacak urutan" }); return; }
  // Fisher-Yates shuffle
  for (let i = room.players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [room.players[i], room.players[j]] = [room.players[j], room.players[i]];
  }
  persist();
  res.json({ ok: true, order: room.players.map(p => p.name) });
});

router.post("/rooms/:code/start", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId, testMode } = req.body as { playerId: string; testMode?: boolean };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host yang bisa memulai" }); return; }
  if (!testMode && room.players.length < 2) { res.status(400).json({ error: "Minimal 2 pemain" }); return; }
  if (testMode) {
    room.players.forEach(p => { if (p.id !== playerId) p.isBot = true; });
  }
  room.players.forEach(p => {
    const startSlot = room.cafes.find(c => c.id === `${p.boardColor}-1`);
    if (startSlot) startSlot.ownerId = p.id;
  });
  room.status = "playing";
  room.currentRonde = 1; room.currentPutaran = 1;
  room.phase = "cafe_setup"; room.actedThisPutaran = []; room.currentTurnIndex = 0;
  processBotTurns(room);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/cafe-setup", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "cafe_setup") { res.status(400).json({ error: "Bukan fase setup cafe" }); return; }
  const { playerId, menuItems, seats, name } = req.body as {
    playerId: string; menuItems: MenuItem[]; seats: number; name?: string;
  };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.cafeSetupDone) { res.status(400).json({ error: "Sudah setup cafe" }); return; }
  const cafe = room.cafes.find(c => c.id === `${player.boardColor}-1` && c.ownerId === playerId);
  if (!cafe) { res.status(404).json({ error: "Cafe tidak ditemukan" }); return; }
  cafe.name = name?.trim() || `Kafe ${player.name}`;
  cafe.bidPrice = 0; cafe.buyoutPrice = 0;
  cafe.menuItems = (menuItems || []).map(m => ({ type: m.type, count: m.count || 1, price: m.price || 1 }));
  cafe.seats = Number(seats) || 2;
  cafe.isSetup = true; player.cafeSetupDone = true;
  if (room.players.every(p => p.cafeSetupDone)) { room.phase = "csr"; room.currentTurnIndex = 0; }
  processBotTurns(room);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/csr", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "csr") {
    const msg = room.phase === "cafe_setup" ? "Selesaikan setup cafe semua pemain terlebih dahulu" : "Bukan fase CSR";
    res.status(400).json({ error: msg }); return;
  }
  const { playerId, amount, kapGain } = req.body as { playerId: string; amount?: number | null; kapGain?: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.csrPaidThisRound) { res.status(400).json({ error: "Sudah memilih CSR" }); return; }
  if (amount !== null && amount !== undefined) {
    const num = Number(amount);
    if (num < 0) { res.status(400).json({ error: "Jumlah tidak valid" }); return; }
    if (num > 0 && player.money < num) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
    const kap = Math.max(0, Number(kapGain) || 0);
    player.money -= num;
    player.csrKAP = (player.csrKAP || 0) + kap;
    if (num > 0) addTx(player, `CSR Ronde ${room.currentRonde} (+${kap} KAP)`, num, "pengeluaran", room.currentRonde);
  }
  player.csrPaidThisRound = true;
  if (room.players.every(p => p.csrPaidThisRound)) {
    room.phase = "operational"; room.actedThisPutaran = [];
    room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
  }
  processBotTurns(room);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/action", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "operational") { res.status(400).json({ error: "Bukan fase operasional" }); return; }
  if (room.pendingBid?.status === "pending") { res.status(400).json({ error: "Ada bidding yang belum selesai" }); return; }

  const currentPlayer = room.players[room.currentTurnIndex];
  const { playerId, action, cafeId, upgradeType, menuType, targetCafeId, area, bidType, expandSpecs, hutang, upgradeCost } = req.body as {
    playerId: string; action: ActionChoice;
    cafeId?: string; upgradeType?: UpgradeType; menuType?: MenuType; targetCafeId?: string;
    area?: BoardColor; bidType?: "open_bid" | "buyout"; bidPrice?: number;
    expandSpecs?: { area: BoardColor; bidPrice: number; menuItems: MenuItem[]; seats: number; name?: string };
    hutang?: boolean; upgradeCost?: number;
  };

  if (!currentPlayer || currentPlayer.id !== playerId) { res.status(403).json({ error: "Bukan giliran kamu" }); return; }

  const prevIdx = room.currentTurnIndex > 0 ? room.currentTurnIndex - 1 : room.players.length - 1;
  const prevPlayer = room.players[prevIdx];
  if (prevPlayer && prevPlayer.lastAction === action && room.actedThisPutaran.length > 0) {
    currentPlayer.kap.toleransiAmbiguitas = Math.min(7, currentPlayer.kap.toleransiAmbiguitas + 1);
  }

  if (action === "upgrade") {
    const cost = Number(upgradeCost) || 0;
    if (cost > 0 && currentPlayer.money < cost) {
      res.status(400).json({ error: `Uang tidak cukup untuk biaya upgrade (Rp.${cost})` }); return;
    }
    currentPlayer.kap.kreativitas = Math.min(7, currentPlayer.kap.kreativitas + 1);
    const cafe = cafeId ? room.cafes.find(c => c.id === cafeId && c.ownerId === playerId) : null;
    if (!cafe) { res.status(400).json({ error: "Cafe tidak ditemukan atau bukan milikmu" }); return; }
    if (upgradeType === "add_menu") {
      if (!menuType) { res.status(400).json({ error: "Pilih jenis menu" }); return; }
      const existing = cafe.menuItems.find(m => m.type === menuType);
      if (existing) existing.count += 1;
      else cafe.menuItems.push({ type: menuType, count: 1, price: { kopi:3,teh:2,kue:4,croissant:5 }[menuType] });
    } else if (upgradeType === "raise_price") {
      if (!menuType) { res.status(400).json({ error: "Pilih menu" }); return; }
      const item = cafe.menuItems.find(m => m.type === menuType);
      if (!item) { res.status(400).json({ error: "Menu tidak ada" }); return; }
      item.price += 1;
    } else if (upgradeType === "add_seats") {
      cafe.seats += 1;
    } else if (upgradeType === "move") {
      if (!menuType || !targetCafeId) { res.status(400).json({ error: "Lengkapi detail pemindahan" }); return; }
      const targetCafe = room.cafes.find(c => c.id === targetCafeId && c.ownerId === playerId);
      if (!targetCafe) { res.status(400).json({ error: "Cafe tujuan tidak ditemukan" }); return; }
      const sourceItem = cafe.menuItems.find(m => m.type === menuType);
      if (!sourceItem || sourceItem.count < 1) { res.status(400).json({ error: "Menu tidak cukup" }); return; }
      sourceItem.count -= 1;
      if (sourceItem.count === 0) cafe.menuItems = cafe.menuItems.filter(m => m.type !== menuType);
      const destItem = targetCafe.menuItems.find(m => m.type === menuType);
      if (destItem) destItem.count += 1;
      else targetCafe.menuItems.push({ type: menuType, count: 1, price: cafe.menuItems.find(m=>m.type===menuType)?.price || { kopi:3,teh:2,kue:4,croissant:5 }[menuType] });
    }
    // Deduct upgrade cost and record transaction
    if (cost > 0) {
      currentPlayer.money -= cost;
      addTx(currentPlayer, `Upgrade ${upgradeType||''} (${cafe.name}) – Rp.${cost}`, cost, "pengeluaran", room.currentRonde);
    }
  } else if (action === "social") {
    if (!area) { res.status(400).json({ error: "Pilih area" }); return; }
    currentPlayer.kap.socialNetworking = Math.min(7, currentPlayer.kap.socialNetworking + 1);
    const level = currentPlayer.kap.socialNetworking;
    const cost = level;
    if (hutang) {
      const units = Math.ceil(cost / 3);
      currentPlayer.hutang += units * 3;
      currentPlayer.kap.bersediaRisiko = Math.min(7, currentPlayer.kap.bersediaRisiko + units);
      addTx(currentPlayer, `Hutang Social (${area} lv${level}) ${units}×Rp.3`, units * 3, "pengeluaran", room.currentRonde);
    } else {
      if (currentPlayer.money < cost) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
      currentPlayer.money -= cost;
      addTx(currentPlayer, `Social – Area ${area} (lv${level})`, cost, "pengeluaran", room.currentRonde);
    }
    const areaLevel = currentPlayer.areaLevels.find(al => al.area === area);
    if (areaLevel) {
      const newLevel = Math.min(3, areaLevel.level + 1);
      if (newLevel === 3) {
        const otherAt3 = room.players.some(p => p.id !== playerId && p.areaLevels.find(al=>al.area===area)?.level === 3);
        if (!otherAt3) areaLevel.level = 3; else areaLevel.level = Math.min(2, newLevel);
      } else { areaLevel.level = newLevel; }
    }
    room.cafes.filter(c => c.area === area).forEach(c => { c.socialCustomers += 1; });
  } else if (action === "expand") {
    if (!expandSpecs) { res.status(400).json({ error: "Input spesifikasi cafe terlebih dahulu" }); return; }
    if (!bidType) { res.status(400).json({ error: "Pilih tipe pembelian" }); return; }
    if (expandSpecs.area === currentPlayer.boardColor) {
      res.status(400).json({ error: "Expand hanya boleh di luar area milikmu. Pilih area warna lain." }); return;
    }
    const targetArea = expandSpecs.area;
    const cafesInArea = room.cafes.filter(c => c.area === targetArea && c.ownerId !== null);
    if (cafesInArea.length >= 4) { res.status(400).json({ error: "Area sudah penuh (max 4 cafe)" }); return; }
    const emptySlot = room.cafes.find(c => c.area === targetArea && c.ownerId === null && c.slotIndex > 1);
    if (!emptySlot) { res.status(400).json({ error: "Tidak ada lahan kosong di area ini" }); return; }
    const bPrice = Number(expandSpecs.bidPrice) || 1;
    const buyoutP = bPrice * 3;
    const oPrice = bPrice;
    if (bidType === "buyout") {
      const price = buyoutP;
      if (!hutang && currentPlayer.money < price) { res.status(400).json({ error: `Uang tidak cukup (Rp.${price})` }); return; }
      if (hutang) { const units = Math.ceil(price/3); currentPlayer.hutang += units*3; currentPlayer.kap.bersediaRisiko = Math.min(7, currentPlayer.kap.bersediaRisiko+units); }
      else { currentPlayer.money -= price; }
      emptySlot.ownerId = playerId; emptySlot.bidPrice = bPrice; emptySlot.buyoutPrice = buyoutP;
      emptySlot.menuItems = expandSpecs.menuItems || []; emptySlot.seats = expandSpecs.seats || 2;
      emptySlot.name = expandSpecs.name || `Kafe ${targetArea} #${emptySlot.slotIndex}`; emptySlot.isSetup = true;
      addTx(currentPlayer, `Buy Out Cafe (${emptySlot.name})`, price, "pengeluaran", room.currentRonde);
      currentPlayer.kap.internalLocus = Math.min(7, currentPlayer.kap.internalLocus + 1);
    } else if (bidType === "open_bid") {
      emptySlot.bidPrice = bPrice; emptySlot.buyoutPrice = buyoutP;
      emptySlot.menuItems = expandSpecs.menuItems || []; emptySlot.seats = expandSpecs.seats || 2;
      emptySlot.name = expandSpecs.name || `Kafe ${targetArea} #${emptySlot.slotIndex}`;
      if (room.players.length === 1) {
        // Solo: expander wins immediately, pays bank
        if (currentPlayer.money < oPrice) { const diff=oPrice-currentPlayer.money; const units=Math.ceil(diff/3); currentPlayer.hutang+=units*3; currentPlayer.kap.bersediaRisiko=Math.min(7,currentPlayer.kap.bersediaRisiko+1); currentPlayer.money=Math.max(0,currentPlayer.money+units*3-oPrice); }
        else { currentPlayer.money -= oPrice; }
        emptySlot.ownerId = playerId; emptySlot.isSetup = true;
        addTx(currentPlayer, `Buka Bid (solo): ${emptySlot.name}`, oPrice, "pengeluaran", room.currentRonde);
        currentPlayer.kap.internalLocus = Math.min(7, currentPlayer.kap.internalLocus + 1);
      } else {
        const expanderIdx = room.players.findIndex(p => p.id === playerId);
        const turnOrder: string[] = [];
        for (let i = 1; i < room.players.length; i++) {
          turnOrder.push(room.players[(expanderIdx + i) % room.players.length].id);
        }
        turnOrder.push(playerId); // expander bids last
        room.pendingBid = {
          cafeId: emptySlot.id,
          expanderId: playerId,
          cafeName: emptySlot.name,
          openingPrice: oPrice,
          buyoutPrice: buyoutP,
          currentPrice: oPrice,
          currentHighBidderId: playerId,
          activePlayers: room.players.map(p => p.id),
          turnOrder,
          currentTurnPlayerId: turnOrder[0],
          status: "pending",
          winnerId: null,
        };
        currentPlayer.lastAction = action;
        persist();
        res.json({ ok: true, pendingBid: true }); return;
      }
    }
  } else { res.status(400).json({ error: "Aksi tidak valid" }); return; }

  currentPlayer.lastAction = action;
  room.actedThisPutaran.push(playerId);
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

  if (room.actedThisPutaran.filter(x=>!x.includes("_")).length >= room.players.length) {
    if (room.currentPutaran === 1) {
      room.currentPutaran = 2; room.actedThisPutaran = [];
      room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
      room.players.forEach(p => { p.lastAction = null; });
    } else if (room.currentPutaran === 2) {
      room.phase = "lembur_offer"; room.actedThisPutaran = [];
    } else {
      // putaran 3 (aksi lembur) → langsung ke input pelanggan
      room.phase = "customer_input"; room.actedThisPutaran = [];
    }
  }
  processBotTurns(room);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/bid-respond", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (!room.pendingBid || room.pendingBid.status !== "pending") { res.status(400).json({ error: "Tidak ada bidding aktif" }); return; }
  const { playerId, action, newPrice } = req.body as { playerId: string; action: "bid" | "pass" | "buyout"; newPrice?: number };
  const bid = room.pendingBid;

  if (playerId !== bid.currentTurnPlayerId) {
    const name = room.players.find(p => p.id === bid.currentTurnPlayerId)?.name || "pemain lain";
    res.status(400).json({ error: `Belum giliranmu. Menunggu ${name}` }); return;
  }
  if (!bid.activePlayers.includes(playerId)) {
    res.status(400).json({ error: "Kamu sudah keluar dari lelang ini" }); return;
  }

  const cafe = room.cafes.find(c => c.id === bid.cafeId)!;
  const expander = room.players.find(p => p.id === bid.expanderId)!;

  function nextActive(afterId: string): string | null {
    const idx = bid.turnOrder.indexOf(afterId);
    for (let i = 1; i < bid.turnOrder.length; i++) {
      const candidate = bid.turnOrder[(idx + i) % bid.turnOrder.length];
      if (bid.activePlayers.includes(candidate)) return candidate;
    }
    return null;
  }

  function finalizeBid(winnerId: string, price: number) {
    const r = room!;
    const winner = r.players.find(p => p.id === winnerId)!;
    if (winnerId === bid.expanderId) {
      if (winner.money < price) { const diff=price-winner.money; const units=Math.ceil(diff/3); winner.hutang+=units*3; winner.kap.bersediaRisiko=Math.min(7,winner.kap.bersediaRisiko+units); winner.money=Math.max(0,winner.money+units*3-price); }
      else { winner.money -= price; }
      addTx(winner, `Menang Bid: ${cafe.name}`, price, "pengeluaran", r.currentRonde);
    } else {
      if (winner.money < price) { const diff=price-winner.money; const units=Math.ceil(diff/3); winner.hutang+=units*3; winner.kap.bersediaRisiko=Math.min(7,winner.kap.bersediaRisiko+units); winner.money=Math.max(0,winner.money+units*3-price); }
      else { winner.money -= price; }
      expander.money += price;
      addTx(winner, `Menang Bid: ${cafe.name} (bayar ke ${expander.name})`, price, "pengeluaran", r.currentRonde);
      addTx(expander, `Cafe dibeli ${winner.name}: ${cafe.name}`, price, "pemasukan", r.currentRonde);
    }
    cafe.ownerId = winnerId; cafe.isSetup = true;
    bid.winnerId = winnerId;
    bid.status = "sold";
    expander.kap.internalLocus = Math.min(7, expander.kap.internalLocus + 1);
    expander.lastAction = "expand";
    r.actedThisPutaran.push(expander.id);
    r.currentTurnIndex = (r.currentTurnIndex + 1) % r.players.length;
    const actedCount = r.actedThisPutaran.filter(x => !x.includes("_")).length;
    if (actedCount >= r.players.length) {
      if (r.currentPutaran === 1) { r.currentPutaran=2; r.actedThisPutaran=[]; r.currentTurnIndex=(r.currentRonde-1)%r.players.length; r.players.forEach(p=>{p.lastAction=null;}); }
      else if (r.currentPutaran === 2) { r.phase="lembur_offer"; r.actedThisPutaran=[]; }
      else { r.phase="customer_input"; r.actedThisPutaran=[]; }
    }
    setTimeout(() => { if (r.pendingBid?.status !== "pending") { r.pendingBid = null; persist(); } }, 2000);
    processBotTurns(r);
    persist();
  }

  if (action === "buyout") {
    if (playerId !== bid.expanderId) { res.status(403).json({ error: "Buy Out hanya untuk expander" }); return; }
    finalizeBid(bid.expanderId, bid.buyoutPrice);
    res.json({ ok: true, status: "sold" }); return;
  }

  if (action === "bid") {
    const price = Number(newPrice);
    if (!price || price <= bid.currentPrice) { res.status(400).json({ error: `Harga harus lebih dari Rp.${bid.currentPrice}` }); return; }
    bid.currentPrice = price;
    bid.currentHighBidderId = playerId;
    const next = nextActive(playerId);
    if (!next || next === playerId) { finalizeBid(playerId, price); res.json({ ok: true, status: "sold" }); }
    else { bid.currentTurnPlayerId = next; persist(); res.json({ ok: true, status: "pending" }); }
    return;
  }

  if (action === "pass") {
    const next = nextActive(playerId);
    bid.activePlayers = bid.activePlayers.filter(id => id !== playerId);
    if (bid.activePlayers.length <= 1) {
      finalizeBid(bid.activePlayers[0] ?? bid.currentHighBidderId, bid.currentPrice);
      res.json({ ok: true, status: "sold" });
    } else if (!next || !bid.activePlayers.includes(next)) {
      finalizeBid(bid.currentHighBidderId, bid.currentPrice);
      res.json({ ok: true, status: "sold" });
    } else {
      bid.currentTurnPlayerId = next;
      persist();
      res.json({ ok: true, status: "pending" });
    }
    return;
  }

  res.status(400).json({ error: "Aksi tidak valid (bid / pass / buyout)" });
});

router.post("/rooms/:code/lembur", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "lembur_offer") { res.status(400).json({ error: "Bukan fase lembur" }); return; }
  const { playerId, lembur } = req.body as { playerId: string; lembur: boolean };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (lembur) {
    if (player.money < 5) { res.status(400).json({ error: "Uang tidak cukup (Rp.5)" }); return; }
    player.money -= 5; player.lemburThisRound = true;
    addTx(player, `Lembur Ronde ${room.currentRonde}`, 5, "pengeluaran", room.currentRonde);
  }
  room.actedThisPutaran.push(playerId + "_lembur");
  if (room.players.every(p => room.actedThisPutaran.includes(p.id + "_lembur"))) {
    room.actedThisPutaran = [];
    if (room.players.some(p => p.lemburThisRound)) {
      room.phase = "operational"; room.currentPutaran = 3;
      room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
      room.players.forEach(p => { p.lastAction = null; });
    } else { room.phase = "customer_input"; }
  }
  processBotTurns(room);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/customer-input", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "customer_input") { res.status(400).json({ error: "Bukan fase input pelanggan" }); return; }
  const { playerId, area, menuSought, customerCount } = req.body as { playerId: string; area: BoardColor; menuSought: MenuType[]; customerCount: number; };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (!area) { res.status(400).json({ error: "Area harus diisi" }); return; }
  const ownsInArea = room.cafes.some(c => c.area === area && c.ownerId === playerId && c.isSetup);
  if (!ownsInArea) { res.status(400).json({ error: "Kamu tidak punya cafe aktif di area ini" }); return; }
  if (room.customerInputs.some(ci => ci.playerId === playerId && ci.area === area)) { res.status(400).json({ error: "Sudah input untuk area ini" }); return; }
  room.customerInputs.push({ area, menuSought: menuSought || [], customerCount: Number(customerCount) || 1, playerId });
  // All done: every player submitted for every area where they own a cafe
  const allDone = room.players.every(p => {
    const ownedAreas = [...new Set(room.cafes.filter(c => c.ownerId === p.id && c.isSetup).map(c => c.area))];
    if (ownedAreas.length === 0) return true;
    return ownedAreas.every(a => room.customerInputs.some(ci => ci.playerId === p.id && ci.area === a));
  });
  if (allDone) { room.phase = "revenue"; room.actedThisPutaran = []; }
  processBotTurns(room);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/revenue", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "revenue") { res.status(400).json({ error: "Bukan fase pendapatan" }); return; }
  const { playerId, pendapatan, bebanOperasional } = req.body as { playerId: string; pendapatan: number; bebanOperasional: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (room.actedThisPutaran.includes(playerId + "_rev")) { res.status(400).json({ error: "Sudah input" }); return; }
  const pend = Number(pendapatan) || 0;
  const beban = Number(bebanOperasional) || 0;
  player.money += pend - beban;
  if (pend > 0) addTx(player, `Pendapatan Ronde ${room.currentRonde}`, pend, "pemasukan", room.currentRonde);
  if (beban > 0) addTx(player, `Beban Operasional Ronde ${room.currentRonde}`, beban, "pengeluaran", room.currentRonde);
  room.actedThisPutaran.push(playerId + "_rev");
  if (room.players.every(p => room.actedThisPutaran.includes(p.id + "_rev"))) { advanceRonde(room); }
  processBotTurns(room);
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/debt", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId, action, amount } = req.body as { playerId: string; action: "borrow" | "repay"; amount: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  const units = Math.max(1, Math.floor(Number(amount)));
  if (action === "borrow") {
    const rp = units * 3;
    player.money += rp; player.hutang += rp;
    player.kap.bersediaRisiko = Math.min(7, player.kap.bersediaRisiko + units);
    addTx(player, `Pinjam Bank ${units} tingkatan (+Rp.${rp})`, rp, "pemasukan", room.currentRonde);
  } else {
    const maxUnits = Math.floor(player.hutang / 3);
    const repayUnits = Math.min(units, maxUnits);
    if (repayUnits < 1) { res.status(400).json({ error: "Tidak ada hutang yang bisa dibayar" }); return; }
    const repayRp = repayUnits * 4;
    if (player.money < repayRp) { res.status(400).json({ error: `Uang tidak cukup (butuh Rp.${repayRp})` }); return; }
    player.money -= repayRp; player.hutang = Math.max(0, player.hutang - repayUnits * 3);
    player.kap.bersediaRisiko = Math.max(0, player.kap.bersediaRisiko - repayUnits);
    addTx(player, `Bayar Hutang ${repayUnits} tingkatan (-Rp.${repayRp})`, repayRp, "pengeluaran", room.currentRonde);
  }
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/end-game-sell", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "end_game_sell") { res.status(400).json({ error: "Bukan fase penjualan cafe akhir" }); return; }
  const { playerId, salePrice } = req.body as { playerId: string; salePrice: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.cafesSold) { res.status(400).json({ error: "Sudah menjual cafe" }); return; }
  const sale = Number(salePrice) || 0;
  player.money += sale; player.cafesSold = true;
  if (sale > 0) addTx(player, "Penjualan Cafe (Akhir Permainan)", sale, "pemasukan", room.currentRonde);
  room.cafes.filter(c => c.ownerId === playerId).forEach(c => { c.ownerId = null; });
  processBotTurns(room);
  if (room.players.every(p => p.cafesSold)) {
    assignMedals(room);
    room.players.forEach(p => { p.finalKAP = calculateFinalKAP(p); });
    room.status = "finished"; room.phase = "finished";
  }
  persist();
  res.json({ ok: true });
});

router.post("/rooms/:code/finish-early", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  assignMedals(room);
  room.players.forEach(p => { p.finalKAP = calculateFinalKAP(p); });
  room.status = "finished"; room.phase = "finished";
  persist();
  res.json({ ok: true });
});

const PHASE_ORDER: GamePhase[] = ["cafe_setup","csr","operational","lembur_offer","customer_input","revenue","end_game_sell","finished"];
router.post("/rooms/:code/facilitator-advance", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  if (room.phase === "finished") { res.status(400).json({ error: "Game sudah selesai" }); return; }
  const idx = PHASE_ORDER.indexOf(room.phase);
  const next = PHASE_ORDER[idx + 1] ?? "finished";
  room.phase = next; room.actedThisPutaran = [];
  if (next === "finished") { assignMedals(room); room.players.forEach(p => { p.finalKAP = calculateFinalKAP(p); }); room.status = "finished"; }
  persist();
  res.json({ ok: true, newPhase: next });
});

router.post("/rooms/:code/facilitator-reset-turn", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  room.actedThisPutaran = [];
  room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
  room.players.forEach(p => { p.lastAction = null; });
  persist();
  res.json({ ok: true });
});

export default router;
