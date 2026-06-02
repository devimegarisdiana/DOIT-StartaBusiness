import { useRef, useMemo, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text, useTexture } from "@react-three/drei";
import type { Mesh } from "three";
import * as THREE from "three";
import type { CafeSlot, Player, BoardColor } from "../hooks/useRoom";

const AREA_HEX: Record<BoardColor, string> = {
  merah: "#ef4444",
  biru: "#3b82f6",
  kuning: "#eab308",
  hijau: "#22c55e",
};

const SLOT_OFFSETS: [number, number][] = [
  [-0.45, -0.45],
  [ 0.45, -0.45],
  [-0.45,  0.45],
  [ 0.45,  0.45],
];

const AREA_CENTERS: Record<BoardColor, [number, number]> = {
  merah:  [-1.5,  1.5],
  biru:   [ 1.5,  1.5],
  hijau:  [-1.5, -1.5],
  kuning: [ 1.5, -1.5],
};

const AREA_NAMES: Record<BoardColor, string> = {
  merah: "Area Hotel", biru: "Area Sekolah", hijau: "Area Taman", kuning: "Area Kantor"
};

const BASE = "/do-it-3d/";

interface Props {
  cafes: CafeSlot[];
  players: Player[];
  onSelectCafe: (cafe: CafeSlot) => void;
  selectedCafeId: string | null;
  myColor: BoardColor | null;
}

// ── House-shaped cafe building (like penanda kafe in the board game) ──────────
function CafeBuilding({ cafe, isSelected, isMine, onClick }: {
  cafe: CafeSlot;
  isSelected: boolean;
  isMine: boolean;
  onClick: () => void;
}) {
  const bodyRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  const height = useMemo(() => {
    if (!cafe.isSetup || !cafe.ownerId) return 0.05;
    const menuCount = cafe.menuItems.reduce((s, m) => s + m.count, 0);
    return 0.18 + menuCount * 0.05 + cafe.seats * 0.035;
  }, [cafe]);

  const color = cafe.ownerId ? (AREA_HEX[cafe.area as BoardColor] || "#888") : "#1e293b";
  const emissiveIntensity = isSelected ? 0.7 : isMine ? 0.35 : 0.12;

  useFrame((_, delta) => {
    if (bodyRef.current && isSelected) {
      bodyRef.current.rotation.y += delta * 0.8;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.07);
    }
  });

  const [cx, cz] = AREA_CENTERS[cafe.area as BoardColor];
  const [ox, oz] = SLOT_OFFSETS[(cafe.slotIndex - 1) % 4];
  const x = cx + ox;
  const z = cz + oz;

  if (!cafe.isSetup || !cafe.ownerId) {
    return (
      <mesh position={[x, 0.02, z]} onClick={onClick} receiveShadow>
        <boxGeometry args={[0.3, 0.04, 0.3]} />
        <meshStandardMaterial color="#0f1a2e" roughness={0.9} />
      </mesh>
    );
  }

  const roofColor = color;
  const wallColor = "#f8fafc";
  const doorColor = color;

  return (
    <group position={[x, 0, z]}>
      {/* Glow ring */}
      {isSelected && (
        <mesh ref={glowRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}

      {/* Foundation platform */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[0.38, 0.03, 0.38]} />
        <meshStandardMaterial color={color} roughness={0.8} opacity={0.25} transparent />
      </mesh>

      {/* House body (walls) */}
      <mesh ref={bodyRef} position={[0, height / 2 + 0.03, 0]} onClick={onClick} castShadow receiveShadow>
        <boxGeometry args={[0.28, height, 0.28]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} metalness={0.05} emissive={color} emissiveIntensity={emissiveIntensity * 0.2} />
      </mesh>

      {/* Roof (pyramid / house shape) */}
      <mesh position={[0, height + 0.03 + 0.07, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.22, 0.14, 4]} />
        <meshStandardMaterial color={roofColor} emissive={roofColor} emissiveIntensity={emissiveIntensity} roughness={0.4} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.03 + height * 0.22, 0.142]}>
        <boxGeometry args={[0.08, height * 0.38, 0.01]} />
        <meshStandardMaterial color={doorColor} emissive={doorColor} emissiveIntensity={0.4} roughness={0.3} />
      </mesh>

      {/* Window left */}
      <mesh position={[-0.085, 0.03 + height * 0.6, 0.142]}>
        <boxGeometry args={[0.07, 0.06, 0.01]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.6} roughness={0.1} />
      </mesh>

      {/* Window right */}
      <mesh position={[0.085, 0.03 + height * 0.6, 0.142]}>
        <boxGeometry args={[0.07, 0.06, 0.01]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.6} roughness={0.1} />
      </mesh>

      {/* Seat count dots (shown as small lights on the base) */}
      {Array.from({ length: Math.min(cafe.seats, 6) }).map((_, i) => (
        <mesh key={i} position={[-0.13 + i * 0.052, 0.04, -0.13]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
      ))}

      {/* Cafe name */}
      <Text
        position={[0, height + 0.22, 0]}
        fontSize={0.065}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.5}
        outlineWidth={0.005}
        outlineColor="#000"
      >
        {cafe.name.length > 9 ? cafe.name.slice(0, 9) + "…" : cafe.name}
      </Text>
    </group>
  );
}

