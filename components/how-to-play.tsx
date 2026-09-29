"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Step({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-sm border border-line bg-void/40 px-3 py-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon}
        alt=""
        className="h-9 w-9 shrink-0 [image-rendering:pixelated]"
      />
      <div>
        <p className="text-[11px] uppercase tracking-widest text-ink-dim">
          {label}
        </p>
        <p className="text-xs text-ink-dim">{children}</p>
      </div>
    </div>
  );
}

export default function HowToPlayDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-panel text-ink border-line">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] uppercase tracking-widest text-accent">
            How to Play
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
          <Step icon="/sprites/icon-hands.png" label="Day">
            <span className="text-ink">WASD</span> to move. Press{" "}
            <span className="text-ink">E</span> to get boards or fix a nearby
            door/window. More boards make it stronger.
          </Step>

          <Step icon="/sprites/door-level2.png" label="Night">
            Weak doors can break. Press <span className="text-ink">Space</span>{" "}
            when the marker hits the bright zone to push enemies back.
          </Step>

          <Step icon="/sprites/enemy-hollow.png" label="Enemy Inside">
            If an enemy gets in, it will chase you. Use{" "}
            <span className="text-ink">Left Click</span> to attack with your
            sword.
          </Step>

          <Step icon="/sprites/icon-health.png" label="Every Level">
            Reach dawn to get a free perk. A Boss appears every 3 nights.
          </Step>
        </div>
      </DialogContent>
    </Dialog>
  );
}
