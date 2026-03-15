import type { Dispatch, SetStateAction, React } from 'react';
import type { Permit, User } from '@/middleware/types.middleware';
import toast from 'react-hot-toast';
import { createInitialCompanyApplicationForm } from './appInitialState';
import type { CompanyApplicationForm } from '@/src/types/appFormTypes';

type SetUser = Dispatch<SetStateAction<User | null>>;
type SetToken = Dispatch<SetStateAction<string | null>>;
type SetActiveTab = Dispatch<SetStateAction<string>>;
type SetAuthView = Dispatch<SetStateAction<'login' | 'signup' | 'forgot'>>;

export const getInitialTabForRole = (role: string) => {
    if (role.includes('Operations')) return 'operations';
    if (role.includes('Finance')) return 'finance';
    if (role.includes('Compliance')) return 'companies';
    if (role.includes('HR Manager')) return 'dashboard';
    if (role.includes('Contractor')) return 'contractors';
    return 'dashboard';
};

export const loginUser = (
    user: User,
    token: string,
    setUser: SetUser,
    setToken: SetToken,
    setActiveTab: SetActiveTab
) => {
    setUser(user);
    setToken(token);

    localStorage.setItem('petroflow_token', token);
    localStorage.setItem('petroflow_user', JSON.stringify(user));

    if (user.mustChangePassword) return;

    setActiveTab(getInitialTabForRole(user.role));
};

export const logoutUser = (
    setUser: SetUser,
    setToken: SetToken,
    setAuthView: SetAuthView
) => {
    setUser(null);
    setToken(null);

    localStorage.removeItem('petroflow_token');
    localStorage.removeItem('petroflow_user');

    setAuthView('login');
};

export const handleChangePassword = (
    user: User | null,
    setUser: (u: User | null) => void,
    token: string | null,
    setActiveTab: (tab: string) => void,
    fetchData: () => void
) => async (newPassword: string) => {
    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newPassword }),
        });
        if (res.ok) {
            const updatedUser = { ...user!, mustChangePassword: false };
            setUser(updatedUser);
            localStorage.setItem('petroflow_user', JSON.stringify(updatedUser));
            setActiveTab(getInitialTabForRole(updatedUser.role));
            toast.success('Password changed successfully.');
        } else {
            toast.error('Failed to change password.');
        }
    } catch (err) {
        console.error(err);
        toast.error('An error occurred while changing password.');
    }
};

export const handleRegisterCompany = (
    newCompany: CompanyApplicationForm,
    setShowRegModal: (show: boolean) => void,
    setNewCompany: (company: CompanyApplicationForm) => void,
    editingCompanyApplicationId: number | null,
    setEditingCompanyApplicationId: (applicationId: number | null) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const isResubmission = editingCompanyApplicationId !== null;
        const res = await fetch(
            isResubmission
                ? `/api/company-applications/${editingCompanyApplicationId}/resubmit`
                : '/api/company-applications',
            {
            method: isResubmission ? 'PATCH' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newCompany),
            }
        );
        if (res.ok) {
            const data = await res.json();
            setShowRegModal(false);
            setNewCompany(createInitialCompanyApplicationForm());
            setEditingCompanyApplicationId(null);
            fetchData();
            toast.success(
                data?.message ||
                    (data?.applicationReference
                        ? `${isResubmission ? 'Application resubmitted' : 'Application submitted'}: ${data.applicationReference}`
                        : `Company application ${isResubmission ? 'resubmitted' : 'submitted'} successfully.`)
            );
        } else {
            const data = await res.json().catch(() => null);
            toast.error(
                data?.error ||
                `Failed to ${isResubmission ? 'resubmit' : 'submit'} company application.`
            );
        }
    } catch (err) {
        console.error(err);
        toast.error(
            `An error occurred while ${editingCompanyApplicationId !== null ? 'resubmitting' : 'submitting'} the company application.`
        );
    } finally {
        setActionLoading(false);
    }
};

