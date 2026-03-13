import React from 'react';
import { ComplianceAudit } from '@/middleware/types.middleware';

type ComplianceProps = {
    compliance: ComplianceAudit[];
};

export default function Compliance({ compliance }: ComplianceProps) {
    return (
        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-serif italic">Compliance & Audit</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                        Inspection & Monitoring Log
                    </p>
                </div>

                <button
                    onClick={() => window.print()}
                    className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                >
                    Export Audit Report
                </button>
            </div>

            <table className="w-full text-left">
                <thead>
                    <tr className="bg-brand-ink/5">
                        <th className="p-4 col-header">Date</th>
                        <th className="p-4 col-header">Company</th>
                        <th className="p-4 col-header">Inspector</th>
                        <th className="p-4 col-header">Findings</th>
                        <th className="p-4 col-header">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {compliance.map((comp) => (
                        <tr key={comp.id} className="data-row">
                            <td className="p-4 data-value text-xs">{comp.audit_date}</td>
                            <td className="p-4 text-sm font-bold">{comp.company_name}</td>
                            <td className="p-4 text-xs">{comp.inspector}</td>
                            <td className="p-4 text-xs opacity-80">{comp.findings}</td>
                            <td className="p-4">
                                <span
                                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${comp.status === 'Completed'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-amber-50 text-amber-700'
                                        }`}
                                >
                                    {comp.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}