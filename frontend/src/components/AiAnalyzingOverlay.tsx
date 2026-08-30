"use client";

export default function AiAnalyzingOverlay() {
  return (
    <div
      role="status"
      aria-label="Automated compliance & risk engine processing"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0A2240]/85 backdrop-blur-xs"
    >
      <div className="card max-w-md w-full bg-white border-2 border-[#123B6D] text-center space-y-4 p-8 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-md bg-[#123B6D] flex items-center justify-center text-2xl text-white">
          🏛️
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-[#E67E22] uppercase tracking-widest">
            AUTOMATED STATUTORY EVALUATION
          </p>
          <h3 className="text-lg font-extrabold text-[#0F172A]">
            AI Compliance &amp; Risk Engine Processing
          </h3>
          <p className="text-xs text-[#475569] leading-relaxed">
            Running ML financial variance detector, perceptual photo deduplication,
            sanction delay SLA evaluator, and composite risk scoring algorithm.
          </p>
        </div>

        {/* Government spinner */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className="w-5 h-5 border-3 border-[#D5DCE5] border-t-[#123B6D] rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-[#123B6D]">Evaluating statutory firebreak criteria…</span>
        </div>
      </div>
    </div>
  );
}
