import React from 'react';
import { motion } from 'motion/react';
import { Asset, MaintenanceRecord, Operation } from '@/middleware/types.middleware';

type NewOpsForm = {
    field_name: string;
    production_volume: string;
    downtime_hours: string;
    report_date: string;
};

type OperationsProps = {
    operations: Operation[];
    assets: Asset[];
    maintenance: MaintenanceRecord[];
    showOpsModal: boolean;
    setShowOpsModal: (value: boolean) => void;
    newOps: NewOpsForm;
    setNewOps: (value: NewOpsForm) => void;
    actionLoading: boolean;
    hasRole: (role: string) => boolean;
    onLogProduction: (e: React.FormEvent) => void;
};

export default function OperationsView({
    operations,
    assets,
    maintenance,
    showOpsModal,
    setShowOpsModal,
    newOps,
    setNewOps,
    actionLoading,
    hasRole,
    onLogProduction,
}: OperationsProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif italic">Field Assets & Logistics</h2>
                        <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                            Infrastructure & Production Management
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                        >
                            Export Logs
                        </button>

                        {(hasRole('Admin') || hasRole('Operations')) && (
                            <button
                                onClick={() => setShowOpsModal(true)}
                                className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90"
                            >
                                Log Production Report
                            </button>
                        )}
                    </div>
                </div>

                {showOpsModal && (
                    <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                        >
                            <h3 className="font-serif italic text-lg mb-2">Daily Production Report</h3>
                            <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                                Operations Unit Data Entry
                            </p>

                            <form onSubmit={onLogProduction} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="col-header">Field / Asset Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={newOps.field_name}
                                        onChange={(e) =>
                                            setNewOps({ ...newOps, field_name: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        placeholder="e.g. Rig Delta 07"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Volume (BBL)</label>
                                        <input
                                            required
                                            type="number"
                                            value={newOps.production_volume}
                                            onChange={(e) =>
                                                setNewOps({ ...newOps, production_volume: e.target.value })
                                            }
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Downtime (Hrs)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.5"
                                            value={newOps.downtime_hours}
                                            onChange={(e) =>
                                                setNewOps({ ...newOps, downtime_hours: e.target.value })
                                            }
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="col-header">Report Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={newOps.report_date}
                                        onChange={(e) =>
                                            setNewOps({ ...newOps, report_date: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowOpsModal(false)}
                                        className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                    >
                                        {actionLoading ? 'Logging...' : 'Submit Report'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                <div className="p-4 bg-brand-ink/[0.02] border-b border-brand-line/5">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 px-2 pb-2">
                        Recent Production History
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-brand-ink/5">
                                    <th className="p-4 col-header">Field Name</th>
                                    <th className="p-4 col-header">Volume (BBL)</th>
                                    <th className="p-4 col-header">Downtime</th>
                                    <th className="p-4 col-header">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operations.map((op) => (
                                    <tr key={op.id} className="data-row">
                                        <td className="p-4 text-sm font-medium">{op.field_name}</td>
                                        <td className="p-4 data-value text-sm">
                                            {op.production_volume.toLocaleString()}
                                        </td>
                                        <td className="p-4 data-value text-sm">{op.downtime_hours}h</td>
                                        <td className="p-4 data-value text-xs opacity-60">
                                            {op.report_date}
                                        </td>
                                    </tr>
                                ))}
                                {operations.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center italic opacity-40">
                                            No production data reported.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 bg-white">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 px-2 pb-2">
                        Infrastructure Assets
                    </h3>

                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-ink/5">
                                <th className="p-4 col-header">Asset Name</th>
                                <th className="p-4 col-header">Type</th>
                                <th className="p-4 col-header">Location</th>
                                <th className="p-4 col-header">Status</th>
                                <th className="p-4 col-header">Maintenance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map((a) => (
                                <tr key={a.id} className="data-row">
                                    <td className="p-4 text-sm font-bold">{a.asset_name}</td>
                                    <td className="p-4 text-xs opacity-80">{a.type}</td>
                                    <td className="p-4 data-value text-xs">{a.location_coordinates}</td>
                                    <td className="p-4">
                                        <span
                                            className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${a.status === 'Operational'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-red-50 text-red-700'
                                                }`}
                                        >
                                            {a.status}
                                        </span>
                                    </td>
                                    <td className="p-4 data-value text-xs opacity-60">
                                        Next: {a.maintenance_date || 'TBD'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10">
                    <h3 className="font-serif italic text-base">Equipment Maintenance Tracker</h3>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                        Lifecycle Management & Scheduling
                    </p>
                </div>

                <div className="p-0">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-ink/5">
                                <th className="p-4 col-header">Asset</th>
                                <th className="p-4 col-header">Maintenance Type</th>
                                <th className="p-4 col-header">Technician</th>
                                <th className="p-4 col-header">Cost</th>
                                <th className="p-4 col-header">Date / Due</th>
                                <th className="p-4 col-header">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-line/5">
                            {maintenance.map((m) => (
                                <tr key={m.id} className="hover:bg-brand-ink/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="text-sm font-bold">{m.asset_name}</div>
                                        <div className="text-[10px] opacity-40">{m.description}</div>
                                    </td>
                                    <td className="p-4 text-xs font-bold">{m.maintenance_type}</td>
                                    <td className="p-4 text-xs opacity-70">{m.technician}</td>
                                    <td className="p-4 text-xs font-mono">${m.cost.toLocaleString()}</td>
                                    <td className="p-4 text-xs font-mono opacity-60">
                                        {m.maintenance_date}
                                        <div className="text-[9px] text-brand-ink font-bold mt-0.5">
                                            Next: {m.next_due_date}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${m.status === 'Completed'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700'
                                                }`}
                                        >
                                            {m.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {maintenance.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center italic opacity-30">
                                        No maintenance records found.
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