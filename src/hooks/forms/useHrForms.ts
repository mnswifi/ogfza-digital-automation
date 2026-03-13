import { useState } from 'react';
import {
    handleAddEmployee,
    handleLogAttendance,
    handleLogCert,
} from '../useAuthSessions';
import {
    createInitialAttendanceForm,
    createInitialCertificationForm,
    createInitialEmployeeForm,
} from '../appInitialState';
import type {
    AttendanceForm,
    CertificationForm,
    EmployeeForm,
    HrTab,
    SharedFormHookParams,
} from '../../types/appFormTypes';

export function useHrForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showAddEmpModal, setShowAddEmpModal] = useState(false);
    const [newEmp, setNewEmp] = useState<EmployeeForm>(createInitialEmployeeForm());

    const [showLogAttModal, setShowLogAttModal] = useState(false);
    const [newAtt, setNewAtt] = useState<AttendanceForm>(createInitialAttendanceForm());

    const [showLogCertModal, setShowLogCertModal] = useState(false);
    const [newCert, setNewCert] = useState<CertificationForm>(createInitialCertificationForm());

    const [hrTab, setHrTab] = useState<HrTab>('employees');

    const addEmployeeHandler = handleAddEmployee(
        newEmp,
        setShowAddEmpModal,
        setNewEmp,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const logAttendanceHandler = handleLogAttendance(
        newAtt,
        setShowLogAttModal,
        setNewAtt,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const logCertHandler = handleLogCert(
        newCert,
        setShowLogCertModal,
        setNewCert,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    return {
        showAddEmpModal,
        setShowAddEmpModal,
        newEmp,
        setNewEmp,
        addEmployeeHandler,

        showLogAttModal,
        setShowLogAttModal,
        newAtt,
        setNewAtt,
        logAttendanceHandler,

        showLogCertModal,
        setShowLogCertModal,
        newCert,
        setNewCert,
        logCertHandler,

        hrTab,
        setHrTab,
    };
}