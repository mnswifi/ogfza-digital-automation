import React from 'react';
import {
    LayoutDashboard,
    Building2,
    Activity,
    DollarSign,
    ShieldCheck,
    Settings,
    TrendingUp,
    LogOut,
    AlertTriangle,
    Package,
    ArrowLeftRight,
    X,
    type LucideIcon,
} from 'lucide-react';
import { User } from '@/middleware/types.middleware';
import { SidebarItem } from './SidbarItems';
import { canAccessTab } from '@/src/hooks/appAccess';

export type AppTab =
    | 'dashboard'
    | 'companies'
    | 'finance'
    | 'compliance'
    | 'operations'
    | 'incidents'
    | 'trade-operations'
    | 'logistics'
    | 'settings'
    | 'hr';

type SidebarProps = {
    user: User;
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onLogout: () => void;
    userHasRole: (roleNeeded: string) => boolean;
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
};

type SidebarNavItem = {
    key: AppTab;
    icon: LucideIcon;
    label: string;
};

export function Sidebar({
    user,
    activeTab,
    onTabChange,
    onLogout,
    userHasRole,
    mobileOpen = false,
    onCloseMobile,
}: SidebarProps) {
    const sidebarItems: SidebarNavItem[] = [
        {
            key: 'dashboard' as AppTab,
            icon: LayoutDashboard,
            label:
                !userHasRole('Admin') && userHasRole('HR Manager')
                    ? 'HR Dashboard'
                    : 'Executive Dashboard',
        },
        { key: 'companies' as AppTab, icon: Building2, label: 'Company Management' },
        { key: 'trade-operations' as AppTab, icon: ArrowLeftRight, label: 'Trade Operations' },
        { key: 'operations' as AppTab, icon: Activity, label: 'Field Assets' },
        { key: 'compliance' as AppTab, icon: ShieldCheck, label: 'Compliance & Audit' },
        { key: 'incidents' as AppTab, icon: AlertTriangle, label: 'Safety & Incident Logs' },
        { key: 'logistics' as AppTab, icon: Package, label: 'Integrated Logistics' },
        { key: 'finance' as AppTab, icon: DollarSign, label: 'Revenue & Finance' },
        { key: 'settings' as AppTab, icon: Settings, label: 'Change Management' },
    ].filter((item) => canAccessTab(user, item.key));

    const SidebarPanel = ({ mobile = false }: { mobile?: boolean }) => (
        <aside
            className={`bg-white flex flex-col ${mobile ? 'h-full w-[18rem] max-w-[88vw] shadow-2xl' : 'hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 border-r border-brand-line'}`}
        >
            <div className="p-6 border-b border-brand-line">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-brand-ink flex items-center justify-center rounded-sm">
                                <TrendingUp size={14} className="text-brand-bg" />
                            </div>
                            <h1 className="font-bold tracking-tighter text-base">OGFZA_automation</h1>
                        </div>
                        <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-40">
                            Digital Automation v1.0
                        </p>
                    </div>
                    {mobile && (
                        <button
                            type="button"
                            onClick={onCloseMobile}
                            className="lg:hidden inline-flex h-10 w-10 items-center justify-center border border-brand-line/15 text-brand-ink/70 hover:bg-brand-ink/5"
                            aria-label="Close navigation"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <nav className="flex-1 py-4 overflow-y-auto">
                <div className="px-4 mb-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2">
                        Core Operations
                    </p>
                </div>

                {sidebarItems.map((item) => (
                    <React.Fragment key={item.key}>
                        <SidebarItem
                            icon={item.icon}
                            label={item.label}
                            active={activeTab === item.key}
                            onClick={() => onTabChange(item.key)}
                        />
                    </React.Fragment>
                ))}
            </nav>

            <div className="p-4 border-t border-brand-line bg-brand-ink/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-ink text-brand-bg flex items-center justify-center text-xs font-bold">
                            {user.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-bold truncate max-w-[150px]">{user.fullName}</p>
                            <p className="text-[10px] opacity-50 truncate max-w-[150px]">{user.role}</p>
                        </div>
                    </div>

                    <button
                        onClick={onLogout}
                        className="p-2 hover:bg-brand-ink/10 transition-colors rounded-sm"
                        title="Logout"
                    >
                        <LogOut size={16} className="opacity-60" />
                    </button>
                </div>
            </div>
        </aside>
    );

    return (
        <>
            <SidebarPanel />

            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="absolute inset-0 bg-brand-ink/35 backdrop-blur-[1px]"
                        aria-label="Close navigation overlay"
                    />
                    <div className="relative h-full">
                        <SidebarPanel mobile />
                    </div>
                </div>
            )}
        </>
    );
}

export default Sidebar;
