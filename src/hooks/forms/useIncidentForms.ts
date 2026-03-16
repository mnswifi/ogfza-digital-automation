import { useState } from 'react';
import {
    handleReportIncident,
    handleSubmitIncidentFollowUp,
    handleUpdateIncidentStatus,
} from '../useAuthSessions';
import { createInitialIncidentForm } from '../appInitialState';
import type { IncidentForm, SharedFormHookParams } from '../../types/appFormTypes';

export function useIncidentForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [newIncident, setNewIncident] = useState<IncidentForm>(createInitialIncidentForm());

    const reportIncidentHandler = handleReportIncident(
        newIncident,
        setShowIncidentModal,
        setNewIncident,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const submitIncidentFollowUpHandler = handleSubmitIncidentFollowUp(
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const updateIncidentStatusHandler = handleUpdateIncidentStatus(
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    return {
        showIncidentModal,
        setShowIncidentModal,
        newIncident,
        setNewIncident,
        reportIncidentHandler,
        submitIncidentFollowUpHandler,
        updateIncidentStatusHandler,
    };
}
