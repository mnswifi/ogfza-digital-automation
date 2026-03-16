import { Router } from "express";
import { pool, poolConnect, sql } from "@/db";
import { createRequest, hasRole, sendPushNotification } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import { transporter } from "../email";

const router = Router();

const incidentStatuses = {
    open: "Open",
    resolved: "Resolved",
    closed: "Closed",
} as const;

type IncidentEventType =
    | "IncidentLogged"
    | "FollowUpSubmitted"
    | "Resolved"
    | "Closed";

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

const readRecipientEmails = (values: Array<string | null | undefined>) => (
    [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
);

type AppendIncidentEventInput = {
    incidentId: number;
    eventType: IncidentEventType;
    actorUserId?: number | null;
    actorName?: string | null;
    actorRole?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
};

const appendIncidentEvent = async (
    parent: sql.Transaction | sql.ConnectionPool,
    {
        incidentId,
        eventType,
        actorUserId = null,
        actorName = null,
        actorRole = null,
        fromStatus = null,
        toStatus = null,
        note = null,
    }: AppendIncidentEventInput
) => {
    const request = new sql.Request(parent);
    request
        .input("incident_id", sql.Int, incidentId)
        .input("event_type", sql.NVarChar, eventType)
        .input("actor_user_id", sql.Int, actorUserId)
        .input("actor_name", sql.NVarChar, actorName)
        .input("actor_role", sql.NVarChar, actorRole)
        .input("from_status", sql.NVarChar, fromStatus)
        .input("to_status", sql.NVarChar, toStatus)
        .input("note", sql.NVarChar(sql.MAX), note);

    await request.query(`
        INSERT INTO dbo.incident_events (
            incident_id,
            event_type,
            actor_user_id,
            actor_name,
            actor_role,
            from_status,
            to_status,
            note
        )
        VALUES (
            @incident_id,
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

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const canReview = hasRole(req.user?.role, ["Compliance", "Admin"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);

    if (!canReview && !isContractor) return res.sendStatus(403);

    try {
        const request = await createRequest();

        let query = `
            SELECT
                i.id,
                i.company_id,
                i.asset_id,
                COALESCE(c.name, i.company_name) AS company_name,
                asset.asset_name,
                i.incident_type,
                i.severity,
                i.description,
                COALESCE(reporter.full_name, i.reported_by) AS reported_by,
                i.reported_by_user_id,
                i.status,
                i.reported_date,
                i.follow_up_note,
                i.follow_up_submitted_at,
                follow_up_user.full_name AS follow_up_submitted_by_name,
                i.updated_at
            FROM dbo.incidents i
            LEFT JOIN dbo.companies c
                ON c.id = i.company_id
            LEFT JOIN dbo.assets asset
                ON asset.id = i.asset_id
            LEFT JOIN dbo.users reporter
                ON reporter.id = i.reported_by_user_id
            LEFT JOIN dbo.users follow_up_user
                ON follow_up_user.id = i.follow_up_submitted_by_user_id
            LEFT JOIN dbo.company_applications a
                ON a.id = c.approved_application_id
        `;

        if (!canReview && isContractor) {
            query += `
                WHERE a.submitted_by_user_id = @user_id
            `;
            request.input("user_id", sql.Int, req.user?.id ?? null);
        }

        query += `
            ORDER BY COALESCE(i.updated_at, i.reported_date) DESC, i.id DESC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch incidents" });
    }
});

