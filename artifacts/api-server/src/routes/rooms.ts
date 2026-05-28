import { Router } from "express";

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────

type BoardColor = "merah" | "biru" | "kuning" | "hijau";
type ActionChoice = "upgrade" | "social" | "expand" | null;

interface KAP {
  kreativitas: number;        // 0-7 (upgrade steps)
  socialNetworking: number;   // 0-7 (social steps)
  internalLocus: number;      // 0-7 (expand steps)
  toleransiAmbiguitas: number; // 0-7 (same action as prev player)
  bersediaRisiko: number;     // debt level
}

interface Transaction {
  id: string;
  keterangan: string;
  jumlah: number;
  tipe: "pemasukan" | "pengeluaran";
  waktu: string;
  ronde: number;
}

interface Player {
  id: string;
  name: string;
  boardColor: BoardColor;
  isHost: boolean;
  joinedAt: number;
  money: number;       // in Rp (game uses simplified Rp units)
  hutang: number;      // total debt principal
  kap: KAP;
  transactions: Transaction[];
  lastAction: ActionChoice;
  csrPaidThisRound: boolean;
  lemburThisRound: boolean;
}

type GamePhase = "csr" | "operational" | "revenue" | "lembur_offer" | "between_rounds" | "finished";

interface Room {
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  modalAwal: number;
  currentTurnIndex: number;   // index in players array
  status: "waiting" | "playing" | "finished";
  // Round structure
  currentRonde: number;       // 1-4
  currentPutaran: number;     // 1-2 (within a ronde)
  phase: GamePhase;
  // Track who already acted this putaran
  actedThisPutaran: string[]; // player IDs
  createdAt: number;
}

function calculateKAPScore(player: Player): number {
  const k = player.kap;
  let total = 0;
  // Kreativitas KAP bonus
  if (k.kreativitas >= 3) total += 1;
  if (k.kreativitas >= 5) total += 2;  // cumulative with above: +1+2=3 at step 5
  if (k.kreativitas >= 7) total += 3;
  // Social Networking KAP bonus
  if (k.socialNetworking >= 3) total += 1;
  if (k.socialNetworking >= 5) total += 2;
  if (k.socialNetworking >= 7) total += 3;
  // Internal Locus of Control KAP bonus
  if (k.internalLocus >= 3) total += 1;
  if (k.internalLocus >= 4) total += 2;
  if (k.internalLocus >= 6) total += 3;
  if (k.internalLocus >= 7) total += 4;
  // Toleransi Ambiguitas KAP penalty
  if (k.toleransiAmbiguitas >= 2) total -= 1;
  if (k.toleransiAmbiguitas >= 4) total -= 2;
  if (k.toleransiAmbiguitas >= 7) total -= 3;
  // Final money → KAP (1 KAP per Rp. 10)
  total += Math.floor(player.money / 10);
  return Math.max(0, total);
}

// ── Helpers ────────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function cleanOldRooms() {
  const cutoff = Date.now() - 8 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.createdAt < cutoff) rooms.delete(code);
  }
}

function makePlayer(id: string, name: string, boardColor: BoardColor, isHost: boolean, modal: number): Player {
  return {
    id, name, boardColor, isHost,
    joinedAt: Date.now(),
    money: modal,
    hutang: 0,
    kap: { kreativitas: 0, socialNetworking: 0, internalLocus: 0, toleransiAmbiguitas: 0, bersediaRisiko: 0 },
    transactions: [],
    lastAction: null,
    csrPaidThisRound: false,
    lemburThisRound: false,
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────

// POST /api/rooms — create room
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
    currentTurnIndex: 0,
    status: "waiting",
    currentRonde: 1,
    currentPutaran: 1,
    phase: "csr",
    actedThisPutaran: [],
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  res.json({ code, playerId: hostId });
});

// GET /api/rooms/:code
router.get("/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  // Attach computed KAP scores
  const enriched = {
    ...room,
    players: room.players.map(p => ({ ...p, kapScore: calculateKAPScore(p) })),
  };
  res.json(enriched);
});

