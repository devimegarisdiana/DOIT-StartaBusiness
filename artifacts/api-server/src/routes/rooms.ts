import { Router } from "express";

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────

type BoardColor = "merah" | "biru" | "kuning" | "hijau";
type ActionChoice = "upgrade" | "social" | "expand" | null;
type MenuType = "kopi" | "teh" | "kue" | "croissant";
type UpgradeType = "add_menu" | "raise_price" | "add_seats" | "move";

interface MenuItem { type: MenuType; count: number; price: number; }

interface CafeSlot {
  id: string;
  area: BoardColor;
  name: string;
  basePrice: number;
  ownerId: string | null;
  menuItems: MenuItem[];
  seats: number;
  socialCustomers: number;
}

interface PendingBid {
  cafeId: string;
  bidderId: string;
  cafeName: string;
  openPrice: number;
  responses: { playerId: string; accepted: boolean; counterPrice?: number }[];
  status: "pending" | "accepted" | "rejected" | "buyout";
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
}

type GamePhase = "csr" | "operational" | "revenue" | "lembur_offer" | "finished";

interface Room {
  code: string; hostId: string; players: Player[];
  maxPlayers: number; modalAwal: number;
  currentTurnIndex: number;
  status: "waiting" | "playing" | "finished";
  currentRonde: number; currentPutaran: number;
  phase: GamePhase; actedThisPutaran: string[];
  cafes: CafeSlot[];
  pendingBid: PendingBid | null;
  createdAt: number;
}

// ── Cafe definitions ─────────────────────────────────────────────────────

const CAFE_DEFS: Omit<CafeSlot, "ownerId" | "menuItems" | "seats" | "socialCustomers">[] = [
  { id: "merah-1",  area: "merah",  name: "Kafe Lobby",     basePrice: 20 },
  { id: "merah-2",  area: "merah",  name: "Kafe Rooftop",   basePrice: 25 },
  { id: "biru-1",   area: "biru",   name: "Kafe Kantin",    basePrice: 20 },
  { id: "biru-2",   area: "biru",   name: "Kafe Perpus",    basePrice: 25 },
  { id: "kuning-1", area: "kuning", name: "Kafe Koperasi",  basePrice: 20 },
  { id: "kuning-2", area: "kuning", name: "Kafe Lounge",    basePrice: 25 },
  { id: "hijau-1",  area: "hijau",  name: "Kafe Taman",     basePrice: 20 },
  { id: "hijau-2",  area: "hijau",  name: "Kafe Gazebo",    basePrice: 25 },
];

function initCafes(): CafeSlot[] {
  return CAFE_DEFS.map(d => ({ ...d, ownerId: null, menuItems: [], seats: 2, socialCustomers: 0 }));
}

// ── KAP scoring ───────────────────────────────────────────────────────────

function calculateKAPScore(player: Player, cafes: CafeSlot[]): number {
  const k = player.kap;
  let total = player.csrKAP || 0;
  // Kreativitas
  if (k.kreativitas >= 3) total += 1;
  if (k.kreativitas >= 5) total += 2;
  if (k.kreativitas >= 7) total += 3;
  // Social Networking
  if (k.socialNetworking >= 3) total += 1;
  if (k.socialNetworking >= 5) total += 2;
  if (k.socialNetworking >= 7) total += 3;
  // Internal Locus of Control
  if (k.internalLocus >= 3) total += 1;
  if (k.internalLocus >= 4) total += 2;
  if (k.internalLocus >= 6) total += 3;
  if (k.internalLocus >= 7) total += 4;
  // Toleransi Ambiguitas (penalty)
  if (k.toleransiAmbiguitas >= 2) total -= 1;
  if (k.toleransiAmbiguitas >= 4) total -= 2;
  if (k.toleransiAmbiguitas >= 7) total -= 3;
  // Money → KAP
  total += Math.floor(player.money / 10);
  // Menu item count KAP (end-game: most of each type = +1 KAP)
  // Computed at game end separately
  return Math.max(0, total);
}