router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const incidentId = Number(req.params.id);
    const canReview = hasRole(req.user?.role, ["Compliance", "Admin"]);
    const isContractor = hasRole(req.user?.role, ["Contractor"]);

    if (!Number.isInteger(incidentId) || incidentId <= 0) {
        return res.status(400).json({ error: "Invalid incident id." });
    }

    if (!canReview && !isContractor) return res.sendStatus(403);

    try {
        const request = await createRequest();
        request.input("id", sql.Int, incidentId);

        let query = `
            SELECT TOP 1
                i.id,
                i.company_id,
                i.asset_id,
                COALESCE(c.name, i.company_name) AS company_name,
                asset.asset_name,
                i.incident_type,
                i.severity,
                i.description,
                COALESCE(reporter.full_name, i.reported_by) AS reported_by,
                i.reported_by_user_id,
                i.status,
                i.reported_date,
                i.follow_up_note,
                i.follow_up_submitted_at,
                follow_up_user.full_name AS follow_up_submitted_by_name,
                i.resolved_at,
                resolver.full_name AS resolved_by_name,
                i.closed_at,
                closer.full_name AS closed_by_name,
                i.updated_at
            FROM dbo.incidents i
            LEFT JOIN dbo.companies c
                ON c.id = i.company_id
            LEFT JOIN dbo.assets asset
                ON asset.id = i.asset_id
            LEFT JOIN dbo.users reporter
                ON reporter.id = i.reported_by_user_id
            LEFT JOIN dbo.users follow_up_user
                ON follow_up_user.id = i.follow_up_submitted_by_user_id
            LEFT JOIN dbo.users resolver
                ON resolver.id = i.resolved_by_user_id
            LEFT JOIN dbo.users closer
                ON closer.id = i.closed_by_user_id
            LEFT JOIN dbo.company_applications a
                ON a.id = c.approved_application_id
            WHERE i.id = @id
        `;

        if (!canReview && isContractor) {
            query += `
                AND a.submitted_by_user_id = @user_id
            `;
            request.input("user_id", sql.Int, req.user?.id ?? null);
        }

        const result = await request.query(query);
        const incident = result.recordset[0];

        if (!incident) {
            return res.status(404).json({ error: "Incident not found." });
        }

        const eventsRequest = await createRequest();
        eventsRequest.input("incident_id", sql.Int, incidentId);
        const eventsResult = await eventsRequest.query(`
            SELECT
                id,
                incident_id,
                event_type,
                actor_user_id,
                actor_name,
                actor_role,
                from_status,
                to_status,
                note,
                created_at
            FROM dbo.incident_events
            WHERE incident_id = @incident_id
            ORDER BY created_at ASC, id ASC
        `);

        res.json({
            ...incident,
            events: eventsResult.recordset,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch incident details." });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Compliance"])) {
        return res.sendStatus(403);
    }

    const companyId = toRequiredInt(req.body?.companyId);
    const assetId = toRequiredInt(req.body?.assetId);
    const incidentType = toNullableString(req.body?.incident_type);
    const severity = toNullableString(req.body?.severity);
    const description = toNullableString(req.body?.description);

    if (!companyId || !incidentType || !severity || !description) {
        return res.status(400).json({
            error: "Company, incident type, severity, and description are required.",
        });
    }

    try {
        const companyRequest = await createRequest();
        companyRequest.input("company_id", sql.Int, companyId);

        const companyResult = await companyRequest.query(`
            SELECT TOP 1
                c.id,
                c.name,
                c.representative_email,
                a.primary_contact_email,
                submitter.email AS submitter_email
            FROM dbo.companies c
            LEFT JOIN dbo.company_applications a
                ON a.id = c.approved_application_id
            LEFT JOIN dbo.users submitter
                ON submitter.id = a.submitted_by_user_id
            WHERE c.id = @company_id
        `);

        const company = companyResult.recordset[0] as {
            id: number;
            name: string;
            representative_email?: string | null;
            primary_contact_email?: string | null;
            submitter_email?: string | null;
        } | undefined;

        if (!company) {
            return res.status(404).json({ error: "Selected company was not found." });
        }

        if (assetId) {
            const assetRequest = await createRequest();
            assetRequest
                .input("asset_id", sql.Int, assetId)
                .input("company_id", sql.Int, company.id);

            const assetResult = await assetRequest.query(`
                SELECT TOP 1
                    id
                FROM dbo.assets
                WHERE id = @asset_id
                  AND (company_id = @company_id OR company_id IS NULL)
            `);

            if (!assetResult.recordset[0]) {
                return res.status(400).json({
                    error: "Selected asset does not belong to the chosen company.",
                });
            }
        }

        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const insertRequest = new sql.Request(transaction);
            insertRequest
                .input("company_id", sql.Int, company.id)
                .input("asset_id", sql.Int, assetId)
                .input("company_name", sql.NVarChar, company.name)
                .input("incident_type", sql.NVarChar, incidentType)
                .input("severity", sql.NVarChar, severity)
                .input("description", sql.NVarChar(sql.MAX), description)
                .input("reported_by", sql.NVarChar, req.user?.fullName || "Unknown")
                .input("reported_by_user_id", sql.Int, req.user?.id ?? null)
                .input("status", sql.NVarChar, incidentStatuses.open);

            const insertResult = await insertRequest.query(`
                INSERT INTO dbo.incidents (
                    company_id,
                    asset_id,
                    company_name,
                    incident_type,
                    severity,
                    description,
                    reported_by,
                    reported_by_user_id,
                    status,
                    reported_date,
                    updated_at
                )
                VALUES (
                    @company_id,
                    @asset_id,
                    @company_name,
                    @incident_type,
                    @severity,
                    @description,
                    @reported_by,
                    @reported_by_user_id,
                    @status,
                    SYSDATETIME(),
                    SYSDATETIME()
                );

                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
            `);

            const incidentId = insertResult.recordset[0]?.id as number | undefined;

            if (!incidentId) {
                throw new Error("Failed to create the incident record.");
            }

            await appendIncidentEvent(transaction, {
                incidentId,
                eventType: "IncidentLogged",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: null,
                toStatus: incidentStatuses.open,
                note: description,
            });

            await transaction.commit();

            const recipientEmails = readRecipientEmails([
                company.representative_email,
                company.primary_contact_email,
                company.submitter_email,
            ]);

            if (recipientEmails.length > 0) {
                void transporter.sendMail({
                    from: `"OGFZA Compliance" <${process.env.SMTP_USER}>`,
                    to: recipientEmails.join(", "),
                    subject: `Incident Report Logged for ${company.name}`,
                    html: `
                        <h4>An incident report has been logged by OGFZA Compliance.</h4>
                        <p>Company: <strong>${company.name}</strong></p>
                        <p>Type: ${incidentType}</p>
                        <p>Severity: ${severity}</p>
                        <p>Description: ${description}</p>
                        <p>Please log into the portal and submit a follow-up response so Compliance can review and close the case appropriately.</p>
                    `,
                }).catch((mailErr) => {
                    console.error("Failed to send incident email to contractor contacts", mailErr);
                });
            }

            sendPushNotification(
                "WARNING",
                "Incident Logged",
                `${company.name} - ${incidentType} (${severity})`,
            );

            res.status(201).json({
                id: incidentId,
                message: "Incident logged successfully and contractor notified.",
            });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to report incident" });
    }
});

