import { useState } from 'react';
import { Permit } from '@/middleware/types.middleware';
import { handleApplyPermit, handleUpdatePermit } from '../useAuthSessions';
import { createInitialPermitForm } from '../appInitialState';
import type { PermitForm, SharedFormHookParams } from '../../types/appFormTypes';

export function usePermitForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showPermitModal, setShowPermitModal] = useState(false);
    const [newPermit, setNewPermit] = useState<PermitForm>(createInitialPermitForm());
    const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
    const [permitExpiry, setPermitExpiry] = useState('');

    const applyPermitHandler = handleApplyPermit(
        newPermit,
        setShowPermitModal,
        setNewPermit,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const updatePermitHandler = handleUpdatePermit(
        setSelectedPermit,
        setPermitExpiry,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    return {
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
    };
}