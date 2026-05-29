import { Router } from "express";

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────

type BoardColor = "merah" | "biru" | "kuning" | "hijau";
type ActionChoice = "upgrade" | "social" | "expand" | null;
type MenuType = "kopi" | "teh" | "kue" | "croissant";
type UpgradeType = "add_menu" | "raise_price" | "add_seats" | "move";
type GamePhase = "cafe_setup" | "csr" | "operational" | "lembur_offer" | "customer_input" | "revenue" | "end_game_sell" | "finished";

interface MenuItem { type: MenuType; count: number; price: number; }

// Each area can have up to 4 cafes (1 starter + 3 lots)
interface CafeSlot {
  id: string;
  area: BoardColor;
  slotIndex: number; // 1 = starting cafe, 2-4 = purchasable lots
  name: string;
  bidPrice: number;        // player-input price
  buyoutPrice: number;     // auto: 3x bidPrice
  ownerId: string | null;
  menuItems: MenuItem[];
  seats: number;
  socialCustomers: number;
  isSetup: boolean;
}

interface PlayerAreaLevel {
  area: BoardColor;
  level: number; // 1 = default, 2 = social action, 3 = exclusive top
}

interface CustomerInput {
  area: BoardColor;
  menuSought: MenuType[];
  customerCount: number;
  playerId: string;
}

interface PendingBid {
  cafeId: string;
  bidderId: string;
  cafeName: string;
  openPrice: number;
  responses: { playerId: string; accepted: boolean }[];
  status: "pending" | "accepted" | "rejected";
}

// Pending expand: player inputs cafe specs before bid starts
interface PendingExpand {
  area: BoardColor;
  bidderId: string;
  bidPrice: number;
  buyoutPrice: number;
  menuItems: MenuItem[];
  seats: number;
}

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
  joinedAt: number; money: number; hutang: number; kap: KAP;
  transactions: Transaction[]; lastAction: ActionChoice;
  csrPaidThisRound: boolean; lemburThisRound: boolean;
  csrKAP: number;
  areaLevels: PlayerAreaLevel[]; // social levels per area
  cafeSetupDone: boolean;
  cafesSold: boolean; // end-game
  finalKAP?: number;
}

interface Room {
  code: string; hostId: string; players: Player[];
  maxPlayers: number; modalAwal: number;
  currentTurnIndex: number;
  status: "waiting" | "playing" | "finished";
  currentRonde: number; currentPutaran: number;
  phase: GamePhase; actedThisPutaran: string[];
  cafes: CafeSlot[];
  pendingBid: PendingBid | null;
  pendingExpand: PendingExpand | null; // specs input before bid
  customerInputs: CustomerInput[]; // current round
  createdAt: number;
}

// Social priority order per area
const SOCIAL_PRIORITY: Record<BoardColor, BoardColor[]> = {
  merah:  ["merah", "kuning", "hijau", "biru"],
  biru:   ["biru", "merah", "kuning", "hijau"],
  kuning: ["kuning", "hijau", "biru", "merah"],
  hijau:  ["hijau", "biru", "merah", "kuning"],
};

// ── KAP scoring ───────────────────────────────────────────────────────────

function calculateKAPScore(player: Player): number {
  const k = player.kap;
  let total = player.csrKAP || 0;
  if (k.kreativitas >= 3) total += 1;
  if (k.kreativitas >= 5) total += 2;
  if (k.kreativitas >= 7) total += 3;
  if (k.socialNetworking >= 3) total += 1;
  if (k.socialNetworking >= 5) total += 2;
  if (k.socialNetworking >= 7) total += 3;
  if (k.internalLocus >= 3) total += 1;
  if (k.internalLocus >= 4) total += 2;
  if (k.internalLocus >= 6) total += 3;
  if (k.internalLocus >= 7) total += 4;
  if (k.toleransiAmbiguitas >= 2) total -= 1;
  if (k.toleransiAmbiguitas >= 4) total -= 2;
  if (k.toleransiAmbiguitas >= 7) total -= 3;
  total += Math.floor(player.money / 10);
  return Math.max(0, total);
}

// Final KAP: money/10 + accumulated KAP indicators - debt penalty
function calculateFinalKAP(player: Player): number {
  const moneyKAP = Math.floor(player.money / 10);
  const debtPenalty = player.hutang > 0 ? player.kap.bersediaRisiko : 0;
  const baseKAP = player.csrKAP || 0;
  return Math.max(0, moneyKAP + baseKAP - debtPenalty);
}

