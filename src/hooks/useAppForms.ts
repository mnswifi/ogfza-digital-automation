import { useState } from 'react';
import { handleUpdateUserRole } from './useAuthSessions';
import { useCompanyForms } from './forms/useCompanyForms';
import { useIncidentForms } from './forms/useIncidentForms';
import { usePermitForms } from './forms/usePermitForms';
import { useHrForms } from './forms/useHrForms';
import { useContractorForms } from './forms/useContractorForms';
import { useOperationsForms } from './forms/useOperationsForms';

type UseAppFormsParams = {
    token: string | null;
    fetchData: () => Promise<void>;
};

export function useAppForms({ token, fetchData }: UseAppFormsParams) {
    const [actionLoading, setActionLoading] = useState(false);

    const sharedParams = {
        token,
        fetchData,
        actionLoading,
        setActionLoading,
    };

    const companyForms = useCompanyForms(sharedParams);
    const incidentForms = useIncidentForms(sharedParams);
    const permitForms = usePermitForms(sharedParams);
    const hrForms = useHrForms(sharedParams);
    const contractorForms = useContractorForms(sharedParams);
    const operationsForms = useOperationsForms(sharedParams);

    const updateUserRoleHandler = handleUpdateUserRole(token, fetchData);

    return {
        actionLoading,
        ...companyForms,
        ...incidentForms,
        ...permitForms,
        ...hrForms,
        ...contractorForms,
        ...operationsForms,
        updateUserRoleHandler,
    };
}
