"use client";

import { CANVAS_W, ENTRY_DEFS } from "@/game/layouts";
import { playFootstep } from "@/game/sound";
import { useGameStore, WARMUP_SECONDS } from "@/game/store";
import { EntryId } from "@/game/types";
import { useEffect, useRef } from "react";

export default function StalkerFootsteps() {
  const timersRef = useRef<Partial<Record<EntryId, number>>>({});

  useEffect(() => {
    function startStalking(id: EntryId, pan: number) {
      function step() {
        const entry = useGameStore.getState().entries[id];
        if (!entry.underAttack || entry.warmup <= 0) {
          delete timersRef.current[id];
          return;
        }
        const intensity = 1 - entry.warmup / WARMUP_SECONDS;
        playFootstep(pan, intensity);
        const delay = 500 - 350 * intensity;
        timersRef.current[id] = window.setTimeout(step, Math.max(150, delay));
      }
      step();
    }

    const unsub = useGameStore.subscribe((state) => {
      if (state.phase !== "night" && state.phase !== "day") return;
      for (const def of ENTRY_DEFS) {
        const e = state.entries[def.id];
        const stalking = e.underAttack && e.warmup > 0;
        const alreadyRunning = timersRef.current[def.id] !== undefined;

        if (stalking && !alreadyRunning) {
          const zoneCenterX = def.zone.x + def.zone.w / 2;
          const pan = (zoneCenterX / CANVAS_W) * 2 - 1;
          startStalking(def.id, pan);
        }
        if (!stalking && alreadyRunning) {
          window.clearTimeout(timersRef.current[def.id]);
          delete timersRef.current[def.id];
        }
      }
    });

    return () => {
      unsub();
      for (const id of Object.keys(timersRef.current) as EntryId[]) {
        window.clearTimeout(timersRef.current[id]);
      }
      timersRef.current = {};
    };
  }, []);

  return null;
}
