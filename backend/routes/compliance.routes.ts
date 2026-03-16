import { Router } from "express";
import { pool, poolConnect, sql } from "@/db";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import { authenticateToken } from "../../middleware/auth.middleware";
import { createRequest, hasRole, sendPushNotification } from "../helpers";
import { transporter } from "../email";

const router = Router();

const complianceCaseTypes = {
    documentUpdate: "DocumentUpdate",
    auditFinding: "AuditFinding",
} as const;

const complianceCaseStatuses = {
    open: "Open",
    responseSubmitted: "Response Submitted",
    returned: "Returned",
    resolved: "Resolved",
    closed: "Closed",
} as const;

type ComplianceEventType =
    | "CaseCreated"
    | "ContractorResponseSubmitted"
    | "CaseReturned"
    | "CaseResolved"
    | "CaseClosed"
    | "LegacyImported"
    | "LegacyResolved";

const toNullableString = (value: unknown) => {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const toRequiredInt = (value: unknown) => {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return value;
    }

    const normalized = toNullableString(value);
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const readRecipientEmails = (values: Array<string | null | undefined>) =>
    [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];

type AppendComplianceCaseEventInput = {
    caseId: number;
    eventType: ComplianceEventType;
    actorUserId?: number | null;
    actorName?: string | null;
    actorRole?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
};

const appendComplianceCaseEvent = async (
    parent: sql.Transaction | sql.ConnectionPool,
    {
        caseId,
        eventType,
        actorUserId = null,
        actorName = null,
        actorRole = null,
        fromStatus = null,
        toStatus = null,
        note = null,
    }: AppendComplianceCaseEventInput,
) => {
    const request = new sql.Request(parent);
    request
        .input("case_id", sql.Int, caseId)
        .input("event_type", sql.NVarChar, eventType)
        .input("actor_user_id", sql.Int, actorUserId)
        .input("actor_name", sql.NVarChar, actorName)
        .input("actor_role", sql.NVarChar, actorRole)
        .input("from_status", sql.NVarChar, fromStatus)
        .input("to_status", sql.NVarChar, toStatus)
        .input("note", sql.NVarChar(sql.MAX), note);

    await request.query(`
        INSERT INTO dbo.company_compliance_case_events (
            case_id,
            event_type,
            actor_user_id,
            actor_name,
            actor_role,
            from_status,
            to_status,
            note
        )
        VALUES (
            @case_id,
            @event_type,
            @actor_user_id,
            @actor_name,
            @actor_role,
            @from_status,
            @to_status,
            @note
        )
    `);
};

const fetchComplianceCaseForActor = async (
    caseId: number,
    user: AuthenticatedRequest["user"],
    { requireOwnership = false }: { requireOwnership?: boolean } = {},
) => {
    const request = await createRequest();
    request.input("id", sql.Int, caseId);

    let query = `
        SELECT TOP 1
            cc.id,
            cc.company_id,
            c.name AS company_name,
            c.license_no AS company_license_no,
            cc.case_type,
            cc.title,
            cc.document_type,
            cc.severity,
            cc.request_note,
            cc.status,
            cc.due_date,
            cc.requested_at,
            requester.full_name AS requested_by_name,
            requester.email AS requested_by_email,
            cc.contractor_response_note,
            cc.contractor_response_file_name,
            cc.contractor_response_submitted_at,
            contractor_responder.full_name AS contractor_response_submitted_by_name,
            cc.review_note,
            cc.returned_at,
            returner.full_name AS returned_by_name,
            cc.resolved_at,
            resolver.full_name AS resolved_by_name,
            cc.closed_at,
            closer.full_name AS closed_by_name,
            cc.updated_at,
            c.representative_email,
            app.primary_contact_email
        FROM dbo.company_compliance_cases cc
        JOIN dbo.companies c
            ON c.id = cc.company_id
        LEFT JOIN dbo.company_applications app
            ON app.id = c.approved_application_id
        LEFT JOIN dbo.users requester
            ON requester.id = cc.requested_by_user_id
        LEFT JOIN dbo.users contractor_responder
            ON contractor_responder.id = cc.contractor_response_submitted_by_user_id
        LEFT JOIN dbo.users returner
            ON returner.id = cc.returned_by_user_id
        LEFT JOIN dbo.users resolver
            ON resolver.id = cc.resolved_by_user_id
        LEFT JOIN dbo.users closer
            ON closer.id = cc.closed_by_user_id
        WHERE cc.id = @id
    `;

    if (requireOwnership) {
        request.input("submitted_by_user_id", sql.Int, user?.id ?? 0);
        query += `
            AND app.submitted_by_user_id = @submitted_by_user_id
        `;
    }

    const result = await request.query(query);
    return result.recordset[0] as
        | {
            id: number;
            company_id: number;
            company_name: string;
            company_license_no?: string | null;
            case_type: string;
            title: string;
            document_type?: string | null;
            severity?: string | null;
            request_note: string;
            status: string;
            due_date?: string | null;
            requested_at: string;
            requested_by_name?: string | null;
            requested_by_email?: string | null;
            contractor_response_note?: string | null;
            contractor_response_file_name?: string | null;
            contractor_response_submitted_at?: string | null;
            contractor_response_submitted_by_name?: string | null;
            review_note?: string | null;
            returned_at?: string | null;
            returned_by_name?: string | null;
            resolved_at?: string | null;
            resolved_by_name?: string | null;
            closed_at?: string | null;
            closed_by_name?: string | null;
            updated_at?: string | null;
            representative_email?: string | null;
            primary_contact_email?: string | null;
        }
        | undefined;
};

const sendComplianceCaseEmail = async ({
    recipients,
    subject,
    companyName,
    title,
    caseLabel,
    note,
}: {
    recipients: string[];
    subject: string;
    companyName: string;
    title: string;
    caseLabel: string;
    note: string;
}) => {
    if (recipients.length === 0) return;

    try {
        await transporter.sendMail({
            from: `"OGFZA Compliance" <${process.env.SMTP_USER}>`,
            to: recipients.join(", "),
            subject,
            html: `
                <h3>${caseLabel} Notice</h3>
                <p><b>Company:</b> ${companyName}</p>
                <p><b>Case Title:</b> ${title}</p>
                <p><b>Details:</b></p>
                <p>${note.replace(/\n/g, "<br/>")}</p>
                <br/>
                <p>Please sign in to the OGFZA Digital Automation platform to review and respond.</p>
            `,
        });
    } catch (error) {
        console.error("Failed to send compliance email", error);
    }
};

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const canRead = hasRole(req.user?.role, ["Admin", "Compliance", "Contractor"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);
    const canReview = hasRole(req.user?.role, ["Admin", "Compliance"]);

    if (!canRead) return res.sendStatus(403);

    try {
        const request = await createRequest();

        let query = `
            SELECT
                cc.id,
                cc.company_id,
                c.name AS company_name,
                c.license_no AS company_license_no,
                cc.case_type,
                cc.title,
                cc.document_type,
                cc.severity,
                cc.request_note,
                cc.status,
                cc.due_date,
                cc.requested_at,
                requester.full_name AS requested_by_name,
                cc.contractor_response_note,
                cc.contractor_response_file_name,
                cc.contractor_response_submitted_at,
                contractor_responder.full_name AS contractor_response_submitted_by_name,
                cc.review_note,
                cc.returned_at,
                returner.full_name AS returned_by_name,
                cc.resolved_at,
                resolver.full_name AS resolved_by_name,
                cc.closed_at,
                closer.full_name AS closed_by_name,
                cc.updated_at
            FROM dbo.company_compliance_cases cc
            JOIN dbo.companies c
                ON c.id = cc.company_id
            LEFT JOIN dbo.company_applications app
                ON app.id = c.approved_application_id
            LEFT JOIN dbo.users requester
                ON requester.id = cc.requested_by_user_id
            LEFT JOIN dbo.users contractor_responder
                ON contractor_responder.id = cc.contractor_response_submitted_by_user_id
            LEFT JOIN dbo.users returner
                ON returner.id = cc.returned_by_user_id
            LEFT JOIN dbo.users resolver
                ON resolver.id = cc.resolved_by_user_id
            LEFT JOIN dbo.users closer
                ON closer.id = cc.closed_by_user_id
        `;

        if (isContractor && !canReview) {
            request.input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);
            query += `
                WHERE app.submitted_by_user_id = @submitted_by_user_id
            `;
        }

        query += `
            ORDER BY COALESCE(cc.updated_at, cc.requested_at) DESC, cc.id DESC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch compliance cases." });
    }
});

router.get("/cases/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const caseId = Number(req.params.id);
    const canRead = hasRole(req.user?.role, ["Admin", "Compliance", "Contractor"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);
    const canReview = hasRole(req.user?.role, ["Admin", "Compliance"]);

    if (!Number.isInteger(caseId) || caseId <= 0) {
        return res.status(400).json({ error: "Invalid compliance case id." });
    }

    if (!canRead) return res.sendStatus(403);

    try {
        const detail = await fetchComplianceCaseForActor(caseId, req.user, {
            requireOwnership: isContractor && !canReview,
        });

        if (!detail) {
            return res.status(404).json({ error: "Compliance case not found." });
        }

        const eventsRequest = await createRequest();
        eventsRequest.input("case_id", sql.Int, caseId);
        const eventsResult = await eventsRequest.query(`
            SELECT
                id,
                case_id,
                event_type,
                actor_user_id,
                actor_name,
                actor_role,
                from_status,
                to_status,
                note,
                created_at
            FROM dbo.company_compliance_case_events
            WHERE case_id = @case_id
            ORDER BY created_at ASC, id ASC
        `);

        res.json({
            ...detail,
            events: eventsResult.recordset,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch compliance case details." });
    }
});

router.post("/cases", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Compliance"])) {
        return res.sendStatus(403);
    }

    const companyId = toRequiredInt(req.body?.companyId);
    const caseType = toNullableString(req.body?.caseType);
    const title = toNullableString(req.body?.title);
    const documentType = toNullableString(req.body?.documentType);
    const severity = toNullableString(req.body?.severity);
    const requestNote = toNullableString(req.body?.requestNote);
    const dueDate = toNullableString(req.body?.dueDate);

    if (
        !companyId ||
        !caseType ||
        !title ||
        !requestNote ||
        !Object.values(complianceCaseTypes).includes(caseType as (typeof complianceCaseTypes)[keyof typeof complianceCaseTypes])
    ) {
        return res.status(400).json({
            error: "Company, case type, title, and request note are required.",
        });
    }

    if (caseType === complianceCaseTypes.documentUpdate && !documentType) {
        return res.status(400).json({ error: "Document type is required for document update requests." });
    }

    if (caseType === complianceCaseTypes.auditFinding && !severity) {
        return res.status(400).json({ error: "Severity is required for audit findings." });
    }

    try {
        const companyRequest = await createRequest();
        companyRequest.input("company_id", sql.Int, companyId);

        const companyResult = await companyRequest.query(`
            SELECT TOP 1
                c.id,
                c.name,
                c.representative_email,
                app.primary_contact_email
            FROM dbo.companies c
            LEFT JOIN dbo.company_applications app
                ON app.id = c.approved_application_id
            WHERE c.id = @company_id
        `);

        const company = companyResult.recordset[0] as
            | {
                id: number;
                name: string;
                representative_email?: string | null;
                primary_contact_email?: string | null;
            }
            | undefined;

        if (!company) {
            return res.status(404).json({ error: "Licensed company not found." });
        }

        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const insertRequest = new sql.Request(transaction);
            insertRequest
                .input("company_id", sql.Int, companyId)
                .input("case_type", sql.NVarChar, caseType)
                .input("title", sql.NVarChar, title)
                .input("document_type", sql.NVarChar, documentType)
                .input("severity", sql.NVarChar, severity)
                .input("request_note", sql.NVarChar(sql.MAX), requestNote)
                .input("due_date", sql.Date, dueDate)
                .input("requested_by_user_id", sql.Int, req.user?.id ?? null);

            const insertResult = await insertRequest.query(`
                INSERT INTO dbo.company_compliance_cases (
                    company_id,
                    case_type,
                    title,
                    document_type,
                    severity,
                    request_note,
                    due_date,
                    requested_by_user_id
                )
                VALUES (
                    @company_id,
                    @case_type,
                    @title,
                    @document_type,
                    @severity,
                    @request_note,
                    @due_date,
                    @requested_by_user_id
                );

                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
            `);

            const complianceCaseId = insertResult.recordset[0]?.id as number | undefined;
            if (!complianceCaseId) {
                throw new Error("Failed to create compliance case.");
            }

            await appendComplianceCaseEvent(transaction, {
                caseId: complianceCaseId,
                eventType: "CaseCreated",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: null,
                toStatus: complianceCaseStatuses.open,
                note: requestNote,
            });

            await transaction.commit();

            const caseLabel =
                caseType === complianceCaseTypes.documentUpdate
                    ? "Document Update Request"
                    : "Audit Finding";

            sendPushNotification(
                "INFO",
                `${caseLabel} Created`,
                `${company.name}: ${title}`,
            );

            await sendComplianceCaseEmail({
                recipients: readRecipientEmails([
                    company.representative_email,
                    company.primary_contact_email,
                ]),
                subject: `${caseLabel} for ${company.name}`,
                companyName: company.name,
                title,
                caseLabel,
                note: requestNote,
            });

            res.status(201).json({
                id: complianceCaseId,
                message: `${caseLabel} created successfully.`,
            });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to create compliance case." });
    }
});

router.patch("/cases/:id/respond", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) {
        return res.sendStatus(403);
    }

    const caseId = Number(req.params.id);
    const responseNote = toNullableString(req.body?.responseNote);
    const responseFileName = toNullableString(req.body?.responseFileName);

    if (!Number.isInteger(caseId) || caseId <= 0) {
        return res.status(400).json({ error: "Invalid compliance case id." });
    }

    if (!responseNote && !responseFileName) {
        return res.status(400).json({
            error: "Please provide a response note or supporting document reference.",
        });
    }

    try {
        const complianceCase = await fetchComplianceCaseForActor(caseId, req.user, {
            requireOwnership: true,
        });

        if (!complianceCase) {
            return res.status(404).json({ error: "Compliance case not found." });
        }

        if (
            complianceCase.status !== complianceCaseStatuses.open &&
            complianceCase.status !== complianceCaseStatuses.returned
        ) {
            return res.status(400).json({
                error: "This compliance case is not waiting for a contractor response.",
            });
        }

        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const updateRequest = new sql.Request(transaction);
            updateRequest
                .input("id", sql.Int, caseId)
                .input("response_note", sql.NVarChar(sql.MAX), responseNote)
                .input("response_file_name", sql.NVarChar, responseFileName)
                .input("contractor_response_submitted_by_user_id", sql.Int, req.user?.id ?? null)
                .input("status", sql.NVarChar, complianceCaseStatuses.responseSubmitted);

            await updateRequest.query(`
                UPDATE dbo.company_compliance_cases
                SET
                    contractor_response_note = @response_note,
                    contractor_response_file_name = @response_file_name,
                    contractor_response_submitted_at = SYSDATETIME(),
                    contractor_response_submitted_by_user_id = @contractor_response_submitted_by_user_id,
                    status = @status,
                    updated_at = SYSDATETIME()
                WHERE id = @id
            `);

            await appendComplianceCaseEvent(transaction, {
                caseId,
                eventType: "ContractorResponseSubmitted",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: complianceCase.status,
                toStatus: complianceCaseStatuses.responseSubmitted,
                note: responseNote || responseFileName,
            });

            await transaction.commit();

            sendPushNotification(
                "SUCCESS",
                "Compliance Response Submitted",
                `${complianceCase.company_name}: ${complianceCase.title}`,
            );

            res.json({ message: "Compliance response submitted successfully." });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to submit the compliance response." });
    }
});

router.patch("/cases/:id/review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Compliance"])) {
        return res.sendStatus(403);
    }

    const caseId = Number(req.params.id);
    const decision = toNullableString(req.body?.decision);
    const reviewNote = toNullableString(req.body?.reviewNote);

    if (!Number.isInteger(caseId) || caseId <= 0) {
        return res.status(400).json({ error: "Invalid compliance case id." });
    }

    if (!decision || !["Resolved", "Returned", "Closed"].includes(decision)) {
        return res.status(400).json({
            error: "Decision must be Resolved, Returned, or Closed.",
        });
    }

    if (decision === complianceCaseStatuses.returned && !reviewNote) {
        return res.status(400).json({
            error: "Please enter a note before returning this case.",
        });
    }

    try {
        const complianceCase = await fetchComplianceCaseForActor(caseId, req.user);

        if (!complianceCase) {
            return res.status(404).json({ error: "Compliance case not found." });
        }

        if (
            complianceCase.status === complianceCaseStatuses.resolved ||
            complianceCase.status === complianceCaseStatuses.closed
        ) {
            return res.status(400).json({
                error: "This compliance case has already been finalized.",
            });
        }

        if (
            decision === complianceCaseStatuses.resolved &&
            complianceCase.status !== complianceCaseStatuses.responseSubmitted
        ) {
            return res.status(400).json({
                error: "A contractor response must be submitted before resolving this case.",
            });
        }

        if (
            decision === complianceCaseStatuses.returned &&
            complianceCase.status !== complianceCaseStatuses.responseSubmitted
        ) {
            return res.status(400).json({
                error: "You can only return a case after reviewing a contractor response.",
            });
        }

        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const updateRequest = new sql.Request(transaction);
            updateRequest
                .input("id", sql.Int, caseId)
                .input("status", sql.NVarChar, decision)
                .input("review_note", sql.NVarChar(sql.MAX), reviewNote)
                .input("user_id", sql.Int, req.user?.id ?? null);

            let lifecycleUpdate = `
                UPDATE dbo.company_compliance_cases
                SET
                    status = @status,
                    review_note = @review_note,
                    updated_at = SYSDATETIME()
            `;

            if (decision === complianceCaseStatuses.returned) {
                lifecycleUpdate += `,
                    returned_at = SYSDATETIME(),
                    returned_by_user_id = @user_id
                `;
            } else if (decision === complianceCaseStatuses.resolved) {
                lifecycleUpdate += `,
                    resolved_at = SYSDATETIME(),
                    resolved_by_user_id = @user_id
                `;
            } else if (decision === complianceCaseStatuses.closed) {
                lifecycleUpdate += `,
                    closed_at = SYSDATETIME(),
                    closed_by_user_id = @user_id
                `;
            }

            lifecycleUpdate += `
                WHERE id = @id
            `;

            await updateRequest.query(lifecycleUpdate);

            await appendComplianceCaseEvent(transaction, {
                caseId,
                eventType:
                    decision === complianceCaseStatuses.returned
                        ? "CaseReturned"
                        : decision === complianceCaseStatuses.closed
                            ? "CaseClosed"
                            : "CaseResolved",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: complianceCase.status,
                toStatus: decision,
                note: reviewNote,
            });

            await transaction.commit();

            sendPushNotification(
                decision === complianceCaseStatuses.resolved ? "SUCCESS" : "INFO",
                `Compliance Case ${decision}`,
                `${complianceCase.company_name}: ${complianceCase.title}`,
            );

            await sendComplianceCaseEmail({
                recipients: readRecipientEmails([
                    complianceCase.representative_email,
                    complianceCase.primary_contact_email,
                ]),
                subject: `Compliance case ${decision.toLowerCase()} for ${complianceCase.company_name}`,
                companyName: complianceCase.company_name,
                title: complianceCase.title,
                caseLabel:
                    complianceCase.case_type === complianceCaseTypes.documentUpdate
                        ? "Document Update Request"
                        : "Audit Finding",
                note:
                    reviewNote ||
                    (decision === complianceCaseStatuses.resolved
                        ? "Your response has been accepted and the case is now resolved."
                        : decision === complianceCaseStatuses.closed
                            ? "This compliance case has been closed."
                            : "Your response requires further action before the case can be resolved."),
            });

            res.json({
                message:
                    decision === complianceCaseStatuses.returned
                        ? "Compliance case returned to the contractor successfully."
                        : decision === complianceCaseStatuses.closed
                            ? "Compliance case closed successfully."
                            : "Compliance case resolved successfully.",
            });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to review the compliance case." });
    }
});

export default router;
