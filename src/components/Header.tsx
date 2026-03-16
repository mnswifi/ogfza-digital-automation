import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Clock, Menu, Search, X } from 'lucide-react';
import { User } from '@/middleware/types.middleware';
import { AppTab } from './SideBar';
import type { ActionCenterItem } from '@/src/utils/actionCenter';
import type { LiveNotification } from '@/src/hooks/useNotifications';
import type { GlobalSearchResult, ModuleSearchTarget } from '@/src/utils/globalSearch';

type HeaderProps = {
    user: User;
    activeTab: AppTab;
    onSyncData: () => void;
    onOpenNavigation: () => void;
    globalSearchQuery: string;
    onGlobalSearchQueryChange: (value: string) => void;
    globalSearchResults: GlobalSearchResult[];
    onSelectGlobalSearchResult: (result: GlobalSearchResult) => void;
    actionCenterItems: ActionCenterItem[];
    liveNotifications: LiveNotification[];
    unreadLiveNotifications: number;
    onMarkNotificationsRead: () => void;
    onSelectActionTarget: (target: ModuleSearchTarget) => void;
};

const toneClasses = {
    danger: 'bg-rose-50 text-rose-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-sky-50 text-sky-700',
    success: 'bg-emerald-50 text-emerald-700',
} as const;

