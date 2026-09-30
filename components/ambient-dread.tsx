"use client";

import { useEffect, useRef } from "react";
import { isBossLevel, useGameStore } from "@/game/store";
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
  const night = useGameStore((s) => s.night);
  const droneIsBossRef = useRef(false);

  useEffect(() => {
    const active = phase === "day" || phase === "night";
    const wantBoss = phase === "night" && isBossLevel(night);
    if (active && !droneOnRef.current) {
      startDrone(wantBoss);
      droneOnRef.current = true;
      droneIsBossRef.current = wantBoss;
    } else if (!active && droneOnRef.current) {
      stopDrone();
      droneOnRef.current = false;
    } else if (
      active &&
      droneOnRef.current &&
      wantBoss !== droneIsBossRef.current
    ) {
      stopDrone();
      startDrone(wantBoss);
      droneIsBossRef.current = wantBoss;
    }
  }, [phase, night]);

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
