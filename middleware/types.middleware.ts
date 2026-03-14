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
    pendingPermits: { count: number };
    totalProduction: { total: number };
    totalRevenue: { total: number };
    totalIncidents?: { count: number };
}

export interface Company {
    id: number;
    name: string;
    license_no: string | null;
    incorporation_type: string | null;
    free_zone_location: string | null;
    status: string;
    approved_date: string | null;
    representative_email?: string | null;
    approved_application_id?: number | null;
}

export interface CompanyApplication {
    id: number;
    application_reference: string;
    company_name: string;
    incorporation_type: string;
    free_zone_location: string;
    status: string;
    linked_company_id?: number | null;
    submitted_at: string | null;
    reviewed_at?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    primary_contact_name?: string | null;
    primary_contact_email?: string | null;
}

export interface Permit {
    id: number;
    company_name: string;
    permit_type: string;
    status: string;
    applied_date: string;
    expiry_date: string;
}

export interface Operation {
    id: number;
    field_name: string;
    production_volume: number;
    downtime_hours: number;
    report_date: string;
}

export interface Revenue {
    id: number;
    company_name: string;
    amount: number;
    description: string;
    payment_date: string;
    status: string;
}

export interface ComplianceAudit {
    id: number;
    company_name: string;
    audit_date: string;
    inspector: string;
    findings: string;
    status: string;
    penalty_amount: number;
}

export interface Asset {
    id: number;
    asset_name: string;
    type: string;
    location_coordinates: string;
    status: string;
    maintenance_date: string;
}

export interface Incident {
    id: number;
    company_name: string;
    incident_type: string;
    severity: string;
    description: string;
    reported_by: string;
    status: string;
    reported_date: string;
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
