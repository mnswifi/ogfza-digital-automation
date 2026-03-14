import React, { Dispatch, SetStateAction } from 'react';
import {
    User,
    Company,
    CompanyApplication,
    Permit,
    Operation,
    Revenue,
    ComplianceAudit,
    Asset,
    Incident,
    Employee,
    AttendanceRecord,
    Certification,
    Shift,
    HRStats,
    Contractor,
    ContractorDocument,
    WorkOrder,
    MaintenanceRecord,
    TeamMember,
    Stats,
} from '@/middleware/types.middleware';
import { AppTab } from './SideBar';
import Dashboard from '@/src/views/Dashboard';
import Finance from '@/src/views/Finance';
import Compliance from '@/src/views/Compliance';
import Logistics from '@/src/views/Logistics';
import SettingsView from '@/src/views/Settings';
import Companies from '@/src/views/Companies';
import Permits from '@/src/views/Permits';
import Incidents from '@/src/views/Incidents';
import Operations from '@/src/views/Operations';
import HR from '@/src/views/HR';
import Contractors from '@/src/views/Contractors';
import type { CompanyApplicationForm } from '@/src/types/appFormTypes';

type HrTab = 'employees' | 'attendance' | 'certs' | 'shifts' | 'safety';
type NewCompanyForm = CompanyApplicationForm;

type NewIncidentForm = {
    company_name: string;
    incident_type: string;
    severity: string;
    description: string;
};

type NewPermitForm = {
    company_id: string;
    permit_type: string;
};

type NewEmployeeForm = {
    full_name: string;
    department: string;
    position: string;
    zone: string;
    email: string;
    phone: string;
    company: string;
};

type NewAttendanceForm = {
    employee_id: string;
    date: string;
    shift: string;
    check_in: string;
    check_out: string;
    status: string;
};

type NewCertificationForm = {
    employee_id: string;
    cert_name: string;
    issued_date: string;
    expiry_date: string;
};

type UploadDocForm = {
    contractor_id: string;
    doc_type: string;
    file_name: string;
};

type NewProjectForm = {
    title: string;
    description: string;
    location: string;
};

type NewOpsForm = {
    field_name: string;
    production_volume: string;
    downtime_hours: string;
    report_date: string;
};

type FormActionHandler = (e?: React.FormEvent) => void | Promise<void>;
type UpdatePermitHandler = (
    id: number,
    status: string,
    expiry_date: string
) => void | Promise<void>;

type ContentRouterProps = {
    activeTab: AppTab;
    setActiveTab: (tab: AppTab) => void;

    user: User;
    userHasRole: (roleNeeded: string) => boolean;

    stats: Stats | null;
    companies: Company[];
    companyApplications: CompanyApplication[];
    permits: Permit[];
    operations: Operation[];
    revenue: Revenue[];
    compliance: ComplianceAudit[];
    assets: Asset[];
    incidents: Incident[];
    employees: Employee[];
    attendance: AttendanceRecord[];
    certifications: Certification[];
    shifts: Shift[];
    hrStats: HRStats | null;
    contractors: Contractor[];
    contractorDocs: ContractorDocument[];
    workOrders: WorkOrder[];
    maintenance: MaintenanceRecord[];
    teamMembers: TeamMember[];
    allUsers: User[];

    actionLoading: boolean;

    showRegModal: boolean;
    setShowRegModal: Dispatch<SetStateAction<boolean>>;
    newCompany: NewCompanyForm;
    setNewCompany: Dispatch<SetStateAction<NewCompanyForm>>;
    registerCompanyHandler: FormActionHandler;
    reviewCompanyApplicationHandler: (
        applicationId: number,
        decision: 'Approved' | 'Rejected',
        rejectionReason?: string
    ) => void | Promise<void>;

    showIncidentModal: boolean;
    setShowIncidentModal: Dispatch<SetStateAction<boolean>>;
    newIncident: NewIncidentForm;
    setNewIncident: Dispatch<SetStateAction<NewIncidentForm>>;
    reportIncidentHandler: FormActionHandler;

    showPermitModal: boolean;
    setShowPermitModal: Dispatch<SetStateAction<boolean>>;
    newPermit: NewPermitForm;
    setNewPermit: Dispatch<SetStateAction<NewPermitForm>>;
    selectedPermit: Permit | null;
    setSelectedPermit: Dispatch<SetStateAction<Permit | null>>;
    permitExpiry: string;
    setPermitExpiry: Dispatch<SetStateAction<string>>;
    applyPermitHandler: FormActionHandler;
    updatePermitHandler: UpdatePermitHandler;

    hrTab: HrTab;
    setHrTab: Dispatch<SetStateAction<HrTab>>;

    showAddEmpModal: boolean;
    setShowAddEmpModal: Dispatch<SetStateAction<boolean>>;
    newEmp: NewEmployeeForm;
    setNewEmp: Dispatch<SetStateAction<NewEmployeeForm>>;
    addEmployeeHandler: FormActionHandler;

    showLogAttModal: boolean;
    setShowLogAttModal: Dispatch<SetStateAction<boolean>>;
    newAtt: NewAttendanceForm;
    setNewAtt: Dispatch<SetStateAction<NewAttendanceForm>>;
    logAttendanceHandler: FormActionHandler;

    showLogCertModal: boolean;
    setShowLogCertModal: Dispatch<SetStateAction<boolean>>;
    newCert: NewCertificationForm;
    setNewCert: Dispatch<SetStateAction<NewCertificationForm>>;
    logCertHandler: FormActionHandler;

    showUploadDocModal: boolean;
    setShowUploadDocModal: Dispatch<SetStateAction<boolean>>;
    showProjectModal: boolean;
    setShowProjectModal: Dispatch<SetStateAction<boolean>>;
    uploadDoc: UploadDocForm;
    setUploadDoc: Dispatch<SetStateAction<UploadDocForm>>;
    newProject: NewProjectForm;
    setNewProject: Dispatch<SetStateAction<NewProjectForm>>;
    uploadDocumentHandler: FormActionHandler;
    requestProjectHandler: FormActionHandler;

    showOpsModal: boolean;
    setShowOpsModal: Dispatch<SetStateAction<boolean>>;
    newOps: NewOpsForm;
    setNewOps: Dispatch<SetStateAction<NewOpsForm>>;
    logProductionHandler: FormActionHandler;

    updateUserRoleHandler: (...args: any[]) => void | Promise<void>;
    onInviteUser: () => void;
};

