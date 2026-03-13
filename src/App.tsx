import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { User } from '@/middleware/types.middleware';
import { ChangePasswordModal } from '@/src/views/changePasswordModal';
import { ForgotPasswordPage } from '@/src/views/ForgotPassword';
import { LoginPage } from '@/src/views/Login';
import { SignupPage } from '@/src/views/Register';
import Sidebar, { type AppTab } from './components/SideBar';
import Header from '@/src/components/Header';
import ContentRouter from './components/ContentRouter';
import { loginUser, logoutUser, handleChangePassword } from './hooks/useAuthSessions';
import { useAppData } from './hooks/useAppData';
import { useAppForms } from './hooks/useAppForms';
import { useNotifications } from './hooks/useNotifications';
import { hasRole } from './hooks/appAccess';

type AuthView = 'login' | 'signup' | 'forgot';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('petroflow_token'));
  const [authView, setAuthView] = useState<AuthView>('login');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  const handleLogin = useCallback((nextUser: User, nextToken: string) => {
    loginUser(nextUser, nextToken, setUser, setToken, setActiveTab);
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser(setUser, setToken, setAuthView);
  }, []);

  const {
    stats,
    companies,
    permits,
    operations,
    revenue,
    compliance,
    assets,
    incidents,
    employees,
    attendance,
    certifications,
    shifts,
    hrStats,
    contractors,
    contractorDocs,
    workOrders,
    maintenance,
    teamMembers,
    allUsers,
    loading,
    fetchData,
  } = useAppData({
    token,
    user,
    onAuthFail: handleLogout,
  });

  const {
    actionLoading,

    showRegModal,
    setShowRegModal,
    newCompany,
    setNewCompany,
    registerCompanyHandler,

    showIncidentModal,
    setShowIncidentModal,
    newIncident,
    setNewIncident,
    reportIncidentHandler,

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

    showOpsModal,
    setShowOpsModal,
    newOps,
    setNewOps,
    logProductionHandler,

    updateUserRoleHandler,
  } = useAppForms({
    token,
    fetchData,
  });

  const changePasswordHandler = handleChangePassword(user, setUser, token, setActiveTab, fetchData);
  const userHasRole = (roleNeeded: string) => hasRole(user, roleNeeded);

  useNotifications({ token, user });

  useEffect(() => {
    const savedUser = localStorage.getItem('petroflow_user');

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    fetchData();
  }, [token, user, fetchData]);

  if (!user) {
    if (authView === 'signup') {
      return <SignupPage onSwitchToLogin={() => setAuthView('login')} />;
    }

    if (authView === 'forgot') {
      return <ForgotPasswordPage onSwitchToLogin={() => setAuthView('login')} />;
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToSignup={() => setAuthView('signup')}
        onSwitchToForgot={() => setAuthView('forgot')}
      />
    );
  }

  if (loading && !stats) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-brand-bg gap-4">
        <div className="w-12 h-12 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
        <p className="font-serif italic text-sm animate-pulse">
          Initializing OGFZA Digital Automation Infrastructure...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      <Toaster />

      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        userHasRole={userHasRole}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          activeTab={activeTab}
          onSyncData={fetchData}
        />

        <div className="flex-1 overflow-y-auto p-8">
          {user.mustChangePassword && <ChangePasswordModal onComplete={changePasswordHandler} />}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ContentRouter
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                user={user}
                userHasRole={userHasRole}
                stats={stats}
                companies={companies}
                permits={permits}
                operations={operations}
                revenue={revenue}
                compliance={compliance}
                assets={assets}
                incidents={incidents}
                employees={employees}
                attendance={attendance}
                certifications={certifications}
                shifts={shifts}
                hrStats={hrStats}
                contractors={contractors}
                contractorDocs={contractorDocs}
                workOrders={workOrders}
                maintenance={maintenance}
                teamMembers={teamMembers}
                allUsers={allUsers}
                actionLoading={actionLoading}
                showRegModal={showRegModal}
                setShowRegModal={setShowRegModal}
                newCompany={newCompany}
                setNewCompany={setNewCompany}
                registerCompanyHandler={registerCompanyHandler}
                showIncidentModal={showIncidentModal}
                setShowIncidentModal={setShowIncidentModal}
                newIncident={newIncident}
                setNewIncident={setNewIncident}
                reportIncidentHandler={reportIncidentHandler}
                showPermitModal={showPermitModal}
                setShowPermitModal={setShowPermitModal}
                newPermit={newPermit}
                setNewPermit={setNewPermit}
                selectedPermit={selectedPermit}
                setSelectedPermit={setSelectedPermit}
                permitExpiry={permitExpiry}
                setPermitExpiry={setPermitExpiry}
                applyPermitHandler={applyPermitHandler}
                updatePermitHandler={updatePermitHandler}
                hrTab={hrTab}
                setHrTab={setHrTab}
                showAddEmpModal={showAddEmpModal}
                setShowAddEmpModal={setShowAddEmpModal}
                newEmp={newEmp}
                setNewEmp={setNewEmp}
                addEmployeeHandler={addEmployeeHandler}
                showLogAttModal={showLogAttModal}
                setShowLogAttModal={setShowLogAttModal}
                newAtt={newAtt}
                setNewAtt={setNewAtt}
                logAttendanceHandler={logAttendanceHandler}
                showLogCertModal={showLogCertModal}
                setShowLogCertModal={setShowLogCertModal}
                newCert={newCert}
                setNewCert={setNewCert}
                logCertHandler={logCertHandler}
                showUploadDocModal={showUploadDocModal}
                setShowUploadDocModal={setShowUploadDocModal}
                showProjectModal={showProjectModal}
                setShowProjectModal={setShowProjectModal}
                uploadDoc={uploadDoc}
                setUploadDoc={setUploadDoc}
                newProject={newProject}
                setNewProject={setNewProject}
                uploadDocumentHandler={uploadDocumentHandler}
                requestProjectHandler={requestProjectHandler}
                showOpsModal={showOpsModal}
                setShowOpsModal={setShowOpsModal}
                newOps={newOps}
                setNewOps={setNewOps}
                logProductionHandler={logProductionHandler}
                updateUserRoleHandler={updateUserRoleHandler}
                onInviteUser={() => setAuthView('signup')}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}