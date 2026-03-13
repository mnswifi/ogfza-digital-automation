import { useState } from 'react';
import {
    handleUploadDocument,
    handleRequestProject,
} from '../useAuthSessions';
import {
    createInitialProjectForm,
    createInitialUploadDocForm,
} from '../appInitialState';
import type {
    ProjectForm,
    SharedFormHookParams,
    UploadDocForm,
} from '../../types/appFormTypes';

export function useContractorForms({
    token,
    fetchData,
    actionLoading,
    setActionLoading,
}: SharedFormHookParams) {
    const [showUploadDocModal, setShowUploadDocModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [uploadDoc, setUploadDoc] = useState<UploadDocForm>(createInitialUploadDocForm());
    const [newProject, setNewProject] = useState<ProjectForm>(createInitialProjectForm());

    const uploadDocumentHandler = handleUploadDocument(
        uploadDoc,
        setShowUploadDocModal,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    const requestProjectHandler = handleRequestProject(
        newProject,
        setShowProjectModal,
        setNewProject,
        actionLoading,
        setActionLoading,
        token,
        fetchData
    );

    return {
        showUploadDocModal,
        setShowUploadDocModal,
        showProjectModal,
        setShowProjectModal,
        uploadDoc,
        setUploadDoc,
        newProject,
        setNewProject,
        uploadDocumentHandler,
        requestProjectHandler,
    };
}