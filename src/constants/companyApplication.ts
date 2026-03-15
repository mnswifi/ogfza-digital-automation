export const incorporationTypeOptions = [
    'Offshore/overseas incorporation',
    'Free Zone incorporation',
    'Nigerian registered company',
] as const;

export const freeZoneLocationOptions = [
    'Brass Oil & Gas Free Zone Area, Bayelsa State',
    'Eko Support Free Zone Area, Lagos State',
    'Liberty Oil & Gas Free Zone Area, Akwa Ibom State',
    'Onne Oil & Gas Free Zone Area, Rivers State',
    'Warri Oil & Gas Free Zone Area, Delta State',
    'Bestaf Maritime Industrial Free Zone, Lagos State',
] as const;

export const activityDescriptionOptions = [
    'Oil producing',
    'Exploration',
    'Drilling',
    'Calibration',
    'Processing plant',
    'Fabrication',
    'Manufacturing',
    'OCTG',
    'Oilfield services',
    'Marine services',
    'Engineering services',
] as const;

export const licenseTypeOptions = [
    'Free Zone Service Licence',
    'Free Zone Enterprise Licence',
    'Free Zone Enterprise - Special Activity Licence',
    'Free Zone Developer Licence',
] as const;

type LicenseFeeLineItem = {
    label: string;
    amountUsd: number;
};

type LicenseFeeDefinition = {
    timeline: string;
    paymentNote: string;
    lineItems: readonly LicenseFeeLineItem[];
};

type CompanyApplicationDocumentDefinition = {
    label: string;
    description: string;
    inputKind: 'reference' | 'derived';
    placeholder?: string;
    required?: boolean;
};

export const companyApplicationDocumentCatalog = {
    dpr_certificate: {
        label: 'DPR Certificate',
        description: 'Provide the filename or reference for the DPR Certificate submitted with the application.',
        inputKind: 'reference',
        placeholder: 'e.g. dpr_certificate.pdf',
        required: true,
    },
    certificate_of_incorporation: {
        label: 'Certificate of Incorporation',
        description: 'Provide the filename or reference for the Certificate of Incorporation.',
        inputKind: 'reference',
        placeholder: 'e.g. certificate_of_incorporation.pdf',
        required: true,
    },
    certificate_or_notarized_overseas_incorporation: {
        label: 'Certificate of Incorporation or Notarized Copy of Overseas Incorporation',
        description: 'Provide the filename or reference for the incorporation or notarized overseas incorporation document.',
        inputKind: 'reference',
        placeholder: 'e.g. notarized_overseas_incorporation.pdf',
        required: true,
    },
    memorandum_and_articles_of_association: {
        label: 'Memorandum and Articles of Association',
        description: 'Provide the filename or reference for the Memorandum and Articles of Association.',
        inputKind: 'reference',
        placeholder: 'e.g. memorandum_and_articles.pdf',
        required: true,
    },
    company_brochure_or_profile: {
        label: 'Company Brochure/Profile',
        description: 'Provide the filename or reference for the company brochure or profile.',
        inputKind: 'reference',
        placeholder: 'e.g. company_profile.pdf',
        required: true,
    },
    environmental_impact_assessment_report: {
        label: 'Environmental Impact Assessment (EIA) Report',
        description: 'Provide the filename or reference for the EIA report.',
        inputKind: 'reference',
        placeholder: 'e.g. eia_report.pdf',
        required: true,
    },
    company_contact_details: {
        label: 'Contact Person, Designation, Phone Numbers and Address of Company',
        description: 'This requirement is satisfied by the company and contact details already captured in the application form.',
        inputKind: 'derived',
        required: true,
    },
    feasibility_study_business_plan: {
        label: 'Report of the Feasibility Studies of the Intended Investment in the Zone (Business Plan)',
        description: 'Provide the filename or reference for the feasibility study or business plan.',
        inputKind: 'reference',
        placeholder: 'e.g. business_plan.pdf',
        required: true,
    },
    financial_and_personnel_profile: {
        label: 'Financial Profile & Personnel Profile',
        description: 'Provide the filename or reference for the financial and personnel profile.',
        inputKind: 'reference',
        placeholder: 'e.g. financial_personnel_profile.pdf',
        required: true,
    },
    sources_of_funding: {
        label: 'Sources of Funding',
        description: 'Provide the filename or reference for the submitted sources-of-funding document.',
        inputKind: 'reference',
        placeholder: 'e.g. sources_of_funding.pdf',
        required: true,
    },
    audited_accounts_last_three_years: {
        label: 'Companies Last Three Years Audited Account',
        description: 'Optional when the company has been in operation for less than one year.',
        inputKind: 'reference',
        placeholder: 'e.g. audited_accounts_2023_2025.zip',
        required: false,
    },
    facility_lease_confirmation: {
        label: 'Official Confirmation from NPA/Terminal Operator of Facility Leased',
        description: 'Provide the filename or reference for the facility lease confirmation.',
        inputKind: 'reference',
        placeholder: 'e.g. facility_lease_confirmation.pdf',
        required: true,
    },
    oil_and_gas_affidavit: {
        label: 'Affidavit Issued by a Notary Public that the Entity is Oil & Gas Related',
        description: 'Provide the filename or reference for the oil and gas affidavit.',
        inputKind: 'reference',
        placeholder: 'e.g. oil_gas_affidavit.pdf',
        required: true,
    },
    pre_incorporation_meeting_with_promoters: {
        label: 'Pre Incorporation Meeting with the Promoters',
        description: 'Provide the filename or reference for the pre-incorporation meeting evidence.',
        inputKind: 'reference',
        placeholder: 'e.g. pre_incorporation_meeting_minutes.pdf',
        required: true,
    },
    share_capital_and_stamp_duty_evidence: {
        label: 'Minimum of $500,000 Share Capital, Registry Stamp Duty of 1.5%',
        description: 'Provide the filename or reference for the share capital and stamp duty evidence.',
        inputKind: 'reference',
        placeholder: 'e.g. share_capital_and_stamp_duty.pdf',
        required: true,
    },
    financial_profile_fdi_and_personnel_profile: {
        label: 'Financial Profile/FDI & Personnel Profile',
        description: 'Provide the filename or reference for the financial profile, FDI, and personnel profile.',
        inputKind: 'reference',
        placeholder: 'e.g. financial_profile_fdi_personnel.pdf',
        required: true,
    },
} as const satisfies Record<string, CompanyApplicationDocumentDefinition>;

