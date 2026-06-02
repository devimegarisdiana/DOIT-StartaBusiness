import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import type { Mesh } from "three";
import * as THREE from "three";
import type { CafeSlot, Player, BoardColor } from "../hooks/useRoom";

const AREA_HEX: Record<BoardColor, string> = {
  merah: "#ef4444",
  biru: "#3b82f6",
  kuning: "#eab308",
  hijau: "#22c55e",
};

// Slot positions within each 2x2 quadrant (world x,z)
// Quadrant centers: merah=(-1.5,1.5), biru=(1.5,1.5), hijau=(-1.5,-1.5), kuning=(1.5,-1.5)
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

const AREA_LABELS: Record<BoardColor, string> = {
  merah: "MERAH", biru: "BIRU", hijau: "HIJAU", kuning: "KUNING"
};

interface Props {
  cafes: CafeSlot[];
  players: Player[];
  onSelectCafe: (cafe: CafeSlot) => void;
  selectedCafeId: string | null;
  myColor: BoardColor | null;
}

function CafeBuilding({ cafe, isSelected, isMine, onClick }: {
  cafe: CafeSlot;
  isSelected: boolean;
  isMine: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  const height = useMemo(() => {
    if (!cafe.isSetup || !cafe.ownerId) return 0.05;
    const menuCount = cafe.menuItems.reduce((s, m) => s + m.count, 0);
    return 0.15 + menuCount * 0.06 + cafe.seats * 0.04;
  }, [cafe]);

  const color = cafe.ownerId ? (AREA_HEX[cafe.area as BoardColor] || "#888") : "#334155";
  const emissiveIntensity = isSelected ? 0.8 : isMine ? 0.3 : 0.1;

  useFrame((_, delta) => {
    if (meshRef.current && (isSelected || isMine)) {
      meshRef.current.rotation.y += delta * (isSelected ? 1.2 : 0.4);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.05);
    }
  });

  const [cx, cz] = AREA_CENTERS[cafe.area as BoardColor];
  const [ox, oz] = SLOT_OFFSETS[(cafe.slotIndex - 1) % 4];
  const x = cx + ox;
  const z = cz + oz;
  const y = height / 2;

  if (!cafe.isSetup || !cafe.ownerId) {
    return (
      <mesh position={[x, 0.02, z]} onClick={onClick} receiveShadow>
        <boxGeometry args={[0.32, 0.04, 0.32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
    );
  }

  return (
    <group position={[x, 0, z]}>
      {/* Base platform */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[0.36, 0.03, 0.36]} />
        <meshStandardMaterial color={color} roughness={0.7} opacity={0.3} transparent />
      </mesh>

      {/* Building body */}
      <mesh ref={meshRef} position={[0, y + 0.03, 0]} onClick={onClick} castShadow>
        <boxGeometry args={[0.26, height, 0.26]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, height + 0.03 + 0.04, 0]} castShadow>
        <coneGeometry args={[0.18, 0.08, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.5} />
      </mesh>

      {/* Glow ring if selected */}
      {isSelected && (
        <mesh ref={glowRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.28, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Cafe name tag */}
      <Text
        position={[0, height + 0.16, 0]}
        fontSize={0.07}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.5}
      >
        {cafe.name.length > 8 ? cafe.name.slice(0, 8) + "…" : cafe.name}
      </Text>

      {/* Seat count bar */}
      <mesh position={[0, 0.03, -0.16]}>
        <boxGeometry args={[0.04 * Math.min(cafe.seats, 6), 0.04, 0.04]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function PlayerToken({ player, index, total }: { player: Player; index: number; total: number }) {
  const meshRef = useRef<Mesh>(null);
  const color = AREA_HEX[player.boardColor] || "#888";
  const [cx, cz] = AREA_CENTERS[player.boardColor];
  const angle = (index / total) * Math.PI * 2;
  const r = 1.05;
  const x = cx + Math.cos(angle) * 0.15;
  const z = cz + Math.sin(angle) * 0.15;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.2 + Math.sin(Date.now() * 0.002 + index) * 0.04;
    }
  });

  void r; void angle;

  return (
    <group position={[x, 0, z]}>
      {/* Shadow disc */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} />
      </mesh>
      {/* Token body */}
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.18, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Crown */}
      <mesh position={[0, 0.29, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.1} metalness={0.8} />
      </mesh>
      {/* Name tag */}
      <Text position={[0, 0.45, 0]} fontSize={0.07} color={color} anchorX="center" anchorY="middle">
        {player.name.slice(0, 6)}
      </Text>
    </group>
  );
}

function AreaQuadrant({ area }: { area: BoardColor }) {
  const color = AREA_HEX[area];
  const [cx, cz] = AREA_CENTERS[area];

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.8, 2.8);
    return g;
  }, []);

  return (
    <group position={[cx, 0, cz]}>
      {/* Area ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <primitive object={geometry} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.12} />
      </mesh>
      {/* Area border lines */}
      <lineSegments>
        <edgesGeometry attach="geometry" args={[new THREE.PlaneGeometry(2.8, 2.8)]} />
        <lineBasicMaterial color={color} transparent opacity={0.3} />
      </lineSegments>
      {/* Area label */}
      <Text
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
        fillOpacity={0.2}
      >
        {AREA_LABELS[area]}
      </Text>
    </group>
  );
}

