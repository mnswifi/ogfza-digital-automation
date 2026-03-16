import React from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowLeftRight,
    Building2,
    Clock,
    DollarSign,
    FileText,
    ShieldCheck,
    User as UserIcon,
    Users,
    Wrench,
} from 'lucide-react';
import { StatCard } from '@/src/components/StatCard';
import {
    Asset,
    AttendanceRecord,
    Company,
    CompanyApplication,
    ComplianceCase,
    Employee,
    HRStats,
    Incident,
    MaintenanceRecord,
    Operation,
    Revenue,
    Shift,
    TradeOperationRequest,
    User,
} from '@/middleware/types.middleware';
import { tradeOperationFamilyCatalog, type TradeOperationFamilyKey } from '@/src/constants/tradeOperations';
import { printStructuredReport } from '@/src/utils/printDocuments';

type DashboardStats = {
    totalCompanies?: { count?: number };
    totalProduction?: { total?: number };
    totalRevenue?: { total?: number };
    totalIncidents?: { count?: number };
    confirmedLicencePayments?: { count?: number };
    pendingLicencePayments?: { count?: number };
};

type DashboardProps = {
    userRole: string;
    stats: DashboardStats | null;
    hrStats: HRStats | null;
    shifts: Shift[];
    attendance: AttendanceRecord[];
    employees: Employee[];
    compliance: ComplianceCase[];
    operations: Operation[];
    maintenance: MaintenanceRecord[];
    companies: Company[];
    companyApplications: CompanyApplication[];
    tradeOperations: TradeOperationRequest[];
    revenue: Revenue[];
    assets: Asset[];
    incidents: Incident[];
    allUsers: User[];
    onGoToHrAttendance: () => void;
    onGoToHrEmployees: () => void;
    onGoToCompliance: () => void;
};

type MiniMetricProps = {
    label: string;
    value: string | number;
    hint?: string;
};

type SectionCardProps = {
    title: string;
    eyebrow: string;
    children: React.ReactNode;
};

const ACTIVE_COMPLIANCE_STATUSES = new Set(['Open', 'Returned', 'Response Submitted']);
const ACTIVE_INCIDENT_STATUSES = new Set(['Open']);
const ACTIVE_TRADE_REQUEST_STATUSES = new Set(['Submitted', 'Returned']);
const NON_TERMINAL_TRADE_REQUEST_STATUSES = new Set(['Submitted', 'Returned']);
const HIGH_SEVERITY_LEVELS = new Set(['High', 'Critical']);
const ASSET_MAINTENANCE_STATUSES = new Set(['Under Maintenance', 'Maintenance Needed']);

const formatCurrency = (value: number) =>
    `$${Math.round(value).toLocaleString()}`;

const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const parseDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isCurrentMonth = (value?: string | null) => {
    const parsed = parseDate(value);
    if (!parsed) return false;

    const now = new Date();
    return (
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth()
    );
};

const isPastDue = (value?: string | null) => {
    const parsed = parseDate(value);
    if (!parsed) return false;

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return parsed.getTime() < endOfToday.getTime();
};

const getTradeAnchorDate = (request: TradeOperationRequest) =>
    parseDate(request.resubmitted_at || request.submitted_at);

const getTradeElapsedHours = (request: TradeOperationRequest) => {
    const anchor = getTradeAnchorDate(request);
    if (!anchor) return null;

    const end =
        request.status === 'Approved'
            ? parseDate(request.approved_at)
            : request.status === 'Rejected'
                ? parseDate(request.rejected_at)
                : new Date();

    if (!end) return null;
    return Math.max(0, (end.getTime() - anchor.getTime()) / (1000 * 60 * 60));
};

const formatRequestStatus = (status: string) => {
    if (status === 'Awaiting Admin Approval') return 'Awaiting MD Approval';
    if (status === 'Approved Pending Payment') return 'Awaiting Contractor Payment';
    if (status === 'Payment Submitted') return 'Awaiting Payment Confirmation';
    if (status === 'Licence Issued') return 'Licence Issued';
    if (status === 'Returned') return 'Queried';
    return status;
};

const formatDateLabel = (value?: string | null) => {
    const parsed = parseDate(value);
    if (!parsed) return '--';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
};

const MiniMetric = ({ label, value, hint }: MiniMetricProps) => (
    <div className="bg-brand-ink/[0.03] border border-brand-line/10 rounded-sm p-4">
        <p className="text-[10px] uppercase tracking-widest opacity-45">{label}</p>
        <p className="text-xl font-bold data-value mt-2">{value}</p>
        {hint ? <p className="text-[11px] opacity-50 mt-1">{hint}</p> : null}
    </div>
);