export const handleReviewCompanyApplication = (
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (
    applicationId: number,
    decision: 'Approved' | 'Rejected' | 'Returned',
    rejectionReason?: string,
    queryNote?: string,
    approvedLicenseType?: string
) => {
    if (actionLoading) return;

    setActionLoading(true);
    try {
        const res = await fetch(`/api/company-applications/${applicationId}/decision`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ decision, rejectionReason, queryNote, approvedLicenseType }),
        });

        if (res.ok) {
            const data = await res.json().catch(() => null);
            fetchData();
            toast.success(
                data?.message ||
                    (decision === 'Approved'
                        ? 'Company application approved successfully.'
                        : decision === 'Returned'
                            ? 'Company application returned for revision successfully.'
                        : 'Company application rejected successfully.')
            );
        } else {
            const data = await res.json().catch(() => null);
            toast.error(data?.error || `Failed to ${decision.toLowerCase()} application.`);
        }
    } catch (err) {
        console.error(err);
        toast.error(`An error occurred while processing the ${decision.toLowerCase()} action.`);
    } finally {
        setActionLoading(false);
    }
};

export const handleConfirmCompanyApplicationPayment = (
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (
    applicationId: number,
    paymentReference?: string,
    approvedLicenseType?: string
) => {
    if (actionLoading) return;

    setActionLoading(true);
    try {
        const res = await fetch(`/api/company-applications/${applicationId}/confirm-payment`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentReference, approvedLicenseType }),
        });

        if (res.ok) {
            const data = await res.json().catch(() => null);
            fetchData();
            toast.success(
                data?.message ||
                    (data?.licenseNumber
                        ? `Licence issued successfully: ${data.licenseNumber}`
                        : 'Payment confirmed and licence issued successfully.')
            );
        } else {
            const data = await res.json().catch(() => null);
            toast.error(data?.error || 'Failed to confirm payment and issue licence.');
        }
    } catch (err) {
        console.error(err);
        toast.error('An error occurred while confirming payment and issuing the licence.');
    } finally {
        setActionLoading(false);
    }
};

export const handleSubmitCompanyApplicationPayment = (
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (
    applicationId: number,
    paymentReference: string
) => {
    if (actionLoading) return;

    setActionLoading(true);
    try {
        const res = await fetch(`/api/company-applications/${applicationId}/submit-payment`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentReference }),
        });

        if (res.ok) {
            const data = await res.json().catch(() => null);
            fetchData();
            toast.success(
                data?.message || 'Payment submitted successfully. Admin can now confirm payment.'
            );
        } else {
            const data = await res.json().catch(() => null);
            toast.error(data?.error || 'Failed to submit payment details.');
        }
    } catch (err) {
        console.error(err);
        toast.error('An error occurred while submitting payment details.');
    } finally {
        setActionLoading(false);
    }
};

