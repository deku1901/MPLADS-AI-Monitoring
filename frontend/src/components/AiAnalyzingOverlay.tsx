"use client";

/**
 * Fullscreen overlay shown while POST /api/payments is in-flight.
 * Communicates clearly that the backend AI engine is running — not a fake timer.
 */
export default function AiAnalyzingOverlay() {
  return (
    <div
      role="status"
      aria-label="AI risk analysis in progress"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm"
    >
      {/* Animated rings */}
      <div className="relative flex items-center justify-center w-28 h-28">
        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-20 animate-ping" />
        <span className="absolute inline-flex h-20 w-20 rounded-full border-4 border-blue-500/40 border-t-blue-400 animate-spin" />
        <span className="relative text-3xl select-none">🤖</span>
      </div>

      <div className="text-center space-y-2">
        <p className="text-xl font-bold tracking-wide text-white">
          AI ANALYZING&hellip;
        </p>
        <p className="text-sm text-slate-400 max-w-xs">
          Running risk engine: financial anomaly detection, duplicate evidence
          check, statutory compliance rules &amp; composite scoring.
        </p>
      </div>

      {/* Pseudo-progress dots */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.18}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
