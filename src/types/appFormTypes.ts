import type { Dispatch, SetStateAction } from 'react';
import type { Permit } from '@/middleware/types.middleware';
import {
    createInitialAttendanceForm,
    createInitialCertificationForm,
    createInitialCompanyForm,
    createInitialEmployeeForm,
    createInitialIncidentForm,
    createInitialOpsForm,
    createInitialPermitForm,
    createInitialProjectForm,
    createInitialUploadDocForm,
} from '../hooks/appInitialState';

export type CompanyForm = ReturnType<typeof createInitialCompanyForm>;
export type IncidentForm = ReturnType<typeof createInitialIncidentForm>;
export type PermitForm = ReturnType<typeof createInitialPermitForm>;
export type EmployeeForm = ReturnType<typeof createInitialEmployeeForm>;
export type AttendanceForm = ReturnType<typeof createInitialAttendanceForm>;
export type CertificationForm = ReturnType<typeof createInitialCertificationForm>;
export type UploadDocForm = ReturnType<typeof createInitialUploadDocForm>;
export type ProjectForm = ReturnType<typeof createInitialProjectForm>;
export type OpsForm = ReturnType<typeof createInitialOpsForm>;

export type HrTab = 'employees' | 'attendance' | 'certs' | 'shifts' | 'safety';

export type SharedFormHookParams = {
    token: string | null;
    fetchData: () => Promise<void>;
    actionLoading: boolean;
    setActionLoading: Dispatch<SetStateAction<boolean>>;
};

export type PermitSelectionSetter = Dispatch<SetStateAction<Permit | null>>;
export type StringSetter = Dispatch<SetStateAction<string>>;