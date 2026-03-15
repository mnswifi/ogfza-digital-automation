import { Router } from "express";
import { sql } from "@/db";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import { createRequest, hasRole } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await createRequest();
        const canSeeAllCompanies = hasRole(req.user?.role, [
            "Admin",
            "Compliance",
            "Finance",
            "Operations",
            "HR Manager",
        ]);
        const restrictToOwnCompanies =
            hasRole(req.user?.role, ["Contractor"]) && !canSeeAllCompanies;

        let query = `
            SELECT
                c.id,
                c.name,
                c.license_no,
                c.license_type,
                c.incorporation_type,
                c.free_zone_location,
                c.representative_email,
                c.status,
                c.approved_date,
                c.approved_application_id
            FROM dbo.companies c
        `;

        if (restrictToOwnCompanies) {
            request.input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);
            query += `
                INNER JOIN dbo.company_applications a
                    ON a.id = c.approved_application_id
                WHERE a.submitted_by_user_id = @submitted_by_user_id
            `;
        }

        query += ` ORDER BY c.approved_date DESC, c.name ASC`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
});

router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const companyId = Number(req.params.id);

    if (!Number.isInteger(companyId)) {
        return res.status(400).json({ error: "Invalid company id." });
    }

    try {
        const request = await createRequest();
        const canSeeAllCompanies = hasRole(req.user?.role, [
            "Admin",
            "Compliance",
            "Finance",
            "Operations",
            "HR Manager",
        ]);
        const restrictToOwnCompanies =
            hasRole(req.user?.role, ["Contractor"]) && !canSeeAllCompanies;

        request.input("id", sql.Int, companyId);

        let query = `
            SELECT TOP 1
                c.id,
                c.name,
                c.license_no,
                c.license_type,
                c.tin,
                c.sector,
                c.incorporation_type,
                c.free_zone_location,
                c.status,
                c.approved_date,
                c.lease_info,
                c.representative_email,
                c.approved_application_id,
                a.application_reference,
                a.status AS application_status,
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
                a.approved_at AS application_approved_at,
                a.rejected_at,
                a.rejection_reason,
                submitter.full_name AS submitted_by_name,
                reviewer.full_name AS reviewed_by_name,
                approver.full_name AS approved_by_name,
                payment_submitter.full_name AS payment_submitted_by_name,
                payment_confirmer.full_name AS payment_confirmed_by_name,
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
                a.primary_contact_name,
                a.primary_contact_designation,
                a.primary_contact_phone,
                a.primary_contact_email,
                a.secondary_contact_name,
                a.secondary_contact_designation,
                a.secondary_contact_phone,
                a.secondary_contact_email,
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
                a.declaration_signature_date
            FROM dbo.companies c
            LEFT JOIN dbo.company_applications a
                ON a.id = c.approved_application_id
            LEFT JOIN dbo.users submitter
                ON submitter.id = a.submitted_by_user_id
            LEFT JOIN dbo.users reviewer
                ON reviewer.id = a.reviewed_by_user_id
            LEFT JOIN dbo.users approver
                ON approver.id = a.approved_by_user_id
            LEFT JOIN dbo.users payment_submitter
                ON payment_submitter.id = a.payment_submitted_by_user_id
            LEFT JOIN dbo.users payment_confirmer
                ON payment_confirmer.id = a.payment_confirmed_by_user_id
            WHERE c.id = @id
        `;

        if (restrictToOwnCompanies) {
            request.input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);
            query += ` AND a.submitted_by_user_id = @submitted_by_user_id`;
        }

        const result = await request.query(query);
        const company = result.recordset[0];

        if (!company) {
            return res.status(404).json({ error: "Company not found." });
        }

        const documentsRequest = await createRequest();
        documentsRequest.input("application_id", sql.Int, company.approved_application_id ?? 0);

        const documentsResult = company.approved_application_id
            ? await documentsRequest.query(`
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
            `)
            : { recordset: [] };

        res.json({
            ...company,
            documents: documentsResult.recordset,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch company details" });
    }
});

export default router;
