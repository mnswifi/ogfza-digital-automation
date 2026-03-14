import { Router } from "express";
import { pool, poolConnect, sql } from "@/db";
import { authenticateToken } from "../../middleware/auth.middleware";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
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

const buildApplicationReference = (userId: number | undefined) => {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
    return `FZA-${timestamp}-${userId ?? 0}`;
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
                a.incorporation_type,
                a.free_zone_location,
                a.status,
                a.submitted_at,
                a.primary_contact_email,
                a.reviewed_at,
                a.approved_at,
                a.rejected_at,
                a.rejection_reason,
                c.id AS linked_company_id
            FROM dbo.company_applications a
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
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

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Contractor"])) return res.sendStatus(403);

    const {
        companyName,
        incorporationType,
        freeZoneLocation,
        globalHeadOfficeAddress,
        globalPhone1,
        globalEmail,
        globalPhone2,
        globalWebsite,
        nigeriaOfficeAddress,
        nigeriaPhone1,
        nigeriaEmail,
        nigeriaPhone2,
        nigeriaWebsite,
        primaryContactName,
        primaryContactDesignation,
        primaryContactPhone,
        primaryContactEmail,
        secondaryContactName,
        secondaryContactDesignation,
        secondaryContactPhone,
        secondaryContactEmail,
        presentBusinessOperations,
        dprRegistrationNumber,
        activityDescription,
        countriesOfOperationWestAfrica,
        proposedBusinessActivity,
        undevelopedLandSqm,
        developedLandSqm,
        concreteStackingAreaSqm,
        warehouseSpaceSqm,
        factoryPremisesSqm,
        officeAccommodationSqm,
        equipmentRequirement,
        residentialAccommodationPersonnelCount,
        importsSummary,
        exportsSummary,
        proposedCommencementDate,
        declarationName,
        declarationDesignation,
        declarationSignatureDate,
    } = req.body;

    const normalizedCompanyName = toNullableString(companyName);
    const normalizedIncorporationType = toNullableString(incorporationType);
    const normalizedFreeZoneLocation = toNullableString(freeZoneLocation);
    const normalizedPrimaryContactName = toNullableString(primaryContactName);
    const normalizedPrimaryContactEmail = toNullableString(primaryContactEmail);
    const normalizedProposedBusinessActivity = toNullableString(proposedBusinessActivity);

    if (
        !normalizedCompanyName ||
        !normalizedIncorporationType ||
        !normalizedFreeZoneLocation ||
        !normalizedPrimaryContactName ||
        !normalizedPrimaryContactEmail ||
        !normalizedProposedBusinessActivity
    ) {
        return res.status(400).json({
            error: "Company name, incorporation type, free zone location, primary contact, and proposed activity are required.",
        });
    }

    if (!incorporationTypeOptions.includes(normalizedIncorporationType)) {
        return res.status(400).json({ error: "Invalid incorporation type selected." });
    }

    if (!freeZoneLocationOptions.includes(normalizedFreeZoneLocation)) {
        return res.status(400).json({ error: "Invalid free zone location selected." });
    }

    const normalizedActivityDescription = toNullableString(activityDescription);

    if (
        normalizedActivityDescription &&
        !activityDescriptionOptions.includes(normalizedActivityDescription)
    ) {
        return res.status(400).json({ error: "Invalid activity description selected." });
    }

    const applicationReference = buildApplicationReference(req.user?.id);
    const submittedAt = new Date();

    try {
        const result = await (await createRequest())
            .input("application_reference", sql.NVarChar, applicationReference)
            .input("company_name", sql.NVarChar, normalizedCompanyName)
            .input("incorporation_type", sql.NVarChar, normalizedIncorporationType)
            .input("free_zone_location", sql.NVarChar, normalizedFreeZoneLocation)
            .input("global_head_office_address", sql.NVarChar(sql.MAX), toNullableString(globalHeadOfficeAddress))
            .input("global_phone_1", sql.NVarChar, toNullableString(globalPhone1))
            .input("global_email", sql.NVarChar, toNullableString(globalEmail))
            .input("global_phone_2", sql.NVarChar, toNullableString(globalPhone2))
            .input("global_website", sql.NVarChar, toNullableString(globalWebsite))
            .input("nigeria_office_address", sql.NVarChar(sql.MAX), toNullableString(nigeriaOfficeAddress))
            .input("nigeria_phone_1", sql.NVarChar, toNullableString(nigeriaPhone1))
            .input("nigeria_email", sql.NVarChar, toNullableString(nigeriaEmail))
            .input("nigeria_phone_2", sql.NVarChar, toNullableString(nigeriaPhone2))
            .input("nigeria_website", sql.NVarChar, toNullableString(nigeriaWebsite))
            .input("primary_contact_name", sql.NVarChar, normalizedPrimaryContactName)
            .input("primary_contact_designation", sql.NVarChar, toNullableString(primaryContactDesignation))
            .input("primary_contact_phone", sql.NVarChar, toNullableString(primaryContactPhone))
            .input("primary_contact_email", sql.NVarChar, normalizedPrimaryContactEmail)
            .input("secondary_contact_name", sql.NVarChar, toNullableString(secondaryContactName))
            .input("secondary_contact_designation", sql.NVarChar, toNullableString(secondaryContactDesignation))
            .input("secondary_contact_phone", sql.NVarChar, toNullableString(secondaryContactPhone))
            .input("secondary_contact_email", sql.NVarChar, toNullableString(secondaryContactEmail))
            .input("present_business_operations", sql.NVarChar(sql.MAX), toNullableString(presentBusinessOperations))
            .input("dpr_registration_number", sql.NVarChar, toNullableString(dprRegistrationNumber))
            .input("activity_description", sql.NVarChar(sql.MAX), normalizedActivityDescription)
            .input("countries_of_operation_west_africa", sql.NVarChar(sql.MAX), toNullableString(countriesOfOperationWestAfrica))
            .input("proposed_business_activity", sql.NVarChar(sql.MAX), normalizedProposedBusinessActivity)
            .input("undeveloped_land_sqm", sql.Decimal(18, 2), toNullableDecimal(undevelopedLandSqm))
            .input("developed_land_sqm", sql.Decimal(18, 2), toNullableDecimal(developedLandSqm))
            .input("concrete_stacking_area_sqm", sql.Decimal(18, 2), toNullableDecimal(concreteStackingAreaSqm))
            .input("warehouse_space_sqm", sql.Decimal(18, 2), toNullableDecimal(warehouseSpaceSqm))
            .input("factory_premises_sqm", sql.Decimal(18, 2), toNullableDecimal(factoryPremisesSqm))
            .input("office_accommodation_sqm", sql.Decimal(18, 2), toNullableDecimal(officeAccommodationSqm))
            .input("equipment_requirement", sql.NVarChar(sql.MAX), toNullableString(equipmentRequirement))
            .input(
                "residential_accommodation_personnel_count",
                sql.Int,
                toNullableInt(residentialAccommodationPersonnelCount)
            )
            .input("imports_summary", sql.NVarChar(sql.MAX), toNullableString(importsSummary))
            .input("exports_summary", sql.NVarChar(sql.MAX), toNullableString(exportsSummary))
            .input("proposed_commencement_date", sql.Date, toNullableDate(proposedCommencementDate))
            .input("declaration_name", sql.NVarChar, toNullableString(declarationName))
            .input("declaration_designation", sql.NVarChar, toNullableString(declarationDesignation))
            .input("declaration_signature_date", sql.Date, toNullableDate(declarationSignatureDate))
            .input("status", sql.NVarChar, "Submitted")
            .input("submitted_by_user_id", sql.Int, req.user?.id ?? null)
            .input("submitted_at", sql.DateTime2, submittedAt)
            .query(`
                INSERT INTO dbo.company_applications (
                    application_reference,
                    company_name,
                    incorporation_type,
                    free_zone_location,
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

        await transporter.sendMail({
            from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
            to: "admin@petroflow.com",
            subject: `Workflow: New Free Zone Application - ${normalizedCompanyName}`,
            html: `
                <h4>A new company application has been submitted.</h4>
                <p>Reference: <strong>${applicationReference}</strong></p>
                <p>Company: ${normalizedCompanyName}</p>
                <p>Incorporation Type: ${normalizedIncorporationType}</p>
                <p>Free Zone Location: ${normalizedFreeZoneLocation}</p>
                <p>Submitted On: ${today()}</p>
            `,
        });

        sendPushNotification(
            "SUCCESS",
            "New Company Application Submitted",
            `Application "${applicationReference}" for "${normalizedCompanyName}" is awaiting review.`,
        );

        res.status(201).json({
            id: result.recordset[0].id,
            applicationReference: result.recordset[0].application_reference,
        });
    } catch (err) {
        console.error(err);

        if (isUniqueConstraintError(err)) {
            return res.status(409).json({ error: "A duplicate application reference was generated. Please try again." });
        }

        res.status(400).json({ error: "Failed to submit company application" });
    }
});

router.patch("/:id/decision", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const isAdminReviewer = hasRole(req.user?.role, ["Admin"]);
    const isComplianceReviewer = hasRole(req.user?.role, ["Compliance"]) && !isAdminReviewer;

    if (!isAdminReviewer && !isComplianceReviewer) return res.sendStatus(403);

    const applicationId = Number(req.params.id);
    const decision = req.body?.decision as 'Approved' | 'Rejected' | undefined;
    const rejectionReason = toNullableString(req.body?.rejectionReason);

    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ error: "Invalid application id." });
    }

    if (decision !== 'Approved' && decision !== 'Rejected') {
        return res.status(400).json({ error: "Decision must be Approved or Rejected." });
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
                a.status,
                c.id AS linked_company_id
            FROM dbo.company_applications a
            LEFT JOIN dbo.companies c ON c.approved_application_id = a.id
            WHERE a.id = @id
        `);

        const application = applicationResult.recordset[0] as {
            id: number;
            company_name: string | null;
            incorporation_type: string | null;
            free_zone_location: string | null;
            primary_contact_email: string | null;
            status: string;
            linked_company_id: number | null;
        } | undefined;

        if (!application) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(404).json({ error: "Company application not found." });
        }

        if (decision === 'Rejected' && application.linked_company_id) {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Approved applications already linked to a company cannot be rejected." });
        }

        if (decision === 'Rejected' && application.status === 'Rejected') {
            await transaction.rollback();
            transactionStarted = false;
            return res.status(409).json({ error: "Application has already been rejected." });
        }

        const reviewTimestamp = new Date();
        let responseMessage = '';
        let notificationType: "SUCCESS" | "INFO" = decision === 'Approved' ? "SUCCESS" : "INFO";
        let notificationTitle = '';
        let emailSubject = '';
        let emailHeading = '';
        let emailStatus = '';

        if (isComplianceReviewer) {
            if (application.linked_company_id || application.status === applicationStatuses.approved) {
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
            }
        } else {
            if (decision === 'Approved') {
                if (
                    application.status !== applicationStatuses.awaitingAdminApproval &&
                    !application.linked_company_id &&
                    application.status !== applicationStatuses.approved
                ) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Compliance must approve this application before final admin approval." });
                }

                if (!application.linked_company_id) {
                    const insertCompanyRequest = new sql.Request(transaction);
                    insertCompanyRequest
                        .input("name", sql.NVarChar, application.company_name)
                        .input("incorporation_type", sql.NVarChar, application.incorporation_type)
                        .input("free_zone_location", sql.NVarChar, application.free_zone_location)
                        .input("representative_email", sql.NVarChar, application.primary_contact_email)
                        .input("status", sql.NVarChar, "Active")
                        .input("approved_date", sql.Date, reviewTimestamp)
                        .input("approved_application_id", sql.Int, application.id);

                    await insertCompanyRequest.query(`
                        INSERT INTO dbo.companies (
                            name,
                            incorporation_type,
                            free_zone_location,
                            representative_email,
                            status,
                            approved_date,
                            approved_application_id
                        )
                        VALUES (
                            @name,
                            @incorporation_type,
                            @free_zone_location,
                            @representative_email,
                            @status,
                            @approved_date,
                            @approved_application_id
                        )
                    `);
                }

                const approveRequest = new sql.Request(transaction);
                approveRequest
                    .input("id", sql.Int, application.id)
                    .input("status", sql.NVarChar, applicationStatuses.approved)
                    .input("approved_by_user_id", sql.Int, req.user?.id ?? null)
                    .input("approved_at", sql.DateTime2, reviewTimestamp);

                await approveRequest.query(`
                    UPDATE dbo.company_applications
                    SET
                        status = @status,
                        approved_by_user_id = @approved_by_user_id,
                        approved_at = @approved_at,
                        rejected_at = NULL,
                        rejection_reason = NULL,
                        updated_at = SYSDATETIME()
                    WHERE id = @id
                `);

                responseMessage = application.linked_company_id
                    ? 'Application was already linked to a company. Final approval has been synchronized.'
                    : 'Application approved and company added to the registry.';
                notificationTitle = 'Company Application Approved';
                emailSubject = `Company Application Approved: ${application.company_name}`;
                emailHeading = 'Your free zone application has received final approval.';
                emailStatus = applicationStatuses.approved;
            } else {
                if (application.linked_company_id || application.status === applicationStatuses.approved) {
                    await transaction.rollback();
                    transactionStarted = false;
                    return res.status(409).json({ error: "Approved applications already linked to a company cannot be rejected." });
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
            }
        }

        await transaction.commit();
        transactionStarted = false;

        sendPushNotification(
            notificationType,
            notificationTitle,
            responseMessage
        );

        if (application.primary_contact_email) {
            void transporter.sendMail({
                from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
                to: application.primary_contact_email,
                subject: emailSubject,
                html: `
                    <h4>${emailHeading}</h4>
                    <p>Company: <strong>${application.company_name}</strong></p>
                    <p>Status: ${emailStatus}</p>
                    ${decision === 'Rejected' && rejectionReason ? `<p>Reason: ${rejectionReason}</p>` : ''}
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

export default router;
