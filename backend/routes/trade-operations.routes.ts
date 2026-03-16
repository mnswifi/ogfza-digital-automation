import { Router } from "express";
import { pool, poolConnect, sql } from "@/db";
import { authenticateToken } from "../../middleware/auth.middleware";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import {
    getTradeOperationService,
    getTradeOperationServiceDocumentRequirements,
    isKnownTradeOperationServiceType,
    type TradeOperationDocumentType,
    type TradeOperationFamilyKey,
    type TradeOperationServiceType,
    tradeOperationDocumentCatalog,
} from "@/src/constants/tradeOperations";
import { createRequest, hasRole, sendPushNotification } from "../helpers";

const router = Router();

const requestStatuses = {
    submitted: "Submitted",
    returned: "Returned",
    approved: "Approved",
    rejected: "Rejected",
} as const;

type TradeOperationEventType =
    | "Submitted"
    | "Resubmitted"
    | "ReturnedForRevision"
    | "Approved"
    | "Rejected";

type NormalizedTradeOperationPayload = {
    company_id: number;
    service_type: TradeOperationServiceType;
    service_family: TradeOperationFamilyKey;
    operation_summary: string;
    requested_completion_date: Date | null;
};

type NormalizedTradeOperationDocument = {
    document_type: TradeOperationDocumentType;
    file_name: string;
};

