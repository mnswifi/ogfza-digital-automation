import type {
    Asset,
    Company,
    CompanyApplication,
    ComplianceCase,
    Incident,
    TradeOperationRequest,
    User,
} from '@/middleware/types.middleware';
import type { AppTab } from '@/src/components/SideBar';
import { getTradeOperationService } from '@/src/constants/tradeOperations';
import { canAccessTab } from '@/src/hooks/appAccess';

export type ModuleSearchTarget = {
    key?: number;
    tab: AppTab;
    section?: string;
    query?: string;
};

export type GlobalSearchResult = {
    id: string;
    tab: AppTab;
    section?: string;
    query: string;
    moduleLabel: string;
    title: string;
    subtitle: string;
    badge?: string;
};

type BuildGlobalSearchResultsParams = {
    query: string;
    user: User | null;
    companies: Company[];
    companyApplications: CompanyApplication[];
    tradeOperations: TradeOperationRequest[];
    compliance: ComplianceCase[];
    incidents: Incident[];
    assets: Asset[];
};

const normalizeSearchValue = (value: unknown) => {
    if (value === null || value === undefined) return '';

    return String(value)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
};

export const matchesSearchQuery = (query: string, ...values: Array<unknown>) => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return true;

    return values.some((value) => normalizeSearchValue(value).includes(normalizedQuery));
};

const formatCompanyApplicationStatus = (status?: string | null) => {
    if (!status) return '--';
    if (status === 'Returned') return 'Queried';
    if (status === 'Awaiting Admin Approval') return 'Awaiting MD Approval';
    if (status === 'Approved Pending Payment') return 'Awaiting Contractor Payment';
    if (status === 'Payment Submitted') return 'Awaiting Payment Confirmation';
    if (status === 'Approved') return 'Approved by MD';
    if (status === 'Licence Issued') return 'Licence Issued';
    if (status === 'Submitted' || status === 'Under Review' || status === 'Draft') {
        return 'Awaiting Compliance Review';
    }

    return status;
};

const formatTradeOperationStatus = (status?: string | null) => {
    if (!status) return '--';
    if (status === 'Approved') return 'Approved by Compliance';
    if (status === 'Returned') return 'Queried by Compliance';
    if (status === 'Rejected') return 'Rejected';
    return 'Awaiting Compliance Review';
};

const getCaseSection = (complianceCase: ComplianceCase) => (
    complianceCase.case_type === 'AuditFinding' ? 'findings' : 'documents'
);

