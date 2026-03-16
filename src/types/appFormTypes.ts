import type { Dispatch, SetStateAction } from 'react';
import {
    createInitialAttendanceForm,
    createInitialCertificationForm,
    createInitialCompanyApplicationForm,
    createInitialEmployeeForm,
    createInitialIncidentForm,
    createInitialOpsForm,
    createInitialTradeOperationForm,
} from '../hooks/appInitialState';

export type CompanyApplicationForm = ReturnType<typeof createInitialCompanyApplicationForm>;
export type TradeOperationForm = ReturnType<typeof createInitialTradeOperationForm>;
export type IncidentForm = ReturnType<typeof createInitialIncidentForm>;
export type EmployeeForm = ReturnType<typeof createInitialEmployeeForm>;
export type AttendanceForm = ReturnType<typeof createInitialAttendanceForm>;
export type CertificationForm = ReturnType<typeof createInitialCertificationForm>;
export type OpsForm = ReturnType<typeof createInitialOpsForm>;

export type HrTab = 'employees' | 'attendance' | 'certs' | 'shifts' | 'safety';

export type SharedFormHookParams = {
    token: string | null;
    fetchData: () => Promise<void>;
    actionLoading: boolean;
    setActionLoading: Dispatch<SetStateAction<boolean>>;
};

export type StringSetter = Dispatch<SetStateAction<string>>;