export function Board3D({ cafes, players, onSelectCafe, selectedCafeId, myColor }: Props) {
  const areas: BoardColor[] = ["merah", "biru", "hijau", "kuning"];

  return (
    <group>
      {/* Base board */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[6.4, 6.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Board border glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <ringGeometry args={[3.2, 3.5, 4]} />
        <meshBasicMaterial color="#334155" transparent opacity={0.4} />
      </mesh>

      {/* Grid lines */}
      <group position={[0, 0.001, 0]}>
        {[-3, -1.5, 0, 1.5, 3].map(v => (
          <group key={`h${v}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, v]}>
              <planeGeometry args={[6, 0.008]} />
              <meshBasicMaterial color="#1e3a5f" transparent opacity={0.6} />
            </mesh>
          </group>
        ))}
        {[-3, -1.5, 0, 1.5, 3].map(v => (
          <mesh key={`v${v}`} rotation={[-Math.PI / 2, 0, 0]} position={[v, 0, 0]}>
            <planeGeometry args={[0.008, 6]} />
            <meshBasicMaterial color="#1e3a5f" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* Area quadrants */}
      {areas.map(area => <AreaQuadrant key={area} area={area} />)}

      {/* Center piece */}
      <group position={[0, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.55, 32]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
          <ringGeometry args={[0.4, 0.52, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} />
        </mesh>
        <Text position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.12} color="#fbbf24" anchorX="center" anchorY="middle">
          DO IT
        </Text>
      </group>

      {/* Cafe buildings */}
      {cafes.map(cafe => (
        <CafeBuilding
          key={cafe.id}
          cafe={cafe}
          isSelected={selectedCafeId === cafe.id}
          isMine={cafe.ownerId !== null && players.find(p => p.boardColor === cafe.area)?.boardColor === myColor}
          onClick={() => onSelectCafe(cafe)}
        />
      ))}

      {/* Player tokens */}
      {players.map((player, i) => (
        <PlayerToken key={player.id} player={player} index={i} total={players.length} />
      ))}

      {/* Ambient lighting fills */}
      {areas.map(area => {
        const [cx, cz] = AREA_CENTERS[area];
        return (
          <pointLight
            key={`light-${area}`}
            position={[cx, 1.5, cz]}
            color={AREA_HEX[area]}
            intensity={0.4}
            distance={3}
            decay={2}
          />
        );
      })}
    </group>
  );
}
