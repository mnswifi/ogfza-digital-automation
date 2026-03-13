export const createInitialCompanyForm = () => ({
    name: '',
    licenseNo: '',
    tin: '',
    sector: '',
    type: 'Energy',
    leaseInfo: '',
    representativeEmail: '',
});

export const createInitialIncidentForm = () => ({
    company_name: '',
    incident_type: 'HSE',
    severity: 'Medium',
    description: '',
});

export const createInitialPermitForm = () => ({
    company_id: '',
    permit_type: '',
});

export const createInitialEmployeeForm = () => ({
    full_name: '',
    department: 'HSE',
    position: '',
    zone: 'Zone A',
    email: '',
    phone: '',
    company: '',
});

export const createInitialAttendanceForm = () => ({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    shift: 'Morning Alpha',
    check_in: '',
    check_out: '',
    status: 'Present',
});

export const createInitialCertificationForm = () => ({
    employee_id: '',
    cert_name: '',
    issued_date: '',
    expiry_date: '',
});

export const createInitialUploadDocForm = () => ({
    contractor_id: '',
    doc_type: 'License',
    file_name: '',
});

export const createInitialProjectForm = () => ({
    title: '',
    description: '',
    location: '',
});

export const createInitialOpsForm = () => ({
    field_name: '',
    production_volume: '',
    downtime_hours: '',
    report_date: '',
});