import React from 'react';
import { Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import {
    Contractor,
    ContractorDocument,
    WorkOrder,
} from '@/middleware/types.middleware';

type UploadDocForm = {
    contractor_id: string;
    doc_type: string;
    file_name: string;
};

type NewProjectForm = {
    title: string;
    description: string;
    location: string;
};

type ContractorsProps = {
    contractors: Contractor[];
    contractorDocs: ContractorDocument[];
    workOrders: WorkOrder[];
    showUploadDocModal: boolean;
    setShowUploadDocModal: (value: boolean) => void;
    showProjectModal: boolean;
    setShowProjectModal: (value: boolean) => void;
    uploadDoc: UploadDocForm;
    setUploadDoc: (value: UploadDocForm) => void;
    newProject: NewProjectForm;
    setNewProject: (value: NewProjectForm) => void;
    actionLoading: boolean;
    onUploadDocument: (e: React.FormEvent) => void;
    onRequestProject: (e: React.FormEvent) => void;
};

export default function ContractorsView({
    contractors,
    contractorDocs,
    workOrders,
    showUploadDocModal,
    setShowUploadDocModal,
    showProjectModal,
    setShowProjectModal,
    uploadDoc,
    setUploadDoc,
    newProject,
    setNewProject,
    actionLoading,
    onUploadDocument,
    onRequestProject,
}: ContractorsProps) {
    return (
        <div className="space-y-6">
            {showUploadDocModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-sm w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-4">Upload Document</h3>

                        <form onSubmit={onUploadDocument} className="space-y-4">
                            <select
                                required
                                value={uploadDoc.contractor_id}
                                onChange={(e) =>
                                    setUploadDoc({ ...uploadDoc, contractor_id: e.target.value })
                                }
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            >
                                <option value="">-- Select Contractor --</option>
                                {contractors.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={uploadDoc.doc_type}
                                onChange={(e) =>
                                    setUploadDoc({ ...uploadDoc, doc_type: e.target.value })
                                }
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            >
                                <option>Operational License</option>
                                <option>Professional Insurance</option>
                                <option>Technical Profile</option>
                                <option>HSE Compliance Cert</option>
                            </select>

                            <input
                                type="text"
                                placeholder="File Name (e.g. license_2024.pdf)"
                                required
                                value={uploadDoc.file_name}
                                onChange={(e) =>
                                    setUploadDoc({ ...uploadDoc, file_name: e.target.value })
                                }
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            />

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadDocModal(false)}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Upload
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-brand-ink/5 flex items-center justify-center rounded-full mb-4">
                    <Briefcase size={32} className="text-brand-ink" />
                </div>

                <h2 className="text-2xl font-serif italic">Contractor Management Portal</h2>
                <p className="max-w-md text-xs opacity-50 uppercase tracking-widest mt-2">
                    Manage external vendors, technical documentation, and performance compliance within OGFZA zones.
                </p>

                <div className="flex gap-4 mt-6">
                    <button
                        onClick={() => setShowUploadDocModal(true)}
                        className="bg-brand-ink text-brand-bg px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                    >
                        Submit Documentation
                    </button>
                    <button
                        onClick={() => setShowProjectModal(true)}
                        className="border border-brand-line/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-ink/5 transition-all"
                    >
                        Request New Project
                    </button>
                </div>
            </div>

            {showProjectModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-2">New Project Request</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                            Contractor Portal / Work Order Request
                        </p>

                        <form onSubmit={onRequestProject} className="space-y-4">
                            <div className="space-y-1">
                                <label className="col-header">Project Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.title}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, title: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    placeholder="e.g. Zone B Excavation"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Location / Coordinates</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.location}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, location: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    placeholder="e.g. Zone B, Plot 5"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Detailed Description</label>
                                <textarea
                                    required
                                    value={newProject.description}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, description: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                    placeholder="Outline the scope of work..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowProjectModal(false)}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    {actionLoading ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                    <div className="p-4 border-b border-brand-line/10 bg-brand-ink/5 flex justify-between items-center">
                        <h3 className="font-serif italic text-sm">Vendor Registry</h3>
                        <span className="text-[10px] font-bold opacity-30 uppercase">
                            {contractors.length} ACTIVE
                        </span>
                    </div>

                    <div className="p-0">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-brand-ink/5">
                                    <th className="p-4 col-header">Vendor</th>
                                    <th className="p-4 col-header">Category</th>
                                    <th className="p-4 col-header">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contractors.map((c) => (
                                    <tr key={c.id} className="border-b border-brand-line/5">
                                        <td className="p-4">
                                            <p className="text-sm font-bold">{c.name}</p>
                                            <p className="text-[10px] opacity-50 uppercase">{c.representative}</p>
                                        </td>
                                        <td className="p-4 text-[10px] font-mono">{c.category}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 rounded-full">
                                                {c.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                    <div className="p-4 border-b border-brand-line/10 bg-brand-ink/5 flex justify-between items-center">
                        <h3 className="font-serif italic text-sm">Recent Document Submissions</h3>
                        <button
                            onClick={() => window.print()}
                            className="border border-brand-line/20 px-2 py-1 text-[9px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                        >
                            Export Logs
                        </button>
                    </div>

                    <div className="p-0">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-brand-ink/5">
                                    <th className="p-4 col-header">Document</th>
                                    <th className="p-4 col-header">Upload Date</th>
                                    <th className="p-4 col-header">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contractorDocs.map((d) => (
                                    <tr key={d.id} className="border-b border-brand-line/5 text-xs">
                                        <td className="p-4">
                                            <p className="font-bold">{d.doc_type}</p>
                                            <p className="text-[10px] opacity-50 truncate max-w-[150px]">
                                                {d.file_name} - {d.contractor_name}
                                            </p>
                                        </td>
                                        <td className="p-4 font-mono opacity-60 text-[10px]">{d.upload_date}</td>
                                        <td className="p-4 text-emerald-600 font-bold tracking-widest text-[9px] uppercase">
                                            {d.status}
                                        </td>
                                    </tr>
                                ))}
                                {contractorDocs.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center italic opacity-40">
                                            No documents recently filed.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                    <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                        <h3 className="font-serif italic text-sm">Deployment & Projects</h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                                Live Status
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-brand-ink/5">
                                    <th className="p-4 col-header">Project Title</th>
                                    <th className="p-4 col-header">Assigned Vendor</th>
                                    <th className="p-4 col-header">Location</th>
                                    <th className="p-4 col-header">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workOrders.map((wo) => (
                                    <tr key={wo.id} className="data-row">
                                        <td className="p-4">
                                            <div className="text-sm font-bold">{wo.title}</div>
                                            <div className="text-[10px] opacity-50">{wo.description}</div>
                                        </td>
                                        <td className="p-4 text-xs">{wo.contractor_name}</td>
                                        <td className="p-4 text-xs opacity-60">{wo.location}</td>
                                        <td className="p-4">
                                            <span
                                                className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${wo.status === 'In Progress'
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : wo.status === 'Completed'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-brand-ink/5 text-brand-ink/50'
                                                    }`}
                                            >
                                                {wo.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {workOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center italic opacity-40">
                                            No active work orders.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}