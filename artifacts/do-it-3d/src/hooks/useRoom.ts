import { useState, useEffect, useCallback, useRef } from "react";

export type BoardColor = "merah" | "biru" | "kuning" | "hijau";
export type GamePhase = "cafe_setup" | "csr" | "operational" | "lembur_offer" | "customer_input" | "revenue" | "end_game_sell" | "finished";

export interface MenuItem { type: string; count: number; price: number; }
export interface CafeSlot {
  id: string; area: BoardColor; slotIndex: number; name: string;
  bidPrice: number; buyoutPrice: number; ownerId: string | null;
  menuItems: MenuItem[]; seats: number; socialCustomers: number; isSetup: boolean;
}
export interface PlayerAreaLevel { area: BoardColor; level: number; }
export interface KAP {
  kreativitas: number; socialNetworking: number; internalLocus: number;
  toleransiAmbiguitas: number; bersediaRisiko: number;
}
export interface Player {
  id: string; name: string; boardColor: BoardColor; isHost: boolean;
  money: number; hutang: number; kap: KAP; kapScore: number;
  lastAction: string | null; csrPaidThisRound: boolean;
  areaLevels: PlayerAreaLevel[]; cafeSetupDone: boolean; finalKAP?: number;
}
export interface PendingBid {
  cafeId: string; bidderId: string; cafeName: string; openPrice: number;
  responses: { playerId: string; accepted: boolean }[]; status: string;
}
export interface Room {
  code: string; hostId: string; players: Player[]; maxPlayers: number;
  modalAwal: number; currentTurnIndex: number; status: string;
  currentRonde: number; currentPutaran: number; phase: GamePhase;
  actedThisPutaran: string[]; cafes: CafeSlot[];
  pendingBid: PendingBid | null; createdAt: number;
}

const BASE = "/api";
const POLL_MS = 2500;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function useRoom(code: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!code) return;
    try {
      const data = await apiFetch(`/rooms/${code}`);
      setRoom(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetchRoom().finally(() => setLoading(false));
    timerRef.current = setInterval(fetchRoom, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [code, fetchRoom]);

  const createRoom = useCallback(async (hostName: string, boardColor: BoardColor, maxPlayers: number, modalAwal: number) => {
    const data = await apiFetch("/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName, boardColor, maxPlayers, modalAwal }),
    });
    return data as { code: string; playerId: string };
  }, []);

  const joinRoom = useCallback(async (roomCode: string, playerName: string, boardColor: BoardColor) => {
    const data = await apiFetch(`/rooms/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, boardColor }),
    });
    return data as { playerId: string; code: string };
  }, []);

  const startGame = useCallback(async (playerId: string, testMode = false) => {
    await apiFetch(`/rooms/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, testMode }),
    });
    await fetchRoom();
  }, [code, fetchRoom]);

  const setupCafe = useCallback(async (playerId: string, menuItems: MenuItem[], seats: number, name: string) => {
    await apiFetch(`/rooms/${code}/cafe-setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, menuItems, seats, name }),
    });
    await fetchRoom();
  }, [code, fetchRoom]);

  const payCsr = useCallback(async (playerId: string, amount: number | null) => {
    await apiFetch(`/rooms/${code}/csr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, amount }),
    });
    await fetchRoom();
  }, [code, fetchRoom]);

  const doAction = useCallback(async (body: Record<string, unknown>) => {
    await apiFetch(`/rooms/${code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await fetchRoom();
  }, [code, fetchRoom]);

  const respondBid = useCallback(async (playerId: string, accepted: boolean) => {
    await apiFetch(`/rooms/${code}/bid-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, accepted }),
    });
    await fetchRoom();
  }, [code, fetchRoom]);

  return { room, error, loading, createRoom, joinRoom, startGame, setupCafe, payCsr, doAction, respondBid, refetch: fetchRoom };
}
