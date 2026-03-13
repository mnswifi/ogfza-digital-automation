import React from 'react';

export default function Logistics() {
    const requests = [
        { type: 'Free Zone Sea Freight Procedure', company: 'TOTAL ENERGIES', elapsed: '12 Hours', status: 'Processing' },
        { type: 'Procedure for Unstuffing and Unpacking', company: 'CHEVRON', elapsed: '38 Hours', status: 'Pending Review' },
        { type: 'Export of Goods (Air)', company: 'SEPLAT ENERGY', elapsed: '46 Hours', status: 'SLA Warning' },
        { type: 'Transloading of Goods', company: 'OANDO', elapsed: '05 Hours', status: 'Processing' },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-serif italic">Integrated Logistics (Single Window)</h2>
                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">
                        CargoTrack Integration & Movement SLAs
                    </p>
                </div>

                <div className="flex gap-4 text-center">
                    <div className="bg-white/10 p-3 rounded-sm border border-white/10">
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Target SLA</div>
                        <div className="text-xl font-bold font-mono">48 HRS</div>
                    </div>
                    <div className="bg-emerald-500/20 p-3 rounded-sm border border-emerald-500/30">
                        <div className="text-[10px] uppercase tracking-widest text-emerald-200 mb-1">SLA Compliance</div>
                        <div className="text-xl font-bold font-mono text-emerald-400">96.5%</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-brand-line/10 rounded-sm p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Inbound Operations</p>
                    <div className="text-3xl font-bold mb-2">124</div>
                    <p className="text-[10px] uppercase tracking-widest opacity-80">Pending Clearances</p>
                    <div className="mt-4 flex gap-2 justify-center text-[10px] uppercase tracking-[0.2em] opacity-40">
                        <span>Sea: 82</span> • <span>Air: 42</span>
                    </div>
                </div>

                <div className="bg-white border border-brand-line/10 rounded-sm p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Outbound Operations</p>
                    <div className="text-3xl font-bold mb-2">48</div>
                    <p className="text-[10px] uppercase tracking-widest opacity-80">Export Approvals</p>
                    <div className="mt-4 flex gap-2 justify-center text-[10px] uppercase tracking-[0.2em] opacity-40">
                        <span>Processing</span>
                    </div>
                </div>

                <div className="bg-white border border-brand-line/10 rounded-sm p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Internal Transfers</p>
                    <div className="text-3xl font-bold mb-2">15</div>
                    <p className="text-[10px] uppercase tracking-widest opacity-80">Zone Movements</p>
                    <div className="mt-4 flex gap-2 justify-center text-[10px] uppercase tracking-[0.2em] opacity-40">
                        <span>Active</span>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex justify-between items-center bg-brand-ink/5">
                    <div>
                        <h3 className="font-serif italic text-base">Current Requests & Movements</h3>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                            Pending actions within the 48-Hour SLA timeframe
                        </p>
                    </div>

                    <button className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90">
                        New Request
                    </button>
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-brand-ink/5">
                            <th className="p-4 col-header">Request Type</th>
                            <th className="p-4 col-header">Company</th>
                            <th className="p-4 col-header">Time Elapsed</th>
                            <th className="p-4 col-header">Status</th>
                            <th className="p-4 col-header">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-line/10">
                        {requests.map((req, idx) => (
                            <tr key={idx} className="hover:bg-brand-ink/[0.02] transition-colors">
                                <td className="p-4">
                                    <div className="text-xs font-bold">{req.type}</div>
                                </td>
                                <td className="p-4 text-xs font-mono">{req.company}</td>
                                <td className="p-4">
                                    <div
                                        className={`text-xs font-mono ${req.status === 'SLA Warning' ? 'text-red-500 font-bold' : ''
                                            }`}
                                    >
                                        {req.elapsed} / 48H
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span
                                        className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full ${req.status === 'SLA Warning'
                                                ? 'bg-red-50 text-red-700'
                                                : 'bg-blue-50 text-blue-700'
                                            }`}
                                    >
                                        {req.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button className="text-[10px] font-bold uppercase tracking-widest underline opacity-50 hover:opacity-100">
                                        Review
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}