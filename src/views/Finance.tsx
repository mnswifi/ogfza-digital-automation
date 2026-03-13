import React from 'react';
import { Revenue } from '@/middleware/types.middleware';

type FinanceStats = {
    totalRevenue?: { total?: number };
};

type FinanceProps = {
    stats: FinanceStats | null;
    revenue: Revenue[];
};

export default function Finance({ stats, revenue }: FinanceProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-brand-ink text-brand-bg p-6 rounded-sm">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                        Total Revenue YTD
                    </p>
                    <p className="text-3xl font-bold data-value">
                        ${(stats?.totalRevenue?.total || 0).toLocaleString()}
                    </p>
                </div>

                <div className="bg-white border border-brand-line/10 p-6 rounded-sm">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                        Outstanding Invoices
                    </p>
                    <p className="text-3xl font-bold data-value">$12,450</p>
                </div>

                <div className="bg-white border border-brand-line/10 p-6 rounded-sm">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                        Collection Rate
                    </p>
                    <p className="text-3xl font-bold data-value text-emerald-600">94.2%</p>
                </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif italic">Revenue & Financials</h2>
                        <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                            Transaction History
                        </p>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                    >
                        Export Financial Report
                    </button>
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-brand-ink/5">
                            <th className="p-4 col-header">Company</th>
                            <th className="p-4 col-header">Description</th>
                            <th className="p-4 col-header">Amount</th>
                            <th className="p-4 col-header">Date</th>
                            <th className="p-4 col-header">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {revenue.map((r) => (
                            <tr key={r.id} className="data-row">
                                <td className="p-4 text-sm font-bold">{r.company_name}</td>
                                <td className="p-4 text-xs opacity-80">{r.description}</td>
                                <td className="p-4 data-value text-sm font-bold">
                                    ${r.amount.toLocaleString()}
                                </td>
                                <td className="p-4 data-value text-xs opacity-60">{r.payment_date}</td>
                                <td className="p-4">
                                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}