// POST /api/rooms/:code/join
router.post("/rooms/:code/join", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.status !== "waiting") { res.status(400).json({ error: "Permainan sudah dimulai" }); return; }
  if (room.players.length >= room.maxPlayers) { res.status(400).json({ error: "Room sudah penuh" }); return; }

  const { playerName, boardColor } = req.body as { playerName: string; boardColor: BoardColor };
  if (!playerName?.trim()) { res.status(400).json({ error: "Nama wajib diisi" }); return; }

  // Check if color taken
  if (room.players.some(p => p.boardColor === boardColor)) {
    res.status(400).json({ error: "Warna board sudah dipakai pemain lain" }); return;
  }

  const playerId = generateId();
  room.players.push(makePlayer(playerId, playerName.trim(), boardColor || "biru", false, room.modalAwal));
  res.json({ playerId, code: room.code });
});

// POST /api/rooms/:code/start
router.post("/rooms/:code/start", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host yang bisa memulai" }); return; }
  if (room.players.length < 2) { res.status(400).json({ error: "Minimal 2 pemain" }); return; }

  room.status = "playing";
  room.currentRonde = 1;
  room.currentPutaran = 1;
  room.phase = "csr";
  room.actedThisPutaran = [];
  room.currentTurnIndex = 0;
  res.json({ ok: true });
});

// POST /api/rooms/:code/csr — pay CSR for KAP this round
router.post("/rooms/:code/csr", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "csr") { res.status(400).json({ error: "Bukan fase CSR" }); return; }

  const { playerId, amount } = req.body as { playerId: string; amount: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (player.csrPaidThisRound) { res.status(400).json({ error: "Sudah bayar CSR ronde ini" }); return; }

  const num = Number(amount);
  let kapGain = 0;
  if (num === 4) kapGain = 1;
  else if (num === 7) kapGain = 2;
  else { res.status(400).json({ error: "Jumlah CSR harus Rp.4 atau Rp.7" }); return; }

  if (player.money < num) { res.status(400).json({ error: "Uang tidak cukup" }); return; }

  player.money -= num;
  // CSR directly adds to KAP "kebutuhan berprestasi" — we track it as bonus in transactions + kapScore
  player.transactions.push({
    id: generateId(),
    keterangan: `CSR Fase Ronde ${room.currentRonde}`,
    jumlah: num,
    tipe: "pengeluaran",
    waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    ronde: room.currentRonde,
  });
  // Store CSR KAP directly as money-equivalent bonus: add 10×kapGain to money (reflected in final KAP calc)
  // Actually let's add a csrKAP field instead
  (player as unknown as Record<string, number>).csrKAP = ((player as unknown as Record<string, number>).csrKAP || 0) + kapGain;
  player.csrPaidThisRound = true;

  // Check if all players have decided (paid or skipped)
  const allDecided = room.players.every(p => p.csrPaidThisRound || room.actedThisPutaran.includes(p.id + "_csr_skip"));
  if (allDecided) {
    room.phase = "operational";
    room.actedThisPutaran = [];
  }

  res.json({ ok: true, kapGain });
});

