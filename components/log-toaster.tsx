"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useGameStore } from "@/game/store";

const DANGER_PREFIXES = [
  "It broke through",
  "It gets its hands",
  "The chamber is overrun",
];
const WARN_PREFIXES = [
  "It's breaking through",
  "You see something",
  "It claws at you",
];

function toneFor(line: string): "error" | "warning" | undefined {
  if (DANGER_PREFIXES.some((p) => line.startsWith(p))) return "error";
  if (WARN_PREFIXES.some((p) => line.startsWith(p))) return "warning";
  return undefined;
}

function iconFor(line: string): string {
  if (line.startsWith("It broke through") || line.startsWith("It got through"))
    return "/sprites/enemy-hollow.png";
  if (line.startsWith("It's breaking through"))
    return "/sprites/enemy-hollow.png";
  if (line.startsWith("You see something")) return "/sprites/enemy-hollow.png";
  if (
    line.startsWith("It gets its hands") ||
    line.startsWith("The chamber is overrun") ||
    line.startsWith("It claws at you")
  )
    return "/sprites/enemy-hollow.png";
  if (line.startsWith("You put it down")) return "/sprites/sword-2.png";
  if (line.startsWith("Salvaged")) return "/sprites/icon-boards.png";
  if (line.startsWith("Reinforced") || line.startsWith("You drive it back"))
    return "/sprites/icon-boards.png";
  if (line.startsWith("You take")) return "/sprites/icon-health.png";
  if (line.startsWith("Dawn breaks")) return "/sprites/icon-health.png";
  return "/sprites/icon-boards.png";
}

function shortLabelFor(line: string): string {
  if (line.startsWith("It broke through")) return "Breached!";
  if (line.startsWith("It got through")) return "Breached!";
  if (line.startsWith("It's breaking through")) return "Under attack";
  if (line.startsWith("You see something")) return "Spotted";
  if (
    line.startsWith("It gets its hands") ||
    line.startsWith("The chamber is overrun")
  )
    return "It got in";
  if (line.startsWith("You put it down")) return "Killed it";
  if (line.startsWith("Salvaged"))
    return line.replace("Salvaged ", "+").replace(/boards?\.$/, "boards");
  if (line.startsWith("Reinforced")) return "Reinforced";
  if (line.startsWith("You drive it back")) return "Driven back";
  if (line.startsWith("You take"))
    return line.replace("You take ", "").replace(/\.$/, "");
  if (line.startsWith("Dawn breaks")) return "Dawn";
  if (line.startsWith("Level") && line.includes("nightfall"))
    return "Nightfall";
  if (line.startsWith("Need")) return "Not enough boards";
  return line.length > 40 ? line.slice(0, 37) + "…" : line;
}

function ToastIcon({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={src} alt="" className="h-5 w-5 [image-rendering:pixelated]" />
  );
}

export default function LogToaster() {
  const lastLenRef = useRef(0);

  useEffect(() => {
    lastLenRef.current = useGameStore.getState().log.length;
    const unsub = useGameStore.subscribe((state) => {
      if (state.log.length <= lastLenRef.current) {
        lastLenRef.current = state.log.length;
        return;
      }
      for (const line of state.log.slice(lastLenRef.current)) {
        const tone = toneFor(line);
        const icon = <ToastIcon src={iconFor(line)} />;
        const label = shortLabelFor(line);
        if (tone === "error") toast.error(label, { icon });
        else if (tone === "warning") toast.warning(label, { icon });
        else toast(label, { icon });
      }
      lastLenRef.current = state.log.length;
    });
    return unsub;
  }, []);

  return null;
}
