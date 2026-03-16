import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import {
  buildGlobalSearchResults,
  type GlobalSearchResult,
  type ModuleSearchTarget,
} from './utils/globalSearch';
import { buildActionCenterItems } from './utils/actionCenter';

type AuthView = 'login' | 'signup' | 'forgot';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('petroflow_token'));
  const [authView, setAuthView] = useState<AuthView>('login');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchNavigation, setSearchNavigation] = useState<ModuleSearchTarget | null>(null);
  const deferredGlobalSearchQuery = useDeferredValue(globalSearchQuery);

  const handleLogin = useCallback((nextUser: User, nextToken: string) => {
    loginUser(nextUser, nextToken, setUser, setToken, setActiveTab);
    setMobileNavOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser(setUser, setToken, setAuthView);
    setMobileNavOpen(false);
  }, []);

  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  }, []);

  const navigateToTarget = useCallback((target: ModuleSearchTarget) => {
    setActiveTab(target.tab);
    setMobileNavOpen(false);
    setSearchNavigation({
      key: Date.now() + Math.floor(Math.random() * 1000),
      ...target,
    });
    setGlobalSearchQuery('');
  }, []);

  const handleSelectGlobalSearchResult = useCallback((result: GlobalSearchResult) => {
    navigateToTarget({
      tab: result.tab,
      section: result.section,
      query: result.query,
    });
  }, [navigateToTarget]);

  const {
    stats,
    companies,
    companyApplications,
    tradeOperations,
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
    maintenance,
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
    editingCompanyApplicationId,
    setEditingCompanyApplicationId,
    newCompany,
    setNewCompany,
    registerCompanyHandler,
    reviewCompanyApplicationHandler,
    confirmCompanyApplicationPaymentHandler,
    submitCompanyApplicationPaymentHandler,

    showTradeOperationModal,
    setShowTradeOperationModal,
    editingTradeOperationId,
    setEditingTradeOperationId,
    newTradeOperation,
    setNewTradeOperation,
    submitTradeOperationHandler,
    reviewTradeOperationHandler,

    showIncidentModal,
    setShowIncidentModal,
    newIncident,
    setNewIncident,
    reportIncidentHandler,
    submitIncidentFollowUpHandler,
    updateIncidentStatusHandler,

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

    showOpsModal,
    setShowOpsModal,
    newOps,
    setNewOps,
    logProductionHandler,

    inviteUserHandler,
    updateUserRoleHandler,
  } = useAppForms({
    token,
    fetchData,
  });

  const changePasswordHandler = handleChangePassword(user, setUser, token, setActiveTab, fetchData);
  const userHasRole = (roleNeeded: string) => hasRole(user, roleNeeded);

  const globalSearchResults = useMemo(
    () =>
      buildGlobalSearchResults({
        query: deferredGlobalSearchQuery,
        user,
        companies,
        companyApplications,
        tradeOperations,
        compliance,
        incidents,
        assets,
      }),
    [
      deferredGlobalSearchQuery,
      user,
      companies,
      companyApplications,
      tradeOperations,
      compliance,
      incidents,
      assets,
    ],
  );

  const {
    liveNotifications,
    unreadLiveNotifications,
    markLiveNotificationsRead,
  } = useNotifications({ token, user });

  const actionCenterItems = useMemo(
    () =>
      buildActionCenterItems({
        user,
        companyApplications,
        tradeOperations,
        compliance,
        incidents,
        assets,
        maintenance,
        revenue,
      }),
    [
      user,
      companyApplications,
      tradeOperations,
      compliance,
      incidents,
      assets,
      maintenance,
      revenue,
    ],
  );

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
        <p className="font-serif text-sm animate-pulse">
          Initializing OGFZA Digital Automation Infrastructure...
        </p>
      </div>
    );
  }

  return (
    <div className="lg:flex h-dvh bg-brand-bg overflow-hidden">
      <Toaster />

      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        userHasRole={userHasRole}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main className="flex-1 min-w-0 flex flex-col h-dvh overflow-hidden">
        <Header
          user={user}
          activeTab={activeTab}
          onSyncData={fetchData}
          onOpenNavigation={() => setMobileNavOpen(true)}
          globalSearchQuery={globalSearchQuery}
          onGlobalSearchQueryChange={setGlobalSearchQuery}
          globalSearchResults={globalSearchResults}
          onSelectGlobalSearchResult={handleSelectGlobalSearchResult}
          actionCenterItems={actionCenterItems}
          liveNotifications={liveNotifications}
          unreadLiveNotifications={unreadLiveNotifications}
          onMarkNotificationsRead={markLiveNotificationsRead}
          onSelectActionTarget={navigateToTarget}
        />

        <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
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
                onRefresh={fetchData}
                searchNavigation={searchNavigation}
                token={token}
                user={user}
                userHasRole={userHasRole}
                stats={stats}
                companies={companies}
                companyApplications={companyApplications}
                tradeOperations={tradeOperations}
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
                maintenance={maintenance}
                allUsers={allUsers}
                actionLoading={actionLoading}
                showRegModal={showRegModal}
                setShowRegModal={setShowRegModal}
                editingCompanyApplicationId={editingCompanyApplicationId}
                setEditingCompanyApplicationId={setEditingCompanyApplicationId}
                newCompany={newCompany}
                setNewCompany={setNewCompany}
                registerCompanyHandler={registerCompanyHandler}
                reviewCompanyApplicationHandler={reviewCompanyApplicationHandler}
                confirmCompanyApplicationPaymentHandler={confirmCompanyApplicationPaymentHandler}
                submitCompanyApplicationPaymentHandler={submitCompanyApplicationPaymentHandler}
                showTradeOperationModal={showTradeOperationModal}
                setShowTradeOperationModal={setShowTradeOperationModal}
                editingTradeOperationId={editingTradeOperationId}
                setEditingTradeOperationId={setEditingTradeOperationId}
                newTradeOperation={newTradeOperation}
                setNewTradeOperation={setNewTradeOperation}
                submitTradeOperationHandler={submitTradeOperationHandler}
                reviewTradeOperationHandler={reviewTradeOperationHandler}
                showIncidentModal={showIncidentModal}
                setShowIncidentModal={setShowIncidentModal}
                newIncident={newIncident}
                setNewIncident={setNewIncident}
                reportIncidentHandler={reportIncidentHandler}
                submitIncidentFollowUpHandler={submitIncidentFollowUpHandler}
                updateIncidentStatusHandler={updateIncidentStatusHandler}
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
                showOpsModal={showOpsModal}
                setShowOpsModal={setShowOpsModal}
                newOps={newOps}
                setNewOps={setNewOps}
                logProductionHandler={logProductionHandler}
                updateUserRoleHandler={updateUserRoleHandler}
                onInviteUser={inviteUserHandler}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