router.patch("/:id/follow-up", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) {
        return res.sendStatus(403);
    }

    const incidentId = Number(req.params.id);
    const followUpNote = toNullableString(req.body?.followUpNote);

    if (!Number.isInteger(incidentId) || incidentId <= 0) {
        return res.status(400).json({ error: "Invalid incident id." });
    }

    if (!followUpNote) {
        return res.status(400).json({ error: "A follow-up note is required." });
    }

    try {
        const request = await createRequest();
        request
            .input("id", sql.Int, incidentId)
            .input("user_id", sql.Int, req.user?.id ?? null);

        const incidentResult = await request.query(`
            SELECT TOP 1
                i.id,
                i.status,
                COALESCE(c.name, i.company_name) AS company_name
            FROM dbo.incidents i
            LEFT JOIN dbo.companies c
                ON c.id = i.company_id
            LEFT JOIN dbo.company_applications a
                ON a.id = c.approved_application_id
            WHERE i.id = @id
              AND a.submitted_by_user_id = @user_id
        `);

        const incident = incidentResult.recordset[0] as {
            id: number;
            status: string;
            company_name: string;
        } | undefined;

        if (!incident) {
            return res.status(404).json({ error: "Incident not found." });
        }

        if (incident.status !== incidentStatuses.open) {
            return res.status(409).json({
                error: "Only open incidents can receive a contractor follow-up.",
            });
        }

        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const updateRequest = new sql.Request(transaction);
            updateRequest
                .input("id", sql.Int, incidentId)
                .input("follow_up_note", sql.NVarChar(sql.MAX), followUpNote)
                .input("follow_up_submitted_by_user_id", sql.Int, req.user?.id ?? null);

            await updateRequest.query(`
                UPDATE dbo.incidents
                SET
                    follow_up_note = @follow_up_note,
                    follow_up_submitted_at = SYSDATETIME(),
                    follow_up_submitted_by_user_id = @follow_up_submitted_by_user_id,
                    updated_at = SYSDATETIME()
                WHERE id = @id
            `);

            await appendIncidentEvent(transaction, {
                incidentId,
                eventType: "FollowUpSubmitted",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: incidentStatuses.open,
                toStatus: incidentStatuses.open,
                note: followUpNote,
            });

            await transaction.commit();

            sendPushNotification(
                "INFO",
                "Incident Follow-up Submitted",
                `${incident.company_name} follow-up is awaiting compliance review.`,
            );

            res.json({ message: "Follow-up submitted successfully." });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to submit incident follow-up." });
    }
});