function menuItemKAP(players: Player[], cafes: CafeSlot[]): Record<string, number> {
  const bonuses: Record<string, number> = {};
  const menuTypes: MenuType[] = ["kopi", "teh", "kue", "croissant"];
  menuTypes.forEach(type => {
    let maxCount = 0;
    let winnerId = "";
    players.forEach(p => {
      const owned = cafes.filter(c => c.ownerId === p.id);
      const total = owned.reduce((sum, c) => {
        const item = c.menuItems.find(m => m.type === type);
        return sum + (item?.count || 0);
      }, 0);
      if (total > maxCount) { maxCount = total; winnerId = p.id; }
    });
    if (maxCount > 0 && winnerId) {
      bonuses[winnerId] = (bonuses[winnerId] || 0) + 1;
    }
  });
  return bonuses;
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
  return {
    id, name, boardColor, isHost, joinedAt: Date.now(),
    money: modal, hutang: 0,
    kap: { kreativitas: 0, socialNetworking: 0, internalLocus: 0, toleransiAmbiguitas: 0, bersediaRisiko: 0 },
    transactions: [], lastAction: null, csrPaidThisRound: false, lemburThisRound: false, csrKAP: 0,
  };
}

function ts(ronde: number): Omit<Transaction, "id" | "keterangan" | "jumlah" | "tipe"> {
  return { waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), ronde };
}

function addTx(player: Player, keterangan: string, jumlah: number, tipe: "pemasukan" | "pengeluaran", ronde: number) {
  player.transactions.push({ id: generateId(), keterangan, jumlah, tipe, ...ts(ronde) });
}

