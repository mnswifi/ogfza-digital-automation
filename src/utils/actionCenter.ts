import type {
    Asset,
    CompanyApplication,
    ComplianceCase,
    Incident,
    MaintenanceRecord,
    Revenue,
    TradeOperationRequest,
    User,
} from '@/middleware/types.middleware';
import type { AppTab } from '@/src/components/SideBar';

export type ActionCenterItem = {
    id: string;
    title: string;
    detail: string;
    badge: string;
    tone: 'danger' | 'warning' | 'info' | 'success';
    tab: AppTab;
    section?: string;
    query?: string;
};

type BuildActionCenterItemsParams = {
    user: User | null;
    companyApplications: CompanyApplication[];
    tradeOperations: TradeOperationRequest[];
    compliance: ComplianceCase[];
    incidents: Incident[];
    assets: Asset[];
    maintenance: MaintenanceRecord[];
    revenue: Revenue[];
};

const HIGH_SEVERITY_LEVELS = new Set(['High', 'Critical']);
const ACTIVE_COMPLIANCE_STATUSES = new Set(['Open', 'Returned', 'Response Submitted']);
const ACTIVE_TRADE_REQUEST_STATUSES = new Set(['Submitted', 'Returned']);

const parseDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    return Math.max(0, (Date.now() - anchor.getTime()) / (1000 * 60 * 60));
};

const addItemIfNeeded = (
    items: ActionCenterItem[],
    condition: number,
    item: Omit<ActionCenterItem, 'badge'>,
    badgeLabel: string,
) => {
    if (condition <= 0) return;

    items.push({
        ...item,
        badge: `${condition} ${badgeLabel}`,
    });
};

