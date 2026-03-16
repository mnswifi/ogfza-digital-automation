import React from 'react';

type FilterOption = {
    label: string;
    value: string;
};

type FilterSelect = {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
};

type ModuleFiltersProps = {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    selects?: FilterSelect[];
    resultCount: number;
    resultLabel: string;
};

export default function ModuleFilters({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    selects = [],
    resultCount,
    resultLabel,
}: ModuleFiltersProps) {
    return (
        <div className="px-6 py-4 border-b border-brand-line/10 bg-brand-ink/[0.02]">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className={selects.length === 0 ? 'md:col-span-2 xl:col-span-2' : 'md:col-span-2'}>
                        <label className="text-[10px] uppercase tracking-widest opacity-40 block mb-2">
                            Search
                        </label>
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-white border border-brand-line/10 px-3 py-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                        />
                    </div>

                    {selects.map((select) => (
                        <div key={select.label}>
                            <label className="text-[10px] uppercase tracking-widest opacity-40 block mb-2">
                                {select.label}
                            </label>
                            <select
                                value={select.value}
                                onChange={(event) => select.onChange(event.target.value)}
                                className="w-full bg-white border border-brand-line/10 px-3 py-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            >
                                {select.options.map((option) => (
                                    <option key={`${select.label}-${option.value}`} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                <p className="text-[10px] uppercase tracking-widest font-bold opacity-35 whitespace-nowrap">
                    {resultCount} {resultLabel}
                </p>
            </div>
        </div>
    );
}