export const buildGlobalSearchResults = ({
    query,
    user,
    companies,
    companyApplications,
    tradeOperations,
    compliance,
    incidents,
    assets,
}: BuildGlobalSearchResultsParams): GlobalSearchResult[] => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || !user) return [];

    const results: GlobalSearchResult[] = [];

    if (canAccessTab(user, 'companies')) {
        companies
            .filter((company) =>
                matchesSearchQuery(
                    trimmedQuery,
                    company.name,
                    company.license_no,
                    company.license_type,
                    company.incorporation_type,
                    company.free_zone_location,
                    company.representative_email,
                    company.status,
                ),
            )
            .slice(0, 4)
            .forEach((company) => {
                results.push({
                    id: `company-${company.id}`,
                    tab: 'companies',
                    section: 'registered',
                    query: company.name,
                    moduleLabel: 'Company Management',
                    title: company.name,
                    subtitle: [
                        company.license_no || 'Licence pending',
                        company.license_type || 'No licence type',
                        company.free_zone_location || 'No free zone selected',
                    ].join(' · '),
                    badge: 'Registered Company',
                });
            });

        companyApplications
            .filter((application) =>
                matchesSearchQuery(
                    trimmedQuery,
                    application.application_reference,
                    application.company_name,
                    application.primary_contact_name,
                    application.primary_contact_email,
                    application.submitted_by_name,
                    application.free_zone_location,
                    application.requested_license_type,
                    application.approved_license_type,
                    formatCompanyApplicationStatus(application.status),
                ),
            )
            .slice(0, 4)
            .forEach((application) => {
                results.push({
                    id: `company-application-${application.id}`,
                    tab: 'companies',
                    section: 'applications',
                    query: application.company_name,
                    moduleLabel: 'Company Management',
                    title: application.company_name,
                    subtitle: [
                        application.application_reference,
                        formatCompanyApplicationStatus(application.status),
                        application.requested_license_type || 'Licence type pending',
                    ].join(' · '),
                    badge: 'Company Application',
                });
            });
    }

    if (canAccessTab(user, 'trade-operations')) {
        tradeOperations
            .filter((request) =>
                matchesSearchQuery(
                    trimmedQuery,
                    request.request_reference,
                    request.company_name,
                    request.company_license_no,
                    request.company_license_type,
                    request.submitted_by_name,
                    getTradeOperationService(request.service_type)?.label,
                    request.service_family,
                    formatTradeOperationStatus(request.status),
                ),
            )
            .slice(0, 6)
            .forEach((request) => {
                results.push({
                    id: `trade-operation-${request.id}`,
                    tab: 'trade-operations',
                    section: 'requests',
                    query: request.company_name,
                    moduleLabel: 'Trade Operations',
                    title: getTradeOperationService(request.service_type)?.label || request.service_type,
                    subtitle: [
                        request.company_name,
                        request.request_reference,
                        formatTradeOperationStatus(request.status),
                    ].join(' · '),
                    badge: 'Trade Request',
                });
            });
    }

    if (canAccessTab(user, 'compliance')) {
        compliance
            .filter((complianceCase) =>
                matchesSearchQuery(
                    trimmedQuery,
                    complianceCase.company_name,
                    complianceCase.company_license_no,
                    complianceCase.title,
                    complianceCase.case_type,
                    complianceCase.document_type,
                    complianceCase.severity,
                    complianceCase.status,
                    complianceCase.requested_by_name,
                ),
            )
            .slice(0, 6)
            .forEach((complianceCase) => {
                results.push({
                    id: `compliance-case-${complianceCase.id}`,
                    tab: 'compliance',
                    section: getCaseSection(complianceCase),
                    query: complianceCase.title || complianceCase.company_name,
                    moduleLabel: 'Compliance & Audit',
                    title: complianceCase.title,
                    subtitle: [
                        complianceCase.company_name,
                        complianceCase.status,
                        complianceCase.case_type === 'AuditFinding' ? (complianceCase.severity || 'Severity pending') : (complianceCase.document_type || 'Document update'),
                    ].join(' · '),
                    badge: complianceCase.case_type === 'AuditFinding' ? 'Audit Finding' : 'Document Update',
                });
            });
    }

    if (canAccessTab(user, 'incidents')) {
        incidents
            .filter((incident) =>
                matchesSearchQuery(
                    trimmedQuery,
                    incident.company_name,
                    incident.asset_name,
                    incident.incident_type,
                    incident.severity,
                    incident.status,
                    incident.description,
                    incident.reported_by,
                ),
            )
            .slice(0, 6)
            .forEach((incident) => {
                results.push({
                    id: `incident-${incident.id}`,
                    tab: 'incidents',
                    query: incident.company_name,
                    moduleLabel: 'Safety & Incident Logs',
                    title: incident.company_name,
                    subtitle: [
                        incident.incident_type,
                        incident.severity,
                        incident.status,
                    ].join(' · '),
                    badge: 'Incident Case',
                });
            });
    }

    if (canAccessTab(user, 'operations')) {
        assets
            .filter((asset) =>
                matchesSearchQuery(
                    trimmedQuery,
                    asset.asset_name,
                    asset.company_name,
                    asset.type,
                    asset.location_coordinates,
                    asset.status,
                ),
            )
            .slice(0, 6)
            .forEach((asset) => {
                results.push({
                    id: `asset-${asset.id}`,
                    tab: 'operations',
                    section: 'registry',
                    query: asset.asset_name,
                    moduleLabel: 'Field Assets',
                    title: asset.asset_name,
                    subtitle: [
                        asset.company_name || 'Unassigned company',
                        asset.type,
                        asset.status,
                    ].join(' · '),
                    badge: 'Asset Record',
                });
            });
    }

    return results.slice(0, 18);
};