// ── Helpers ───────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateId(): string { return Math.random().toString(36).slice(2, 10); }

function cleanOldRooms() {
  const cutoff = Date.now() - 8 * 60 * 60 * 1000;
  for (const [code, room] of rooms) if (room.createdAt < cutoff) rooms.delete(code);
}

function makePlayer(id: string, name: string, boardColor: BoardColor, isHost: boolean, modal: number): Player {
  const ALL_COLORS: BoardColor[] = ["merah", "biru", "kuning", "hijau"];
  return {
    id, name, boardColor, isHost, joinedAt: Date.now(),
    money: modal, hutang: 0,
    kap: { kreativitas: 0, socialNetworking: 0, internalLocus: 0, toleransiAmbiguitas: 0, bersediaRisiko: 0 },
    transactions: [], lastAction: null, csrPaidThisRound: false, lemburThisRound: false, csrKAP: 0,
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

// Initialize empty lots for all 4 areas (3 lots each)
function initCafeSlots(): CafeSlot[] {
  const areas: BoardColor[] = ["merah", "biru", "kuning", "hijau"];
  const slots: CafeSlot[] = [];
  for (const area of areas) {
    // Slot 1: starting cafe placeholder (will be set up by player)
    slots.push({
      id: `${area}-1`, area, slotIndex: 1,
      name: "Cafe Saya", bidPrice: 0, buyoutPrice: 0,
      ownerId: null, menuItems: [], seats: 2, socialCustomers: 0, isSetup: false,
    });
    // Slots 2-4: empty purchasable lots
    for (let i = 2; i <= 4; i++) {
      slots.push({
        id: `${area}-${i}`, area, slotIndex: i,
        name: `Lahan ${area} #${i}`, bidPrice: 0, buyoutPrice: 0,
        ownerId: null, menuItems: [], seats: 0, socialCustomers: 0, isSetup: false,
      });
    }
  }
  return slots;
}

function advanceRonde(room: Room) {
  room.players.forEach(p => {
    p.csrPaidThisRound = false; p.lemburThisRound = false; p.lastAction = null;
  });
  room.cafes.forEach(c => { c.socialCustomers = 0; });
  room.customerInputs = [];
  if (room.currentRonde >= 4) {
    room.phase = "end_game_sell";
  } else {
    room.currentRonde += 1;
    room.currentPutaran = 1;
    room.phase = "csr";
    room.actedThisPutaran = [];
    // Turn order: round N starts with player at index (N-1) % players.length
    room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
  }
}

// ── Routes ────────────────────────────────────────────────────────────────

// POST /api/rooms
router.post("/rooms", (req, res) => {
  cleanOldRooms();
  const { hostName, boardColor, maxPlayers, modalAwal } = req.body as {
    hostName: string; boardColor: BoardColor; maxPlayers: number; modalAwal?: number;
  };
  if (!hostName?.trim()) { res.status(400).json({ error: "Nama wajib diisi" }); return; }
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();
  const hostId = generateId();
  const modal = Number(modalAwal) || 10;
  const room: Room = {
    code, hostId,
    players: [makePlayer(hostId, hostName.trim(), boardColor || "merah", true, modal)],
    maxPlayers: Math.min(4, Math.max(2, Number(maxPlayers) || 4)),
    modalAwal: modal,
    currentTurnIndex: 0, status: "waiting",
    currentRonde: 1, currentPutaran: 1,
    phase: "cafe_setup", actedThisPutaran: [],
    cafes: initCafeSlots(),
    pendingBid: null, pendingExpand: null,
    customerInputs: [],
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  res.json({ code, playerId: hostId });
});

// GET /api/rooms/:code
router.get("/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  res.json({
    ...room,
    players: room.players.map(p => ({
      ...p,
      kapScore: room.status === "finished" ? (p.finalKAP ?? calculateFinalKAP(p)) : calculateKAPScore(p),
    })),
  });
});