export function Header({
    user,
    activeTab,
    onSyncData,
    onOpenNavigation,
    globalSearchQuery,
    onGlobalSearchQueryChange,
    globalSearchResults,
    onSelectGlobalSearchResult,
    actionCenterItems,
    liveNotifications,
    unreadLiveNotifications,
    onMarkNotificationsRead,
    onSelectActionTarget,
}: HeaderProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [actionCenterOpen, setActionCenterOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);
    const actionCenterRef = useRef<HTMLDivElement | null>(null);
    const trimmedQuery = globalSearchQuery.trim();
    const visibleResults = useMemo(() => globalSearchResults.slice(0, 8), [globalSearchResults]);
    const visibleActionItems = useMemo(() => actionCenterItems.slice(0, 6), [actionCenterItems]);
    const visibleLiveNotifications = useMemo(() => liveNotifications.slice(0, 6), [liveNotifications]);
    const notificationIndicatorCount = actionCenterItems.length + unreadLiveNotifications;

    const formatTimestamp = (value?: string) => {
        if (!value) return '--';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '--';

        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(parsed);
    };

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!searchContainerRef.current?.contains(event.target as Node)) {
                setSearchOpen(false);
            }

            if (!actionCenterRef.current?.contains(event.target as Node)) {
                setActionCenterOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, []);

    return (
        <header className="min-h-16 border-b border-brand-line bg-white flex flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="order-1 flex min-w-0 items-center gap-3 sm:gap-4">
                <button
                    type="button"
                    onClick={onOpenNavigation}
                    className="lg:hidden inline-flex h-10 w-10 items-center justify-center border border-brand-line/15 text-brand-ink/70 hover:bg-brand-ink/5"
                    aria-label="Open navigation"
                >
                    <Menu size={18} />
                </button>

                <div className="min-w-0">
                    <h2 className="truncate text-xs sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-widest opacity-60">
                        {activeTab.replace('-', ' ')}
                    </h2>
                </div>

                <div className="hidden sm:block h-4 w-[1px] bg-brand-line/20" />

                <div className="hidden md:flex items-center gap-2 text-[10px] font-mono opacity-40 min-w-0">
                    <Clock size={12} />
                    <span className="truncate">Unit: {user.operationalUnit}</span>
                </div>
            </div>

            <div
                ref={searchContainerRef}
                className="order-3 basis-full sm:order-2 sm:flex-1 sm:max-w-xl"
            >
                <div className="relative">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/35"
                    />
                    <input
                        type="text"
                        value={globalSearchQuery}
                        onChange={(event) => onGlobalSearchQueryChange(event.target.value)}
                        onFocus={() => {
                            setSearchOpen(true);
                            setActionCenterOpen(false);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                setSearchOpen(false);
                            }

                            if (event.key === 'Enter' && visibleResults[0]) {
                                event.preventDefault();
                                onSelectGlobalSearchResult(visibleResults[0]);
                                setSearchOpen(false);
                            }
                        }}
                        placeholder="Search companies, requests, incidents, assets..."
                        className="w-full border border-brand-line/15 bg-brand-ink/[0.03] pl-10 pr-10 py-3 text-sm outline-none focus:ring-1 focus:ring-brand-ink"
                    />
                    {trimmedQuery.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                onGlobalSearchQueryChange('');
                                setSearchOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink/35 hover:text-brand-ink/60"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}

                    {searchOpen && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 border border-brand-line/15 bg-white shadow-lg">
                            {trimmedQuery.length < 2 ? (
                                <div className="px-4 py-4 text-sm opacity-50">
                                    Type at least two characters to search across the platform.
                                </div>
                            ) : visibleResults.length === 0 ? (
                                <div className="px-4 py-4 text-sm opacity-50">
                                    No matching records were found in the accessible modules.
                                </div>
                            ) : (
                                <div className="max-h-[24rem] overflow-y-auto py-2">
                                    {visibleResults.map((result) => (
                                        <button
                                            key={result.id}
                                            type="button"
                                            onClick={() => {
                                                onSelectGlobalSearchResult(result);
                                                setSearchOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-brand-ink/[0.03] transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] uppercase tracking-widest opacity-40">
                                                        {result.moduleLabel}
                                                    </p>
                                                    <p className="mt-1 text-sm font-semibold text-brand-ink truncate">
                                                        {result.title}
                                                    </p>
                                                    <p className="mt-1 text-xs opacity-60 line-clamp-2">
                                                        {result.subtitle}
                                                    </p>
                                                </div>
                                                {result.badge && (
                                                    <span className="shrink-0 inline-flex items-center rounded-full bg-brand-ink/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest opacity-70">
                                                        {result.badge}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="order-2 ml-auto flex items-center gap-3 sm:order-3 sm:gap-6">
                <div ref={actionCenterRef} className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setActionCenterOpen((current) => {
                                const next = !current;
                                if (next) {
                                    onMarkNotificationsRead();
                                    setSearchOpen(false);
                                }
                                return next;
                            });
                        }}
                        className="relative inline-flex h-10 w-10 items-center justify-center border border-brand-line/15 text-brand-ink/60 hover:bg-brand-ink/5 hover:text-brand-ink"
                        aria-label="Open action center"
                    >
                        <Bell size={18} />
                        {notificationIndicatorCount > 0 && (
                            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {notificationIndicatorCount > 9 ? '9+' : notificationIndicatorCount}
                            </span>
                        )}
                    </button>

                    {actionCenterOpen && (
                        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(92vw,24rem)] border border-brand-line/15 bg-white shadow-lg">
                            <div className="border-b border-brand-line/10 px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest opacity-35">
                                            Action Center
                                        </p>
                                        <h3 className="mt-1 text-sm font-semibold text-brand-ink">
                                            What Needs Attention
                                        </h3>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-brand-ink/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest opacity-70">
                                        {actionCenterItems.length} tasks
                                    </span>
                                </div>
                            </div>

                            <div className="max-h-[70vh] overflow-y-auto">
                                <section className="px-4 py-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-[10px] uppercase tracking-widest opacity-35">
                                            Action Items
                                        </p>
                                        {unreadLiveNotifications > 0 && (
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
                                                {unreadLiveNotifications} new live alerts
                                            </span>
                                        )}
                                    </div>

                                    {visibleActionItems.length === 0 ? (
                                        <div className="border border-dashed border-brand-line/15 bg-brand-ink/[0.02] px-4 py-5 text-sm opacity-55">
                                            No outstanding action items for your role right now.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {visibleActionItems.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectActionTarget({
                                                            tab: item.tab,
                                                            section: item.section,
                                                            query: item.query,
                                                        });
                                                        setActionCenterOpen(false);
                                                    }}
                                                    className="w-full border border-brand-line/10 px-4 py-4 text-left hover:bg-brand-ink/[0.02]"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-brand-ink">
                                                                {item.title}
                                                            </p>
                                                            <p className="mt-1 text-xs opacity-60">
                                                                {item.detail}
                                                            </p>
                                                        </div>
                                                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${toneClasses[item.tone]}`}>
                                                            {item.badge}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <section className="border-t border-brand-line/10 px-4 py-4">
                                    <p className="mb-3 text-[10px] uppercase tracking-widest opacity-35">
                                        Live Platform Activity
                                    </p>

                                    {visibleLiveNotifications.length === 0 ? (
                                        <div className="border border-dashed border-brand-line/15 bg-brand-ink/[0.02] px-4 py-5 text-sm opacity-55">
                                            No live workflow alerts have been received in this session yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {visibleLiveNotifications.map((notification) => (
                                                <div key={notification.id} className="border border-brand-line/10 px-4 py-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-brand-ink">
                                                                {notification.message}
                                                            </p>
                                                            {notification.detail && (
                                                                <p className="mt-1 text-xs opacity-60">
                                                                    {notification.detail}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                                                            notification.type === 'SUCCESS'
                                                                ? toneClasses.success
                                                                : 'bg-brand-ink/5 text-brand-ink/65'
                                                        }`}>
                                                            {notification.type}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-[10px] font-mono opacity-40">
                                                        {formatTimestamp(notification.timestamp)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={onSyncData}
                    className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-widest border border-brand-line/20 px-3 py-2 sm:px-4 hover:bg-brand-ink/5 transition-colors whitespace-nowrap"
                >
                    Sync Data
                </button>
            </div>
        </header>
    );
}

export default Header;
