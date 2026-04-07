"use client";

import { Suspense, useCallback, useState, type MouseEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, Environment, Billboard, Html } from "@react-three/drei";
import type { ChatReactionId } from "@/lib/chat-reactions";
import {
  CHAT_REACTION_EMOJI,
  CHAT_REACTION_OPTIONS,
  reactionOptionById,
} from "@/lib/chat-reactions";
import { cn } from "@/lib/utils";

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

function ReactionEmoji3D({
  id,
  position,
  onPick,
}: {
  id: ChatReactionId;
  position: [number, number, number];
  onPick: (id: ChatReactionId) => void;
}) {
  const emoji = CHAT_REACTION_EMOJI[id];
  const [hover, setHover] = useState(false);
  const pick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onPick(id);
    },
    [id, onPick],
  );

  const scale = hover ? 1.14 : 1;

  return (
    <Float speed={2.2} rotationIntensity={0.35} floatIntensity={0.45}>
      <group position={position} scale={scale}>
        <Billboard follow>
          <Html
            transform
            center
            distanceFactor={7}
            style={{ pointerEvents: "auto" }}
            zIndexRange={[100, 0]}
          >
            <button
              type="button"
              aria-label={reactionOptionById(id).label}
              onClick={pick}
              onPointerEnter={() => setHover(true)}
              onPointerLeave={() => setHover(false)}
              className={cn(
                "flex h-[3.25rem] w-[3.25rem] select-none items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-[2.35rem] shadow-md ring-1 ring-slate-200/80 transition",
                "hover:scale-105 hover:shadow-lg hover:ring-slate-300/90 active:scale-95",
                hover && "scale-105 shadow-lg ring-blue-300/60",
              )}
            >
              <span className="leading-none drop-shadow-sm">{emoji}</span>
            </button>
          </Html>
        </Billboard>
      </group>
    </Float>
  );
}

function Scene({ onSelect }: { onSelect: (id: ChatReactionId) => void }) {
  return (
    <>
      <color attach="background" args={["transparent"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 8, 6]} intensity={0.95} />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#dbeafe" />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.55} />
      </Suspense>
      {CHAT_REACTION_OPTIONS.map((opt, i) => (
        <ReactionEmoji3D
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
