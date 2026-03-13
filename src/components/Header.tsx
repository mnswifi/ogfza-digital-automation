import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { User } from '@/middleware/types.middleware';
import { AppTab } from './SideBar';

type HeaderProps = {
    user: User;
    activeTab: AppTab;
    onSyncData: () => void;
};

export function Header({ user, activeTab, onSyncData }: HeaderProps) {
    return (
        <header className="h-16 border-b border-brand-line bg-white flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold uppercase tracking-widest opacity-60">
                    {activeTab.replace('-', ' ')}
                </h2>

                <div className="h-4 w-[1px] bg-brand-line/20" />

                <div className="flex items-center gap-2 text-[10px] font-mono opacity-40">
                    <Clock size={12} />
                    <span>Unit: {user.operationalUnit}</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative">
                    <AlertCircle
                        size={18}
                        className="text-brand-ink opacity-40 cursor-pointer hover:opacity-100"
                    />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full border border-white" />
                </div>

                <button
                    onClick={onSyncData}
                    className="text-xs font-bold uppercase tracking-widest border border-brand-line/20 px-4 py-2 hover:bg-brand-ink/5 transition-colors"
                >
                    Sync Data
                </button>
            </div>
        </header>
    );
}

export default Header;