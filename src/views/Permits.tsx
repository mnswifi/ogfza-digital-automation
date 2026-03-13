import React from 'react';
import { motion } from 'motion/react';
import { Company, Permit } from '@/middleware/types.middleware';

type NewPermitForm = {
    company_id: string;
    permit_type: string;
};

type PermitsProps = {
    permits: Permit[];
    companies: Company[];
    showPermitModal: boolean;
    setShowPermitModal: (value: boolean) => void;
    newPermit: NewPermitForm;
    setNewPermit: (value: NewPermitForm) => void;
    selectedPermit: Permit | null;
    setSelectedPermit: (value: Permit | null) => void;
    permitExpiry: string;
    setPermitExpiry: (value: string) => void;
    actionLoading: boolean;
    hasRole: (role: string) => boolean;
    onApplyPermit: (e: React.FormEvent) => void;
    onUpdatePermit: (id: number, status: string, expiry_date: string) => void;
};

export default function Permits({
    permits,
    companies,
    showPermitModal,
    setShowPermitModal,
    newPermit,
    setNewPermit,
    selectedPermit,
    setSelectedPermit,
    permitExpiry,
    setPermitExpiry,
    actionLoading,
    hasRole,
    onApplyPermit,
    onUpdatePermit,
}: PermitsProps) {
    return (
        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showPermitModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-2">New Permit Application</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                            OGFZA Regulatory Workflow
                        </p>

                        <form onSubmit={onApplyPermit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="col-header">Select Company</label>
                                <select
                                    required
                                    value={newPermit.company_id}
                                    onChange={(e) =>
                                        setNewPermit({ ...newPermit, company_id: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option value="">-- Select Registered Entity --</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Permit Type</label>
                                <select
                                    required
                                    value={newPermit.permit_type}
                                    onChange={(e) =>
                                        setNewPermit({ ...newPermit, permit_type: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option value="">-- Select Permit Type --</option>
                                    <option>Drilling License</option>
                                    <option>Environmental Impact Assessment</option>
                                    <option>Oil Mining Lease</option>
                                    <option>Gas Flare Permit</option>
                                    <option>Export License</option>
                                    <option>Zone Entry Permit</option>
                                    <option>Construction Permit</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPermitModal(false)}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    {actionLoading ? 'Submitting...' : 'Submit Application'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {selectedPermit && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-1">Permit Review</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                            #{selectedPermit.id.toString().padStart(4, '0')}
                        </p>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-xs border-b border-brand-line/10 pb-2">
                                <span className="opacity-50">Company</span>
                                <span className="font-bold">{selectedPermit.company_name}</span>
                            </div>
                            <div className="flex justify-between text-xs border-b border-brand-line/10 pb-2">
                                <span className="opacity-50">Permit Type</span>
                                <span>{selectedPermit.permit_type}</span>
                            </div>
                            <div className="flex justify-between text-xs border-b border-brand-line/10 pb-2">
                                <span className="opacity-50">Applied Date</span>
                                <span>{selectedPermit.applied_date}</span>
                            </div>
                            <div className="flex justify-between text-xs pb-2">
                                <span className="opacity-50">Current Status</span>
                                <span
                                    className={`font-bold ${selectedPermit.status === 'Approved'
                                            ? 'text-emerald-600'
                                            : 'text-amber-600'
                                        }`}
                                >
                                    {selectedPermit.status}
                                </span>
                            </div>
                        </div>

                        {(hasRole('Admin') || hasRole('Compliance')) &&
                            selectedPermit.status === 'Pending' && (
                                <div className="space-y-1 mb-4">
                                    <label className="col-header">Set Expiry Date</label>
                                    <input
                                        type="date"
                                        value={permitExpiry}
                                        onChange={(e) => setPermitExpiry(e.target.value)}
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                            )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPermit(null);
                                    setPermitExpiry('');
                                }}
                                className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                            >
                                Close
                            </button>

                            {(hasRole('Admin') || hasRole('Compliance')) &&
                                selectedPermit.status === 'Pending' && (
                                    <>
                                        <button
                                            onClick={() =>
                                                onUpdatePermit(selectedPermit.id, 'Rejected', permitExpiry)
                                            }
                                            disabled={actionLoading}
                                            className="flex-1 border border-red-200 text-red-600 py-3 font-bold uppercase tracking-widest text-[10px]"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() =>
                                                onUpdatePermit(selectedPermit.id, 'Approved', permitExpiry)
                                            }
                                            disabled={actionLoading}
                                            className="flex-1 bg-emerald-600 text-white py-3 font-bold uppercase tracking-widest text-[10px]"
                                        >
                                            {actionLoading ? '...' : 'Approve'}
                                        </button>
                                    </>
                                )}
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-serif italic">Permits & Approvals</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                        Regulatory Workflow Tracking
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                    >
                        Export Permits Report
                    </button>

                    {(hasRole('Admin') || hasRole('Operations')) && (
                        <button
                            onClick={() => setShowPermitModal(true)}
                            className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90"
                        >
                            New Application
                        </button>
                    )}
                </div>
            </div>

            <table className="w-full text-left">
                <thead>
                    <tr className="bg-brand-ink/5">
                        <th className="p-4 col-header">ID</th>
                        <th className="p-4 col-header">Company</th>
                        <th className="p-4 col-header">Permit Type</th>
                        <th className="p-4 col-header">Applied</th>
                        <th className="p-4 col-header">Status</th>
                        <th className="p-4 col-header">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {permits.map((p) => (
                        <tr key={p.id} className="data-row">
                            <td className="p-4 data-value text-xs opacity-50">
                                #{p.id.toString().padStart(4, '0')}
                            </td>
                            <td className="p-4 text-sm font-bold">{p.company_name}</td>
                            <td className="p-4 text-xs">{p.permit_type}</td>
                            <td className="p-4 data-value text-xs opacity-60">{p.applied_date}</td>
                            <td className="p-4">
                                <span
                                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${p.status === 'Approved'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : p.status === 'Rejected'
                                                ? 'bg-red-50 text-red-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}
                                >
                                    {p.status}
                                </span>
                            </td>
                            <td className="p-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedPermit(p);
                                        setPermitExpiry(p.expiry_date || '');
                                    }}
                                    className="text-[10px] font-bold uppercase underline underline-offset-4 opacity-50 hover:opacity-100"
                                >
                                    Review
                                </button>

                                {p.status === 'Approved' && (
                                    <button
                                        onClick={() => {
                                            const printWindow = window.open('', '_blank');
                                            if (printWindow) {
                                                printWindow.document.write(`
                          <html>
                            <head>
                              <title>Approval Certificate - ${p.company_name}</title>
                              <style>
                                body { font-family: serif; text-align: center; padding: 50px; }
                                .container { border: 10px solid #0a192f; padding: 50px; }
                                h1 { font-size: 40px; text-transform: uppercase; letter-spacing: 5px; color: #0a192f; }
                                p { font-size: 20px; line-height: 1.6; }
                                .highlight { font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding: 0 10px; }
                                .seal { margin-top: 50px; width: 150px; height: 150px; border: 4px dashed #0a192f; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; align-content: center; font-weight: bold; color: #0a192f; text-transform: uppercase; font-size: 14px; }
                              </style>
                            </head>
                            <body>
                              <div class="container">
                                <h1>Certificate of Approval</h1>
                                <p>This certifies that</p>
                                <p class="highlight">${p.company_name}</p>
                                <p>has been officially granted the following permit:</p>
                                <p class="highlight">${p.permit_type}</p>
                                <p>Effective Date: <b>${p.applied_date}</b> &nbsp;&nbsp;&nbsp; Expiry Date: <b>${p.expiry_date || 'N/A'}</b></p>
                                <p>Issued by the Oil & Gas Free Zones Authority (OGFZA)</p>
                                <div class="seal"><span style="margin: auto;">Official<br/>OGFZA<br/>Seal</span></div>
                              </div>
                              <script>
                                window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                              </script>
                            </body>
                          </html>
                        `);
                                                printWindow.document.close();
                                            }
                                        }}
                                        className="text-[10px] font-bold uppercase underline underline-offset-4 opacity-50 hover:opacity-100 text-emerald-600"
                                    >
                                        Download Cert
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}