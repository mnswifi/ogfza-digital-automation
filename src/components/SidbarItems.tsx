import { ChevronRight } from "lucide-react";

export const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${active
            ? 'bg-brand-ink text-brand-bg'
            : 'text-brand-ink/60 hover:bg-brand-ink/5 hover:text-brand-ink'
            }`}
    >
        <Icon size={18} />
        <span>{label}</span>
        {active && <ChevronRight size={14} className="ml-auto" />}
    </button>
);