// POST /api/rooms/:code/join
router.post("/rooms/:code/join", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.status !== "waiting") { res.status(400).json({ error: "Permainan sudah dimulai" }); return; }
  if (room.players.length >= room.maxPlayers) { res.status(400).json({ error: "Room sudah penuh" }); return; }
  const { playerName, boardColor } = req.body as { playerName: string; boardColor: BoardColor };
  if (!playerName?.trim()) { res.status(400).json({ error: "Nama wajib diisi" }); return; }
  if (room.players.some(p => p.boardColor === boardColor)) {
    res.status(400).json({ error: "Warna board sudah dipakai" }); return;
  }
  const playerId = generateId();
  room.players.push(makePlayer(playerId, playerName.trim(), boardColor || "biru", false, room.modalAwal));
  res.json({ playerId, code: room.code });
});

// POST /api/rooms/:code/start
router.post("/rooms/:code/start", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId, testMode } = req.body as { playerId: string; testMode?: boolean };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host yang bisa memulai" }); return; }
  if (!testMode && room.players.length < 2) { res.status(400).json({ error: "Minimal 2 pemain" }); return; }
  // Assign slot 1 of each player's board color to them
  room.players.forEach(p => {
    const startSlot = room.cafes.find(c => c.id === `${p.boardColor}-1`);
    if (startSlot) startSlot.ownerId = p.id;
  });
  room.status = "playing";
  room.currentRonde = 1; room.currentPutaran = 1;
  room.phase = "cafe_setup"; room.actedThisPutaran = []; room.currentTurnIndex = 0;
  res.json({ ok: true });
});