const toNullableString = (value: unknown) => {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const toRequiredInt = (value: unknown) => {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;

    const normalized = toNullableString(value);
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toNullableDate = (value: unknown) => {
    const normalized = toNullableString(value);
    if (!normalized) return null;

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeTradeOperationPayload = (
    body: Record<string, unknown>,
): { payload?: NormalizedTradeOperationPayload; error?: string } => {
    const companyId = toRequiredInt(body.companyId);
    const serviceType = toNullableString(body.serviceType);
    const operationSummary =
        toNullableString(body.requestSummary) ||
        toNullableString(body.operationSummary) ||
        toNullableString(body.goodsDescription);

    if (!companyId || !serviceType || !operationSummary) {
        return {
            error: "Company, service type, and request summary are required.",
        };
    }

    if (!isKnownTradeOperationServiceType(serviceType)) {
        return { error: "Invalid trade operation service selected." };
    }

    const serviceDefinition = getTradeOperationService(serviceType);

    if (!serviceDefinition) {
        return { error: "Unable to resolve the selected trade operation service." };
    }

    return {
        payload: {
            company_id: companyId,
            service_type: serviceType,
            service_family: serviceDefinition.family,
            operation_summary: operationSummary,
            requested_completion_date: toNullableDate(body.requestedCompletionDate),
        },
    };
};

const normalizeTradeOperationDocuments = (
    rawDocuments: unknown,
    serviceType: TradeOperationServiceType,
): { documents?: NormalizedTradeOperationDocument[]; error?: string } => {
    const supportedDocumentTypes = new Set(
        Object.keys(tradeOperationDocumentCatalog) as TradeOperationDocumentType[]
    );
    const requirements = getTradeOperationServiceDocumentRequirements(serviceType);
    const requiredDocumentTypes = new Set(
        requirements
            .filter((requirement) => requirement.required !== false)
            .map((requirement) => requirement.documentType)
    );
    const fileNameByType = new Map<TradeOperationDocumentType, string>();

    if (rawDocuments !== undefined && rawDocuments !== null && !Array.isArray(rawDocuments)) {
        return { error: "Supporting documents payload is invalid." };
    }

    for (const rawDocument of Array.isArray(rawDocuments) ? rawDocuments : []) {
        if (!rawDocument || typeof rawDocument !== "object") {
            return { error: "Supporting documents payload is invalid." };
        }

        const documentType = toNullableString((rawDocument as Record<string, unknown>).documentType);
        const fileName = toNullableString((rawDocument as Record<string, unknown>).fileName);

        if (!documentType || !supportedDocumentTypes.has(documentType as TradeOperationDocumentType)) {
            return { error: "One of the trade operation document types is invalid." };
        }

        if (!requiredDocumentTypes.has(documentType as TradeOperationDocumentType)) {
            continue;
        }

        if (fileName) {
            fileNameByType.set(documentType as TradeOperationDocumentType, fileName);
        }
    }

    const missingDocuments = requirements.filter(
        (requirement) =>
            requirement.required !== false &&
            !fileNameByType.has(requirement.documentType)
    );

    if (missingDocuments.length > 0) {
        return {
            error: `Please provide the required supporting documents: ${missingDocuments
                .map((document) => document.label)
                .join(", ")}.`,
        };
    }

    return {
        documents: requirements.flatMap((requirement) => {
            const fileName = fileNameByType.get(requirement.documentType);

            if (!fileName) return [];

            return [{
                document_type: requirement.documentType,
                file_name: fileName,
            }];
        }),
    };
};

const bindTradeOperationPayloadInputs = (
    request: sql.Request,
    payload: NormalizedTradeOperationPayload
) => (
    request
        .input("company_id", sql.Int, payload.company_id)
        .input("service_family", sql.NVarChar, payload.service_family)
        .input("service_type", sql.NVarChar, payload.service_type)
        .input("goods_description", sql.NVarChar(sql.MAX), payload.operation_summary)
        .input("cargo_category", sql.NVarChar, null)
        .input("origin_location", sql.NVarChar, null)
        .input("destination_location", sql.NVarChar, null)
        .input("quantity_value", sql.Decimal(18, 2), null)
        .input("quantity_unit", sql.NVarChar, null)
        .input("weight_kg", sql.Decimal(18, 2), null)
        .input("container_count", sql.Int, null)
        .input("shipment_reference", sql.NVarChar, null)
        .input("customs_reference", sql.NVarChar, null)
        .input("operation_summary", sql.NVarChar(sql.MAX), payload.operation_summary)
        .input("requested_completion_date", sql.Date, payload.requested_completion_date)
);

const buildTradeOperationReference = (userId: number | undefined) => {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
    return `TOR-${timestamp}-${userId ?? 0}`;
};

type AppendTradeOperationEventInput = {
    requestId: number;
    eventType: TradeOperationEventType;
    actorUserId?: number | null;
    actorName?: string | null;
    actorRole?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    metadataJson?: string | null;
};

const appendTradeOperationEvent = async (
    parent: sql.Transaction | sql.ConnectionPool,
    {
        requestId,
        eventType,
        actorUserId = null,
        actorName = null,
        actorRole = null,
        fromStatus = null,
        toStatus = null,
        note = null,
        metadataJson = null,
    }: AppendTradeOperationEventInput
) => {
    const request = new sql.Request(parent);
    request
        .input("request_id", sql.Int, requestId)
        .input("event_type", sql.NVarChar, eventType)
        .input("actor_user_id", sql.Int, actorUserId)
        .input("actor_name", sql.NVarChar, actorName)
        .input("actor_role", sql.NVarChar, actorRole)
        .input("from_status", sql.NVarChar, fromStatus)
        .input("to_status", sql.NVarChar, toStatus)
        .input("note", sql.NVarChar(sql.MAX), note)
        .input("metadata_json", sql.NVarChar(sql.MAX), metadataJson);

    await request.query(`
        INSERT INTO dbo.trade_operation_request_events (
            request_id,
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
            @request_id,
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

const replaceTradeOperationDocuments = async (
    parent: sql.Transaction | sql.ConnectionPool,
    tradeOperationId: number,
    documents: NormalizedTradeOperationDocument[],
) => {
    const deleteRequest = new sql.Request(parent);
    deleteRequest.input("request_id", sql.Int, tradeOperationId);
    await deleteRequest.query(`
        DELETE FROM dbo.trade_operation_request_documents
        WHERE request_id = @request_id
    `);

    for (const document of documents) {
        const insertRequest = new sql.Request(parent);
        insertRequest
            .input("request_id", sql.Int, tradeOperationId)
            .input("document_type", sql.NVarChar, document.document_type)
            .input("file_name", sql.NVarChar, document.file_name);

        await insertRequest.query(`
            INSERT INTO dbo.trade_operation_request_documents (
                request_id,
                document_type,
                file_name
            )
            VALUES (
                @request_id,
                @document_type,
                @file_name
            )
        `);
    }
};

const notifyComplianceTeam = (message: string, detail?: string) => {
    sendPushNotification("trade-operations", message, detail);
};

const rollbackQuietly = async (transaction: sql.Transaction) => {
    try {
        await transaction.rollback();
    } catch {
        // Ignore rollback errors when the transaction is already completed.
    }
};

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const canReviewRequests = hasRole(req.user?.role, ["Admin", "Compliance"]);
    const canMonitorRequests = hasRole(req.user?.role, ["Operations"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);

    if (!canReviewRequests && !canMonitorRequests && !isContractor) return res.sendStatus(403);

    try {
        const request = await createRequest();

        let query = `
            SELECT
                r.id,
                r.request_reference,
                r.company_id,
                c.name AS company_name,
                c.license_no AS company_license_no,
                c.license_type AS company_license_type,
                r.service_family,
                r.service_type,
                r.status,
                r.submitted_at,
                submitter.full_name AS submitted_by_name,
                r.reviewed_at,
                r.returned_at,
                r.resubmitted_at,
                r.approved_at,
                r.rejected_at,
                r.query_note,
                r.rejection_reason
            FROM dbo.trade_operation_requests r
            INNER JOIN dbo.companies c
                ON c.id = r.company_id
            LEFT JOIN dbo.users submitter
                ON submitter.id = r.submitted_by_user_id
        `;

        if (!canReviewRequests && !canMonitorRequests && isContractor) {
            query += `
                WHERE r.submitted_by_user_id = @user_id
            `;
            request.input("user_id", sql.Int, req.user?.id ?? null);
        }

        query += `
            ORDER BY
                COALESCE(r.resubmitted_at, r.submitted_at) DESC,
                r.id DESC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch trade operation requests." });
    }
});

router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const tradeOperationId = Number(req.params.id);
    const canReviewRequests = hasRole(req.user?.role, ["Admin", "Compliance"]);
    const canMonitorRequests = hasRole(req.user?.role, ["Operations"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);

    if (!Number.isInteger(tradeOperationId) || tradeOperationId <= 0) {
        return res.status(400).json({ error: "Invalid trade operation request id." });
    }

    if (!canReviewRequests && !canMonitorRequests && !isContractor) return res.sendStatus(403);

    try {
        const request = await createRequest();
        request.input("id", sql.Int, tradeOperationId);

        let query = `
            SELECT TOP 1
                r.id,
                r.request_reference,
                r.company_id,
                c.name AS company_name,
                c.license_no AS company_license_no,
                c.license_type AS company_license_type,
                r.service_family,
                r.service_type,
                r.status,
                r.goods_description,
                r.cargo_category,
                r.origin_location,
                r.destination_location,
                r.quantity_value,
                r.quantity_unit,
                r.weight_kg,
                r.container_count,
                r.shipment_reference,
                r.customs_reference,
                r.operation_summary,
                r.requested_completion_date,
                r.submitted_at,
                submitter.full_name AS submitted_by_name,
                r.reviewed_at,
                reviewer.full_name AS reviewed_by_name,
                r.returned_at,
                returned_by.full_name AS returned_by_name,
                r.resubmitted_at,
                r.approved_at,
                r.rejected_at,
                rejected_by.full_name AS rejected_by_name,
                r.query_note,
                r.rejection_reason
            FROM dbo.trade_operation_requests r
            INNER JOIN dbo.companies c
                ON c.id = r.company_id
            LEFT JOIN dbo.users submitter
                ON submitter.id = r.submitted_by_user_id
            LEFT JOIN dbo.users reviewer
                ON reviewer.id = r.reviewed_by_user_id
            LEFT JOIN dbo.users returned_by
                ON returned_by.id = r.returned_by_user_id
            LEFT JOIN dbo.users rejected_by
                ON rejected_by.id = r.rejected_by_user_id
            WHERE r.id = @id
        `;

        if (!canReviewRequests && !canMonitorRequests && isContractor) {
            query += `
                AND r.submitted_by_user_id = @user_id
            `;
            request.input("user_id", sql.Int, req.user?.id ?? null);
        }

        const result = await request.query(query);
        const tradeOperation = result.recordset[0];

        if (!tradeOperation) {
            return res.status(404).json({ error: "Trade operation request not found." });
        }

        const documentsRequest = await createRequest();
        documentsRequest.input("request_id", sql.Int, tradeOperationId);
        const documentsResult = await documentsRequest.query(`
            SELECT
                id,
                request_id,
                document_type,
                file_name,
                created_at,
                updated_at
            FROM dbo.trade_operation_request_documents
            WHERE request_id = @request_id
            ORDER BY id ASC
        `);

        const eventsRequest = await createRequest();
        eventsRequest.input("request_id", sql.Int, tradeOperationId);
        const eventsResult = await eventsRequest.query(`
            SELECT
                id,
                request_id,
                event_type,
                actor_user_id,
                actor_name,
                actor_role,
                from_status,
                to_status,
                note,
                metadata_json,
                created_at
            FROM dbo.trade_operation_request_events
            WHERE request_id = @request_id
            ORDER BY created_at ASC, id ASC
        `);

        res.json({
            ...tradeOperation,
            documents: documentsResult.recordset,
            events: eventsResult.recordset,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch trade operation request details." });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) {
        return res.sendStatus(403);
    }

    const normalizedPayloadResult = normalizeTradeOperationPayload(
        (req.body ?? {}) as Record<string, unknown>
    );

    if (!normalizedPayloadResult.payload) {
        return res.status(400).json({ error: normalizedPayloadResult.error });
    }

    const normalizedDocumentsResult = normalizeTradeOperationDocuments(
        (req.body ?? {}).documents,
        normalizedPayloadResult.payload.service_type
    );

    if (!normalizedDocumentsResult.documents) {
        return res.status(400).json({ error: normalizedDocumentsResult.error });
    }

    const payload = normalizedPayloadResult.payload;
    const documents = normalizedDocumentsResult.documents;

    try {
        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const companyRequest = new sql.Request(transaction);
            companyRequest
                .input("company_id", sql.Int, payload.company_id)
                .input("user_id", sql.Int, req.user?.id ?? null);

            const companyResult = await companyRequest.query(`
                SELECT TOP 1
                    c.id,
                    c.name,
                    c.license_no,
                    c.license_type,
                    a.submitted_by_user_id
                FROM dbo.companies c
                LEFT JOIN dbo.company_applications a
                    ON a.id = c.approved_application_id
                WHERE c.id = @company_id
                  AND c.license_no IS NOT NULL
                  AND a.submitted_by_user_id = @user_id
            `);

            const company = companyResult.recordset[0];

            if (!company) {
                await transaction.rollback();
                return res.status(404).json({
                    error: "Selected company was not found in your licensed company registry.",
                });
            }

            const serviceDefinition = getTradeOperationService(payload.service_type);

            if (!serviceDefinition) {
                await transaction.rollback();
                return res.status(400).json({ error: "Invalid trade operation service selected." });
            }

            if (
                !company.license_type ||
                !serviceDefinition.allowedLicenseTypes.includes(company.license_type)
            ) {
                await transaction.rollback();
                return res.status(400).json({
                    error: "The selected company licence type is not permitted to request this trade operation service.",
                });
            }

            const requestReference = buildTradeOperationReference(req.user?.id);
            const insertRequest = bindTradeOperationPayloadInputs(
                new sql.Request(transaction),
                payload
            )
                .input("request_reference", sql.NVarChar, requestReference)
                .input("status", sql.NVarChar, requestStatuses.submitted)
                .input("submitted_by_user_id", sql.Int, req.user?.id ?? null);

            const insertResult = await insertRequest.query(`
                INSERT INTO dbo.trade_operation_requests (
                    request_reference,
                    company_id,
                    service_family,
                    service_type,
                    status,
                    goods_description,
                    cargo_category,
                    origin_location,
                    destination_location,
                    quantity_value,
                    quantity_unit,
                    weight_kg,
                    container_count,
                    shipment_reference,
                    customs_reference,
                    operation_summary,
                    requested_completion_date,
                    submitted_by_user_id,
                    submitted_at
                )
                VALUES (
                    @request_reference,
                    @company_id,
                    @service_family,
                    @service_type,
                    @status,
                    @goods_description,
                    @cargo_category,
                    @origin_location,
                    @destination_location,
                    @quantity_value,
                    @quantity_unit,
                    @weight_kg,
                    @container_count,
                    @shipment_reference,
                    @customs_reference,
                    @operation_summary,
                    @requested_completion_date,
                    @submitted_by_user_id,
                    SYSDATETIME()
                );

                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
            `);

            const tradeOperationId = insertResult.recordset[0]?.id as number | undefined;

            if (!tradeOperationId) {
                throw new Error("Failed to create trade operation request.");
            }

            await replaceTradeOperationDocuments(transaction, tradeOperationId, documents);
            await appendTradeOperationEvent(transaction, {
                requestId: tradeOperationId,
                eventType: "Submitted",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: null,
                toStatus: requestStatuses.submitted,
                note: "Trade operation request submitted by contractor.",
            });

            await transaction.commit();

            notifyComplianceTeam(
                "New trade operation request submitted.",
                `${company.name} - ${serviceDefinition.label}`
            );

            res.status(201).json({
                message: "Trade operation request submitted successfully.",
                requestReference,
                requestId: tradeOperationId,
            });
        } catch (error) {
            await rollbackQuietly(transaction);
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to submit the trade operation request." });
    }
});

router.patch("/:id/resubmit", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) {
        return res.sendStatus(403);
    }

    const tradeOperationId = Number(req.params.id);

    if (!Number.isInteger(tradeOperationId) || tradeOperationId <= 0) {
        return res.status(400).json({ error: "Invalid trade operation request id." });
    }

    const normalizedPayloadResult = normalizeTradeOperationPayload(
        (req.body ?? {}) as Record<string, unknown>
    );

    if (!normalizedPayloadResult.payload) {
        return res.status(400).json({ error: normalizedPayloadResult.error });
    }

    const normalizedDocumentsResult = normalizeTradeOperationDocuments(
        (req.body ?? {}).documents,
        normalizedPayloadResult.payload.service_type
    );

    if (!normalizedDocumentsResult.documents) {
        return res.status(400).json({ error: normalizedDocumentsResult.error });
    }

    const payload = normalizedPayloadResult.payload;
    const documents = normalizedDocumentsResult.documents;

    try {
        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const existingRequest = new sql.Request(transaction);
            existingRequest
                .input("id", sql.Int, tradeOperationId)
                .input("user_id", sql.Int, req.user?.id ?? null);

            const existingResult = await existingRequest.query(`
                SELECT TOP 1
                    id,
                    status
                FROM dbo.trade_operation_requests
                WHERE id = @id
                  AND submitted_by_user_id = @user_id
            `);

            const existing = existingResult.recordset[0];

            if (!existing) {
                await transaction.rollback();
                return res.status(404).json({ error: "Trade operation request not found." });
            }

            if (existing.status !== requestStatuses.returned) {
                await transaction.rollback();
                return res.status(400).json({
                    error: "Only queried trade operation requests can be edited and resubmitted.",
                });
            }

            const companyRequest = new sql.Request(transaction);
            companyRequest
                .input("company_id", sql.Int, payload.company_id)
                .input("user_id", sql.Int, req.user?.id ?? null);

            const companyResult = await companyRequest.query(`
                SELECT TOP 1
                    c.id,
                    c.name,
                    c.license_no,
                    c.license_type
                FROM dbo.companies c
                LEFT JOIN dbo.company_applications a
                    ON a.id = c.approved_application_id
                WHERE c.id = @company_id
                  AND c.license_no IS NOT NULL
                  AND a.submitted_by_user_id = @user_id
            `);

            const company = companyResult.recordset[0];

            if (!company) {
                await transaction.rollback();
                return res.status(404).json({
                    error: "Selected company was not found in your licensed company registry.",
                });
            }

            const serviceDefinition = getTradeOperationService(payload.service_type);

            if (!serviceDefinition) {
                await transaction.rollback();
                return res.status(400).json({ error: "Invalid trade operation service selected." });
            }

            if (
                !company.license_type ||
                !serviceDefinition.allowedLicenseTypes.includes(company.license_type)
            ) {
                await transaction.rollback();
                return res.status(400).json({
                    error: "The selected company licence type is not permitted to request this trade operation service.",
                });
            }

            const updateRequest = bindTradeOperationPayloadInputs(
                new sql.Request(transaction),
                payload
            )
                .input("id", sql.Int, tradeOperationId)
                .input("status", sql.NVarChar, requestStatuses.submitted);

            await updateRequest.query(`
                UPDATE dbo.trade_operation_requests
                SET
                    company_id = @company_id,
                    service_family = @service_family,
                    service_type = @service_type,
                    status = @status,
                    goods_description = @goods_description,
                    cargo_category = @cargo_category,
                    origin_location = @origin_location,
                    destination_location = @destination_location,
                    quantity_value = @quantity_value,
                    quantity_unit = @quantity_unit,
                    weight_kg = @weight_kg,
                    container_count = @container_count,
                    shipment_reference = @shipment_reference,
                    customs_reference = @customs_reference,
                    operation_summary = @operation_summary,
                    requested_completion_date = @requested_completion_date,
                    resubmitted_at = SYSDATETIME(),
                    reviewed_at = NULL,
                    reviewed_by_user_id = NULL,
                    approved_at = NULL,
                    rejected_at = NULL,
                    rejected_by_user_id = NULL,
                    rejection_reason = NULL
                WHERE id = @id
            `);

            await replaceTradeOperationDocuments(transaction, tradeOperationId, documents);
            await appendTradeOperationEvent(transaction, {
                requestId: tradeOperationId,
                eventType: "Resubmitted",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: requestStatuses.returned,
                toStatus: requestStatuses.submitted,
                note: "Contractor resubmitted the trade operation request after addressing the compliance query.",
            });

            await transaction.commit();

            notifyComplianceTeam(
                "Trade operation request resubmitted.",
                `${company.name} - ${serviceDefinition.label}`
            );

            res.json({
                message: "Trade operation request resubmitted successfully.",
                requestId: tradeOperationId,
            });
        } catch (error) {
            await rollbackQuietly(transaction);
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to resubmit the trade operation request." });
    }
});

router.patch("/:id/decision", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin", "Compliance"])) {
        return res.sendStatus(403);
    }

    const tradeOperationId = Number(req.params.id);
    const decision = toNullableString((req.body ?? {}).decision);
    const rejectionReason = toNullableString((req.body ?? {}).rejectionReason);
    const queryNote = toNullableString((req.body ?? {}).queryNote);

    if (!Number.isInteger(tradeOperationId) || tradeOperationId <= 0) {
        return res.status(400).json({ error: "Invalid trade operation request id." });
    }

    if (!decision || !["Approved", "Rejected", "Returned"].includes(decision)) {
        return res.status(400).json({ error: "Invalid review decision." });
    }

    if (decision === "Returned" && !queryNote) {
        return res.status(400).json({ error: "A compliance query note is required to return this request." });
    }

    try {
        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const findRequest = new sql.Request(transaction);
            findRequest.input("id", sql.Int, tradeOperationId);

            const findResult = await findRequest.query(`
                SELECT TOP 1
                    r.id,
                    r.status,
                    r.company_id,
                    c.name AS company_name,
                    r.service_type
                FROM dbo.trade_operation_requests r
                INNER JOIN dbo.companies c
                    ON c.id = r.company_id
                WHERE r.id = @id
            `);

            const tradeOperation = findResult.recordset[0];

            if (!tradeOperation) {
                await transaction.rollback();
                return res.status(404).json({ error: "Trade operation request not found." });
            }

            if (tradeOperation.status !== requestStatuses.submitted) {
                await transaction.rollback();
                return res.status(400).json({
                    error: "Only submitted trade operation requests can be reviewed.",
                });
            }

            const updateRequest = new sql.Request(transaction);
            updateRequest
                .input("id", sql.Int, tradeOperationId)
                .input("reviewer_id", sql.Int, req.user?.id ?? null)
                .input("query_note", sql.NVarChar(sql.MAX), queryNote)
                .input("rejection_reason", sql.NVarChar(sql.MAX), rejectionReason);

            let toStatus: string;
            let eventType: TradeOperationEventType;
            let note: string;

            if (decision === "Approved") {
                toStatus = requestStatuses.approved;
                eventType = "Approved";
                note = "Compliance approved the trade operation request.";

                await updateRequest.query(`
                    UPDATE dbo.trade_operation_requests
                    SET
                        status = N'Approved',
                        reviewed_at = SYSDATETIME(),
                        reviewed_by_user_id = @reviewer_id,
                        approved_at = SYSDATETIME(),
                        rejected_at = NULL,
                        rejected_by_user_id = NULL,
                        rejection_reason = NULL
                    WHERE id = @id
                `);
            } else if (decision === "Returned") {
                toStatus = requestStatuses.returned;
                eventType = "ReturnedForRevision";
                note = queryNote || "Compliance queried the trade operation request and returned it for revision.";

                await updateRequest.query(`
                    UPDATE dbo.trade_operation_requests
                    SET
                        status = N'Returned',
                        returned_at = SYSDATETIME(),
                        returned_by_user_id = @reviewer_id,
                        query_note = @query_note,
                        reviewed_at = NULL,
                        reviewed_by_user_id = NULL,
                        approved_at = NULL,
                        rejected_at = NULL,
                        rejected_by_user_id = NULL,
                        rejection_reason = NULL
                    WHERE id = @id
                `);
            } else {
                toStatus = requestStatuses.rejected;
                eventType = "Rejected";
                note = rejectionReason || "Compliance rejected the trade operation request.";

                await updateRequest.query(`
                    UPDATE dbo.trade_operation_requests
                    SET
                        status = N'Rejected',
                        rejected_at = SYSDATETIME(),
                        rejected_by_user_id = @reviewer_id,
                        rejection_reason = @rejection_reason,
                        reviewed_at = NULL,
                        reviewed_by_user_id = NULL,
                        approved_at = NULL
                    WHERE id = @id
                `);
            }

            await appendTradeOperationEvent(transaction, {
                requestId: tradeOperationId,
                eventType,
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: requestStatuses.submitted,
                toStatus,
                note,
            });

            await transaction.commit();

            const serviceDefinition = getTradeOperationService(tradeOperation.service_type);

            notifyComplianceTeam(
                decision === "Approved"
                    ? "Trade operation request approved."
                    : decision === "Returned"
                        ? "Trade operation request returned for revision."
                        : "Trade operation request rejected.",
                `${tradeOperation.company_name} - ${serviceDefinition?.label || tradeOperation.service_type}`
            );

            res.json({
                message:
                    decision === "Approved"
                        ? "Trade operation request approved successfully."
                        : decision === "Returned"
                            ? "Trade operation request returned for revision successfully."
                            : "Trade operation request rejected successfully.",
            });
        } catch (error) {
            await rollbackQuietly(transaction);
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to process the trade operation review decision." });
    }
});

export default router;
