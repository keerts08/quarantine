"use client";

import Hud from "@/components/hud";
import RoomCanvas from "@/components/room-canvas";
import {
  MAX_WEAPON_LEVEL,
  UPGRADE_DEFS,
  UpgradeDef,
  useGameStore,
} from "@/game/store";
import { Button } from "@/components/ui/button";
import CombatOverlay from "@/components/combat-overlay";
import JumpscareOverlay from "@/components/jumpscare-overlay";
import LogToaster from "@/components/log-toaster";
import HowToPlayDialog from "@/components/how-to-play";
import { useState } from "react";
import { UpgradeId } from "@/game/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function UpgradeCard({
  id,
  onPick,
}: {
  id: UpgradeId;
  onPick: (id: UpgradeId) => void;
}) {
  const def = UPGRADE_DEFS[id];
  return (
    <button
      onClick={() => onPick(id)}
      className="flex flex-1 flex-col items-center gap-3 rounded-sm border border-line bg-panel/60 px-4 py-5 text-center transition-colors hover:border-accent hover:bg-panel"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={def.icon}
        alt=""
        className="h-14 w-14 [image-rendering:pixelated]"
      />
      <p className="font-[family-name:var(--font-display)] uppercase tracking-widest text-ink">
        {def.label}
      </p>
      <p className="text-xs text-ink-faint">{def.hint}</p>
    </button>
  );
}

export default function Home() {
  const [howToOpen, setHowToOpen] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const night = useGameStore((s) => s.night);
  const coins = useGameStore((s) => s.player.coins);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const pendingUpgrades = useGameStore((s) => s.pendingUpgrades);
  const chooseUpgrade = useGameStore((s) => s.chooseUpgrade);
  const weaponLevel = useGameStore((s) => s.player.weaponLevel);
  const lastCoinsEarned = useGameStore((s) => s.lastCoinsEarned);

  const hasIntruders = useGameStore((s) => s.intruders.length > 0);
  const startGame = useGameStore((s) => s.startGame);
  const maxedWeapon = weaponLevel >= MAX_WEAPON_LEVEL;

  const audioEnabled = useGameStore((s) => s.audioEnabled);
  const toggleAudio = useGameStore((s) => s.toggleAudio);

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-2 overflow-hidden p-2">
      <div className="flex h-full w-full min-h-0 max-w-[1700px] flex-col items-center gap-2">
        {phase !== "title" && <Hud />}

        <div className="relative min-h-0 w-full flex-1">
          <div className="relative mx-auto aspect-[30/19] h-full max-h-full max-w-full">
            <RoomCanvas />
            <CombatOverlay />
            <JumpscareOverlay />
            <LogToaster />

            {hasIntruders && (phase === "day" || phase === "night") && (
              <div className="absolute inset-x-0 top-3 flex justify-center">
                <p className="rounded-sm border border-danger bg-void/80 px-4 py-1.5 text-xs uppercase tracking-widest text-danger">
                  Something is loose - Left Click to attack
                </p>
              </div>
            )}

            {phase === "title" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-void/50">
                <h1 className="text-5xl font-[family-name:var(--font-display)] font-bold uppercase tracking-widest text-ink">
                  Quarantine
                </h1>
                <p className="max-w-md text-[12px] text-center">
                  Something is outside and it wants to get in. Board up every
                  door and window, whatver you leave open, it will find.
                </p>
                <div className="flex w-full max-w-xs flex-col gap-2">
                  <Button
                    onClick={startGame}
                    className="rounded-sm bg-accent text-void uppercase py-2.5 tracking-widest w-full hover:text-accent border border-accent hover:rounded-none transition-all"
                  >
                    Play
                  </Button>
                  <Button
                    onClick={() => setHowToOpen(true)}
                    className="rounded-sm border border-line py-2.5 text-sm uppercase tracking-widest text-ink-dim transition-colors hover:border-ink-dim hover:text-ink hover:rounded-none"
                  >
                    How to Play
                  </Button>
                  <div className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 backdrop-blur-md ">
                    <span className="text-xs uppercase tracking-widest text-ink-dim">
                      Audio
                    </span>{" "}
                    <Button
                      onClick={toggleAudio}
                      size="icon"
                      className={`rounded-sm border text-xs uppercase tracking-widest transition-colors ${
                        audioEnabled
                          ? "hover:text-accent border bg-accent border-accent text-void transition-all"
                          : "hover:text-ink hover:border-ink-dim text-ink-dim"
                      }`}
                    >
                      {audioEnabled ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {phase === "gameover" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void/95">
                <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-widest text-danger">
                  It Got In
                </h2>
                <p className="text-ink-dim">
                  {night <= 1
                    ? "You didn't survive the first night."
                    : `You held out for ${night - 1} level${night - 1 === 1 ? "" : "s"}.`}
                </p>
                <button
                  onClick={startGame}
                  className="rounded-sm border border-line px-6 py-2 uppercase tracking-widest text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  Try Again
                </button>
              </div>
            )}

            {phase === "victory" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void/95">
                <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-widest text-accent">
                  You Survived
                </h2>
                <p className="max-w-sm text-center text-ink-dim">
                  Every night it threw at you, and it still couldn&apos;t get
                  in.
                </p>
                <button
                  onClick={startGame}
                  className="rounded-sm border border-accent px-6 py-2 uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-void"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>

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
              <p className="text-sm text-ink-dim">
                Sharpened Stake - level{weaponLevel}
                {maxedWeapon ? "(max)" : ""}
              </p>
            </div>
          </div>
        )}

        <HowToPlayDialog open={howToOpen} onOpenChange={setHowToOpen} />

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
      </div>

      <Dialog open={phase === "dawn"}>
        <DialogContent
          showCloseButton={false}
          className="border-line bg-panel text-ink sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)] uppercase tracking-widest text-accent">
              Dawn — Level {night} Survived
            </DialogTitle>
            <DialogDescription className="text-ink-dim">
              <span className="text-warn">+{lastCoinsEarned} coins</span>{" "}
              earned. Pick one — the next night begins on its own in{" "}
              {Math.max(0, Math.ceil(timeRemaining))}s.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:flex-row">
            {pendingUpgrades.map((id) => (
              <UpgradeCard key={id} id={id} onPick={chooseUpgrade} />
            ))}
          </div>

          <p className="text-center text-xs text-ink-faint">
            You have {coins} coins.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
