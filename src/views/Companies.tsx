import React from 'react';
import { X } from 'lucide-react';
import { Company, User } from '@/middleware/types.middleware';

type NewCompanyForm = {
    name: string;
    licenseNo: string;
    tin: string;
    sector: string;
    type: string;
    leaseInfo: string;
    representativeEmail: string;
};

type CompaniesProps = {
    user: User;
    companies: Company[];
    showRegModal: boolean;
    setShowRegModal: (value: boolean) => void;
    newCompany: NewCompanyForm;
    setNewCompany: (value: NewCompanyForm) => void;
    actionLoading: boolean;
    onRegisterCompany: (e: React.FormEvent) => void;
};

export default function Companies({
    user,
    companies,
    showRegModal,
    setShowRegModal,
    newCompany,
    setNewCompany,
    actionLoading,
    onRegisterCompany,
}: CompaniesProps) {
    return (
        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showRegModal && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg p-8 shadow-2xl border border-brand-line/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-serif italic text-brand-ink">
                                Register New OGFZA Entity
                            </h2>
                            <button onClick={() => setShowRegModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={onRegisterCompany} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Company Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCompany.name}
                                        onChange={(e) =>
                                            setNewCompany({ ...newCompany, name: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="col-header">License No.</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCompany.licenseNo}
                                        onChange={(e) =>
                                            setNewCompany({ ...newCompany, licenseNo: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">TIN</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCompany.tin}
                                        onChange={(e) =>
                                            setNewCompany({ ...newCompany, tin: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="col-header">Sector</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCompany.sector}
                                        onChange={(e) =>
                                            setNewCompany({ ...newCompany, sector: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Lease Information</label>
                                <input
                                    type="text"
                                    required
                                    value={newCompany.leaseInfo}
                                    onChange={(e) =>
                                        setNewCompany({ ...newCompany, leaseInfo: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Representative Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newCompany.representativeEmail}
                                    onChange={(e) =>
                                        setNewCompany({
                                            ...newCompany,
                                            representativeEmail: e.target.value,
                                        })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    placeholder="Email for permit certificates"
                                />
                            </div>

                            <button
                                disabled={actionLoading}
                                className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs"
                            >
                                {actionLoading ? 'Registering...' : 'Complete Registration'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-serif italic">Company Directory</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                        OGFZA Registered Entities
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                    >
                        Export Registry Report
                    </button>

                    {user.role === 'Admin' && (
                        <button
                            onClick={() => setShowRegModal(true)}
                            className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                            Register New Company
                        </button>
                    )}
                </div>
            </div>

            <table className="w-full text-left">
                <thead>
                    <tr className="bg-brand-ink/5">
                        <th className="p-4 col-header">Company Name</th>
                        <th className="p-4 col-header">License No.</th>
                        <th className="p-4 col-header">Sector</th>
                        <th className="p-4 col-header">Status</th>
                        <th className="p-4 col-header">Joined</th>
                    </tr>
                </thead>
                <tbody>
                    {companies.map((c) => (
                        <tr key={c.id} className="data-row">
                            <td className="p-4 text-sm font-bold">{c.name}</td>
                            <td className="p-4 data-value text-sm">{c.license_no}</td>
                            <td className="p-4 text-xs opacity-80">{c.type}</td>
                            <td className="p-4">
                                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                                    {c.status}
                                </span>
                            </td>
                            <td className="p-4 data-value text-xs opacity-60">{c.joined_date}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}