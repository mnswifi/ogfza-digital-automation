import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Printer,
    X,
} from 'lucide-react';
import type {
    Company,
    TradeOperationDocument,
    TradeOperationEvent,
    TradeOperationRequest,
    TradeOperationRequestDetail,
    User,
} from '@/middleware/types.middleware';
import {
    createInitialTradeOperationForm,
} from '@/src/hooks/appInitialState';
import {
    getTradeOperationDocumentRequirements,
    getTradeOperationFamiliesForLicense,
    getTradeOperationService,
    mergeTradeOperationDocuments,
    tradeOperationFamilyCatalog,
    tradeOperationServiceOptions,
    type TradeOperationDocumentType,
    type TradeOperationFamilyKey,
} from '@/src/constants/tradeOperations';
import type { LicenseType } from '@/src/constants/companyApplication';
import type { TradeOperationForm } from '@/src/types/appFormTypes';
import { printTradeOperationSummary } from '@/src/utils/printDocuments';
import ModuleFilters from '@/src/components/ModuleFilters';
import { matchesSearchQuery, type ModuleSearchTarget } from '@/src/utils/globalSearch';

type TradeOperationsProps = {
    token: string | null;
    user: User;
    companies: Company[];
    tradeOperations: TradeOperationRequest[];
    searchNavigation?: ModuleSearchTarget | null;
    showTradeOperationModal: boolean;
    setShowTradeOperationModal: React.Dispatch<React.SetStateAction<boolean>>;
    editingTradeOperationId: number | null;
    setEditingTradeOperationId: React.Dispatch<React.SetStateAction<number | null>>;
    newTradeOperation: TradeOperationForm;
    setNewTradeOperation: React.Dispatch<React.SetStateAction<TradeOperationForm>>;
    actionLoading: boolean;
    onSubmitTradeOperation: (e?: React.FormEvent) => void | Promise<void>;
    onReviewTradeOperation: (
        requestId: number,
        decision: 'Approved' | 'Rejected' | 'Returned',
        rejectionReason?: string,
        queryNote?: string,
    ) => void | Promise<void>;
};

const toneClasses = {
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
} as const;

const printActionButtonClassName = 'inline-flex items-center gap-2 border border-brand-line/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-ink/5 transition-colors';

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

const getLastActionDate = (request: TradeOperationRequest | TradeOperationRequestDetail) => (
    request.rejected_at ||
    request.approved_at ||
    request.returned_at ||
    request.resubmitted_at ||
    request.reviewed_at ||
    request.submitted_at ||
    null
);

const getTradeOperationStatusLabel = (
    request: TradeOperationRequest | TradeOperationRequestDetail
) => {
    if (request.status === 'Approved') return 'Approved by Compliance';
    if (request.status === 'Returned') return 'Queried by Compliance';
    if (request.status === 'Rejected') return 'Rejected';
    return 'Awaiting Compliance Review';
};

const getTradeOperationStatusTone = (label: string) => {
    if (label === 'Approved by Compliance') return 'emerald';
    if (label === 'Rejected') return 'rose';
    return 'amber';
};

const readErrorMessage = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => null);
    return data?.error || fallback;
};

const companyCanAccessService = (
    company: Company,
    serviceType?: string | null
) => {
    const serviceDefinition = getTradeOperationService(serviceType);

    if (!serviceDefinition || !company.license_type) {
        return false;
    }

    const allowedLicenseTypes = serviceDefinition.allowedLicenseTypes as readonly LicenseType[];

    return allowedLicenseTypes.includes(company.license_type as LicenseType);
};

const toFormStateFromDetail = (
    detail: TradeOperationRequestDetail
): TradeOperationForm => ({
    companyId: String(detail.company_id ?? ''),
    serviceType: detail.service_type || '',
    requestSummary: detail.operation_summary || detail.goods_description || '',
    requestedCompletionDate: detail.requested_completion_date
        ? new Date(detail.requested_completion_date).toISOString().slice(0, 10)
        : '',
    documents: mergeTradeOperationDocuments(
        detail.service_type,
        (detail.documents || []).map((document) => ({
            documentType: document.document_type as TradeOperationDocumentType,
            fileName: document.file_name,
        }))
    ),
});