// POST /api/rooms/:code/csr-skip — skip CSR
router.post("/rooms/:code/csr-skip", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "csr") { res.status(400).json({ error: "Bukan fase CSR" }); return; }

  const { playerId } = req.body as { playerId: string };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }

  room.actedThisPutaran.push(playerId + "_csr_skip");
  player.csrPaidThisRound = true; // mark as decided

  const allDecided = room.players.every(p => p.csrPaidThisRound);
  if (allDecided) {
    room.phase = "operational";
    room.actedThisPutaran = [];
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/action — player chooses upgrade/social/expand
router.post("/rooms/:code/action", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "operational") { res.status(400).json({ error: "Bukan fase operasional" }); return; }

  const currentPlayer = room.players[room.currentTurnIndex];
  const { playerId, action, socialLevel, hutang } = req.body as {
    playerId: string;
    action: ActionChoice;
    socialLevel?: number; // cost for social action (socialNetworking level × price)
    hutang?: boolean;     // whether paying via hutang
  };

  if (!currentPlayer || currentPlayer.id !== playerId) {
    res.status(403).json({ error: "Bukan giliran kamu" }); return;
  }

  // Check toleransi ambiguitas — same action as previous player?
  const prevPlayer = room.players[room.currentTurnIndex > 0 ? room.currentTurnIndex - 1 : room.players.length - 1];
  if (prevPlayer && prevPlayer.lastAction === action && room.actedThisPutaran.length > 0) {
    currentPlayer.kap.toleransiAmbiguitas = Math.min(7, currentPlayer.kap.toleransiAmbiguitas + 1);
  }

  // Apply action effects
  if (action === "upgrade") {
    currentPlayer.kap.kreativitas = Math.min(7, currentPlayer.kap.kreativitas + 1);
  } else if (action === "social") {
    currentPlayer.kap.socialNetworking = Math.min(7, currentPlayer.kap.socialNetworking + 1);
    const level = currentPlayer.kap.socialNetworking;
    const cost = level; // Rp. 1 per level 1, Rp. 2 per level 2, etc.
    if (hutang) {
      currentPlayer.hutang += cost;
      currentPlayer.kap.bersediaRisiko += 1;
    } else {
      if (currentPlayer.money < cost) { res.status(400).json({ error: "Uang tidak cukup, gunakan hutang?" }); return; }
      currentPlayer.money -= cost;
    }
    currentPlayer.transactions.push({
      id: generateId(),
      keterangan: `Aksi Social (level ${level})`,
      jumlah: cost,
      tipe: "pengeluaran",
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      ronde: room.currentRonde,
    });
  } else if (action === "expand") {
    currentPlayer.kap.internalLocus = Math.min(7, currentPlayer.kap.internalLocus + 1);
  }

  currentPlayer.lastAction = action;
  room.actedThisPutaran.push(playerId);

  // Move to next player or end putaran
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

  // If all players acted this putaran
  if (room.actedThisPutaran.length >= room.players.length) {
    room.phase = "revenue";
    room.actedThisPutaran = [];
  }

  res.json({ ok: true });
});

// POST /api/rooms/:code/revenue — record revenue & expenses for this putaran
router.post("/rooms/:code/revenue", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }

  const { playerId, pendapatan, pajak } = req.body as {
    playerId: string; pendapatan: number; pajak: number;
  };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }
  if (room.actedThisPutaran.includes(playerId + "_rev")) { res.status(400).json({ error: "Sudah input pendapatan" }); return; }

  const pend = Number(pendapatan) || 0;
  const pjk = Number(pajak) || 0;
  player.money += pend - pjk;

  if (pend > 0) {
    player.transactions.push({
      id: generateId(),
      keterangan: `Pendapatan Putaran ${room.currentPutaran} Ronde ${room.currentRonde}`,
      jumlah: pend, tipe: "pemasukan",
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      ronde: room.currentRonde,
    });
  }
  if (pjk > 0) {
    player.transactions.push({
      id: generateId(),
      keterangan: `Pajak Cafe Putaran ${room.currentPutaran} Ronde ${room.currentRonde}`,
      jumlah: pjk, tipe: "pengeluaran",
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      ronde: room.currentRonde,
    });
  }

  room.actedThisPutaran.push(playerId + "_rev");

  // Check if all players submitted revenue
  const allDone = room.players.every(p => room.actedThisPutaran.includes(p.id + "_rev"));
  if (allDone) {
    room.actedThisPutaran = [];
    if (room.currentPutaran === 1) {
      // Start putaran 2
      room.currentPutaran = 2;
      room.phase = "operational";
      room.currentTurnIndex = 0;
      room.players.forEach(p => { p.lastAction = null; });
    } else {
      // After putaran 2 → lembur offer
      room.phase = "lembur_offer";
    }
  }

  res.json({ ok: true });
});

