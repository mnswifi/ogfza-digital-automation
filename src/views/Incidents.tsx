import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Printer, X } from 'lucide-react';
import type {
    Asset,
    Company,
    Incident,
    IncidentDetail,
    IncidentEvent,
    User,
} from '@/middleware/types.middleware';
import { printIncidentReport } from '@/src/utils/printDocuments';
import ModuleFilters from '@/src/components/ModuleFilters';
import { matchesSearchQuery, type ModuleSearchTarget } from '@/src/utils/globalSearch';

type NewIncidentForm = {
    companyId: string;
    assetId: string;
    incident_type: string;
    severity: string;
    description: string;
};

type IncidentsProps = {
    token: string | null;
    user: User;
    incidents: Incident[];
    companies: Company[];
    assets: Asset[];
    searchNavigation?: ModuleSearchTarget | null;
    showIncidentModal: boolean;
    setShowIncidentModal: (value: boolean) => void;
    newIncident: NewIncidentForm;
    setNewIncident: (value: NewIncidentForm) => void;
    actionLoading: boolean;
    onReportIncident: (e: React.FormEvent) => void | Promise<void>;
    onSubmitFollowUp: (incidentId: number, followUpNote: string) => void | Promise<void>;
    onUpdateIncidentStatus: (
        incidentId: number,
        status: 'Resolved' | 'Closed',
        reviewNote?: string
    ) => void | Promise<void>;
};

const statusToneClasses = {
    Open: 'bg-rose-50 text-rose-700',
    Resolved: 'bg-emerald-50 text-emerald-700',
    Closed: 'bg-slate-100 text-slate-700',
} as const;

const severityToneClasses = {
    Critical: 'bg-red-500 text-white',
    High: 'bg-orange-500 text-white',
    Medium: 'bg-yellow-500 text-brand-ink',
    Low: 'bg-emerald-500 text-white',
} as const;

const printActionButtonClassName = 'inline-flex items-center gap-2 border border-brand-line/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-ink/5 transition-colors';

const formatDisplayDate = (value?: string | null) => {
    if (!value) return '--';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
};

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

const readErrorMessage = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => null);
    return data?.error || fallback;
};

const getLastActionDate = (incident: Incident | IncidentDetail) => (
    incident.closed_at ||
    incident.resolved_at ||
    incident.follow_up_submitted_at ||
    incident.updated_at ||
    incident.reported_date ||
    null
);

