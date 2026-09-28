"use client";

import Hud from "@/components/hud";
import RoomCanvas from "@/components/room-canvas";
import {
  MAX_WEAPON_LEVEL,
  useGameStore,
  weaponUpgradeCost,
} from "@/game/store";
import { Button } from "@/components/ui/button";

export default function Home() {
  const phase = useGameStore((s) => s.phase);
  const night = useGameStore((s) => s.night);
  const log = useGameStore((s) => s.log);
  const coins = useGameStore((s) => s.player.coins);
  const weaponLevel = useGameStore((s) => s.player.weaponLevel);
  const lastCoinsEarned = useGameStore((s) => s.lastCoinsEarned);
  const startGame = useGameStore((s) => s.startGame);
  const beginNight = useGameStore((s) => s.beginNight);
  const advanceAfterDawn = useGameStore((s) => s.advanceAfterDawn);
  const buyWeaponUpgrade = useGameStore((s) => s.buyWeaponUpgrade);
  const upgradeCost = weaponUpgradeCost(weaponLevel);
  const maxedWeapon = weaponLevel >= MAX_WEAPON_LEVEL;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="relative w-full max-w-3xl">
        {phase !== "title" && <Hud />}
        <div className="relative">
          <RoomCanvas />

          {phase === "title" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <h1 className="text-5xl font-[family-name:var(--font-display)] font-bold uppercase tracking-widest text-ink">
                Quarantine
              </h1>
              <p className="max-w-md text-[12px] text-center">
                Something is outside and it wants to get in. Board up every door
                and window, whatver you leave open, it will find.
              </p>
              <Button onClick={startGame} className="rounded-sm">
                Play
              </Button>
            </div>
          )}
        </div>

        {phase === "day" && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <Button onClick={beginNight} className="rounded-sm">
              Lock In Barricades
            </Button>
          </div>
        )}

        {phase === "dawn" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-widest text-accent">
              Dawn
            </h2>
            <p className="text-ink-dim">
              You survived level {night}.{" "}
              <span className="text-warn">+{lastCoinsEarned} coins</span>
            </p>

            <div className="">
              <p className="text-sm text-ink-dim">Sharpened Stake -  level{weaponLevel}{maxedWeapon ? "(max)" : ""}</p>
              <Button
                onClick={buyWeaponUpgrade}
              disabled={maxedWeapon || coins < upgradeCost}
              >{maxedWeapon ? "Fully Sharpened" : `Sharpen - ${upgradeCost} coins.`}</Button>
              <p className="text-xs text-ink-dim">You have {coins} coins</p>
            </div>
            <Button
              onClick={advanceAfterDawn}
              className="rounded-sm border border-accent px-6 py-2 uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-void"
            >
              Prepare for Level {night + 1}
            </Button>
          </div>
        )}

        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void/95">
            <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-widest text-danger">
              It Got In
            </h2>
            <p className="text-ink-dim">
              You held out for {night} level{night === 1 ? "" : "s"}.
            </p>
            <Button onClick={startGame}>Try Again</Button>
          </div>
        )}

        {phase === "day" && (
          <p className="mt-2 text-center text-xs uppercase tracking-widest text-ink-faint">
            WASD move · E salvage / board up · Boards carry over, damaged
            barricades don&apos;t{" "}
          </p>
        )}

        {phase !== "title" && (
          <div className="mt-3 max-h-24 overflow-y-auto rounded-sm border border-line bg-panel/60 px-3 py-2 text-xs text-ink-dim">
            {log.slice(-6).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
