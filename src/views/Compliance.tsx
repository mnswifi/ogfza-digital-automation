import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Printer, X } from 'lucide-react';
import {
    Company,
    ComplianceCase,
    ComplianceCaseDetail,
    ComplianceCaseEvent,
    User,
} from '@/middleware/types.middleware';
import {
    printComplianceCaseSummary,
    printStructuredReport,
} from '@/src/utils/printDocuments';
import ModuleFilters from '@/src/components/ModuleFilters';
import { matchesSearchQuery, type ModuleSearchTarget } from '@/src/utils/globalSearch';

type ComplianceProps = {
    token: string | null;
    user: User;
    companies: Company[];
    compliance: ComplianceCase[];
    searchNavigation?: ModuleSearchTarget | null;
    onRefresh: () => void | Promise<void>;
};

type ComplianceSection = 'licenses' | 'documents' | 'findings';
type ComplianceCaseType = 'DocumentUpdate' | 'AuditFinding';

const printActionButtonClassName = 'inline-flex items-center gap-2 border border-brand-line/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-ink/5 transition-colors';

const emptyCreateCaseForm = {
    companyId: '',
    caseType: 'DocumentUpdate' as ComplianceCaseType,
    title: '',
    documentType: '',
    severity: 'Medium',
    requestNote: '',
    dueDate: '',
};

const emptyResponseForm = {
    responseNote: '',
    responseFileName: '',
};

const formatDisplayDate = (value?: string | null) => {
    if (!value) return '--';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
};

const formatDisplayDateTime = (value?: string | null) => {
    if (!value) return '--';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(parsed);
};

const toCaseTypeLabel = (caseType: string) => {
    if (caseType === 'DocumentUpdate') return 'Document Update';
    if (caseType === 'AuditFinding') return 'Audit Finding';
    return caseType;
};

const getComplianceEventLabel = (eventType: string) => {
    if (eventType === 'CaseCreated') return 'Case Created';
    if (eventType === 'ContractorResponseSubmitted') return 'Contractor Response Submitted';
    if (eventType === 'CaseReturned') return 'Returned to Contractor';
    if (eventType === 'CaseResolved') return 'Case Resolved';
    if (eventType === 'CaseClosed') return 'Case Closed';
    if (eventType === 'LegacyImported') return 'Legacy Case Imported';
    if (eventType === 'LegacyResolved') return 'Legacy Case Resolved';
    return eventType;
};

const getLicenseMonitoringStatus = (company: Company) => {
    if (company.status === 'Suspended') return 'Suspended';
    if (company.status === 'Inactive') return 'Inactive';

    if (!company.approved_date) return 'Pending Issue Date';

    const issueDate = new Date(company.approved_date);
    if (Number.isNaN(issueDate.getTime())) return 'Pending Issue Date';

    const renewalDue = new Date(issueDate);
    renewalDue.setFullYear(renewalDue.getFullYear() + 1);

    const now = new Date();
    const msRemaining = renewalDue.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 'Expired';
    if (daysRemaining <= 30) return 'Due for Renewal';
    return 'Active';
};

const caseStatusToneClasses: Record<string, string> = {
    Open: 'bg-amber-50 text-amber-700',
    'Response Submitted': 'bg-sky-50 text-sky-700',
    Returned: 'bg-orange-50 text-orange-700',
    Resolved: 'bg-emerald-50 text-emerald-700',
    Closed: 'bg-slate-100 text-slate-700',
    Overdue: 'bg-rose-50 text-rose-700',
    Active: 'bg-emerald-50 text-emerald-700',
    'Due for Renewal': 'bg-amber-50 text-amber-700',
    Expired: 'bg-rose-50 text-rose-700',
    Suspended: 'bg-rose-50 text-rose-700',
    Inactive: 'bg-slate-100 text-slate-700',
};

const getDisplayedCaseStatus = (complianceCase: ComplianceCase) => {
    if (
        (complianceCase.status === 'Open' || complianceCase.status === 'Returned') &&
        complianceCase.due_date
    ) {
        const dueDate = new Date(complianceCase.due_date);
        if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now()) {
            return 'Overdue';
        }
    }

    return complianceCase.status;
};

const readErrorMessage = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => null);
    return data?.error || fallback;
};

function DetailItem({
    label,
    value,
    preserveWhitespace = false,
    mono = false,
}: {
    label: string;
    value?: React.ReactNode;
    preserveWhitespace?: boolean;
    mono?: boolean;
}) {
    const displayValue = value === null || value === undefined || value === '' ? '--' : value;

    return (
        <div className="border border-brand-line/10 p-4 bg-white">
            <dt className="text-[10px] uppercase tracking-widest opacity-40">{label}</dt>
            <dd
                className={`mt-2 text-sm text-brand-ink ${preserveWhitespace ? 'whitespace-pre-wrap' : ''} ${mono ? 'font-mono' : ''}`}
            >
                {displayValue}
            </dd>
        </div>
    );
}

