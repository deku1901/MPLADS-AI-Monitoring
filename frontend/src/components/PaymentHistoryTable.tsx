"use client";

import type { PaymentInstallmentItem } from "@/lib/types";

interface PaymentHistoryTableProps {
  payments: PaymentInstallmentItem[];
  sanctionedAmountInr: number;
}

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PAYMENT_RELEASED: { label: "RELEASED", color: "#166534", bg: "#F0FDF4", border: "#86EFAC" },
  HELD_FOR_REVIEW: { label: "HELD FOR REVIEW", color: "#B3261E", bg: "#FEF2F2", border: "#FECACA" },
  APPROVED_FOR_REVIEW: { label: "APPROVED", color: "#0369A1", bg: "#F0F9FF", border: "#BAE6FD" },
  SUBMITTED: { label: "SUBMITTED", color: "#CA8A04", bg: "#FEFCE8", border: "#FEF08A" },
  REJECTED: { label: "REJECTED", color: "#991B1B", bg: "#FEF2F2", border: "#FCA5A5" },
};

export default function PaymentHistoryTable({
  payments,
  sanctionedAmountInr,
}: PaymentHistoryTableProps) {
  return (
    <section className="card bg-white border-[#D5DCE5] space-y-3">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Disbursement Ledger
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">Milestone Payment Installment Archive</h3>
          </div>
        </div>
        <span className="text-xs text-[#64748B] font-mono">
          {payments.length} Installment Record(s)
        </span>
      </div>

      {payments.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#64748B]">
          No payment requests have been submitted for this project.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold uppercase text-[#475569]">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Payment ID</th>
                <th className="py-2.5 px-3">Requested Amount</th>
                <th className="py-2.5 px-3">% of Sanction</th>
                <th className="py-2.5 px-3">Request Date</th>
                <th className="py-2.5 px-3">Submitted By</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {payments.map((p, idx) => {
                const badge = STATUS_BADGES[p.status] ?? STATUS_BADGES.SUBMITTED;
                const pctOfSanction = sanctionedAmountInr > 0
                  ? ((p.requested_amount_inr / sanctionedAmountInr) * 100).toFixed(1)
                  : "0.0";

                return (
                  <tr key={p.payment_id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#64748B]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-[#0369A1] font-medium">
                      {p.payment_id.slice(0, 16)}...
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">
                      ₹{p.requested_amount_inr.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#64748B]">
                      {pctOfSanction}%
                    </td>
                    <td className="py-2.5 px-3 text-[#475569]">
                      {p.request_date || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-[#475569]">
                      {p.submitted_by || "IA"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border inline-block"
                        style={{ color: badge.color, backgroundColor: badge.bg, borderColor: badge.border }}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
