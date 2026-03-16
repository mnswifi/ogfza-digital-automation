import express, { NextFunction, Request, Response } from "express";
import "dotenv/config";

export interface JwtUser {
    id: number;
    email: string;
    role: string;
    operationalUnit?: string;
    fullName?: string;
}

export interface User {
    id: number;
    email: string;
    fullName: string;
    role: string;
    operationalUnit: string;
    mustChangePassword?: boolean;
}

export interface Stats {
    totalCompanies: { count: number };
    totalProduction: { total: number };
    totalRevenue: { total: number };
    confirmedLicencePayments?: { count: number };
    pendingLicencePayments?: { count: number };
    totalIncidents?: { count: number };
}

export interface Company {
    id: number;
    name: string;
    license_no: string | null;
    license_type?: string | null;
    incorporation_type: string | null;
    free_zone_location: string | null;
    status: string;
    approved_date: string | null;
    representative_email?: string | null;
    approved_application_id?: number | null;
}

export interface CompanyDetail extends Company {
    tin?: string | null;
    sector?: string | null;
    lease_info?: string | null;
    application_reference?: string | null;
    application_status?: string | null;
    requested_license_type?: string | null;
    approved_license_type?: string | null;
    estimated_fee_usd?: number | string | null;
    approved_fee_usd?: number | string | null;
    payment_status?: string | null;
    payment_reference?: string | null;
    payment_submitted_at?: string | null;
    payment_submitted_by_name?: string | null;
    payment_confirmed_at?: string | null;
    payment_confirmed_by_name?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    application_approved_at?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    submitted_by_name?: string | null;
    reviewed_by_name?: string | null;
    approved_by_name?: string | null;
    global_head_office_address?: string | null;
    global_phone_1?: string | null;
    global_email?: string | null;
    global_phone_2?: string | null;
    global_website?: string | null;
    nigeria_office_address?: string | null;
    nigeria_phone_1?: string | null;
    nigeria_email?: string | null;
    nigeria_phone_2?: string | null;
    nigeria_website?: string | null;
    primary_contact_name?: string | null;
    primary_contact_designation?: string | null;
    primary_contact_phone?: string | null;
    primary_contact_email?: string | null;
    secondary_contact_name?: string | null;
    secondary_contact_designation?: string | null;
    secondary_contact_phone?: string | null;
    secondary_contact_email?: string | null;
    present_business_operations?: string | null;
    dpr_registration_number?: string | null;
    activity_description?: string | null;
    countries_of_operation_west_africa?: string | null;
    proposed_business_activity?: string | null;
    undeveloped_land_sqm?: number | string | null;
    developed_land_sqm?: number | string | null;
    concrete_stacking_area_sqm?: number | string | null;
    warehouse_space_sqm?: number | string | null;
    factory_premises_sqm?: number | string | null;
    office_accommodation_sqm?: number | string | null;
    equipment_requirement?: string | null;
    residential_accommodation_personnel_count?: number | null;
    imports_summary?: string | null;
    exports_summary?: string | null;
    proposed_commencement_date?: string | null;
    declaration_name?: string | null;
    declaration_designation?: string | null;
    declaration_signature_date?: string | null;
    documents?: CompanyApplicationDocument[];
}

export interface CompanyApplication {
    id: number;
    application_reference: string;
    company_name: string;
    free_zone_location: string;
    status: string;
    requested_license_type?: string | null;
    approved_license_type?: string | null;
    estimated_fee_usd?: number | string | null;
    approved_fee_usd?: number | string | null;
    payment_status?: string | null;
    payment_reference?: string | null;
    payment_submitted_at?: string | null;
    linked_company_id?: number | null;
    linked_company_license_no?: string | null;
    submitted_at: string | null;
    submitted_by_name?: string | null;
    reviewed_at?: string | null;
    returned_at?: string | null;
    resubmitted_at?: string | null;
    query_note?: string | null;
    approved_at?: string | null;
    payment_confirmed_at?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    primary_contact_name?: string | null;
    primary_contact_email?: string | null;
}

