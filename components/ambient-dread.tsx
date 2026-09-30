"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/game/store";
import {
  startDrone,
  stopDrone,
  playCreak,
  playDistantThud,
  playFaintWhisper,
} from "@/game/sound";

const STINGERS = [playCreak, playDistantThud, playFaintWhisper];

export default function AmbientDread() {
  const phase = useGameStore((s) => s.phase);
  const droneOnRef = useRef(false);

  useEffect(() => {
    const active = phase === "day" || phase === "night";
    if (active && !droneOnRef.current) {
      startDrone();
      droneOnRef.current = true;
    } else if (!active && droneOnRef.current) {
      stopDrone();
      droneOnRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    let timeoutId: number;
    function scheduleNext() {
      const delay = 15000 + Math.random() * 30000;
      timeoutId = window.setTimeout(() => {
        const p = useGameStore.getState().phase;
        if (p === "day" || p === "night") {
          STINGERS[Math.floor(Math.random() * STINGERS.length)]();
        }
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}
