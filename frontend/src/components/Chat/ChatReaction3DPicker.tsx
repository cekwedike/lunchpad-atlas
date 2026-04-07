"use client";

import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Float,
  Environment,
  ContactShadows,
  RoundedBox,
  Sphere,
  Torus,
  Cone,
  Cylinder,
  Octahedron,
  Icosahedron,
} from "@react-three/drei";
import type { ChatReactionId } from "@/lib/chat-reactions";
import { CHAT_REACTION_OPTIONS } from "@/lib/chat-reactions";
import { cn } from "@/lib/utils";

const COLORS: Record<ChatReactionId, string> = {
  like: "#38bdf8",
  love: "#fb7185",
  laugh: "#fbbf24",
  fire: "#f97316",
  celebrate: "#a78bfa",
  hype: "#22d3ee",
  agree: "#34d399",
  star: "#f59e0b",
};

/** 4×2 grid in scene units */
const POSITIONS: [number, number, number][] = [
  [-1.38, 0.78, 0],
  [-0.46, 0.78, 0],
  [0.46, 0.78, 0],
  [1.38, 0.78, 0],
  [-1.38, -0.78, 0],
  [-0.46, -0.78, 0],
  [0.46, -0.78, 0],
  [1.38, -0.78, 0],
];

function Mat({
  color,
  metalness = 0.55,
  roughness = 0.28,
}: {
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={1.15}
    />
  );
}

function ReactionShape({
  id,
  position,
  onPick,
}: {
  id: ChatReactionId;
  position: [number, number, number];
  onPick: (id: ChatReactionId) => void;
}) {
  const color = COLORS[id];
  const [hover, setHover] = useState(false);
  const pick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onPick(id);
    },
    [id, onPick],
  );

  const scale = hover ? 1.18 : 1;
  const common = {
    onClick: pick,
    onPointerOver: () => setHover(true),
    onPointerOut: () => setHover(false),
    castShadow: true,
    receiveShadow: true,
    scale,
  } as const;

  return (
    <Float speed={2.2} rotationIntensity={0.55} floatIntensity={0.55}>
      <group position={position}>
        {id === "like" && (
          <RoundedBox args={[0.44, 0.52, 0.2]} radius={0.09} smoothness={5} {...common}>
            <Mat color={color} />
          </RoundedBox>
        )}
        {id === "love" && (
          <Sphere args={[0.34, 32, 32]} {...common}>
            <Mat color={color} metalness={0.45} roughness={0.22} />
          </Sphere>
        )}
        {id === "laugh" && (
          <Torus args={[0.3, 0.12, 18, 48]} {...common} rotation={[Math.PI / 5, 0, 0]}>
            <Mat color={color} />
          </Torus>
        )}
        {id === "fire" && (
          <Cone args={[0.34, 0.62, 14]} {...common}>
            <Mat color={color} metalness={0.35} roughness={0.4} />
          </Cone>
        )}
        {id === "celebrate" && (
          <Cylinder args={[0.24, 0.28, 0.52, 20]} {...common}>
            <Mat color={color} />
          </Cylinder>
        )}
        {id === "hype" && (
          <Octahedron args={[0.38, 0]} {...common}>
            <Mat color={color} metalness={0.65} roughness={0.2} />
          </Octahedron>
        )}
        {id === "agree" && (
          <RoundedBox args={[0.48, 0.36, 0.14]} radius={0.06} smoothness={4} {...common}>
            <Mat color={color} />
          </RoundedBox>
        )}
        {id === "star" && (
          <Icosahedron args={[0.36, 0]} {...common}>
            <Mat color={color} metalness={0.7} roughness={0.18} />
          </Icosahedron>
        )}
      </group>
    </Float>
  );
}

function Scene({ onSelect }: { onSelect: (id: ChatReactionId) => void }) {
  return (
    <>
      <color attach="background" args={["transparent"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 6]} intensity={1.05} castShadow />
      <directionalLight position={[-5, 3, -4]} intensity={0.35} color="#c4d4ff" />
      <spotLight
        position={[0, 6, 2]}
        angle={0.55}
        penumbra={0.85}
        intensity={0.55}
        color="#fff8e7"
      />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.85} />
      </Suspense>
      <ContactShadows
        position={[0, -1.28, 0]}
        opacity={0.45}
        scale={16}
        blur={2.2}
        far={5}
      />
      {CHAT_REACTION_OPTIONS.map((opt, i) => (
        <ReactionShape
          key={opt.id}
          id={opt.id}
          position={POSITIONS[i]!}
          onPick={onSelect}
        />
      ))}
    </>
  );
}

export function ChatReaction3DPicker({
  onSelect,
  disabled,
  className,
}: {
  onSelect: (id: ChatReactionId) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100/90 to-slate-200/40 ring-1 ring-slate-200/80",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <Canvas
        shadows
        camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 40 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.75]}
        style={{ width: "100%", height: 220 }}
      >
        <Scene onSelect={onSelect} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/90 to-transparent" />
    </div>
  );
}