export default function Compliance({
    token,
    user,
    companies,
    compliance,
    searchNavigation,
    onRefresh,
}: ComplianceProps) {
    const roles = user.role.split(',').map((role) => role.trim());
    const isCompliance = roles.includes('Compliance');
    const isContractor = roles.includes('Contractor');
    const [activeSection, setActiveSection] = useState<ComplianceSection>('licenses');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createCaseForm, setCreateCaseForm] = useState(emptyCreateCaseForm);
    const [showCaseModal, setShowCaseModal] = useState(false);
    const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
    const [selectedCaseDetail, setSelectedCaseDetail] = useState<ComplianceCaseDetail | null>(null);
    const [caseDetailLoading, setCaseDetailLoading] = useState(false);
    const [caseDetailError, setCaseDetailError] = useState<string | null>(null);
    const [responseForm, setResponseForm] = useState(emptyResponseForm);
    const [reviewNote, setReviewNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [licenseSearchQuery, setLicenseSearchQuery] = useState('');
    const [licenseStatusFilter, setLicenseStatusFilter] = useState('All');
    const [documentSearchQuery, setDocumentSearchQuery] = useState('');
    const [documentStatusFilter, setDocumentStatusFilter] = useState('All');
    const [findingSearchQuery, setFindingSearchQuery] = useState('');
    const [findingStatusFilter, setFindingStatusFilter] = useState('All');
    const deferredLicenseSearchQuery = useDeferredValue(licenseSearchQuery);
    const deferredDocumentSearchQuery = useDeferredValue(documentSearchQuery);
    const deferredFindingSearchQuery = useDeferredValue(findingSearchQuery);

    const documentCases = useMemo(
        () => compliance.filter((item) => item.case_type === 'DocumentUpdate'),
        [compliance],
    );
    const auditCases = useMemo(
        () => compliance.filter((item) => item.case_type === 'AuditFinding'),
        [compliance],
    );

    const licenseRows = useMemo(() => {
        const openCasesByCompany = compliance.reduce<Record<number, number>>((acc, complianceCase) => {
            if (complianceCase.status === 'Resolved' || complianceCase.status === 'Closed') return acc;

            acc[complianceCase.company_id] = (acc[complianceCase.company_id] || 0) + 1;
            return acc;
        }, {});

        return companies
            .map((company) => ({
                ...company,
                monitoringStatus: getLicenseMonitoringStatus(company),
                openCasesCount: openCasesByCompany[company.id] || 0,
                renewalDueDate: company.approved_date
                    ? (() => {
                        const issueDate = new Date(company.approved_date);
                        if (Number.isNaN(issueDate.getTime())) return null;
                        issueDate.setFullYear(issueDate.getFullYear() + 1);
                        return issueDate.toISOString();
                    })()
                    : null,
            }))
            .sort((left, right) => left.name.localeCompare(right.name));
    }, [companies, compliance]);
    const licenseStatusOptions = useMemo(
        () => ['All', ...Array.from(new Set(licenseRows.map((row) => row.monitoringStatus))).sort()],
        [licenseRows],
    );
    const documentStatusOptions = useMemo(
        () => ['All', ...Array.from(new Set(documentCases.map((item) => getDisplayedCaseStatus(item)))).sort()],
        [documentCases],
    );
    const findingStatusOptions = useMemo(
        () => ['All', ...Array.from(new Set(auditCases.map((item) => getDisplayedCaseStatus(item)))).sort()],
        [auditCases],
    );
    const filteredLicenseRows = useMemo(
        () =>
            licenseRows.filter((row) => {
                const matchesQuery = matchesSearchQuery(
                    deferredLicenseSearchQuery,
                    row.name,
                    row.license_no,
                    row.license_type,
                    row.incorporation_type,
                    row.free_zone_location,
                    row.representative_email,
                    row.monitoringStatus,
                );
                const matchesStatus =
                    licenseStatusFilter === 'All' || row.monitoringStatus === licenseStatusFilter;

                return matchesQuery && matchesStatus;
            }),
        [licenseRows, deferredLicenseSearchQuery, licenseStatusFilter],
    );
    const filteredDocumentCases = useMemo(
        () =>
            documentCases.filter((complianceCase) => {
                const displayStatus = getDisplayedCaseStatus(complianceCase);
                const matchesQuery = matchesSearchQuery(
                    deferredDocumentSearchQuery,
                    complianceCase.company_name,
                    complianceCase.company_license_no,
                    complianceCase.title,
                    complianceCase.document_type,
                    complianceCase.requested_by_name,
                    displayStatus,
                );
                const matchesStatus =
                    documentStatusFilter === 'All' || displayStatus === documentStatusFilter;

                return matchesQuery && matchesStatus;
            }),
        [documentCases, deferredDocumentSearchQuery, documentStatusFilter],
    );
    const filteredAuditCases = useMemo(
        () =>
            auditCases.filter((complianceCase) => {
                const displayStatus = getDisplayedCaseStatus(complianceCase);
                const matchesQuery = matchesSearchQuery(
                    deferredFindingSearchQuery,
                    complianceCase.company_name,
                    complianceCase.company_license_no,
                    complianceCase.title,
                    complianceCase.severity,
                    complianceCase.requested_by_name,
                    displayStatus,
                );
                const matchesStatus =
                    findingStatusFilter === 'All' || displayStatus === findingStatusFilter;

                return matchesQuery && matchesStatus;
            }),
        [auditCases, deferredFindingSearchQuery, findingStatusFilter],
    );

    const openCasesCount = compliance.filter(
        (complianceCase) =>
            complianceCase.status === 'Open' ||
            complianceCase.status === 'Returned' ||
            complianceCase.status === 'Response Submitted',
    ).length;
    const dueForRenewalCount = licenseRows.filter(
        (row) => row.monitoringStatus === 'Due for Renewal',
    ).length;
    const overdueCasesCount = compliance.filter(
        (complianceCase) => getDisplayedCaseStatus(complianceCase) === 'Overdue',
    ).length;
    const resolvedCasesCount = compliance.filter(
        (complianceCase) => complianceCase.status === 'Resolved',
    ).length;

    useEffect(() => {
        if (!searchNavigation?.section) return;

        if (searchNavigation.section === 'documents') {
            setActiveSection('documents');
            setDocumentSearchQuery(searchNavigation.query || '');
            return;
        }

        if (searchNavigation.section === 'findings') {
            setActiveSection('findings');
            setFindingSearchQuery(searchNavigation.query || '');
        }
    }, [searchNavigation]);

    const handlePrintComplianceReport = () => {
        printStructuredReport({
            documentTitle: 'OGFZA Compliance Report',
            kicker: 'OGFZA Compliance & Audit',
            title: 'Compliance Monitoring Report',
            subtitle: 'Licence monitoring, document update cases, and audit finding workflow summary.',
            reference: `Generated ${formatDisplayDateTime(new Date().toISOString())}`,
            badges: [
                { label: `${openCasesCount} open cases`, tone: openCasesCount > 0 ? 'warning' : 'success' },
                { label: `${dueForRenewalCount} due for renewal`, tone: dueForRenewalCount > 0 ? 'warning' : 'neutral' },
                { label: `${overdueCasesCount} overdue`, tone: overdueCasesCount > 0 ? 'danger' : 'success' },
            ],
            sections: [
                {
                    title: 'Compliance Summary',
                    kind: 'fields',
                    columns: 3,
                    fields: [
                        { label: 'Licensed Companies', value: licenseRows.length },
                        { label: 'Open Cases', value: openCasesCount },
                        { label: 'Due for Renewal', value: dueForRenewalCount },
                        { label: 'Overdue Cases', value: overdueCasesCount },
                        { label: 'Resolved Cases', value: resolvedCasesCount },
                    ],
                },
                {
                    title: 'Licence Monitoring',
                    kind: 'table',
                    headers: ['Company', 'Licence No.', 'Licence Type', 'Status', 'Renewal Due', 'Open Cases'],
                    rows: licenseRows.map((row) => ([
                        row.name,
                        row.license_no || '--',
                        row.license_type || '--',
                        row.monitoringStatus,
                        formatDisplayDate(row.renewalDueDate),
                        row.openCasesCount,
                    ])),
                },
                {
                    title: 'Document Update Cases',
                    kind: 'table',
                    headers: ['Company', 'Title', 'Document Type', 'Status', 'Due Date', 'Requested By'],
                    rows: documentCases.map((entry) => ([
                        entry.company_name,
                        entry.title,
                        entry.document_type || '--',
                        getDisplayedCaseStatus(entry),
                        formatDisplayDate(entry.due_date),
                        entry.requested_by_name || '--',
                    ])),
                },
                {
                    title: 'Audit Findings',
                    kind: 'table',
                    headers: ['Company', 'Title', 'Severity', 'Status', 'Due Date', 'Requested By'],
                    rows: auditCases.map((entry) => ([
                        entry.company_name,
                        entry.title,
                        entry.severity || '--',
                        getDisplayedCaseStatus(entry),
                        formatDisplayDate(entry.due_date),
                        entry.requested_by_name || '--',
                    ])),
                },
            ],
            footerNote: 'Generated from the Compliance & Audit module in the OGFZA Digital Automation prototype.',
        });
    };

    const runRefresh = async () => {
        await Promise.resolve(onRefresh());
    };

    const fetchCaseDetail = async (caseId: number) => {
        const response = await fetch(`/api/compliance/cases/${caseId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to load compliance case details.'));
        }

        return response.json() as Promise<ComplianceCaseDetail>;
    };

    const openCaseModal = async (complianceCase: ComplianceCase) => {
        setSelectedCase(complianceCase);
        setSelectedCaseDetail(null);
        setCaseDetailError(null);
        setCaseDetailLoading(true);
        setShowCaseModal(true);
        setResponseForm(emptyResponseForm);
        setReviewNote('');

        try {
            const detail = await fetchCaseDetail(complianceCase.id);
            setSelectedCaseDetail(detail);
        } catch (error) {
            console.error(error);
            setCaseDetailError(error instanceof Error ? error.message : 'Failed to load compliance case.');
        } finally {
            setCaseDetailLoading(false);
        }
    };

    const openCreateCaseModal = (caseType: ComplianceCaseType) => {
        setCreateCaseForm({
            ...emptyCreateCaseForm,
            caseType,
        });
        setShowCreateModal(true);
    };

    const closeCreateCaseModal = () => {
        setShowCreateModal(false);
        setCreateCaseForm(emptyCreateCaseForm);
    };

    const refreshSelectedCase = async (caseId: number) => {
        const detail = await fetchCaseDetail(caseId);
        setSelectedCaseDetail(detail);
        setSelectedCase(detail);
    };

    const submitCreateCase = async (event: React.FormEvent) => {
        event.preventDefault();
        if (actionLoading) return;

        setActionLoading(true);
        try {
            const response = await fetch('/api/compliance/cases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(createCaseForm),
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Failed to create compliance case.'));
            }

            closeCreateCaseModal();
            await runRefresh();
        } catch (error) {
            console.error(error);
            window.alert(error instanceof Error ? error.message : 'Failed to create compliance case.');
        } finally {
            setActionLoading(false);
        }
    };

    const submitContractorResponse = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedCaseDetail || actionLoading) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/api/compliance/cases/${selectedCaseDetail.id}/respond`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(responseForm),
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Failed to submit the compliance response.'));
            }

            setResponseForm(emptyResponseForm);
            await runRefresh();
            await refreshSelectedCase(selectedCaseDetail.id);
        } catch (error) {
            console.error(error);
            window.alert(error instanceof Error ? error.message : 'Failed to submit the compliance response.');
        } finally {
            setActionLoading(false);
        }
    };

    const reviewComplianceCase = async (decision: 'Resolved' | 'Returned' | 'Closed') => {
        if (!selectedCaseDetail || actionLoading) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/api/compliance/cases/${selectedCaseDetail.id}/review`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    decision,
                    reviewNote,
                }),
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, `Failed to ${decision.toLowerCase()} the compliance case.`));
            }

            setReviewNote('');
            await runRefresh();
            await refreshSelectedCase(selectedCaseDetail.id);
        } catch (error) {
            console.error(error);
            window.alert(
                error instanceof Error ? error.message : `Failed to ${decision.toLowerCase()} the compliance case.`,
            );
        } finally {
            setActionLoading(false);
        }
    };

    const canRespondToCase =
        isContractor &&
        selectedCaseDetail &&
        (selectedCaseDetail.status === 'Open' || selectedCaseDetail.status === 'Returned');
    const canResolveCase =
        isCompliance &&
        selectedCaseDetail &&
        selectedCaseDetail.status === 'Response Submitted';
    const canCloseCase =
        isCompliance &&
        selectedCaseDetail &&
        selectedCaseDetail.status !== 'Resolved' &&
        selectedCaseDetail.status !== 'Closed';

    return (
        <div className="space-y-6">
            {showCreateModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-2xl w-full shadow-2xl border border-brand-line/20"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-serif italic text-lg mb-2">
                                    {createCaseForm.caseType === 'DocumentUpdate'
                                        ? 'Request Document Update'
                                        : 'Log Audit Finding'}
                                </h3>
                                <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                                    Ongoing Compliance Monitoring
                                </p>
                            </div>
                            <button type="button" onClick={closeCreateCaseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={(event) => void submitCreateCase(event)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Licensed Company</label>
                                    <select
                                        required
                                        value={createCaseForm.companyId}
                                        onChange={(event) =>
                                            setCreateCaseForm({
                                                ...createCaseForm,
                                                companyId: event.target.value,
                                            })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option value="">Select company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {createCaseForm.caseType === 'DocumentUpdate' ? (
                                    <div className="space-y-1">
                                        <label className="col-header">Document Type</label>
                                        <input
                                            required
                                            type="text"
                                            value={createCaseForm.documentType}
                                            onChange={(event) =>
                                                setCreateCaseForm({
                                                    ...createCaseForm,
                                                    documentType: event.target.value,
                                                })
                                            }
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            placeholder="e.g. Updated EIA Report"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <label className="col-header">Severity</label>
                                        <select
                                            value={createCaseForm.severity}
                                            onChange={(event) =>
                                                setCreateCaseForm({
                                                    ...createCaseForm,
                                                    severity: event.target.value,
                                                })
                                            }
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option>Low</option>
                                            <option>Medium</option>
                                            <option>High</option>
                                            <option>Critical</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Case Title</label>
                                    <input
                                        required
                                        type="text"
                                        value={createCaseForm.title}
                                        onChange={(event) =>
                                            setCreateCaseForm({
                                                ...createCaseForm,
                                                title: event.target.value,
                                            })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        placeholder={
                                            createCaseForm.caseType === 'DocumentUpdate'
                                                ? 'e.g. Submit updated incorporation document'
                                                : 'e.g. Close out storage-area nonconformance'
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Due Date</label>
                                    <input
                                        type="date"
                                        value={createCaseForm.dueDate}
                                        onChange={(event) =>
                                            setCreateCaseForm({
                                                ...createCaseForm,
                                                dueDate: event.target.value,
                                            })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">
                                    {createCaseForm.caseType === 'DocumentUpdate'
                                        ? 'Request Instructions'
                                        : 'Finding Details'}
                                </label>
                                <textarea
                                    required
                                    value={createCaseForm.requestNote}
                                    onChange={(event) =>
                                        setCreateCaseForm({
                                            ...createCaseForm,
                                            requestNote: event.target.value,
                                        })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm h-32 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                    placeholder={
                                        createCaseForm.caseType === 'DocumentUpdate'
                                            ? 'Explain what document the company needs to update and what should be resubmitted.'
                                            : 'Describe the finding, expected corrective action, and closure criteria.'
                                    }
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeCreateCaseModal}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : 'Create Case'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showCaseModal && selectedCase && (
                <div className="fixed inset-0 bg-brand-ink/30 backdrop-blur-sm z-50 overflow-y-auto p-4">
                    <div className="min-h-full flex items-start justify-center py-4">
                        <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                        Compliance Case
                                    </p>
                                    <h2 className="text-2xl font-serif text-brand-ink mt-2">
                                        {selectedCase.title}
                                    </h2>
                                    <p className="text-xs font-mono opacity-50 mt-2">
                                        Case #{selectedCase.id.toString().padStart(4, '0')}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {selectedCaseDetail && (
                                        <button
                                            type="button"
                                            onClick={() => printComplianceCaseSummary(selectedCaseDetail)}
                                            className={printActionButtonClassName}
                                        >
                                            <Printer size={14} />
                                            Print Case Summary
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setShowCaseModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {caseDetailLoading && (
                                <div className="py-10 text-center">
                                    <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm opacity-50">Loading compliance case...</p>
                                </div>
                            )}

                            {!caseDetailLoading && caseDetailError && (
                                <div className="mt-8 border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                    {caseDetailError}
                                </div>
                            )}

                            {!caseDetailLoading && !caseDetailError && selectedCaseDetail && (
                                <div className="mt-8 space-y-6">
                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Company" value={selectedCaseDetail.company_name} />
                                        <DetailItem
                                            label="Case Type"
                                            value={toCaseTypeLabel(selectedCaseDetail.case_type)}
                                        />
                                        <DetailItem
                                            label="Status"
                                            value={
                                                <span
                                                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                                                        caseStatusToneClasses[getDisplayedCaseStatus(selectedCaseDetail)] ||
                                                        caseStatusToneClasses.Open
                                                    }`}
                                                >
                                                    {getDisplayedCaseStatus(selectedCaseDetail)}
                                                </span>
                                            }
                                        />
                                        <DetailItem
                                            label="License Number"
                                            value={selectedCaseDetail.company_license_no}
                                            mono
                                        />
                                        <DetailItem
                                            label="Due Date"
                                            value={formatDisplayDate(selectedCaseDetail.due_date)}
                                        />
                                        <DetailItem
                                            label="Requested"
                                            value={formatDisplayDateTime(selectedCaseDetail.requested_at)}
                                        />
                                        {selectedCaseDetail.case_type === 'DocumentUpdate' && (
                                            <DetailItem
                                                label="Document Type"
                                                value={selectedCaseDetail.document_type}
                                            />
                                        )}
                                        {selectedCaseDetail.case_type === 'AuditFinding' && (
                                            <DetailItem label="Severity" value={selectedCaseDetail.severity} />
                                        )}
                                        <DetailItem
                                            label="Requested By"
                                            value={selectedCaseDetail.requested_by_name}
                                        />
                                    </dl>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Request Note
                                            </h3>
                                        </div>
                                        <div className="border border-brand-line/10 bg-white p-5 text-sm whitespace-pre-wrap">
                                            {selectedCaseDetail.request_note}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Contractor Response
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <DetailItem
                                                label="Response Submitted"
                                                value={formatDisplayDateTime(selectedCaseDetail.contractor_response_submitted_at)}
                                            />
                                            <DetailItem
                                                label="Submitted By"
                                                value={selectedCaseDetail.contractor_response_submitted_by_name}
                                            />
                                            <DetailItem
                                                label="Supporting Document"
                                                value={selectedCaseDetail.contractor_response_file_name}
                                            />
                                            <DetailItem
                                                label="Compliance Note"
                                                value={selectedCaseDetail.review_note}
                                                preserveWhitespace
                                            />
                                        </div>
                                        <div className="border border-brand-line/10 bg-white p-5 text-sm whitespace-pre-wrap">
                                            {selectedCaseDetail.contractor_response_note || '--'}
                                        </div>
                                    </section>

                                    {canRespondToCase && (
                                        <section className="space-y-4 border border-brand-line/10 bg-brand-ink/[0.02] p-5">
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                    Submit Response
                                                </h3>
                                                <p className="text-xs opacity-60 mt-1">
                                                    Provide your corrective response or updated document reference for compliance review.
                                                </p>
                                            </div>

                                            <form onSubmit={(event) => void submitContractorResponse(event)} className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="col-header">Response Note</label>
                                                    <textarea
                                                        value={responseForm.responseNote}
                                                        onChange={(event) =>
                                                            setResponseForm({
                                                                ...responseForm,
                                                                responseNote: event.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white border border-brand-line/10 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                                        placeholder="Explain the action taken or clarification provided."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="col-header">Supporting Document Reference</label>
                                                    <input
                                                        type="text"
                                                        value={responseForm.responseFileName}
                                                        onChange={(event) =>
                                                            setResponseForm({
                                                                ...responseForm,
                                                                responseFileName: event.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-white border border-brand-line/10 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                                        placeholder="e.g. updated-eia-report.pdf"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={actionLoading}
                                                    className="bg-brand-ink text-brand-bg px-5 py-3 text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                                                >
                                                    {actionLoading ? 'Submitting...' : 'Submit Response'}
                                                </button>
                                            </form>
                                        </section>
                                    )}

                                    {(canResolveCase || canCloseCase) && (
                                        <section className="space-y-4 border border-brand-line/10 bg-white p-5">
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                    Compliance Review
                                                </h3>
                                                <p className="text-xs opacity-60 mt-1">
                                                    Review the contractor response and decide whether to resolve, return, or close the case.
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="col-header">Review Note</label>
                                                <textarea
                                                    value={reviewNote}
                                                    onChange={(event) => setReviewNote(event.target.value)}
                                                    className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                                    placeholder="Add a review note for the contractor or closure record."
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {canResolveCase && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading}
                                                            onClick={() => void reviewComplianceCase('Returned')}
                                                            className="border border-amber-200 text-amber-700 px-4 py-3 text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                                                        >
                                                            Return to Contractor
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading}
                                                            onClick={() => void reviewComplianceCase('Resolved')}
                                                            className="bg-brand-ink text-brand-bg px-4 py-3 text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                                                        >
                                                            Resolve Case
                                                        </button>
                                                    </>
                                                )}
                                                {canCloseCase && (
                                                    <button
                                                        type="button"
                                                        disabled={actionLoading}
                                                        onClick={() => void reviewComplianceCase('Closed')}
                                                        className="border border-slate-200 text-slate-700 px-4 py-3 text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                                                    >
                                                        Close Case
                                                    </button>
                                                )}
                                            </div>
                                        </section>
                                    )}

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Workflow Log
                                            </h3>
                                        </div>
                                        <div className="space-y-3">
                                            {selectedCaseDetail.events?.map((event: ComplianceCaseEvent) => (
                                                <div key={event.id} className="border border-brand-line/10 bg-white p-4">
                                                    <div className="flex flex-wrap justify-between gap-3">
                                                        <p className="text-[10px] uppercase tracking-widest opacity-40">
                                                            {getComplianceEventLabel(event.event_type)}
                                                        </p>
                                                        <p className="text-[10px] font-mono opacity-40">
                                                            {formatDisplayDateTime(event.created_at)}
                                                        </p>
                                                    </div>
                                                    <p className="mt-3 text-sm font-bold">
                                                        {event.actor_name || 'System'}
                                                        {event.actor_role ? ` · ${event.actor_role}` : ''}
                                                    </p>
                                                    <p className="mt-2 text-xs opacity-60">
                                                        {(event.from_status || '--') + ' -> ' + (event.to_status || '--')}
                                                    </p>
                                                    {event.note && (
                                                        <p className="mt-3 text-sm whitespace-pre-wrap">{event.note}</p>
                                                    )}
                                                </div>
                                            ))}
                                            {(!selectedCaseDetail.events || selectedCaseDetail.events.length === 0) && (
                                                <div className="border border-brand-line/10 bg-white p-8 text-center italic opacity-40">
                                                    No workflow history has been recorded for this case yet.
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif italic">Compliance & Audit</h2>
                        <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                            License Monitoring, Document Updates & Audit Findings
                        </p>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                        <button
                            onClick={handlePrintComplianceReport}
                            className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                        >
                            Export Compliance Report
                        </button>
                        {isCompliance && activeSection === 'documents' && (
                            <button
                                onClick={() => openCreateCaseModal('DocumentUpdate')}
                                className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                            >
                                Request Document Update
                            </button>
                        )}
                        {isCompliance && activeSection === 'findings' && (
                            <button
                                onClick={() => openCreateCaseModal('AuditFinding')}
                                className="bg-brand-ink text-brand-bg px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:opacity-90"
                            >
                                Log Audit Finding
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-brand-line/10 border-b border-brand-line/10">
                    {[
                        { label: 'Licensed Companies', value: licenseRows.length },
                        { label: 'Open Cases', value: openCasesCount },
                        { label: 'Due for Renewal', value: dueForRenewalCount },
                        { label: 'Overdue / Resolved', value: `${overdueCasesCount} / ${resolvedCasesCount}` },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white p-5">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">{stat.label}</p>
                            <p className="mt-3 text-2xl font-bold data-value">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="px-6 pt-6">
                    <div className="inline-flex flex-wrap gap-2 border border-brand-line/10 p-1 bg-brand-ink/[0.02]">
                        {[
                            { key: 'licenses' as const, label: 'License Status' },
                            { key: 'documents' as const, label: 'Document Updates' },
                            { key: 'findings' as const, label: 'Audit Findings' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveSection(tab.key)}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                    activeSection === tab.key
                                        ? 'bg-brand-ink text-brand-bg'
                                        : 'text-brand-ink/50 hover:bg-brand-ink/5'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeSection === 'licenses' && (
                        <div className="space-y-4">
                            <ModuleFilters
                                searchValue={licenseSearchQuery}
                                onSearchChange={setLicenseSearchQuery}
                                searchPlaceholder="Search by company, licence number, licence type, free zone, or status"
                                selects={[
                                    {
                                        label: 'Status',
                                        value: licenseStatusFilter,
                                        options: licenseStatusOptions.map((option) => ({ label: option, value: option })),
                                        onChange: setLicenseStatusFilter,
                                    },
                                ]}
                                resultCount={filteredLicenseRows.length}
                                resultLabel="matching licences"
                            />

                            <div className="overflow-x-auto border border-brand-line/10">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-brand-ink/5">
                                            <th className="p-4 col-header">Company</th>
                                            <th className="p-4 col-header">License No.</th>
                                            <th className="p-4 col-header">License Type</th>
                                            <th className="p-4 col-header">Issued</th>
                                            <th className="p-4 col-header">Renewal Due</th>
                                            <th className="p-4 col-header">Status</th>
                                            <th className="p-4 col-header">Open Cases</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-line/10">
                                        {filteredLicenseRows.map((row) => {
                                            const tone =
                                                caseStatusToneClasses[row.monitoringStatus] ||
                                                caseStatusToneClasses.Active;

                                            return (
                                                <tr key={row.id} className="hover:bg-brand-ink/[0.02] transition-colors">
                                                    <td className="p-4 text-sm font-bold">{row.name}</td>
                                                    <td className="p-4 text-xs font-mono">{row.license_no || '--'}</td>
                                                    <td className="p-4 text-xs">{row.license_type || '--'}</td>
                                                    <td className="p-4 text-xs font-mono">
                                                        {formatDisplayDate(row.approved_date)}
                                                    </td>
                                                    <td className="p-4 text-xs font-mono">
                                                        {formatDisplayDate(row.renewalDueDate)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tone}`}>
                                                            {row.monitoringStatus}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xs font-bold">{row.openCasesCount}</td>
                                                </tr>
                                            );
                                        })}
                                        {filteredLicenseRows.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-10 text-center italic opacity-40">
                                                    {licenseRows.length === 0
                                                        ? 'No licensed companies are available for compliance monitoring yet.'
                                                        : 'No licence records match the current filters.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === 'documents' && (
                        <div className="space-y-4">
                            <ModuleFilters
                                searchValue={documentSearchQuery}
                                onSearchChange={setDocumentSearchQuery}
                                searchPlaceholder="Search by company, title, document type, requested by, or status"
                                selects={[
                                    {
                                        label: 'Status',
                                        value: documentStatusFilter,
                                        options: documentStatusOptions.map((option) => ({ label: option, value: option })),
                                        onChange: setDocumentStatusFilter,
                                    },
                                ]}
                                resultCount={filteredDocumentCases.length}
                                resultLabel="matching document cases"
                            />

                            <div className="overflow-x-auto border border-brand-line/10">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-brand-ink/5">
                                            <th className="p-4 col-header">Company</th>
                                            <th className="p-4 col-header">Title</th>
                                            <th className="p-4 col-header">Document</th>
                                            <th className="p-4 col-header">Due Date</th>
                                            <th className="p-4 col-header">Requested</th>
                                            <th className="p-4 col-header">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-line/10">
                                        {filteredDocumentCases.map((complianceCase) => {
                                            const statusLabel = getDisplayedCaseStatus(complianceCase);
                                            const tone =
                                                caseStatusToneClasses[statusLabel] ||
                                                caseStatusToneClasses.Open;

                                            return (
                                                <tr
                                                    key={complianceCase.id}
                                                    className="hover:bg-brand-ink/[0.02] transition-colors cursor-pointer"
                                                    onClick={() => void openCaseModal(complianceCase)}
                                                >
                                                    <td className="p-4 text-sm font-bold">{complianceCase.company_name}</td>
                                                    <td className="p-4 text-xs">{complianceCase.title}</td>
                                                    <td className="p-4 text-xs opacity-70">
                                                        {complianceCase.document_type || '--'}
                                                    </td>
                                                    <td className="p-4 text-xs font-mono">
                                                        {formatDisplayDate(complianceCase.due_date)}
                                                    </td>
                                                    <td className="p-4 text-xs font-mono">
                                                        {formatDisplayDateTime(complianceCase.requested_at)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tone}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredDocumentCases.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-10 text-center italic opacity-40">
                                                    {documentCases.length === 0
                                                        ? (isContractor
                                                            ? 'No document update requests have been assigned to your companies yet.'
                                                            : 'No document update requests have been raised yet.')
                                                        : 'No document update cases match the current filters.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === 'findings' && (
                        <div className="space-y-4">
                            <ModuleFilters
                                searchValue={findingSearchQuery}
                                onSearchChange={setFindingSearchQuery}
                                searchPlaceholder="Search by company, finding, severity, requested by, or status"
                                selects={[
                                    {
                                        label: 'Status',
                                        value: findingStatusFilter,
                                        options: findingStatusOptions.map((option) => ({ label: option, value: option })),
                                        onChange: setFindingStatusFilter,
                                    },
                                ]}
                                resultCount={filteredAuditCases.length}
                                resultLabel="matching audit findings"
                            />

                            <div className="overflow-x-auto border border-brand-line/10">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-brand-ink/5">
                                            <th className="p-4 col-header">Company</th>
                                            <th className="p-4 col-header">Finding</th>
                                            <th className="p-4 col-header">Severity</th>
                                            <th className="p-4 col-header">Due Date</th>
                                            <th className="p-4 col-header">Requested</th>
                                            <th className="p-4 col-header">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-line/10">
                                        {filteredAuditCases.map((complianceCase) => {
                                            const statusLabel = getDisplayedCaseStatus(complianceCase);
                                            const tone =
                                                caseStatusToneClasses[statusLabel] ||
                                                caseStatusToneClasses.Open;

                                            return (
                                                <tr
                                                    key={complianceCase.id}
                                                    className="hover:bg-brand-ink/[0.02] transition-colors cursor-pointer"
                                                    onClick={() => void openCaseModal(complianceCase)}
                                                >
                                                    <td className="p-4 text-sm font-bold">{complianceCase.company_name}</td>
                                                    <td className="p-4 text-xs">{complianceCase.title}</td>
                                                    <td className="p-4 text-xs font-bold">
                                                        {complianceCase.severity || '--'}
                                                    </td>
                                                    <td className="p-4 text-xs font-mono">
                                                        {formatDisplayDate(complianceCase.due_date)}
                                                    </td>
                                                    <td className="p-4 text-xs font-mono">
                                                        {formatDisplayDateTime(complianceCase.requested_at)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tone}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredAuditCases.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-10 text-center italic opacity-40">
                                                    {auditCases.length === 0
                                                        ? (isContractor
                                                            ? 'No audit findings have been raised against your companies yet.'
                                                            : 'No audit findings have been logged yet.')
                                                        : 'No audit findings match the current filters.'}
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
        </div>
    );
}