// POST /api/rooms/:code/lembur — choose lembur (true=yes, false=skip)
router.post("/rooms/:code/lembur", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  if (room.phase !== "lembur_offer") { res.status(400).json({ error: "Bukan fase lembur" }); return; }

  const { playerId, lembur } = req.body as { playerId: string; lembur: boolean };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }

  if (lembur) {
    if (player.money < 5) { res.status(400).json({ error: "Uang tidak cukup untuk lembur (Rp.5)" }); return; }
    player.money -= 5;
    player.lemburThisRound = true;
    player.transactions.push({
      id: generateId(),
      keterangan: `Lembur Ronde ${room.currentRonde}`,
      jumlah: 5, tipe: "pengeluaran",
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      ronde: room.currentRonde,
    });
  }

  room.actedThisPutaran.push(playerId + "_lembur");

  const allDecided = room.players.every(p => room.actedThisPutaran.includes(p.id + "_lembur"));
  if (allDecided) {
    room.actedThisPutaran = [];
    // Any player chose lembur? They get 1 extra putaran (handled as operational → revenue again)
    const anyLembur = room.players.some(p => p.lemburThisRound);
    if (anyLembur) {
      room.phase = "operational";
      room.currentPutaran = 3; // "lembur putaran"
      room.currentTurnIndex = 0;
      room.players.forEach(p => { p.lastAction = null; });
    } else {
      // Advance ronde
      advanceRonde(room);
    }
  }
  res.json({ ok: true });
});

function advanceRonde(room: Room) {
  room.players.forEach(p => { p.csrPaidThisRound = false; p.lemburThisRound = false; p.lastAction = null; });
  if (room.currentRonde >= 4) {
    room.status = "finished";
    room.phase = "finished";
    // Final KAP: also check who has most coffee/tea/cake/croissant
    // (This is tracked physically; app shows final KAP scores)
  } else {
    room.currentRonde += 1;
    room.currentPutaran = 1;
    room.phase = "csr";
    room.actedThisPutaran = [];
    room.currentTurnIndex = 0;
    // First player rotates: move first player to end
    const first = room.players.shift()!;
    room.players.push(first);
  }
}

// POST /api/rooms/:code/next-ronde — host manually advances ronde (if needed)
router.post("/rooms/:code/next-ronde", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  advanceRonde(room);
  res.json({ ok: true, status: room.status });
});

// POST /api/rooms/:code/debt — add/repay debt
router.post("/rooms/:code/debt", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId, action, amount } = req.body as { playerId: string; action: "borrow" | "repay"; amount: number };
  const player = room.players.find(p => p.id === playerId);
  if (!player) { res.status(404).json({ error: "Pemain tidak ditemukan" }); return; }

  const num = Number(amount);
  if (action === "borrow") {
    player.money += num;
    player.hutang += num;
    player.kap.bersediaRisiko += 1;
    player.transactions.push({
      id: generateId(), keterangan: "Pinjam ke Bank", jumlah: num, tipe: "pemasukan",
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      ronde: room.currentRonde,
    });
  } else {
    const repay = num * (4 / 3); // borrow Rp.3 → repay Rp.4
    if (player.money < repay) { res.status(400).json({ error: "Uang tidak cukup untuk bayar hutang" }); return; }
    player.money -= repay;
    player.hutang = Math.max(0, player.hutang - num);
    player.kap.bersediaRisiko = Math.max(0, player.kap.bersediaRisiko - 1);
    player.transactions.push({
      id: generateId(), keterangan: "Bayar Hutang + Bunga", jumlah: repay, tipe: "pengeluaran",
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      ronde: room.currentRonde,
    });
  }
  res.json({ ok: true });
});

// POST /api/rooms/:code/finish-early — host ends game early
router.post("/rooms/:code/finish-early", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) { res.status(404).json({ error: "Room tidak ditemukan" }); return; }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) { res.status(403).json({ error: "Hanya host" }); return; }
  room.status = "finished";
  room.phase = "finished";
  res.json({ ok: true });
});

export default router;
