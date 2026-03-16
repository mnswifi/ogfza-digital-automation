import React, { useMemo, useState } from 'react';
import { TradeOperationRequest } from '@/middleware/types.middleware';
import {
    getTradeOperationService,
    tradeOperationFamilyCatalog,
    type TradeOperationFamilyKey,
} from '@/src/constants/tradeOperations';

type LogisticsProps = {
    tradeOperations: TradeOperationRequest[];
};

type QueueFilter = 'all' | 'active' | 'approved' | 'returned' | 'rejected';

const formatDisplayDateTime = (value?: string | null) => {
    if (!value) return '--';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(parsed);
};

const formatElapsedHours = (hours?: number | null) => {
    if (hours === null || hours === undefined || Number.isNaN(hours)) return '--';

    if (hours < 1) return '< 1 hr';
    if (hours < 24) return `${hours.toFixed(1)} hrs`;

    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
};

const getRequestAnchorDate = (request: TradeOperationRequest) =>
    request.resubmitted_at || request.submitted_at;

const getRequestElapsedHours = (request: TradeOperationRequest) => {
    const anchorDate = getRequestAnchorDate(request);
    if (!anchorDate) return null;

    const start = new Date(anchorDate);
    if (Number.isNaN(start.getTime())) return null;

    const terminalDateValue =
        request.status === 'Approved'
            ? request.approved_at
            : request.status === 'Rejected'
                ? request.rejected_at
                : null;

    const end = terminalDateValue ? new Date(terminalDateValue) : new Date();
    if (Number.isNaN(end.getTime())) return null;

    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
};

const getWorkflowStatus = (request: TradeOperationRequest) => {
    if (request.status === 'Approved') return 'Cleared for Coordination';
    if (request.status === 'Rejected') return 'Rejected / Closed';
    if (request.status === 'Returned') return 'Returned to Contractor';
    return 'Awaiting Compliance Review';
};

const getWorkflowTone = (request: TradeOperationRequest) => {
    if (request.status === 'Approved') return 'bg-emerald-50 text-emerald-700';
    if (request.status === 'Rejected') return 'bg-slate-100 text-slate-700';
    if (request.status === 'Returned') return 'bg-orange-50 text-orange-700';
    return 'bg-sky-50 text-sky-700';
};

const getSlaStatus = (request: TradeOperationRequest) => {
    const elapsedHours = getRequestElapsedHours(request);

    if (request.status === 'Approved') {
        if (elapsedHours !== null && elapsedHours > 48) {
            return {
                label: 'Cleared > SLA',
                tone: 'bg-rose-50 text-rose-700',
            };
        }

        return {
            label: 'Cleared',
            tone: 'bg-emerald-50 text-emerald-700',
        };
    }

    if (request.status === 'Rejected') {
        return {
            label: 'Closed',
            tone: 'bg-slate-100 text-slate-700',
        };
    }

    if (elapsedHours !== null && elapsedHours > 48) {
        return {
            label: 'Over SLA',
            tone: 'bg-rose-50 text-rose-700',
        };
    }

    if (elapsedHours !== null && elapsedHours > 36) {
        return {
            label: 'SLA Watch',
            tone: 'bg-amber-50 text-amber-700',
        };
    }

    return {
        label: 'On Track',
        tone: 'bg-sky-50 text-sky-700',
    };
};

