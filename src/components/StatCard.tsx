export const StatCard = ({ label, value, icon: Icon, trend }: { label: string, value: string | number, icon: any, trend?: string }) => (
    <div className="bg-white p-6 border border-brand-line/10 rounded-sm">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-brand-ink/5 rounded-sm">
                <Icon size={20} className="text-brand-ink" />
            </div>
            {trend && (
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {trend}
                </span>
            )}
        </div>
        <div className="space-y-1">
            <p className="col-header">{label}</p>
            <p className="text-2xl font-bold data-value">{value}</p>
        </div>
    </div>
);