import React from 'react';
import {
    Activity,
    AlertTriangle,
    Briefcase,
    Building2,
    Clock,
    DollarSign,
    FileText,
    ShieldCheck,
    User as UserIcon,
} from 'lucide-react';
import { StatCard } from '@/src/components/StatCard';
import {
    AttendanceRecord,
    ComplianceAudit,
    Contractor,
    Employee,
    HRStats,
    Operation,
    Shift,
} from '@/middleware/types.middleware';

type DashboardStats = {
    totalCompanies?: { count?: number };
    totalProduction?: { total?: number };
    totalRevenue?: { total?: number };
    totalIncidents?: { count?: number };
};

type DashboardProps = {
    hasRole: (role: string) => boolean;
    stats: DashboardStats | null;
    hrStats: HRStats | null;
    shifts: Shift[];
    attendance: AttendanceRecord[];
    employees: Employee[];
    compliance: ComplianceAudit[];
    operations: Operation[];
    contractors: Contractor[];
    onGoToHrAttendance: () => void;
    onGoToHrEmployees: () => void;
    onGoToCompliance: () => void;
};

export default function Dashboard({
    hasRole,
    stats,
    hrStats,
    shifts,
    attendance,
    employees,
    compliance,
    operations,
    contractors,
    onGoToHrAttendance,
    onGoToHrEmployees,
    onGoToCompliance,
}: DashboardProps) {
    return (
        <div className="space-y-8">
            {hasRole('Admin') && (
                <div className="bg-brand-ink text-brand-bg p-6 rounded-sm flex items-center justify-between">
                    <div>
                        <h3 className="font-serif italic text-lg">System-wide Reporting Center</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-60">
                            Master Access: Generate all unit reports
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors"
                        >
                            Export Comprehensive
                        </button>
                    </div>
                </div>
            )}

            {hasRole('HR Manager') && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Active Personnel"
                            value={hrStats?.totalEmployees.count || 0}
                            icon={UserIcon}
                            trend="Active"
                        />
                        <StatCard
                            label="Present on Shift"
                            value={hrStats?.presentToday.count || 0}
                            icon={Activity}
                            trend="Today"
                        />
                        <StatCard
                            label="Expired Certs"
                            value={hrStats?.expiredCerts.count || 0}
                            icon={AlertTriangle}
                            trend="Action Req"
                        />
                        <StatCard
                            label="Active Shifts"
                            value={shifts.length}
                            icon={Clock}
                            trend="Deployed"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                            <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                                <h3 className="font-serif italic text-sm">Recent Attendance</h3>
                                <button
                                    onClick={onGoToHrAttendance}
                                    className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100"
                                >
                                    Manage
                                </button>
                            </div>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Date</th>
                                        <th className="p-4 col-header">Personnel</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.slice(0, 5).map((a) => (
                                        <tr key={a.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-xs font-mono">{a.date}</td>
                                            <td className="p-4 text-sm font-bold">{a.full_name}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${a.status === 'Present'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-red-50 text-red-700'
                                                        }`}
                                                >
                                                    {a.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                            <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                                <h3 className="font-serif italic text-sm">Workforce Deployment</h3>
                                <button
                                    onClick={onGoToHrEmployees}
                                    className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100"
                                >
                                    View Roster
                                </button>
                            </div>

                            <div className="p-4 bg-brand-ink/5 border-b border-brand-line/5">
                                <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1">
                                    Zone Deployment Heatmap (Active)
                                </p>
                                <div className="flex gap-2">
                                    {['Zone A', 'Zone B', 'Zone C', 'HQ'].map((z) => (
                                        <div key={z} className="flex-1 bg-white p-2 border border-brand-line/10 shadow-sm">
                                            <div className="text-[9px] opacity-50 mb-1">{z}</div>
                                            <div className="text-lg font-bold">
                                                {employees.filter((e) => e.zone === z && e.status === 'Active').length}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Personnel</th>
                                        <th className="p-4 col-header">Location / Zone</th>
                                        <th className="p-4 col-header">Assigned Company</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.slice(0, 5).map((e) => (
                                        <tr key={e.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-xs font-bold">{e.full_name}</td>
                                            <td className="p-4 text-xs font-mono opacity-60">{e.zone}</td>
                                            <td className="p-4 text-xs italic">{e.company}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {hasRole('Compliance') && (
                    <StatCard
                        label="Total Companies"
                        value={stats?.totalCompanies?.count || 0}
                        icon={Building2}
                        trend="Registered"
                    />
                )}
                {hasRole('Compliance') && (
                    <StatCard
                        label="Audit Records"
                        value={compliance.length}
                        icon={ShieldCheck}
                        trend="All Time"
                    />
                )}
                {hasRole('Operations') && (
                    <StatCard
                        label="Daily Production (BBL)"
                        value={stats?.totalProduction?.total?.toLocaleString() || 0}
                        icon={Activity}
                        trend="+5.1%"
                    />
                )}
                {hasRole('Finance') && (
                    <StatCard
                        label="Total Revenue (USD)"
                        value={`$${(stats?.totalRevenue?.total || 0).toLocaleString()}`}
                        icon={DollarSign}
                        trend="+8.2%"
                    />
                )}
                {hasRole('Admin') && (
                    <StatCard
                        label="Contractor Registry"
                        value={contractors.length}
                        icon={Briefcase}
                        trend="Active"
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {hasRole('Compliance') ? (
                    <>
                        <StatCard
                            label="Open HSE Incidents"
                            value={stats?.totalIncidents?.count || 0}
                            icon={AlertTriangle}
                            trend={stats?.totalIncidents?.count ? 'Action Required' : 'Stable'}
                        />
                        <StatCard
                            label="Completed Audits"
                            value={compliance.filter((c) => c.status === 'Completed').length}
                            icon={ShieldCheck}
                            trend="Verified"
                        />
                        <StatCard
                            label="Pending Audits"
                            value={compliance.filter((c) => c.status !== 'Completed').length}
                            icon={FileText}
                            trend="Scheduled"
                        />
                        <StatCard
                            label="Violation Rate"
                            value={
                                compliance.length > 0
                                    ? `${Math.round(
                                        (compliance.filter((c) => c.status === 'Violation').length /
                                            compliance.length) *
                                        100
                                    )}%`
                                    : '0%'
                            }
                            icon={AlertTriangle}
                            trend="Compliance Score"
                        />
                    </>
                ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {hasRole('Operations') && (
                    <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                        <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                            <h3 className="font-serif italic text-sm">Recent Operations</h3>
                            <button className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100">
                                View All
                            </button>
                        </div>
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
                                    {operations.slice(0, 5).map((op) => (
                                        <tr key={op.id} className="data-row">
                                            <td className="p-4 text-sm font-medium">{op.field_name}</td>
                                            <td className="p-4 data-value text-sm">
                                                {op.production_volume.toLocaleString()}
                                            </td>
                                            <td className="p-4 data-value text-sm">{op.downtime_hours}h</td>
                                            <td className="p-4 data-value text-xs opacity-60">{op.report_date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {hasRole('Compliance') && (
                    <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                        <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                            <h3 className="font-serif italic text-sm">Compliance & Audit Summary</h3>
                            <button
                                onClick={onGoToCompliance}
                                className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100"
                            >
                                Full Report
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Inspector</th>
                                        <th className="p-4 col-header">Audit Date</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compliance.slice(0, 5).map((c) => (
                                        <tr key={c.id} className="data-row">
                                            <td className="p-4 text-sm font-medium">{c.company_name}</td>
                                            <td className="p-4 text-xs opacity-80">{c.inspector}</td>
                                            <td className="p-4 data-value text-xs opacity-60">{c.audit_date}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${c.status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : c.status === 'Violation'
                                                            ? 'bg-red-50 text-red-700'
                                                            : 'bg-amber-50 text-amber-700'
                                                        }`}
                                                >
                                                    {c.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {compliance.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center italic opacity-40">
                                                No audit records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}