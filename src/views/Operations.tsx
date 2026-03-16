import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Pencil, Wrench, X } from 'lucide-react';
import {
    Asset,
    AssetDetail,
    Company,
    Incident,
    MaintenanceRecord,
    Operation,
} from '@/middleware/types.middleware';
import { printStructuredReport } from '@/src/utils/printDocuments';
import ModuleFilters from '@/src/components/ModuleFilters';
import { matchesSearchQuery, type ModuleSearchTarget } from '@/src/utils/globalSearch';

type NewOpsForm = {
    assetId: string;
    production_volume: string;
    downtime_hours: string;
    report_date: string;
    notes: string;
};

type AssetForm = {
    companyId: string;
    assetName: string;
    assetType: string;
    locationCoordinates: string;
    status: string;
    maintenanceDate: string;
};

type MaintenanceForm = {
    assetId: string;
    maintenanceType: string;
    description: string;
    technician: string;
    cost: string;
    maintenanceDate: string;
    nextDueDate: string;
    status: string;
};

type OperationsProps = {
    token: string | null;
    companies: Company[];
    incidents: Incident[];
    operations: Operation[];
    assets: Asset[];
    maintenance: MaintenanceRecord[];
    searchNavigation?: ModuleSearchTarget | null;
    onRefresh: () => void | Promise<void>;
    showOpsModal: boolean;
    setShowOpsModal: (value: boolean) => void;
    newOps: NewOpsForm;
    setNewOps: (value: NewOpsForm) => void;
    actionLoading: boolean;
    userRole: string;
    onLogProduction: (e: React.FormEvent) => void | Promise<void>;
};

const emptyAssetForm: AssetForm = {
    companyId: '',
    assetName: '',
    assetType: '',
    locationCoordinates: '',
    status: 'Operational',
    maintenanceDate: '',
};

const emptyMaintenanceForm: MaintenanceForm = {
    assetId: '',
    maintenanceType: 'Routine Check',
    description: '',
    technician: '',
    cost: '',
    maintenanceDate: '',
    nextDueDate: '',
    status: 'Scheduled',
};

const emptyOpsForm: NewOpsForm = {
    assetId: '',
    production_volume: '',
    downtime_hours: '',
    report_date: '',
    notes: '',
};

const assetStatusToneClasses: Record<string, string> = {
    Operational: 'bg-emerald-50 text-emerald-700',
    'Under Maintenance': 'bg-amber-50 text-amber-700',
    Down: 'bg-rose-50 text-rose-700',
    Retired: 'bg-slate-100 text-slate-700',
    'Maintenance Needed': 'bg-amber-50 text-amber-700',
};

const maintenanceStatusToneClasses: Record<string, string> = {
    Scheduled: 'bg-sky-50 text-sky-700',
    'In Progress': 'bg-amber-50 text-amber-700',
    Completed: 'bg-emerald-50 text-emerald-700',
};

const incidentStatusToneClasses: Record<string, string> = {
    Open: 'bg-rose-50 text-rose-700',
    Resolved: 'bg-emerald-50 text-emerald-700',
    Closed: 'bg-slate-100 text-slate-700',
};

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

const formatCurrency = (value?: number | string | null) => {
    if (value === null || value === undefined || value === '') return '--';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '--';
    return `$${numeric.toLocaleString()}`;
};

const readErrorMessage = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => null);
    return data?.error || fallback;
};

