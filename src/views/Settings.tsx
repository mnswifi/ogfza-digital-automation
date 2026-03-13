import React from 'react';
import { TeamMember } from '@/middleware/types.middleware';

type SettingsUser = {
    id: number;
    fullName: string;
    email: string;
    role: string;
    unit: string;
};

type SettingsProps = {
    allUsers: SettingsUser[];
    companiesCount: number;
    permitsCount: number;
    incidentsCount: number;
    teamMembers: TeamMember[];
    onInviteUser: () => void;
    onUpdateUserRole: (userId: number, newRole: string) => void;
};

export default function Settings({
    allUsers,
    companiesCount,
    permitsCount,
    incidentsCount,
    teamMembers,
    onInviteUser,
    onUpdateUserRole,
}: SettingsProps) {
    return (
        <div className="space-y-6">
            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm">
                <h2 className="text-2xl font-serif italic">System Administration</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">
                    Change Management & User Configuration
                </p>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                    <div>
                        <h3 className="font-serif italic text-base">User Management</h3>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                            Active Platform Users
                        </p>
                    </div>

                    <button
                        onClick={onInviteUser}
                        className="bg-brand-ink text-brand-bg px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                        title="Invite new user"
                    >
                        + Invite User
                    </button>
                </div>

                <table className="w-full text-left">
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
                                <td className="p-4 text-xs opacity-60 italic">{u.email}</td>
                                <td className="p-4">
                                    <select
                                        value={u.role}
                                        onChange={(e) => onUpdateUserRole(u.id, e.target.value)}
                                        className="px-2 py-1 text-[10px] font-bold uppercase rounded-sm bg-brand-ink/5 border border-brand-line/10 outline-none hover:border-brand-ink/30 cursor-pointer"
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Compliance">Compliance</option>
                                        <option value="Operations">Operations</option>
                                        <option value="Finance">Finance</option>
                                        <option value="HR Manager">HR Manager</option>
                                        <option value="Contractor">Contractor</option>
                                        <option value="Admin, Finance">Admin, Finance</option>
                                        <option value="Compliance, HR Manager">Compliance, HR Manager</option>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-brand-line/10 rounded-sm p-6">
                    <h3 className="font-serif italic text-base mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'New Company Registration', enabled: true },
                            { label: 'Permit Status Updates', enabled: true },
                            { label: 'HSE Incident Alerts', enabled: true },
                            { label: 'Daily Operations Report', enabled: false },
                            { label: 'Weekly Compliance Summary', enabled: false },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between py-2 border-b border-brand-line/10 last:border-0"
                            >
                                <span className="text-xs">{item.label}</span>
                                <div
                                    className={`w-8 h-4 rounded-full transition-colors cursor-pointer relative ${item.enabled ? 'bg-brand-ink' : 'bg-brand-line/30'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${item.enabled ? 'right-0.5' : 'left-0.5'
                                            }`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-brand-line/10 rounded-sm p-6">
                    <h3 className="font-serif italic text-base mb-4">SMTP Configuration</h3>
                    <div className="space-y-3 text-xs font-mono">
                        <div className="flex justify-between py-2 border-b border-brand-line/10">
                            <span className="opacity-50">Host</span>
                            <span>smtp.office365.com</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-brand-line/10">
                            <span className="opacity-50">Port</span>
                            <span>587</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-brand-line/10">
                            <span className="opacity-50">Sender</span>
                            <span>noreply-npl@norrenpensions.com</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-brand-line/10">
                            <span className="opacity-50">Security</span>
                            <span className="text-emerald-600">STARTTLS ✓</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="opacity-50">Status</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm p-6">
                <h3 className="font-serif italic text-base mb-4">Platform Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                        <p className="text-2xl font-bold data-value">{companiesCount}</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">
                            Registered Entities
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold data-value">{permitsCount}</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">
                            Total Permits
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
                <div className="p-6 border-b border-brand-line/10">
                    <h3 className="font-serif italic text-base">Implementation & Change Management Team</h3>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                        Project Steering & Onboarding Unit
                    </p>
                </div>

                <div className="p-0">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-ink/5">
                                <th className="p-4 col-header">Team Member</th>
                                <th className="p-4 col-header">Project Role</th>
                                <th className="p-4 col-header">Core Responsibilities</th>
                                <th className="p-4 col-header">Onboarding Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map((member) => (
                                <tr
                                    key={member.id}
                                    className="border-b border-brand-line/5 hover:bg-brand-ink/[0.02] transition-colors"
                                >
                                    <td className="p-4">
                                        <div className="text-sm font-bold">{member.full_name}</div>
                                        <div className="text-[10px] opacity-40 font-mono italic">
                                            {member.department}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-bold uppercase tracking-widest opacity-70">
                                        {member.role}
                                    </td>
                                    <td className="p-4">
                                        <ul className="text-[10px] space-y-1 list-disc list-inside opacity-70">
                                            {member.responsibilities.split(',').map((res, i) => (
                                                <li key={i}>{res.trim()}</li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 rounded-full uppercase tracking-widest">
                                            {member.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}