export type CompanyApplicationDocumentType = keyof typeof companyApplicationDocumentCatalog;
export type LicenseType = (typeof licenseTypeOptions)[number];

export type CompanyApplicationDocumentDraft = {
    documentType: CompanyApplicationDocumentType;
    fileName: string;
};

type CompanyApplicationDocumentRequirement = {
    documentType: CompanyApplicationDocumentType;
};

const licenseFeeCatalog: Record<LicenseType, LicenseFeeDefinition> = {
    'Free Zone Service Licence': {
        timeline: 'Licence is issued seven (7) days from submission of the listed requirements and confirmation of payment of prescribed fees.',
        paymentNote: 'Pay the Naira equivalent using the prevailing Central Bank of Nigeria (CBN) rate as at the date of payment.',
        lineItems: [
            { label: 'Application Form', amountUsd: 500 },
            { label: 'Service Licence Fee', amountUsd: 3000 },
            { label: 'Stamp Duty', amountUsd: 1000 },
        ],
    },
    'Free Zone Enterprise Licence': {
        timeline: 'Licence is issued seven (7) days from submission of the listed requirements and confirmation of payment of prescribed fees.',
        paymentNote: 'Pay the Naira equivalent using the prevailing Central Bank of Nigeria (CBN) rate as at the date of payment.',
        lineItems: [
            { label: 'Application Form', amountUsd: 5000 },
            { label: 'Enterprise Licence Fee', amountUsd: 25000 },
            { label: 'EIA Review', amountUsd: 3000 },
            { label: 'Stamp Duty', amountUsd: 7500 },
        ],
    },
    'Free Zone Enterprise - Special Activity Licence': {
        timeline: 'Licence is issued seven (7) days from submission of the listed requirements and confirmation of payment of prescribed fees.',
        paymentNote: 'Pay the Naira equivalent using the prevailing Central Bank of Nigeria (CBN) rate as at the date of payment.',
        lineItems: [
            { label: 'Application Form', amountUsd: 5000 },
            { label: 'Special Activity Licence Fee', amountUsd: 100000 },
            { label: 'EIA Review', amountUsd: 3000 },
            { label: 'Stamp Duty', amountUsd: 7500 },
        ],
    },
    'Free Zone Developer Licence': {
        timeline: 'Licence is issued seven (7) days from submission of the listed requirements and confirmation of payment of prescribed fees.',
        paymentNote: 'Pay the Naira equivalent using the prevailing Central Bank of Nigeria (CBN) rate as at the date of payment.',
        lineItems: [
            { label: 'Application Form', amountUsd: 5000 },
            { label: 'Developer Licence Fee', amountUsd: 200000 },
            { label: 'EIA Review', amountUsd: 3000 },
            { label: 'Stamp Duty', amountUsd: 7500 },
        ],
    },
};

