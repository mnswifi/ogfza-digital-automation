import { useState } from 'react';
import { handleLogProduction } from '../useAuthSessions';
import { createInitialOpsForm } from '../appInitialState';
import type { OpsForm, SharedFormHookParams } from '../../types/appFormTypes';

export function useOperationsForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showOpsModal, setShowOpsModal] = useState(false);
    const [newOps, setNewOps] = useState<OpsForm>(createInitialOpsForm());

    const logProductionHandler = handleLogProduction(
        newOps,
        setShowOpsModal,
        setNewOps,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    return {
        showOpsModal,
        setShowOpsModal,
        newOps,
        setNewOps,
        logProductionHandler,
    };
}