function DetailItem({
    label,
    value,
    preserveWhitespace = false,
    className = '',
}: {
    label: string;
    value?: React.ReactNode;
    preserveWhitespace?: boolean;
    className?: string;
}) {
    const displayValue =
        value === null || value === undefined || value === ''
            ? '--'
            : value;

    return (
        <div className={`border border-brand-line/10 p-4 bg-white ${className}`}>
            <dt className="text-[10px] uppercase tracking-widest opacity-40">{label}</dt>
            <dd className={`mt-2 text-sm text-brand-ink ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}>
                {displayValue}
            </dd>
        </div>
    );
}

function WorkflowLog({ events }: { events?: IncidentEvent[] }) {
    if (!events || events.length === 0) {
        return (
            <div className="border border-brand-line/10 p-5 text-sm opacity-50">
                No incident workflow activity has been recorded yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {events.map((event) => (
                <article key={event.id} className="border border-brand-line/10 p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">
                                {event.event_type.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="mt-3 text-sm font-semibold text-brand-ink">
                                {event.actor_name || 'System'}{event.actor_role ? ` · ${event.actor_role}` : ''}
                            </p>
                        </div>
                        <p className="text-xs font-mono opacity-40">
                            {formatDisplayDateTime(event.created_at)}
                        </p>
                    </div>

                    {(event.from_status || event.to_status) && (
                        <p className="mt-4 text-sm opacity-60">
                            {event.from_status || '--'} <ArrowRight size={14} className="inline-block mx-1" /> {event.to_status || '--'}
                        </p>
                    )}

                    {event.note && (
                        <p className="mt-4 text-sm text-brand-ink whitespace-pre-wrap">
                            {event.note}
                        </p>
                    )}
                </article>
            ))}
        </div>
    );
}

export default function IncidentsView({
    token,
    user,
    incidents,
    companies,
    assets,
    searchNavigation,
    showIncidentModal,
    setShowIncidentModal,
    newIncident,
    setNewIncident,
    actionLoading,
    onReportIncident,
    onSubmitFollowUp,
    onUpdateIncidentStatus,
}: IncidentsProps) {
    const canReviewIncidents = user.role.includes('Compliance') || user.role.includes('Admin');
    const canLogIncidents = user.role.includes('Compliance');
    const isContractor = user.role.includes('Contractor');

    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<IncidentDetail | null>(null);
    const [incidentDetailLoading, setIncidentDetailLoading] = useState(false);
    const [incidentDetailError, setIncidentDetailError] = useState<string | null>(null);
    const [showIncidentDetailModal, setShowIncidentDetailModal] = useState(false);
    const [followUpNote, setFollowUpNote] = useState('');
    const [reviewNote, setReviewNote] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const statusOptions = useMemo(
        () => ['All', ...Array.from(new Set(incidents.map((incident) => incident.status))).sort()],
        [incidents],
    );
    const severityOptions = useMemo(
        () => ['All', ...Array.from(new Set(incidents.map((incident) => incident.severity))).sort()],
        [incidents],
    );
    const filteredIncidents = useMemo(
        () =>
            incidents.filter((incident) => {
                const matchesQuery = matchesSearchQuery(
                    deferredSearchQuery,
                    incident.company_name,
                    incident.asset_name,
                    incident.incident_type,
                    incident.severity,
                    incident.status,
                    incident.description,
                    incident.reported_by,
                );
                const matchesStatus = statusFilter === 'All' || incident.status === statusFilter;
                const matchesSeverity = severityFilter === 'All' || incident.severity === severityFilter;

                return matchesQuery && matchesStatus && matchesSeverity;
            }),
        [incidents, deferredSearchQuery, statusFilter, severityFilter],
    );

    useEffect(() => {
        if (!searchNavigation) return;
        setSearchQuery(searchNavigation.query || '');
    }, [searchNavigation]);

    const fetchIncidentDetail = async (incidentId: number) => {
        const response = await fetch(`/api/incidents/${incidentId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to load incident details.'));
        }

        return response.json() as Promise<IncidentDetail>;
    };

    const openIncidentDetailModal = async (incident: Incident) => {
        setSelectedIncident(incident);
        setSelectedIncidentDetail(null);
        setIncidentDetailError(null);
        setIncidentDetailLoading(true);
        setFollowUpNote(incident.follow_up_note || '');
        setReviewNote('');
        setShowIncidentDetailModal(true);

        try {
            const detail = await fetchIncidentDetail(incident.id);
            setSelectedIncidentDetail(detail);
            setFollowUpNote(detail.follow_up_note || '');
        } catch (error) {
            console.error(error);
            setIncidentDetailError(
                error instanceof Error ? error.message : 'Failed to load incident details.',
            );
        } finally {
            setIncidentDetailLoading(false);
        }
    };

    const closeIncidentModal = () => {
        setShowIncidentModal(false);
        setNewIncident({
            companyId: '',
            assetId: '',
            incident_type: 'HSE',
            severity: 'Medium',
            description: '',
        });
    };

    const handleSubmitFollowUp = async () => {
        if (!selectedIncidentDetail) return;

        const trimmedNote = followUpNote.trim();

        if (!trimmedNote) {
            window.alert('Please enter a follow-up note before submitting.');
            return;
        }

        await onSubmitFollowUp(selectedIncidentDetail.id, trimmedNote);

        try {
            const refreshedDetail = await fetchIncidentDetail(selectedIncidentDetail.id);
            setSelectedIncidentDetail(refreshedDetail);
            setSelectedIncident((current) => current ? {
                ...current,
                follow_up_note: refreshedDetail.follow_up_note,
                follow_up_submitted_at: refreshedDetail.follow_up_submitted_at,
                status: refreshedDetail.status,
                updated_at: refreshedDetail.updated_at,
            } : current);
            setFollowUpNote(refreshedDetail.follow_up_note || '');
        } catch (error) {
            console.error(error);
        }
    };

    const handleFinalStatusUpdate = async (status: 'Resolved' | 'Closed') => {
        if (!selectedIncidentDetail) return;

        await onUpdateIncidentStatus(
            selectedIncidentDetail.id,
            status,
            reviewNote.trim() || undefined
        );

        try {
            const refreshedDetail = await fetchIncidentDetail(selectedIncidentDetail.id);
            setSelectedIncidentDetail(refreshedDetail);
            setSelectedIncident((current) => current ? {
                ...current,
                status: refreshedDetail.status,
                updated_at: refreshedDetail.updated_at,
            } : current);
            setReviewNote('');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showIncidentModal && canLogIncidents && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-6">Log New Incident</h3>

                        <form onSubmit={(event) => void onReportIncident(event)} className="space-y-4">
                            <div className="space-y-1">
                                <label className="col-header">Affected Company</label>
                                <select
                                    required
                                    value={newIncident.companyId}
                                    onChange={(e) =>
                                        setNewIncident({
                                            ...newIncident,
                                            companyId: e.target.value,
                                            assetId:
                                                newIncident.companyId === e.target.value ? newIncident.assetId : '',
                                        })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option value="">Select company</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Affected Asset</label>
                                <select
                                    value={newIncident.assetId}
                                    onChange={(e) =>
                                        setNewIncident({ ...newIncident, assetId: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option value="">No specific asset</option>
                                    {assets
                                        .filter((asset) => String(asset.company_id ?? '') === newIncident.companyId)
                                        .map((asset) => (
                                            <option key={asset.id} value={asset.id}>
                                                {asset.asset_name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Incident Type</label>
                                    <select
                                        value={newIncident.incident_type}
                                        onChange={(e) =>
                                            setNewIncident({ ...newIncident, incident_type: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option>HSE</option>
                                        <option>Operational</option>
                                        <option>Security</option>
                                        <option>Technical</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="col-header">Severity</label>
                                    <select
                                        value={newIncident.severity}
                                        onChange={(e) =>
                                            setNewIncident({ ...newIncident, severity: e.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Incident Description</label>
                                <textarea
                                    required
                                    value={newIncident.description}
                                    onChange={(e) =>
                                        setNewIncident({ ...newIncident, description: e.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm h-32 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeIncidentModal}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                                >
                                    {actionLoading ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showIncidentDetailModal && selectedIncident && (
                <div className="fixed inset-0 bg-brand-ink/30 backdrop-blur-sm z-50 overflow-y-auto p-4">
                    <div className="min-h-full flex items-start justify-center py-4">
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                        Incident Case
                                    </p>
                                    <h2 className="text-2xl font-serif text-brand-ink mt-2">
                                        {selectedIncident.company_name}
                                    </h2>
                                    <p className="text-xs font-mono opacity-50 mt-2">
                                        Incident #{selectedIncident.id}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {selectedIncidentDetail && (
                                        <button
                                            type="button"
                                            onClick={() => printIncidentReport(selectedIncidentDetail)}
                                            className={printActionButtonClassName}
                                        >
                                            <Printer size={14} />
                                            Print Incident Report
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setShowIncidentDetailModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {incidentDetailLoading && (
                                <div className="py-10 text-center">
                                    <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm opacity-50">
                                        Loading incident case...
                                    </p>
                                </div>
                            )}

                            {!incidentDetailLoading && incidentDetailError && (
                                <div className="mt-8 border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                    {incidentDetailError}
                                </div>
                            )}

                            {!incidentDetailLoading && !incidentDetailError && (
                                <div className="mt-8 space-y-6">
                                    {(() => {
                                        const incidentForDisplay = selectedIncidentDetail || selectedIncident;
                                        const statusTone =
                                            statusToneClasses[
                                            (incidentForDisplay.status as keyof typeof statusToneClasses) || 'Open'
                                            ] || statusToneClasses.Open;
                                        const severityTone =
                                            severityToneClasses[
                                            (incidentForDisplay.severity as keyof typeof severityToneClasses) || 'Medium'
                                            ] || severityToneClasses.Medium;
                                        const hasFollowUp = Boolean(selectedIncidentDetail?.follow_up_note);

                                        return (
                                            <>
                                                <div className="border border-brand-line/10 p-5 bg-brand-ink/[0.02]">
                                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-widest opacity-40">
                                                                Current Status
                                                            </p>
                                                            <p className="mt-3 text-sm opacity-70">
                                                                {incidentForDisplay.status === 'Open' &&
                                                                    'Compliance has logged this incident and is awaiting the contractor follow-up response.'}
                                                                {incidentForDisplay.status === 'Resolved' &&
                                                                    'Compliance has reviewed the contractor response and marked this incident as resolved.'}
                                                                {incidentForDisplay.status === 'Closed' &&
                                                                    'Compliance has closed this incident after review of the contractor follow-up.'}
                                                            </p>
                                                        </div>
                                                        <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${statusTone}`}>
                                                            {incidentForDisplay.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <DetailItem label="Incident Type" value={incidentForDisplay.incident_type} />
                                                    <DetailItem label="Affected Asset" value={incidentForDisplay.asset_name} />
                                                    <DetailItem
                                                        label="Severity"
                                                        value={
                                                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${severityTone}`}>
                                                                {incidentForDisplay.severity}
                                                            </span>
                                                        }
                                                    />
                                                    <DetailItem label="Reported By" value={incidentForDisplay.reported_by} />
                                                    <DetailItem label="Reported On" value={formatDisplayDateTime(incidentForDisplay.reported_date)} />
                                                    <DetailItem label="Last Action" value={formatDisplayDateTime(getLastActionDate(incidentForDisplay))} />
                                                    <DetailItem label="Status" value={incidentForDisplay.status} />
                                                </dl>

                                                <section className="space-y-4">
                                                    <div>
                                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                            Incident Report
                                                        </h3>
                                                    </div>
                                                    <DetailItem
                                                        label="Incident Description"
                                                        value={incidentForDisplay.description}
                                                        preserveWhitespace
                                                    />
                                                </section>

                                                <section className="space-y-4">
                                                    <div>
                                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                            Contractor Follow-up
                                                        </h3>
                                                    </div>
                                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <DetailItem
                                                            label="Latest Follow-up"
                                                            value={selectedIncidentDetail?.follow_up_note}
                                                            preserveWhitespace
                                                            className="md:col-span-2"
                                                        />
                                                        <DetailItem
                                                            label="Submitted By"
                                                            value={selectedIncidentDetail?.follow_up_submitted_by_name}
                                                        />
                                                        <DetailItem
                                                            label="Submitted At"
                                                            value={formatDisplayDateTime(selectedIncidentDetail?.follow_up_submitted_at)}
                                                        />
                                                    </dl>
                                                </section>

                                                <section className="space-y-4">
                                                    <div>
                                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                            Workflow Log
                                                        </h3>
                                                    </div>
                                                    <WorkflowLog events={selectedIncidentDetail?.events} />
                                                </section>

                                                {isContractor && incidentForDisplay.status === 'Open' && (
                                                    <section className="border-t border-brand-line/10 pt-6 space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="col-header">Contractor Follow-up</label>
                                                            <textarea
                                                                value={followUpNote}
                                                                onChange={(event) => setFollowUpNote(event.target.value)}
                                                                className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                                                placeholder="Respond to the incident report, provide clarification, and explain any corrective action or why the incident should be closed."
                                                            />
                                                        </div>

                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={() => void handleSubmitFollowUp()}
                                                                className="bg-brand-ink text-brand-bg px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                            >
                                                                {hasFollowUp ? 'Update Follow-up' : 'Submit Follow-up'}
                                                            </button>
                                                        </div>
                                                    </section>
                                                )}

                                                {canReviewIncidents && incidentForDisplay.status === 'Open' && (
                                                    <section className="border-t border-brand-line/10 pt-6 space-y-4">
                                                        {hasFollowUp ? (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <label className="col-header">Compliance Note</label>
                                                                    <textarea
                                                                        value={reviewNote}
                                                                        onChange={(event) => setReviewNote(event.target.value)}
                                                                        className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                                                        placeholder="Optional note to explain why the case is being resolved or closed."
                                                                    />
                                                                </div>

                                                                <div className="flex flex-wrap justify-end gap-3">
                                                                    <button
                                                                        type="button"
                                                                        disabled={actionLoading}
                                                                        onClick={() => void handleFinalStatusUpdate('Resolved')}
                                                                        className="bg-emerald-600 text-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                                    >
                                                                        Mark Resolved
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={actionLoading}
                                                                        onClick={() => void handleFinalStatusUpdate('Closed')}
                                                                        className="border border-slate-200 text-slate-700 px-4 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                                    >
                                                                        Close Incident
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                                                Awaiting contractor follow-up before Compliance can resolve or close this incident.
                                                            </div>
                                                        )}
                                                    </section>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                    <h3 className="font-serif italic text-base">Safety & Incident Logs</h3>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
                        Compliance-led incident workflow with contractor follow-up
                    </p>
                </div>

                <div className="flex gap-2">
                    {canLogIncidents && (
                        <button
                            onClick={() => setShowIncidentModal(true)}
                            className="bg-brand-ink text-brand-bg px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            Log New Incident
                        </button>
                    )}
                </div>
            </div>

            <ModuleFilters
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by company, asset, incident type, severity, status, or description"
                selects={[
                    {
                        label: 'Status',
                        value: statusFilter,
                        options: statusOptions.map((option) => ({ label: option, value: option })),
                        onChange: setStatusFilter,
                    },
                    {
                        label: 'Severity',
                        value: severityFilter,
                        options: severityOptions.map((option) => ({ label: option, value: option })),
                        onChange: setSeverityFilter,
                    },
                ]}
                resultCount={filteredIncidents.length}
                resultLabel="matching incidents"
            />

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-brand-ink/5">
                            <th className="p-4 col-header">ID</th>
                            <th className="p-4 col-header">Entity</th>
                            <th className="p-4 col-header">Asset</th>
                            <th className="p-4 col-header">Type</th>
                            <th className="p-4 col-header">Severity</th>
                            <th className="p-4 col-header">Status</th>
                            <th className="p-4 col-header">Last Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-line/10">
                        {filteredIncidents.map((incident) => {
                            const statusTone =
                                statusToneClasses[
                                (incident.status as keyof typeof statusToneClasses) || 'Open'
                                ] || statusToneClasses.Open;
                            const severityTone =
                                severityToneClasses[
                                (incident.severity as keyof typeof severityToneClasses) || 'Medium'
                                ] || severityToneClasses.Medium;

                            return (
                                <tr
                                    key={incident.id}
                                    className="hover:bg-brand-ink/[0.02] transition-colors cursor-pointer"
                                    onClick={() => void openIncidentDetailModal(incident)}
                                >
                                    <td className="p-4 text-xs font-mono opacity-50">#{incident.id}</td>
                                    <td className="p-4 text-xs font-bold uppercase">{incident.company_name}</td>
                                    <td className="p-4 text-xs opacity-70">{incident.asset_name || '--'}</td>
                                    <td className="p-4 text-xs italic">{incident.incident_type}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-full ${severityTone}`}>
                                            {incident.severity}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-full ${statusTone}`}>
                                            {incident.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs opacity-50">
                                        {formatDisplayDate(getLastActionDate(incident))}
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredIncidents.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-20 text-center opacity-30 italic">
                                    {incidents.length === 0
                                        ? 'No incident cases recorded in the system.'
                                        : 'No incident cases match the current filters.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
