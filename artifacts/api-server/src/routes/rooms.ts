import { Router } from "express";

const router = Router();

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
  joinedAt: number;
  transactions: Transaction[];
}

interface Room {
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  modalAwal: number;
  currentTurnIndex: number;
  status: "waiting" | "playing" | "finished";
  createdAt: number;
}

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
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.createdAt < cutoff) rooms.delete(code);
  }
}

// POST /api/rooms — create room
router.post("/rooms", (req, res) => {
  cleanOldRooms();
  const { hostName, maxPlayers, modalAwal } = req.body as {
    hostName: string;
    maxPlayers: number;
    modalAwal: number;
  };

  if (!hostName?.trim()) {
    res.status(400).json({ error: "Nama pemain wajib diisi" });
    return;
  }

  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const hostId = generateId();
  const room: Room = {
    code,
    hostId,
    players: [{ id: hostId, name: hostName.trim(), isHost: true, joinedAt: Date.now(), transactions: [] }],
    maxPlayers: Math.min(4, Math.max(2, Number(maxPlayers) || 4)),
    modalAwal: Number(modalAwal) || 500000,
    currentTurnIndex: 0,
    status: "waiting",
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  res.json({ code, playerId: hostId });
});

// GET /api/rooms/:code — get room state
router.get("/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Room tidak ditemukan" });
    return;
  }
  res.json(room);
});

// POST /api/rooms/:code/join — join room
router.post("/rooms/:code/join", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Room tidak ditemukan" });
    return;
  }
  if (room.status !== "waiting") {
    res.status(400).json({ error: "Permainan sudah dimulai" });
    return;
  }
  if (room.players.length >= room.maxPlayers) {
    res.status(400).json({ error: "Room sudah penuh" });
    return;
  }

  const { playerName } = req.body as { playerName: string };
  if (!playerName?.trim()) {
    res.status(400).json({ error: "Nama pemain wajib diisi" });
    return;
  }

  const playerId = generateId();
  room.players.push({ id: playerId, name: playerName.trim(), isHost: false, joinedAt: Date.now(), transactions: [] });
  res.json({ playerId, code: room.code });
});

// POST /api/rooms/:code/start — start game (host only)
router.post("/rooms/:code/start", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Room tidak ditemukan" });
    return;
  }
  const { playerId } = req.body as { playerId: string };
  if (room.hostId !== playerId) {
    res.status(403).json({ error: "Hanya host yang bisa memulai" });
    return;
  }
  if (room.players.length < 2) {
    res.status(400).json({ error: "Minimal 2 pemain untuk memulai" });
    return;
  }
  room.status = "playing";
  room.currentTurnIndex = 0;
  res.json({ ok: true });
});

// POST /api/rooms/:code/transactions — add transaction (current player only)
router.post("/rooms/:code/transactions", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Room tidak ditemukan" });
    return;
  }
  if (room.status !== "playing") {
    res.status(400).json({ error: "Permainan belum dimulai" });
    return;
  }

  const { playerId, keterangan, jumlah, tipe } = req.body as {
    playerId: string;
    keterangan: string;
    jumlah: number;
    tipe: "pemasukan" | "pengeluaran";
  };

  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    res.status(403).json({ error: "Bukan giliran kamu" });
    return;
  }

  const tx: Transaction = {
    id: generateId(),
    keterangan: keterangan?.trim() || "",
    jumlah: Number(jumlah) || 0,
    tipe,
    waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
  currentPlayer.transactions.push(tx);
  res.json({ ok: true, transaction: tx });
});

// DELETE /api/rooms/:code/transactions/:txId — delete transaction (current player only)
router.delete("/rooms/:code/transactions/:txId", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Room tidak ditemukan" });
    return;
  }
  const { playerId } = req.body as { playerId: string };
  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    res.status(403).json({ error: "Bukan giliran kamu" });
    return;
  }
  currentPlayer.transactions = currentPlayer.transactions.filter(t => t.id !== req.params.txId);
  res.json({ ok: true });
});

// POST /api/rooms/:code/next-turn — end turn
router.post("/rooms/:code/next-turn", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Room tidak ditemukan" });
    return;
  }
  const { playerId } = req.body as { playerId: string };
  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    res.status(403).json({ error: "Bukan giliran kamu" });
    return;
  }
  room.currentTurnIndex++;
  if (room.currentTurnIndex >= room.players.length) {
    room.status = "finished";
  }
  res.json({ ok: true, status: room.status });
});

export default router;
