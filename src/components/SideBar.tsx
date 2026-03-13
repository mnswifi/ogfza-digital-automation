import React from 'react';
import {
    LayoutDashboard,
    Building2,
    FileText,
    Activity,
    DollarSign,
    ShieldCheck,
    Settings,
    TrendingUp,
    LogOut,
    AlertTriangle,
    Briefcase,
    Package,
    type LucideIcon,
} from 'lucide-react';
import { User } from '@/middleware/types.middleware';
import { SidebarItem } from './SidbarItems';
import { canAccessTab } from '@/src/hooks/appAccess';

export type AppTab =
    | 'dashboard'
    | 'companies'
    | 'permits'
    | 'finance'
    | 'compliance'
    | 'operations'
    | 'incidents'
    | 'logistics'
    | 'settings'
    | 'hr'
    | 'contractors';

type SidebarProps = {
    user: User;
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onLogout: () => void;
    userHasRole: (roleNeeded: string) => boolean;
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
        { key: 'permits' as AppTab, icon: FileText, label: 'Permits & Approvals' },
        { key: 'operations' as AppTab, icon: Activity, label: 'Field Assets' },
        { key: 'compliance' as AppTab, icon: ShieldCheck, label: 'Compliance & Audit' },
        { key: 'incidents' as AppTab, icon: AlertTriangle, label: 'Safety & Incident Logs' },
        { key: 'contractors' as AppTab, icon: Briefcase, label: 'Contractor Portal' },
        { key: 'logistics' as AppTab, icon: Package, label: 'Integrated Logistics' },
        { key: 'finance' as AppTab, icon: DollarSign, label: 'Revenue & Finance' },
        { key: 'settings' as AppTab, icon: Settings, label: 'Change Management' },
    ].filter((item) => canAccessTab(user, item.key));

    return (
        <aside className="w-64 border-r border-brand-line bg-white flex flex-col">
            <div className="p-6 border-b border-brand-line">
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

            <nav className="flex-1 py-4 overflow-y-auto">
                <div className="px-4 mb-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2">
                        Core Operations
                    </p>
                </div>

                {sidebarItems.map((item) => (
                    <SidebarItem
                        icon={item.icon}
                        label={item.label}
                        active={activeTab === item.key}
                        onClick={() => onTabChange(item.key)}
                    // Remove key from here
                    />
                ))}
            </nav>

            <div className="p-4 border-t border-brand-line bg-brand-ink/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-ink text-brand-bg flex items-center justify-center text-xs font-bold">
                            {user.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-bold truncate max-w-[100px]">{user.fullName}</p>
                            <p className="text-[10px] opacity-50">{user.role}</p>
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
}

export default Sidebar;