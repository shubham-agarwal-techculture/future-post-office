"use client";

import { useEffect, useState } from "react";

function formatRemaining(totalSeconds: number) {
  if (totalSeconds <= 0) return { label: "Arriving now", parts: null };
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    label: null as string | null,
    parts: { days, hours, minutes, seconds },
  };
}

export function Countdown({
  deliverAt,
  initialSeconds,
}: {
  deliverAt: string;
  initialSeconds: number;
}) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(deliverAt).getTime() - Date.now()) / 1000),
      );
      setSeconds(remaining);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deliverAt]);

  const { label, parts } = formatRemaining(seconds);

  if (label) {
    return (
      <p className="animate-countdown font-display text-lg text-sage" role="status">
        {label}
      </p>
    );
  }

  return (
    <div
      className="animate-countdown flex flex-wrap gap-3 font-display"
      role="timer"
      aria-live="polite"
      aria-label={`Opens in ${parts!.days} days ${parts!.hours} hours ${parts!.minutes} minutes`}
    >
      {(
        [
          ["days", parts!.days],
          ["hrs", parts!.hours],
          ["min", parts!.minutes],
          ["sec", parts!.seconds],
        ] as const
      ).map(([unit, value]) => (
        <div
          key={unit}
          className="min-w-[3.5rem] rounded-sm bg-ink px-2 py-2 text-center text-parchment"
        >
          <div className="text-xl tabular-nums leading-none sm:text-2xl">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-parchment/70">
            {unit}
          </div>
        </div>
      ))}
    </div>
  );
}