export const buildActionCenterItems = ({
    user,
    companyApplications,
    tradeOperations,
    compliance,
    incidents,
    assets,
    maintenance,
    revenue,
}: BuildActionCenterItemsParams): ActionCenterItem[] => {
    if (!user) return [];

    const roles = user.role.split(',').map((role) => role.trim());
    const isAdmin = roles.includes('Admin');
    const isCompliance = roles.includes('Compliance');
    const isContractor = roles.includes('Contractor');
    const isOperations = roles.includes('Operations');
    const isFinance = roles.includes('Finance');
    const items: ActionCenterItem[] = [];

    if (isAdmin) {
        const awaitingMdApproval = companyApplications.filter(
            (application) => application.status === 'Awaiting Admin Approval',
        ).length;
        const paymentSubmissions = companyApplications.filter(
            (application) => application.status === 'Payment Submitted',
        ).length;
        const overdueComplianceCases = compliance.filter(
            (complianceCase) =>
                ACTIVE_COMPLIANCE_STATUSES.has(complianceCase.status) && isPastDue(complianceCase.due_date),
        ).length;
        const highSeverityOpenIncidents = incidents.filter(
            (incident) => incident.status === 'Open' && HIGH_SEVERITY_LEVELS.has(incident.severity || ''),
        ).length;
        const overSlaTradeRequests = tradeOperations.filter((request) => {
            const elapsed = getTradeElapsedHours(request);
            return ACTIVE_TRADE_REQUEST_STATUSES.has(request.status) && elapsed !== null && elapsed > 48;
        }).length;

        addItemIfNeeded(items, awaitingMdApproval, {
            id: 'admin-md-approvals',
            title: 'MD approvals waiting',
            detail: 'Company applications are waiting for final MD approval in Company Management.',
            tone: 'warning',
            tab: 'companies',
            section: 'applications',
        }, 'awaiting approval');
        addItemIfNeeded(items, paymentSubmissions, {
            id: 'admin-payment-confirmations',
            title: 'Payment confirmations pending',
            detail: 'Contractor payment submissions are waiting for licence issuance confirmation.',
            tone: 'info',
            tab: 'companies',
            section: 'applications',
        }, 'pending confirmations');
        addItemIfNeeded(items, overdueComplianceCases, {
            id: 'admin-overdue-compliance',
            title: 'Overdue compliance cases',
            detail: 'Compliance and audit cases are past due and may need executive attention.',
            tone: 'danger',
            tab: 'compliance',
            section: 'documents',
        }, 'overdue cases');
        addItemIfNeeded(items, highSeverityOpenIncidents, {
            id: 'admin-open-incidents',
            title: 'High-severity incidents open',
            detail: 'Critical or high incidents remain open in the safety workflow.',
            tone: 'danger',
            tab: 'incidents',
        }, 'high-risk incidents');
        addItemIfNeeded(items, overSlaTradeRequests, {
            id: 'admin-over-sla-trade',
            title: 'Trade requests over SLA',
            detail: 'Trade operations requests have exceeded the expected 48-hour processing window.',
            tone: 'warning',
            tab: 'trade-operations',
            section: 'requests',
        }, 'over SLA');

        return items;
    }

    if (isCompliance) {
        const applicationsAwaitingReview = companyApplications.filter(
            (application) => application.status === 'Submitted' || application.status === 'Under Review',
        ).length;
        const tradeRequestsAwaitingReview = tradeOperations.filter(
            (request) => request.status === 'Submitted',
        ).length;
        const contractorResponsesAwaitingReview = compliance.filter(
            (complianceCase) => complianceCase.status === 'Response Submitted',
        ).length;
        const openIncidentsWithFollowUp = incidents.filter(
            (incident) => incident.status === 'Open' && Boolean(incident.follow_up_note?.trim()),
        ).length;
        const overdueCases = compliance.filter(
            (complianceCase) =>
                ACTIVE_COMPLIANCE_STATUSES.has(complianceCase.status) && isPastDue(complianceCase.due_date),
        ).length;

        addItemIfNeeded(items, applicationsAwaitingReview, {
            id: 'compliance-applications',
            title: 'Company applications awaiting review',
            detail: 'New company applications are ready for first-level compliance review.',
            tone: 'warning',
            tab: 'companies',
            section: 'applications',
        }, 'new applications');
        addItemIfNeeded(items, tradeRequestsAwaitingReview, {
            id: 'compliance-trade-requests',
            title: 'Trade requests awaiting review',
            detail: 'Submitted trade operation requests are waiting in the compliance queue.',
            tone: 'warning',
            tab: 'trade-operations',
            section: 'requests',
        }, 'new requests');
        addItemIfNeeded(items, contractorResponsesAwaitingReview, {
            id: 'compliance-responses',
            title: 'Contractor responses awaiting decision',
            detail: 'Compliance cases have fresh contractor responses ready for review.',
            tone: 'info',
            tab: 'compliance',
            section: 'documents',
        }, 'responses submitted');
        addItemIfNeeded(items, openIncidentsWithFollowUp, {
            id: 'compliance-incidents',
            title: 'Incident follow-ups ready for closure',
            detail: 'Contractors have responded to incidents and compliance can now resolve or close them.',
            tone: 'info',
            tab: 'incidents',
        }, 'ready for decision');
        addItemIfNeeded(items, overdueCases, {
            id: 'compliance-overdue',
            title: 'Compliance cases overdue',
            detail: 'Document update or audit finding cases have gone past their due dates.',
            tone: 'danger',
            tab: 'compliance',
            section: 'documents',
        }, 'overdue cases');

        return items;
    }

    if (isContractor) {
        const queriedApplications = companyApplications.filter(
            (application) => application.status === 'Returned',
        ).length;
        const pendingPayments = companyApplications.filter(
            (application) => application.status === 'Approved Pending Payment',
        ).length;
        const queriedTradeRequests = tradeOperations.filter(
            (request) => request.status === 'Returned',
        ).length;
        const complianceResponsesNeeded = compliance.filter(
            (complianceCase) => complianceCase.status === 'Open' || complianceCase.status === 'Returned',
        ).length;
        const incidentsAwaitingFollowUp = incidents.filter(
            (incident) => incident.status === 'Open',
        ).length;

        addItemIfNeeded(items, queriedApplications, {
            id: 'contractor-queried-applications',
            title: 'Company applications queried',
            detail: 'Compliance has returned company applications for correction or clarification.',
            tone: 'warning',
            tab: 'companies',
            section: 'applications',
        }, 'queried applications');
        addItemIfNeeded(items, pendingPayments, {
            id: 'contractor-pending-payments',
            title: 'Licence payments awaiting submission',
            detail: 'Approved applications are waiting for contractor payment details before licence issuance.',
            tone: 'info',
            tab: 'companies',
            section: 'applications',
        }, 'payments needed');
        addItemIfNeeded(items, queriedTradeRequests, {
            id: 'contractor-trade-queries',
            title: 'Trade requests queried',
            detail: 'Compliance has returned trade operation requests for revision.',
            tone: 'warning',
            tab: 'trade-operations',
            section: 'requests',
        }, 'queried requests');
        addItemIfNeeded(items, complianceResponsesNeeded, {
            id: 'contractor-compliance-cases',
            title: 'Compliance cases need response',
            detail: 'Document updates or audit cases require a contractor response.',
            tone: 'warning',
            tab: 'compliance',
            section: 'documents',
        }, 'cases requiring response');
        addItemIfNeeded(items, incidentsAwaitingFollowUp, {
            id: 'contractor-incident-followups',
            title: 'Incident follow-ups required',
            detail: 'Open incident reports still need a contractor follow-up response.',
            tone: 'danger',
            tab: 'incidents',
        }, 'open incidents');

        return items;
    }

    if (isOperations) {
        const dueMaintenance = maintenance.filter((record) => {
            const scheduledDate = parseDate(record.maintenance_date);
            if (!scheduledDate || record.status !== 'Scheduled') return false;
            return scheduledDate.getTime() <= Date.now();
        }).length;
        const inProgressMaintenance = maintenance.filter(
            (record) => record.status === 'In Progress',
        ).length;
        const assetsWithIncidents = assets.filter((asset) => Number(asset.open_incident_count || 0) > 0).length;
        const approvedTradeFlow = tradeOperations.filter(
            (request) => request.status === 'Approved',
        ).length;

        addItemIfNeeded(items, dueMaintenance, {
            id: 'operations-due-maintenance',
            title: 'Scheduled maintenance due',
            detail: 'Maintenance work orders have reached or passed their scheduled dates.',
            tone: 'warning',
            tab: 'operations',
            section: 'maintenance',
        }, 'due work orders');
        addItemIfNeeded(items, inProgressMaintenance, {
            id: 'operations-in-progress',
            title: 'Maintenance in progress',
            detail: 'Active work orders are in progress and may need operational follow-through.',
            tone: 'info',
            tab: 'operations',
            section: 'maintenance',
        }, 'active work orders');
        addItemIfNeeded(items, assetsWithIncidents, {
            id: 'operations-assets-incidents',
            title: 'Assets with open incidents',
            detail: 'Asset records have linked open incidents that should be monitored.',
            tone: 'danger',
            tab: 'operations',
            section: 'registry',
        }, 'affected assets');
        addItemIfNeeded(items, approvedTradeFlow, {
            id: 'operations-logistics-flow',
            title: 'Approved logistics flow to monitor',
            detail: 'Approved trade-operation requests are now visible in Integrated Logistics for operational tracking.',
            tone: 'success',
            tab: 'logistics',
        }, 'approved movements');

        return items;
    }

    if (isFinance) {
        const paidThisMonth = revenue.filter((entry) => {
            if (entry.status !== 'Paid') return false;
            const parsed = parseDate(entry.payment_date);
            if (!parsed) return false;
            const now = new Date();
            return (
                parsed.getFullYear() === now.getFullYear() &&
                parsed.getMonth() === now.getMonth()
            );
        }).length;
        const paidToday = revenue.filter((entry) => {
            if (entry.status !== 'Paid') return false;
            const parsed = parseDate(entry.payment_date);
            if (!parsed) return false;
            const now = new Date();
            return (
                parsed.getFullYear() === now.getFullYear() &&
                parsed.getMonth() === now.getMonth() &&
                parsed.getDate() === now.getDate()
            );
        }).length;

        addItemIfNeeded(items, paidToday, {
            id: 'finance-paid-today',
            title: 'Licence payments booked today',
            detail: 'Revenue entries were posted today and are available in the finance ledger.',
            tone: 'success',
            tab: 'finance',
        }, 'payments today');
        addItemIfNeeded(items, paidThisMonth, {
            id: 'finance-paid-this-month',
            title: 'Payments posted this month',
            detail: 'Confirmed licence payments are contributing to the current month revenue position.',
            tone: 'info',
            tab: 'finance',
        }, 'payments this month');
    }

    return items;
};
