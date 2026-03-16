import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Printer, X } from 'lucide-react';
import {
    Company,
    CompanyApplication,
    CompanyApplicationDocument,
    CompanyApplicationEvent,
    CompanyApplicationDetail,
    CompanyDetail,
    User,
} from '@/middleware/types.middleware';
import { createInitialCompanyApplicationForm } from '@/src/hooks/appInitialState';
import {
    activityDescriptionOptions,
    CompanyApplicationDocumentDraft,
    freeZoneLocationOptions,
    getCompanyApplicationDocumentRequirements,
    getLicenseFeeSchedule,
    incorporationTypeOptions,
    licenseTypeOptions,
    mergeCompanyApplicationDocuments,
} from '@/src/constants/companyApplication';
import type { CompanyApplicationForm } from '@/src/types/appFormTypes';
import {
    printCompanyApplicationSummary,
    printCompanyRecord,
    printLicenceCertificate,
    printLicencePaymentReceipt,
    printStructuredReport,
} from '@/src/utils/printDocuments';
import ModuleFilters from '@/src/components/ModuleFilters';
import { matchesSearchQuery, type ModuleSearchTarget } from '@/src/utils/globalSearch';

type NewCompanyForm = CompanyApplicationForm;
type CompanyManagementSection = 'registered' | 'applications';
type ApplicationStatusTone = 'emerald' | 'rose' | 'amber';

const printActionButtonClassName = 'inline-flex items-center gap-2 border border-brand-line/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-ink/5 transition-colors';

const formatUsd = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return '--';

    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return '--';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue);
};

type DetailItemProps = {
    label: string;
    value?: string | number | null;
    mono?: boolean;
    preserveWhitespace?: boolean;
    className?: string;
};

const formatDetailValue = (value?: string | number | null) => {
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : '--';
    }

    return '--';
};