export interface CompanyApplicationEvent {
    id: number;
    application_id: number;
    event_type: string;
    actor_user_id?: number | null;
    actor_name?: string | null;
    actor_role?: string | null;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    metadata_json?: string | null;
    created_at: string;
}

export interface CompanyApplicationDocument {
    id?: number;
    application_id?: number;
    document_type: string;
    file_name: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CompanyApplicationDetail extends CompanyApplication {
    incorporation_type?: string | null;
    payment_reference?: string | null;
    payment_submitted_by_name?: string | null;
    payment_confirmed_by_name?: string | null;
    linked_company_license_no?: string | null;
    submitted_by_name?: string | null;
    reviewed_by_name?: string | null;
    returned_by_name?: string | null;
    approved_by_name?: string | null;
    global_head_office_address?: string | null;
    global_phone_1?: string | null;
    global_email?: string | null;
    global_phone_2?: string | null;
    global_website?: string | null;
    nigeria_office_address?: string | null;
    nigeria_phone_1?: string | null;
    nigeria_email?: string | null;
    nigeria_phone_2?: string | null;
    nigeria_website?: string | null;
    primary_contact_designation?: string | null;
    primary_contact_phone?: string | null;
    secondary_contact_name?: string | null;
    secondary_contact_designation?: string | null;
    secondary_contact_phone?: string | null;
    secondary_contact_email?: string | null;
    present_business_operations?: string | null;
    dpr_registration_number?: string | null;
    activity_description?: string | null;
    countries_of_operation_west_africa?: string | null;
    proposed_business_activity?: string | null;
    undeveloped_land_sqm?: number | string | null;
    developed_land_sqm?: number | string | null;
    concrete_stacking_area_sqm?: number | string | null;
    warehouse_space_sqm?: number | string | null;
    factory_premises_sqm?: number | string | null;
    office_accommodation_sqm?: number | string | null;
    equipment_requirement?: string | null;
    residential_accommodation_personnel_count?: number | null;
    imports_summary?: string | null;
    exports_summary?: string | null;
    proposed_commencement_date?: string | null;
    declaration_name?: string | null;
    declaration_designation?: string | null;
    declaration_signature_date?: string | null;
    documents?: CompanyApplicationDocument[];
    events?: CompanyApplicationEvent[];
}

export interface TradeOperationRequest {
    id: number;
    request_reference: string;
    company_id: number;
    company_name: string;
    company_license_no?: string | null;
    company_license_type?: string | null;
    service_family: string;
    service_type: string;
    status: string;
    submitted_at: string | null;
    submitted_by_name?: string | null;
    reviewed_at?: string | null;
    returned_at?: string | null;
    resubmitted_at?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    query_note?: string | null;
    rejection_reason?: string | null;
}

export interface TradeOperationDocument {
    id?: number;
    request_id?: number;
    document_type: string;
    file_name: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface TradeOperationEvent {
    id: number;
    request_id: number;
    event_type: string;
    actor_user_id?: number | null;
    actor_name?: string | null;
    actor_role?: string | null;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    metadata_json?: string | null;
    created_at: string;
}

export interface TradeOperationRequestDetail extends TradeOperationRequest {
    goods_description?: string | null;
    cargo_category?: string | null;
    origin_location?: string | null;
    destination_location?: string | null;
    quantity_value?: number | string | null;
    quantity_unit?: string | null;
    weight_kg?: number | string | null;
    container_count?: number | null;
    shipment_reference?: string | null;
    customs_reference?: string | null;
    operation_summary?: string | null;
    requested_completion_date?: string | null;
    submitted_by_name?: string | null;
    reviewed_by_name?: string | null;
    returned_by_name?: string | null;
    rejected_by_name?: string | null;
    documents?: TradeOperationDocument[];
    events?: TradeOperationEvent[];
}

export interface Operation {
    id: number;
    asset_id?: number | null;
    asset_name?: string | null;
    company_id?: number | null;
    company_name?: string | null;
    field_name: string;
    production_volume: number;
    downtime_hours: number;
    report_date: string;
    notes?: string | null;
}

export interface Revenue {
    id: number;
    company_name: string;
    amount: number;
    description: string;
    payment_date: string;
    status: string;
}

export interface ComplianceCase {
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
}

export interface ComplianceCaseEvent {
    id: number;
    case_id: number;
    event_type: string;
    actor_user_id?: number | null;
    actor_name?: string | null;
    actor_role?: string | null;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    created_at: string;
}

export interface ComplianceCaseDetail extends ComplianceCase {
    representative_email?: string | null;
    primary_contact_email?: string | null;
    events?: ComplianceCaseEvent[];
}

export interface Asset {
    id: number;
    company_id?: number | null;
    company_name?: string | null;
    asset_name: string;
    type: string;
    location_coordinates: string;
    status: string;
    maintenance_date: string | null;
    last_production_date?: string | null;
    open_incident_count?: number;
}

export interface AssetDetail extends Asset {
    production_history?: Operation[];
    maintenance_history?: MaintenanceRecord[];
    incident_history?: Incident[];
}

export interface Incident {
    id: number;
    company_id?: number | null;
    asset_id?: number | null;
    company_name: string;
    asset_name?: string | null;
    incident_type: string;
    severity: string;
    description: string;
    reported_by: string;
    reported_by_user_id?: number | null;
    status: string;
    reported_date: string;
    follow_up_note?: string | null;
    follow_up_submitted_at?: string | null;
    follow_up_submitted_by_name?: string | null;
    resolved_at?: string | null;
    closed_at?: string | null;
    updated_at?: string | null;
}

export interface IncidentEvent {
    id: number;
    incident_id: number;
    event_type: string;
    actor_user_id?: number | null;
    actor_name?: string | null;
    actor_role?: string | null;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    created_at: string;
}

export interface IncidentDetail extends Incident {
    reported_by_name?: string | null;
    resolved_at?: string | null;
    resolved_by_name?: string | null;
    closed_at?: string | null;
    closed_by_name?: string | null;
    events?: IncidentEvent[];
}

export interface Contractor {
    id: number;
    name: string;
    category: string;
    representative: string;
    email: string;
    phone: string;
    status: string;
    joined_date: string;
}

export interface ContractorDocument {
    id: number;
    contractor_id: number;
    contractor_name?: string;
    doc_type: string;
    file_name: string;
    upload_date: string;
    status: string;
}

export interface Employee {
    id: number;
    full_name: string;
    department: string;
    position: string;
    zone: string;
    status: string;
    hire_date: string;
    email: string;
    phone: string;
    company: string;
}

export interface WorkOrder {
    id: number;
    contractor_id: number;
    contractor_name: string;
    title: string;
    description: string;
    location: string;
    start_date: string;
    end_date?: string;
    status: string;
}

export interface MaintenanceRecord {
    id: number;
    asset_id: number;
    company_id?: number | null;
    company_name?: string | null;
    asset_name: string;
    maintenance_type: string;
    description: string;
    technician: string;
    cost: number;
    maintenance_date: string;
    next_due_date: string;
    status: string;
}

export interface TeamMember {
    id: number;
    full_name: string;
    role: string;
    responsibilities: string;
    department: string;
    status: string;
}

export interface AttendanceRecord {
    id: number;
    employee_id: number;
    full_name: string;
    department: string;
    zone: string;
    date: string;
    shift: string;
    check_in: string;
    check_out: string;
    status: string;
}

export interface Certification {
    id: number;
    employee_id: number;
    full_name: string;
    department: string;
    company: string;
    cert_name: string;
    issued_date: string;
    expiry_date: string;
    status: string;
}

export interface Shift {
    id: number;
    shift_name: string;
    zone: string;
    start_time: string;
    end_time: string;
    capacity: number;
    assigned: number;
}

export interface HRStats {
    totalEmployees: { count: number };
    presentToday: { count: number };
    expiredCerts: { count: number };
    onLeave: { count: number };
}
export interface AuthenticatedRequest extends Request {
    user?: JwtUser;
}
