import React from 'react';
import { Revenue } from '@/middleware/types.middleware';
import { printStructuredReport } from '@/src/utils/printDocuments';

type FinanceStats = {
    totalRevenue?: { total?: number };
    confirmedLicencePayments?: { count?: number };
    pendingLicencePayments?: { count?: number };
};

type FinanceProps = {
    stats: FinanceStats | null;
    revenue: Revenue[];
};

export default function Finance({ stats, revenue }: FinanceProps) {
    const totalRevenue = Number(stats?.totalRevenue?.total || 0);
    const confirmedLicencePayments = Number(stats?.confirmedLicencePayments?.count || revenue.length || 0);
    const pendingLicencePayments = Number(stats?.pendingLicencePayments?.count || 0);
    const generatedOn = new Date().toISOString();

    const handlePrintFinancialReport = () => {
        printStructuredReport({
            documentTitle: 'OGFZA Financial Report',
            kicker: 'OGFZA Revenue & Finance',
            title: 'Confirmed Licence Payment Report',
            subtitle: 'Financial summary and ledger of confirmed licence payment records currently available in the prototype.',
            reference: `Generated ${generatedOn.slice(0, 10)}`,
            badges: [
                { label: `${confirmedLicencePayments} confirmed payments`, tone: 'success' },
                { label: `${pendingLicencePayments} pending payments`, tone: pendingLicencePayments > 0 ? 'warning' : 'neutral' },
            ],
            sections: [
                {
                    title: 'Financial Summary',
                    kind: 'fields',
                    columns: 3,
                    fields: [
                        { label: 'Total Revenue YTD', value: `$${totalRevenue.toLocaleString()}` },
                        { label: 'Confirmed Licence Payments', value: confirmedLicencePayments },
                        { label: 'Pending Licence Payments', value: pendingLicencePayments },
                    ],
                },
                {
                    title: 'Revenue Ledger',
                    kind: 'table',
                    headers: ['Company', 'Description', 'Amount', 'Payment Date', 'Status'],
                    rows: revenue.map((entry) => ([
                        entry.company_name,
                        entry.description,
                        `$${Number(entry.amount || 0).toLocaleString()}`,
                        entry.payment_date,
                        entry.status,
                    ])),
                },
            ],
            footerNote: 'Generated from the live Revenue & Finance ledger in the OGFZA Digital Automation prototype.',
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-brand-ink text-brand-bg p-6 rounded-sm">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                        Total Revenue YTD
                    </p>
                    <p className="text-3xl font-bold data-value">
                        ${totalRevenue.toLocaleString()}
                    </p>
                </div>

                <div className="bg-white border border-brand-line/10 p-6 rounded-sm">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                        Confirmed Licence Payments
                    </p>
                    <p className="text-3xl font-bold data-value">{confirmedLicencePayments.toLocaleString()}</p>
                </div>

                <div className="bg-white border border-brand-line/10 p-6 rounded-sm">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                        Pending Licence Payments
                    </p>
                    <p className="text-3xl font-bold data-value text-amber-600">
                        {pendingLicencePayments.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-xl font-serif">Revenue & Financials</h2>
                        <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                            Confirmed Licence Payment History
                        </p>
                    </div>

                    <button
                        onClick={handlePrintFinancialReport}
                        className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                    >
                        Export Financial Report
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                        <thead>
                            <tr className="bg-brand-ink/5">
                                <th className="p-4 col-header" style={{ fontStyle: 'normal' }}>Company</th>
                                <th className="p-4 col-header" style={{ fontStyle: 'normal' }}>Description</th>
                                <th className="p-4 col-header" style={{ fontStyle: 'normal' }}>Amount</th>
                                <th className="p-4 col-header" style={{ fontStyle: 'normal' }}>Date</th>
                                <th className="p-4 col-header" style={{ fontStyle: 'normal' }}>Status</th>
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
                            {revenue.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center opacity-40">
                                        No confirmed licence payments have been recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