router.patch("/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Compliance", "Admin"])) {
        return res.sendStatus(403);
    }

    const incidentId = Number(req.params.id);
    const nextStatus = toNullableString(req.body?.status);
    const reviewNote = toNullableString(req.body?.reviewNote);

    if (!Number.isInteger(incidentId) || incidentId <= 0) {
        return res.status(400).json({ error: "Invalid incident id." });
    }

    if (!nextStatus || ![incidentStatuses.resolved, incidentStatuses.closed].includes(nextStatus as typeof incidentStatuses.resolved | typeof incidentStatuses.closed)) {
        return res.status(400).json({ error: "Incident status must be Resolved or Closed." });
    }

    try {
        const request = await createRequest();
        request.input("id", sql.Int, incidentId);

        const incidentResult = await request.query(`
            SELECT TOP 1
                i.id,
                i.status,
                i.follow_up_note,
                COALESCE(c.name, i.company_name) AS company_name,
                c.representative_email,
                a.primary_contact_email,
                submitter.email AS submitter_email
            FROM dbo.incidents i
            LEFT JOIN dbo.companies c
                ON c.id = i.company_id
            LEFT JOIN dbo.company_applications a
                ON a.id = c.approved_application_id
            LEFT JOIN dbo.users submitter
                ON submitter.id = a.submitted_by_user_id
            WHERE i.id = @id
        `);

        const incident = incidentResult.recordset[0] as {
            id: number;
            status: string;
            follow_up_note?: string | null;
            company_name: string;
            representative_email?: string | null;
            primary_contact_email?: string | null;
            submitter_email?: string | null;
        } | undefined;

        if (!incident) {
            return res.status(404).json({ error: "Incident not found." });
        }

        if (incident.status !== incidentStatuses.open) {
            return res.status(409).json({
                error: "Only open incidents can be reviewed to a final status.",
            });
        }

        if (!toNullableString(incident.follow_up_note)) {
            return res.status(409).json({
                error: "A contractor follow-up is required before resolving or closing this incident.",
            });
        }

        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const updateRequest = new sql.Request(transaction);
            updateRequest
                .input("id", sql.Int, incidentId)
                .input("status", sql.NVarChar, nextStatus)
                .input("user_id", sql.Int, req.user?.id ?? null);

            if (nextStatus === incidentStatuses.resolved) {
                await updateRequest.query(`
                    UPDATE dbo.incidents
                    SET
                        status = @status,
                        resolved_at = SYSDATETIME(),
                        resolved_by_user_id = @user_id,
                        closed_at = NULL,
                        closed_by_user_id = NULL,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);
            } else {
                await updateRequest.query(`
                    UPDATE dbo.incidents
                    SET
                        status = @status,
                        closed_at = SYSDATETIME(),
                        closed_by_user_id = @user_id,
                        resolved_at = NULL,
                        resolved_by_user_id = NULL,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);
            }

            await appendIncidentEvent(transaction, {
                incidentId,
                eventType: nextStatus === incidentStatuses.resolved ? "Resolved" : "Closed",
                actorUserId: req.user?.id ?? null,
                actorName: req.user?.fullName ?? null,
                actorRole: req.user?.role ?? null,
                fromStatus: incident.status,
                toStatus: nextStatus,
                note: reviewNote,
            });

            await transaction.commit();

            const recipientEmails = readRecipientEmails([
                incident.representative_email,
                incident.primary_contact_email,
                incident.submitter_email,
            ]);

            if (recipientEmails.length > 0) {
                void transporter.sendMail({
                    from: `"OGFZA Compliance" <${process.env.SMTP_USER}>`,
                    to: recipientEmails.join(", "),
                    subject: `Incident ${nextStatus}: ${incident.company_name}`,
                    html: `
                        <h4>Your incident case has been reviewed by OGFZA Compliance.</h4>
                        <p>Company: <strong>${incident.company_name}</strong></p>
                        <p>Final Status: <strong>${nextStatus}</strong></p>
                        ${reviewNote ? `<p>Compliance Note: ${reviewNote}</p>` : ''}
                    `,
                }).catch((mailErr) => {
                    console.error("Failed to send incident status email", mailErr);
                });
            }

            sendPushNotification(
                nextStatus === incidentStatuses.resolved ? "SUCCESS" : "INFO",
                `Incident ${nextStatus}`,
                `${incident.company_name} incident marked as ${nextStatus}.`,
            );

            res.json({
                message:
                    nextStatus === incidentStatuses.resolved
                        ? "Incident resolved successfully."
                        : "Incident closed successfully.",
            });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to update incident status." });
    }
});

export default router;