export const handleApplyPermit = (
    newPermit: { company_id: string; permit_type: string },
    setShowPermitModal: (show: boolean) => void,
    setNewPermit: (permit: { company_id: string; permit_type: string }) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/permits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newPermit),
        });
        if (res.ok) {
            setShowPermitModal(false);
            setNewPermit({ company_id: '', permit_type: '' });
            fetchData();
            toast.success('Permit application submitted. Regulatory team has been notified.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleUpdatePermit = (
    setSelectedPermit: (permit: Permit | null) => void,
    setPermitExpiry: (expiry: string) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (id: number, status: string, expiry_date: string) => {
    setActionLoading(true);
    try {
        const res = await fetch(`/api/permits/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status, expiry_date }),
        });
        if (res.ok) {
            setSelectedPermit(null);
            setPermitExpiry('');
            fetchData();
            toast.success(`Permit status updated to ${status}.`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleUpdateUserRole = (
    token: string | null,
    fetchData: () => void
) => async (userId: number, newRole: string) => {
    try {
        const res = await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role: newRole })
        });
        if (res.ok) {
            toast.success("User role updated successfully.");
            fetchData();
        }
    } catch (err) {
        console.error(err);
        toast.error("Failed to update user role.");
    }
};

export const handleReportIncident = (
    newIncident: { company_name: string; incident_type: string; severity: string; description: string },
    setShowIncidentModal: (show: boolean) => void,
    setNewIncident: (incident: { company_name: string; incident_type: string; severity: string; description: string }) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newIncident),
        });
        if (res.ok) {
            setShowIncidentModal(false);
            setNewIncident({ company_name: '', incident_type: 'HSE', severity: 'Medium', description: '' });
            fetchData();
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleAddEmployee = (
    newEmp: { full_name: string; department: string; position: string; zone: string; email: string; phone: string; company: string },
    setShowAddEmpModal: (show: boolean) => void,
    setNewEmp: (emp: { full_name: string; department: string; position: string; zone: string; email: string; phone: string; company: string }) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/hr/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newEmp),
        });
        if (res.ok) {
            setShowAddEmpModal(false);
            setNewEmp({ full_name: '', department: 'HSE', position: '', zone: 'Zone A', email: '', phone: '', company: '' });
            fetchData();
            toast.success('Personnel registered successfully.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleLogAttendance = (
    newAtt: { employee_id: string; date: string; shift: string; check_in: string; check_out: string; status: string },
    setShowLogAttModal: (show: boolean) => void,
    setNewAtt: (att: { employee_id: string; date: string; shift: string; check_in: string; check_out: string; status: string }) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/hr/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newAtt),
        });
        if (res.ok) {
            setShowLogAttModal(false);
            setNewAtt({ employee_id: '', date: new Date().toISOString().split('T')[0], shift: 'Morning Alpha', check_in: '', check_out: '', status: 'Present' });
            fetchData();
            toast.success('Attendance logged successfully.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleLogCert = (
    newCert: { employee_id: string; cert_name: string; issued_date: string; expiry_date: string },
    setShowLogCertModal: (show: boolean) => void,
    setNewCert: (cert: { employee_id: string; cert_name: string; issued_date: string; expiry_date: string }) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/hr/certifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newCert),
        });
        if (res.ok) {
            setShowLogCertModal(false);
            setNewCert({ employee_id: '', cert_name: '', issued_date: '', expiry_date: '' });
            fetchData();
            toast.success('Certification logged successfully.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleUploadDocument = (
    uploadDoc: { contractor_id: string; doc_type: string; file_name: string },
    setShowUploadDocModal: (show: boolean) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/contractors/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(uploadDoc),
        });
        if (res.ok) {
            setShowUploadDocModal(false);
            fetchData();
            toast.success('Document uploaded to OGFZA server.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleRequestProject = (
    newProject: { title: string; description: string; location: string },
    setShowProjectModal: (show: boolean) => void,
    setNewProject: (project: { title: string; description: string; location: string }) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/work-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...newProject, contractor_id: 1 }),
        });
        if (res.ok) {
            setShowProjectModal(false);
            setNewProject({ title: '', description: '', location: '' });
            fetchData();
            toast.success('Project request submitted for review.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};

export const handleLogProduction = (
    newOps: { field_name: string; production_volume: string; downtime_hours: string; report_date: string },
    setShowOpsModal: (show: boolean) => void,
    setNewOps: (ops: { field_name: string; production_volume: string; downtime_hours: string; report_date: string }) => void,
    actionLoading: boolean,
    setActionLoading: (loading: boolean) => void,
    token: string | null,
    fetchData: () => void
) => async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/operations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                ...newOps,
                production_volume: Number(newOps.production_volume),
                downtime_hours: Number(newOps.downtime_hours)
            }),
        });
        if (res.ok) {
            setShowOpsModal(false);
            setNewOps({ field_name: '', production_volume: '', downtime_hours: '', report_date: '' });
            fetchData();
            toast.success('Production report logged successfully.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(false);
    }
};