function advanceRonde(room: Room) {
  room.players.forEach(p => { p.csrPaidThisRound = false; p.lemburThisRound = false; p.lastAction = null; });
  room.cafes.forEach(c => { c.socialCustomers = 0; }); // reset per-ronde customers
  if (room.currentRonde >= 4) {
    room.status = "finished";
    room.phase = "finished";
  } else {
    room.currentRonde += 1;
    room.currentPutaran = 1;
    room.phase = "csr";
    room.actedThisPutaran = [];
    room.currentTurnIndex = 0;
    // Rotate first player
    const first = room.players.shift()!;
    room.players.push(first);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────

// POST /api/rooms
router.post("/rooms", (req, res) => {
  cleanOldRooms();
  const { hostName, boardColor, maxPlayers, modalAwal } = req.body as {
    hostName: string; boardColor: BoardColor; maxPlayers: number; modalAwal: number;
  };
  if (!hostName?.trim()) { res.status(400).json({ error: "Nama wajib diisi" }); return; }

  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const hostId = generateId();
  const modal = Number(modalAwal) || 500000;
  const room: Room = {
    code, hostId,
    players: [makePlayer(hostId, hostName.trim(), boardColor || "merah", true, modal)],
    maxPlayers: Math.min(4, Math.max(2, Number(maxPlayers) || 4)),
    modalAwal: modal,
    currentTurnIndex: 0, status: "waiting",
    currentRonde: 1, currentPutaran: 1,
    phase: "csr", actedThisPutaran: [],
    cafes: initCafes(),
    pendingBid: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  res.json({ code, playerId: hostId });
});

// GET /api/rooms/:code
router.get("/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const menuBonuses = room.status === "finished" ? menuItemKAP(room.players, room.cafes) : {};
  res.json({
    ...room,
    players: room.players.map(p => ({
      ...p,
      kapScore: calculateKAPScore(p, room.cafes) + (menuBonuses[p.id] || 0),
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
  // Assign starting cafes
  room.players.forEach(p => {
    const startCafe = room.cafes.find(c => c.id === `${p.boardColor}-1`);
    if (startCafe) startCafe.ownerId = p.id;
  });
  room.status = "playing";
  room.currentRonde = 1; room.currentPutaran = 1;
  room.phase = "csr"; room.actedThisPutaran = []; room.currentTurnIndex = 0;
  res.json({ ok: true });
});

// POST /api/rooms/:code/csr
router.post("/rooms/:code/csr", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "csr") { res.status(400).json({ error: "Bukan fase CSR" }); return; }
  const { playerId, amount } = req.body as { playerId: string; amount: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.csrPaidThisRound) { res.status(400).json({ error: "Sudah memilih CSR" }); return; }
  const num = Number(amount);
  let kapGain = 0;
  if (num === 4) kapGain = 1;
  else if (num === 7) kapGain = 2;
  else { res.status(400).json({ error: "Jumlah harus Rp.4 atau Rp.7" }); return; }
  if (player.money < num) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
  player.money -= num;
  player.csrKAP = (player.csrKAP || 0) + kapGain;
  player.csrPaidThisRound = true;
  addTx(player, `CSR Ronde ${room.currentRonde}`, num, "pengeluaran", room.currentRonde);
  if (room.players.every(p => p.csrPaidThisRound)) {
    room.phase = "operational"; room.actedThisPutaran = [];
  }
  res.json({ ok: true, kapGain });
});

// POST /api/rooms/:code/csr-skip
router.post("/rooms/:code/csr-skip", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "csr") { res.status(400).json({ error: "Bukan fase CSR" }); return; }
  const { playerId } = req.body as { playerId: string };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  player.csrPaidThisRound = true;
  if (room.players.every(p => p.csrPaidThisRound)) {
    room.phase = "operational"; room.actedThisPutaran = [];
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/action — main action handler with full detail
router.post("/rooms/:code/action", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "operational") { res.status(400).json({ error: "Bukan fase operasional" }); return; }
  if (room.pendingBid && room.pendingBid.status === "pending") {
    res.status(400).json({ error: "Ada bidding yang belum selesai" }); return;
  }

  const currentPlayer = room.players[room.currentTurnIndex];
  const {
    playerId, action,
    // upgrade fields
    cafeId, upgradeType, menuType, targetCafeId,
    // social fields
    area,
    // expand fields
    bidType, bidPrice,
    // debt
    hutang,
  } = req.body as {
    playerId: string; action: ActionChoice;
    cafeId?: string; upgradeType?: UpgradeType; menuType?: MenuType; targetCafeId?: string;
    area?: BoardColor;
    bidType?: "open_bid" | "buyout"; bidPrice?: number;
    hutang?: boolean;
  };

  if (!currentPlayer || currentPlayer.id !== playerId) {
    res.status(403).json({ error: "Bukan giliran kamu" }); return;
  }

  // Toleransi ambiguitas check
  const prevPlayer = room.players[room.currentTurnIndex > 0 ? room.currentTurnIndex - 1 : room.players.length - 1];
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
      else cafe.menuItems.push({ type: menuType, count: 1, price: { kopi: 3, teh: 2, kue: 4, croissant: 5 }[menuType] });

    } else if (upgradeType === "raise_price") {
      if (!menuType) { res.status(400).json({ error: "Pilih menu yang harganya dinaikkan" }); return; }
      const item = cafe.menuItems.find(m => m.type === menuType);
      if (!item) { res.status(400).json({ error: "Menu tidak ada di cafe ini" }); return; }
      item.price += 1;

    } else if (upgradeType === "add_seats") {
      cafe.seats += 1;

    } else if (upgradeType === "move") {
      if (!menuType || !targetCafeId) { res.status(400).json({ error: "Lengkapi detail pemindahan" }); return; }
      const targetCafe = room.cafes.find(c => c.id === targetCafeId && c.ownerId === playerId);
      if (!targetCafe) { res.status(400).json({ error: "Cafe tujuan tidak ditemukan atau bukan milikmu" }); return; }
      const sourceItem = cafe.menuItems.find(m => m.type === menuType);
      if (!sourceItem || sourceItem.count < 1) { res.status(400).json({ error: "Menu tidak cukup untuk dipindah" }); return; }
      sourceItem.count -= 1;
      if (sourceItem.count === 0) cafe.menuItems = cafe.menuItems.filter(m => m.type !== menuType);
      const destItem = targetCafe.menuItems.find(m => m.type === menuType);
      if (destItem) destItem.count += 1;
      else targetCafe.menuItems.push({ type: menuType, count: 1, price: { kopi: 3, teh: 2, kue: 4, croissant: 5 }[menuType] });
    }
  }

  // ── SOCIAL ──
  else if (action === "social") {
    if (!area) { res.status(400).json({ error: "Pilih area" }); return; }
    currentPlayer.kap.socialNetworking = Math.min(7, currentPlayer.kap.socialNetworking + 1);
    const level = currentPlayer.kap.socialNetworking;
    const cost = level; // Rp. level
    if (hutang) {
      currentPlayer.hutang += cost;
      currentPlayer.kap.bersediaRisiko += 1;
      addTx(currentPlayer, `Hutang Aksi Social (level ${level})`, cost, "pengeluaran", room.currentRonde);
    } else {
      if (currentPlayer.money < cost) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
      currentPlayer.money -= cost;
      addTx(currentPlayer, `Aksi Social – Area ${area} (level ${level})`, cost, "pengeluaran", room.currentRonde);
    }
    // Add 1 social customer to all cafes in chosen area
    room.cafes.filter(c => c.area === area).forEach(c => { c.socialCustomers += 1; });
  }

  // ── EXPAND ──
  else if (action === "expand") {
    if (!cafeId || !bidType) { res.status(400).json({ error: "Pilih cafe dan tipe pembelian" }); return; }
    const cafe = room.cafes.find(c => c.id === cafeId);
    if (!cafe) { res.status(400).json({ error: "Cafe tidak ditemukan" }); return; }
    if (cafe.ownerId === playerId) { res.status(400).json({ error: "Cafe sudah milikmu" }); return; }

    const maxPrice = cafe.basePrice * 3;

    if (bidType === "buyout") {
      // Instant purchase at 3x price
      const price = maxPrice;
      if (currentPlayer.money < price && !hutang) {
        res.status(400).json({ error: `Uang tidak cukup untuk buy out (${price})` }); return;
      }
      if (hutang) {
        currentPlayer.hutang += price;
        currentPlayer.kap.bersediaRisiko += 1;
      } else {
        currentPlayer.money -= price;
      }
      // Pay previous owner if any
      if (cafe.ownerId) {
        const prevOwner = room.players.find(p => p.id === cafe.ownerId);
        if (prevOwner) {
          prevOwner.money += price;
          addTx(prevOwner, `Menerima buy out: ${cafe.name}`, price, "pemasukan", room.currentRonde);
        }
      }
      cafe.ownerId = playerId;
      addTx(currentPlayer, `Buy Out: ${cafe.name}`, price, "pengeluaran", room.currentRonde);
      currentPlayer.kap.internalLocus = Math.min(7, currentPlayer.kap.internalLocus + 1);

    } else if (bidType === "open_bid") {
      const price = Number(bidPrice) || cafe.basePrice;
      if (price < cafe.basePrice) { res.status(400).json({ error: `Harga minimum bid: Rp.${cafe.basePrice}` }); return; }
      if (price > maxPrice) { res.status(400).json({ error: `Harga maksimum bid: Rp.${maxPrice}` }); return; }
      // Create pending bid — other players must respond
      room.pendingBid = {
        cafeId, bidderId: playerId, cafeName: cafe.name,
        openPrice: price, responses: [], status: "pending",
      };
      currentPlayer.lastAction = action;
      // Don't advance turn yet — wait for bid resolution
      res.json({ ok: true, pendingBid: true });
      return;
    }

    currentPlayer.kap.internalLocus = Math.min(7, currentPlayer.kap.internalLocus + 1);
  } else {
    res.status(400).json({ error: "Aksi tidak valid" }); return;
  }

  currentPlayer.lastAction = action;
  room.actedThisPutaran.push(playerId);
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

  if (room.actedThisPutaran.length >= room.players.length) {
    room.phase = "revenue"; room.actedThisPutaran = [];
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/bid-respond — non-bidder players respond to open bid
router.post("/rooms/:code/bid-respond", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (!room.pendingBid || room.pendingBid.status !== "pending") {
    res.status(400).json({ error: "Tidak ada bidding aktif" }); return;
  }
  const { playerId, accepted, counterPrice } = req.body as {
    playerId: string; accepted: boolean; counterPrice?: number;
  };
  if (room.pendingBid.bidderId === playerId) {
    res.status(400).json({ error: "Kamu adalah bidder" }); return;
  }
  const alreadyResponded = room.pendingBid.responses.some(r => r.playerId === playerId);
  if (alreadyResponded) { res.status(400).json({ error: "Sudah merespons" }); return; }

  room.pendingBid.responses.push({ playerId, accepted, counterPrice });

  // Check if all non-bidders have responded
  const nonBidders = room.players.filter(p => p.id !== room.pendingBid!.bidderId);
  const allResponded = nonBidders.every(p => room.pendingBid!.responses.some(r => r.playerId === p.id));

  if (allResponded) {
    const bid = room.pendingBid!;
    const allAccepted = bid.responses.every(r => r.accepted);
    const cafe = room.cafes.find(c => c.id === bid.cafeId)!;
    const bidder = room.players.find(p => p.id === bid.bidderId)!;

    if (allAccepted) {
      // Bid accepted — bidder buys at openPrice
      if (bidder.money < bid.openPrice) {
        bidder.hutang += bid.openPrice - bidder.money;
        bidder.kap.bersediaRisiko += 1;
        bidder.money = 0;
      } else {
        bidder.money -= bid.openPrice;
      }
      if (cafe.ownerId) {
        const prevOwner = room.players.find(p => p.id === cafe.ownerId);
        if (prevOwner) {
          prevOwner.money += bid.openPrice;
          addTx(prevOwner, `Menerima bid: ${cafe.name}`, bid.openPrice, "pemasukan", room.currentRonde);
        }
      }
      cafe.ownerId = bid.bidderId;
      addTx(bidder, `Open Bid berhasil: ${cafe.name}`, bid.openPrice, "pengeluaran", room.currentRonde);
      bidder.kap.internalLocus = Math.min(7, bidder.kap.internalLocus + 1);
      bid.status = "accepted";
    } else {
      // Bid rejected
      bid.status = "rejected";
    }

    // Advance turn after bid resolves
    bidder.lastAction = "expand";
    room.actedThisPutaran.push(bidder.id);
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    if (room.actedThisPutaran.length >= room.players.length) {
      room.phase = "revenue"; room.actedThisPutaran = [];
    }
    setTimeout(() => { if (room.pendingBid?.status !== "pending") room.pendingBid = null; }, 5000);
  }

  res.json({ ok: true, status: room.pendingBid?.status || "pending" });
});

// POST /api/rooms/:code/revenue
router.post("/rooms/:code/revenue", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId, pendapatan, pajak } = req.body as { playerId: string; pendapatan: number; pajak: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (room.actedThisPutaran.includes(playerId + "_rev")) { res.status(400).json({ error: "Sudah input" }); return; }

  const pend = Number(pendapatan) || 0;
  const pjk = Number(pajak) || 0;
  player.money += pend - pjk;
  if (pend > 0) addTx(player, `Pendapatan Putaran ${room.currentPutaran} Ronde ${room.currentRonde}`, pend, "pemasukan", room.currentRonde);
  if (pjk > 0) addTx(player, `Pajak Cafe Putaran ${room.currentPutaran} Ronde ${room.currentRonde}`, pjk, "pengeluaran", room.currentRonde);
  room.actedThisPutaran.push(playerId + "_rev");

  const allDone = room.players.every(p => room.actedThisPutaran.includes(p.id + "_rev"));
  if (allDone) {
    room.actedThisPutaran = [];
    if (room.currentPutaran === 1) {
      room.currentPutaran = 2; room.phase = "operational"; room.currentTurnIndex = 0;
      room.players.forEach(p => { p.lastAction = null; });
    } else {
      room.phase = "lembur_offer";
    }
  }
  res.json({ ok: true });
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
      room.phase = "operational"; room.currentPutaran = 3; room.currentTurnIndex = 0;
      room.players.forEach(p => { p.lastAction = null; });
    } else {
      advanceRonde(room);
    }
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
    player.money += num; player.hutang += num; player.kap.bersediaRisiko += 1;
    addTx(player, "Pinjam ke Bank", num, "pemasukan", room.currentRonde);
  } else {
    const repay = Math.ceil(num * (4 / 3));
    if (player.money < repay) { res.status(400).json({ error: "Uang tidak cukup" }); return; }
    player.money -= repay; player.hutang = Math.max(0, player.hutang - num);
    player.kap.bersediaRisiko = Math.max(0, player.kap.bersediaRisiko - 1);
    addTx(player, "Bayar Hutang + Bunga", repay, "pengeluaran", room.currentRonde);
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/next-ronde
router.post("/rooms/:code/next-ronde", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  advanceRonde(room);
  res.json({ ok: true, status: room.status });
});

// POST /api/rooms/:code/finish-early
router.post("/rooms/:code/finish-early", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  room.status = "finished"; room.phase = "finished";
  res.json({ ok: true });
});

export default router;