// POST /api/rooms/:code/cafe-setup — player inputs their starting cafe characteristics
router.post("/rooms/:code/cafe-setup", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "cafe_setup") { res.status(400).json({ error: "Bukan fase setup cafe" }); return; }
  const { playerId, bidPrice, menuItems, seats, name } = req.body as {
    playerId: string; bidPrice: number; menuItems: MenuItem[]; seats: number; name?: string;
  };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.cafeSetupDone) { res.status(400).json({ error: "Sudah setup cafe" }); return; }

  const cafe = room.cafes.find(c => c.id === `${player.boardColor}-1` && c.ownerId === playerId);
  if (!cafe) { res.status(404).json({ error: "Cafe tidak ditemukan" }); return; }

  cafe.name = name?.trim() || `Kafe ${player.name}`;
  cafe.bidPrice = Number(bidPrice) || 1;
  cafe.buyoutPrice = cafe.bidPrice * 3;
  cafe.menuItems = (menuItems || []).map(m => ({
    type: m.type, count: m.count || 1, price: m.price || 1,
  }));
  cafe.seats = Number(seats) || 2;
  cafe.isSetup = true;
  player.cafeSetupDone = true;

  // Check if all players have setup their cafes
  if (room.players.every(p => p.cafeSetupDone)) {
    room.phase = "csr";
    room.currentTurnIndex = 0;
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/csr
router.post("/rooms/:code/csr", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "csr") {
    const msg = room.phase === "cafe_setup"
      ? "Selesaikan setup cafe semua pemain terlebih dahulu"
      : "Bukan fase CSR";
    res.status(400).json({ error: msg }); return;
  }
  const { playerId, amount } = req.body as { playerId: string; amount?: number | null };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.csrPaidThisRound) { res.status(400).json({ error: "Sudah memilih CSR" }); return; }

  if (amount !== null && amount !== undefined) {
    const num = Number(amount);
    let kapGain = 0;
    if (num === 4) kapGain = 1;
    else if (num === 7) kapGain = 2;
    else { res.status(400).json({ error: "Jumlah harus Rp.4 atau Rp.7" }); return; }
    if (player.money < num) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
    player.money -= num;
    player.csrKAP = (player.csrKAP || 0) + kapGain;
    addTx(player, `CSR Ronde ${room.currentRonde}`, num, "pengeluaran", room.currentRonde);
  }
  player.csrPaidThisRound = true;

  if (room.players.every(p => p.csrPaidThisRound)) {
    room.phase = "operational"; room.actedThisPutaran = [];
    room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/action
router.post("/rooms/:code/action", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "operational") { res.status(400).json({ error: "Bukan fase operasional" }); return; }
  if (room.pendingBid?.status === "pending") {
    res.status(400).json({ error: "Ada bidding yang belum selesai" }); return;
  }

  const currentPlayer = room.players[room.currentTurnIndex];
  const {
    playerId, action,
    cafeId, upgradeType, menuType, targetCafeId,
    area,
    bidType, bidPrice,
    expandSpecs, // for expand: {area, bidPrice, menuItems, seats}
    hutang,
  } = req.body as {
    playerId: string; action: ActionChoice;
    cafeId?: string; upgradeType?: UpgradeType; menuType?: MenuType; targetCafeId?: string;
    area?: BoardColor;
    bidType?: "open_bid" | "buyout";
    bidPrice?: number;
    expandSpecs?: { area: BoardColor; bidPrice: number; menuItems: MenuItem[]; seats: number; name?: string };
    hutang?: boolean;
  };

  if (!currentPlayer || currentPlayer.id !== playerId) {
    res.status(403).json({ error: "Bukan giliran kamu" }); return;
  }

  // Toleransi ambiguitas: same action as previous player
  const prevIdx = room.currentTurnIndex > 0 ? room.currentTurnIndex - 1 : room.players.length - 1;
  const prevPlayer = room.players[prevIdx];
  if (prevPlayer && prevPlayer.lastAction === action && room.actedThisPutaran.length > 0) {
    currentPlayer.kap.toleransiAmbiguitas = Math.min(7, currentPlayer.kap.toleransiAmbiguitas + 1);
  }

  // ── UPGRADE ──
  if (action === "upgrade") {
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
  }

  // ── SOCIAL ──
  else if (action === "social") {
    if (!area) { res.status(400).json({ error: "Pilih area" }); return; }
    currentPlayer.kap.socialNetworking = Math.min(7, currentPlayer.kap.socialNetworking + 1);
    const level = currentPlayer.kap.socialNetworking;
    const cost = level;
    if (hutang) {
      currentPlayer.hutang += cost; currentPlayer.kap.bersediaRisiko = Math.min(7, currentPlayer.kap.bersediaRisiko + 1);
      addTx(currentPlayer, `Hutang Aksi Social (${area} lv${level})`, cost, "pengeluaran", room.currentRonde);
    } else {
      if (currentPlayer.money < cost) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
      currentPlayer.money -= cost;
      addTx(currentPlayer, `Social – Area ${area} (lv${level})`, cost, "pengeluaran", room.currentRonde);
    }
    // Update player's social level for that area (max level 3, exclusive)
    const areaLevel = currentPlayer.areaLevels.find(al => al.area === area);
    if (areaLevel) {
      const newLevel = Math.min(3, areaLevel.level + 1);
      if (newLevel === 3) {
        // Check if another player is already at level 3 in this area
        const otherAt3 = room.players.some(p => p.id !== playerId && p.areaLevels.find(al=>al.area===area)?.level === 3);
        if (!otherAt3) areaLevel.level = 3;
        else areaLevel.level = Math.min(2, newLevel);
      } else {
        areaLevel.level = newLevel;
      }
    }
    // Add 1 customer to all cafes in chosen area
    room.cafes.filter(c => c.area === area).forEach(c => { c.socialCustomers += 1; });
  }

  // ── EXPAND ──
  else if (action === "expand") {
    if (!expandSpecs) { res.status(400).json({ error: "Input spesifikasi cafe terlebih dahulu" }); return; }
    if (!bidType) { res.status(400).json({ error: "Pilih tipe pembelian" }); return; }

    const targetArea = expandSpecs.area;
    // Count cafes in area (max 4)
    const cafesInArea = room.cafes.filter(c => c.area === targetArea && c.ownerId !== null);
    if (cafesInArea.length >= 4) { res.status(400).json({ error: "Area sudah penuh (max 4 cafe)" }); return; }
    // Find an empty slot or create one
    const emptySlot = room.cafes.find(c => c.area === targetArea && c.ownerId === null && c.slotIndex > 1);
    if (!emptySlot) { res.status(400).json({ error: "Tidak ada lahan kosong di area ini" }); return; }

    const bPrice = Number(expandSpecs.bidPrice) || 1;
    const buyoutP = bPrice * 3;

    if (bidType === "buyout") {
      const price = buyoutP;
      if (!hutang && currentPlayer.money < price) { res.status(400).json({ error: `Uang tidak cukup (Rp.${price})` }); return; }
      if (hutang) {
        currentPlayer.hutang += price; currentPlayer.kap.bersediaRisiko = Math.min(7, currentPlayer.kap.bersediaRisiko + 1);
      } else { currentPlayer.money -= price; }
      emptySlot.ownerId = playerId;
      emptySlot.bidPrice = bPrice; emptySlot.buyoutPrice = buyoutP;
      emptySlot.menuItems = expandSpecs.menuItems || [];
      emptySlot.seats = expandSpecs.seats || 2;
      emptySlot.name = expandSpecs.name || `Kafe ${targetArea} #${emptySlot.slotIndex}`;
      emptySlot.isSetup = true;
      addTx(currentPlayer, `Buy Out Cafe (${emptySlot.name})`, price, "pengeluaran", room.currentRonde);
      currentPlayer.kap.internalLocus = Math.min(7, currentPlayer.kap.internalLocus + 1);

    } else if (bidType === "open_bid") {
      const oPrice = Number(bidPrice) || bPrice;
      if (oPrice < bPrice) { res.status(400).json({ error: `Min bid: Rp.${bPrice}` }); return; }
      if (oPrice > buyoutP) { res.status(400).json({ error: `Max bid: Rp.${buyoutP}` }); return; }
      // Store specs in emptySlot (provisional, finalized if bid accepted)
      emptySlot.bidPrice = bPrice; emptySlot.buyoutPrice = buyoutP;
      emptySlot.menuItems = expandSpecs.menuItems || [];
      emptySlot.seats = expandSpecs.seats || 2;
      emptySlot.name = expandSpecs.name || `Kafe ${targetArea} #${emptySlot.slotIndex}`;
      room.pendingBid = {
        cafeId: emptySlot.id, bidderId: playerId, cafeName: emptySlot.name,
        openPrice: oPrice, responses: [], status: "pending",
      };
      currentPlayer.lastAction = action;
      res.json({ ok: true, pendingBid: true }); return;
    }

    currentPlayer.kap.internalLocus = Math.min(7, currentPlayer.kap.internalLocus + 1);
  } else {
    res.status(400).json({ error: "Aksi tidak valid" }); return;
  }

  currentPlayer.lastAction = action;
  room.actedThisPutaran.push(playerId);
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

  if (room.actedThisPutaran.filter(x=>!x.includes("_")).length >= room.players.length) {
    // All players acted this putaran
    if (room.currentPutaran === 1) {
      // Move to putaran 2
      room.currentPutaran = 2;
      room.actedThisPutaran = [];
      room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
      room.players.forEach(p => { p.lastAction = null; });
    } else {
      // After putaran 2, offer lembur
      room.phase = "lembur_offer"; room.actedThisPutaran = [];
    }
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/bid-respond
router.post("/rooms/:code/bid-respond", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (!room.pendingBid || room.pendingBid.status !== "pending") {
    res.status(400).json({ error: "Tidak ada bidding aktif" }); return;
  }
  const { playerId, accepted } = req.body as { playerId: string; accepted: boolean };
  if (room.pendingBid.bidderId === playerId) { res.status(400).json({ error: "Kamu adalah bidder" }); return; }
  if (room.pendingBid.responses.some(r => r.playerId === playerId)) {
    res.status(400).json({ error: "Sudah merespons" }); return;
  }
  room.pendingBid.responses.push({ playerId, accepted });

  const nonBidders = room.players.filter(p => p.id !== room.pendingBid!.bidderId);
  const allResponded = nonBidders.every(p => room.pendingBid!.responses.some(r => r.playerId === p.id));

  if (allResponded) {
    const bid = room.pendingBid!;
    const allAccepted = bid.responses.every(r => r.accepted);
    const cafe = room.cafes.find(c => c.id === bid.cafeId)!;
    const bidder = room.players.find(p => p.id === bid.bidderId)!;

    if (allAccepted) {
      if (bidder.money < bid.openPrice) {
        const diff = bid.openPrice - bidder.money;
        bidder.hutang += diff; bidder.kap.bersediaRisiko = Math.min(7, bidder.kap.bersediaRisiko + 1);
        bidder.money = 0;
      } else { bidder.money -= bid.openPrice; }
      cafe.ownerId = bid.bidderId; cafe.isSetup = true;
      addTx(bidder, `Open Bid berhasil: ${cafe.name}`, bid.openPrice, "pengeluaran", room.currentRonde);
      bidder.kap.internalLocus = Math.min(7, bidder.kap.internalLocus + 1);
      bid.status = "accepted";
    } else {
      // Bid rejected — clear provisional specs
      cafe.ownerId = null; cafe.isSetup = false; cafe.menuItems = []; cafe.seats = 0;
      bid.status = "rejected";
    }

    bidder.lastAction = "expand";
    room.actedThisPutaran.push(bidder.id);
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

    const actedCount = room.actedThisPutaran.filter(x=>!x.includes("_")).length;
    if (actedCount >= room.players.length) {
      if (room.currentPutaran === 1) {
        room.currentPutaran = 2; room.actedThisPutaran = [];
        room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
        room.players.forEach(p => { p.lastAction = null; });
      } else {
        room.phase = "lembur_offer"; room.actedThisPutaran = [];
      }
    }
    setTimeout(() => { if (room.pendingBid?.status !== "pending") room.pendingBid = null; }, 5000);
  }
  res.json({ ok: true, status: room.pendingBid?.status || "pending" });
});

// POST /api/rooms/:code/lembur
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
      // Lembur putaran (putaran 3)
      room.phase = "operational"; room.currentPutaran = 3;
      room.currentTurnIndex = (room.currentRonde - 1) % room.players.length;
      room.players.forEach(p => { p.lastAction = null; });
    } else {
      room.phase = "customer_input";
    }
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/customer-input — each player inputs customer data for their board area
router.post("/rooms/:code/customer-input", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "customer_input") { res.status(400).json({ error: "Bukan fase input pelanggan" }); return; }
  const { playerId, menuSought, customerCount } = req.body as {
    playerId: string; menuSought: MenuType[]; customerCount: number;
  };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (room.customerInputs.some(ci => ci.playerId === playerId)) {
    res.status(400).json({ error: "Sudah input pelanggan" }); return;
  }
  room.customerInputs.push({
    area: player.boardColor,
    menuSought: menuSought || [],
    customerCount: Number(customerCount) || 1,
    playerId,
  });
  if (room.players.every(p => room.customerInputs.some(ci => ci.playerId === p.id))) {
    room.phase = "revenue"; room.actedThisPutaran = [];
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/revenue
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
  if (room.players.every(p => room.actedThisPutaran.includes(p.id + "_rev"))) {
    advanceRonde(room);
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/debt
router.post("/rooms/:code/debt", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId, action, amount } = req.body as { playerId: string; action: "borrow" | "repay"; amount: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  const num = Number(amount);
  if (action === "borrow") {
    player.money += num; player.hutang += num;
    player.kap.bersediaRisiko = Math.min(7, player.kap.bersediaRisiko + 1);
    addTx(player, "Pinjam ke Bank", num, "pemasukan", room.currentRonde);
  } else {
    const repay = Math.ceil(num * (4/3));
    if (player.money < repay) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
    player.money -= repay; player.hutang = Math.max(0, player.hutang - num);
    // Paying debt reduces bersediaRisiko by 1
    player.kap.bersediaRisiko = Math.max(0, player.kap.bersediaRisiko - 1);
    addTx(player, "Bayar Hutang + Bunga 4/3", repay, "pengeluaran", room.currentRonde);
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/end-game-sell — player inputs cafe sale price
router.post("/rooms/:code/end-game-sell", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "end_game_sell") { res.status(400).json({ error: "Bukan fase penjualan cafe akhir" }); return; }
  const { playerId, salePrice } = req.body as { playerId: string; salePrice: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.cafesSold) { res.status(400).json({ error: "Sudah menjual cafe" }); return; }
  const sale = Number(salePrice) || 0;
  player.money += sale;
  player.cafesSold = true;
  if (sale > 0) addTx(player, "Penjualan Cafe (Akhir Permainan)", sale, "pemasukan", room.currentRonde);
  // Release player's cafes
  room.cafes.filter(c => c.ownerId === playerId).forEach(c => { c.ownerId = null; });

  if (room.players.every(p => p.cafesSold)) {
    // Finalize KAP for all players
    room.players.forEach(p => {
      p.finalKAP = calculateFinalKAP(p);
    });
    room.status = "finished"; room.phase = "finished";
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/finish-early
router.post("/rooms/:code/finish-early", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  room.players.forEach(p => { p.finalKAP = calculateFinalKAP(p); });
  room.status = "finished"; room.phase = "finished";
  res.json({ ok: true });
});

export default router;
