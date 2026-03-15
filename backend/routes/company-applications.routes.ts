import { Router } from "express";
import { randomInt } from "crypto";
import { pool, poolConnect, sql } from "@/db";
import { authenticateToken } from "../../middleware/auth.middleware";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import {
    CompanyApplicationDocumentType,
    companyApplicationDocumentCatalog,
    getCompanyApplicationDocumentRequirements,
    getLicenseFeeSchedule,
    isKnownLicenseType,
    licenseTypeOptions,
} from "@/src/constants/companyApplication";
import { transporter } from "../email";
import {
    createRequest,
    hasRole,
    isUniqueConstraintError,
    sendPushNotification,
    today,
} from "../helpers";

const router = Router();

const incorporationTypeOptions = [
    'Offshore/overseas incorporation',
    'Free Zone incorporation',
    'Nigerian registered company',
];

const freeZoneLocationOptions = [
    'Brass Oil & Gas Free Zone Area, Bayelsa State',
    'Eko Support Free Zone Area, Lagos State',
    'Liberty Oil & Gas Free Zone Area, Akwa Ibom State',
    'Onne Oil & Gas Free Zone Area, Rivers State',
    'Warri Oil & Gas Free Zone Area, Delta State',
    'Bestaf Maritime Industrial Free Zone, Lagos State',
];

const activityDescriptionOptions = [
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
];

const applicationStatuses = {
    draft: 'Draft',
    submitted: 'Submitted',
    underReview: 'Under Review',
    awaitingAdminApproval: 'Awaiting Admin Approval',
    returned: 'Returned',
    approvedPendingPayment: 'Approved Pending Payment',
    paymentSubmitted: 'Payment Submitted',
    licenseIssued: 'Licence Issued',
    approved: 'Approved',
    rejected: 'Rejected',
} as const;

