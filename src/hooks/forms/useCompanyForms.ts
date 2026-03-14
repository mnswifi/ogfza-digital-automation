import { useState } from 'react';
import { handleRegisterCompany, handleReviewCompanyApplication } from '../useAuthSessions';
import { createInitialCompanyApplicationForm } from '../appInitialState';
import type { CompanyApplicationForm, SharedFormHookParams } from '../../types/appFormTypes';

export function useCompanyForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showRegModal, setShowRegModal] = useState(false);
    const [newCompany, setNewCompany] = useState<CompanyApplicationForm>(
        createInitialCompanyApplicationForm()
    );

    const registerCompanyHandler = handleRegisterCompany(
        newCompany,
        setShowRegModal,
        setNewCompany,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const reviewCompanyApplicationHandler = handleReviewCompanyApplication(
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
        reviewCompanyApplicationHandler,
    };
}
