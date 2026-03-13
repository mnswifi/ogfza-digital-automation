import React from 'react';
import { motion } from 'motion/react';
import { Company, Incident } from '@/middleware/types.middleware';

type NewIncidentForm = {
    company_name: string;
    incident_type: string;
    severity: string;
    description: string;
};

type IncidentsProps = {
    incidents: Incident[];
    companies: Company[];
    showIncidentModal: boolean;
    setShowIncidentModal: (value: boolean) => void;
    newIncident: NewIncidentForm;
    setNewIncident: (value: NewIncidentForm) => void;
    actionLoading: boolean;
    onReportIncident: (e: React.FormEvent) => void;
};

export default function IncidentsView({
    incidents,
    companies,
    showIncidentModal,
    setShowIncidentModal,
    newIncident,
    setNewIncident,
    actionLoading,
    onReportIncident,
}: IncidentsProps) {
    return (
        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showIncidentModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-6">Report OGFZA Incident</h3>

                        <form onSubmit={onReportIncident} className="space-y-4">
                            <div className="space-y-1">
                                <label className="col-header">Entity Name</label>
                                <select
                                    required
                                    value={newIncident.company_name}
                                    onChange={(e) =>
                                        setNewIncident({ ...newIncident, company_name: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option value="">Select Company</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Incident Type</label>
                                    <select
                                        value={newIncident.incident_type}
                                        onChange={(e) =>
                                            setNewIncident({ ...newIncident, incident_type: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option>HSE</option>
                                        <option>Operational</option>
                                        <option>Security</option>
                                        <option>Technical</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="col-header">Severity</label>
                                    <select
                                        value={newIncident.severity}
                                        onChange={(e) =>
                                            setNewIncident({ ...newIncident, severity: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Description</label>
                                <textarea
                                    required
                                    value={newIncident.description}
                                    onChange={(e) =>
                                        setNewIncident({ ...newIncident, description: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm h-32 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowIncidentModal(false)}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    {actionLoading ? 'Reporting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                    <h3 className="font-serif italic text-base">Safety & Incident Logs</h3>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                        HSE Digitization & Workflow
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                    >
                        Export Incident Report
                    </button>
                    <button
                        onClick={() => setShowIncidentModal(true)}
                        className="bg-brand-ink text-brand-bg px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                        Log New Incident
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-brand-ink/5">
                            <th className="p-4 col-header">ID</th>
                            <th className="p-4 col-header">Entity</th>
                            <th className="p-4 col-header">Type</th>
                            <th className="p-4 col-header">Severity</th>
                            <th className="p-4 col-header">Status</th>
                            <th className="p-4 col-header">Reported Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-line/10">
                        {incidents.map((inc) => (
                            <tr key={inc.id} className="hover:bg-brand-ink/[0.02] transition-colors group">
                                <td className="p-4 text-xs font-mono opacity-50">#{inc.id}</td>
                                <td className="p-4 text-xs font-bold uppercase">{inc.company_name}</td>
                                <td className="p-4 text-xs italic">{inc.incident_type}</td>
                                <td className="p-4">
                                    <span
                                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-full ${inc.severity === 'Critical'
                                                ? 'bg-red-500 text-white'
                                                : inc.severity === 'High'
                                                    ? 'bg-orange-500 text-white'
                                                    : inc.severity === 'Medium'
                                                        ? 'bg-yellow-500 text-brand-ink'
                                                        : 'bg-emerald-500 text-white'
                                            }`}
                                    >
                                        {inc.severity}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="flex items-center gap-1.5 text-[10px]">
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${inc.status === 'Open' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                                                }`}
                                        />
                                        {inc.status}
                                    </span>
                                </td>
                                <td className="p-4 text-xs opacity-50">
                                    {new Date(inc.reported_date).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}

                        {incidents.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-20 text-center opacity-30 italic">
                                    No incidents recorded in the system.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}