const SectionCard = ({ title, eyebrow, children }: SectionCardProps) => (
    <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-brand-line/10">
            <p className="text-[10px] uppercase tracking-widest opacity-35">{eyebrow}</p>
            <h3 className="font-serif text-base mt-1">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

export default function Dashboard({
    userRole,
    stats,
    hrStats,
    shifts,
    attendance,
    employees,
    compliance,
    operations,
    maintenance,
    companies,
    companyApplications,
    tradeOperations,
    revenue,
    assets,
    incidents,
    allUsers,
    onGoToHrAttendance,
    onGoToHrEmployees,
    onGoToCompliance,
}: DashboardProps) {
    const roles = userRole.split(',').map((role) => role.trim());
    const isAdmin = roles.includes('Admin');
    const isHrManager = roles.includes('HR Manager');
    const isCompliance = roles.includes('Compliance');
    const isOperations = roles.includes('Operations');
    const isFinance = roles.includes('Finance');

    if (isAdmin) {
        const paidRevenue = revenue.filter((entry) => entry.status === 'Paid');
        const revenueYtd = paidRevenue.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const openComplianceCases = compliance.filter((entry) => ACTIVE_COMPLIANCE_STATUSES.has(entry.status)).length;
        const openIncidents = incidents.filter((entry) => ACTIVE_INCIDENT_STATUSES.has(entry.status)).length;
        const assetsUnderMaintenance = assets.filter((entry) => ASSET_MAINTENANCE_STATUSES.has(entry.status)).length;
        const activeTradeRequests = tradeOperations.filter((entry) => ACTIVE_TRADE_REQUEST_STATUSES.has(entry.status)).length;

        const awaitingComplianceReview = companyApplications.filter((entry) => entry.status === 'Submitted').length;
        const awaitingMdApproval = companyApplications.filter((entry) => entry.status === 'Awaiting Admin Approval').length;
        const awaitingContractorPayment = companyApplications.filter((entry) => entry.status === 'Approved Pending Payment').length;
        const awaitingPaymentConfirmation = companyApplications.filter((entry) => entry.status === 'Payment Submitted').length;
        const licencesIssuedThisMonth = companies.filter((entry) => isCurrentMonth(entry.approved_date)).length;
        const queriedApplications = companyApplications.filter((entry) => entry.status === 'Returned').length;
        const rejectedApplications = companyApplications.filter((entry) => entry.status === 'Rejected').length;

        const slaWatchlist = tradeOperations.filter((entry) => {
            const elapsed = getTradeElapsedHours(entry);
            return (
                NON_TERMINAL_TRADE_REQUEST_STATUSES.has(entry.status) &&
                elapsed !== null &&
                elapsed > 36 &&
                elapsed <= 48
            );
        }).length;
        const overSlaRequests = tradeOperations.filter((entry) => {
            const elapsed = getTradeElapsedHours(entry);
            return (
                NON_TERMINAL_TRADE_REQUEST_STATUSES.has(entry.status) &&
                elapsed !== null &&
                elapsed > 48
            );
        }).length;
        const returnedTradeRequests = tradeOperations.filter((entry) => entry.status === 'Returned').length;
        const approvedTradeRequests = tradeOperations.filter((entry) => entry.status === 'Approved').length;

        const openDocumentUpdates = compliance.filter(
            (entry) => entry.case_type === 'DocumentUpdate' && ACTIVE_COMPLIANCE_STATUSES.has(entry.status)
        ).length;
        const openAuditFindings = compliance.filter(
            (entry) => entry.case_type === 'AuditFinding' && ACTIVE_COMPLIANCE_STATUSES.has(entry.status)
        ).length;
        const highSeverityFindings = compliance.filter(
            (entry) =>
                entry.case_type === 'AuditFinding' &&
                ACTIVE_COMPLIANCE_STATUSES.has(entry.status) &&
                HIGH_SEVERITY_LEVELS.has(entry.severity || '')
        ).length;
        const responsesAwaitingReview = compliance.filter((entry) => entry.status === 'Response Submitted').length;
        const overdueComplianceCases = compliance.filter(
            (entry) => ACTIVE_COMPLIANCE_STATUSES.has(entry.status) && isPastDue(entry.due_date)
        ).length;

        const highSeverityOpenIncidents = incidents.filter(
            (entry) => entry.status === 'Open' && HIGH_SEVERITY_LEVELS.has(entry.severity || '')
        ).length;
        const incidentsAwaitingContractorFollowUp = incidents.filter(
            (entry) => entry.status === 'Open' && !entry.follow_up_note
        ).length;
        const incidentsAwaitingComplianceDecision = incidents.filter(
            (entry) => entry.status === 'Open' && Boolean(entry.follow_up_note)
        ).length;
        const resolvedIncidentsThisMonth = incidents.filter(
            (entry) => entry.status === 'Resolved' && isCurrentMonth(entry.resolved_at)
        ).length;
        const closedIncidentsCount = incidents.filter((entry) => entry.status === 'Closed').length;

        const productionThisMonth = operations
            .filter((entry) => isCurrentMonth(entry.report_date))
            .reduce((sum, entry) => sum + Number(entry.production_volume || 0), 0);
        const downtimeThisMonth = operations
            .filter((entry) => isCurrentMonth(entry.report_date))
            .reduce((sum, entry) => sum + Number(entry.downtime_hours || 0), 0);
        const assetsWithOpenIncidents = assets.filter((entry) => Number(entry.open_incident_count || 0) > 0).length;
        const overdueMaintenance = assets.filter((entry) => isPastDue(entry.maintenance_date)).length;

        const confirmedLicencePayments = paidRevenue.length;
        const averageLicenceFee = confirmedLicencePayments > 0 ? revenueYtd / confirmedLicencePayments : 0;
        const activeUsers = allUsers.length;
        const pendingFirstLogin = allUsers.filter((entry) => Boolean(entry.mustChangePassword)).length;

        const tradeFamilyBreakdown = Object.entries(tradeOperationFamilyCatalog)
            .map(([familyKey, family]) => ({
                key: familyKey,
                label: family.label,
                total: tradeOperations.filter((entry) => entry.service_family === familyKey).length,
                active: tradeOperations.filter(
                    (entry) => entry.service_family === familyKey && ACTIVE_TRADE_REQUEST_STATUSES.has(entry.status)
                ).length,
            }))
            .filter((entry) => entry.total > 0)
            .sort((left, right) => right.total - left.total);

        const revenueByLicenseType = Array.from(
            companyApplications.reduce((accumulator, entry) => {
                const isIssued = Boolean(entry.linked_company_id) || entry.status === 'Licence Issued';
                const licenseType = entry.approved_license_type || entry.requested_license_type || 'Unspecified';
                const amount = Number(entry.approved_fee_usd || entry.estimated_fee_usd || 0);

                if (!isIssued || amount <= 0) return accumulator;

                accumulator.set(licenseType, (accumulator.get(licenseType) || 0) + amount);
                return accumulator;
            }, new Map<string, number>())
        ).sort((left, right) => right[1] - left[1]);

        const roleBreakdown = Array.from(
            allUsers.reduce((accumulator, entry) => {
                entry.role
                    .split(',')
                    .map((role) => role.trim())
                    .forEach((role) => {
                        accumulator.set(role, (accumulator.get(role) || 0) + 1);
                    });

                return accumulator;
            }, new Map<string, number>())
        ).sort((left, right) => right[1] - left[1]);

        const licensingWatchlist = [...companyApplications]
            .filter((entry) =>
                ['Submitted', 'Awaiting Admin Approval', 'Approved Pending Payment', 'Payment Submitted', 'Returned'].includes(
                    entry.status
                )
            )
            .sort((left, right) => {
                const leftDate = parseDate(
                    left.payment_submitted_at ||
                        left.returned_at ||
                        left.reviewed_at ||
                        left.resubmitted_at ||
                        left.submitted_at
                );
                const rightDate = parseDate(
                    right.payment_submitted_at ||
                        right.returned_at ||
                        right.reviewed_at ||
                        right.resubmitted_at ||
                        right.submitted_at
                );

                return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
            })
            .slice(0, 5);

        const tradeWatchlist = [...tradeOperations]
            .filter((entry) => ACTIVE_TRADE_REQUEST_STATUSES.has(entry.status))
            .sort((left, right) => (getTradeElapsedHours(right) || 0) - (getTradeElapsedHours(left) || 0))
            .slice(0, 5);

        const handlePrintExecutiveView = () => {
            printStructuredReport({
                documentTitle: 'OGFZA Executive Dashboard Report',
                kicker: 'OGFZA Executive Dashboard',
                title: 'Executive Control Tower Report',
                subtitle: 'Executive summary of licensing, revenue, trade operations, compliance, incidents, assets, and user oversight.',
                reference: `Generated ${formatDateLabel(new Date().toISOString())}`,
                badges: [
                    { label: `${companies.length} licensed companies`, tone: 'neutral' },
                    { label: `${openComplianceCases} open compliance cases`, tone: openComplianceCases > 0 ? 'warning' : 'success' },
                    { label: `${openIncidents} open incidents`, tone: openIncidents > 0 ? 'danger' : 'success' },
                ],
                sections: [
                    {
                        title: 'Executive KPIs',
                        kind: 'fields',
                        columns: 3,
                        fields: [
                            { label: 'Licensed Companies', value: companies.length },
                            { label: 'Revenue YTD', value: formatCurrency(revenueYtd) },
                            { label: 'Active Trade Requests', value: activeTradeRequests },
                            { label: 'Open Compliance Cases', value: openComplianceCases },
                            { label: 'Open Incidents', value: openIncidents },
                            { label: 'Assets Under Maintenance', value: assetsUnderMaintenance },
                        ],
                    },
                    {
                        title: 'Licensing Pipeline',
                        kind: 'fields',
                        columns: 3,
                        fields: [
                            { label: 'Awaiting Compliance', value: awaitingComplianceReview },
                            { label: 'Awaiting MD', value: awaitingMdApproval },
                            { label: 'Awaiting Contractor Payment', value: awaitingContractorPayment },
                            { label: 'Awaiting Payment Confirmation', value: awaitingPaymentConfirmation },
                            { label: 'Licences Issued This Month', value: licencesIssuedThisMonth },
                            { label: 'Queried Applications', value: queriedApplications },
                            { label: 'Rejected Applications', value: rejectedApplications },
                        ],
                    },
                    {
                        title: 'Trade, Compliance, and Safety Watch',
                        kind: 'fields',
                        columns: 3,
                        fields: [
                            { label: 'Returned Trade Requests', value: returnedTradeRequests },
                            { label: 'Approved Trade Requests', value: approvedTradeRequests },
                            { label: 'SLA Watchlist', value: slaWatchlist },
                            { label: 'Over SLA Requests', value: overSlaRequests },
                            { label: 'Open Document Updates', value: openDocumentUpdates },
                            { label: 'Open Audit Findings', value: openAuditFindings },
                            { label: 'High Severity Findings', value: highSeverityFindings },
                            { label: 'Responses Awaiting Review', value: responsesAwaitingReview },
                            { label: 'Overdue Compliance Cases', value: overdueComplianceCases },
                            { label: 'High Severity Open Incidents', value: highSeverityOpenIncidents },
                            { label: 'Awaiting Contractor Follow-up', value: incidentsAwaitingContractorFollowUp },
                            { label: 'Awaiting Compliance Decision', value: incidentsAwaitingComplianceDecision },
                            { label: 'Resolved Incidents This Month', value: resolvedIncidentsThisMonth },
                            { label: 'Closed Incidents', value: closedIncidentsCount },
                            { label: 'Production This Month', value: formatCompactNumber(productionThisMonth) },
                            { label: 'Downtime This Month', value: formatCompactNumber(downtimeThisMonth) },
                            { label: 'Assets With Open Incidents', value: assetsWithOpenIncidents },
                            { label: 'Overdue Maintenance', value: overdueMaintenance },
                        ],
                    },
                    {
                        title: 'Licensing Watchlist',
                        kind: 'table',
                        headers: ['Reference', 'Company', 'Status', 'Licence Type', 'Last Action'],
                        rows: licensingWatchlist.map((entry) => ([
                            entry.application_reference,
                            entry.company_name,
                            formatRequestStatus(entry.status),
                            entry.approved_license_type || entry.requested_license_type || '--',
                            formatDateLabel(
                                entry.payment_submitted_at ||
                                entry.returned_at ||
                                entry.reviewed_at ||
                                entry.resubmitted_at ||
                                entry.submitted_at
                            ),
                        ])),
                    },
                    {
                        title: 'Trade Request Watchlist',
                        kind: 'table',
                        headers: ['Reference', 'Company', 'Service', 'Status', 'Elapsed Hours'],
                        rows: tradeWatchlist.map((entry) => ([
                            entry.request_reference,
                            entry.company_name,
                            entry.service_type,
                            entry.status,
                            Math.round(getTradeElapsedHours(entry) || 0),
                        ])),
                    },
                    {
                        title: 'Trade Family Breakdown',
                        kind: 'table',
                        headers: ['Workflow Family', 'Total Requests', 'Active Requests'],
                        rows: tradeFamilyBreakdown.map((entry) => ([
                            entry.label,
                            entry.total,
                            entry.active,
                        ])),
                    },
                    {
                        title: 'Revenue by Licence Type',
                        kind: 'table',
                        headers: ['Licence Type', 'Revenue'],
                        rows: revenueByLicenseType.map(([licenseType, total]) => ([
                            licenseType,
                            formatCurrency(total),
                        ])),
                    },
                    {
                        title: 'User Role Breakdown',
                        kind: 'table',
                        headers: ['Role', 'Users'],
                        rows: roleBreakdown.map(([role, total]) => ([role, total])),
                    },
                ],
                footerNote: `Average licence fee: ${formatCurrency(averageLicenceFee)}. Active users: ${activeUsers}. Pending first login: ${pendingFirstLogin}.`,
            });
        };

        return (
            <div className="space-y-8">
                <div className="bg-brand-ink text-brand-bg p-6 rounded-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-serif text-lg">Executive Control Tower</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-60">
                            Live performance, risk, revenue, licensing, and workflow oversight
                        </p>
                    </div>
                    <button
                        onClick={handlePrintExecutiveView}
                        className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors w-fit"
                    >
                        Export Executive View
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                    <StatCard label="Licensed Companies" value={companies.length} icon={Building2} trend="Registry" />
                    <StatCard label="Revenue YTD" value={formatCurrency(revenueYtd)} icon={DollarSign} trend="Confirmed" />
                    <StatCard label="Active Trade Requests" value={activeTradeRequests} icon={ArrowLeftRight} trend="In Workflow" />
                    <StatCard label="Open Compliance Cases" value={openComplianceCases} icon={ShieldCheck} trend="Attention" />
                    <StatCard label="Open Incidents" value={openIncidents} icon={AlertTriangle} trend="Safety" />
                    <StatCard label="Assets Under Maintenance" value={assetsUnderMaintenance} icon={Wrench} trend="Ops" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <SectionCard title="Licensing Pipeline" eyebrow="Company Management">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <MiniMetric label="Awaiting Compliance" value={awaitingComplianceReview} />
                                <MiniMetric label="Awaiting MD" value={awaitingMdApproval} />
                                <MiniMetric label="Awaiting Contractor Payment" value={awaitingContractorPayment} />
                                <MiniMetric label="Awaiting Payment Confirmation" value={awaitingPaymentConfirmation} />
                                <MiniMetric label="Licences Issued This Month" value={licencesIssuedThisMonth} />
                                <MiniMetric label="Queried Applications" value={queriedApplications} />
                                <MiniMetric label="Rejected Applications" value={rejectedApplications} />
                                <MiniMetric
                                    label="Conversion Rate"
                                    value={
                                        companyApplications.length
                                            ? `${Math.round((companies.length / companyApplications.length) * 100)}%`
                                            : '0%'
                                    }
                                />
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-brand-ink/5">
                                            <th className="p-4 col-header">Company</th>
                                            <th className="p-4 col-header">Reference</th>
                                            <th className="p-4 col-header">Stage</th>
                                            <th className="p-4 col-header">Last Activity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {licensingWatchlist.map((entry) => (
                                            <tr key={entry.id} className="border-b border-brand-line/5">
                                                <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                                <td className="p-4 text-xs opacity-55 font-mono">{entry.application_reference}</td>
                                                <td className="p-4 text-xs">{formatRequestStatus(entry.status)}</td>
                                                <td className="p-4 text-xs opacity-55">
                                                    {formatDateLabel(
                                                        entry.payment_submitted_at ||
                                                            entry.returned_at ||
                                                            entry.reviewed_at ||
                                                            entry.resubmitted_at ||
                                                            entry.submitted_at
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {licensingWatchlist.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-6 text-center text-sm opacity-40">
                                                    No licensing items currently need executive attention.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>

                        <SectionCard title="Trade Operations & Logistics" eyebrow="Trade Operations">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <MiniMetric label="Returned Requests" value={returnedTradeRequests} />
                                <MiniMetric label="Approved Requests" value={approvedTradeRequests} />
                                <MiniMetric label="SLA Watchlist" value={slaWatchlist} />
                                <MiniMetric label="Over SLA" value={overSlaRequests} />
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-brand-ink/5">
                                            <th className="p-4 col-header">Reference</th>
                                            <th className="p-4 col-header">Company</th>
                                            <th className="p-4 col-header">Family</th>
                                            <th className="p-4 col-header">Elapsed</th>
                                            <th className="p-4 col-header">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tradeWatchlist.map((entry) => {
                                            const elapsedHours = getTradeElapsedHours(entry) || 0;
                                            const familyLabel =
                                                tradeOperationFamilyCatalog[entry.service_family as TradeOperationFamilyKey]?.label ||
                                                entry.service_family;

                                            return (
                                                <tr key={entry.id} className="border-b border-brand-line/5">
                                                    <td className="p-4 text-xs font-mono opacity-60">{entry.request_reference}</td>
                                                    <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                                    <td className="p-4 text-xs opacity-75">{familyLabel}</td>
                                                    <td className="p-4 text-xs data-value">
                                                        {elapsedHours < 1 ? '<1 hr' : `${elapsedHours.toFixed(1)} hrs`}
                                                    </td>
                                                    <td className="p-4 text-xs">{formatRequestStatus(entry.status)}</td>
                                                </tr>
                                            );
                                        })}
                                        {tradeWatchlist.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-6 text-center text-sm opacity-40">
                                                    No active trade requests are in the logistics queue.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                                {tradeFamilyBreakdown.map((entry) => (
                                    <div key={entry.key} className="border border-brand-line/10 rounded-sm p-4 bg-brand-ink/[0.02]">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-bold">{entry.label}</p>
                                            <p className="text-xs opacity-50">{entry.total} total</p>
                                        </div>
                                        <p className="text-[11px] opacity-55 mt-2">{entry.active} currently active</p>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Compliance, Safety & Asset Health" eyebrow="Risk & Operations">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <MiniMetric label="Open Document Updates" value={openDocumentUpdates} />
                                <MiniMetric label="Open Audit Findings" value={openAuditFindings} />
                                <MiniMetric label="High Severity Findings" value={highSeverityFindings} />
                                <MiniMetric label="Responses Awaiting Review" value={responsesAwaitingReview} />
                                <MiniMetric label="Overdue Compliance Cases" value={overdueComplianceCases} />
                                <MiniMetric label="High Severity Open Incidents" value={highSeverityOpenIncidents} />
                                <MiniMetric label="Awaiting Contractor Follow-Up" value={incidentsAwaitingContractorFollowUp} />
                                <MiniMetric label="Awaiting Compliance Decision" value={incidentsAwaitingComplianceDecision} />
                                <MiniMetric label="Resolved Incidents This Month" value={resolvedIncidentsThisMonth} />
                                <MiniMetric label="Closed Incidents" value={closedIncidentsCount} />
                                <MiniMetric label="Assets with Open Incidents" value={assetsWithOpenIncidents} />
                                <MiniMetric label="Overdue Maintenance" value={overdueMaintenance} />
                            </div>
                        </SectionCard>
                    </div>

                    <div className="space-y-8">
                        <SectionCard title="Revenue & Production Snapshot" eyebrow="Finance & Operations">
                            <div className="grid grid-cols-2 gap-4">
                                <MiniMetric label="Confirmed Licence Payments" value={confirmedLicencePayments} />
                                <MiniMetric label="Average Licence Fee" value={formatCurrency(averageLicenceFee)} />
                                <MiniMetric label="Production This Month" value={formatCompactNumber(productionThisMonth)} hint="BBL" />
                                <MiniMetric label="Downtime This Month" value={formatCompactNumber(downtimeThisMonth)} hint="Hours" />
                            </div>

                            <div className="mt-6 space-y-3">
                                <p className="text-[10px] uppercase tracking-widest opacity-35">Revenue by Licence Type</p>
                                {revenueByLicenseType.length > 0 ? (
                                    revenueByLicenseType.map(([label, amount]) => (
                                        <div key={label} className="flex items-center justify-between gap-3 py-2 border-b border-brand-line/10 last:border-0">
                                            <span className="text-xs font-bold">{label}</span>
                                            <span className="text-xs data-value">{formatCurrency(amount)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm opacity-40">No issued licence fee data is available yet.</p>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard title="Change Management Snapshot" eyebrow="Users & Access">
                            <div className="grid grid-cols-2 gap-4">
                                <MiniMetric label="Active Users" value={activeUsers} />
                                <MiniMetric label="First Login Pending" value={pendingFirstLogin} />
                            </div>

                            <div className="mt-6 space-y-3">
                                <p className="text-[10px] uppercase tracking-widest opacity-35">Users by Role</p>
                                {roleBreakdown.map(([label, count]) => (
                                    <div key={label} className="flex items-center justify-between gap-3 py-2 border-b border-brand-line/10 last:border-0">
                                        <span className="text-xs font-bold">{label}</span>
                                        <span className="text-xs data-value">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </div>
        );
    }

    if (isCompliance && !isHrManager) {
        const applicationsAwaitingReview = companyApplications.filter((entry) => entry.status === 'Submitted').length;
        const queriedApplications = companyApplications.filter((entry) => entry.status === 'Returned').length;
        const applicationsAwaitingMd = companyApplications.filter(
            (entry) => entry.status === 'Awaiting Admin Approval'
        ).length;
        const rejectedApplications = companyApplications.filter((entry) => entry.status === 'Rejected').length;

        const tradeRequestsAwaitingReview = tradeOperations.filter((entry) => entry.status === 'Submitted').length;
        const queriedTradeRequests = tradeOperations.filter((entry) => entry.status === 'Returned').length;
        const approvedTradeRequests = tradeOperations.filter((entry) => entry.status === 'Approved').length;
        const overSlaTradeRequests = tradeOperations.filter((entry) => {
            const elapsed = getTradeElapsedHours(entry);
            return (
                NON_TERMINAL_TRADE_REQUEST_STATUSES.has(entry.status) &&
                elapsed !== null &&
                elapsed > 48
            );
        }).length;

        const openComplianceCases = compliance.filter((entry) => ACTIVE_COMPLIANCE_STATUSES.has(entry.status)).length;
        const responsesAwaitingReview = compliance.filter((entry) => entry.status === 'Response Submitted').length;
        const returnedComplianceCases = compliance.filter((entry) => entry.status === 'Returned').length;
        const overdueComplianceCases = compliance.filter(
            (entry) => ACTIVE_COMPLIANCE_STATUSES.has(entry.status) && isPastDue(entry.due_date)
        ).length;
        const highSeverityFindings = compliance.filter(
            (entry) =>
                entry.case_type === 'AuditFinding' &&
                ACTIVE_COMPLIANCE_STATUSES.has(entry.status) &&
                HIGH_SEVERITY_LEVELS.has(entry.severity || '')
        ).length;
        const companiesUnderActiveOversight = new Set(
            compliance
                .filter((entry) => ACTIVE_COMPLIANCE_STATUSES.has(entry.status))
                .map((entry) => entry.company_id)
        ).size;

        const openIncidents = incidents.filter((entry) => entry.status === 'Open').length;
        const highSeverityOpenIncidents = incidents.filter(
            (entry) => entry.status === 'Open' && HIGH_SEVERITY_LEVELS.has(entry.severity || '')
        ).length;
        const incidentsAwaitingContractorFollowUp = incidents.filter(
            (entry) => entry.status === 'Open' && !entry.follow_up_note
        ).length;
        const incidentsAwaitingComplianceDecision = incidents.filter(
            (entry) => entry.status === 'Open' && Boolean(entry.follow_up_note)
        ).length;
        const resolvedIncidentsThisMonth = incidents.filter(
            (entry) => entry.status === 'Resolved' && isCurrentMonth(entry.resolved_at)
        ).length;

        const highSeverityRiskCount = highSeverityFindings + highSeverityOpenIncidents;

        const companyApplicationQueue = [...companyApplications]
            .filter((entry) =>
                ['Submitted', 'Returned', 'Awaiting Admin Approval'].includes(entry.status)
            )
            .sort((left, right) => {
                const leftDate = parseDate(
                    left.returned_at ||
                        left.reviewed_at ||
                        left.resubmitted_at ||
                        left.submitted_at
                );
                const rightDate = parseDate(
                    right.returned_at ||
                        right.reviewed_at ||
                        right.resubmitted_at ||
                        right.submitted_at
                );

                return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
            })
            .slice(0, 5);

        const tradeRequestQueue = [...tradeOperations]
            .filter((entry) => ACTIVE_TRADE_REQUEST_STATUSES.has(entry.status))
            .sort((left, right) => (getTradeElapsedHours(right) || 0) - (getTradeElapsedHours(left) || 0))
            .slice(0, 5);

        const complianceQueue = [...compliance]
            .filter((entry) => ACTIVE_COMPLIANCE_STATUSES.has(entry.status))
            .sort((left, right) => {
                const leftDate = parseDate(left.due_date || left.updated_at || left.requested_at);
                const rightDate = parseDate(right.due_date || right.updated_at || right.requested_at);
                return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
            })
            .slice(0, 5);

        const incidentQueue = [...incidents]
            .filter((entry) => entry.status === 'Open')
            .sort((left, right) => {
                const severityOrder: Record<string, number> = {
                    Critical: 0,
                    High: 1,
                    Medium: 2,
                    Low: 3,
                };

                const severityDifference =
                    (severityOrder[left.severity] ?? 99) - (severityOrder[right.severity] ?? 99);

                if (severityDifference !== 0) return severityDifference;

                const leftDate = parseDate(left.reported_date);
                const rightDate = parseDate(right.reported_date);
                return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
            })
            .slice(0, 5);

        return (
            <div className="space-y-8">
                <div className="bg-brand-ink text-brand-bg p-6 rounded-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-serif text-lg">Compliance Command Center</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-60">
                            Licensing reviews, trade approvals, post-licensing oversight, and incident follow-up
                        </p>
                    </div>
                    <button
                        onClick={onGoToCompliance}
                        className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors w-fit"
                    >
                        Open Compliance Module
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                    <StatCard
                        label="Applications Awaiting Review"
                        value={applicationsAwaitingReview}
                        icon={Building2}
                        trend="Company"
                    />
                    <StatCard
                        label="Trade Requests Awaiting Review"
                        value={tradeRequestsAwaitingReview}
                        icon={ArrowLeftRight}
                        trend="Trade Ops"
                    />
                    <StatCard
                        label="Open Compliance Cases"
                        value={openComplianceCases}
                        icon={ShieldCheck}
                        trend="Oversight"
                    />
                    <StatCard
                        label="Responses Awaiting Review"
                        value={responsesAwaitingReview}
                        icon={FileText}
                        trend="Contractor"
                    />
                    <StatCard
                        label="Open Incidents"
                        value={openIncidents}
                        icon={AlertTriangle}
                        trend="Safety"
                    />
                    <StatCard
                        label="High Severity Risks"
                        value={highSeverityRiskCount}
                        icon={AlertTriangle}
                        trend="Priority"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <SectionCard title="Licensing Review Queue" eyebrow="Company Applications">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Awaiting Review" value={applicationsAwaitingReview} />
                            <MiniMetric label="Queried" value={queriedApplications} />
                            <MiniMetric label="Awaiting MD" value={applicationsAwaitingMd} />
                            <MiniMetric label="Rejected" value={rejectedApplications} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Reference</th>
                                        <th className="p-4 col-header">Status</th>
                                        <th className="p-4 col-header">Requested Licence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companyApplicationQueue.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                            <td className="p-4 text-xs font-mono opacity-55">{entry.application_reference}</td>
                                            <td className="p-4 text-xs">{formatRequestStatus(entry.status)}</td>
                                            <td className="p-4 text-xs opacity-75">
                                                {entry.requested_license_type || entry.approved_license_type || '--'}
                                            </td>
                                        </tr>
                                    ))}
                                    {companyApplicationQueue.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-sm opacity-40">
                                                No company applications are currently in the compliance queue.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard title="Trade Operations Review Queue" eyebrow="Trade Operations">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Awaiting Review" value={tradeRequestsAwaitingReview} />
                            <MiniMetric label="Queried" value={queriedTradeRequests} />
                            <MiniMetric label="Approved" value={approvedTradeRequests} />
                            <MiniMetric label="Over SLA" value={overSlaTradeRequests} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Reference</th>
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Family</th>
                                        <th className="p-4 col-header">Elapsed</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tradeRequestQueue.map((entry) => {
                                        const familyLabel =
                                            tradeOperationFamilyCatalog[entry.service_family as TradeOperationFamilyKey]?.label ||
                                            entry.service_family;
                                        const elapsedHours = getTradeElapsedHours(entry) || 0;

                                        return (
                                            <tr key={entry.id} className="border-b border-brand-line/5">
                                                <td className="p-4 text-xs font-mono opacity-55">{entry.request_reference}</td>
                                                <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                                <td className="p-4 text-xs opacity-75">{familyLabel}</td>
                                                <td className="p-4 text-xs data-value">
                                                    {elapsedHours < 1 ? '<1 hr' : `${elapsedHours.toFixed(1)} hrs`}
                                                </td>
                                                <td className="p-4 text-xs">{formatRequestStatus(entry.status)}</td>
                                            </tr>
                                        );
                                    })}
                                    {tradeRequestQueue.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-sm opacity-40">
                                                No trade operation requests are currently awaiting compliance action.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard title="Compliance Case Monitor" eyebrow="Post-Licensing Oversight">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Open Cases" value={openComplianceCases} />
                            <MiniMetric label="Responses Submitted" value={responsesAwaitingReview} />
                            <MiniMetric label="Returned Cases" value={returnedComplianceCases} />
                            <MiniMetric label="Overdue Cases" value={overdueComplianceCases} />
                            <MiniMetric label="High Severity Findings" value={highSeverityFindings} />
                            <MiniMetric label="Companies Under Oversight" value={companiesUnderActiveOversight} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Case Type</th>
                                        <th className="p-4 col-header">Due Date</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {complianceQueue.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                            <td className="p-4 text-xs opacity-75">
                                                {entry.case_type === 'DocumentUpdate' ? 'Document Update' : 'Audit Finding'}
                                            </td>
                                            <td className="p-4 text-xs opacity-55">{formatDateLabel(entry.due_date)}</td>
                                            <td className="p-4 text-xs">{entry.status}</td>
                                        </tr>
                                    ))}
                                    {complianceQueue.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-sm opacity-40">
                                                No active compliance cases are currently open.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard title="Incident Follow-Up Queue" eyebrow="Safety & Incident Logs">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Open Incidents" value={openIncidents} />
                            <MiniMetric label="High Severity Open" value={highSeverityOpenIncidents} />
                            <MiniMetric label="Awaiting Contractor Follow-Up" value={incidentsAwaitingContractorFollowUp} />
                            <MiniMetric label="Awaiting Compliance Decision" value={incidentsAwaitingComplianceDecision} />
                            <MiniMetric label="Resolved This Month" value={resolvedIncidentsThisMonth} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Severity</th>
                                        <th className="p-4 col-header">Follow-Up State</th>
                                        <th className="p-4 col-header">Reported</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incidentQueue.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                            <td className="p-4 text-xs opacity-75">{entry.severity}</td>
                                            <td className="p-4 text-xs">
                                                {entry.follow_up_note
                                                    ? 'Awaiting Compliance Decision'
                                                    : 'Awaiting Contractor Follow-Up'}
                                            </td>
                                            <td className="p-4 text-xs opacity-55">{formatDateLabel(entry.reported_date)}</td>
                                        </tr>
                                    ))}
                                    {incidentQueue.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-sm opacity-40">
                                                No open incidents currently require compliance action.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </div>
            </div>
        );
    }

    if (isOperations && !isHrManager) {
        const totalAssets = assets.length;
        const operationalAssets = assets.filter((entry) => entry.status === 'Operational').length;
        const assetsUnderMaintenance = assets.filter(
            (entry) => entry.status === 'Under Maintenance' || entry.status === 'Maintenance Needed'
        ).length;
        const linkedOpenIncidents = incidents.filter(
            (entry) => entry.status === 'Open' && Boolean(entry.asset_id)
        ).length;
        const productionThisMonth = operations
            .filter((entry) => isCurrentMonth(entry.report_date))
            .reduce((sum, entry) => sum + Number(entry.production_volume || 0), 0);
        const downtimeThisMonth = operations
            .filter((entry) => isCurrentMonth(entry.report_date))
            .reduce((sum, entry) => sum + Number(entry.downtime_hours || 0), 0);

        const scheduledMaintenance = maintenance.filter((entry) => entry.status === 'Scheduled').length;
        const inProgressMaintenance = maintenance.filter((entry) => entry.status === 'In Progress').length;
        const completedMaintenanceThisMonth = maintenance.filter(
            (entry) => entry.status === 'Completed' && isCurrentMonth(entry.maintenance_date)
        ).length;
        const overdueMaintenance = maintenance.filter(
            (entry) => entry.status !== 'Completed' && isPastDue(entry.next_due_date)
        ).length;
        const maintenanceDueSoon = maintenance.filter((entry) => {
            if (entry.status === 'Completed') return false;
            const dueDate = parseDate(entry.next_due_date);
            if (!dueDate) return false;
            const now = new Date();
            const diffMs = dueDate.getTime() - now.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 7;
        }).length;

        const activeLogisticsQueue = tradeOperations.filter((entry) =>
            ACTIVE_TRADE_REQUEST_STATUSES.has(entry.status)
        ).length;
        const approvedTradeRequests = tradeOperations.filter((entry) => entry.status === 'Approved').length;
        const returnedTradeRequests = tradeOperations.filter((entry) => entry.status === 'Returned').length;
        const overSlaTradeRequests = tradeOperations.filter((entry) => {
            const elapsed = getTradeElapsedHours(entry);
            return (
                NON_TERMINAL_TRADE_REQUEST_STATUSES.has(entry.status) &&
                elapsed !== null &&
                elapsed > 48
            );
        }).length;

        const topDowntimeAssets = [...assets]
            .map((asset) => {
                const assetOperations = operations.filter((entry) => entry.asset_id === asset.id);
                const totalDowntime = assetOperations.reduce(
                    (sum, entry) => sum + Number(entry.downtime_hours || 0),
                    0
                );
                const lastProductionDate = assetOperations
                    .map((entry) => parseDate(entry.report_date))
                    .filter((entry): entry is Date => Boolean(entry))
                    .sort((left, right) => right.getTime() - left.getTime())[0];

                return {
                    ...asset,
                    totalDowntime,
                    lastProductionDate,
                };
            })
            .sort((left, right) => right.totalDowntime - left.totalDowntime)
            .slice(0, 5);

        const maintenanceQueue = [...maintenance]
            .filter((entry) => entry.status !== 'Completed')
            .sort((left, right) => {
                const leftDate = parseDate(left.next_due_date || left.maintenance_date);
                const rightDate = parseDate(right.next_due_date || right.maintenance_date);
                return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
            })
            .slice(0, 5);

        const operationsFeed = [...operations]
            .sort((left, right) => {
                const leftDate = parseDate(left.report_date);
                const rightDate = parseDate(right.report_date);
                return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
            })
            .slice(0, 5);

        const logisticsFeed = [...tradeOperations]
            .filter((entry) => ACTIVE_TRADE_REQUEST_STATUSES.has(entry.status) || entry.status === 'Approved')
            .sort((left, right) => {
                const leftDate = parseDate(left.approved_at || left.resubmitted_at || left.submitted_at);
                const rightDate = parseDate(right.approved_at || right.resubmitted_at || right.submitted_at);
                return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
            })
            .slice(0, 5);

        const handlePrintOperationsView = () => {
            printStructuredReport({
                documentTitle: 'OGFZA Operations Dashboard Report',
                kicker: 'OGFZA Operations Dashboard',
                title: 'Operations Control Center Report',
                subtitle: 'Operations summary of asset health, production, maintenance, and logistics monitoring.',
                reference: `Generated ${formatDateLabel(new Date().toISOString())}`,
                badges: [
                    { label: `${totalAssets} assets`, tone: 'neutral' },
                    { label: `${assetsUnderMaintenance} under maintenance`, tone: assetsUnderMaintenance > 0 ? 'warning' : 'success' },
                    { label: `${activeLogisticsQueue} active logistics requests`, tone: activeLogisticsQueue > 0 ? 'warning' : 'neutral' },
                ],
                sections: [
                    {
                        title: 'Operations KPIs',
                        kind: 'fields',
                        columns: 3,
                        fields: [
                            { label: 'Total Assets', value: totalAssets },
                            { label: 'Operational Assets', value: operationalAssets },
                            { label: 'Assets Under Maintenance', value: assetsUnderMaintenance },
                            { label: 'Open Asset Incidents', value: linkedOpenIncidents },
                            { label: 'Production This Month', value: formatCompactNumber(productionThisMonth) },
                            { label: 'Downtime This Month', value: formatCompactNumber(downtimeThisMonth) },
                            { label: 'Scheduled Maintenance', value: scheduledMaintenance },
                            { label: 'Maintenance In Progress', value: inProgressMaintenance },
                            { label: 'Completed This Month', value: completedMaintenanceThisMonth },
                            { label: 'Overdue Maintenance', value: overdueMaintenance },
                            { label: 'Maintenance Due Soon', value: maintenanceDueSoon },
                            { label: 'Approved Trade Requests', value: approvedTradeRequests },
                            { label: 'Returned Trade Requests', value: returnedTradeRequests },
                            { label: 'Over SLA Requests', value: overSlaTradeRequests },
                        ],
                    },
                    {
                        title: 'Top Downtime Assets',
                        kind: 'table',
                        headers: ['Asset', 'Company', 'Status', 'Downtime Hours', 'Last Production'],
                        rows: topDowntimeAssets.map((entry) => ([
                            entry.asset_name,
                            entry.company_name || '--',
                            entry.status,
                            entry.totalDowntime,
                            formatDateLabel(entry.lastProductionDate?.toISOString()),
                        ])),
                    },
                    {
                        title: 'Maintenance Queue',
                        kind: 'table',
                        headers: ['Asset', 'Type', 'Technician', 'Status', 'Next Due'],
                        rows: maintenanceQueue.map((entry) => ([
                            entry.asset_name,
                            entry.maintenance_type,
                            entry.technician,
                            entry.status,
                            formatDateLabel(entry.next_due_date),
                        ])),
                    },
                    {
                        title: 'Production Feed',
                        kind: 'table',
                        headers: ['Asset', 'Company', 'Production Volume', 'Downtime Hours', 'Report Date'],
                        rows: operationsFeed.map((entry) => ([
                            entry.asset_name || entry.field_name,
                            entry.company_name || '--',
                            entry.production_volume,
                            entry.downtime_hours,
                            formatDateLabel(entry.report_date),
                        ])),
                    },
                    {
                        title: 'Logistics Monitor',
                        kind: 'table',
                        headers: ['Reference', 'Company', 'Service', 'Status', 'Submitted'],
                        rows: logisticsFeed.map((entry) => ([
                            entry.request_reference,
                            entry.company_name,
                            entry.service_type,
                            entry.status,
                            formatDateLabel(entry.submitted_at),
                        ])),
                    },
                ],
                footerNote: 'Generated from the Operations dashboard in the OGFZA Digital Automation prototype.',
            });
        };

        return (
            <div className="space-y-8">
                <div className="bg-brand-ink text-brand-bg p-6 rounded-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-serif text-lg">Operations Control Center</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-60">
                            Asset health, maintenance workload, production performance, and logistics monitoring
                        </p>
                    </div>
                    <button
                        onClick={handlePrintOperationsView}
                        className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors w-fit"
                    >
                        Export Operations View
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                    <StatCard label="Total Assets" value={totalAssets} icon={Building2} trend="Registry" />
                    <StatCard label="Operational Assets" value={operationalAssets} icon={Activity} trend="Running" />
                    <StatCard label="Assets Under Maintenance" value={assetsUnderMaintenance} icon={Wrench} trend="Attention" />
                    <StatCard label="Open Asset Incidents" value={linkedOpenIncidents} icon={AlertTriangle} trend="Safety" />
                    <StatCard label="Production This Month" value={formatCompactNumber(productionThisMonth)} icon={Activity} trend="BBL" />
                    <StatCard label="Active Logistics Queue" value={activeLogisticsQueue} icon={ArrowLeftRight} trend="Tracking" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <SectionCard title="Asset Performance Snapshot" eyebrow="Field Assets">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Operational Assets" value={operationalAssets} />
                            <MiniMetric label="Under Maintenance" value={assetsUnderMaintenance} />
                            <MiniMetric label="Production This Month" value={formatCompactNumber(productionThisMonth)} hint="BBL" />
                            <MiniMetric label="Downtime This Month" value={formatCompactNumber(downtimeThisMonth)} hint="Hours" />
                            <MiniMetric label="Open Asset Incidents" value={linkedOpenIncidents} />
                            <MiniMetric label="Overdue Maintenance" value={overdueMaintenance} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Asset</th>
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Downtime</th>
                                        <th className="p-4 col-header">Status</th>
                                        <th className="p-4 col-header">Last Production</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topDowntimeAssets.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.asset_name}</td>
                                            <td className="p-4 text-xs opacity-75">{entry.company_name || '--'}</td>
                                            <td className="p-4 text-xs data-value">{entry.totalDowntime.toFixed(1)} hrs</td>
                                            <td className="p-4 text-xs">{entry.status}</td>
                                            <td className="p-4 text-xs opacity-55">
                                                {entry.lastProductionDate
                                                    ? formatDateLabel(entry.lastProductionDate.toISOString())
                                                    : '--'}
                                            </td>
                                        </tr>
                                    ))}
                                    {topDowntimeAssets.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-sm opacity-40">
                                                No asset performance records are available yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard title="Maintenance Workload" eyebrow="Maintenance Queue">
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <MiniMetric label="Scheduled" value={scheduledMaintenance} />
                            <MiniMetric label="In Progress" value={inProgressMaintenance} />
                            <MiniMetric label="Completed This Month" value={completedMaintenanceThisMonth} />
                            <MiniMetric label="Due in 7 Days" value={maintenanceDueSoon} />
                            <MiniMetric label="Overdue" value={overdueMaintenance} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Asset</th>
                                        <th className="p-4 col-header">Maintenance Type</th>
                                        <th className="p-4 col-header">Technician</th>
                                        <th className="p-4 col-header">Next Due</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maintenanceQueue.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.asset_name}</td>
                                            <td className="p-4 text-xs opacity-75">{entry.maintenance_type}</td>
                                            <td className="p-4 text-xs opacity-75">{entry.technician}</td>
                                            <td className="p-4 text-xs opacity-55">{formatDateLabel(entry.next_due_date)}</td>
                                            <td className="p-4 text-xs">{entry.status}</td>
                                        </tr>
                                    ))}
                                    {maintenanceQueue.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-sm opacity-40">
                                                No maintenance work orders are currently pending.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard title="Production Feed" eyebrow="Operations Logs">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Monthly Production" value={formatCompactNumber(productionThisMonth)} hint="BBL" />
                            <MiniMetric label="Monthly Downtime" value={formatCompactNumber(downtimeThisMonth)} hint="Hours" />
                            <MiniMetric label="Assets Reporting" value={new Set(operations.map((entry) => entry.asset_id).filter(Boolean)).size} />
                            <MiniMetric label="Operation Logs" value={operations.length} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Asset</th>
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Production</th>
                                        <th className="p-4 col-header">Downtime</th>
                                        <th className="p-4 col-header">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {operationsFeed.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.asset_name || entry.field_name}</td>
                                            <td className="p-4 text-xs opacity-75">{entry.company_name || '--'}</td>
                                            <td className="p-4 text-xs data-value">{Number(entry.production_volume || 0).toLocaleString()}</td>
                                            <td className="p-4 text-xs data-value">{Number(entry.downtime_hours || 0).toFixed(1)}h</td>
                                            <td className="p-4 text-xs opacity-55">{formatDateLabel(entry.report_date)}</td>
                                        </tr>
                                    ))}
                                    {operationsFeed.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-sm opacity-40">
                                                No production logs are available yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard title="Integrated Logistics Monitor" eyebrow="Trade Operations">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Active Queue" value={activeLogisticsQueue} />
                            <MiniMetric label="Approved Requests" value={approvedTradeRequests} />
                            <MiniMetric label="Returned Requests" value={returnedTradeRequests} />
                            <MiniMetric label="Over SLA" value={overSlaTradeRequests} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Reference</th>
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Family</th>
                                        <th className="p-4 col-header">Status</th>
                                        <th className="p-4 col-header">Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logisticsFeed.map((entry) => {
                                        const familyLabel =
                                            tradeOperationFamilyCatalog[entry.service_family as TradeOperationFamilyKey]?.label ||
                                            entry.service_family;

                                        return (
                                            <tr key={entry.id} className="border-b border-brand-line/5">
                                                <td className="p-4 text-xs font-mono opacity-55">{entry.request_reference}</td>
                                                <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                                <td className="p-4 text-xs opacity-75">{familyLabel}</td>
                                                <td className="p-4 text-xs">{formatRequestStatus(entry.status)}</td>
                                                <td className="p-4 text-xs opacity-55">{formatDateLabel(entry.submitted_at)}</td>
                                            </tr>
                                        );
                                    })}
                                    {logisticsFeed.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-sm opacity-40">
                                                No logistics activity is currently available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </div>
            </div>
        );
    }

    if (isFinance && !isHrManager) {
        const paidRevenue = revenue.filter((entry) => entry.status === 'Paid');
        const revenueYtd = paidRevenue.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const confirmedLicencePayments = paidRevenue.length;
        const approvedPendingPayment = companyApplications.filter(
            (entry) => entry.status === 'Approved Pending Payment'
        );
        const paymentSubmitted = companyApplications.filter(
            (entry) => entry.status === 'Payment Submitted'
        );
        const licenceIssuedThisMonth = companies.filter((entry) => isCurrentMonth(entry.approved_date)).length;
        const thisMonthRevenue = paidRevenue
            .filter((entry) => isCurrentMonth(entry.payment_date))
            .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const averageLicenceFee = confirmedLicencePayments > 0 ? revenueYtd / confirmedLicencePayments : 0;
        const outstandingPaymentExposure = [...approvedPendingPayment, ...paymentSubmitted].reduce(
            (sum, entry) => sum + Number(entry.approved_fee_usd || entry.estimated_fee_usd || 0),
            0
        );

        const paymentQueue = [...companyApplications]
            .filter((entry) =>
                ['Approved Pending Payment', 'Payment Submitted', 'Licence Issued'].includes(entry.status)
            )
            .sort((left, right) => {
                const leftDate = parseDate(
                    left.payment_confirmed_at ||
                        left.payment_submitted_at ||
                        left.approved_at ||
                        left.submitted_at
                );
                const rightDate = parseDate(
                    right.payment_confirmed_at ||
                        right.payment_submitted_at ||
                        right.approved_at ||
                        right.submitted_at
                );
                return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
            })
            .slice(0, 6);

        const recentCollections = [...paidRevenue]
            .sort((left, right) => {
                const leftDate = parseDate(left.payment_date);
                const rightDate = parseDate(right.payment_date);
                return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
            })
            .slice(0, 6);

        const revenueByLicenseType = Array.from(
            companyApplications.reduce((accumulator, entry) => {
                const isIssued = Boolean(entry.linked_company_id) || entry.status === 'Licence Issued';
                const licenseType = entry.approved_license_type || entry.requested_license_type || 'Unspecified';
                const amount = Number(entry.approved_fee_usd || entry.estimated_fee_usd || 0);

                if (!isIssued || amount <= 0) return accumulator;

                accumulator.set(licenseType, (accumulator.get(licenseType) || 0) + amount);
                return accumulator;
            }, new Map<string, number>())
        ).sort((left, right) => right[1] - left[1]);

        const handlePrintFinanceView = () => {
            printStructuredReport({
                documentTitle: 'OGFZA Finance Dashboard Report',
                kicker: 'OGFZA Finance Dashboard',
                title: 'Finance Revenue Desk Report',
                subtitle: 'Finance summary of the licence payment pipeline, confirmed collections, and revenue mix.',
                reference: `Generated ${formatDateLabel(new Date().toISOString())}`,
                badges: [
                    { label: `${confirmedLicencePayments} confirmed payments`, tone: 'success' },
                    { label: `${paymentSubmitted.length} awaiting confirmation`, tone: paymentSubmitted.length > 0 ? 'warning' : 'neutral' },
                ],
                sections: [
                    {
                        title: 'Finance KPIs',
                        kind: 'fields',
                        columns: 3,
                        fields: [
                            { label: 'Revenue YTD', value: formatCurrency(revenueYtd) },
                            { label: 'Confirmed Payments', value: confirmedLicencePayments },
                            { label: 'Awaiting Contractor Payment', value: approvedPendingPayment.length },
                            { label: 'Awaiting Confirmation', value: paymentSubmitted.length },
                            { label: 'This Month Revenue', value: formatCurrency(thisMonthRevenue) },
                            { label: 'Licences Issued This Month', value: licenceIssuedThisMonth },
                            { label: 'Outstanding Exposure', value: formatCurrency(outstandingPaymentExposure) },
                            { label: 'Average Licence Fee', value: formatCurrency(averageLicenceFee) },
                        ],
                    },
                    {
                        title: 'Payment Queue',
                        kind: 'table',
                        headers: ['Reference', 'Company', 'Status', 'Licence Type', 'Amount'],
                        rows: paymentQueue.map((entry) => ([
                            entry.application_reference,
                            entry.company_name,
                            formatRequestStatus(entry.status),
                            entry.approved_license_type || entry.requested_license_type || '--',
                            formatCurrency(Number(entry.approved_fee_usd || entry.estimated_fee_usd || 0)),
                        ])),
                    },
                    {
                        title: 'Recent Collections',
                        kind: 'table',
                        headers: ['Company', 'Description', 'Amount', 'Payment Date', 'Status'],
                        rows: recentCollections.map((entry) => ([
                            entry.company_name,
                            entry.description,
                            formatCurrency(Number(entry.amount || 0)),
                            formatDateLabel(entry.payment_date),
                            entry.status,
                        ])),
                    },
                    {
                        title: 'Revenue by Licence Type',
                        kind: 'table',
                        headers: ['Licence Type', 'Revenue'],
                        rows: revenueByLicenseType.map(([licenseType, total]) => ([
                            licenseType,
                            formatCurrency(total),
                        ])),
                    },
                ],
                footerNote: 'Generated from the Finance dashboard in the OGFZA Digital Automation prototype.',
            });
        };

        return (
            <div className="space-y-8">
                <div className="bg-brand-ink text-brand-bg p-6 rounded-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-serif text-lg">Finance Revenue Desk</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-60">
                            Licence payment pipeline, confirmed revenue, and collection monitoring
                        </p>
                    </div>
                    <button
                        onClick={handlePrintFinanceView}
                        className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors w-fit"
                    >
                        Export Finance View
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                    <StatCard label="Revenue YTD" value={formatCurrency(revenueYtd)} icon={DollarSign} trend="Collected" />
                    <StatCard label="Confirmed Payments" value={confirmedLicencePayments} icon={DollarSign} trend="Paid" />
                    <StatCard label="Awaiting Contractor Payment" value={approvedPendingPayment.length} icon={Clock} trend="Pipeline" />
                    <StatCard label="Awaiting Confirmation" value={paymentSubmitted.length} icon={FileText} trend="Review" />
                    <StatCard label="This Month's Revenue" value={formatCurrency(thisMonthRevenue)} icon={DollarSign} trend="Monthly" />
                    <StatCard label="Licence Issued This Month" value={licenceIssuedThisMonth} icon={Building2} trend="Issued" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <SectionCard title="Payment Pipeline" eyebrow="Company Applications">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Awaiting Contractor Payment" value={approvedPendingPayment.length} />
                            <MiniMetric label="Payment Submitted" value={paymentSubmitted.length} />
                            <MiniMetric label="Outstanding Exposure" value={formatCurrency(outstandingPaymentExposure)} />
                            <MiniMetric label="Average Licence Fee" value={formatCurrency(averageLicenceFee)} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Licence Type</th>
                                        <th className="p-4 col-header">Fee</th>
                                        <th className="p-4 col-header">Stage</th>
                                        <th className="p-4 col-header">Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentQueue.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                            <td className="p-4 text-xs opacity-75">
                                                {entry.approved_license_type || entry.requested_license_type || '--'}
                                            </td>
                                            <td className="p-4 text-xs data-value">
                                                {formatCurrency(Number(entry.approved_fee_usd || entry.estimated_fee_usd || 0))}
                                            </td>
                                            <td className="p-4 text-xs">{formatRequestStatus(entry.status)}</td>
                                            <td className="p-4 text-xs font-mono opacity-55">
                                                {entry.payment_reference || '--'}
                                            </td>
                                        </tr>
                                    ))}
                                    {paymentQueue.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-sm opacity-40">
                                                No licence payment records are currently in the finance queue.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>

                    <SectionCard title="Revenue Ledger Snapshot" eyebrow="Confirmed Collections">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniMetric label="Confirmed Licence Payments" value={confirmedLicencePayments} />
                            <MiniMetric label="This Month's Revenue" value={formatCurrency(thisMonthRevenue)} />
                            <MiniMetric
                                label="Highest Single Receipt"
                                value={formatCurrency(
                                    recentCollections.length > 0
                                        ? Math.max(...recentCollections.map((entry) => Number(entry.amount || 0)))
                                        : 0
                                )}
                            />
                            <MiniMetric label="Revenue YTD" value={formatCurrency(revenueYtd)} />
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Description</th>
                                        <th className="p-4 col-header">Amount</th>
                                        <th className="p-4 col-header">Payment Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCollections.map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">{entry.company_name}</td>
                                            <td className="p-4 text-xs opacity-75">{entry.description}</td>
                                            <td className="p-4 text-xs data-value">{formatCurrency(Number(entry.amount || 0))}</td>
                                            <td className="p-4 text-xs opacity-55">{formatDateLabel(entry.payment_date)}</td>
                                        </tr>
                                    ))}
                                    {recentCollections.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-sm opacity-40">
                                                No confirmed revenue records are available yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 space-y-3">
                            <p className="text-[10px] uppercase tracking-widest opacity-35">Revenue by Licence Type</p>
                            {revenueByLicenseType.length > 0 ? (
                                revenueByLicenseType.map(([label, amount]) => (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between gap-3 py-2 border-b border-brand-line/10 last:border-0"
                                    >
                                        <span className="text-xs font-bold">{label}</span>
                                        <span className="text-xs data-value">{formatCurrency(amount)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm opacity-40">No licence-type revenue breakdown is available yet.</p>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {isHrManager && (
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
                                <h3 className="font-serif text-sm">Recent Attendance</h3>
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
                                    {attendance.slice(0, 5).map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-xs font-mono">{entry.date}</td>
                                            <td className="p-4 text-sm font-bold">{entry.full_name}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${
                                                        entry.status === 'Present'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-red-50 text-red-700'
                                                    }`}
                                                >
                                                    {entry.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                            <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                                <h3 className="font-serif text-sm">Workforce Deployment</h3>
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
                                    {['Zone A', 'Zone B', 'Zone C', 'HQ'].map((zone) => (
                                        <div key={zone} className="flex-1 bg-white p-2 border border-brand-line/10 shadow-sm">
                                            <div className="text-[9px] opacity-50 mb-1">{zone}</div>
                                            <div className="text-lg font-bold">
                                                {employees.filter((entry) => entry.zone === zone && entry.status === 'Active').length}
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
                                    {employees.slice(0, 5).map((entry) => (
                                        <tr key={entry.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-xs font-bold">{entry.full_name}</td>
                                            <td className="p-4 text-xs font-mono opacity-60">{entry.zone}</td>
                                            <td className="p-4 text-xs">{entry.company}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isCompliance && (
                    <StatCard
                        label="Total Companies"
                        value={stats?.totalCompanies?.count || 0}
                        icon={Building2}
                        trend="Registered"
                    />
                )}
                {isCompliance && (
                    <StatCard
                        label="Compliance Cases"
                        value={compliance.length}
                        icon={ShieldCheck}
                        trend="All Time"
                    />
                )}
                {isOperations && (
                    <StatCard
                        label="Daily Production (BBL)"
                        value={stats?.totalProduction?.total?.toLocaleString() || 0}
                        icon={Activity}
                        trend="Live"
                    />
                )}
                {isFinance && (
                    <StatCard
                        label="Total Revenue (USD)"
                        value={`$${(stats?.totalRevenue?.total || 0).toLocaleString()}`}
                        icon={DollarSign}
                        trend="Confirmed"
                    />
                )}
            </div>

            {isCompliance ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Open HSE Incidents"
                        value={stats?.totalIncidents?.count || 0}
                        icon={AlertTriangle}
                        trend={stats?.totalIncidents?.count ? 'Action Required' : 'Stable'}
                    />
                    <StatCard
                        label="Resolved Cases"
                        value={compliance.filter((entry) => entry.status === 'Resolved').length}
                        icon={ShieldCheck}
                        trend="Verified"
                    />
                    <StatCard
                        label="Pending Cases"
                        value={compliance.filter((entry) => ACTIVE_COMPLIANCE_STATUSES.has(entry.status)).length}
                        icon={FileText}
                        trend="Action Req"
                    />
                    <StatCard
                        label="High Severity Findings"
                        value={
                            compliance.filter(
                                (entry) =>
                                    entry.case_type === 'AuditFinding' &&
                                    HIGH_SEVERITY_LEVELS.has(entry.severity || '')
                            ).length
                        }
                        icon={AlertTriangle}
                        trend="Priority"
                    />
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {isOperations && (
                    <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                        <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                            <h3 className="font-serif text-sm">Recent Operations</h3>
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
                                    {operations.slice(0, 5).map((entry) => (
                                        <tr key={entry.id} className="data-row">
                                            <td className="p-4 text-sm font-medium">{entry.field_name}</td>
                                            <td className="p-4 data-value text-sm">
                                                {entry.production_volume.toLocaleString()}
                                            </td>
                                            <td className="p-4 data-value text-sm">{entry.downtime_hours}h</td>
                                            <td className="p-4 data-value text-xs opacity-60">{entry.report_date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {isCompliance && (
                    <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                        <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                            <h3 className="font-serif text-sm">Compliance & Audit Summary</h3>
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
                                        <th className="p-4 col-header">Case Type</th>
                                        <th className="p-4 col-header">Requested</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compliance.slice(0, 5).map((entry) => (
                                        <tr key={entry.id} className="data-row">
                                            <td className="p-4 text-sm font-medium">{entry.company_name}</td>
                                            <td className="p-4 text-xs opacity-80">
                                                {entry.case_type === 'DocumentUpdate' ? 'Document Update' : 'Audit Finding'}
                                            </td>
                                            <td className="p-4 data-value text-xs opacity-60">{entry.requested_at}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${
                                                        entry.status === 'Resolved'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : entry.status === 'Closed'
                                                                ? 'bg-slate-100 text-slate-700'
                                                                : entry.status === 'Returned'
                                                                    ? 'bg-orange-50 text-orange-700'
                                                                    : 'bg-amber-50 text-amber-700'
                                                    }`}
                                                >
                                                    {entry.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {compliance.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center opacity-40">
                                                No compliance cases found.
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