const DetailItem = ({
    label,
    value,
    mono = false,
    preserveWhitespace = false,
    className = '',
}: DetailItemProps) => (
    <div className={className}>
        <dt className="text-[10px] uppercase tracking-widest opacity-40">{label}</dt>
        <dd
            className={`mt-1 text-sm text-brand-ink ${mono ? 'font-mono' : ''} ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}
        >
            {formatDetailValue(value)}
        </dd>
    </div>
);

const toInputValue = (value?: string | number | null) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const toDateInputValue = (value?: string | null) => {
    if (!value) return '';

    const normalized = new Date(value);
    if (Number.isNaN(normalized.getTime())) return '';

    return normalized.toISOString().split('T')[0];
};

const formatWorkflowStatusValue = (value?: string | null) => {
    if (!value) return '--';
    if (value === 'Returned') return 'Queried';
    if (value === 'Awaiting Admin Approval') return 'Awaiting MD Approval';
    if (value === 'Approved Pending Payment') return 'Awaiting Contractor Payment';
    if (value === 'Payment Submitted') return 'Awaiting Payment Confirmation';
    if (value === 'Licence Issued') return 'Licence Issued';
    if (value === 'Approved') return 'Approved by MD';
    if (value === 'Submitted' || value === 'Under Review' || value === 'Draft') {
        return 'Awaiting Compliance Review';
    }

    return value;
};

const getApplicationEventLabel = (eventType: string) => {
    if (eventType === 'Submitted') return 'Application Submitted';
    if (eventType === 'Resubmitted') return 'Application Resubmitted';
    if (eventType === 'ForwardedToAdmin') return 'Forwarded to MD';
    if (eventType === 'PaymentSubmitted') return 'Payment Submitted';
    if (eventType === 'ReturnedForRevision') return 'Queried by Compliance';
    if (eventType === 'RejectedByCompliance') return 'Rejected by Compliance';
    if (eventType === 'RejectedByAdmin') return 'Rejected by MD';
    if (eventType === 'ApprovedByAdmin') return 'Approved by MD';
    if (eventType === 'LicenseIssued') return 'Licence Issued';

    return eventType;
};

const LicenseFeeSummary = ({
    licenseType,
    totalOverride,
}: {
    licenseType?: string | null;
    totalOverride?: string | number | null;
}) => {
    const feeSchedule = getLicenseFeeSchedule(licenseType);

    if (!feeSchedule) {
        return (
            <div className="border border-dashed border-brand-line/20 p-4 text-sm  opacity-50">
                Select a licence type to view the prescribed fee schedule.
            </div>
        );
    }

    return (
        <div className="border border-brand-line/10 bg-brand-ink/[0.02] p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-brand-ink">{feeSchedule.licenseType}</p>
                    <p className="mt-1 text-xs opacity-55 max-w-2xl">{feeSchedule.timeline}</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-brand-ink/5 px-2 py-1 rounded-full">
                    Total {formatUsd(totalOverride ?? feeSchedule.totalUsd)}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {feeSchedule.lineItems.map((item) => (
                    <div
                        key={`${feeSchedule.licenseType}-${item.label}`}
                        className="flex items-center justify-between gap-3 border border-brand-line/10 bg-white px-3 py-3 text-sm"
                    >
                        <span className="opacity-70">{item.label}</span>
                        <span className="font-mono font-bold text-brand-ink">{formatUsd(item.amountUsd)}</span>
                    </div>
                ))}
            </div>

            <p className="text-xs opacity-55">{feeSchedule.paymentNote}</p>
        </div>
    );
};

const ApplicationEventLog = ({
    events,
    formatDisplayDateTime,
}: {
    events?: CompanyApplicationEvent[];
    formatDisplayDateTime: (value?: string | null) => string;
}) => {
    if (!events?.length) {
        return (
            <div className="border border-dashed border-brand-line/20 p-4 text-sm  opacity-50">
                No workflow activity has been logged for this application yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {events.map((event) => (
                <div key={event.id} className="border border-brand-line/10 p-4 bg-brand-ink/[0.02]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-45">
                                {getApplicationEventLabel(event.event_type)}
                            </p>
                            <p className="mt-2 text-sm text-brand-ink">
                                {event.actor_name || 'System'}
                                {event.actor_role ? ` · ${event.actor_role}` : ''}
                            </p>
                        </div>
                        <p className="text-[10px] font-mono opacity-45">
                            {formatDisplayDateTime(event.created_at)}
                        </p>
                    </div>

                    {(event.from_status || event.to_status) && (
                        <p className="mt-3 text-xs opacity-60">
                            {formatWorkflowStatusValue(event.from_status)} → {formatWorkflowStatusValue(event.to_status)}
                        </p>
                    )}

                    {event.note && (
                        <p className="mt-3 text-sm whitespace-pre-wrap text-brand-ink">
                            {event.note}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
};

const getDocumentFileNameMap = (documents: CompanyApplicationDocument[] = []) => (
    new Map(documents.map((document) => [document.document_type, document.file_name]))
);

const ApplicationDocumentChecklist = ({
    incorporationType,
    documents,
}: {
    incorporationType?: string | null;
    documents?: CompanyApplicationDocument[];
}) => {
    const requirements = getCompanyApplicationDocumentRequirements(incorporationType);
    const fileNameByType = getDocumentFileNameMap(documents);

    if (requirements.length === 0) {
        return (
            <div className="border border-dashed border-brand-line/20 p-4 text-sm  opacity-50">
                Select an incorporation type to view the required supporting documents.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {requirements.map((requirement) => {
                const fileName = fileNameByType.get(requirement.documentType)?.trim() || '';
                const derivedRequirement = requirement.inputKind === 'derived';
                const optionalRequirement = requirement.required === false;
                const uploaded = derivedRequirement || fileName.length > 0;
                const badgeClasses = derivedRequirement || uploaded
                    ? 'bg-emerald-50 text-emerald-700'
                    : optionalRequirement
                        ? 'bg-brand-ink/5 text-brand-ink/70'
                        : 'bg-amber-50 text-amber-700';
                const badgeLabel = derivedRequirement
                    ? 'Included in Form'
                    : uploaded
                        ? 'Provided'
                        : optionalRequirement
                            ? 'Optional'
                            : 'Missing';

                return (
                    <div key={requirement.documentType} className="border border-brand-line/10 p-4 bg-brand-ink/[0.02]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-brand-ink">{requirement.label}</p>
                                <p className="mt-1 text-xs opacity-55">
                                    {requirement.description}
                                </p>
                            </div>
                            <span
                                className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${badgeClasses}`}
                            >
                                {badgeLabel}
                            </span>
                        </div>

                        <p className="mt-3 text-sm font-mono opacity-70">
                            {derivedRequirement
                                ? 'Captured through the company and contact information already entered in the form.'
                                : uploaded
                                    ? fileName
                                    : optionalRequirement
                                        ? 'Optional document not provided yet.'
                                        : 'Prototype placeholder not provided yet.'}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

const mapApplicationDetailToForm = (application: CompanyApplicationDetail): NewCompanyForm => ({
    companyName: application.company_name || '',
    incorporationType: application.incorporation_type || '',
    freeZoneLocation: application.free_zone_location || '',
    requestedLicenseType: application.requested_license_type || '',
    globalHeadOfficeAddress: application.global_head_office_address || '',
    globalPhone1: application.global_phone_1 || '',
    globalEmail: application.global_email || '',
    globalPhone2: application.global_phone_2 || '',
    globalWebsite: application.global_website || '',
    nigeriaOfficeAddress: application.nigeria_office_address || '',
    nigeriaPhone1: application.nigeria_phone_1 || '',
    nigeriaEmail: application.nigeria_email || '',
    nigeriaPhone2: application.nigeria_phone_2 || '',
    nigeriaWebsite: application.nigeria_website || '',
    primaryContactName: application.primary_contact_name || '',
    primaryContactDesignation: application.primary_contact_designation || '',
    primaryContactPhone: application.primary_contact_phone || '',
    primaryContactEmail: application.primary_contact_email || '',
    secondaryContactName: application.secondary_contact_name || '',
    secondaryContactDesignation: application.secondary_contact_designation || '',
    secondaryContactPhone: application.secondary_contact_phone || '',
    secondaryContactEmail: application.secondary_contact_email || '',
    presentBusinessOperations: application.present_business_operations || '',
    dprRegistrationNumber: application.dpr_registration_number || '',
    activityDescription: application.activity_description || '',
    countriesOfOperationWestAfrica: application.countries_of_operation_west_africa || '',
    proposedBusinessActivity: application.proposed_business_activity || '',
    undevelopedLandSqm: toInputValue(application.undeveloped_land_sqm),
    developedLandSqm: toInputValue(application.developed_land_sqm),
    concreteStackingAreaSqm: toInputValue(application.concrete_stacking_area_sqm),
    warehouseSpaceSqm: toInputValue(application.warehouse_space_sqm),
    factoryPremisesSqm: toInputValue(application.factory_premises_sqm),
    officeAccommodationSqm: toInputValue(application.office_accommodation_sqm),
    equipmentRequirement: application.equipment_requirement || '',
    residentialAccommodationPersonnelCount: toInputValue(application.residential_accommodation_personnel_count),
    importsSummary: application.imports_summary || '',
    exportsSummary: application.exports_summary || '',
    proposedCommencementDate: toDateInputValue(application.proposed_commencement_date),
    declarationName: application.declaration_name || '',
    declarationDesignation: application.declaration_designation || '',
    declarationSignatureDate: toDateInputValue(application.declaration_signature_date),
    documents: mergeCompanyApplicationDocuments(
        application.incorporation_type,
        (application.documents || []).map((document) => ({
            documentType: document.document_type as CompanyApplicationDocumentDraft['documentType'],
            fileName: document.file_name || '',
        }))
    ),
});

type CompaniesProps = {
    token: string | null;
    user: User;
    companies: Company[];
    companyApplications: CompanyApplication[];
    searchNavigation?: ModuleSearchTarget | null;
    showRegModal: boolean;
    setShowRegModal: (value: boolean) => void;
    editingCompanyApplicationId: number | null;
    setEditingCompanyApplicationId: (value: number | null) => void;
    newCompany: NewCompanyForm;
    setNewCompany: (value: NewCompanyForm) => void;
    actionLoading: boolean;
    onRegisterCompany: (e: React.FormEvent) => void;
    onReviewApplication: (
        applicationId: number,
        decision: 'Approved' | 'Rejected' | 'Returned',
        rejectionReason?: string,
        queryNote?: string,
        approvedLicenseType?: string
    ) => void;
    onConfirmApplicationPayment: (
        applicationId: number,
        paymentReference?: string,
        approvedLicenseType?: string
    ) => void;
    onSubmitApplicationPayment: (
        applicationId: number,
        paymentReference: string
    ) => void;
};

export default function Companies({
    token,
    user,
    companies,
    companyApplications,
    searchNavigation,
    showRegModal,
    setShowRegModal,
    editingCompanyApplicationId,
    setEditingCompanyApplicationId,
    newCompany,
    setNewCompany,
    actionLoading,
    onRegisterCompany,
    onReviewApplication,
    onConfirmApplicationPayment,
    onSubmitApplicationPayment,
}: CompaniesProps) {
    const roles = user.role.split(',').map((role) => role.trim());
    const [activeSection, setActiveSection] = useState<CompanyManagementSection>('registered');
    const [showCompanyDetailModal, setShowCompanyDetailModal] = useState(false);
    const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null);
    const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<CompanyDetail | null>(null);
    const [companyDetailLoading, setCompanyDetailLoading] = useState(false);
    const [companyDetailError, setCompanyDetailError] = useState<string | null>(null);
    const [showApplicationStatusModal, setShowApplicationStatusModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<CompanyApplication | null>(null);
    const [selectedApplicationStatusDetail, setSelectedApplicationStatusDetail] = useState<CompanyApplicationDetail | null>(null);
    const [applicationStatusLoading, setApplicationStatusLoading] = useState(false);
    const [applicationStatusError, setApplicationStatusError] = useState<string | null>(null);
    const [contractorPaymentReference, setContractorPaymentReference] = useState('');
    const [showApplicationReviewModal, setShowApplicationReviewModal] = useState(false);
    const [selectedApplicationName, setSelectedApplicationName] = useState<string | null>(null);
    const [selectedApplicationDetail, setSelectedApplicationDetail] = useState<CompanyApplicationDetail | null>(null);
    const [applicationDetailLoading, setApplicationDetailLoading] = useState(false);
    const [applicationDetailError, setApplicationDetailError] = useState<string | null>(null);
    const [complianceReviewNote, setComplianceReviewNote] = useState('');
    const [adminApprovedLicenseType, setAdminApprovedLicenseType] = useState('');
    const [adminPaymentReference, setAdminPaymentReference] = useState('');
    const [registeredSearchQuery, setRegisteredSearchQuery] = useState('');
    const [registeredStatusFilter, setRegisteredStatusFilter] = useState('All');
    const [applicationSearchQuery, setApplicationSearchQuery] = useState('');
    const [applicationStatusFilter, setApplicationStatusFilter] = useState('All');
    const canRegisterCompanies = roles.includes('Contractor');
    const isContractorOnly = canRegisterCompanies && roles.length === 1;
    const canExportRegistryReport = !isContractorOnly;
    const isAdminReviewer = roles.includes('Admin');
    const isComplianceReviewer = roles.includes('Compliance') && !isAdminReviewer;
    const canReviewApplications = isAdminReviewer || isComplianceReviewer;
    const canResubmitApplications = canRegisterCompanies && !canReviewApplications;
    const currentDocumentRequirements = getCompanyApplicationDocumentRequirements(newCompany.incorporationType);
    const requestedLicenseFeeSchedule = getLicenseFeeSchedule(newCompany.requestedLicenseType);
    const deferredRegisteredSearchQuery = useDeferredValue(registeredSearchQuery);
    const deferredApplicationSearchQuery = useDeferredValue(applicationSearchQuery);

    useEffect(() => {
        if (!selectedApplicationDetail) {
            setAdminApprovedLicenseType('');
            setAdminPaymentReference('');
            return;
        }

        setAdminApprovedLicenseType(
            selectedApplicationDetail.approved_license_type ||
            selectedApplicationDetail.requested_license_type ||
            ''
        );
        setAdminPaymentReference(selectedApplicationDetail.payment_reference || '');
    }, [selectedApplicationDetail]);

    useEffect(() => {
        if (!selectedApplicationStatusDetail) {
            setContractorPaymentReference('');
            return;
        }

        setContractorPaymentReference(selectedApplicationStatusDetail.payment_reference || '');
    }, [selectedApplicationStatusDetail]);

    useEffect(() => {
        if (!searchNavigation) return;

        if (searchNavigation.section === 'applications') {
            setActiveSection('applications');
            setApplicationSearchQuery(searchNavigation.query || '');
            return;
        }

        setActiveSection('registered');
        setRegisteredSearchQuery(searchNavigation.query || '');
    }, [searchNavigation]);
    const updateCompanyField = <K extends keyof NewCompanyForm>(field: K, value: NewCompanyForm[K]) => {
        if (field === 'incorporationType') {
            const nextIncorporationType = String(value);
            setNewCompany({
                ...newCompany,
                incorporationType: nextIncorporationType,
                documents: mergeCompanyApplicationDocuments(nextIncorporationType, newCompany.documents),
            });
            return;
        }

        setNewCompany({ ...newCompany, [field]: value });
    };
    const updateCompanyDocument = (
        documentType: CompanyApplicationDocumentDraft['documentType'],
        fileName: string
    ) => {
        setNewCompany({
            ...newCompany,
            documents: newCompany.documents.map((document) => (
                document.documentType === documentType
                    ? { ...document, fileName }
                    : document
            )),
        });
    };
    const getDraftDocumentValue = (documentType: CompanyApplicationDocumentDraft['documentType']) => (
        newCompany.documents.find((document) => document.documentType === documentType)?.fileName || ''
    );
    const formatDisplayDate = (value?: string | null) => (
        value ? new Date(value).toLocaleDateString() : '--'
    );
    const formatDisplayDateTime = (value?: string | null) => (
        value ? new Date(value).toLocaleString() : '--'
    );
    const getLastActionDate = (application: CompanyApplication) => (
        application.payment_confirmed_at ||
        application.payment_submitted_at ||
        application.approved_at ||
        application.rejected_at ||
        application.resubmitted_at ||
        application.returned_at ||
        application.reviewed_at ||
        null
    );
    const getApplicationStatusLabel = (application: CompanyApplication) => {
        if (application.status === 'Rejected') return 'Rejected';
        if (application.status === 'Returned') return 'Queried';
        if (application.linked_company_id || application.status === 'Licence Issued') {
            return 'Licence Issued';
        }
        if (application.status === 'Approved') {
            return application.payment_status === 'Paid' ? 'Licence Issued' : 'Approved Pending Payment';
        }
        if (application.status === 'Payment Submitted') return 'Awaiting Payment Confirmation';
        if (application.status === 'Approved Pending Payment') return 'Awaiting Contractor Payment';
        if (application.status === 'Awaiting Admin Approval') return 'Awaiting MD Approval';

        return 'Awaiting Compliance Review';
    };
    const getApplicationStatusTone = (statusLabel: string): ApplicationStatusTone => {
        if (statusLabel === 'Rejected') return 'rose';
        if (statusLabel === 'Licence Issued') return 'emerald';

        return 'amber';
    };
    const getApplicationStatusClasses = (tone: ApplicationStatusTone) => {
        if (tone === 'rose') return 'bg-rose-50 text-rose-700';
        if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700';

        return 'bg-amber-50 text-amber-700';
    };
    const registeredStatusOptions = useMemo(
        () => ['All', ...Array.from(new Set(companies.map((company) => company.status).filter(Boolean))).sort()],
        [companies],
    );
    const applicationStatusOptions = useMemo(
        () => [
            'All',
            ...Array.from(
                new Set(
                    companyApplications.map((application) => getApplicationStatusLabel(application)).filter(Boolean),
                ),
            ).sort(),
        ],
        [companyApplications],
    );
    const filteredCompanies = useMemo(
        () =>
            companies.filter((company) => {
                const matchesQuery = matchesSearchQuery(
                    deferredRegisteredSearchQuery,
                    company.name,
                    company.license_no,
                    company.license_type,
                    company.incorporation_type,
                    company.free_zone_location,
                    company.representative_email,
                    company.status,
                );
                const matchesStatus =
                    registeredStatusFilter === 'All' || company.status === registeredStatusFilter;

                return matchesQuery && matchesStatus;
            }),
        [companies, deferredRegisteredSearchQuery, registeredStatusFilter],
    );
    const filteredCompanyApplications = useMemo(
        () =>
            companyApplications.filter((application) => {
                const displayStatus = getApplicationStatusLabel(application);
                const matchesQuery = matchesSearchQuery(
                    deferredApplicationSearchQuery,
                    application.application_reference,
                    application.company_name,
                    application.submitted_by_name,
                    application.primary_contact_name,
                    application.primary_contact_email,
                    application.free_zone_location,
                    application.requested_license_type,
                    application.approved_license_type,
                    displayStatus,
                );
                const matchesStatus =
                    applicationStatusFilter === 'All' || displayStatus === applicationStatusFilter;

                return matchesQuery && matchesStatus;
            }),
        [companyApplications, deferredApplicationSearchQuery, applicationStatusFilter],
    );
    const closeApplicationStatusModal = () => {
        setShowApplicationStatusModal(false);
        setSelectedApplication(null);
        setSelectedApplicationStatusDetail(null);
        setApplicationStatusLoading(false);
        setApplicationStatusError(null);
        setContractorPaymentReference('');
    };
    const openApplicationStatusModal = (application: CompanyApplication) => {
        setSelectedApplication(application);
        setShowApplicationStatusModal(true);
        setSelectedApplicationStatusDetail(null);
        setApplicationStatusError(null);
        setApplicationStatusLoading(true);

        void (async () => {
            try {
                const detail = await fetchApplicationDetail(application.id);
                setSelectedApplicationStatusDetail(detail);
            } catch (error) {
                console.error(error);
                setApplicationStatusError(
                    error instanceof Error ? error.message : 'Failed to load application history.'
                );
            } finally {
                setApplicationStatusLoading(false);
            }
        })();
    };
    const closeRegistrationModal = () => {
        setShowRegModal(false);
        setEditingCompanyApplicationId(null);
        setNewCompany(createInitialCompanyApplicationForm());
    };
    const openNewApplicationModal = () => {
        setEditingCompanyApplicationId(null);
        setNewCompany(createInitialCompanyApplicationForm());
        setShowRegModal(true);
    };
    const closeApplicationReviewModal = () => {
        setShowApplicationReviewModal(false);
        setSelectedApplicationName(null);
        setSelectedApplicationDetail(null);
        setApplicationDetailError(null);
        setApplicationDetailLoading(false);
        setComplianceReviewNote('');
        setAdminApprovedLicenseType('');
        setAdminPaymentReference('');
    };
    const fetchApplicationDetail = async (applicationId: number) => {
        if (!token) {
            throw new Error('Your session has expired. Please log in again.');
        }

        const response = await fetch(`/api/company-applications/${applicationId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || 'Failed to load application details.');
        }

        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Received an empty application detail response. Please refresh and try again.');
        }

        return data as CompanyApplicationDetail;
    };
    const handleOpenApplicationReview = async (application: CompanyApplication) => {
        setShowApplicationReviewModal(true);
        setSelectedApplicationName(application.company_name);
        setSelectedApplicationDetail(null);
        setApplicationDetailError(null);
        setComplianceReviewNote('');

        setApplicationDetailLoading(true);

        try {
            const data = await fetchApplicationDetail(application.id);
            setSelectedApplicationDetail(data);
        } catch (error) {
            console.error(error);
            setApplicationDetailError(
                error instanceof Error ? error.message : 'Failed to load application details.'
            );
        } finally {
            setApplicationDetailLoading(false);
        }
    };
    const handleStartResubmission = async (application: CompanyApplication) => {
        closeApplicationStatusModal();
        setEditingCompanyApplicationId(application.id);
        setNewCompany(createInitialCompanyApplicationForm());
        setShowRegModal(true);

        try {
            const detail = await fetchApplicationDetail(application.id);
            setNewCompany(mapApplicationDetailToForm(detail));
        } catch (error) {
            console.error(error);
            closeRegistrationModal();
            setApplicationDetailError(
                error instanceof Error ? error.message : 'Failed to load application for resubmission.'
            );
            setSelectedApplication(application);
            setShowApplicationStatusModal(true);
        }
    };
    const handleComplianceReviewDecision = async (
        decision: 'Approved' | 'Rejected' | 'Returned',
        rejectionReason?: string,
        queryNote?: string
    ) => {
        if (!selectedApplicationDetail) return;

        await onReviewApplication(selectedApplicationDetail.id, decision, rejectionReason, queryNote);
        closeApplicationReviewModal();
    };
    const handleAdminReviewDecision = async (
        decision: 'Approved' | 'Rejected',
        rejectionReason?: string
    ) => {
        if (!selectedApplicationDetail) return;

        const normalizedApprovedLicenseType = adminApprovedLicenseType.trim();

        if (decision === 'Approved' && !normalizedApprovedLicenseType) {
            window.alert('Please select the licence type that is being approved.');
            return;
        }

        await onReviewApplication(
            selectedApplicationDetail.id,
            decision,
            rejectionReason,
            undefined,
            normalizedApprovedLicenseType || undefined
        );
        closeApplicationReviewModal();
    };
    const handleConfirmPaymentIssuance = async () => {
        if (!selectedApplicationDetail) return;

        const normalizedApprovedLicenseType = adminApprovedLicenseType.trim();

        if (!normalizedApprovedLicenseType) {
            window.alert('Please confirm the licence type before issuing the licence.');
            return;
        }

        await onConfirmApplicationPayment(
            selectedApplicationDetail.id,
            adminPaymentReference.trim() || undefined,
            normalizedApprovedLicenseType
        );
        closeApplicationReviewModal();
    };
    const handleContractorPaymentSubmission = async () => {
        if (!selectedApplication) return;

        const normalizedPaymentReference = contractorPaymentReference.trim();

        if (!normalizedPaymentReference) {
            window.alert('Please enter your payment reference before submitting payment.');
            return;
        }

        await onSubmitApplicationPayment(selectedApplication.id, normalizedPaymentReference);
        closeApplicationStatusModal();
    };
    const closeCompanyDetailModal = () => {
        setShowCompanyDetailModal(false);
        setSelectedCompanyName(null);
        setSelectedCompanyDetail(null);
        setCompanyDetailError(null);
        setCompanyDetailLoading(false);
    };
    const handleOpenCompanyDetail = async (company: Company) => {
        setShowCompanyDetailModal(true);
        setSelectedCompanyName(company.name);
        setSelectedCompanyDetail(null);
        setCompanyDetailError(null);

        if (!token) {
            setCompanyDetailLoading(false);
            setCompanyDetailError('Your session has expired. Please log in again.');
            return;
        }

        setCompanyDetailLoading(true);

        try {
            const response = await fetch(`/api/companies/${company.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.error || 'Failed to load company details.');
            }

            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('Received an empty company detail response. Please refresh and try again.');
            }

            setSelectedCompanyDetail(data as CompanyDetail);
        } catch (error) {
            console.error(error);
            setCompanyDetailError(
                error instanceof Error ? error.message : 'Failed to load company details.'
            );
        } finally {
            setCompanyDetailLoading(false);
        }
    };
    const handlePrintRegistryReport = () => {
        printStructuredReport({
            documentTitle: 'OGFZA Registered Company Registry',
            kicker: 'OGFZA Company Registry',
            title: 'Registered Companies Report',
            subtitle: 'Approved and licensed entities currently visible in the Company Management registry.',
            reference: `Generated ${formatDisplayDateTime(new Date().toISOString())}`,
            badges: [
                { label: `${filteredCompanies.length} companies`, tone: 'neutral' },
            ],
            sections: [
                {
                    title: 'Registry Summary',
                    kind: 'fields',
                    columns: 3,
                    fields: [
                        { label: 'Visible Companies', value: filteredCompanies.length },
                        { label: 'Active Companies', value: filteredCompanies.filter((company) => company.status === 'Active').length },
                        { label: 'Suspended / Inactive', value: filteredCompanies.filter((company) => company.status === 'Suspended' || company.status === 'Inactive').length },
                    ],
                },
                {
                    title: 'Registered Companies',
                    kind: 'table',
                    headers: ['Company Name', 'Licence No.', 'Licence Type', 'Incorporation', 'Free Zone', 'Status', 'Approved Date'],
                    rows: filteredCompanies.map((company) => ([
                        company.name,
                        company.license_no || '--',
                        company.license_type || '--',
                        company.incorporation_type || '--',
                        company.free_zone_location || '--',
                        company.status,
                        formatDisplayDate(company.approved_date),
                    ])),
                },
            ],
            footerNote: 'Generated from the Company Management registry currently available to this user in the OGFZA Digital Automation prototype.',
        });
    };

    return (
        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showRegModal && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-serif  text-brand-ink">
                                    {editingCompanyApplicationId ? 'Resubmit Queried Application' : 'Free Zone Registration Application'}
                                </h2>
                                <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">
                                    {editingCompanyApplicationId
                                        ? 'Contractor Revision / Compliance Query Response'
                                        : 'Contractor Submission / OGFZA Application Intake'}
                                </p>
                            </div>
                            <button onClick={closeRegistrationModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={onRegisterCompany} className="space-y-8">
                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Application Basics
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="col-header">Company Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newCompany.companyName}
                                            onChange={(e) => updateCompanyField('companyName', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Incorporation Type</label>
                                        <select
                                            required
                                            value={newCompany.incorporationType}
                                            onChange={(e) => updateCompanyField('incorporationType', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option value="">Select incorporation type</option>
                                            {incorporationTypeOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1 md:col-span-2">
                                        <label className="col-header">Free Zone Location</label>
                                        <select
                                            required
                                            value={newCompany.freeZoneLocation}
                                            onChange={(e) => updateCompanyField('freeZoneLocation', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option value="">Select free zone location</option>
                                            {freeZoneLocationOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">D.P.R Registration No.</label>
                                        <input
                                            type="text"
                                            value={newCompany.dprRegistrationNumber}
                                            onChange={(e) => updateCompanyField('dprRegistrationNumber', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Description of Activity</label>
                                        <select
                                            value={newCompany.activityDescription}
                                            onChange={(e) => updateCompanyField('activityDescription', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option value="">Select activity description</option>
                                            {activityDescriptionOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Proposed Commencement Date</label>
                                        <input
                                            type="date"
                                            value={newCompany.proposedCommencementDate}
                                            onChange={(e) => updateCompanyField('proposedCommencementDate', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Office Details
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Global Head Office Address</label>
                                        <textarea
                                            required
                                            value={newCompany.globalHeadOfficeAddress}
                                            onChange={(e) => updateCompanyField('globalHeadOfficeAddress', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Office Address in Nigeria</label>
                                        <textarea
                                            required
                                            value={newCompany.nigeriaOfficeAddress}
                                            onChange={(e) => updateCompanyField('nigeriaOfficeAddress', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                                        <div className="space-y-1">
                                            <label className="col-header">Global Telephone 1</label>
                                            <input
                                                type="tel"
                                                value={newCompany.globalPhone1}
                                                onChange={(e) => updateCompanyField('globalPhone1', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Global Telephone 2</label>
                                            <input
                                                type="tel"
                                                value={newCompany.globalPhone2}
                                                onChange={(e) => updateCompanyField('globalPhone2', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Global Email</label>
                                            <input
                                                type="email"
                                                value={newCompany.globalEmail}
                                                onChange={(e) => updateCompanyField('globalEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Global Website</label>
                                            <input
                                                type="url"
                                                value={newCompany.globalWebsite}
                                                onChange={(e) => updateCompanyField('globalWebsite', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Telephone 1</label>
                                            <input
                                                type="tel"
                                                value={newCompany.nigeriaPhone1}
                                                onChange={(e) => updateCompanyField('nigeriaPhone1', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Telephone 2</label>
                                            <input
                                                type="tel"
                                                value={newCompany.nigeriaPhone2}
                                                onChange={(e) => updateCompanyField('nigeriaPhone2', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Email</label>
                                            <input
                                                type="email"
                                                value={newCompany.nigeriaEmail}
                                                onChange={(e) => updateCompanyField('nigeriaEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Website</label>
                                            <input
                                                type="url"
                                                value={newCompany.nigeriaWebsite}
                                                onChange={(e) => updateCompanyField('nigeriaWebsite', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Licence Request and Fees
                                    </h3>
                                    <p className="text-xs opacity-55 mt-2 max-w-3xl">
                                        Select the licence category being requested. The fee schedule below is estimated from
                                        the OGFZA SLA and will be confirmed internally during review before payment is marked.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Requested Licence Type</label>
                                        <select
                                            required
                                            value={newCompany.requestedLicenseType}
                                            onChange={(e) => updateCompanyField('requestedLicenseType', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option value="">Select licence type</option>
                                            {licenseTypeOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Estimated Total Fee</label>
                                        <div className="w-full bg-brand-ink/5 p-3 text-sm font-mono">
                                            {requestedLicenseFeeSchedule ? formatUsd(requestedLicenseFeeSchedule.totalUsd) : '--'}
                                        </div>
                                    </div>
                                </div>

                                <LicenseFeeSummary
                                    licenseType={newCompany.requestedLicenseType}
                                    totalOverride={requestedLicenseFeeSchedule?.totalUsd}
                                />
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Contact Information
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <p className="text-[10px] uppercase tracking-widest opacity-40">Primary Contact</p>
                                        <div className="space-y-1">
                                            <label className="col-header">Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={newCompany.primaryContactName}
                                                onChange={(e) => updateCompanyField('primaryContactName', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Designation</label>
                                            <input
                                                type="text"
                                                value={newCompany.primaryContactDesignation}
                                                onChange={(e) => updateCompanyField('primaryContactDesignation', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Telephone</label>
                                            <input
                                                type="tel"
                                                value={newCompany.primaryContactPhone}
                                                onChange={(e) => updateCompanyField('primaryContactPhone', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Email</label>
                                            <input
                                                type="email"
                                                required
                                                value={newCompany.primaryContactEmail}
                                                onChange={(e) => updateCompanyField('primaryContactEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] uppercase tracking-widest opacity-40">Secondary Contact</p>
                                        <div className="space-y-1">
                                            <label className="col-header">Name</label>
                                            <input
                                                type="text"
                                                value={newCompany.secondaryContactName}
                                                onChange={(e) => updateCompanyField('secondaryContactName', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Designation</label>
                                            <input
                                                type="text"
                                                value={newCompany.secondaryContactDesignation}
                                                onChange={(e) => updateCompanyField('secondaryContactDesignation', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Telephone</label>
                                            <input
                                                type="tel"
                                                value={newCompany.secondaryContactPhone}
                                                onChange={(e) => updateCompanyField('secondaryContactPhone', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Email</label>
                                            <input
                                                type="email"
                                                value={newCompany.secondaryContactEmail}
                                                onChange={(e) => updateCompanyField('secondaryContactEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Operations and Proposal
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Present Business Operations</label>
                                        <textarea
                                            value={newCompany.presentBusinessOperations}
                                            onChange={(e) => updateCompanyField('presentBusinessOperations', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Countries of Operation in West Africa</label>
                                        <textarea
                                            value={newCompany.countriesOfOperationWestAfrica}
                                            onChange={(e) => updateCompanyField('countriesOfOperationWestAfrica', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                            placeholder="Separate countries with commas"
                                        />
                                    </div>

                                    <div className="space-y-1 md:col-span-2">
                                        <label className="col-header">Proposed Business Activity in the Free Zone</label>
                                        <textarea
                                            required
                                            value={newCompany.proposedBusinessActivity}
                                            onChange={(e) => updateCompanyField('proposedBusinessActivity', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-32 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Required Facilities and Cargo
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Undeveloped Land (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.undevelopedLandSqm}
                                            onChange={(e) => updateCompanyField('undevelopedLandSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Developed Land (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.developedLandSqm}
                                            onChange={(e) => updateCompanyField('developedLandSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Concrete Stacking Area (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.concreteStackingAreaSqm}
                                            onChange={(e) => updateCompanyField('concreteStackingAreaSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Warehouse Space (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.warehouseSpaceSqm}
                                            onChange={(e) => updateCompanyField('warehouseSpaceSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Factory Premises (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.factoryPremisesSqm}
                                            onChange={(e) => updateCompanyField('factoryPremisesSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Office Accommodation (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.officeAccommodationSqm}
                                            onChange={(e) => updateCompanyField('officeAccommodationSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="col-header">Equipment Requirement</label>
                                        <textarea
                                            value={newCompany.equipmentRequirement}
                                            onChange={(e) => updateCompanyField('equipmentRequirement', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Residential Accommodation Personnel</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={newCompany.residentialAccommodationPersonnelCount}
                                            onChange={(e) => updateCompanyField('residentialAccommodationPersonnelCount', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="col-header">Estimate of Imports</label>
                                        <textarea
                                            value={newCompany.importsSummary}
                                            onChange={(e) => updateCompanyField('importsSummary', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                            placeholder="Summarize cargo type, tonnage, containers, and value."
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="col-header">Estimate of Exports</label>
                                        <textarea
                                            value={newCompany.exportsSummary}
                                            onChange={(e) => updateCompanyField('exportsSummary', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                            placeholder="Summarize cargo type, tonnage, containers, and value."
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Declaration
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Name</label>
                                        <input
                                            type="text"
                                            value={newCompany.declarationName}
                                            onChange={(e) => updateCompanyField('declarationName', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Designation</label>
                                        <input
                                            type="text"
                                            value={newCompany.declarationDesignation}
                                            onChange={(e) => updateCompanyField('declarationDesignation', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Signature Date</label>
                                        <input
                                            type="date"
                                            value={newCompany.declarationSignatureDate}
                                            onChange={(e) => updateCompanyField('declarationSignatureDate', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Supporting Documents
                                    </h3>
                                    <p className="text-xs opacity-55 mt-2 max-w-3xl">
                                        Prototype mode: we are capturing the document filenames required by the
                                        OGFZA application form. Actual file storage will be added in the main system.
                                    </p>
                                </div>

                                {!currentDocumentRequirements.length ? (
                                    <div className="border border-dashed border-brand-line/20 p-4 text-sm  opacity-50">
                                        Select an incorporation type to load the corresponding required documents.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {currentDocumentRequirements.map((requirement) => {
                                            const isDerivedRequirement = requirement.inputKind === 'derived';
                                            const currentValue = getDraftDocumentValue(requirement.documentType);

                                            return (
                                                <div
                                                    key={requirement.documentType}
                                                    className="border border-brand-line/10 p-4 bg-brand-ink/[0.02] space-y-3"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm text-brand-ink">{requirement.label}</p>
                                                            <p className="mt-1 text-xs opacity-55">{requirement.description}</p>
                                                        </div>
                                                        <span
                                                            className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${isDerivedRequirement
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : requirement.required === false
                                                                        ? 'bg-brand-ink/5 text-brand-ink/70'
                                                                        : 'bg-amber-50 text-amber-700'
                                                                }`}
                                                        >
                                                            {isDerivedRequirement
                                                                ? 'Included in Form'
                                                                : requirement.required === false
                                                                    ? 'Optional'
                                                                    : 'Required'}
                                                        </span>
                                                    </div>

                                                    {isDerivedRequirement ? (
                                                        <p className="text-sm opacity-70">
                                                            This requirement is covered by the company and contact details entered above.
                                                        </p>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            required={requirement.required !== false}
                                                            value={currentValue}
                                                            onChange={(event) => updateCompanyDocument(
                                                                requirement.documentType,
                                                                event.target.value
                                                            )}
                                                            placeholder={requirement.placeholder || 'Enter the filename or reference you are submitting'}
                                                            className="w-full bg-white border border-brand-line/10 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            <button
                                disabled={actionLoading}
                                className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs"
                            >
                                {actionLoading
                                    ? (editingCompanyApplicationId ? 'Resubmitting...' : 'Submitting...')
                                    : (editingCompanyApplicationId ? 'Resubmit Application' : 'Submit Application')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showCompanyDetailModal && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                        <div className="flex justify-between items-start mb-6 gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                    Registered Company Profile
                                </p>
                                <h2 className="text-2xl font-serif  text-brand-ink mt-2">
                                    {selectedCompanyDetail?.name || selectedCompanyName || 'Company Details'}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <span className="text-[10px] font-mono font-bold bg-brand-ink/5 px-2 py-1 rounded-full">
                                        {selectedCompanyDetail?.license_no || '--'}
                                    </span>
                                    {selectedCompanyDetail?.license_type && (
                                        <span className="text-[10px] font-mono font-bold bg-brand-ink/5 px-2 py-1 rounded-full">
                                            {selectedCompanyDetail.license_type}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                                        {selectedCompanyDetail?.status || 'Registered'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {selectedCompanyDetail && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => printCompanyRecord(selectedCompanyDetail)}
                                            className={printActionButtonClassName}
                                        >
                                            <Printer size={14} />
                                            Print Company Record
                                        </button>
                                        {selectedCompanyDetail.license_no && (
                                            <button
                                                type="button"
                                                onClick={() => printLicenceCertificate({
                                                    companyName: selectedCompanyDetail.name,
                                                    licenseNo: selectedCompanyDetail.license_no,
                                                    licenseType: selectedCompanyDetail.license_type || selectedCompanyDetail.approved_license_type,
                                                    freeZoneLocation: selectedCompanyDetail.free_zone_location,
                                                    issuedOn: selectedCompanyDetail.approved_date || selectedCompanyDetail.application_approved_at,
                                                    approvedBy: selectedCompanyDetail.approved_by_name,
                                                    applicationReference: selectedCompanyDetail.application_reference,
                                                })}
                                                className={printActionButtonClassName}
                                            >
                                                <Printer size={14} />
                                                Print Licence
                                            </button>
                                        )}
                                        {selectedCompanyDetail.payment_status === 'Paid' && (
                                            <button
                                                type="button"
                                                onClick={() => printLicencePaymentReceipt({
                                                    companyName: selectedCompanyDetail.name,
                                                    applicationReference: selectedCompanyDetail.application_reference,
                                                    licenseNo: selectedCompanyDetail.license_no,
                                                    licenseType: selectedCompanyDetail.license_type || selectedCompanyDetail.approved_license_type,
                                                    amountPaid: selectedCompanyDetail.approved_fee_usd,
                                                    paymentReference: selectedCompanyDetail.payment_reference,
                                                    paymentStatus: selectedCompanyDetail.payment_status,
                                                    paymentSubmittedOn: selectedCompanyDetail.payment_submitted_at,
                                                    paymentSubmittedBy: selectedCompanyDetail.payment_submitted_by_name,
                                                    paymentConfirmedOn: selectedCompanyDetail.payment_confirmed_at,
                                                    paymentConfirmedBy: selectedCompanyDetail.payment_confirmed_by_name,
                                                })}
                                                className={printActionButtonClassName}
                                            >
                                                <Printer size={14} />
                                                Print Receipt
                                            </button>
                                        )}
                                    </>
                                )}
                                <button type="button" onClick={closeCompanyDetailModal}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {companyDetailLoading && (
                            <div className="py-16 text-center">
                                <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="mt-4 text-sm  opacity-50">
                                    Loading company details from the registry...
                                </p>
                            </div>
                        )}

                        {!companyDetailLoading && companyDetailError && (
                            <div className="border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                {companyDetailError}
                            </div>
                        )}

                        {!companyDetailLoading && !companyDetailError && selectedCompanyDetail && (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Company Record
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Company Name" value={selectedCompanyDetail.name} />
                                        <DetailItem label="License No." value={selectedCompanyDetail.license_no} mono />
                                        <DetailItem label="License Type" value={selectedCompanyDetail.license_type} />
                                        <DetailItem label="Status" value={selectedCompanyDetail.status} />
                                        <DetailItem label="Incorporation Type" value={selectedCompanyDetail.incorporation_type} />
                                        <DetailItem label="Free Zone Location" value={selectedCompanyDetail.free_zone_location} />
                                        <DetailItem label="Representative Email" value={selectedCompanyDetail.representative_email} />
                                        <DetailItem label="Approved Date" value={formatDisplayDate(selectedCompanyDetail.approved_date)} />

                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Application Workflow
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem
                                            label="Application Reference"
                                            value={selectedCompanyDetail.application_reference}
                                            mono
                                        />
                                        <DetailItem label="Application Status" value={formatWorkflowStatusValue(selectedCompanyDetail.application_status)} />
                                        <DetailItem label="Requested Licence Type" value={selectedCompanyDetail.requested_license_type} />
                                        <DetailItem label="Approved Licence Type" value={selectedCompanyDetail.approved_license_type} />
                                        <DetailItem label="Estimated Fees (USD)" value={formatUsd(selectedCompanyDetail.estimated_fee_usd)} />
                                        <DetailItem label="Final Fees (USD)" value={formatUsd(selectedCompanyDetail.approved_fee_usd)} />
                                        <DetailItem label="Payment Status" value={selectedCompanyDetail.payment_status} />
                                        <DetailItem label="Payment Reference" value={selectedCompanyDetail.payment_reference} />
                                        <DetailItem label="Payment Submitted By" value={selectedCompanyDetail.payment_submitted_by_name} />
                                        <DetailItem label="Payment Submitted At" value={formatDisplayDateTime(selectedCompanyDetail.payment_submitted_at)} />
                                        <DetailItem label="Payment Confirmed By" value={selectedCompanyDetail.payment_confirmed_by_name} />
                                        <DetailItem label="Payment Confirmed At" value={formatDisplayDateTime(selectedCompanyDetail.payment_confirmed_at)} />
                                        <DetailItem label="Submitted By" value={selectedCompanyDetail.submitted_by_name} />
                                        <DetailItem label="Reviewed By" value={selectedCompanyDetail.reviewed_by_name} />
                                        <DetailItem label="Approved By" value={selectedCompanyDetail.approved_by_name} />
                                        <DetailItem label="Submitted At" value={formatDisplayDateTime(selectedCompanyDetail.submitted_at)} />
                                        <DetailItem label="Reviewed At" value={formatDisplayDateTime(selectedCompanyDetail.reviewed_at)} />
                                        <DetailItem
                                            label="Final Approval At"
                                            value={formatDisplayDateTime(selectedCompanyDetail.application_approved_at)}
                                        />
                                        <DetailItem
                                            label="Rejected At"
                                            value={formatDisplayDateTime(selectedCompanyDetail.rejected_at)}
                                        />
                                        <DetailItem
                                            label="Rejection Reason"
                                            value={selectedCompanyDetail.rejection_reason}
                                            preserveWhitespace
                                            className="md:col-span-3"
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Licence Fee Summary
                                        </h3>
                                    </div>
                                    <LicenseFeeSummary
                                        licenseType={selectedCompanyDetail.license_type || selectedCompanyDetail.approved_license_type}
                                        totalOverride={selectedCompanyDetail.approved_fee_usd}
                                    />
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Office Details
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <DetailItem
                                            label="Global Head Office Address"
                                            value={selectedCompanyDetail.global_head_office_address}
                                            preserveWhitespace
                                        />
                                        <DetailItem
                                            label="Office Address in Nigeria"
                                            value={selectedCompanyDetail.nigeria_office_address}
                                            preserveWhitespace
                                        />
                                        <DetailItem label="Global Telephone 1" value={selectedCompanyDetail.global_phone_1} />
                                        <DetailItem label="Global Telephone 2" value={selectedCompanyDetail.global_phone_2} />
                                        <DetailItem label="Global Email" value={selectedCompanyDetail.global_email} />
                                        <DetailItem label="Global Website" value={selectedCompanyDetail.global_website} />
                                        <DetailItem label="Nigeria Telephone 1" value={selectedCompanyDetail.nigeria_phone_1} />
                                        <DetailItem label="Nigeria Telephone 2" value={selectedCompanyDetail.nigeria_phone_2} />
                                        <DetailItem label="Nigeria Email" value={selectedCompanyDetail.nigeria_email} />
                                        <DetailItem label="Nigeria Website" value={selectedCompanyDetail.nigeria_website} />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Contact Information
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4 border border-brand-line/10 p-4">
                                            <p className="text-[10px] uppercase tracking-widest opacity-40">Primary Contact</p>
                                            <dl className="grid grid-cols-1 gap-4">
                                                <DetailItem label="Name" value={selectedCompanyDetail.primary_contact_name} />
                                                <DetailItem label="Designation" value={selectedCompanyDetail.primary_contact_designation} />
                                                <DetailItem label="Telephone" value={selectedCompanyDetail.primary_contact_phone} />
                                                <DetailItem label="Email" value={selectedCompanyDetail.primary_contact_email} />
                                            </dl>
                                        </div>

                                        <div className="space-y-4 border border-brand-line/10 p-4">
                                            <p className="text-[10px] uppercase tracking-widest opacity-40">Secondary Contact</p>
                                            <dl className="grid grid-cols-1 gap-4">
                                                <DetailItem label="Name" value={selectedCompanyDetail.secondary_contact_name} />
                                                <DetailItem label="Designation" value={selectedCompanyDetail.secondary_contact_designation} />
                                                <DetailItem label="Telephone" value={selectedCompanyDetail.secondary_contact_phone} />
                                                <DetailItem label="Email" value={selectedCompanyDetail.secondary_contact_email} />
                                            </dl>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Operations and Proposal
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <DetailItem
                                            label="Present Business Operations"
                                            value={selectedCompanyDetail.present_business_operations}
                                            preserveWhitespace
                                        />
                                        <DetailItem
                                            label="Countries of Operation in West Africa"
                                            value={selectedCompanyDetail.countries_of_operation_west_africa}
                                            preserveWhitespace
                                        />
                                        <DetailItem label="D.P.R Registration No." value={selectedCompanyDetail.dpr_registration_number} />
                                        <DetailItem label="Description of Activity" value={selectedCompanyDetail.activity_description} />
                                        <DetailItem
                                            label="Proposed Business Activity in the Free Zone"
                                            value={selectedCompanyDetail.proposed_business_activity}
                                            preserveWhitespace
                                            className="md:col-span-2"
                                        />
                                        <DetailItem
                                            label="Proposed Commencement Date"
                                            value={formatDisplayDate(selectedCompanyDetail.proposed_commencement_date)}
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Required Facilities and Cargo
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Undeveloped Land (m2)" value={selectedCompanyDetail.undeveloped_land_sqm} />
                                        <DetailItem label="Developed Land (m2)" value={selectedCompanyDetail.developed_land_sqm} />
                                        <DetailItem label="Concrete Stacking Area (m2)" value={selectedCompanyDetail.concrete_stacking_area_sqm} />
                                        <DetailItem label="Warehouse Space (m2)" value={selectedCompanyDetail.warehouse_space_sqm} />
                                        <DetailItem label="Factory Premises (m2)" value={selectedCompanyDetail.factory_premises_sqm} />
                                        <DetailItem label="Office Accommodation (m2)" value={selectedCompanyDetail.office_accommodation_sqm} />
                                        <DetailItem
                                            label="Equipment Requirement"
                                            value={selectedCompanyDetail.equipment_requirement}
                                            preserveWhitespace
                                            className="md:col-span-2"
                                        />
                                        <DetailItem
                                            label="Residential Accommodation Personnel"
                                            value={selectedCompanyDetail.residential_accommodation_personnel_count}
                                        />
                                        <DetailItem
                                            label="Estimate of Imports"
                                            value={selectedCompanyDetail.imports_summary}
                                            preserveWhitespace
                                            className="md:col-span-3"
                                        />
                                        <DetailItem
                                            label="Estimate of Exports"
                                            value={selectedCompanyDetail.exports_summary}
                                            preserveWhitespace
                                            className="md:col-span-3"
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Declaration
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Name" value={selectedCompanyDetail.declaration_name} />
                                        <DetailItem label="Designation" value={selectedCompanyDetail.declaration_designation} />
                                        <DetailItem
                                            label="Signature Date"
                                            value={formatDisplayDate(selectedCompanyDetail.declaration_signature_date)}
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Supporting Documents
                                        </h3>
                                    </div>
                                    <ApplicationDocumentChecklist
                                        incorporationType={selectedCompanyDetail.incorporation_type}
                                        documents={selectedCompanyDetail.documents}
                                    />
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showApplicationStatusModal && selectedApplication && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 overflow-y-auto p-4">
                    <div className="min-h-full flex items-start justify-center py-4">
                        <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                        Application Status
                                    </p>
                                    <h2 className="text-2xl font-serif  text-brand-ink mt-2">
                                        {selectedApplication.company_name}
                                    </h2>
                                    <p className="text-xs font-mono opacity-50 mt-2">
                                        {selectedApplication.application_reference}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {selectedApplicationStatusDetail && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => printCompanyApplicationSummary(selectedApplicationStatusDetail)}
                                                className={printActionButtonClassName}
                                            >
                                                <Printer size={14} />
                                                Print Application Summary
                                            </button>
                                            {selectedApplicationStatusDetail.linked_company_license_no && (
                                                <button
                                                    type="button"
                                                    onClick={() => printLicenceCertificate({
                                                        companyName: selectedApplicationStatusDetail.company_name,
                                                        licenseNo: selectedApplicationStatusDetail.linked_company_license_no,
                                                        licenseType: selectedApplicationStatusDetail.approved_license_type || selectedApplicationStatusDetail.requested_license_type,
                                                        freeZoneLocation: selectedApplicationStatusDetail.free_zone_location,
                                                        issuedOn: selectedApplicationStatusDetail.payment_confirmed_at || selectedApplicationStatusDetail.approved_at,
                                                        approvedBy: selectedApplicationStatusDetail.approved_by_name,
                                                        applicationReference: selectedApplicationStatusDetail.application_reference,
                                                    })}
                                                    className={printActionButtonClassName}
                                                >
                                                    <Printer size={14} />
                                                    Print Licence
                                                </button>
                                            )}
                                            {selectedApplicationStatusDetail.payment_status === 'Paid' && (
                                                <button
                                                    type="button"
                                                    onClick={() => printLicencePaymentReceipt({
                                                        companyName: selectedApplicationStatusDetail.company_name,
                                                        applicationReference: selectedApplicationStatusDetail.application_reference,
                                                        licenseNo: selectedApplicationStatusDetail.linked_company_license_no,
                                                        licenseType: selectedApplicationStatusDetail.approved_license_type || selectedApplicationStatusDetail.requested_license_type,
                                                        amountPaid: selectedApplicationStatusDetail.approved_fee_usd || selectedApplicationStatusDetail.estimated_fee_usd,
                                                        paymentReference: selectedApplicationStatusDetail.payment_reference,
                                                        paymentStatus: selectedApplicationStatusDetail.payment_status,
                                                        paymentSubmittedOn: selectedApplicationStatusDetail.payment_submitted_at,
                                                        paymentSubmittedBy: selectedApplicationStatusDetail.payment_submitted_by_name,
                                                        paymentConfirmedOn: selectedApplicationStatusDetail.payment_confirmed_at,
                                                        paymentConfirmedBy: selectedApplicationStatusDetail.payment_confirmed_by_name,
                                                    })}
                                                    className={printActionButtonClassName}
                                                >
                                                    <Printer size={14} />
                                                    Print Receipt
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <button type="button" onClick={closeApplicationStatusModal}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {applicationStatusLoading && (
                                <div className="py-10 text-center">
                                    <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm  opacity-50">
                                        Loading application history...
                                    </p>
                                </div>
                            )}

                            {!applicationStatusLoading && applicationStatusError && (
                                <div className="mt-8 border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                    {applicationStatusError}
                                </div>
                            )}

                            {(() => {
                                const applicationForStatus = selectedApplicationStatusDetail || selectedApplication;
                                const statusLabel = getApplicationStatusLabel(applicationForStatus);
                                const tone = getApplicationStatusTone(statusLabel);
                                const toneClasses = getApplicationStatusClasses(tone);
                                const issued = statusLabel === 'Licence Issued';
                                const rejected = statusLabel === 'Rejected';
                                const queried = statusLabel === 'Queried';
                                const awaitingMd = statusLabel === 'Awaiting MD Approval';
                                const awaitingContractorPayment = statusLabel === 'Awaiting Contractor Payment';
                                const awaitingPaymentConfirmation = statusLabel === 'Awaiting Payment Confirmation';

                                return (
                                    <div className="mt-8 space-y-6">
                                        <div className={`border p-5 ${tone === 'rose' ? 'border-rose-200 bg-rose-50/50' : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                                <p className="text-[10px] uppercase tracking-widest opacity-50">
                                                    Current Status
                                                </p>
                                                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${toneClasses}`}>
                                                    {statusLabel}
                                                </span>
                                            </div>

                                            <p className="mt-4 text-sm text-brand-ink">
                                                {issued && 'This application has completed payment confirmation and the licence has been issued.'}
                                                {awaitingContractorPayment && 'This application has received MD approval and is now waiting for the contractor to submit payment details.'}
                                                {awaitingPaymentConfirmation && 'The contractor has submitted payment details and OGFZA is now waiting for admin confirmation before the licence number is issued.'}
                                                {awaitingMd && 'Compliance has completed review and forwarded this application to the Managing Director for final approval.'}
                                                {queried && 'Compliance has queried this application and requested revisions from the contractor before review can continue.'}
                                                {!issued && !awaitingContractorPayment && !awaitingPaymentConfirmation && !awaitingMd && !rejected && !queried && 'This application is still waiting for compliance review and has not yet been forwarded to the Managing Director.'}
                                                {rejected && 'This application was rejected during the review process.'}
                                            </p>
                                        </div>

                                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <DetailItem label="Submitted On" value={formatDisplayDateTime(applicationForStatus.submitted_at)} />
                                            <DetailItem label="Last Action" value={formatDisplayDateTime(getLastActionDate(applicationForStatus))} />
                                            <DetailItem label="Requested Licence Type" value={applicationForStatus.requested_license_type} />
                                            <DetailItem label="Approved Licence Type" value={applicationForStatus.approved_license_type} />
                                            <DetailItem label="Estimated Fees (USD)" value={formatUsd(applicationForStatus.estimated_fee_usd)} />
                                            <DetailItem label="Final Fees (USD)" value={formatUsd(applicationForStatus.approved_fee_usd)} />
                                            <DetailItem label="Payment Status" value={applicationForStatus.payment_status} />
                                            <DetailItem label="Payment Reference" value={applicationForStatus.payment_reference} />
                                            <DetailItem label="Payment Submitted On" value={formatDisplayDateTime(applicationForStatus.payment_submitted_at)} />
                                            <DetailItem label="Payment Confirmed On" value={formatDisplayDateTime(applicationForStatus.payment_confirmed_at)} />
                                            <DetailItem label="Licence Number" value={applicationForStatus.linked_company_license_no} mono />
                                        </dl>

                                        <section className="space-y-4">
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                    Licence Fee Summary
                                                </h3>
                                            </div>
                                            <LicenseFeeSummary
                                                licenseType={applicationForStatus.approved_license_type || applicationForStatus.requested_license_type}
                                                totalOverride={applicationForStatus.approved_fee_usd || applicationForStatus.estimated_fee_usd}
                                            />
                                        </section>

                                        {rejected && (
                                            <div className="border border-rose-200 bg-rose-50 p-5">
                                                <p className="text-[10px] uppercase tracking-widest text-rose-700/70">
                                                    Rejection Reason
                                                </p>
                                                <p className="mt-3 text-sm text-rose-800 whitespace-pre-wrap">
                                                    {applicationForStatus.rejection_reason?.trim() || 'No rejection reason was provided.'}
                                                </p>
                                            </div>
                                        )}

                                        {queried && (
                                            <div className="border border-amber-200 bg-amber-50 p-5">
                                                <p className="text-[10px] uppercase tracking-widest text-amber-800/70">
                                                    Compliance Query
                                                </p>
                                                <p className="mt-3 text-sm text-amber-900 whitespace-pre-wrap">
                                                    {applicationForStatus.query_note?.trim() || 'Compliance requested revisions for this application.'}
                                                </p>
                                            </div>
                                        )}

                                        {!applicationStatusLoading && (
                                            <section className="space-y-4">
                                                <div>
                                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                        Workflow Log
                                                    </h3>
                                                </div>
                                                <ApplicationEventLog
                                                    events={selectedApplicationStatusDetail?.events}
                                                    formatDisplayDateTime={formatDisplayDateTime}
                                                />
                                            </section>
                                        )}

                                        {awaitingContractorPayment && canResubmitApplications && (
                                            <div className="border border-brand-line/10 bg-brand-ink/[0.02] p-5 space-y-4">
                                                <div>
                                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                        Submit Payment
                                                    </h3>
                                                    <p className="mt-2 text-sm opacity-70">
                                                        Enter the payment reference after making payment so the Managing Director can confirm it and issue the licence.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="col-header">Payment Reference</label>
                                                    <input
                                                        type="text"
                                                        value={contractorPaymentReference}
                                                        onChange={(event) => setContractorPaymentReference(event.target.value)}
                                                        placeholder="e.g. OGFZA-PAY-20260315-001"
                                                        className="w-full bg-white border border-brand-line/10 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                                    />
                                                </div>

                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        disabled={actionLoading}
                                                        onClick={() => void handleContractorPaymentSubmission()}
                                                        className="bg-brand-ink text-brand-bg px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        Submit Payment Details
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {queried && canResubmitApplications && (
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleStartResubmission(selectedApplication)}
                                                    className="bg-brand-ink text-brand-bg px-4 py-3 text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    Edit & Resubmit
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {showApplicationReviewModal && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                        <div className="flex justify-between items-start mb-6 gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                    {isAdminReviewer ? 'Managing Director Review' : 'Compliance Review'}
                                </p>
                                <h2 className="text-2xl font-serif  text-brand-ink mt-2">
                                    {selectedApplicationDetail?.company_name || selectedApplicationName || 'Application Review'}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <span className="text-[10px] font-mono font-bold bg-brand-ink/5 px-2 py-1 rounded-full">
                                        {selectedApplicationDetail?.application_reference || '--'}
                                    </span>
                                    {selectedApplicationDetail && (
                                        <span
                                            className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${getApplicationStatusClasses(
                                                getApplicationStatusTone(getApplicationStatusLabel(selectedApplicationDetail))
                                            )}`}
                                        >
                                            {getApplicationStatusLabel(selectedApplicationDetail)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {selectedApplicationDetail && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => printCompanyApplicationSummary(selectedApplicationDetail)}
                                            className={printActionButtonClassName}
                                        >
                                            <Printer size={14} />
                                            Print Application Summary
                                        </button>
                                        {selectedApplicationDetail.linked_company_license_no && (
                                            <button
                                                type="button"
                                                onClick={() => printLicenceCertificate({
                                                    companyName: selectedApplicationDetail.company_name,
                                                    licenseNo: selectedApplicationDetail.linked_company_license_no,
                                                    licenseType: selectedApplicationDetail.approved_license_type || selectedApplicationDetail.requested_license_type,
                                                    freeZoneLocation: selectedApplicationDetail.free_zone_location,
                                                    issuedOn: selectedApplicationDetail.payment_confirmed_at || selectedApplicationDetail.approved_at,
                                                    approvedBy: selectedApplicationDetail.approved_by_name,
                                                    applicationReference: selectedApplicationDetail.application_reference,
                                                })}
                                                className={printActionButtonClassName}
                                            >
                                                <Printer size={14} />
                                                Print Licence
                                            </button>
                                        )}
                                        {selectedApplicationDetail.payment_status === 'Paid' && (
                                            <button
                                                type="button"
                                                onClick={() => printLicencePaymentReceipt({
                                                    companyName: selectedApplicationDetail.company_name,
                                                    applicationReference: selectedApplicationDetail.application_reference,
                                                    licenseNo: selectedApplicationDetail.linked_company_license_no,
                                                    licenseType: selectedApplicationDetail.approved_license_type || selectedApplicationDetail.requested_license_type,
                                                    amountPaid: selectedApplicationDetail.approved_fee_usd || selectedApplicationDetail.estimated_fee_usd,
                                                    paymentReference: selectedApplicationDetail.payment_reference,
                                                    paymentStatus: selectedApplicationDetail.payment_status,
                                                    paymentSubmittedOn: selectedApplicationDetail.payment_submitted_at,
                                                    paymentSubmittedBy: selectedApplicationDetail.payment_submitted_by_name,
                                                    paymentConfirmedOn: selectedApplicationDetail.payment_confirmed_at,
                                                    paymentConfirmedBy: selectedApplicationDetail.payment_confirmed_by_name,
                                                })}
                                                className={printActionButtonClassName}
                                            >
                                                <Printer size={14} />
                                                Print Receipt
                                            </button>
                                        )}
                                    </>
                                )}
                                <button type="button" onClick={closeApplicationReviewModal}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {applicationDetailLoading && (
                            <div className="py-16 text-center">
                                <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="mt-4 text-sm  opacity-50">
                                    Loading application details for review...
                                </p>
                            </div>
                        )}

                        {!applicationDetailLoading && applicationDetailError && (
                            <div className="border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                {applicationDetailError}
                            </div>
                        )}

                        {!applicationDetailLoading && !applicationDetailError && selectedApplicationDetail && (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Application Overview
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Application Reference" value={selectedApplicationDetail.application_reference} mono />
                                        <DetailItem label="Company Name" value={selectedApplicationDetail.company_name} />
                                        <DetailItem label="Status" value={getApplicationStatusLabel(selectedApplicationDetail)} />
                                        <DetailItem label="Incorporation Type" value={selectedApplicationDetail.incorporation_type} />
                                        <DetailItem label="Free Zone Location" value={selectedApplicationDetail.free_zone_location} />
                                        <DetailItem label="Requested Licence Type" value={selectedApplicationDetail.requested_license_type} />
                                        <DetailItem label="Approved Licence Type" value={selectedApplicationDetail.approved_license_type} />
                                        <DetailItem label="Estimated Fees (USD)" value={formatUsd(selectedApplicationDetail.estimated_fee_usd)} />
                                        <DetailItem label="Final Fees (USD)" value={formatUsd(selectedApplicationDetail.approved_fee_usd)} />
                                        <DetailItem label="Payment Status" value={selectedApplicationDetail.payment_status} />
                                        <DetailItem label="Payment Reference" value={selectedApplicationDetail.payment_reference} />
                                        <DetailItem label="Payment Submitted By" value={selectedApplicationDetail.payment_submitted_by_name} />
                                        <DetailItem label="Payment Submitted At" value={formatDisplayDateTime(selectedApplicationDetail.payment_submitted_at)} />
                                        <DetailItem label="Payment Confirmed By" value={selectedApplicationDetail.payment_confirmed_by_name} />
                                        <DetailItem label="Payment Confirmed At" value={formatDisplayDateTime(selectedApplicationDetail.payment_confirmed_at)} />
                                        <DetailItem label="Issued Licence No." value={selectedApplicationDetail.linked_company_license_no} mono />
                                        <DetailItem label="Submitted By" value={selectedApplicationDetail.submitted_by_name} />
                                        <DetailItem label="Submitted At" value={formatDisplayDateTime(selectedApplicationDetail.submitted_at)} />
                                        <DetailItem label="Reviewed By" value={selectedApplicationDetail.reviewed_by_name} />
                                        <DetailItem label="Returned By" value={selectedApplicationDetail.returned_by_name} />
                                        <DetailItem label="Approved By" value={selectedApplicationDetail.approved_by_name} />
                                        <DetailItem
                                            label="Latest Query Note"
                                            value={selectedApplicationDetail.query_note}
                                            preserveWhitespace
                                            className="md:col-span-3"
                                        />
                                        <DetailItem
                                            label="Rejection Reason"
                                            value={selectedApplicationDetail.rejection_reason}
                                            preserveWhitespace
                                            className="md:col-span-3"
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Licence Fee Summary
                                        </h3>
                                    </div>
                                    <LicenseFeeSummary
                                        licenseType={selectedApplicationDetail.approved_license_type || selectedApplicationDetail.requested_license_type}
                                        totalOverride={selectedApplicationDetail.approved_fee_usd || selectedApplicationDetail.estimated_fee_usd}
                                    />
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Workflow Log
                                        </h3>
                                    </div>
                                    <ApplicationEventLog
                                        events={selectedApplicationDetail.events}
                                        formatDisplayDateTime={formatDisplayDateTime}
                                    />
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Office Details
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <DetailItem
                                            label="Global Head Office Address"
                                            value={selectedApplicationDetail.global_head_office_address}
                                            preserveWhitespace
                                        />
                                        <DetailItem
                                            label="Office Address in Nigeria"
                                            value={selectedApplicationDetail.nigeria_office_address}
                                            preserveWhitespace
                                        />
                                        <DetailItem label="Global Telephone 1" value={selectedApplicationDetail.global_phone_1} />
                                        <DetailItem label="Global Telephone 2" value={selectedApplicationDetail.global_phone_2} />
                                        <DetailItem label="Global Email" value={selectedApplicationDetail.global_email} />
                                        <DetailItem label="Global Website" value={selectedApplicationDetail.global_website} />
                                        <DetailItem label="Nigeria Telephone 1" value={selectedApplicationDetail.nigeria_phone_1} />
                                        <DetailItem label="Nigeria Telephone 2" value={selectedApplicationDetail.nigeria_phone_2} />
                                        <DetailItem label="Nigeria Email" value={selectedApplicationDetail.nigeria_email} />
                                        <DetailItem label="Nigeria Website" value={selectedApplicationDetail.nigeria_website} />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Contact Information
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4 border border-brand-line/10 p-4">
                                            <p className="text-[10px] uppercase tracking-widest opacity-40">Primary Contact</p>
                                            <dl className="grid grid-cols-1 gap-4">
                                                <DetailItem label="Name" value={selectedApplicationDetail.primary_contact_name} />
                                                <DetailItem label="Designation" value={selectedApplicationDetail.primary_contact_designation} />
                                                <DetailItem label="Telephone" value={selectedApplicationDetail.primary_contact_phone} />
                                                <DetailItem label="Email" value={selectedApplicationDetail.primary_contact_email} />
                                            </dl>
                                        </div>

                                        <div className="space-y-4 border border-brand-line/10 p-4">
                                            <p className="text-[10px] uppercase tracking-widest opacity-40">Secondary Contact</p>
                                            <dl className="grid grid-cols-1 gap-4">
                                                <DetailItem label="Name" value={selectedApplicationDetail.secondary_contact_name} />
                                                <DetailItem label="Designation" value={selectedApplicationDetail.secondary_contact_designation} />
                                                <DetailItem label="Telephone" value={selectedApplicationDetail.secondary_contact_phone} />
                                                <DetailItem label="Email" value={selectedApplicationDetail.secondary_contact_email} />
                                            </dl>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Operations and Proposal
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <DetailItem
                                            label="Present Business Operations"
                                            value={selectedApplicationDetail.present_business_operations}
                                            preserveWhitespace
                                        />
                                        <DetailItem
                                            label="Countries of Operation in West Africa"
                                            value={selectedApplicationDetail.countries_of_operation_west_africa}
                                            preserveWhitespace
                                        />
                                        <DetailItem label="D.P.R Registration No." value={selectedApplicationDetail.dpr_registration_number} />
                                        <DetailItem label="Description of Activity" value={selectedApplicationDetail.activity_description} />
                                        <DetailItem
                                            label="Proposed Business Activity in the Free Zone"
                                            value={selectedApplicationDetail.proposed_business_activity}
                                            preserveWhitespace
                                            className="md:col-span-2"
                                        />
                                        <DetailItem
                                            label="Proposed Commencement Date"
                                            value={formatDisplayDate(selectedApplicationDetail.proposed_commencement_date)}
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Required Facilities and Cargo
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Undeveloped Land (m2)" value={selectedApplicationDetail.undeveloped_land_sqm} />
                                        <DetailItem label="Developed Land (m2)" value={selectedApplicationDetail.developed_land_sqm} />
                                        <DetailItem label="Concrete Stacking Area (m2)" value={selectedApplicationDetail.concrete_stacking_area_sqm} />
                                        <DetailItem label="Warehouse Space (m2)" value={selectedApplicationDetail.warehouse_space_sqm} />
                                        <DetailItem label="Factory Premises (m2)" value={selectedApplicationDetail.factory_premises_sqm} />
                                        <DetailItem label="Office Accommodation (m2)" value={selectedApplicationDetail.office_accommodation_sqm} />
                                        <DetailItem
                                            label="Equipment Requirement"
                                            value={selectedApplicationDetail.equipment_requirement}
                                            preserveWhitespace
                                            className="md:col-span-2"
                                        />
                                        <DetailItem
                                            label="Residential Accommodation Personnel"
                                            value={selectedApplicationDetail.residential_accommodation_personnel_count}
                                        />
                                        <DetailItem
                                            label="Estimate of Imports"
                                            value={selectedApplicationDetail.imports_summary}
                                            preserveWhitespace
                                            className="md:col-span-3"
                                        />
                                        <DetailItem
                                            label="Estimate of Exports"
                                            value={selectedApplicationDetail.exports_summary}
                                            preserveWhitespace
                                            className="md:col-span-3"
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Declaration
                                        </h3>
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Name" value={selectedApplicationDetail.declaration_name} />
                                        <DetailItem label="Designation" value={selectedApplicationDetail.declaration_designation} />
                                        <DetailItem
                                            label="Signature Date"
                                            value={formatDisplayDate(selectedApplicationDetail.declaration_signature_date)}
                                        />
                                    </dl>
                                </section>

                                <section className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                            Supporting Documents
                                        </h3>
                                    </div>
                                    <ApplicationDocumentChecklist
                                        incorporationType={selectedApplicationDetail.incorporation_type}
                                        documents={selectedApplicationDetail.documents}
                                    />
                                </section>

                                {(isComplianceReviewer || isAdminReviewer) && (
                                    <div className="border-t border-brand-line/10 pt-6 space-y-4">
                                        {isComplianceReviewer && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="col-header">Compliance Note</label>
                                                    <textarea
                                                        value={complianceReviewNote}
                                                        onChange={(event) => setComplianceReviewNote(event.target.value)}
                                                        className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                                        placeholder="Use this note when querying the contractor or optionally when rejecting."
                                                    />
                                                </div>

                                                <div className="flex flex-wrap justify-end gap-3">
                                                    {!selectedApplicationDetail.linked_company_id &&
                                                        (selectedApplicationDetail.status === 'Submitted' ||
                                                            selectedApplicationDetail.status === 'Under Review') ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={() => void handleComplianceReviewDecision('Approved')}
                                                                className="bg-emerald-600 text-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                Forward to Admin
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={() => {
                                                                    const normalizedNote = complianceReviewNote.trim();

                                                                    if (!normalizedNote) {
                                                                        window.alert('Please enter a compliance query note before returning this application.');
                                                                        return;
                                                                    }

                                                                    void handleComplianceReviewDecision('Returned', undefined, normalizedNote);
                                                                }}
                                                                className="border border-amber-200 text-amber-800 px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                Query
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={() => {
                                                                    const rejectionReason = complianceReviewNote.trim() || undefined;
                                                                    void handleComplianceReviewDecision('Rejected', rejectionReason);
                                                                }}
                                                                className="border border-rose-200 text-rose-700 px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] uppercase tracking-widest opacity-30">
                                                            No review action available
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {isAdminReviewer && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="col-header">MD Note</label>
                                                    <textarea
                                                        value={complianceReviewNote}
                                                        onChange={(event) => setComplianceReviewNote(event.target.value)}
                                                        className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                                        placeholder="Optional note for rejection or internal context."
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="col-header">Approved Licence Type</label>
                                                        <select
                                                            value={adminApprovedLicenseType}
                                                            onChange={(event) => setAdminApprovedLicenseType(event.target.value)}
                                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                                        >
                                                            <option value="">Select licence type</option>
                                                            {licenseTypeOptions.map((option) => (
                                                                <option key={option} value={option}>
                                                                    {option}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="col-header">Payment Reference</label>
                                                        <input
                                                            type="text"
                                                            value={adminPaymentReference}
                                                            onChange={(event) => setAdminPaymentReference(event.target.value)}
                                                            placeholder="Optional payment reference"
                                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <LicenseFeeSummary
                                                    licenseType={adminApprovedLicenseType || selectedApplicationDetail.approved_license_type || selectedApplicationDetail.requested_license_type}
                                                    totalOverride={getLicenseFeeSchedule(
                                                        adminApprovedLicenseType || selectedApplicationDetail.approved_license_type || selectedApplicationDetail.requested_license_type
                                                    )?.totalUsd}
                                                />

                                                <div className="flex flex-wrap justify-end gap-3">
                                                    {!selectedApplicationDetail.linked_company_id &&
                                                        selectedApplicationDetail.status === 'Awaiting Admin Approval' ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={() => void handleAdminReviewDecision('Approved')}
                                                                className="bg-emerald-600 text-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                Approve Pending Payment
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={() => {
                                                                    const rejectionReason = complianceReviewNote.trim() || undefined;
                                                                    void handleAdminReviewDecision('Rejected', rejectionReason);
                                                                }}
                                                                className="border border-rose-200 text-rose-700 px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                Final Reject
                                                            </button>
                                                        </>
                                                    ) : !selectedApplicationDetail.linked_company_id &&
                                                        selectedApplicationDetail.status === 'Payment Submitted' ? (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading}
                                                            onClick={() => void handleConfirmPaymentIssuance()}
                                                            className="bg-brand-ink text-brand-bg px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                        >
                                                            Confirm Payment & Issue Licence
                                                        </button>
                                                    ) : !selectedApplicationDetail.linked_company_id &&
                                                        selectedApplicationDetail.status === 'Approved Pending Payment' ? (
                                                        <span className="text-[10px] uppercase tracking-widest opacity-30">
                                                            Awaiting contractor payment submission
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] uppercase tracking-widest opacity-30">
                                                            No review action available
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-serif">Company Management</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                        Registry and application
                    </p>
                </div>
            </div>

            <div className="px-6 pt-5 border-b border-brand-line/10">
                <div className="inline-flex bg-brand-ink/5 p-1 rounded-sm gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveSection('registered')}
                        className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${activeSection === 'registered'
                            ? 'bg-white text-brand-ink shadow-sm'
                            : 'text-brand-ink/50 hover:text-brand-ink'
                            }`}
                    >
                        Registered Companies
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('applications')}
                        className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${activeSection === 'applications'
                            ? 'bg-white text-brand-ink shadow-sm'
                            : 'text-brand-ink/50 hover:text-brand-ink'
                            }`}
                    >
                        Company Applications
                    </button>
                </div>
            </div>

            {activeSection === 'registered' && (
                <>
                    <div className="p-6 border-b border-brand-line/10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>

                            <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                                Approved OGFZA Registered Entities
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {canExportRegistryReport && (
                                <button
                                    onClick={handlePrintRegistryReport}
                                    className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                                >
                                    Export Registry Report
                                </button>
                            )}
                            {canRegisterCompanies && (
                                <button
                                    onClick={openNewApplicationModal}
                                    className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                                >
                                    Submit New Application
                                </button>
                            )}
                        </div>
                    </div>

                    <ModuleFilters
                        searchValue={registeredSearchQuery}
                        onSearchChange={setRegisteredSearchQuery}
                        searchPlaceholder="Search by company, licence number, licence type, free zone, or representative email"
                        selects={[
                            {
                                label: 'Status',
                                value: registeredStatusFilter,
                                options: registeredStatusOptions.map((option) => ({ label: option, value: option })),
                                onChange: setRegisteredStatusFilter,
                            },
                        ]}
                        resultCount={filteredCompanies.length}
                        resultLabel="matching companies"
                    />

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left">
                            <thead>
                                <tr className="bg-brand-ink/5">
                                    <th className="p-4 col-header">Company Name</th>
                                    <th className="p-4 col-header">License No.</th>
                                    <th className="p-4 col-header">License Type</th>
                                    <th className="p-4 col-header">Incorporation</th>
                                    <th className="p-4 col-header">Free Zone</th>
                                    <th className="p-4 col-header">Representative</th>
                                    <th className="p-4 col-header">Status</th>
                                    <th className="p-4 col-header">Approved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompanies.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="data-row cursor-pointer hover:bg-brand-ink/5 focus:outline-none focus:bg-brand-ink/5"
                                        onClick={() => void handleOpenCompanyDetail(c)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                void handleOpenCompanyDetail(c);
                                            }
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`View details for ${c.name}`}
                                    >
                                        <td className="p-4 text-sm font-bold">{c.name}</td>
                                        <td className="p-4 data-value text-sm">{c.license_no || '--'}</td>
                                        <td className="p-4 text-xs opacity-80">{c.license_type || '--'}</td>
                                        <td className="p-4 text-xs opacity-80">{c.incorporation_type || '--'}</td>
                                        <td className="p-4 text-xs opacity-60">{c.free_zone_location || '--'}</td>
                                        <td className="p-4 text-xs opacity-70">{c.representative_email || '--'}</td>
                                        <td className="p-4">
                                            <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="p-4 data-value text-xs opacity-60">{formatDisplayDate(c.approved_date)}</td>
                                    </tr>
                                ))}
                                {filteredCompanies.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center  opacity-40">
                                            {companies.length === 0
                                                ? 'No approved companies available yet.'
                                                : 'No companies match the current filters.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeSection === 'applications' && (
                <>
                    <div className="p-6 border-b border-brand-line/10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>

                            <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                                {canReviewApplications
                                    ? 'Pending and processed submissions for review'
                                    : 'Track the status of your submitted applications'}
                            </p>
                        </div>

                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                            {filteredCompanyApplications.length} Showing
                        </span>
                    </div>

                    <ModuleFilters
                        searchValue={applicationSearchQuery}
                        onSearchChange={setApplicationSearchQuery}
                        searchPlaceholder="Search by company, reference, contact email, submitter, or licence type"
                        selects={[
                            {
                                label: 'Status',
                                value: applicationStatusFilter,
                                options: applicationStatusOptions.map((option) => ({ label: option, value: option })),
                                onChange: setApplicationStatusFilter,
                            },
                        ]}
                        resultCount={filteredCompanyApplications.length}
                        resultLabel="matching applications"
                    />

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left">
                            <thead>
                                <tr className="bg-brand-ink/5">
                                    <th className="p-4 col-header">Reference</th>
                                    <th className="p-4 col-header">Company</th>
                                    {canReviewApplications && <th className="p-4 col-header">Submitted By</th>}
                                    <th className="p-4 col-header">Contact Email</th>
                                    <th className="p-4 col-header">Submitted</th>
                                    <th className="p-4 col-header">Status</th>
                                    <th className="p-4 col-header">Last Action</th>
                                    {canReviewApplications && <th className="p-4 col-header">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompanyApplications.map((application) => {
                                const displayStatus = getApplicationStatusLabel(application);
                                const displayStatusClasses = getApplicationStatusClasses(
                                    getApplicationStatusTone(displayStatus)
                                );
                                const canActOnApplication =
                                    !application.linked_company_id &&
                                    (
                                        (isComplianceReviewer &&
                                            (application.status === 'Submitted' || application.status === 'Under Review')) ||
                                        (isAdminReviewer &&
                                            (application.status === 'Awaiting Admin Approval' ||
                                                application.status === 'Payment Submitted' ||
                                                application.status === 'Approved Pending Payment'))
                                    );
                                const lastActionDate = getLastActionDate(application);

                                    return (
                                        <tr
                                            key={application.id}
                                            className="data-row cursor-pointer hover:bg-brand-ink/5 focus:outline-none focus:bg-brand-ink/5"
                                            onClick={() => openApplicationStatusModal(application)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    openApplicationStatusModal(application);
                                                }
                                            }}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`View status for ${application.company_name}`}
                                        >
                                            <td className="p-4 text-xs font-mono">{application.application_reference}</td>
                                            <td className="p-4 text-sm font-bold">{application.company_name}</td>
                                            {canReviewApplications && (
                                                <td className="p-4 text-xs opacity-70">{application.submitted_by_name || '--'}</td>
                                            )}
                                            <td className="p-4 text-xs opacity-70">{application.primary_contact_email || '--'}</td>
                                            <td className="p-4 data-value text-xs opacity-60">
                                                {formatDisplayDate(application.submitted_at)}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${displayStatusClasses}`}
                                                >
                                                    {displayStatus}
                                                </span>

                                            </td>
                                            <td className="p-4 data-value text-xs opacity-60">
                                                {formatDisplayDate(lastActionDate)}
                                            </td>
                                            {canReviewApplications && (
                                                <td className="p-4">
                                                    {canActOnApplication ? (
                                                        isComplianceReviewer ? (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    void handleOpenApplicationReview(application);
                                                                }}
                                                                className="bg-brand-ink text-brand-bg px-3 py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                Review
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    void handleOpenApplicationReview(application);
                                                                }}
                                                                className="bg-brand-ink text-brand-bg px-3 py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                {application.status === 'Payment Submitted' ? 'Confirm Payment' : 'Review'}
                                                            </button>
                                                        )
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
                                {filteredCompanyApplications.length === 0 && (
                                    <tr>
                                        <td colSpan={canReviewApplications ? 9 : 7} className="p-8 text-center  opacity-40">
                                            {companyApplications.length === 0
                                                ? 'No company applications available yet.'
                                                : 'No applications match the current filters.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
