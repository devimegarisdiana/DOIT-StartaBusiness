import { Suspense, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Environment } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useParams, useLocation } from "wouter";
import { useRoom } from "../hooks/useRoom";
import type { CafeSlot, MenuItem } from "../hooks/useRoom";
import { Board3D } from "../components/Board3D";
import { HUD } from "../components/HUD";
import type { BoardColor } from "../hooks/useRoom";

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto animate-pulse">
          <span className="text-2xl">🎲</span>
        </div>
        <div className="font-['Orbitron'] text-sm font-bold text-white">Memuat scene 3D…</div>
        <div className="flex gap-1 justify-center">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameScene() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const code = params.code?.toUpperCase() || "";
  const myId = localStorage.getItem("doit3d_playerId") || "";
  const { room, error, loading, setupCafe, payCsr, doAction } = useRoom(code);
  const [selectedCafe, setSelectedCafe] = useState<CafeSlot | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const myPlayer = room?.players.find(p => p.id === myId);

  if (loading && !room) return <LoadingFallback />;

  if (error && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass rounded-2xl p-8 text-center max-w-xs w-full mx-4">
          <div className="text-3xl mb-3">⚠️</div>
          <div className="text-white font-bold mb-1">Room tidak ditemukan</div>
          <div className="text-muted-foreground text-sm mb-4">{error}</div>
          <button onClick={() => setLocation("/")} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold">
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!room) return <LoadingFallback />;

  const myColor = myPlayer?.boardColor as BoardColor | undefined;

  async function handleCafeSetup(name: string, menuItems: MenuItem[], seats: number) {
    try { await setupCafe(myId, menuItems, seats, name); }
    catch (e) { alert((e as Error).message); }
  }

  async function handleCsr(amount: number | null) {
    try { await payCsr(myId, amount); }
    catch (e) { alert((e as Error).message); }
  }

  async function handleAction(body: Record<string, unknown>) {
    try { await doAction(body); }
    catch (e) { alert((e as Error).message); }
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      {/* 3D Canvas */}
      <Canvas
        shadows="variance"
        camera={{ position: [0, 6, 5], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} color="#e0f0ff" />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          color="#fffef0"
        />
        <pointLight position={[0, 4, 0]} intensity={0.5} color="#4499ff" />

        {/* Background */}
        <Stars radius={60} depth={30} count={2000} factor={3} saturation={0.5} fade speed={0.5} />
        <Environment preset="night" />

        {/* Game board */}
        <Suspense fallback={null}>
          <Board3D
            cafes={room.cafes}
            players={room.players}
            onSelectCafe={setSelectedCafe}
            selectedCafeId={selectedCafe?.id || null}
            myColor={myColor || null}
          />
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2.5}
          maxDistance={14}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
          panSpeed={0.8}
          zoomSpeed={0.8}
          rotateSpeed={0.5}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      {/* HTML HUD overlay */}
      <HUD
        room={room}
        myId={myId}
        selectedCafe={selectedCafe}
        onCafeSetup={handleCafeSetup}
        onCsr={handleCsr}
        onAction={handleAction}
      />

      {/* Camera reset button */}
      <button
        onClick={() => controlsRef.current?.reset()}
        className="absolute bottom-14 right-3 glass rounded-xl w-9 h-9 flex items-center justify-center text-sm hover:bg-white/10 transition pointer-events-auto"
        title="Reset kamera"
      >
        🎥
      </button>

      {/* Exit button */}
      <button
        onClick={() => setLocation("/")}
        className="absolute bottom-3 right-3 glass rounded-xl w-9 h-9 flex items-center justify-center text-sm hover:bg-white/10 transition pointer-events-auto"
        title="Keluar"
      >
        ✕
      </button>

      {/* Minimap legend */}
      <div className="absolute bottom-3 left-3 glass rounded-xl p-2 flex gap-2 items-center pointer-events-none">
        {(["merah","biru","kuning","hijau"] as BoardColor[]).map(c => {
          const colors: Record<string, string> = { merah:"#ef4444", biru:"#3b82f6", kuning:"#eab308", hijau:"#22c55e" };
          const labels: Record<string, string> = { merah:"Merah", biru:"Biru", kuning:"Kuning", hijau:"Hijau" };
          const player = room.players.find(p => p.boardColor === c);
          return (
            <div key={c} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[c] }} />
              <span className="text-[9px] text-white/60">{player?.name || labels[c]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