export default function ContentRouter({
    activeTab,
    setActiveTab,

    user,
    userHasRole,

    stats,
    companies,
    companyApplications,
    permits,
    operations,
    revenue,
    compliance,
    assets,
    incidents,
    employees,
    attendance,
    certifications,
    shifts,
    hrStats,
    contractors,
    contractorDocs,
    workOrders,
    maintenance,
    teamMembers,
    allUsers,

    actionLoading,

    showRegModal,
    setShowRegModal,
    newCompany,
    setNewCompany,
    registerCompanyHandler,
    reviewCompanyApplicationHandler,

    showIncidentModal,
    setShowIncidentModal,
    newIncident,
    setNewIncident,
    reportIncidentHandler,

    showPermitModal,
    setShowPermitModal,
    newPermit,
    setNewPermit,
    selectedPermit,
    setSelectedPermit,
    permitExpiry,
    setPermitExpiry,
    applyPermitHandler,
    updatePermitHandler,

    hrTab,
    setHrTab,

    showAddEmpModal,
    setShowAddEmpModal,
    newEmp,
    setNewEmp,
    addEmployeeHandler,

    showLogAttModal,
    setShowLogAttModal,
    newAtt,
    setNewAtt,
    logAttendanceHandler,

    showLogCertModal,
    setShowLogCertModal,
    newCert,
    setNewCert,
    logCertHandler,

    showUploadDocModal,
    setShowUploadDocModal,
    showProjectModal,
    setShowProjectModal,
    uploadDoc,
    setUploadDoc,
    newProject,
    setNewProject,
    uploadDocumentHandler,
    requestProjectHandler,

    showOpsModal,
    setShowOpsModal,
    newOps,
    setNewOps,
    logProductionHandler,

    updateUserRoleHandler,
    onInviteUser,
}: ContentRouterProps) {
    switch (activeTab) {
        case 'dashboard':
            return (
                <Dashboard
                    hasRole={userHasRole}
                    stats={stats}
                    hrStats={hrStats}
                    shifts={shifts}
                    attendance={attendance}
                    employees={employees}
                    compliance={compliance}
                    operations={operations}
                    contractors={contractors}
                    onGoToHrAttendance={() => {
                        setActiveTab('hr');
                        setHrTab('attendance');
                    }}
                    onGoToHrEmployees={() => {
                        setActiveTab('hr');
                        setHrTab('employees');
                    }}
                    onGoToCompliance={() => setActiveTab('compliance')}
                />
            );

        case 'companies':
            return (
                <Companies
                    user={user}
                    companies={companies}
                    companyApplications={companyApplications}
                    showRegModal={showRegModal}
                    setShowRegModal={setShowRegModal}
                    newCompany={newCompany}
                    setNewCompany={setNewCompany}
                    actionLoading={actionLoading}
                    onRegisterCompany={registerCompanyHandler}
                    onReviewApplication={reviewCompanyApplicationHandler}
                />
            );

        case 'permits':
            return (
                <Permits
                    permits={permits}
                    companies={companies}
                    showPermitModal={showPermitModal}
                    setShowPermitModal={setShowPermitModal}
                    newPermit={newPermit}
                    setNewPermit={setNewPermit}
                    selectedPermit={selectedPermit}
                    setSelectedPermit={setSelectedPermit}
                    permitExpiry={permitExpiry}
                    setPermitExpiry={setPermitExpiry}
                    actionLoading={actionLoading}
                    hasRole={userHasRole}
                    onApplyPermit={applyPermitHandler}
                    onUpdatePermit={updatePermitHandler}
                />
            );

        case 'finance':
            return <Finance stats={stats} revenue={revenue} />;

        case 'compliance':
            return <Compliance compliance={compliance} />;

        case 'operations':
            return (
                <Operations
                    operations={operations}
                    assets={assets}
                    maintenance={maintenance}
                    showOpsModal={showOpsModal}
                    setShowOpsModal={setShowOpsModal}
                    newOps={newOps}
                    setNewOps={setNewOps}
                    actionLoading={actionLoading}
                    hasRole={userHasRole}
                    onLogProduction={logProductionHandler}
                />
            );

        case 'incidents':
            return (
                <Incidents
                    incidents={incidents}
                    companies={companies}
                    showIncidentModal={showIncidentModal}
                    setShowIncidentModal={setShowIncidentModal}
                    newIncident={newIncident}
                    setNewIncident={setNewIncident}
                    actionLoading={actionLoading}
                    onReportIncident={reportIncidentHandler}
                />
            );

        case 'logistics':
            return <Logistics />;

        case 'settings':
            return (
                <SettingsView
                    allUsers={allUsers.map((user) => ({
                        id: user.id,
                        fullName: user.fullName ?? '',
                        email: user.email,
                        role: user.role,
                        unit: (user as any).unit ?? '',
                    }))}
                    companiesCount={companies.length}
                    permitsCount={permits.length}
                    incidentsCount={incidents.length}
                    teamMembers={teamMembers}
                    onInviteUser={onInviteUser}
                    onUpdateUserRole={updateUserRoleHandler}
                />
            );

        case 'hr':
            return (
                <HR
                    hrStats={hrStats}
                    shifts={shifts}
                    employees={employees}
                    attendance={attendance}
                    certifications={certifications}
                    incidents={incidents}
                    hrTab={hrTab}
                    setHrTab={setHrTab}
                    showAddEmpModal={showAddEmpModal}
                    setShowAddEmpModal={setShowAddEmpModal}
                    newEmp={newEmp}
                    setNewEmp={setNewEmp}
                    showLogAttModal={showLogAttModal}
                    setShowLogAttModal={setShowLogAttModal}
                    newAtt={newAtt}
                    setNewAtt={setNewAtt}
                    showLogCertModal={showLogCertModal}
                    setShowLogCertModal={setShowLogCertModal}
                    newCert={newCert}
                    setNewCert={setNewCert}
                    actionLoading={actionLoading}
                    onAddEmployee={addEmployeeHandler}
                    onLogAttendance={logAttendanceHandler}
                    onLogCert={logCertHandler}
                />
            );

        case 'contractors':
            return (
                <Contractors
                    contractors={contractors}
                    contractorDocs={contractorDocs}
                    workOrders={workOrders}
                    showUploadDocModal={showUploadDocModal}
                    setShowUploadDocModal={setShowUploadDocModal}
                    showProjectModal={showProjectModal}
                    setShowProjectModal={setShowProjectModal}
                    uploadDoc={uploadDoc}
                    setUploadDoc={setUploadDoc}
                    newProject={newProject}
                    setNewProject={setNewProject}
                    actionLoading={actionLoading}
                    onUploadDocument={uploadDocumentHandler}
                    onRequestProject={requestProjectHandler}
                />
            );

        default:
            return <div className="p-20 text-center opacity-50 italic">Select a module to continue...</div>;
    }
}