const companyApplicationDocumentRequirementsByIncorporationType: Record<
    (typeof incorporationTypeOptions)[number],
    readonly CompanyApplicationDocumentRequirement[]
> = {
    'Nigerian registered company': [
        { documentType: 'dpr_certificate' },
        { documentType: 'certificate_of_incorporation' },
        { documentType: 'memorandum_and_articles_of_association' },
        { documentType: 'company_brochure_or_profile' },
        { documentType: 'environmental_impact_assessment_report' },
        { documentType: 'company_contact_details' },
        { documentType: 'feasibility_study_business_plan' },
        { documentType: 'financial_and_personnel_profile' },
        { documentType: 'sources_of_funding' },
        { documentType: 'audited_accounts_last_three_years' },
        { documentType: 'facility_lease_confirmation' },
    ],
    'Offshore/overseas incorporation': [
        { documentType: 'certificate_or_notarized_overseas_incorporation' },
        { documentType: 'memorandum_and_articles_of_association' },
        { documentType: 'company_brochure_or_profile' },
        { documentType: 'environmental_impact_assessment_report' },
        { documentType: 'company_contact_details' },
        { documentType: 'feasibility_study_business_plan' },
        { documentType: 'financial_and_personnel_profile' },
        { documentType: 'sources_of_funding' },
        { documentType: 'audited_accounts_last_three_years' },
        { documentType: 'oil_and_gas_affidavit' },
        { documentType: 'facility_lease_confirmation' },
    ],
    'Free Zone incorporation': [
        { documentType: 'memorandum_and_articles_of_association' },
        { documentType: 'pre_incorporation_meeting_with_promoters' },
        { documentType: 'share_capital_and_stamp_duty_evidence' },
        { documentType: 'environmental_impact_assessment_report' },
        { documentType: 'company_brochure_or_profile' },
        { documentType: 'company_contact_details' },
        { documentType: 'feasibility_study_business_plan' },
        { documentType: 'financial_profile_fdi_and_personnel_profile' },
        { documentType: 'sources_of_funding' },
        { documentType: 'facility_lease_confirmation' },
    ],
};

const isKnownIncorporationType = (
    incorporationType?: string | null,
): incorporationType is (typeof incorporationTypeOptions)[number] => (
    Boolean(incorporationType) &&
    incorporationTypeOptions.includes(incorporationType as (typeof incorporationTypeOptions)[number])
);

export const isKnownLicenseType = (
    licenseType?: string | null,
): licenseType is LicenseType => (
    Boolean(licenseType) &&
    licenseTypeOptions.includes(licenseType as LicenseType)
);

export const getLicenseFeeSchedule = (licenseType?: string | null) => {
    if (!isKnownLicenseType(licenseType)) {
        return null;
    }

    const definition = licenseFeeCatalog[licenseType];
    const totalUsd = definition.lineItems.reduce((sum, item) => sum + item.amountUsd, 0);

    return {
        licenseType,
        timeline: definition.timeline,
        paymentNote: definition.paymentNote,
        lineItems: [...definition.lineItems],
        totalUsd,
    };
};

export const getCompanyApplicationDocumentRequirements = (incorporationType?: string | null) => {
    if (!isKnownIncorporationType(incorporationType)) {
        return [];
    }

    return companyApplicationDocumentRequirementsByIncorporationType[incorporationType].map((requirement) => ({
        documentType: requirement.documentType,
        ...companyApplicationDocumentCatalog[requirement.documentType],
    }));
};

const getEditableCompanyApplicationDocumentRequirements = (incorporationType?: string | null) => (
    getCompanyApplicationDocumentRequirements(incorporationType)
        .filter((requirement) => requirement.inputKind !== 'derived')
);

export const mergeCompanyApplicationDocuments = (
    incorporationType?: string | null,
    existingDocuments: CompanyApplicationDocumentDraft[] = [],
) => {
    const existingByType = new Map(
        existingDocuments.map((document) => [document.documentType, document.fileName.trim()])
    );

    return getEditableCompanyApplicationDocumentRequirements(incorporationType).map((requirement) => ({
        documentType: requirement.documentType,
        fileName: existingByType.get(requirement.documentType) || '',
    }));
};