const toNullableString = (value: unknown) => {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const toNullableDecimal = (value: unknown) => {
    const normalized = toNullableString(value);
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const toNullableInt = (value: unknown) => {
    const normalized = toNullableString(value);
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isInteger(parsed) ? parsed : null;
};

const toNullableDate = (value: unknown) => {
    const normalized = toNullableString(value);
    if (!normalized) return null;

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type NormalizedApplicationPayload = {
    company_name: string;
    incorporation_type: string;
    free_zone_location: string;
    requested_license_type: string;
    estimated_fee_usd: number;
    global_head_office_address: string | null;
    global_phone_1: string | null;
    global_email: string | null;
    global_phone_2: string | null;
    global_website: string | null;
    nigeria_office_address: string | null;
    nigeria_phone_1: string | null;
    nigeria_email: string | null;
    nigeria_phone_2: string | null;
    nigeria_website: string | null;
    primary_contact_name: string;
    primary_contact_designation: string | null;
    primary_contact_phone: string | null;
    primary_contact_email: string;
    secondary_contact_name: string | null;
    secondary_contact_designation: string | null;
    secondary_contact_phone: string | null;
    secondary_contact_email: string | null;
    present_business_operations: string | null;
    dpr_registration_number: string | null;
    activity_description: string | null;
    countries_of_operation_west_africa: string | null;
    proposed_business_activity: string;
    undeveloped_land_sqm: number | null;
    developed_land_sqm: number | null;
    concrete_stacking_area_sqm: number | null;
    warehouse_space_sqm: number | null;
    factory_premises_sqm: number | null;
    office_accommodation_sqm: number | null;
    equipment_requirement: string | null;
    residential_accommodation_personnel_count: number | null;
    imports_summary: string | null;
    exports_summary: string | null;
    proposed_commencement_date: Date | null;
    declaration_name: string | null;
    declaration_designation: string | null;
    declaration_signature_date: Date | null;
};

type NormalizedApplicationDocument = {
    document_type: CompanyApplicationDocumentType;
    file_name: string;
};

const normalizeApplicationPayload = (
    body: Record<string, unknown>,
): { payload?: NormalizedApplicationPayload; error?: string } => {
    const normalizedCompanyName = toNullableString(body.companyName);
    const normalizedIncorporationType = toNullableString(body.incorporationType);
    const normalizedFreeZoneLocation = toNullableString(body.freeZoneLocation);
    const normalizedRequestedLicenseType = toNullableString(body.requestedLicenseType);
    const normalizedPrimaryContactName = toNullableString(body.primaryContactName);
    const normalizedPrimaryContactEmail = toNullableString(body.primaryContactEmail);
    const normalizedProposedBusinessActivity = toNullableString(body.proposedBusinessActivity);

    if (
        !normalizedCompanyName ||
        !normalizedIncorporationType ||
        !normalizedFreeZoneLocation ||
        !normalizedRequestedLicenseType ||
        !normalizedPrimaryContactName ||
        !normalizedPrimaryContactEmail ||
        !normalizedProposedBusinessActivity
    ) {
        return {
            error: "Company name, incorporation type, requested licence type, free zone location, primary contact, and proposed activity are required.",
        };
    }

    if (!incorporationTypeOptions.includes(normalizedIncorporationType)) {
        return { error: "Invalid incorporation type selected." };
    }

    if (!freeZoneLocationOptions.includes(normalizedFreeZoneLocation)) {
        return { error: "Invalid free zone location selected." };
    }

    if (!licenseTypeOptions.includes(normalizedRequestedLicenseType as (typeof licenseTypeOptions)[number])) {
        return { error: "Invalid requested licence type selected." };
    }

    const normalizedActivityDescription = toNullableString(body.activityDescription);
    const feeSchedule = getLicenseFeeSchedule(normalizedRequestedLicenseType);

    if (
        normalizedActivityDescription &&
        !activityDescriptionOptions.includes(normalizedActivityDescription)
    ) {
        return { error: "Invalid activity description selected." };
    }

    if (!feeSchedule) {
        return { error: "Unable to calculate fees for the selected licence type." };
    }

    return {
        payload: {
            company_name: normalizedCompanyName,
            incorporation_type: normalizedIncorporationType,
            free_zone_location: normalizedFreeZoneLocation,
            requested_license_type: normalizedRequestedLicenseType,
            estimated_fee_usd: feeSchedule.totalUsd,
            global_head_office_address: toNullableString(body.globalHeadOfficeAddress),
            global_phone_1: toNullableString(body.globalPhone1),
            global_email: toNullableString(body.globalEmail),
            global_phone_2: toNullableString(body.globalPhone2),
            global_website: toNullableString(body.globalWebsite),
            nigeria_office_address: toNullableString(body.nigeriaOfficeAddress),
            nigeria_phone_1: toNullableString(body.nigeriaPhone1),
            nigeria_email: toNullableString(body.nigeriaEmail),
            nigeria_phone_2: toNullableString(body.nigeriaPhone2),
            nigeria_website: toNullableString(body.nigeriaWebsite),
            primary_contact_name: normalizedPrimaryContactName,
            primary_contact_designation: toNullableString(body.primaryContactDesignation),
            primary_contact_phone: toNullableString(body.primaryContactPhone),
            primary_contact_email: normalizedPrimaryContactEmail,
            secondary_contact_name: toNullableString(body.secondaryContactName),
            secondary_contact_designation: toNullableString(body.secondaryContactDesignation),
            secondary_contact_phone: toNullableString(body.secondaryContactPhone),
            secondary_contact_email: toNullableString(body.secondaryContactEmail),
            present_business_operations: toNullableString(body.presentBusinessOperations),
            dpr_registration_number: toNullableString(body.dprRegistrationNumber),
            activity_description: normalizedActivityDescription,
            countries_of_operation_west_africa: toNullableString(body.countriesOfOperationWestAfrica),
            proposed_business_activity: normalizedProposedBusinessActivity,
            undeveloped_land_sqm: toNullableDecimal(body.undevelopedLandSqm),
            developed_land_sqm: toNullableDecimal(body.developedLandSqm),
            concrete_stacking_area_sqm: toNullableDecimal(body.concreteStackingAreaSqm),
            warehouse_space_sqm: toNullableDecimal(body.warehouseSpaceSqm),
            factory_premises_sqm: toNullableDecimal(body.factoryPremisesSqm),
            office_accommodation_sqm: toNullableDecimal(body.officeAccommodationSqm),
            equipment_requirement: toNullableString(body.equipmentRequirement),
            residential_accommodation_personnel_count: toNullableInt(body.residentialAccommodationPersonnelCount),
            imports_summary: toNullableString(body.importsSummary),
            exports_summary: toNullableString(body.exportsSummary),
            proposed_commencement_date: toNullableDate(body.proposedCommencementDate),
            declaration_name: toNullableString(body.declarationName),
            declaration_designation: toNullableString(body.declarationDesignation),
            declaration_signature_date: toNullableDate(body.declarationSignatureDate),
        },
    };
};

const normalizeApplicationDocuments = (
    rawDocuments: unknown,
    incorporationType: string,
): { documents?: NormalizedApplicationDocument[]; error?: string } => {
    const documentRequirements = getCompanyApplicationDocumentRequirements(incorporationType);
    const editableRequirements = documentRequirements.filter(
        (document) => document.inputKind !== 'derived'
    );
    const requiredEditableRequirements = editableRequirements.filter(
        (document) => document.required !== false
    );
    const supportedDocumentTypes = new Set(
        Object.keys(companyApplicationDocumentCatalog) as CompanyApplicationDocumentType[]
    );
    const requiredDocumentTypes = new Set(
        editableRequirements.map((document) => document.documentType)
    );
    const fileNameByType = new Map<CompanyApplicationDocumentType, string>();

    if (rawDocuments !== undefined && rawDocuments !== null && !Array.isArray(rawDocuments)) {
        return { error: "Supporting documents payload is invalid." };
    }

    for (const rawDocument of Array.isArray(rawDocuments) ? rawDocuments : []) {
        if (!rawDocument || typeof rawDocument !== "object") {
            return { error: "Supporting documents payload is invalid." };
        }

        const documentType = toNullableString((rawDocument as Record<string, unknown>).documentType);
        const fileName = toNullableString((rawDocument as Record<string, unknown>).fileName);

        if (!documentType || !supportedDocumentTypes.has(documentType as CompanyApplicationDocumentType)) {
            return { error: "One of the supporting document types is invalid." };
        }

        if (!requiredDocumentTypes.has(documentType as CompanyApplicationDocumentType)) {
            continue;
        }

        if (fileName) {
            fileNameByType.set(documentType as CompanyApplicationDocumentType, fileName);
        }
    }

    const missingDocuments = requiredEditableRequirements.filter(
        (document) => !fileNameByType.has(document.documentType)
    );

    if (missingDocuments.length > 0) {
        return {
            error: `Please provide the required supporting documents: ${missingDocuments
                .map((document) => document.label)
                .join(", ")}.`,
        };
    }

    return {
        documents: editableRequirements.flatMap((document) => {
            const fileName = fileNameByType.get(document.documentType);

            if (!fileName) return [];

            return [{
                document_type: document.documentType,
                file_name: fileName,
            }];
        }),
    };
};

const bindApplicationPayloadInputs = (request: sql.Request, payload: NormalizedApplicationPayload) => (
    request
        .input("company_name", sql.NVarChar, payload.company_name)
        .input("incorporation_type", sql.NVarChar, payload.incorporation_type)
        .input("free_zone_location", sql.NVarChar, payload.free_zone_location)
        .input("requested_license_type", sql.NVarChar, payload.requested_license_type)
        .input("estimated_fee_usd", sql.Decimal(18, 2), payload.estimated_fee_usd)
        .input("global_head_office_address", sql.NVarChar(sql.MAX), payload.global_head_office_address)
        .input("global_phone_1", sql.NVarChar, payload.global_phone_1)
        .input("global_email", sql.NVarChar, payload.global_email)
        .input("global_phone_2", sql.NVarChar, payload.global_phone_2)
        .input("global_website", sql.NVarChar, payload.global_website)
        .input("nigeria_office_address", sql.NVarChar(sql.MAX), payload.nigeria_office_address)
        .input("nigeria_phone_1", sql.NVarChar, payload.nigeria_phone_1)
        .input("nigeria_email", sql.NVarChar, payload.nigeria_email)
        .input("nigeria_phone_2", sql.NVarChar, payload.nigeria_phone_2)
        .input("nigeria_website", sql.NVarChar, payload.nigeria_website)
        .input("primary_contact_name", sql.NVarChar, payload.primary_contact_name)
        .input("primary_contact_designation", sql.NVarChar, payload.primary_contact_designation)
        .input("primary_contact_phone", sql.NVarChar, payload.primary_contact_phone)
        .input("primary_contact_email", sql.NVarChar, payload.primary_contact_email)
        .input("secondary_contact_name", sql.NVarChar, payload.secondary_contact_name)
        .input("secondary_contact_designation", sql.NVarChar, payload.secondary_contact_designation)
        .input("secondary_contact_phone", sql.NVarChar, payload.secondary_contact_phone)
        .input("secondary_contact_email", sql.NVarChar, payload.secondary_contact_email)
        .input("present_business_operations", sql.NVarChar(sql.MAX), payload.present_business_operations)
        .input("dpr_registration_number", sql.NVarChar, payload.dpr_registration_number)
        .input("activity_description", sql.NVarChar(sql.MAX), payload.activity_description)
        .input("countries_of_operation_west_africa", sql.NVarChar(sql.MAX), payload.countries_of_operation_west_africa)
        .input("proposed_business_activity", sql.NVarChar(sql.MAX), payload.proposed_business_activity)
        .input("undeveloped_land_sqm", sql.Decimal(18, 2), payload.undeveloped_land_sqm)
        .input("developed_land_sqm", sql.Decimal(18, 2), payload.developed_land_sqm)
        .input("concrete_stacking_area_sqm", sql.Decimal(18, 2), payload.concrete_stacking_area_sqm)
        .input("warehouse_space_sqm", sql.Decimal(18, 2), payload.warehouse_space_sqm)
        .input("factory_premises_sqm", sql.Decimal(18, 2), payload.factory_premises_sqm)
        .input("office_accommodation_sqm", sql.Decimal(18, 2), payload.office_accommodation_sqm)
        .input("equipment_requirement", sql.NVarChar(sql.MAX), payload.equipment_requirement)
        .input(
            "residential_accommodation_personnel_count",
            sql.Int,
            payload.residential_accommodation_personnel_count
        )
        .input("imports_summary", sql.NVarChar(sql.MAX), payload.imports_summary)
        .input("exports_summary", sql.NVarChar(sql.MAX), payload.exports_summary)
        .input("proposed_commencement_date", sql.Date, payload.proposed_commencement_date)
        .input("declaration_name", sql.NVarChar, payload.declaration_name)
        .input("declaration_designation", sql.NVarChar, payload.declaration_designation)
        .input("declaration_signature_date", sql.Date, payload.declaration_signature_date)
);

const buildApplicationReference = (userId: number | undefined) => {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
    return `FZA-${timestamp}-${userId ?? 0}`;
};

const buildLicenseNumberCandidate = () => `RO-${randomInt(0, 100000).toString().padStart(5, "0")}`;

const generateUniqueLicenseNumber = async (transaction: sql.Transaction) => {
    for (let attempt = 0; attempt < 25; attempt += 1) {
        const candidate = buildLicenseNumberCandidate();
        const request = new sql.Request(transaction);
        request.input("license_no", sql.NVarChar, candidate);

        const result = await request.query(`
            SELECT TOP 1 id
            FROM dbo.companies
            WHERE license_no = @license_no
        `);

        if (result.recordset.length === 0) {
            return candidate;
        }
    }

    throw new Error("Failed to generate a unique company license number.");
};

type ApplicationEventType =
    | 'Submitted'
    | 'Resubmitted'
    | 'ForwardedToAdmin'
    | 'PaymentSubmitted'
    | 'ReturnedForRevision'
    | 'RejectedByCompliance'
    | 'RejectedByAdmin'
    | 'ApprovedByAdmin'
    | 'LicenseIssued';

type AppendApplicationEventInput = {
    applicationId: number;
    eventType: ApplicationEventType;
    actorUserId?: number | null;
    actorName?: string | null;
    actorRole?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    metadataJson?: string | null;
};

const appendApplicationEvent = async (
    parent: sql.Transaction | sql.ConnectionPool,
    {
        applicationId,
        eventType,
        actorUserId = null,
        actorName = null,
        actorRole = null,
        fromStatus = null,
        toStatus = null,
        note = null,
        metadataJson = null,
    }: AppendApplicationEventInput,
) => {
    const request = new sql.Request(parent);
    request
        .input("application_id", sql.Int, applicationId)
        .input("event_type", sql.NVarChar, eventType)
        .input("actor_user_id", sql.Int, actorUserId)
        .input("actor_name", sql.NVarChar, actorName)
        .input("actor_role", sql.NVarChar, actorRole)
        .input("from_status", sql.NVarChar, fromStatus)
        .input("to_status", sql.NVarChar, toStatus)
        .input("note", sql.NVarChar(sql.MAX), note)
        .input("metadata_json", sql.NVarChar(sql.MAX), metadataJson);

    await request.query(`
        INSERT INTO dbo.company_application_events (
            application_id,
            event_type,
            actor_user_id,
            actor_name,
            actor_role,
            from_status,
            to_status,
            note,
            metadata_json
        )
        VALUES (
            @application_id,
            @event_type,
            @actor_user_id,
            @actor_name,
            @actor_role,
            @from_status,
            @to_status,
            @note,
            @metadata_json
        )
    `);
};

const replaceCompanyApplicationDocuments = async (
    parent: sql.Transaction | sql.ConnectionPool,
    applicationId: number,
    documents: NormalizedApplicationDocument[],
) => {
    const deleteRequest = new sql.Request(parent);
    deleteRequest.input("application_id", sql.Int, applicationId);
    await deleteRequest.query(`
        DELETE FROM dbo.company_application_documents
        WHERE application_id = @application_id
    `);

    for (const document of documents) {
        const insertRequest = new sql.Request(parent);
        insertRequest
            .input("application_id", sql.Int, applicationId)
            .input("document_type", sql.NVarChar, document.document_type)
            .input("file_name", sql.NVarChar, document.file_name);

        await insertRequest.query(`
            INSERT INTO dbo.company_application_documents (
                application_id,
                document_type,
                file_name
            )
            VALUES (
                @application_id,
                @document_type,
                @file_name
            )
        `);
    }
};

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const canReviewApplications = hasRole(req.user?.role, ["Admin", "Compliance"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);

    if (!canReviewApplications && !isContractor) return res.sendStatus(403);

    try {
        const request = await createRequest();

        let query = `
            SELECT
                a.id,
                a.application_reference,
                a.company_name,
                a.free_zone_location,
                a.status,
                a.requested_license_type,
                a.approved_license_type,
                a.estimated_fee_usd,
                a.approved_fee_usd,
                a.payment_status,
                a.payment_submitted_at,
                a.payment_confirmed_at,
                a.submitted_at,
                a.primary_contact_name,
                a.primary_contact_email,
                submitter.full_name AS submitted_by_name,
                a.reviewed_at,
                a.returned_at,
                a.resubmitted_at,
                a.query_note,
                a.approved_at,
                a.rejected_at,
                a.rejection_reason,
                c.id AS linked_company_id
            FROM dbo.company_applications a
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
            LEFT JOIN dbo.users submitter ON submitter.id = a.submitted_by_user_id
        `;

        if (!canReviewApplications) {
            request.input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);
            query += ` WHERE a.submitted_by_user_id = @submitted_by_user_id`;
        }

        query += ` ORDER BY a.created_at DESC`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch company applications" });
    }
});

router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const applicationId = Number(req.params.id);
    const canReviewApplications = hasRole(req.user?.role, ["Admin", "Compliance"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);

    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ error: "Invalid application id." });
    }

    if (!canReviewApplications && !isContractor) return res.sendStatus(403);

    try {
        const request = await createRequest();
        request.input("id", sql.Int, applicationId);

        let query = `
            SELECT TOP 1
                a.id,
                a.application_reference,
                a.company_name,
                a.incorporation_type,
                a.free_zone_location,
                a.status,
                a.requested_license_type,
                a.approved_license_type,
                a.estimated_fee_usd,
                a.approved_fee_usd,
                a.payment_status,
                a.payment_reference,
                a.payment_submitted_at,
                a.payment_confirmed_at,
                a.submitted_at,
                a.reviewed_at,
                a.returned_at,
                a.resubmitted_at,
                a.query_note,
                a.approved_at,
                a.rejected_at,
                a.rejection_reason,
                a.primary_contact_name,
                a.primary_contact_designation,
                a.primary_contact_phone,
                a.primary_contact_email,
                a.secondary_contact_name,
                a.secondary_contact_designation,
                a.secondary_contact_phone,
                a.secondary_contact_email,
                a.global_head_office_address,
                a.global_phone_1,
                a.global_email,
                a.global_phone_2,
                a.global_website,
                a.nigeria_office_address,
                a.nigeria_phone_1,
                a.nigeria_email,
                a.nigeria_phone_2,
                a.nigeria_website,
                a.present_business_operations,
                a.dpr_registration_number,
                a.activity_description,
                a.countries_of_operation_west_africa,
                a.proposed_business_activity,
                a.undeveloped_land_sqm,
                a.developed_land_sqm,
                a.concrete_stacking_area_sqm,
                a.warehouse_space_sqm,
                a.factory_premises_sqm,
                a.office_accommodation_sqm,
                a.equipment_requirement,
                a.residential_accommodation_personnel_count,
                a.imports_summary,
                a.exports_summary,
                a.proposed_commencement_date,
                a.declaration_name,
                a.declaration_designation,
                a.declaration_signature_date,
                submitter.full_name AS submitted_by_name,
                reviewer.full_name AS reviewed_by_name,
                returned_by.full_name AS returned_by_name,
                approver.full_name AS approved_by_name,
                payment_submitter.full_name AS payment_submitted_by_name,
                payment_confirmer.full_name AS payment_confirmed_by_name,
                c.id AS linked_company_id,
                c.license_no AS linked_company_license_no
            FROM dbo.company_applications a
            LEFT JOIN dbo.users submitter ON submitter.id = a.submitted_by_user_id
            LEFT JOIN dbo.users reviewer ON reviewer.id = a.reviewed_by_user_id
            LEFT JOIN dbo.users returned_by ON returned_by.id = a.returned_by_user_id
            LEFT JOIN dbo.users approver ON approver.id = a.approved_by_user_id
            LEFT JOIN dbo.users payment_submitter ON payment_submitter.id = a.payment_submitted_by_user_id
            LEFT JOIN dbo.users payment_confirmer ON payment_confirmer.id = a.payment_confirmed_by_user_id
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
            WHERE a.id = @id
        `;

        if (!canReviewApplications) {
            request.input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);
            query += ` AND a.submitted_by_user_id = @submitted_by_user_id`;
        }

        const result = await request.query(query);
        const application = result.recordset[0];

        if (!application) {
            return res.status(404).json({ error: "Company application not found." });
        }

        const eventsRequest = await createRequest();
        eventsRequest.input("application_id", sql.Int, applicationId);

        const documentsRequest = await createRequest();
        documentsRequest.input("application_id", sql.Int, applicationId);

        const documentsResult = await documentsRequest.query(`
            SELECT
                id,
                application_id,
                document_type,
                file_name,
                created_at,
                updated_at
            FROM dbo.company_application_documents
            WHERE application_id = @application_id
            ORDER BY document_type ASC
        `);

        const eventsResult = await eventsRequest.query(`
            SELECT
                id,
                application_id,
                event_type,
                actor_user_id,
                actor_name,
                actor_role,
                from_status,
                to_status,
                note,
                metadata_json,
                created_at
            FROM dbo.company_application_events
            WHERE application_id = @application_id
            ORDER BY created_at ASC, id ASC
        `);

        res.json({
            ...application,
            documents: documentsResult.recordset,
            events: eventsResult.recordset,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch company application details" });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) return res.sendStatus(403);
    const { payload, error } = normalizeApplicationPayload(req.body ?? {});
    const { documents, error: documentsError } = normalizeApplicationDocuments(
        (req.body ?? {}).documents,
        payload?.incorporation_type || ""
    );

    if (!payload) {
        return res.status(400).json({ error: error || "Invalid company application payload." });
    }

    if (!documents) {
        return res.status(400).json({ error: documentsError || "Invalid company application documents payload." });
    }

    const applicationReference = buildApplicationReference(req.user?.id);
    const submittedAt = new Date();

    await poolConnect;

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin();
        transactionStarted = true;

        const request = new sql.Request(transaction);
        bindApplicationPayloadInputs(request, payload)
            .input("application_reference", sql.NVarChar, applicationReference)
            .input("status", sql.NVarChar, applicationStatuses.submitted)
            .input("submitted_by_user_id", sql.Int, req.user?.id ?? null)
            .input("submitted_at", sql.DateTime2, submittedAt);

        const result = await request.query(`
                INSERT INTO dbo.company_applications (
                    application_reference,
                    company_name,
                    incorporation_type,
                    free_zone_location,
                    requested_license_type,
                    estimated_fee_usd,
                    global_head_office_address,
                    global_phone_1,
                    global_email,
                    global_phone_2,
                    global_website,
                    nigeria_office_address,
                    nigeria_phone_1,
                    nigeria_email,
                    nigeria_phone_2,
                    nigeria_website,
                    primary_contact_name,
                    primary_contact_designation,
                    primary_contact_phone,
                    primary_contact_email,
                    secondary_contact_name,
                    secondary_contact_designation,
                    secondary_contact_phone,
                    secondary_contact_email,
                    present_business_operations,
                    dpr_registration_number,
                    activity_description,
                    countries_of_operation_west_africa,
                    proposed_business_activity,
                    undeveloped_land_sqm,
                    developed_land_sqm,
                    concrete_stacking_area_sqm,
                    warehouse_space_sqm,
                    factory_premises_sqm,
                    office_accommodation_sqm,
                    equipment_requirement,
                    residential_accommodation_personnel_count,
                    imports_summary,
                    exports_summary,
                    proposed_commencement_date,
                    declaration_name,
                    declaration_designation,
                    declaration_signature_date,
                    status,
                    submitted_by_user_id,
                    submitted_at
                )
                OUTPUT INSERTED.id, INSERTED.application_reference
                VALUES (
                    @application_reference,
                    @company_name,
                    @incorporation_type,
                    @free_zone_location,
                    @requested_license_type,
                    @estimated_fee_usd,
                    @global_head_office_address,
                    @global_phone_1,
                    @global_email,
                    @global_phone_2,
                    @global_website,
                    @nigeria_office_address,
                    @nigeria_phone_1,
                    @nigeria_email,
                    @nigeria_phone_2,
                    @nigeria_website,
                    @primary_contact_name,
                    @primary_contact_designation,
                    @primary_contact_phone,
                    @primary_contact_email,
                    @secondary_contact_name,
                    @secondary_contact_designation,
                    @secondary_contact_phone,
                    @secondary_contact_email,
                    @present_business_operations,
                    @dpr_registration_number,
                    @activity_description,
                    @countries_of_operation_west_africa,
                    @proposed_business_activity,
                    @undeveloped_land_sqm,
                    @developed_land_sqm,
                    @concrete_stacking_area_sqm,
                    @warehouse_space_sqm,
                    @factory_premises_sqm,
                    @office_accommodation_sqm,
                    @equipment_requirement,
                    @residential_accommodation_personnel_count,
                    @imports_summary,
                    @exports_summary,
                    @proposed_commencement_date,
                    @declaration_name,
                    @declaration_designation,
                    @declaration_signature_date,
                    @status,
                    @submitted_by_user_id,
                    @submitted_at
                )
            `);

        const applicationId = result.recordset[0].id as number;

        await replaceCompanyApplicationDocuments(transaction, applicationId, documents);

        await appendApplicationEvent(transaction, {
            applicationId,
            eventType: 'Submitted',
            actorUserId: req.user?.id ?? null,
            actorName: req.user?.fullName ?? null,
            actorRole: req.user?.role ?? null,
            fromStatus: null,
            toStatus: applicationStatuses.submitted,
            note: 'Company application submitted by contractor.',
        });

        await transaction.commit();
        transactionStarted = false;

        await transporter.sendMail({
            from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
            to: "admin@petroflow.com",
            subject: `Workflow: New Free Zone Application - ${payload.company_name}`,
            html: `
                <h4>A new company application has been submitted.</h4>
                <p>Reference: <strong>${applicationReference}</strong></p>
                <p>Company: ${payload.company_name}</p>
                <p>Incorporation Type: ${payload.incorporation_type}</p>
                <p>Free Zone Location: ${payload.free_zone_location}</p>
                <p>Submitted On: ${today()}</p>
            `,
        });

        sendPushNotification(
            "SUCCESS",
            "New Company Application Submitted",
            `Application "${applicationReference}" for "${payload.company_name}" is awaiting review.`,
        );

        res.status(201).json({
            id: result.recordset[0].id,
            applicationReference: result.recordset[0].application_reference,
        });
    } catch (err) {
        console.error(err);

        if (transactionStarted) {
            await transaction.rollback().catch(() => undefined);
        }

        if (isUniqueConstraintError(err)) {
            return res.status(409).json({ error: "A duplicate application reference was generated. Please try again." });
        }

        res.status(400).json({ error: "Failed to submit company application" });
    }
});

