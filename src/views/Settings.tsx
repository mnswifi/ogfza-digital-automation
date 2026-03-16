import React, { useState } from 'react';

type SettingsUser = {
    id: number;
    fullName: string;
    email: string;
    role: string;
    unit: string;
};

type InviteUserPayload = {
    fullName: string;
    email: string;
    role: string;
    operationalUnit: string;
};

const availableRoles = [
    'Admin',
    'Compliance',
    'Operations',
    'Finance',
    'HR Manager',
    'Contractor',
    'Admin, Finance',
    'Compliance, HR Manager',
];

const initialInviteForm: InviteUserPayload = {
    fullName: '',
    email: '',
    role: 'Operations',
    operationalUnit: '',
};

type SettingsProps = {
    allUsers: SettingsUser[];
    companiesCount: number;
    tradeRequestsCount: number;
    incidentsCount: number;
    actionLoading: boolean;
    onInviteUser: (inviteUser: InviteUserPayload) => Promise<unknown>;
    onUpdateUserRole: (userId: number, newRole: string) => void;
};

export default function Settings({
    allUsers,
    companiesCount,
    tradeRequestsCount,
    incidentsCount,
    actionLoading,
    onInviteUser,
    onUpdateUserRole,
}: SettingsProps) {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState<InviteUserPayload>(initialInviteForm);

    const closeInviteModal = () => {
        setShowInviteModal(false);
        setInviteForm(initialInviteForm);
    };

    const submitInviteForm = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await onInviteUser(inviteForm);
        if (result) {
            closeInviteModal();
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm">
                <h2 className="text-2xl font-serif">System Administration</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">
                    Change Management & User Configuration
                </p>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm p-6">
                <h3 className="font-serif  text-base mb-4">Platform Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                        <p className="text-2xl font-bold data-value">{companiesCount}</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">
                            Registered Entities
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold data-value">{tradeRequestsCount}</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">
                            Trade Requests
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold data-value">{incidentsCount}</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">
                            Incident Records
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold data-value">v1.0</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">
                            Platform Version
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-serif  text-base">User Management</h3>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                            Active Platform Users
                        </p>
                    </div>

                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-brand-ink text-brand-bg px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                        title="Invite new user"
                    >
                        + Invite User
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                        <thead>
                            <tr className="bg-brand-ink/5">
                                <th className="p-4 col-header">Name</th>
                                <th className="p-4 col-header">Email</th>
                                <th className="p-4 col-header">Role</th>
                                <th className="p-4 col-header">Unit</th>
                                <th className="p-4 col-header">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-line/10">
                            {allUsers.map((u, i) => (
                                <tr key={u.id ?? i} className="hover:bg-brand-ink/[0.02] transition-colors">
                                    <td className="p-4 text-sm font-bold">{u.fullName}</td>
                                    <td className="p-4 text-xs opacity-60 ">{u.email}</td>
                                    <td className="p-4">
                                        <select
                                            value={u.role}
                                            onChange={(e) => onUpdateUserRole(u.id, e.target.value)}
                                            className="px-2 py-1 text-[10px] font-bold uppercase rounded-sm bg-brand-ink/5 border border-brand-line/10 outline-none hover:border-brand-ink/30 cursor-pointer"
                                        >
                                            {availableRoles.map((roleOption) => (
                                                <option key={roleOption} value={roleOption}>
                                                    {roleOption}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 text-xs opacity-60">{u.unit}</td>
                                    <td className="p-4">
                                        <span className="flex items-center gap-1.5 text-[10px]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showInviteModal && (
                <div className="fixed inset-0 z-50 bg-brand-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white border border-brand-line/10 shadow-2xl rounded-sm overflow-hidden">
                        <div className="p-6 border-b border-brand-line/10 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-serif  text-lg">Invite Platform User</h3>
                                <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">
                                    Create an account and email the initial login details
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeInviteModal}
                                className="text-2xl leading-none opacity-60 hover:opacity-100"
                                aria-label="Close invite modal"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={submitInviteForm} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={inviteForm.fullName}
                                        onChange={(e) =>
                                            setInviteForm((current) => ({
                                                ...current,
                                                fullName: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-brand-ink/5 border border-brand-line/10 p-3 text-sm outline-none"
                                        placeholder="e.g. Sarah Compliance"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="col-header">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteForm.email}
                                        onChange={(e) =>
                                            setInviteForm((current) => ({
                                                ...current,
                                                email: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-brand-ink/5 border border-brand-line/10 p-3 text-sm outline-none"
                                        placeholder="name@ogfza.gov"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Assigned Role</label>
                                    <select
                                        value={inviteForm.role}
                                        onChange={(e) =>
                                            setInviteForm((current) => ({
                                                ...current,
                                                role: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-brand-ink/5 border border-brand-line/10 p-3 text-sm outline-none"
                                    >
                                        {availableRoles.map((roleOption) => (
                                            <option key={roleOption} value={roleOption}>
                                                {roleOption}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="col-header">Operational Unit</label>
                                    <input
                                        type="text"
                                        required
                                        value={inviteForm.operationalUnit}
                                        onChange={(e) =>
                                            setInviteForm((current) => ({
                                                ...current,
                                                operationalUnit: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-brand-ink/5 border border-brand-line/10 p-3 text-sm outline-none"
                                        placeholder="e.g. HQ, Regulatory, Onne"
                                    />
                                </div>
                            </div>

                            <div className="bg-brand-ink/[0.03] border border-brand-line/10 p-4 text-xs opacity-70">
                                The system will generate a temporary password automatically and email it to the invited user.
                                They will be required to change it on first login.
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeInviteModal}
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-brand-line/20 hover:bg-brand-ink/[0.03]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-brand-ink text-brand-bg px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Inviting...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
