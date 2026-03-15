import { useState } from 'react';
import {
    handleConfirmCompanyApplicationPayment,
    handleRegisterCompany,
    handleReviewCompanyApplication,
    handleSubmitCompanyApplicationPayment,
} from '../useAuthSessions';
import { createInitialCompanyApplicationForm } from '../appInitialState';
import type { CompanyApplicationForm, SharedFormHookParams } from '../../types/appFormTypes';

export function useCompanyForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showRegModal, setShowRegModal] = useState(false);
    const [editingCompanyApplicationId, setEditingCompanyApplicationId] = useState<number | null>(null);
    const [newCompany, setNewCompany] = useState<CompanyApplicationForm>(
        createInitialCompanyApplicationForm()
    );

    const registerCompanyHandler = handleRegisterCompany(
        newCompany,
        setShowRegModal,
        setNewCompany,
        editingCompanyApplicationId,
        setEditingCompanyApplicationId,
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

    const confirmCompanyApplicationPaymentHandler = handleConfirmCompanyApplicationPayment(
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const submitCompanyApplicationPaymentHandler = handleSubmitCompanyApplicationPayment(
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    return {
        showRegModal,
        setShowRegModal,
        editingCompanyApplicationId,
        setEditingCompanyApplicationId,
        newCompany,
        setNewCompany,
        registerCompanyHandler,
        reviewCompanyApplicationHandler,
        confirmCompanyApplicationPaymentHandler,
        submitCompanyApplicationPaymentHandler,
    };
}