router.patch("/:id/resubmit", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) return res.sendStatus(403);

    const applicationId = Number(req.params.id);
    const { payload, error } = normalizeApplicationPayload(req.body ?? {});
    const { documents, error: documentsError } = normalizeApplicationDocuments(
        (req.body ?? {}).documents,
        payload?.incorporation_type || ""
    );

    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ error: "Invalid application id." });
    }

    if (!payload) {
        return res.status(400).json({ error: error || "Invalid company application payload." });
    }

    if (!documents) {
        return res.status(400).json({ error: documentsError || "Invalid company application documents payload." });
    }

    const resubmittedAt = new Date();

    await poolConnect;

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin();
        transactionStarted = true;

        const lookupRequest = new sql.Request(transaction);
        lookupRequest
            .input("id", sql.Int, applicationId)
            .input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);

        const existingApplicationResult = await lookupRequest.query(`
            SELECT TOP 1
                a.id,
                a.application_reference,
                a.status,
                a.query_note,
                c.id AS linked_company_id
            FROM dbo.company_applications a
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
            WHERE a.id = @id
              AND a.submitted_by_user_id = @submitted_by_user_id
        `);

        const existingApplication = existingApplicationResult.recordset[0] as {
            id: number;
            application_reference: string;
            status: string;
            query_note: string | null;
            linked_company_id: number | null;
        } | undefined;

        if (!existingApplication) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(404).json({ error: "Company application not found." });
        }

        if (existingApplication.linked_company_id) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Approved applications already linked to a company cannot be resubmitted." });
        }

        if (existingApplication.status !== applicationStatuses.returned) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Only queried applications can be edited and resubmitted." });
        }

        const request = new sql.Request(transaction);
        bindApplicationPayloadInputs(request, payload)
            .input("id", sql.Int, applicationId)
            .input("status", sql.NVarChar, applicationStatuses.submitted)
            .input("resubmitted_at", sql.DateTime2, resubmittedAt);

        await request.query(`
            UPDATE dbo.company_applications
            SET
                company_name = @company_name,
                incorporation_type = @incorporation_type,
                free_zone_location = @free_zone_location,
                requested_license_type = @requested_license_type,
                estimated_fee_usd = @estimated_fee_usd,
                global_head_office_address = @global_head_office_address,
                global_phone_1 = @global_phone_1,
                global_email = @global_email,
                global_phone_2 = @global_phone_2,
                global_website = @global_website,
                nigeria_office_address = @nigeria_office_address,
                nigeria_phone_1 = @nigeria_phone_1,
                nigeria_email = @nigeria_email,
                nigeria_phone_2 = @nigeria_phone_2,
                nigeria_website = @nigeria_website,
                primary_contact_name = @primary_contact_name,
                primary_contact_designation = @primary_contact_designation,
                primary_contact_phone = @primary_contact_phone,
                primary_contact_email = @primary_contact_email,
                secondary_contact_name = @secondary_contact_name,
                secondary_contact_designation = @secondary_contact_designation,
                secondary_contact_phone = @secondary_contact_phone,
                secondary_contact_email = @secondary_contact_email,
                present_business_operations = @present_business_operations,
                dpr_registration_number = @dpr_registration_number,
                activity_description = @activity_description,
                countries_of_operation_west_africa = @countries_of_operation_west_africa,
                proposed_business_activity = @proposed_business_activity,
                undeveloped_land_sqm = @undeveloped_land_sqm,
                developed_land_sqm = @developed_land_sqm,
                concrete_stacking_area_sqm = @concrete_stacking_area_sqm,
                warehouse_space_sqm = @warehouse_space_sqm,
                factory_premises_sqm = @factory_premises_sqm,
                office_accommodation_sqm = @office_accommodation_sqm,
                equipment_requirement = @equipment_requirement,
                residential_accommodation_personnel_count = @residential_accommodation_personnel_count,
                imports_summary = @imports_summary,
                exports_summary = @exports_summary,
                proposed_commencement_date = @proposed_commencement_date,
                declaration_name = @declaration_name,
                declaration_designation = @declaration_designation,
                declaration_signature_date = @declaration_signature_date,
                status = @status,
                reviewed_by_user_id = NULL,
                reviewed_at = NULL,
                approved_by_user_id = NULL,
                approved_at = NULL,
                approved_license_type = NULL,
                approved_fee_usd = NULL,
                payment_status = NULL,
                payment_reference = NULL,
                payment_submitted_at = NULL,
                payment_submitted_by_user_id = NULL,
                payment_confirmed_at = NULL,
                payment_confirmed_by_user_id = NULL,
                rejected_at = NULL,
                rejection_reason = NULL,
                resubmitted_at = @resubmitted_at,
                updated_at = SYSDATETIME()
            WHERE id = @id
        `);

        await replaceCompanyApplicationDocuments(transaction, existingApplication.id, documents);

        await appendApplicationEvent(transaction, {
            applicationId: existingApplication.id,
            eventType: 'Resubmitted',
            actorUserId: req.user?.id ?? null,
            actorName: req.user?.fullName ?? null,
            actorRole: req.user?.role ?? null,
            fromStatus: existingApplication.status,
            toStatus: applicationStatuses.submitted,
            note: existingApplication.query_note
                ? `Contractor resubmitted the application after addressing the compliance query.\n\nLatest query:\n${existingApplication.query_note}`
                : 'Contractor resubmitted the application after review feedback.',
        });

        await transaction.commit();
        transactionStarted = false;

        sendPushNotification(
            "INFO",
            "Company Application Resubmitted",
            `Application "${existingApplication.application_reference}" has been revised by the contractor and is awaiting compliance review.`,
        );

        const complianceUsersRequest = await createRequest();
        const complianceUsersResult = await complianceUsersRequest.query(`
            SELECT email
            FROM dbo.users
            WHERE role LIKE '%Compliance%'
              AND email IS NOT NULL
        `);

        const complianceEmails = [
            ...new Set(
                complianceUsersResult.recordset
                    .map((user: { email?: string | null }) => user.email?.trim())
                    .filter((email): email is string => Boolean(email))
            ),
        ];

        if (complianceEmails.length > 0) {
            void transporter.sendMail({
                from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
                to: complianceEmails.join(", "),
                subject: `Company Application Resubmitted: ${payload.company_name}`,
                html: `
                    <h4>A queried company application has been resubmitted.</h4>
                    <p>Reference: <strong>${existingApplication.application_reference}</strong></p>
                    <p>Company: ${payload.company_name}</p>
                    <p>Resubmitted On: ${today()}</p>
                `,
            }).catch((mailErr) => {
                console.error("Failed to send company application resubmission email", mailErr);
            });
        }

        res.json({
            id: existingApplication.id,
            applicationReference: existingApplication.application_reference,
            message: "Company application resubmitted successfully.",
        });
    } catch (err) {
        if (transactionStarted) {
            await transaction.rollback().catch(() => undefined);
        }

        console.error(err);
        res.status(400).json({ error: "Failed to resubmit company application." });
    }
});