// ── Player token ──────────────────────────────────────────────────────────────
function PlayerToken({ player, index, total }: { player: Player; index: number; total: number }) {
  const meshRef = useRef<Mesh>(null);
  const color = AREA_HEX[player.boardColor] || "#888";
  const [cx, cz] = AREA_CENTERS[player.boardColor];
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const x = cx + Math.cos(angle) * 0.16;
  const z = cz + Math.sin(angle) * 0.16;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.22 + Math.sin(Date.now() * 0.002 + index) * 0.04;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.18, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.1} metalness={0.8} />
      </mesh>
      <Text position={[0, 0.45, 0]} fontSize={0.065} color={color} anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor="#000">
        {player.name.slice(0, 7)}
      </Text>
    </group>
  );
}

// ── Area quadrant with board texture ─────────────────────────────────────────
function AreaQuadrantTextured({ area }: { area: BoardColor }) {
  const color = AREA_HEX[area];
  const [cx, cz] = AREA_CENTERS[area];

  const texturePath = `${BASE}game-assets/board_${area}.png`;
  const texture = useTexture(texturePath);

  const mat = useMemo(() => {
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [texture]);

  return (
    <group position={[cx, 0, cz]}>
      {/* Board image textured floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[2.85, 2.85]} />
        <meshStandardMaterial map={mat} roughness={0.85} transparent opacity={0.92} />
      </mesh>

      {/* Color tint overlay for vibrancy */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[2.85, 2.85]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      {/* Border frame */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[1.38, 1.46, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* Area corner label */}
      <Text
        position={[0, 0.01, -1.3]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.09}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor="#000"
      >
        {AREA_NAMES[area]}
      </Text>
    </group>
  );
}

function AreaQuadrantFallback({ area }: { area: BoardColor }) {
  const color = AREA_HEX[area];
  const [cx, cz] = AREA_CENTERS[area];
  return (
    <group position={[cx, 0, cz]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[2.85, 2.85]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.15} />
      </mesh>
      <Text position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.18} color={color} anchorX="center" anchorY="middle" fillOpacity={0.25}>
        {AREA_NAMES[area]}
      </Text>
    </group>
  );
}

// ── City skyline backdrop ─────────────────────────────────────────────────────
function CitySkyline() {
  const texture = useTexture(`${BASE}game-assets/city_skyline.png`);
  const mat = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [texture]);
  return (
    <mesh position={[0, 1.2, -5.5]} rotation={[0, 0, 0]}>
      <planeGeometry args={[14, 3.5]} />
      <meshBasicMaterial map={mat} transparent opacity={0.55} />
    </mesh>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────
export function Board3D({ cafes, players, onSelectCafe, selectedCafeId, myColor }: Props) {
  const areas: BoardColor[] = ["merah", "biru", "hijau", "kuning"];

  return (
    <group>
      {/* Base board surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[6.6, 6.6]} />
        <meshStandardMaterial color="#0a0f1e" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Board frame border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <ringGeometry args={[3.22, 3.5, 4]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.5} />
      </mesh>

      {/* Divider cross lines */}
      <group position={[0, 0.001, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[6.2, 0.06]} />
          <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[0.06, 6.2]} />
          <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Area quadrants with board images */}
      {areas.map(area => (
        <Suspense key={area} fallback={<AreaQuadrantFallback area={area} />}>
          <AreaQuadrantTextured area={area} />
        </Suspense>
      ))}

      {/* Center piece */}
      <group position={[0, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
          <ringGeometry args={[0.44, 0.58, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} />
        </mesh>
        <Text position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.11} color="#fbbf24" anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor="#000">
          DO IT
        </Text>
        <Text position={[0, 0.04, 0.12]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.055} color="#94a3b8" anchorX="center" anchorY="middle">
          Start a Business
        </Text>
      </group>

      {/* Cafe buildings (house-shaped) */}
      {cafes.map(cafe => (
        <CafeBuilding
          key={cafe.id}
          cafe={cafe}
          isSelected={selectedCafeId === cafe.id}
          isMine={myColor !== null && cafe.area === myColor}
          onClick={() => onSelectCafe(cafe)}
        />
      ))}

      {/* Player tokens */}
      {players.map((player, i) => (
        <PlayerToken key={player.id} player={player} index={i} total={players.length} />
      ))}

      {/* Area point lights */}
      {areas.map(area => {
        const [cx, cz] = AREA_CENTERS[area];
        return (
          <pointLight
            key={`light-${area}`}
            position={[cx, 2, cz]}
            color={AREA_HEX[area]}
            intensity={0.5}
            distance={3.5}
            decay={2}
          />
        );
      })}

      {/* City skyline backdrop */}
      <Suspense fallback={null}>
        <CitySkyline />
      </Suspense>
    </group>
  );
}