function DetailItem({
    label,
    value,
    preserveWhitespace = false,
}: {
    label: string;
    value?: React.ReactNode;
    preserveWhitespace?: boolean;
}) {
    const displayValue = value === null || value === undefined || value === '' ? '--' : value;

    return (
        <div className="border border-brand-line/10 p-4 bg-white">
            <dt className="text-[10px] uppercase tracking-widest opacity-40">{label}</dt>
            <dd className={`mt-2 text-sm text-brand-ink ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}>
                {displayValue}
            </dd>
        </div>
    );
}

export default function OperationsView({
    token,
    companies,
    incidents,
    operations,
    assets,
    maintenance,
    searchNavigation,
    onRefresh,
    showOpsModal,
    setShowOpsModal,
    newOps,
    setNewOps,
    actionLoading,
    userRole,
    onLogProduction,
}: OperationsProps) {
    const roles = userRole.split(',').map((role) => role.trim());
    const canManageAssets = roles.includes('Operations') || roles.includes('Admin');
    const canOperateAssets = roles.includes('Operations');
    const [activeSection, setActiveSection] = useState<'registry' | 'production' | 'maintenance'>('registry');
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
    const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>(emptyMaintenanceForm);
    const [moduleActionLoading, setModuleActionLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [selectedAssetDetail, setSelectedAssetDetail] = useState<AssetDetail | null>(null);
    const [assetDetailLoading, setAssetDetailLoading] = useState(false);
    const [assetDetailError, setAssetDetailError] = useState<string | null>(null);
    const [showAssetDetailModal, setShowAssetDetailModal] = useState(false);
    const [registrySearchQuery, setRegistrySearchQuery] = useState('');
    const [registryStatusFilter, setRegistryStatusFilter] = useState('All');
    const [productionSearchQuery, setProductionSearchQuery] = useState('');
    const [maintenanceSearchQuery, setMaintenanceSearchQuery] = useState('');
    const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState('All');
    const deferredRegistrySearchQuery = useDeferredValue(registrySearchQuery);
    const deferredProductionSearchQuery = useDeferredValue(productionSearchQuery);
    const deferredMaintenanceSearchQuery = useDeferredValue(maintenanceSearchQuery);

    const totalAssets = assets.length;
    const operationalAssets = assets.filter((asset) => asset.status === 'Operational').length;
    const assetsUnderMaintenance = assets.filter(
        (asset) => asset.status === 'Under Maintenance' || asset.status === 'Maintenance Needed'
    ).length;
    const linkedOpenIncidents = incidents.filter(
        (incident) => incident.status === 'Open' && incident.asset_id
    ).length;

    const handlePrintOperationsReport = () => {
        printStructuredReport({
            documentTitle: 'OGFZA Field Assets Report',
            kicker: 'OGFZA Field Assets',
            title: 'Field Assets Control Report',
            subtitle: 'Asset registry, production activity, maintenance workload, and linked incident visibility.',
            reference: `Generated ${formatDisplayDateTime(new Date().toISOString())}`,
            badges: [
                { label: `${totalAssets} total assets`, tone: 'neutral' },
                { label: `${assetsUnderMaintenance} under maintenance`, tone: assetsUnderMaintenance > 0 ? 'warning' : 'success' },
                { label: `${linkedOpenIncidents} linked open incidents`, tone: linkedOpenIncidents > 0 ? 'danger' : 'success' },
            ],
            sections: [
                {
                    title: 'Operational Summary',
                    kind: 'fields',
                    columns: 3,
                    fields: [
                        { label: 'Total Assets', value: totalAssets },
                        { label: 'Operational Assets', value: operationalAssets },
                        { label: 'Assets Under Maintenance', value: assetsUnderMaintenance },
                        { label: 'Linked Open Incidents', value: linkedOpenIncidents },
                    ],
                },
                {
                    title: 'Asset Registry',
                    kind: 'table',
                    headers: ['Asset', 'Company', 'Type', 'Location', 'Status', 'Next Maintenance'],
                    rows: assets.map((asset) => ([
                        asset.asset_name,
                        asset.company_name || '--',
                        asset.type,
                        asset.location_coordinates,
                        asset.status,
                        formatDisplayDate(asset.maintenance_date),
                    ])),
                },
                {
                    title: 'Production & Downtime Log',
                    kind: 'table',
                    headers: ['Asset', 'Company', 'Production Volume', 'Downtime Hours', 'Report Date', 'Notes'],
                    rows: operations.map((entry) => ([
                        entry.asset_name || entry.field_name,
                        entry.company_name || '--',
                        entry.production_volume,
                        entry.downtime_hours,
                        formatDisplayDate(entry.report_date),
                        entry.notes || '--',
                    ])),
                },
                {
                    title: 'Maintenance Log',
                    kind: 'table',
                    headers: ['Asset', 'Company', 'Type', 'Technician', 'Cost', 'Maintenance Date', 'Status'],
                    rows: maintenance.map((entry) => ([
                        entry.asset_name,
                        entry.company_name || '--',
                        entry.maintenance_type,
                        entry.technician,
                        formatCurrency(entry.cost),
                        formatDisplayDate(entry.maintenance_date),
                        entry.status,
                    ])),
                },
            ],
            footerNote: 'Generated from the Field Assets Control module in the OGFZA Digital Automation prototype.',
        });
    };

    const runRefresh = async () => {
        await Promise.resolve(onRefresh());
    };

    const fetchAssetDetail = async (assetId: number) => {
        const response = await fetch(`/api/assets/${assetId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to load asset details.'));
        }

        return response.json() as Promise<AssetDetail>;
    };

    const openAssetDetailModal = async (asset: Asset) => {
        setSelectedAsset(asset);
        setSelectedAssetDetail(null);
        setAssetDetailError(null);
        setAssetDetailLoading(true);
        setShowAssetDetailModal(true);

        try {
            const detail = await fetchAssetDetail(asset.id);
            setSelectedAssetDetail(detail);
        } catch (error) {
            console.error(error);
            setAssetDetailError(error instanceof Error ? error.message : 'Failed to load asset details.');
        } finally {
            setAssetDetailLoading(false);
        }
    };

    const openCreateAssetModal = () => {
        setEditingAssetId(null);
        setAssetForm(emptyAssetForm);
        setShowAssetModal(true);
    };

    const openEditAssetModal = (asset: Asset | AssetDetail) => {
        setEditingAssetId(asset.id);
        setAssetForm({
            companyId: asset.company_id ? String(asset.company_id) : '',
            assetName: asset.asset_name || '',
            assetType: asset.type || '',
            locationCoordinates: asset.location_coordinates || '',
            status: asset.status || 'Operational',
            maintenanceDate: asset.maintenance_date || '',
        });
        setShowAssetModal(true);
    };

    const closeAssetModal = () => {
        setShowAssetModal(false);
        setEditingAssetId(null);
        setAssetForm(emptyAssetForm);
    };

    const closeMaintenanceModal = () => {
        setShowMaintenanceModal(false);
        setMaintenanceForm(emptyMaintenanceForm);
    };

    const closeProductionModal = () => {
        setShowOpsModal(false);
        setNewOps(emptyOpsForm);
    };

    const submitAsset = async (event: React.FormEvent) => {
        event.preventDefault();
        if (moduleActionLoading) return;

        setModuleActionLoading(true);
        try {
            const response = await fetch(
                editingAssetId ? `/api/assets/${editingAssetId}` : '/api/assets',
                {
                    method: editingAssetId ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(assetForm),
                }
            );

            if (!response.ok) {
                throw new Error(
                    await readErrorMessage(
                        response,
                        editingAssetId ? 'Failed to update asset.' : 'Failed to register asset.'
                    )
                );
            }

            closeAssetModal();
            await runRefresh();

            const refreshedId = editingAssetId ?? (await response.json().catch(() => null))?.id ?? null;
            if (refreshedId && showAssetDetailModal && selectedAsset?.id === refreshedId) {
                const detail = await fetchAssetDetail(refreshedId);
                setSelectedAssetDetail(detail);
                setSelectedAsset(detail);
            }
        } catch (error) {
            console.error(error);
            window.alert(error instanceof Error ? error.message : 'Failed to save the asset.');
        } finally {
            setModuleActionLoading(false);
        }
    };

    const openMaintenanceCreateModal = (assetId?: number) => {
        setMaintenanceForm({
            ...emptyMaintenanceForm,
            assetId: assetId ? String(assetId) : '',
        });
        setShowMaintenanceModal(true);
    };

    const submitMaintenance = async (event: React.FormEvent) => {
        event.preventDefault();
        if (moduleActionLoading) return;

        setModuleActionLoading(true);
        try {
            const response = await fetch('/api/maintenance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(maintenanceForm),
            });

            if (!response.ok) {
                throw new Error(
                    await readErrorMessage(response, 'Failed to create the maintenance work order.')
                );
            }

            const targetAssetId = Number(maintenanceForm.assetId);
            closeMaintenanceModal();
            await runRefresh();

            if (showAssetDetailModal && selectedAsset?.id === targetAssetId) {
                const detail = await fetchAssetDetail(targetAssetId);
                setSelectedAssetDetail(detail);
                setSelectedAsset(detail);
            }
        } catch (error) {
            console.error(error);
            window.alert(
                error instanceof Error ? error.message : 'Failed to create the maintenance work order.'
            );
        } finally {
            setModuleActionLoading(false);
        }
    };

    const updateMaintenanceStatus = async (
        record: MaintenanceRecord,
        nextStatus: 'In Progress' | 'Completed'
    ) => {
        if (moduleActionLoading) return;

        setModuleActionLoading(true);
        try {
            const response = await fetch(`/api/maintenance/${record.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: nextStatus,
                    nextDueDate: record.next_due_date || undefined,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    await readErrorMessage(response, 'Failed to update maintenance status.')
                );
            }

            await runRefresh();

            if (showAssetDetailModal && selectedAsset?.id === record.asset_id) {
                const detail = await fetchAssetDetail(record.asset_id);
                setSelectedAssetDetail(detail);
                setSelectedAsset(detail);
            }
        } catch (error) {
            console.error(error);
            window.alert(error instanceof Error ? error.message : 'Failed to update maintenance status.');
        } finally {
            setModuleActionLoading(false);
        }
    };

    const assetOptions = useMemo(
        () => assets.slice().sort((left, right) => left.asset_name.localeCompare(right.asset_name)),
        [assets],
    );
    const registryStatusOptions = useMemo(
        () => ['All', ...Array.from(new Set(assets.map((asset) => asset.status))).sort()],
        [assets],
    );
    const maintenanceStatusOptions = useMemo(
        () => ['All', ...Array.from(new Set(maintenance.map((record) => record.status))).sort()],
        [maintenance],
    );
    const registryRows = useMemo(
        () =>
            assets
                .slice()
                .sort((left, right) => left.asset_name.localeCompare(right.asset_name))
                .filter((asset) => {
                    const matchesQuery = matchesSearchQuery(
                        deferredRegistrySearchQuery,
                        asset.asset_name,
                        asset.company_name,
                        asset.type,
                        asset.location_coordinates,
                        asset.status,
                    );
                    const matchesStatus =
                        registryStatusFilter === 'All' || asset.status === registryStatusFilter;

                    return matchesQuery && matchesStatus;
                }),
        [assets, deferredRegistrySearchQuery, registryStatusFilter],
    );
    const productionRows = useMemo(
        () =>
            operations.filter((record) =>
                matchesSearchQuery(
                    deferredProductionSearchQuery,
                    record.asset_name,
                    record.company_name,
                    record.field_name,
                    record.notes,
                    record.report_date,
                ),
            ),
        [operations, deferredProductionSearchQuery],
    );
    const maintenanceRows = useMemo(
        () =>
            maintenance.filter((record) => {
                const matchesQuery = matchesSearchQuery(
                    deferredMaintenanceSearchQuery,
                    record.asset_name,
                    record.company_name,
                    record.maintenance_type,
                    record.technician,
                    record.description,
                    record.status,
                );
                const matchesStatus =
                    maintenanceStatusFilter === 'All' || record.status === maintenanceStatusFilter;

                return matchesQuery && matchesStatus;
            }),
        [maintenance, deferredMaintenanceSearchQuery, maintenanceStatusFilter],
    );

    useEffect(() => {
        if (!searchNavigation?.section) return;

        if (searchNavigation.section === 'registry') {
            setActiveSection('registry');
            setRegistrySearchQuery(searchNavigation.query || '');
        }
    }, [searchNavigation]);

    return (
        <div className="space-y-6">
            {showAssetModal && canManageAssets && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-2xl w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-2">
                            {editingAssetId ? 'Update Asset Record' : 'Register New Asset'}
                        </h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                            Asset Registry & Status Control
                        </p>

                        <form onSubmit={(event) => void submitAsset(event)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Owning Company</label>
                                    <select
                                        required
                                        value={assetForm.companyId}
                                        onChange={(event) =>
                                            setAssetForm({ ...assetForm, companyId: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option value="">Select licensed company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Asset Type</label>
                                    <select
                                        required
                                        value={assetForm.assetType}
                                        onChange={(event) =>
                                            setAssetForm({ ...assetForm, assetType: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option value="">Select asset type</option>
                                        <option>Warehouse</option>
                                        <option>Pipeline</option>
                                        <option>Jetty</option>
                                        <option>Tank Farm</option>
                                        <option>Rig</option>
                                        <option>Processing Facility</option>
                                        <option>Office Facility</option>
                                        <option>Residential Facility</option>
                                        <option>Equipment Yard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Asset Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={assetForm.assetName}
                                        onChange={(event) =>
                                            setAssetForm({ ...assetForm, assetName: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Current Status</label>
                                    <select
                                        value={assetForm.status}
                                        onChange={(event) =>
                                            setAssetForm({ ...assetForm, status: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option>Operational</option>
                                        <option>Under Maintenance</option>
                                        <option>Down</option>
                                        <option>Retired</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Location / Coordinates</label>
                                    <input
                                        required
                                        type="text"
                                        value={assetForm.locationCoordinates}
                                        onChange={(event) =>
                                            setAssetForm({ ...assetForm, locationCoordinates: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        placeholder="e.g. Onne FZ Plot C12 / 4.81, 7.04"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Next Maintenance Due</label>
                                    <input
                                        type="date"
                                        value={assetForm.maintenanceDate}
                                        onChange={(event) =>
                                            setAssetForm({ ...assetForm, maintenanceDate: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeAssetModal}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={moduleActionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                                >
                                    {moduleActionLoading
                                        ? 'Saving...'
                                        : editingAssetId
                                            ? 'Save Changes'
                                            : 'Register Asset'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showOpsModal && canOperateAssets && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-2xl w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-2">Log Production & Downtime</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                            Asset Performance Control
                        </p>

                        <form onSubmit={onLogProduction} className="space-y-4">
                            <div className="space-y-1">
                                <label className="col-header">Asset</label>
                                <select
                                    required
                                    value={newOps.assetId}
                                    onChange={(event) =>
                                        setNewOps({ ...newOps, assetId: event.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option value="">Select asset</option>
                                    {assetOptions.map((asset) => (
                                        <option key={asset.id} value={asset.id}>
                                            {asset.asset_name}
                                            {asset.company_name ? ` - ${asset.company_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Production Volume</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newOps.production_volume}
                                        onChange={(event) =>
                                            setNewOps({ ...newOps, production_volume: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Downtime (Hours)</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newOps.downtime_hours}
                                        onChange={(event) =>
                                            setNewOps({ ...newOps, downtime_hours: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Report Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={newOps.report_date}
                                        onChange={(event) =>
                                            setNewOps({ ...newOps, report_date: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Operations Note</label>
                                    <input
                                        type="text"
                                        value={newOps.notes}
                                        onChange={(event) =>
                                            setNewOps({ ...newOps, notes: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        placeholder="Optional context for the shift report"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeProductionModal}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                                >
                                    {actionLoading ? 'Logging...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showMaintenanceModal && canOperateAssets && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-2xl w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-2">Schedule Maintenance</h3>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                            Work Order & Lifecycle Scheduling
                        </p>

                        <form onSubmit={(event) => void submitMaintenance(event)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Asset</label>
                                    <select
                                        required
                                        value={maintenanceForm.assetId}
                                        onChange={(event) =>
                                            setMaintenanceForm({ ...maintenanceForm, assetId: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option value="">Select asset</option>
                                        {assetOptions.map((asset) => (
                                            <option key={asset.id} value={asset.id}>
                                                {asset.asset_name}
                                                {asset.company_name ? ` - ${asset.company_name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Maintenance Type</label>
                                    <select
                                        value={maintenanceForm.maintenanceType}
                                        onChange={(event) =>
                                            setMaintenanceForm({
                                                ...maintenanceForm,
                                                maintenanceType: event.target.value,
                                            })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option>Routine Check</option>
                                        <option>Preventive Maintenance</option>
                                        <option>Repair</option>
                                        <option>Inspection</option>
                                        <option>Calibration</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="col-header">Work Description</label>
                                <textarea
                                    required
                                    value={maintenanceForm.description}
                                    onChange={(event) =>
                                        setMaintenanceForm({ ...maintenanceForm, description: event.target.value })
                                    }
                                    className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Technician / Team</label>
                                    <input
                                        required
                                        type="text"
                                        value={maintenanceForm.technician}
                                        onChange={(event) =>
                                            setMaintenanceForm({ ...maintenanceForm, technician: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Estimated Cost</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={maintenanceForm.cost}
                                        onChange={(event) =>
                                            setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="col-header">Maintenance Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={maintenanceForm.maintenanceDate}
                                        onChange={(event) =>
                                            setMaintenanceForm({
                                                ...maintenanceForm,
                                                maintenanceDate: event.target.value,
                                            })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Next Due Date</label>
                                    <input
                                        type="date"
                                        value={maintenanceForm.nextDueDate}
                                        onChange={(event) =>
                                            setMaintenanceForm({
                                                ...maintenanceForm,
                                                nextDueDate: event.target.value,
                                            })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="col-header">Initial Status</label>
                                    <select
                                        value={maintenanceForm.status}
                                        onChange={(event) =>
                                            setMaintenanceForm({ ...maintenanceForm, status: event.target.value })
                                        }
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    >
                                        <option>Scheduled</option>
                                        <option>In Progress</option>
                                        <option>Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeMaintenanceModal}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={moduleActionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                                >
                                    {moduleActionLoading ? 'Saving...' : 'Create Work Order'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showAssetDetailModal && selectedAsset && (
                <div className="fixed inset-0 bg-brand-ink/30 backdrop-blur-sm z-50 overflow-y-auto p-4">
                    <div className="min-h-full flex items-start justify-center py-4">
                        <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-35">
                                        Asset Control Record
                                    </p>
                                    <h2 className="text-2xl font-serif text-brand-ink mt-2">
                                        {selectedAsset.asset_name}
                                    </h2>
                                    <p className="text-xs font-mono opacity-50 mt-2">
                                        Asset #{selectedAsset.id.toString().padStart(4, '0')}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setShowAssetDetailModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            {assetDetailLoading && (
                                <div className="py-10 text-center">
                                    <div className="w-10 h-10 border-2 border-brand-ink border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm opacity-50">Loading asset record...</p>
                                </div>
                            )}

                            {!assetDetailLoading && assetDetailError && (
                                <div className="mt-8 border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
                                    {assetDetailError}
                                </div>
                            )}

                            {!assetDetailLoading && !assetDetailError && selectedAssetDetail && (
                                <div className="mt-8 space-y-6">
                                    <div className="flex flex-wrap gap-3">
                                        {canManageAssets && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAssetDetailModal(false);
                                                        openEditAssetModal(selectedAssetDetail);
                                                    }}
                                                    className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold"
                                                >
                                                    Edit Asset
                                                </button>
                                            </>
                                        )}
                                        {canOperateAssets && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAssetDetailModal(false);
                                                        setNewOps({
                                                            ...emptyOpsForm,
                                                            assetId: String(selectedAssetDetail.id),
                                                        });
                                                        setShowOpsModal(true);
                                                    }}
                                                    className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold"
                                                >
                                                    Log Production
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAssetDetailModal(false);
                                                        openMaintenanceCreateModal(selectedAssetDetail.id);
                                                    }}
                                                    className="bg-brand-ink text-brand-bg px-4 py-2 text-[10px] uppercase tracking-widest font-bold"
                                                >
                                                    Schedule Maintenance
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailItem label="Owning Company" value={selectedAssetDetail.company_name} />
                                        <DetailItem label="Asset Type" value={selectedAssetDetail.type} />
                                        <DetailItem label="Location" value={selectedAssetDetail.location_coordinates} />
                                        <DetailItem label="Current Status" value={selectedAssetDetail.status} />
                                        <DetailItem
                                            label="Next Maintenance Due"
                                            value={formatDisplayDate(selectedAssetDetail.maintenance_date)}
                                        />
                                        <DetailItem
                                            label="Open Incident Cases"
                                            value={selectedAssetDetail.open_incident_count ?? 0}
                                        />
                                        <DetailItem
                                            label="Last Production Entry"
                                            value={formatDisplayDate(selectedAssetDetail.last_production_date)}
                                        />
                                    </dl>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Production History
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto border border-brand-line/10">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-brand-ink/5">
                                                        <th className="p-4 col-header">Date</th>
                                                        <th className="p-4 col-header">Volume</th>
                                                        <th className="p-4 col-header">Downtime</th>
                                                        <th className="p-4 col-header">Note</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-brand-line/10">
                                                    {selectedAssetDetail.production_history?.map((record) => (
                                                        <tr key={record.id}>
                                                            <td className="p-4 text-xs font-mono">
                                                                {formatDisplayDate(record.report_date)}
                                                            </td>
                                                            <td className="p-4 text-sm font-bold">
                                                                {Number(record.production_volume).toLocaleString()}
                                                            </td>
                                                            <td className="p-4 text-xs">
                                                                {record.downtime_hours}h
                                                            </td>
                                                            <td className="p-4 text-xs opacity-70">
                                                                {record.notes || '--'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!selectedAssetDetail.production_history ||
                                                        selectedAssetDetail.production_history.length === 0) && (
                                                        <tr>
                                                            <td colSpan={4} className="p-8 text-center italic opacity-40">
                                                                No production history has been logged for this asset yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Maintenance History
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto border border-brand-line/10">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-brand-ink/5">
                                                        <th className="p-4 col-header">Type</th>
                                                        <th className="p-4 col-header">Technician</th>
                                                        <th className="p-4 col-header">Date</th>
                                                        <th className="p-4 col-header">Next Due</th>
                                                        <th className="p-4 col-header">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-brand-line/10">
                                                    {selectedAssetDetail.maintenance_history?.map((record) => {
                                                        const tone =
                                                            maintenanceStatusToneClasses[record.status] ||
                                                            maintenanceStatusToneClasses.Scheduled;
                                                        return (
                                                            <tr key={record.id}>
                                                                <td className="p-4 text-xs font-bold">
                                                                    {record.maintenance_type}
                                                                </td>
                                                                <td className="p-4 text-xs opacity-70">
                                                                    {record.technician}
                                                                </td>
                                                                <td className="p-4 text-xs font-mono">
                                                                    {formatDisplayDate(record.maintenance_date)}
                                                                </td>
                                                                <td className="p-4 text-xs font-mono">
                                                                    {formatDisplayDate(record.next_due_date)}
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tone}`}>
                                                                        {record.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!selectedAssetDetail.maintenance_history ||
                                                        selectedAssetDetail.maintenance_history.length === 0) && (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 text-center italic opacity-40">
                                                                No maintenance history has been recorded for this asset yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                                Linked Incident Cases
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto border border-brand-line/10">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-brand-ink/5">
                                                        <th className="p-4 col-header">Incident</th>
                                                        <th className="p-4 col-header">Type</th>
                                                        <th className="p-4 col-header">Severity</th>
                                                        <th className="p-4 col-header">Status</th>
                                                        <th className="p-4 col-header">Reported</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-brand-line/10">
                                                    {selectedAssetDetail.incident_history?.map((record) => {
                                                        const tone =
                                                            incidentStatusToneClasses[record.status] ||
                                                            incidentStatusToneClasses.Open;
                                                        return (
                                                            <tr key={record.id}>
                                                                <td className="p-4 text-xs font-mono">
                                                                    #{record.id.toString().padStart(4, '0')}
                                                                </td>
                                                                <td className="p-4 text-xs font-bold">
                                                                    {record.incident_type}
                                                                </td>
                                                                <td className="p-4 text-xs">
                                                                    {record.severity}
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tone}`}>
                                                                        {record.status}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-xs font-mono">
                                                                    {formatDisplayDateTime(record.reported_date)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!selectedAssetDetail.incident_history ||
                                                        selectedAssetDetail.incident_history.length === 0) && (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 text-center italic opacity-40">
                                                                No incident cases are linked to this asset.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif italic">Field Assets Control</h2>
                        <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                            Asset Registry, Production, Maintenance & Incident Linkage
                        </p>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                        <button
                            onClick={handlePrintOperationsReport}
                            className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                        >
                            Export Logs
                        </button>

                        {canManageAssets && (
                            <button
                                onClick={openCreateAssetModal}
                                className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                            >
                                Register Asset
                            </button>
                        )}
                        {canOperateAssets && (
                            <>
                                <button
                                    onClick={() => setShowOpsModal(true)}
                                    className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                                >
                                    Log Production
                                </button>
                                <button
                                    onClick={() => openMaintenanceCreateModal()}
                                    className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90"
                                >
                                    Schedule Maintenance
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-brand-line/10 border-b border-brand-line/10">
                    {[
                        { label: 'Total Assets', value: totalAssets },
                        { label: 'Operational', value: operationalAssets },
                        { label: 'Under Maintenance', value: assetsUnderMaintenance },
                        { label: 'Linked Open Incidents', value: linkedOpenIncidents },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white p-5">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">{stat.label}</p>
                            <p className="mt-3 text-2xl font-bold data-value">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="px-6 pt-6">
                    <div className="inline-flex flex-wrap gap-2 border border-brand-line/10 p-1 bg-brand-ink/[0.02]">
                        {[
                            { key: 'registry' as const, label: 'Asset Registry' },
                            { key: 'production' as const, label: 'Production & Downtime' },
                            { key: 'maintenance' as const, label: 'Maintenance' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveSection(tab.key)}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                    activeSection === tab.key
                                        ? 'bg-brand-ink text-brand-bg'
                                        : 'text-brand-ink/50 hover:bg-brand-ink/5'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeSection === 'registry' && (
                        <div className="space-y-4">
                            <ModuleFilters
                                searchValue={registrySearchQuery}
                                onSearchChange={setRegistrySearchQuery}
                                searchPlaceholder="Search by asset, company, type, location, or status"
                                selects={[
                                    {
                                        label: 'Status',
                                        value: registryStatusFilter,
                                        options: registryStatusOptions.map((option) => ({ label: option, value: option })),
                                        onChange: setRegistryStatusFilter,
                                    },
                                ]}
                                resultCount={registryRows.length}
                                resultLabel="matching assets"
                            />

                            <div className="overflow-x-auto border border-brand-line/10">
                                <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Asset</th>
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Type</th>
                                        <th className="p-4 col-header">Location</th>
                                        <th className="p-4 col-header">Status</th>
                                        <th className="p-4 col-header">Next Maintenance</th>
                                        <th className="p-4 col-header">Open Incidents</th>
                                        <th className="p-4 col-header">Actions</th>
                                    </tr>
                                </thead>
                                    <tbody className="divide-y divide-brand-line/10">
                                        {registryRows.map((asset) => {
                                        const tone =
                                            assetStatusToneClasses[asset.status] ||
                                            assetStatusToneClasses.Operational;
                                        return (
                                            <tr
                                                key={asset.id}
                                                className="hover:bg-brand-ink/[0.02] transition-colors cursor-pointer"
                                                onClick={() => void openAssetDetailModal(asset)}
                                            >
                                                <td className="p-4">
                                                    <div className="text-sm font-bold">{asset.asset_name}</div>
                                                    <div className="text-[10px] opacity-40 font-mono">
                                                        #{asset.id.toString().padStart(4, '0')}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs">{asset.company_name || 'Unassigned'}</td>
                                                <td className="p-4 text-xs opacity-70">{asset.type}</td>
                                                <td className="p-4 text-xs font-mono opacity-60">
                                                    {asset.location_coordinates}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tone}`}>
                                                        {asset.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs font-mono">
                                                    {formatDisplayDate(asset.maintenance_date)}
                                                </td>
                                                <td className="p-4 text-xs font-bold">
                                                    {asset.open_incident_count ?? 0}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            openEditAssetModal(asset);
                                                        }}
                                                        className="inline-flex items-center gap-1 border border-brand-line/20 px-3 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5"
                                                    >
                                                        <Pencil size={12} />
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                        {registryRows.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="p-10 text-center italic opacity-40">
                                                    {assets.length === 0
                                                        ? 'No asset records have been registered yet.'
                                                        : 'No asset records match the current filters.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === 'production' && (
                        <div className="space-y-4">
                            <ModuleFilters
                                searchValue={productionSearchQuery}
                                onSearchChange={setProductionSearchQuery}
                                searchPlaceholder="Search by asset, company, report note, or production entry"
                                resultCount={productionRows.length}
                                resultLabel="matching production logs"
                            />

                            <div className="overflow-x-auto border border-brand-line/10">
                                <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Asset</th>
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Volume (BBL)</th>
                                        <th className="p-4 col-header">Downtime</th>
                                        <th className="p-4 col-header">Report Date</th>
                                        <th className="p-4 col-header">Note</th>
                                    </tr>
                                </thead>
                                    <tbody className="divide-y divide-brand-line/10">
                                        {productionRows.map((record) => (
                                        <tr key={record.id} className="hover:bg-brand-ink/[0.02] transition-colors">
                                            <td className="p-4 text-sm font-bold">
                                                {record.asset_name || record.field_name}
                                            </td>
                                            <td className="p-4 text-xs">{record.company_name || '--'}</td>
                                            <td className="p-4 text-sm data-value">
                                                {Number(record.production_volume).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-xs">{record.downtime_hours}h</td>
                                            <td className="p-4 text-xs font-mono opacity-60">
                                                {formatDisplayDate(record.report_date)}
                                            </td>
                                            <td className="p-4 text-xs opacity-70">
                                                {record.notes || '--'}
                                            </td>
                                        </tr>
                                    ))}
                                        {productionRows.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-10 text-center italic opacity-40">
                                                    {operations.length === 0
                                                        ? 'No production logs have been submitted yet.'
                                                        : 'No production logs match the current filters.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === 'maintenance' && (
                        <div className="space-y-4">
                            <ModuleFilters
                                searchValue={maintenanceSearchQuery}
                                onSearchChange={setMaintenanceSearchQuery}
                                searchPlaceholder="Search by asset, company, maintenance type, technician, or status"
                                selects={[
                                    {
                                        label: 'Status',
                                        value: maintenanceStatusFilter,
                                        options: maintenanceStatusOptions.map((option) => ({ label: option, value: option })),
                                        onChange: setMaintenanceStatusFilter,
                                    },
                                ]}
                                resultCount={maintenanceRows.length}
                                resultLabel="matching work orders"
                            />

                            <div className="overflow-x-auto border border-brand-line/10">
                                <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Asset</th>
                                        <th className="p-4 col-header">Company</th>
                                        <th className="p-4 col-header">Type</th>
                                        <th className="p-4 col-header">Technician</th>
                                        <th className="p-4 col-header">Cost</th>
                                        <th className="p-4 col-header">Date / Next Due</th>
                                        <th className="p-4 col-header">Status</th>
                                        <th className="p-4 col-header">Actions</th>
                                    </tr>
                                </thead>
                                    <tbody className="divide-y divide-brand-line/10">
                                        {maintenanceRows.map((record) => {
                                        const tone =
                                            maintenanceStatusToneClasses[record.status] ||
                                            maintenanceStatusToneClasses.Scheduled;

                                        return (
                                            <tr key={record.id} className="hover:bg-brand-ink/[0.02] transition-colors">
                                                <td className="p-4">
                                                    <div className="text-sm font-bold">{record.asset_name}</div>
                                                    <div className="text-[10px] opacity-40">{record.description}</div>
                                                </td>
                                                <td className="p-4 text-xs">{record.company_name || '--'}</td>
                                                <td className="p-4 text-xs font-bold">{record.maintenance_type}</td>
                                                <td className="p-4 text-xs opacity-70">{record.technician}</td>
                                                <td className="p-4 text-xs font-mono">
                                                    {formatCurrency(record.cost)}
                                                </td>
                                                <td className="p-4 text-xs font-mono opacity-60">
                                                    {formatDisplayDate(record.maintenance_date)}
                                                    <div className="text-[9px] text-brand-ink font-bold mt-0.5">
                                                        Next: {formatDisplayDate(record.next_due_date)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tone}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        {canOperateAssets && record.status === 'Scheduled' && (
                                                            <button
                                                                type="button"
                                                                disabled={moduleActionLoading}
                                                                onClick={() =>
                                                                    void updateMaintenanceStatus(record, 'In Progress')
                                                                }
                                                                className="inline-flex items-center gap-1 border border-amber-200 text-amber-700 px-3 py-2 text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                                                            >
                                                                <Wrench size={12} />
                                                                Start
                                                            </button>
                                                        )}
                                                        {canOperateAssets && record.status === 'In Progress' && (
                                                            <button
                                                                type="button"
                                                                disabled={moduleActionLoading}
                                                                onClick={() =>
                                                                    void updateMaintenanceStatus(record, 'Completed')
                                                                }
                                                                className="inline-flex items-center gap-1 border border-emerald-200 text-emerald-700 px-3 py-2 text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
                                                            >
                                                                Complete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                        {maintenanceRows.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="p-10 text-center italic opacity-40">
                                                    {maintenance.length === 0
                                                        ? 'No maintenance work orders have been recorded yet.'
                                                        : 'No maintenance work orders match the current filters.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