router.patch("/:id/decision", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const isAdminReviewer = hasRole(req.user?.role, ["Admin"]);
    const isComplianceReviewer = hasRole(req.user?.role, ["Compliance"]) && !isAdminReviewer;

    if (!isAdminReviewer && !isComplianceReviewer) return res.sendStatus(403);

    const applicationId = Number(req.params.id);
    const decision = req.body?.decision as 'Approved' | 'Rejected' | 'Returned' | undefined;
    const rejectionReason = toNullableString(req.body?.rejectionReason);
    const queryNote = toNullableString(req.body?.queryNote);
    const requestedApprovedLicenseType = toNullableString(req.body?.approvedLicenseType);

    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ error: "Invalid application id." });
    }

    if (decision !== 'Approved' && decision !== 'Rejected' && decision !== 'Returned') {
        return res.status(400).json({ error: "Decision must be Approved, Returned, or Rejected." });
    }

    if (decision === 'Returned' && !isComplianceReviewer) {
        return res.status(403).json({ error: "Only compliance can query an application." });
    }

    if (decision === 'Returned' && !queryNote) {
        return res.status(400).json({ error: "A query note is required when returning an application for revision." });
    }

    await poolConnect;

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin();
        transactionStarted = true;

        const lookupRequest = new sql.Request(transaction);
        lookupRequest.input("id", sql.Int, applicationId);

        const applicationResult = await lookupRequest.query(`
            SELECT TOP 1
                a.id,
                a.company_name,
                a.incorporation_type,
                a.free_zone_location,
                a.requested_license_type,
                a.approved_license_type,
                a.primary_contact_email,
                submitter.email AS submitter_email,
                a.status,
                c.id AS linked_company_id,
                c.license_no AS linked_company_license_no
            FROM dbo.company_applications a
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
            LEFT JOIN dbo.users submitter ON submitter.id = a.submitted_by_user_id
            WHERE a.id = @id
        `);

        const application = applicationResult.recordset[0] as {
            id: number;
            company_name: string | null;
            incorporation_type: string | null;
            free_zone_location: string | null;
            requested_license_type: string | null;
            approved_license_type: string | null;
            primary_contact_email: string | null;
            submitter_email: string | null;
            status: string;
            linked_company_id: number | null;
            linked_company_license_no: string | null;
        } | undefined;

        if (!application) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(404).json({ error: "Company application not found." });
        }

        if ((decision === 'Rejected' || decision === 'Returned') && application.linked_company_id) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Approved applications already linked to a company cannot be modified." });
        }

        if (decision === 'Rejected' && application.status === 'Rejected') {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Application has already been rejected." });
        }

        if (decision === 'Returned' && application.status === applicationStatuses.returned) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Application has already been queried and is awaiting contractor revision." });
        }

        const previousStatus = application.status;
        const reviewTimestamp = new Date();
        let responseMessage = '';
        let notificationType: "SUCCESS" | "INFO" = decision === 'Approved' ? "SUCCESS" : "INFO";
        let notificationTitle = '';
        let emailSubject = '';
        let emailHeading = '';
        let emailStatus = '';
        let emailNote: string | null = null;
        let eventType: ApplicationEventType | null = null;
        let eventNote: string | null = null;

        if (isComplianceReviewer) {
            if (
                application.linked_company_id ||
                application.status === applicationStatuses.approvedPendingPayment ||
                application.status === applicationStatuses.licenseIssued ||
                application.status === applicationStatuses.approved
            ) {
                await transaction.rollback();
                transactionStarted = false;
                return res.status(409).json({ error: "This application has already received final approval." });
            }

            if (decision === 'Approved') {
                if (application.status === applicationStatuses.awaitingAdminApproval) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Application is already awaiting admin approval." });
                }

                const complianceApproveRequest = new sql.Request(transaction);
                complianceApproveRequest
                    .input("id", sql.Int, application.id)
                    .input("status", sql.NVarChar, applicationStatuses.awaitingAdminApproval)
                    .input("reviewed_by_user_id", sql.Int, req.user?.id ?? null)
                    .input("reviewed_at", sql.DateTime2, reviewTimestamp);

                await complianceApproveRequest.query(`
                    UPDATE dbo.company_applications
                    SET
                        status = @status,
                        reviewed_by_user_id = @reviewed_by_user_id,
                        reviewed_at = @reviewed_at,
                        approved_by_user_id = NULL,
                        approved_at = NULL,
                        rejected_at = NULL,
                        rejection_reason = NULL,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);

                responseMessage = 'Compliance review completed. Application is now awaiting admin approval.';
                notificationTitle = 'Company Application Forwarded';
                emailSubject = `Compliance Review Complete: ${application.company_name}`;
                emailHeading = 'Your free zone application has passed compliance review.';
                emailStatus = applicationStatuses.awaitingAdminApproval;
                eventType = 'ForwardedToAdmin';
                eventNote = 'Compliance review completed and the application was forwarded for final admin approval.';
            } else if (decision === 'Returned') {
                if (
                    application.status !== applicationStatuses.submitted &&
                    application.status !== applicationStatuses.underReview
                ) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Only submitted applications can be queried for revision." });
                }

                const returnRequest = new sql.Request(transaction);
                returnRequest
                    .input("id", sql.Int, application.id)
                    .input("status", sql.NVarChar, applicationStatuses.returned)
                    .input("reviewed_by_user_id", sql.Int, req.user?.id ?? null)
                    .input("reviewed_at", sql.DateTime2, reviewTimestamp)
                    .input("returned_by_user_id", sql.Int, req.user?.id ?? null)
                    .input("returned_at", sql.DateTime2, reviewTimestamp)
                    .input("query_note", sql.NVarChar(sql.MAX), queryNote);

                await returnRequest.query(`
                    UPDATE dbo.company_applications
                    SET
                        status = @status,
                        reviewed_by_user_id = @reviewed_by_user_id,
                        reviewed_at = @reviewed_at,
                        returned_by_user_id = @returned_by_user_id,
                        returned_at = @returned_at,
                        query_note = @query_note,
                        approved_by_user_id = NULL,
                        approved_at = NULL,
                        rejected_at = NULL,
                        rejection_reason = NULL,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);

                responseMessage = 'Application queried and returned to the contractor for revision.';
                notificationTitle = 'Company Application Queried';
                emailSubject = `Company Application Requires Revision: ${application.company_name}`;
                emailHeading = 'Your free zone application has been returned by compliance for revision.';
                emailStatus = applicationStatuses.returned;
                emailNote = queryNote;
                eventType = 'ReturnedForRevision';
                eventNote = queryNote;
            } else {
                if (application.status === applicationStatuses.rejected) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Application has already been rejected." });
                }

                const rejectRequest = new sql.Request(transaction);
                rejectRequest
                    .input("id", sql.Int, application.id)
                    .input("status", sql.NVarChar, applicationStatuses.rejected)
                    .input("reviewed_by_user_id", sql.Int, req.user?.id ?? null)
                    .input("reviewed_at", sql.DateTime2, reviewTimestamp)
                    .input("rejected_at", sql.DateTime2, reviewTimestamp)
                    .input("rejection_reason", sql.NVarChar(sql.MAX), rejectionReason);

                await rejectRequest.query(`
                    UPDATE dbo.company_applications
                    SET
                        status = @status,
                        reviewed_by_user_id = @reviewed_by_user_id,
                        reviewed_at = @reviewed_at,
                        approved_by_user_id = NULL,
                        approved_at = NULL,
                        rejected_at = @rejected_at,
                        rejection_reason = @rejection_reason,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);

                responseMessage = 'Application rejected by compliance.';
                notificationTitle = 'Company Application Rejected';
                emailSubject = `Company Application Rejected: ${application.company_name}`;
                emailHeading = 'Your free zone application was rejected during compliance review.';
                emailStatus = applicationStatuses.rejected;
                emailNote = rejectionReason;
                eventType = 'RejectedByCompliance';
                eventNote = rejectionReason;
            }
        } else {
            if (decision === 'Approved') {
                if (application.linked_company_id || application.status === applicationStatuses.licenseIssued) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "This application has already been linked to a licensed company." });
                }

                if (application.status === applicationStatuses.approvedPendingPayment) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "This application has already been approved and is awaiting payment confirmation." });
                }

                if (application.status !== applicationStatuses.awaitingAdminApproval) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Compliance must approve this application before final admin approval." });
                }

                const approvedLicenseType =
                    requestedApprovedLicenseType ||
                    application.approved_license_type ||
                    application.requested_license_type;

                if (!isKnownLicenseType(approvedLicenseType)) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(400).json({ error: "A valid approved licence type is required for final admin approval." });
                }

                const feeSchedule = getLicenseFeeSchedule(approvedLicenseType);

                if (!feeSchedule) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(400).json({ error: "Unable to calculate fees for the approved licence type." });
                }

                const approveRequest = new sql.Request(transaction);
                approveRequest
                    .input("id", sql.Int, application.id)
                    .input("status", sql.NVarChar, applicationStatuses.approvedPendingPayment)
                    .input("approved_by_user_id", sql.Int, req.user?.id ?? null)
                    .input("approved_at", sql.DateTime2, reviewTimestamp)
                    .input("approved_license_type", sql.NVarChar, approvedLicenseType)
                    .input("approved_fee_usd", sql.Decimal(18, 2), feeSchedule.totalUsd)
                    .input("payment_status", sql.NVarChar, "Awaiting Contractor Payment");

                await approveRequest.query(`
                    UPDATE dbo.company_applications
                    SET
                        status = @status,
                        approved_by_user_id = @approved_by_user_id,
                        approved_at = @approved_at,
                        approved_license_type = @approved_license_type,
                        approved_fee_usd = @approved_fee_usd,
                        payment_status = @payment_status,
                        payment_reference = NULL,
                        payment_submitted_at = NULL,
                        payment_submitted_by_user_id = NULL,
                        payment_confirmed_at = NULL,
                        payment_confirmed_by_user_id = NULL,
                        rejected_at = NULL,
                        rejection_reason = NULL,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);

                responseMessage = 'Application approved by the Managing Director. The contractor can now submit payment details for confirmation.';
                notificationTitle = 'Company Application Approved';
                emailSubject = `Company Application Approved: ${application.company_name}`;
                emailHeading = 'Your free zone application has received MD approval and is awaiting your payment submission.';
                emailStatus = applicationStatuses.approvedPendingPayment;
                emailNote = `Approved licence type: ${approvedLicenseType}. Prescribed fees total ${feeSchedule.totalUsd.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })} USD. Submit your payment reference so OGFZA can confirm payment and issue the licence.`;
                eventType = 'ApprovedByAdmin';
                eventNote = `Managing Director approved the application for ${approvedLicenseType}. The contractor must now submit payment details before the licence can be issued.`;
            } else {
                if (
                    application.linked_company_id ||
                    application.status === applicationStatuses.licenseIssued ||
                    application.status === applicationStatuses.approvedPendingPayment
                ) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Applications that have reached the payment or issuance stage cannot be rejected." });
                }

                if (application.status === applicationStatuses.rejected) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Application has already been rejected." });
                }

                if (application.status !== applicationStatuses.awaitingAdminApproval) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Compliance must approve this application before final admin decision." });
                }

                const rejectRequest = new sql.Request(transaction);
                rejectRequest
                    .input("id", sql.Int, application.id)
                    .input("status", sql.NVarChar, applicationStatuses.rejected)
                    .input("rejected_at", sql.DateTime2, reviewTimestamp)
                    .input("rejection_reason", sql.NVarChar(sql.MAX), rejectionReason);

                await rejectRequest.query(`
                    UPDATE dbo.company_applications
                    SET
                        status = @status,
                        approved_by_user_id = NULL,
                        approved_at = NULL,
                        rejected_at = @rejected_at,
                        rejection_reason = @rejection_reason,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);

                responseMessage = 'Application rejected by admin.';
                notificationTitle = 'Company Application Rejected';
                emailSubject = `Company Application Rejected: ${application.company_name}`;
                emailHeading = 'Your free zone application was rejected during final admin review.';
                emailStatus = applicationStatuses.rejected;
                emailNote = rejectionReason;
                eventType = 'RejectedByAdmin';
                eventNote = rejectionReason;
            }
        }

        if (eventType) {
            await appendApplicationEvent(transaction, {
                applicationId: application.id,
                eventType,
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: previousStatus,
                toStatus: emailStatus,
                note: eventNote,
            });
        }

        await transaction.commit();
        transactionStarted = false;

        sendPushNotification(
            notificationType,
            notificationTitle,
            responseMessage
        );

        const applicantEmails = [
            ...new Set(
                [application.primary_contact_email, application.submitter_email]
                    .map((email) => email?.trim())
                    .filter((email): email is string => Boolean(email))
            ),
        ];

        if (applicantEmails.length > 0) {
            void transporter.sendMail({
                from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
                to: applicantEmails.join(", "),
                subject: emailSubject,
                html: `
                    <h4>${emailHeading}</h4>
                    <p>Company: <strong>${application.company_name}</strong></p>
                    <p>Status: ${emailStatus}</p>
                    ${emailNote ? `<p>Note: ${emailNote}</p>` : ''}
                `,
            }).catch((mailErr) => {
                console.error("Failed to send company application decision email", mailErr);
            });
        }

        res.json({ message: responseMessage });
    } catch (err) {
        if (transactionStarted) {
            await transaction.rollback().catch(() => undefined);
        }

        console.error(err);

        if (isUniqueConstraintError(err)) {
            return res.status(409).json({ error: "This application has already been linked to a company." });
        }

        res.status(400).json({ error: `Failed to ${decision?.toLowerCase() || 'process'} company application.` });
    }
});

router.patch("/:id/submit-payment", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) return res.sendStatus(403);

    const applicationId = Number(req.params.id);
    const paymentReference = toNullableString(req.body?.paymentReference);

    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ error: "Invalid application id." });
    }

    if (!paymentReference) {
        return res.status(400).json({ error: "A payment reference is required before admin can confirm payment." });
    }

    await poolConnect;

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin();
        transactionStarted = true;

        const lookupRequest = new sql.Request(transaction);
        lookupRequest
            .input("id", sql.Int, applicationId)
            .input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);

        const applicationResult = await lookupRequest.query(`
            SELECT TOP 1
                a.id,
                a.application_reference,
                a.company_name,
                a.status,
                a.payment_status,
                c.id AS linked_company_id
            FROM dbo.company_applications a
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
            WHERE a.id = @id
              AND a.submitted_by_user_id = @submitted_by_user_id
        `);

        const application = applicationResult.recordset[0] as {
            id: number;
            application_reference: string;
            company_name: string | null;
            status: string;
            payment_status: string | null;
            linked_company_id: number | null;
        } | undefined;

        if (!application) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(404).json({ error: "Company application not found." });
        }

        if (application.linked_company_id || application.status === applicationStatuses.licenseIssued) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "A licence has already been issued for this application." });
        }

        if (application.status === applicationStatuses.paymentSubmitted) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Payment has already been submitted and is awaiting admin confirmation." });
        }

        if (application.status !== applicationStatuses.approvedPendingPayment) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Payment can only be submitted after MD approval." });
        }

        const paymentSubmittedAt = new Date();
        const submitPaymentRequest = new sql.Request(transaction);
        submitPaymentRequest
            .input("id", sql.Int, application.id)
            .input("status", sql.NVarChar, applicationStatuses.paymentSubmitted)
            .input("payment_status", sql.NVarChar, "Payment Submitted")
            .input("payment_reference", sql.NVarChar, paymentReference)
            .input("payment_submitted_at", sql.DateTime2, paymentSubmittedAt)
            .input("payment_submitted_by_user_id", sql.Int, req.user?.id ?? null);

        await submitPaymentRequest.query(`
            UPDATE dbo.company_applications
            SET
                status = @status,
                payment_status = @payment_status,
                payment_reference = @payment_reference,
                payment_submitted_at = @payment_submitted_at,
                payment_submitted_by_user_id = @payment_submitted_by_user_id,
                payment_confirmed_at = NULL,
                payment_confirmed_by_user_id = NULL,
                updated_at = SYSDATETIME()
            WHERE id = @id
        `);

        await appendApplicationEvent(transaction, {
            applicationId: application.id,
            eventType: 'PaymentSubmitted',
            actorUserId: req.user?.id ?? null,
            actorName: req.user?.fullName ?? null,
            actorRole: req.user?.role ?? null,
            fromStatus: application.status,
            toStatus: applicationStatuses.paymentSubmitted,
            note: `Contractor submitted payment reference ${paymentReference} for admin confirmation.`,
        });

        await transaction.commit();
        transactionStarted = false;

        sendPushNotification(
            "INFO",
            "Payment Submitted",
            `Payment details were submitted for application "${application.application_reference}".`,
        );

        const adminUsersRequest = await createRequest();
        const adminUsersResult = await adminUsersRequest.query(`
            SELECT email
            FROM dbo.users
            WHERE role LIKE '%Admin%'
              AND email IS NOT NULL
        `);

        const adminEmails = [
            ...new Set(
                adminUsersResult.recordset
                    .map((user: { email?: string | null }) => user.email?.trim())
                    .filter((email): email is string => Boolean(email))
            ),
        ];

        if (adminEmails.length > 0) {
            void transporter.sendMail({
                from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
                to: adminEmails.join(", "),
                subject: `Payment Submitted: ${application.company_name}`,
                html: `
                    <h4>A contractor has submitted payment details for licence issuance.</h4>
                    <p>Reference: <strong>${application.application_reference}</strong></p>
                    <p>Company: ${application.company_name}</p>
                    <p>Payment Reference: <strong>${paymentReference}</strong></p>
                    <p>Status: ${applicationStatuses.paymentSubmitted}</p>
                `,
            }).catch((mailErr) => {
                console.error("Failed to send payment submission email", mailErr);
            });
        }

        res.json({
            message: "Payment submitted successfully. Admin can now confirm payment and issue the licence.",
            paymentReference,
        });
    } catch (err) {
        if (transactionStarted) {
            await transaction.rollback().catch(() => undefined);
        }

        console.error(err);
        res.status(400).json({ error: "Failed to submit payment details." });
    }
});

router.patch("/:id/confirm-payment", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const isAdminReviewer = hasRole(req.user?.role, ["Admin"]);

    if (!isAdminReviewer) return res.sendStatus(403);

    const applicationId = Number(req.params.id);
    const paymentReference = toNullableString(req.body?.paymentReference);
    const requestedApprovedLicenseType = toNullableString(req.body?.approvedLicenseType);

    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ error: "Invalid application id." });
    }

    await poolConnect;

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin();
        transactionStarted = true;

        const lookupRequest = new sql.Request(transaction);
        lookupRequest.input("id", sql.Int, applicationId);

        const applicationResult = await lookupRequest.query(`
            SELECT TOP 1
                a.id,
                a.company_name,
                a.incorporation_type,
                a.free_zone_location,
                a.primary_contact_email,
                a.requested_license_type,
                a.approved_license_type,
                a.status,
                a.payment_status,
                a.payment_reference,
                submitter.email AS submitter_email,
                c.id AS linked_company_id,
                c.license_no AS linked_company_license_no
            FROM dbo.company_applications a
            LEFT JOIN dbo.users submitter ON submitter.id = a.submitted_by_user_id
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
            WHERE a.id = @id
        `);

        const application = applicationResult.recordset[0] as {
            id: number;
            company_name: string | null;
            incorporation_type: string | null;
            free_zone_location: string | null;
            primary_contact_email: string | null;
            requested_license_type: string | null;
            approved_license_type: string | null;
            status: string;
            payment_status: string | null;
            payment_reference: string | null;
            submitter_email: string | null;
            linked_company_id: number | null;
            linked_company_license_no: string | null;
        } | undefined;

        if (!application) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(404).json({ error: "Company application not found." });
        }

        const paymentReadyForConfirmation =
            application.status === applicationStatuses.paymentSubmitted ||
            application.status === applicationStatuses.approved ||
            (
                application.status === applicationStatuses.approvedPendingPayment &&
                application.payment_status === 'Payment Submitted'
            );

        if (!paymentReadyForConfirmation) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Only applications awaiting payment confirmation can be issued." });
        }

        if (application.linked_company_id && application.payment_status === 'Paid') {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "This application has already been issued as a registered company." });
        }

        const approvedLicenseType =
            requestedApprovedLicenseType ||
            application.approved_license_type ||
            application.requested_license_type;

        if (!isKnownLicenseType(approvedLicenseType)) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(400).json({ error: "A valid licence type is required before issuing the licence." });
        }

        const feeSchedule = getLicenseFeeSchedule(approvedLicenseType);

        if (!feeSchedule) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(400).json({ error: "Unable to calculate fees for the selected licence type." });
        }

        const issuanceTimestamp = new Date();
        const licenseNumber =
            application.linked_company_license_no ||
            await generateUniqueLicenseNumber(transaction);

        let linkedCompanyId = application.linked_company_id;

        if (!linkedCompanyId) {
            const insertCompanyRequest = new sql.Request(transaction);
            insertCompanyRequest
                .input("name", sql.NVarChar, application.company_name)
                .input("license_no", sql.NVarChar, licenseNumber)
                .input("license_type", sql.NVarChar, approvedLicenseType)
                .input("incorporation_type", sql.NVarChar, application.incorporation_type)
                .input("free_zone_location", sql.NVarChar, application.free_zone_location)
                .input("representative_email", sql.NVarChar, application.primary_contact_email)
                .input("status", sql.NVarChar, "Active")
                .input("approved_date", sql.Date, issuanceTimestamp)
                .input("approved_application_id", sql.Int, application.id);

            const insertCompanyResult = await insertCompanyRequest.query(`
                INSERT INTO dbo.companies (
                    name,
                    license_no,
                    license_type,
                    incorporation_type,
                    free_zone_location,
                    representative_email,
                    status,
                    approved_date,
                    approved_application_id
                )
                VALUES (
                    @name,
                    @license_no,
                    @license_type,
                    @incorporation_type,
                    @free_zone_location,
                    @representative_email,
                    @status,
                    @approved_date,
                    @approved_application_id
                );

                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
            `);

            linkedCompanyId = insertCompanyResult.recordset[0]?.id ?? null;
        } else {
            const syncCompanyRequest = new sql.Request(transaction);
            syncCompanyRequest
                .input("id", sql.Int, linkedCompanyId)
                .input("license_no", sql.NVarChar, licenseNumber)
                .input("license_type", sql.NVarChar, approvedLicenseType)
                .input("incorporation_type", sql.NVarChar, application.incorporation_type)
                .input("free_zone_location", sql.NVarChar, application.free_zone_location)
                .input("representative_email", sql.NVarChar, application.primary_contact_email)
                .input("status", sql.NVarChar, "Active")
                .input("approved_date", sql.Date, issuanceTimestamp);

            await syncCompanyRequest.query(`
                UPDATE dbo.companies
                SET
                    license_no = @license_no,
                    license_type = @license_type,
                    incorporation_type = @incorporation_type,
                    free_zone_location = @free_zone_location,
                    representative_email = @representative_email,
                    status = @status,
                    approved_date = @approved_date
                WHERE id = @id
            `);
        }

        const updateApplicationRequest = new sql.Request(transaction);
        updateApplicationRequest
            .input("id", sql.Int, application.id)
            .input("status", sql.NVarChar, applicationStatuses.licenseIssued)
            .input("approved_license_type", sql.NVarChar, approvedLicenseType)
            .input("approved_fee_usd", sql.Decimal(18, 2), feeSchedule.totalUsd)
            .input("payment_status", sql.NVarChar, "Paid")
            .input("payment_reference", sql.NVarChar, paymentReference || application.payment_reference)
            .input("payment_confirmed_at", sql.DateTime2, issuanceTimestamp)
            .input("payment_confirmed_by_user_id", sql.Int, req.user?.id ?? null);

        await updateApplicationRequest.query(`
            UPDATE dbo.company_applications
            SET
                status = @status,
                approved_license_type = @approved_license_type,
                approved_fee_usd = @approved_fee_usd,
                payment_status = @payment_status,
                payment_reference = @payment_reference,
                payment_confirmed_at = @payment_confirmed_at,
                payment_confirmed_by_user_id = @payment_confirmed_by_user_id,
                updated_at = SYSDATETIME()
            WHERE id = @id
        `);

        await appendApplicationEvent(transaction, {
            applicationId: application.id,
            eventType: 'LicenseIssued',
            actorUserId: req.user?.id ?? null,
            actorName: req.user?.fullName ?? null,
            actorRole: req.user?.role ?? null,
            fromStatus: application.status,
            toStatus: applicationStatuses.licenseIssued,
            note: paymentReference
                ? `Payment was confirmed under reference ${paymentReference}. Licence ${licenseNumber} was issued for ${approvedLicenseType}.`
                : application.payment_reference
                    ? `Payment was confirmed under reference ${application.payment_reference}. Licence ${licenseNumber} was issued for ${approvedLicenseType}.`
                    : `Payment was confirmed and licence ${licenseNumber} was issued for ${approvedLicenseType}.`,
        });

        await transaction.commit();
        transactionStarted = false;

        sendPushNotification(
            "SUCCESS",
            "Licence Issued",
            `Application "${application.company_name}" has been issued as ${licenseNumber}.`,
        );

        const applicantEmails = [
            ...new Set(
                [application.primary_contact_email, application.submitter_email]
                    .map((email) => email?.trim())
                    .filter((email): email is string => Boolean(email))
            ),
        ];

        if (applicantEmails.length > 0) {
            void transporter.sendMail({
                from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
                to: applicantEmails.join(", "),
                subject: `Licence Issued: ${application.company_name}`,
                html: `
                    <h4>Your free zone licence has been issued.</h4>
                    <p>Company: <strong>${application.company_name}</strong></p>
                    <p>Licence Type: ${approvedLicenseType}</p>
                    <p>Licence Number: <strong>${licenseNumber}</strong></p>
                    <p>Status: ${applicationStatuses.licenseIssued}</p>
                    ${paymentReference ? `<p>Payment Reference: ${paymentReference}</p>` : ''}
                `,
            }).catch((mailErr) => {
                console.error("Failed to send company application issuance email", mailErr);
            });
        }

        res.json({
            message: "Payment confirmed and licence issued successfully.",
            companyId: linkedCompanyId,
            licenseNumber,
        });
    } catch (err) {
        if (transactionStarted) {
            await transaction.rollback().catch(() => undefined);
        }

        console.error(err);

        if (isUniqueConstraintError(err)) {
            return res.status(409).json({ error: "This application has already been linked to a company." });
        }

        res.status(400).json({ error: "Failed to confirm payment and issue the licence." });
    }
});

export default router;
