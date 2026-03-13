import { useState } from 'react';
import { handleRegisterCompany } from '../useAuthSessions';
import { createInitialCompanyForm } from '../appInitialState';
import type { CompanyForm, SharedFormHookParams } from '../../types/appFormTypes';

export function useCompanyForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showRegModal, setShowRegModal] = useState(false);
    const [newCompany, setNewCompany] = useState<CompanyForm>(createInitialCompanyForm());

    const registerCompanyHandler = handleRegisterCompany(
        newCompany,
        setShowRegModal,
        setNewCompany,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    return {
        showRegModal,
        setShowRegModal,
        newCompany,
        setNewCompany,
        registerCompanyHandler,
    };
}