export default function Logistics({ tradeOperations }: LogisticsProps) {
    const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');

    const enrichedRequests = useMemo(
        () =>
            tradeOperations
                .map((request) => {
                    const serviceDefinition = getTradeOperationService(request.service_type);
                    const elapsedHours = getRequestElapsedHours(request);
                    const sla = getSlaStatus(request);

                    return {
                        ...request,
                        elapsedHours,
                        serviceLabel: serviceDefinition?.label || request.service_type,
                        familyLabel:
                            serviceDefinition?.familyLabel ||
                            tradeOperationFamilyCatalog[request.service_family as TradeOperationFamilyKey]?.label ||
                            request.service_family,
                        workflowStatus: getWorkflowStatus(request),
                        workflowTone: getWorkflowTone(request),
                        sla,
                    };
                })
                .sort((left, right) => {
                    const priorityOrder: Record<string, number> = {
                        Submitted: 0,
                        Returned: 1,
                        Approved: 2,
                        Rejected: 3,
                    };

                    const priorityDifference =
                        (priorityOrder[left.status] ?? 99) - (priorityOrder[right.status] ?? 99);

                    if (priorityDifference !== 0) return priorityDifference;

                    const leftDate = new Date(getRequestAnchorDate(left) || 0).getTime();
                    const rightDate = new Date(getRequestAnchorDate(right) || 0).getTime();
                    return rightDate - leftDate;
                }),
        [tradeOperations],
    );

    const filteredRequests = enrichedRequests.filter((request) => {
        if (queueFilter === 'all') return true;
        if (queueFilter === 'active') return request.status === 'Submitted';
        if (queueFilter === 'approved') return request.status === 'Approved';
        if (queueFilter === 'returned') return request.status === 'Returned';
        if (queueFilter === 'rejected') return request.status === 'Rejected';
        return true;
    });

    const activeRequests = enrichedRequests.filter((request) => request.status === 'Submitted').length;
    const approvedRequests = enrichedRequests.filter((request) => request.status === 'Approved').length;
    const slaWatchlistCount = enrichedRequests.filter(
        (request) =>
            request.status === 'Submitted' &&
            request.elapsedHours !== null &&
            request.elapsedHours > 36 &&
            request.elapsedHours <= 48,
    ).length;
    const overSlaCount = enrichedRequests.filter(
        (request) =>
            request.status === 'Submitted' &&
            request.elapsedHours !== null &&
            request.elapsedHours > 48,
    ).length;

    const familyCards = (Object.keys(tradeOperationFamilyCatalog) as TradeOperationFamilyKey[]).map((familyKey) => {
        const familyRequests = enrichedRequests.filter((request) => request.service_family === familyKey);

        return {
            key: familyKey,
            label: tradeOperationFamilyCatalog[familyKey].label,
            description: tradeOperationFamilyCatalog[familyKey].description,
            total: familyRequests.length,
            active: familyRequests.filter((request) => request.status === 'Submitted').length,
            approved: familyRequests.filter((request) => request.status === 'Approved').length,
        };
    });

    const modeCounts = {
        sea: enrichedRequests.filter((request) => request.service_type.includes('sea')).length,
        air: enrichedRequests.filter((request) => request.service_type.includes('air')).length,
        road: enrichedRequests.filter((request) => request.service_type.includes('road')).length,
        transfer: enrichedRequests.filter(
            (request) =>
                request.service_type.includes('transfer') ||
                request.service_type.includes('temporary'),
        ).length,
    };

    return (
        <div className="space-y-6">
            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="text-2xl font-serif italic">Integrated Logistics</h2>
                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">
                        Live Movement Coordination Board Powered by Trade Operations
                    </p>
                    <p className="text-sm opacity-75 mt-4 max-w-3xl">
                        Monitor inbound, outbound, transfer, customs-control, and processing requests from a single
                        queue without duplicating the contractor submission workflow.
                    </p>
                </div>

                <div className="grid w-full sm:w-auto grid-cols-2 gap-3 text-center sm:min-w-[320px]">
                    <div className="bg-white/10 p-3 rounded-sm border border-white/10">
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Target SLA</div>
                        <div className="text-xl font-bold font-mono">48 HRS</div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-sm border border-white/10">
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Active Queue</div>
                        <div className="text-xl font-bold font-mono">{activeRequests}</div>
                    </div>
                    <div className="bg-emerald-500/20 p-3 rounded-sm border border-emerald-500/30">
                        <div className="text-[10px] uppercase tracking-widest text-emerald-200 mb-1">
                            Cleared for Coordination
                        </div>
                        <div className="text-xl font-bold font-mono text-emerald-400">{approvedRequests}</div>
                    </div>
                    <div className="bg-amber-500/20 p-3 rounded-sm border border-amber-500/30">
                        <div className="text-[10px] uppercase tracking-widest text-amber-100 mb-1">
                            Watch / Over SLA
                        </div>
                        <div className="text-xl font-bold font-mono text-amber-300">
                            {slaWatchlistCount} / {overSlaCount}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {familyCards.map((family) => (
                    <div key={family.key} className="bg-white border border-brand-line/10 rounded-sm p-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-45 mb-3">
                            {family.label}
                        </p>
                        <div className="text-3xl font-bold data-value">{family.total}</div>
                        <p className="text-xs opacity-60 mt-3 min-h-[56px]">{family.description}</p>
                        <div className="mt-4 flex justify-between text-[10px] uppercase tracking-[0.2em] opacity-45">
                            <span>Active: {family.active}</span>
                            <span>Cleared: {family.approved}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Sea-linked Requests', value: modeCounts.sea },
                    { label: 'Air-linked Requests', value: modeCounts.air },
                    { label: 'Road-linked Requests', value: modeCounts.road },
                    { label: 'Transfer / Temp Requests', value: modeCounts.transfer },
                ].map((item) => (
                    <div key={item.label} className="bg-white border border-brand-line/10 rounded-sm p-5 text-center">
                        <p className="text-[10px] uppercase tracking-widest opacity-40">{item.label}</p>
                        <p className="mt-3 text-2xl font-bold data-value">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-brand-ink/5">
                    <div>
                        <h3 className="font-serif italic text-base">Movement Tracker</h3>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                            Live request queue for logistics coordination and SLA monitoring
                        </p>
                    </div>

                    <div className="inline-flex flex-wrap gap-2 border border-brand-line/10 p-1 bg-white">
                        {[
                            { key: 'all' as const, label: 'All' },
                            { key: 'active' as const, label: 'Awaiting Review' },
                            { key: 'approved' as const, label: 'Cleared' },
                            { key: 'returned' as const, label: 'Returned' },
                            { key: 'rejected' as const, label: 'Closed' },
                        ].map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setQueueFilter(filter.key)}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                    queueFilter === filter.key
                                        ? 'bg-brand-ink text-brand-bg'
                                        : 'text-brand-ink/50 hover:bg-brand-ink/5'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-ink/5">
                                <th className="p-4 col-header">Reference</th>
                                <th className="p-4 col-header">Service</th>
                                <th className="p-4 col-header">Family</th>
                                <th className="p-4 col-header">Company</th>
                                <th className="p-4 col-header">Submitted</th>
                                <th className="p-4 col-header">Elapsed</th>
                                <th className="p-4 col-header">Workflow</th>
                                <th className="p-4 col-header">SLA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-line/10">
                            {filteredRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-brand-ink/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="text-xs font-mono">{request.request_reference}</div>
                                        <div className="text-[10px] opacity-40 mt-1">
                                            {request.company_license_no || 'No license no.'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-bold">{request.serviceLabel}</div>
                                        <div className="text-[10px] opacity-40 mt-1">
                                            {request.company_license_type || '--'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs opacity-70">{request.familyLabel}</td>
                                    <td className="p-4 text-xs font-mono">{request.company_name}</td>
                                    <td className="p-4 text-xs font-mono opacity-60">
                                        {formatDisplayDateTime(getRequestAnchorDate(request))}
                                    </td>
                                    <td className="p-4 text-xs font-mono">
                                        {formatElapsedHours(request.elapsedHours)}
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${request.workflowTone}`}
                                        >
                                            {request.workflowStatus}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${request.sla.tone}`}
                                        >
                                            {request.sla.label}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-10 text-center italic opacity-40">
                                        No trade operation requests match this logistics view yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