function DetailItem({
    label,
    value,
    mono = false,
    className = '',
    preserveWhitespace = false,
}: {
    label: string;
    value?: React.ReactNode;
    mono?: boolean;
    className?: string;
    preserveWhitespace?: boolean;
}) {
    const displayValue =
        value === null || value === undefined || value === ''
            ? '--'
            : value;

    return (
        <div className={`border border-brand-line/10 p-4 bg-white ${className}`}>
            <dt className="text-[10px] uppercase tracking-widest opacity-40">{label}</dt>
            <dd
                className={`mt-2 text-sm text-brand-ink ${mono ? 'font-mono' : ''} ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}
            >
                {displayValue}
            </dd>
        </div>
    );
}

function WorkflowLog({
    events,
}: {
    events?: TradeOperationEvent[];
}) {
    if (!events || events.length === 0) {
        return (
            <div className="border border-brand-line/10 p-5 text-sm  opacity-50">
                No workflow activity has been recorded yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {events.map((event) => (
                <article key={event.id} className="border border-brand-line/10 p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">
                                {event.event_type.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="mt-3 text-sm font-semibold text-brand-ink">
                                {event.actor_name || 'System'}{event.actor_role ? ` · ${event.actor_role}` : ''}
                            </p>
                        </div>
                        <p className="text-xs font-mono opacity-40">
                            {formatDisplayDateTime(event.created_at)}
                        </p>
                    </div>

                    {(event.from_status || event.to_status) && (
                        <p className="mt-4 text-sm opacity-60">
                            {event.from_status || '--'} <ArrowRight size={14} className="inline-block mx-1" /> {event.to_status || '--'}
                        </p>
                    )}

                    {event.note && (
                        <p className="mt-4 text-sm text-brand-ink whitespace-pre-wrap">
                            {event.note}
                        </p>
                    )}
                </article>
            ))}
        </div>
    );
}

function DocumentChecklist({
    serviceType,
    documents,
}: {
    serviceType?: string | null;
    documents?: TradeOperationDocument[];
}) {
    const requirements = getTradeOperationDocumentRequirements(serviceType);
    const documentsByType = new Map(
        (documents || []).map((document) => [document.document_type, document.file_name])
    );

    if (requirements.length === 0) {
        return (
            <div className="border border-brand-line/10 p-5 text-sm  opacity-50">
                Select a service to view the required documents.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {requirements.map((requirement) => {
                const fileName = documentsByType.get(requirement.documentType);

                return (
                    <div
                        key={requirement.documentType}
                        className="border border-brand-line/10 p-4 flex items-start justify-between gap-4"
                    >
                        <div>
                            <p className="text-sm font-semibold text-brand-ink">{requirement.label}</p>
                            <p className="mt-1 text-xs opacity-60">{requirement.description}</p>
                        </div>
                        <div className="text-right">
                            <span
                                className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${fileName ? toneClasses.emerald : toneClasses.amber}`}
                            >
                                {fileName ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                                {fileName ? 'Attached' : 'Pending'}
                            </span>
                            <p className="mt-2 text-xs font-mono opacity-50 break-all">
                                {fileName || '--'}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function TradeOperations({
    token,
    user,
    companies,
    tradeOperations,
    searchNavigation,
    showTradeOperationModal,
    setShowTradeOperationModal,
    editingTradeOperationId,
    setEditingTradeOperationId,
    newTradeOperation,
    setNewTradeOperation,
    actionLoading,
    onSubmitTradeOperation,
    onReviewTradeOperation,
}: TradeOperationsProps) {
    const isContractor = user.role.includes('Contractor');
    const canReviewRequests = user.role.includes('Compliance') || user.role.includes('Admin');
    const [activeSection, setActiveSection] = useState<'catalog' | 'requests'>(
        isContractor ? 'catalog' : 'requests'
    );
    const [expandedFamilyKey, setExpandedFamilyKey] = useState<TradeOperationFamilyKey | null | undefined>(undefined);

    const [selectedTradeOperation, setSelectedTradeOperation] = useState<TradeOperationRequest | null>(null);
    const [selectedTradeOperationDetail, setSelectedTradeOperationDetail] =
        useState<TradeOperationRequestDetail | null>(null);
    const [tradeOperationStatusLoading, setTradeOperationStatusLoading] = useState(false);
    const [tradeOperationStatusError, setTradeOperationStatusError] = useState<string | null>(null);
    const [showTradeOperationStatusModal, setShowTradeOperationStatusModal] = useState(false);

    const [selectedTradeOperationForReview, setSelectedTradeOperationForReview] =
        useState<TradeOperationRequest | null>(null);
    const [selectedTradeOperationReviewDetail, setSelectedTradeOperationReviewDetail] =
        useState<TradeOperationRequestDetail | null>(null);
    const [tradeOperationReviewLoading, setTradeOperationReviewLoading] = useState(false);
    const [tradeOperationReviewError, setTradeOperationReviewError] = useState<string | null>(null);
    const [showTradeOperationReviewModal, setShowTradeOperationReviewModal] = useState(false);
    const [reviewNote, setReviewNote] = useState('');
    const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
    const [requestSearchQuery, setRequestSearchQuery] = useState('');
    const [requestStatusFilter, setRequestStatusFilter] = useState('All');
    const deferredCatalogSearchQuery = useDeferredValue(catalogSearchQuery);
    const deferredRequestSearchQuery = useDeferredValue(requestSearchQuery);

    const licensedCompanies = companies.filter((company) => Boolean(company.license_no));
    const catalogFamilies = (Object.keys(tradeOperationFamilyCatalog) as Array<keyof typeof tradeOperationFamilyCatalog>)
        .map((familyKey) => {
            const services = tradeOperationServiceOptions
                .map((serviceType) => ({
                    serviceType,
                    definition: getTradeOperationService(serviceType)!,
                    eligibleCompanies: licensedCompanies.filter((company) =>
                        companyCanAccessService(company, serviceType)
                    ),
                }))
                .filter((service) => service.definition.family === familyKey)
                .filter((service) => service.eligibleCompanies.length > 0);

            return {
                key: familyKey,
                ...tradeOperationFamilyCatalog[familyKey],
                services,
            };
        })
        .filter((family) => family.services.length > 0);

    const filteredCatalogFamilies = useMemo(
        () =>
            catalogFamilies
                .map((family) => ({
                    ...family,
                    services: family.services.filter((service) =>
                        matchesSearchQuery(
                            deferredCatalogSearchQuery,
                            family.label,
                            family.description,
                            service.definition.label,
                            service.definition.description,
                            service.definition.familyLabel,
                            service.definition.feeGuidance.join(' '),
                        ),
                    ),
                }))
                .filter((family) => family.services.length > 0),
        [catalogFamilies, deferredCatalogSearchQuery],
    );
    const filteredCatalogServiceCount = filteredCatalogFamilies.reduce(
        (total, family) => total + family.services.length,
        0,
    );
    const requestStatusOptions = useMemo(
        () => [
            'All',
            ...Array.from(
                new Set(tradeOperations.map((request) => getTradeOperationStatusLabel(request)).filter(Boolean)),
            ).sort(),
        ],
        [tradeOperations],
    );
    const filteredTradeOperations = useMemo(
        () =>
            tradeOperations.filter((request) => {
                const statusLabel = getTradeOperationStatusLabel(request);
                const serviceLabel = getTradeOperationService(request.service_type)?.label || request.service_type;
                const matchesQuery = matchesSearchQuery(
                    deferredRequestSearchQuery,
                    request.request_reference,
                    request.company_name,
                    request.company_license_no,
                    request.company_license_type,
                    request.submitted_by_name,
                    request.service_family,
                    serviceLabel,
                    statusLabel,
                );
                const matchesStatus =
                    requestStatusFilter === 'All' || statusLabel === requestStatusFilter;

                return matchesQuery && matchesStatus;
            }),
        [tradeOperations, deferredRequestSearchQuery, requestStatusFilter],
    );

    useEffect(() => {
        if (expandedFamilyKey === undefined) {
            setExpandedFamilyKey(filteredCatalogFamilies[0]?.key ?? null);
            return;
        }

        if (
            expandedFamilyKey !== null &&
            !filteredCatalogFamilies.some((family) => family.key === expandedFamilyKey)
        ) {
            setExpandedFamilyKey(filteredCatalogFamilies[0]?.key ?? null);
        }
    }, [filteredCatalogFamilies, expandedFamilyKey]);

    useEffect(() => {
        if (!searchNavigation) return;

        if (searchNavigation.section === 'requests') {
            setActiveSection('requests');
            setRequestSearchQuery(searchNavigation.query || '');
            return;
        }

        if (isContractor) {
            setActiveSection('catalog');
            setCatalogSearchQuery(searchNavigation.query || '');
        }
    }, [isContractor, searchNavigation]);

    const selectedServiceDefinition = getTradeOperationService(newTradeOperation.serviceType);
    const eligibleCompaniesForSelectedService = selectedServiceDefinition
        ? licensedCompanies.filter((company) =>
            companyCanAccessService(company, newTradeOperation.serviceType)
        )
        : licensedCompanies;

    const openTradeOperationModal = (serviceType?: string) => {
        const nextServiceType = serviceType || '';
        const nextDefinition = getTradeOperationService(nextServiceType);
        const eligibleCompanies = nextDefinition
            ? licensedCompanies.filter((company) =>
                companyCanAccessService(company, nextServiceType)
            )
            : licensedCompanies;

        setEditingTradeOperationId(null);
        setNewTradeOperation({
            ...createInitialTradeOperationForm(),
            serviceType: nextServiceType,
            companyId: eligibleCompanies.length === 1 ? String(eligibleCompanies[0].id) : '',
            documents: mergeTradeOperationDocuments(nextServiceType),
        });
        setShowTradeOperationModal(true);
    };

    const closeTradeOperationModal = () => {
        setShowTradeOperationModal(false);
        setEditingTradeOperationId(null);
        setNewTradeOperation(createInitialTradeOperationForm());
    };

    const updateTradeOperationField = <K extends keyof TradeOperationForm>(
        field: K,
        value: TradeOperationForm[K]
    ) => {
        setNewTradeOperation((current) => {
            if (field === 'serviceType') {
                const nextServiceType = String(value);
                const nextDefinition = getTradeOperationService(nextServiceType);
                const nextEligibleCompanies = nextDefinition
                    ? licensedCompanies.filter((company) =>
                        companyCanAccessService(company, nextServiceType)
                    )
                    : licensedCompanies;
                const currentCompanyStillEligible = nextEligibleCompanies.some(
                    (company) => String(company.id) === current.companyId
                );

                return {
                    ...current,
                    serviceType: nextServiceType,
                    companyId: currentCompanyStillEligible ? current.companyId : '',
                    documents: mergeTradeOperationDocuments(nextServiceType, current.documents),
                };
            }

            return {
                ...current,
                [field]: value,
            };
        });
    };

    const updateDocumentValue = (documentType: string, fileName: string) => {
        setNewTradeOperation((current) => ({
            ...current,
            documents: current.documents.map((document) =>
                document.documentType === documentType
                    ? { ...document, fileName }
                    : document
            ),
        }));
    };

    const fetchTradeOperationDetail = async (requestId: number) => {
        const response = await fetch(`/api/trade-operations/${requestId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(
                await readErrorMessage(response, 'Failed to load trade operation details.')
            );
        }

        return response.json() as Promise<TradeOperationRequestDetail>;
    };

    const openTradeOperationStatusModal = async (request: TradeOperationRequest) => {
        setSelectedTradeOperation(request);
        setSelectedTradeOperationDetail(null);
        setTradeOperationStatusError(null);
        setTradeOperationStatusLoading(true);
        setShowTradeOperationStatusModal(true);

        try {
            const detail = await fetchTradeOperationDetail(request.id);
            setSelectedTradeOperationDetail(detail);
        } catch (error) {
            console.error(error);
            setTradeOperationStatusError(
                error instanceof Error ? error.message : 'Failed to load trade operation status.'
            );
        } finally {
            setTradeOperationStatusLoading(false);
        }
    };

    const openTradeOperationReviewModal = async (request: TradeOperationRequest) => {
        setSelectedTradeOperationForReview(request);
        setSelectedTradeOperationReviewDetail(null);
        setTradeOperationReviewError(null);
        setTradeOperationReviewLoading(true);
        setReviewNote('');
        setShowTradeOperationReviewModal(true);

        try {
            const detail = await fetchTradeOperationDetail(request.id);
            setSelectedTradeOperationReviewDetail(detail);
        } catch (error) {
            console.error(error);
            setTradeOperationReviewError(
                error instanceof Error ? error.message : 'Failed to load trade operation review details.'
            );
        } finally {
            setTradeOperationReviewLoading(false);
        }
    };

    const handleStartResubmission = () => {
        if (!selectedTradeOperationDetail) return;

        setEditingTradeOperationId(selectedTradeOperationDetail.id);
        setNewTradeOperation(toFormStateFromDetail(selectedTradeOperationDetail));
        setShowTradeOperationStatusModal(false);
        setShowTradeOperationModal(true);
    };

    const handleReviewDecision = async (
        decision: 'Approved' | 'Rejected' | 'Returned'
    ) => {
        if (!selectedTradeOperationReviewDetail) return;

        const trimmedNote = reviewNote.trim();

        if (decision === 'Returned' && !trimmedNote) {
            window.alert('Please enter a query note before returning this request.');
            return;
        }

        await onReviewTradeOperation(
            selectedTradeOperationReviewDetail.id,
            decision,
            decision === 'Rejected' ? trimmedNote || undefined : undefined,
            decision === 'Returned' ? trimmedNote : undefined
        );

        setShowTradeOperationReviewModal(false);
        setSelectedTradeOperationReviewDetail(null);
        setSelectedTradeOperationForReview(null);
        setReviewNote('');
    };

    return (
        <section className="bg-white border border-brand-line/10 shadow-sm">
            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-serif">Trade Operations</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                        Service requests for cargo movement, customs control, exports, transfers, and processing
                    </p>
                </div>

                {isContractor && licensedCompanies.length === 0 && (
                    <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-full bg-amber-50 text-amber-700">
                        Licence required before requesting services
                    </span>
                )}
            </div>

            <div className="px-6 pt-5 border-b border-brand-line/10">
                <div className="inline-flex bg-brand-ink/5 p-1 rounded-sm gap-1">
                    {isContractor && (
                        <button
                            type="button"
                            onClick={() => setActiveSection('catalog')}
                            className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${activeSection === 'catalog'
                                ? 'bg-white text-brand-ink shadow-sm'
                                : 'text-brand-ink/50 hover:text-brand-ink'
                                }`}
                        >
                            Service Catalog
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setActiveSection('requests')}
                        className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${activeSection === 'requests'
                            ? 'bg-white text-brand-ink shadow-sm'
                            : 'text-brand-ink/50 hover:text-brand-ink'
                            }`}
                    >
                        {canReviewRequests ? 'Review Queue' : 'My Requests'}
                    </button>
                </div>
            </div>

            {isContractor && activeSection === 'catalog' && (
                <div className="p-6 space-y-6">
                    {licensedCompanies.length === 0 ? (
                        <div className="border border-amber-200 bg-amber-50 p-6">
                            <p className="text-sm font-semibold text-amber-900">
                                No licensed company is available for trade operations yet.
                            </p>
                            <p className="mt-2 text-sm text-amber-800/80">
                                Once one of your company applications completes licence issuance, you will be able to request trade services from this module.
                            </p>
                        </div>
                    ) : (
                        <>
                            <ModuleFilters
                                searchValue={catalogSearchQuery}
                                onSearchChange={setCatalogSearchQuery}
                                searchPlaceholder="Search by workflow family, service name, or fee guide"
                                resultCount={filteredCatalogServiceCount}
                                resultLabel="eligible services"
                            />

                            {filteredCatalogFamilies.map((family) => {
                            const isExpanded = expandedFamilyKey === family.key;

                            return (
                                <section key={family.key} className="border border-brand-line/10">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedFamilyKey((current) =>
                                                current === family.key ? null : family.key
                                            )
                                        }
                                        className="w-full p-6 text-left hover:bg-brand-ink/[0.02] transition-colors"
                                        aria-expanded={isExpanded}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-serif text-brand-ink">
                                                    {family.label}
                                                </h3>
                                                <p className="mt-2 text-sm opacity-65 max-w-3xl">
                                                    {family.description}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="inline-flex items-center whitespace-nowrap text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-full bg-brand-ink/5 text-brand-ink/60">
                                                    {family.services.length} services
                                                </span>
                                                <ChevronDown
                                                    size={18}
                                                    className={`text-brand-ink/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </div>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-6 pb-6 border-t border-brand-line/10">
                                            <div className="pt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                {family.services.map((service) => (
                                                    <article
                                                        key={service.serviceType}
                                                        className="h-full border border-brand-line/10 p-5 bg-brand-ink/[0.02] flex flex-col"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <h4 className="text-sm font-bold uppercase tracking-widest">
                                                                    {service.definition.label}
                                                                </h4>
                                                                <p className="mt-2 text-sm opacity-70">
                                                                    {service.definition.description}
                                                                </p>
                                                            </div>
                                                            <span className="inline-flex items-center whitespace-nowrap text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-brand-ink/5 text-brand-ink/60">
                                                                {service.eligibleCompanies.length} eligible
                                                            </span>
                                                        </div>

                                                        <div className="mt-4 space-y-2 flex-1">
                                                            <p className="text-[10px] uppercase tracking-widest opacity-40">
                                                                SLA / Fee Guide
                                                            </p>
                                                            {service.definition.feeGuidance.map((line) => (
                                                                <p key={line} className="text-xs opacity-65">
                                                                    {line}
                                                                </p>
                                                            ))}
                                                        </div>

                                                        <div className="mt-5 pt-4 border-t border-brand-line/10 flex items-center justify-between gap-4 flex-wrap">
                                                            <p className="text-xs opacity-50">
                                                                Timeline: {service.definition.timeline}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => openTradeOperationModal(service.serviceType)}
                                                                className="bg-brand-ink text-brand-bg px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
                                                            >
                                                                Request Service
                                                            </button>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            );
                            })}
                        </>
                    )}
                </div>
            )}

            {activeSection === 'requests' && (
                <>
                    <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                        <div>
                            <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                                {canReviewRequests
                                    ? 'Submitted trade operation requests awaiting or completing compliance review'
                                    : 'Track the status of the trade service requests submitted for your licensed companies'}
                            </p>
                        </div>

                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                            {filteredTradeOperations.length} Showing
                        </span>
                    </div>

                    <ModuleFilters
                        searchValue={requestSearchQuery}
                        onSearchChange={setRequestSearchQuery}
                        searchPlaceholder="Search by company, reference, service, submitter, or status"
                        selects={[
                            {
                                label: 'Status',
                                value: requestStatusFilter,
                                options: requestStatusOptions.map((option) => ({ label: option, value: option })),
                                onChange: setRequestStatusFilter,
                            },
                        ]}
                        resultCount={filteredTradeOperations.length}
                        resultLabel="matching requests"
                    />

                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-ink/5">
                                <th className="p-4 col-header">Reference</th>
                                <th className="p-4 col-header">Company</th>
                                <th className="p-4 col-header">Service</th>
                                {canReviewRequests && <th className="p-4 col-header">Submitted By</th>}
                                <th className="p-4 col-header">Submitted</th>
                                <th className="p-4 col-header">Status</th>
                                <th className="p-4 col-header">Last Action</th>
                                {canReviewRequests && <th className="p-4 col-header">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTradeOperations.map((request) => {
                                const statusLabel = getTradeOperationStatusLabel(request);
                                const serviceDefinition = getTradeOperationService(request.service_type);
                                const canActOnRequest = canReviewRequests && request.status === 'Submitted';
                                const rowTone = getTradeOperationStatusTone(statusLabel);

                                return (
                                    <tr
                                        key={request.id}
                                        className={`data-row ${!canReviewRequests ? 'cursor-pointer hover:bg-brand-ink/5 focus:outline-none focus:bg-brand-ink/5' : ''}`}
                                        onClick={
                                            !canReviewRequests
                                                ? () => void openTradeOperationStatusModal(request)
                                                : undefined
                                        }
                                        onKeyDown={
                                            !canReviewRequests
                                                ? (event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        void openTradeOperationStatusModal(request);
                                                    }
                                                }
                                                : undefined
                                        }
                                        tabIndex={!canReviewRequests ? 0 : -1}
                                        role={!canReviewRequests ? 'button' : undefined}
                                    >
                                        <td className="p-4 text-xs font-mono">{request.request_reference}</td>
                                        <td className="p-4 text-sm font-bold">{request.company_name}</td>
                                        <td className="p-4 text-xs opacity-70">
                                            {serviceDefinition?.label || request.service_type}
                                        </td>
                                        {canReviewRequests && (
                                            <td className="p-4 text-xs opacity-70">{request.submitted_by_name || '--'}</td>
                                        )}
                                        <td className="p-4 text-xs opacity-60">{formatDisplayDate(request.submitted_at)}</td>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${toneClasses[rowTone]}`}>
                                                {statusLabel}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs opacity-60">
                                            {formatDisplayDate(getLastActionDate(request))}
                                        </td>
                                        {canReviewRequests && (
                                            <td className="p-4">
                                                {canActOnRequest ? (
                                                    <button
                                                        type="button"
                                                        disabled={actionLoading}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void openTradeOperationReviewModal(request);
                                                        }}
                                                        className="border border-brand-line/20 px-3 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 disabled:opacity-50"
                                                    >
                                                        Review
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] uppercase tracking-widest opacity-30">
                                                        No action
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {filteredTradeOperations.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={canReviewRequests ? 8 : 7}
                                        className="p-8 text-center  opacity-40"
                                    >
                                        {tradeOperations.length === 0
                                            ? 'No trade operation requests available yet.'
                                            : 'No trade operation requests match the current filters.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </>
            )}

            {showTradeOperationModal && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 overflow-y-auto p-4">
                    <div className="min-h-full flex items-start justify-center py-4">
                        <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                        {editingTradeOperationId ? 'Resubmit Trade Request' : 'New Trade Request'}
                                    </p>
                                    <h2 className="text-2xl font-serif  text-brand-ink mt-2">
                                        {selectedServiceDefinition?.label || 'Trade Operations'}
                                    </h2>
                                    <p className="text-sm opacity-60 mt-3 max-w-3xl">
                                        {selectedServiceDefinition?.description ||
                                            'Submit a trade operation request for compliance review.'}
                                    </p>
                                </div>
                                <button type="button" onClick={closeTradeOperationModal}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form className="mt-8 space-y-8" onSubmit={(event) => void onSubmitTradeOperation(event)}>
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="col-header"><span style={{ fontStyle: 'normal' }}>Licensed Company</span></label>
                                        <select
                                            value={newTradeOperation.companyId}
                                            onChange={(event) => updateTradeOperationField('companyId', event.target.value)}
                                            disabled={editingTradeOperationId !== null}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none disabled:opacity-60"
                                        >
                                            <option value="">Select company</option>
                                            {eligibleCompaniesForSelectedService.map((company) => (
                                                <option key={company.id} value={company.id}>
                                                    {company.name} {company.license_no ? `(${company.license_no})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="col-header"><span style={{ fontStyle: 'normal' }}>Service Requested</span></label>
                                        <select
                                            value={newTradeOperation.serviceType}
                                            onChange={(event) => updateTradeOperationField('serviceType', event.target.value)}
                                            disabled={editingTradeOperationId !== null}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none disabled:opacity-60"
                                        >
                                            <option value="">Select service</option>
                                            {tradeOperationServiceOptions.map((serviceType) => {
                                                const definition = getTradeOperationService(serviceType);
                                                const eligibleCount = licensedCompanies.filter((company) =>
                                                    companyCanAccessService(company, serviceType)
                                                ).length;

                                                if (!definition || eligibleCount === 0) {
                                                    return null;
                                                }

                                                return (
                                                    <option key={serviceType} value={serviceType}>
                                                        {definition.label}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </section>

                                {selectedServiceDefinition && (
                                    <section className="border border-brand-line/10 p-5 bg-brand-ink/[0.02]">
                                        <div className="flex items-start justify-between gap-4 flex-wrap">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest opacity-40">
                                                    SLA Snapshot
                                                </p>
                                                <p className="mt-3 text-sm opacity-70">
                                                    Timeline: {selectedServiceDefinition.timeline}
                                                </p>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-brand-ink/5 text-brand-ink/60">
                                                {getTradeOperationFamiliesForLicense(
                                                    licensedCompanies.find(
                                                        (company) => String(company.id) === newTradeOperation.companyId
                                                    )?.license_type
                                                ).find((family) =>
                                                    family.services.some(
                                                        (service) => service.serviceType === newTradeOperation.serviceType
                                                    )
                                                )?.label || selectedServiceDefinition.familyLabel}
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {selectedServiceDefinition.feeGuidance.map((line) => (
                                                <p key={line} className="text-xs opacity-65">
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <section className="border border-brand-line/10 p-5 bg-brand-ink/[0.02] space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Cover Request
                                        </h3>
                                        <p className="mt-2 text-sm opacity-65">
                                            Upload the required supporting documents below and use this short cover note to specifiy what should be reviewed or approved.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="col-header"><span style={{ fontStyle: 'normal' }}>Request Summary / Cover Note</span></label>
                                        <textarea
                                            value={newTradeOperation.requestSummary}
                                            onChange={(event) => updateTradeOperationField('requestSummary', event.target.value)}
                                            className="w-full bg-white border border-brand-line/10 p-3 text-sm h-32 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                            placeholder="Briefly state the request, the context, and any important reference details the reviewer should know. The uploaded documents will carry the full supporting information."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="col-header"><span style={{ fontStyle: 'normal' }}>Requested Completion Date</span></label>
                                            <input
                                                type="date"
                                                value={newTradeOperation.requestedCompletionDate}
                                                onChange={(event) => updateTradeOperationField('requestedCompletionDate', event.target.value)}
                                                className="w-full bg-white border border-brand-line/10 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="border border-brand-line/10 bg-white p-4">
                                            <p className="text-[10px] uppercase tracking-widest opacity-40">
                                                Note
                                            </p>
                                            <p className="mt-2 text-sm opacity-65">
                                                If this service needs shipment references, transfer references, or facility details, include them in the cover note or the uploaded documents for now.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Supporting Documents
                                        </h3>
                                        <p className="mt-2 text-sm opacity-65">
                                            For this prototype, enter the filename or reference for each required document.
                                        </p>
                                    </div>

                                    {getTradeOperationDocumentRequirements(newTradeOperation.serviceType).length === 0 ? (
                                        <div className="border border-brand-line/10 p-5 text-sm  opacity-50">
                                            Select a trade operation service to see the required documents.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {getTradeOperationDocumentRequirements(newTradeOperation.serviceType).map((requirement) => (
                                                <div key={requirement.documentType} className="border border-brand-line/10 p-4">
                                                    <p className="text-sm font-semibold text-brand-ink">
                                                        {requirement.label}
                                                    </p>
                                                    <p className="mt-1 text-xs opacity-60">
                                                        {requirement.description}
                                                    </p>
                                                    <input
                                                        type="text"
                                                        value={
                                                            newTradeOperation.documents.find(
                                                                (document) => document.documentType === requirement.documentType
                                                            )?.fileName || ''
                                                        }
                                                        onChange={(event) =>
                                                            updateDocumentValue(requirement.documentType, event.target.value)
                                                        }
                                                        className="mt-3 w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                                        placeholder={requirement.placeholder}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeTradeOperationModal}
                                        className="border border-brand-line/20 px-4 py-3 text-[10px] uppercase tracking-widest font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="bg-brand-ink text-brand-bg px-4 py-3 text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                                    >
                                        {editingTradeOperationId ? 'Resubmit Request' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showTradeOperationStatusModal && selectedTradeOperation && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 overflow-y-auto p-4">
                    <div className="min-h-full flex items-start justify-center py-4">
                        <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                        Trade Request Status
                                    </p>
                                    <h2 className="text-2xl font-serif  text-brand-ink mt-2">
                                        {selectedTradeOperation.company_name}
                                    </h2>
                                    <p className="text-xs font-mono opacity-50 mt-2">
                                        {selectedTradeOperation.request_reference}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {selectedTradeOperationDetail && (
                                        <button
                                            type="button"
                                            onClick={() => printTradeOperationSummary(selectedTradeOperationDetail)}
                                            className={printActionButtonClassName}
                                        >
                                            <Printer size={14} />
                                            Print Request Summary
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setShowTradeOperationStatusModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {tradeOperationStatusLoading && (
                                <div className="py-10 text-center">
                                    <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm  opacity-50">
                                        Loading trade request history...
                                    </p>
                                </div>
                            )}

                            {!tradeOperationStatusLoading && tradeOperationStatusError && (
                                <div className="mt-8 border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                    {tradeOperationStatusError}
                                </div>
                            )}

                            {!tradeOperationStatusLoading && !tradeOperationStatusError && (
                                <div className="mt-8 space-y-6">
                                    {(() => {
                                        const requestForStatus = selectedTradeOperationDetail || selectedTradeOperation;
                                        const requestDetail = selectedTradeOperationDetail;
                                        const statusLabel = getTradeOperationStatusLabel(requestForStatus);
                                        const tone = getTradeOperationStatusTone(statusLabel);
                                        const serviceDefinition = getTradeOperationService(requestForStatus.service_type);

                                        return (
                                            <>
                                                <div className={`border p-5 ${tone === 'rose' ? 'border-rose-200 bg-rose-50/50' : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                                        <p className="text-[10px] uppercase tracking-widest opacity-50">
                                                            Current Status
                                                        </p>
                                                        <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${toneClasses[tone]}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </div>

                                                    <p className="mt-4 text-sm text-brand-ink">
                                                        {requestForStatus.status === 'Approved' &&
                                                            'Compliance has approved this trade operation request.'}
                                                        {requestForStatus.status === 'Returned' &&
                                                            'Compliance has queried this request and is waiting for your corrections before review can continue.'}
                                                        {requestForStatus.status === 'Rejected' &&
                                                            'This trade operation request was rejected during compliance review.'}
                                                        {requestForStatus.status === 'Submitted' &&
                                                            'This request is awaiting compliance review.'}
                                                    </p>
                                                </div>

                                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <DetailItem label="Service" value={serviceDefinition?.label || requestForStatus.service_type} />
                                                    <DetailItem label="Family" value={serviceDefinition?.familyLabel || requestForStatus.service_family} />
                                                    <DetailItem label="Company Licence No." value={requestForStatus.company_license_no} mono />
                                                    <DetailItem label="Submitted On" value={formatDisplayDateTime(requestForStatus.submitted_at)} />
                                                    <DetailItem label="Last Action" value={formatDisplayDateTime(getLastActionDate(requestForStatus))} />
                                                    <DetailItem label="Requested Completion Date" value={formatDisplayDate(requestDetail?.requested_completion_date)} />
                                                    <DetailItem
                                                        label="Latest Query Note"
                                                        value={requestForStatus.query_note}
                                                        preserveWhitespace
                                                        className="md:col-span-2"
                                                    />
                                                    <DetailItem
                                                        label="Rejection Reason"
                                                        value={requestForStatus.rejection_reason}
                                                        preserveWhitespace
                                                        className="md:col-span-2"
                                                    />
                                                </dl>

                                                {requestDetail && (
                                                    <>
                                                        <section className="space-y-4">
                                                            <div>
                                                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                                    Cover Request
                                                                </h3>
                                                            </div>
                                                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <DetailItem
                                                                    label="Request Summary / Cover Note"
                                                                    value={requestDetail.operation_summary || requestDetail.goods_description}
                                                                    preserveWhitespace
                                                                    className="md:col-span-2"
                                                                />
                                                                <DetailItem
                                                                    label="Requested Completion Date"
                                                                    value={formatDisplayDate(requestDetail.requested_completion_date)}
                                                                />
                                                            </dl>
                                                        </section>

                                                        <section className="space-y-4">
                                                            <div>
                                                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                                    Supporting Documents
                                                                </h3>
                                                            </div>
                                                            <DocumentChecklist
                                                                serviceType={requestDetail.service_type}
                                                                documents={requestDetail.documents}
                                                            />
                                                        </section>
                                                    </>
                                                )}

                                                <section className="space-y-4">
                                                    <div>
                                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                            Workflow Log
                                                        </h3>
                                                    </div>
                                                    <WorkflowLog events={selectedTradeOperationDetail?.events} />
                                                </section>

                                                {requestForStatus.status === 'Returned' && isContractor && (
                                                    <div className="flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={handleStartResubmission}
                                                            className="bg-brand-ink text-brand-bg px-4 py-3 text-[10px] font-bold uppercase tracking-widest"
                                                        >
                                                            Edit & Resubmit
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showTradeOperationReviewModal && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 overflow-y-auto p-4">
                    <div className="min-h-full flex items-start justify-center py-4">
                        <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                        Compliance Review
                                    </p>
                                    <h2 className="text-2xl font-serif  text-brand-ink mt-2">
                                        {selectedTradeOperationForReview?.company_name}
                                    </h2>
                                    <p className="text-xs font-mono opacity-50 mt-2">
                                        {selectedTradeOperationForReview?.request_reference}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {selectedTradeOperationReviewDetail && (
                                        <button
                                            type="button"
                                            onClick={() => printTradeOperationSummary(selectedTradeOperationReviewDetail)}
                                            className={printActionButtonClassName}
                                        >
                                            <Printer size={14} />
                                            Print Request Summary
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setShowTradeOperationReviewModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {tradeOperationReviewLoading && (
                                <div className="py-16 text-center">
                                    <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm  opacity-50">
                                        Loading trade request details for review...
                                    </p>
                                </div>
                            )}

                            {!tradeOperationReviewLoading && tradeOperationReviewError && (
                                <div className="mt-8 border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                    {tradeOperationReviewError}
                                </div>
                            )}

                            {!tradeOperationReviewLoading && !tradeOperationReviewError && selectedTradeOperationReviewDetail && (
                                <div className="mt-8 space-y-8">
                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Request Overview
                                            </h3>
                                        </div>
                                        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <DetailItem label="Reference" value={selectedTradeOperationReviewDetail.request_reference} mono />
                                            <DetailItem label="Company" value={selectedTradeOperationReviewDetail.company_name} />
                                            <DetailItem label="Status" value={getTradeOperationStatusLabel(selectedTradeOperationReviewDetail)} />
                                            <DetailItem
                                                label="Service"
                                                value={getTradeOperationService(selectedTradeOperationReviewDetail.service_type)?.label || selectedTradeOperationReviewDetail.service_type}
                                            />
                                            <DetailItem
                                                label="Family"
                                                value={getTradeOperationService(selectedTradeOperationReviewDetail.service_type)?.familyLabel || selectedTradeOperationReviewDetail.service_family}
                                            />
                                            <DetailItem label="Company Licence No." value={selectedTradeOperationReviewDetail.company_license_no} mono />
                                            <DetailItem label="Submitted By" value={selectedTradeOperationReviewDetail.submitted_by_name} />
                                            <DetailItem label="Submitted At" value={formatDisplayDateTime(selectedTradeOperationReviewDetail.submitted_at)} />
                                            <DetailItem label="Requested Completion Date" value={formatDisplayDate(selectedTradeOperationReviewDetail.requested_completion_date)} />
                                            <DetailItem
                                                label="Latest Query Note"
                                                value={selectedTradeOperationReviewDetail.query_note}
                                                preserveWhitespace
                                                className="md:col-span-3"
                                            />
                                            <DetailItem
                                                label="Rejection Reason"
                                                value={selectedTradeOperationReviewDetail.rejection_reason}
                                                preserveWhitespace
                                                className="md:col-span-3"
                                            />
                                        </dl>
                                    </section>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Cover Request
                                            </h3>
                                        </div>
                                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <DetailItem
                                                label="Request Summary / Cover Note"
                                                value={selectedTradeOperationReviewDetail.operation_summary || selectedTradeOperationReviewDetail.goods_description}
                                                preserveWhitespace
                                                className="md:col-span-2"
                                            />
                                            <DetailItem
                                                label="Requested Completion Date"
                                                value={formatDisplayDate(selectedTradeOperationReviewDetail.requested_completion_date)}
                                            />
                                        </dl>
                                    </section>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Supporting Documents
                                            </h3>
                                        </div>
                                        <DocumentChecklist
                                            serviceType={selectedTradeOperationReviewDetail.service_type}
                                            documents={selectedTradeOperationReviewDetail.documents}
                                        />
                                    </section>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Workflow Log
                                            </h3>
                                        </div>
                                        <WorkflowLog events={selectedTradeOperationReviewDetail.events} />
                                    </section>

                                    <div className="border-t border-brand-line/10 pt-6 space-y-4">
                                        <div className="space-y-2">
                                            <label className="col-header">Compliance Note</label>
                                            <textarea
                                                value={reviewNote}
                                                onChange={(event) => setReviewNote(event.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                                placeholder="Use this note when querying the contractor or when rejecting the request."
                                            />
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-3">
                                            <button
                                                type="button"
                                                disabled={actionLoading}
                                                onClick={() => void handleReviewDecision('Approved')}
                                                className="bg-emerald-600 text-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actionLoading}
                                                onClick={() => void handleReviewDecision('Returned')}
                                                className="border border-amber-200 text-amber-800 px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                            >
                                                Query
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actionLoading}
                                                onClick={() => void handleReviewDecision('Rejected')}
                                                className="border border-rose-200 text-rose-700 px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
