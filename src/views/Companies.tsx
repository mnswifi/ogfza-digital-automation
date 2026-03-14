import React from 'react';
import { X } from 'lucide-react';
import { Company, CompanyApplication, User } from '@/middleware/types.middleware';
import {
    activityDescriptionOptions,
    freeZoneLocationOptions,
    incorporationTypeOptions,
} from '@/src/constants/companyApplication';
import type { CompanyApplicationForm } from '@/src/types/appFormTypes';

type NewCompanyForm = CompanyApplicationForm;

type CompaniesProps = {
    user: User;
    companies: Company[];
    companyApplications: CompanyApplication[];
    showRegModal: boolean;
    setShowRegModal: (value: boolean) => void;
    newCompany: NewCompanyForm;
    setNewCompany: (value: NewCompanyForm) => void;
    actionLoading: boolean;
    onRegisterCompany: (e: React.FormEvent) => void;
    onReviewApplication: (
        applicationId: number,
        decision: 'Approved' | 'Rejected',
        rejectionReason?: string
    ) => void;
};

export default function Companies({
    user,
    companies,
    companyApplications,
    showRegModal,
    setShowRegModal,
    newCompany,
    setNewCompany,
    actionLoading,
    onRegisterCompany,
    onReviewApplication,
}: CompaniesProps) {
    const roles = user.role.split(',').map((role) => role.trim());
    const canRegisterCompanies = roles.includes('Contractor');
    const isAdminReviewer = roles.includes('Admin');
    const isComplianceReviewer = roles.includes('Compliance') && !isAdminReviewer;
    const canReviewApplications = isAdminReviewer || isComplianceReviewer;
    const updateCompanyField = <K extends keyof NewCompanyForm>(field: K, value: NewCompanyForm[K]) => {
        setNewCompany({ ...newCompany, [field]: value });
    };
    const handleRejectApplication = (applicationId: number) => {
        const rejectionReason = window.prompt('Optional rejection reason');

        if (rejectionReason === null) return;

        onReviewApplication(applicationId, 'Rejected', rejectionReason);
    };

    return (
        <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showRegModal && (
                <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-brand-line/10">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-serif italic text-brand-ink">
                                    Free Zone Registration Application
                                </h2>
                                <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">
                                    Contractor Submission / OGFZA Application Intake
                                </p>
                            </div>
                            <button onClick={() => setShowRegModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={onRegisterCompany} className="space-y-8">
                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Application Basics
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="col-header">Company Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newCompany.companyName}
                                            onChange={(e) => updateCompanyField('companyName', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Incorporation Type</label>
                                        <select
                                            required
                                            value={newCompany.incorporationType}
                                            onChange={(e) => updateCompanyField('incorporationType', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option value="">Select incorporation type</option>
                                            {incorporationTypeOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1 md:col-span-2">
                                        <label className="col-header">Free Zone Location</label>
                                        <select
                                            required
                                            value={newCompany.freeZoneLocation}
                                            onChange={(e) => updateCompanyField('freeZoneLocation', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option value="">Select free zone location</option>
                                            {freeZoneLocationOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">D.P.R Registration No.</label>
                                        <input
                                            type="text"
                                            value={newCompany.dprRegistrationNumber}
                                            onChange={(e) => updateCompanyField('dprRegistrationNumber', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Description of Activity</label>
                                        <select
                                            value={newCompany.activityDescription}
                                            onChange={(e) => updateCompanyField('activityDescription', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        >
                                            <option value="">Select activity description</option>
                                            {activityDescriptionOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Proposed Commencement Date</label>
                                        <input
                                            type="date"
                                            value={newCompany.proposedCommencementDate}
                                            onChange={(e) => updateCompanyField('proposedCommencementDate', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Office Details
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Global Head Office Address</label>
                                        <textarea
                                            required
                                            value={newCompany.globalHeadOfficeAddress}
                                            onChange={(e) => updateCompanyField('globalHeadOfficeAddress', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Office Address in Nigeria</label>
                                        <textarea
                                            required
                                            value={newCompany.nigeriaOfficeAddress}
                                            onChange={(e) => updateCompanyField('nigeriaOfficeAddress', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                                        <div className="space-y-1">
                                            <label className="col-header">Global Telephone 1</label>
                                            <input
                                                type="tel"
                                                value={newCompany.globalPhone1}
                                                onChange={(e) => updateCompanyField('globalPhone1', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Global Telephone 2</label>
                                            <input
                                                type="tel"
                                                value={newCompany.globalPhone2}
                                                onChange={(e) => updateCompanyField('globalPhone2', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Global Email</label>
                                            <input
                                                type="email"
                                                value={newCompany.globalEmail}
                                                onChange={(e) => updateCompanyField('globalEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Global Website</label>
                                            <input
                                                type="url"
                                                value={newCompany.globalWebsite}
                                                onChange={(e) => updateCompanyField('globalWebsite', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Telephone 1</label>
                                            <input
                                                type="tel"
                                                value={newCompany.nigeriaPhone1}
                                                onChange={(e) => updateCompanyField('nigeriaPhone1', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Telephone 2</label>
                                            <input
                                                type="tel"
                                                value={newCompany.nigeriaPhone2}
                                                onChange={(e) => updateCompanyField('nigeriaPhone2', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Email</label>
                                            <input
                                                type="email"
                                                value={newCompany.nigeriaEmail}
                                                onChange={(e) => updateCompanyField('nigeriaEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Nigeria Website</label>
                                            <input
                                                type="url"
                                                value={newCompany.nigeriaWebsite}
                                                onChange={(e) => updateCompanyField('nigeriaWebsite', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Contact Information
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <p className="text-[10px] uppercase tracking-widest opacity-40">Primary Contact</p>
                                        <div className="space-y-1">
                                            <label className="col-header">Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={newCompany.primaryContactName}
                                                onChange={(e) => updateCompanyField('primaryContactName', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Designation</label>
                                            <input
                                                type="text"
                                                value={newCompany.primaryContactDesignation}
                                                onChange={(e) => updateCompanyField('primaryContactDesignation', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Telephone</label>
                                            <input
                                                type="tel"
                                                value={newCompany.primaryContactPhone}
                                                onChange={(e) => updateCompanyField('primaryContactPhone', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Email</label>
                                            <input
                                                type="email"
                                                required
                                                value={newCompany.primaryContactEmail}
                                                onChange={(e) => updateCompanyField('primaryContactEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] uppercase tracking-widest opacity-40">Secondary Contact</p>
                                        <div className="space-y-1">
                                            <label className="col-header">Name</label>
                                            <input
                                                type="text"
                                                value={newCompany.secondaryContactName}
                                                onChange={(e) => updateCompanyField('secondaryContactName', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Designation</label>
                                            <input
                                                type="text"
                                                value={newCompany.secondaryContactDesignation}
                                                onChange={(e) => updateCompanyField('secondaryContactDesignation', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Telephone</label>
                                            <input
                                                type="tel"
                                                value={newCompany.secondaryContactPhone}
                                                onChange={(e) => updateCompanyField('secondaryContactPhone', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="col-header">Email</label>
                                            <input
                                                type="email"
                                                value={newCompany.secondaryContactEmail}
                                                onChange={(e) => updateCompanyField('secondaryContactEmail', e.target.value)}
                                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Operations and Proposal
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Present Business Operations</label>
                                        <textarea
                                            value={newCompany.presentBusinessOperations}
                                            onChange={(e) => updateCompanyField('presentBusinessOperations', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="col-header">Countries of Operation in West Africa</label>
                                        <textarea
                                            value={newCompany.countriesOfOperationWestAfrica}
                                            onChange={(e) => updateCompanyField('countriesOfOperationWestAfrica', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-28 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                            placeholder="Separate countries with commas"
                                        />
                                    </div>

                                    <div className="space-y-1 md:col-span-2">
                                        <label className="col-header">Proposed Business Activity in the Free Zone</label>
                                        <textarea
                                            required
                                            value={newCompany.proposedBusinessActivity}
                                            onChange={(e) => updateCompanyField('proposedBusinessActivity', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-32 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Required Facilities and Cargo
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Undeveloped Land (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.undevelopedLandSqm}
                                            onChange={(e) => updateCompanyField('undevelopedLandSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Developed Land (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.developedLandSqm}
                                            onChange={(e) => updateCompanyField('developedLandSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Concrete Stacking Area (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.concreteStackingAreaSqm}
                                            onChange={(e) => updateCompanyField('concreteStackingAreaSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Warehouse Space (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.warehouseSpaceSqm}
                                            onChange={(e) => updateCompanyField('warehouseSpaceSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Factory Premises (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.factoryPremisesSqm}
                                            onChange={(e) => updateCompanyField('factoryPremisesSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Office Accommodation (m2)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newCompany.officeAccommodationSqm}
                                            onChange={(e) => updateCompanyField('officeAccommodationSqm', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="col-header">Equipment Requirement</label>
                                        <textarea
                                            value={newCompany.equipmentRequirement}
                                            onChange={(e) => updateCompanyField('equipmentRequirement', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Residential Accommodation Personnel</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={newCompany.residentialAccommodationPersonnelCount}
                                            onChange={(e) => updateCompanyField('residentialAccommodationPersonnelCount', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="col-header">Estimate of Imports</label>
                                        <textarea
                                            value={newCompany.importsSummary}
                                            onChange={(e) => updateCompanyField('importsSummary', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                            placeholder="Summarize cargo type, tonnage, containers, and value."
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="col-header">Estimate of Exports</label>
                                        <textarea
                                            value={newCompany.exportsSummary}
                                            onChange={(e) => updateCompanyField('exportsSummary', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none"
                                            placeholder="Summarize cargo type, tonnage, containers, and value."
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">
                                        Declaration
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="col-header">Name</label>
                                        <input
                                            type="text"
                                            value={newCompany.declarationName}
                                            onChange={(e) => updateCompanyField('declarationName', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Designation</label>
                                        <input
                                            type="text"
                                            value={newCompany.declarationDesignation}
                                            onChange={(e) => updateCompanyField('declarationDesignation', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="col-header">Signature Date</label>
                                        <input
                                            type="date"
                                            value={newCompany.declarationSignatureDate}
                                            onChange={(e) => updateCompanyField('declarationSignatureDate', e.target.value)}
                                            className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <button
                                disabled={actionLoading}
                                className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs"
                            >
                                {actionLoading ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-serif italic">Company Directory</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                        Approved OGFZA Registered Entities
                    </p>
                    {canRegisterCompanies && (
                        <p className="text-[11px] opacity-60 mt-2 max-w-xl">
                            Contractors submit free zone applications here. Approved applications appear in this directory after internal review.
                        </p>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors"
                    >
                        Export Registry Report
                    </button>
                    {canRegisterCompanies && (
                        <button
                            onClick={() => setShowRegModal(true)}
                            className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                            Submit New Application
                        </button>
                    )}
                </div>
            </div>

            <table className="w-full text-left">
                <thead>
                    <tr className="bg-brand-ink/5">
                        <th className="p-4 col-header">Company Name</th>
                        <th className="p-4 col-header">License No.</th>
                        <th className="p-4 col-header">Incorporation</th>
                        <th className="p-4 col-header">Free Zone</th>
                        <th className="p-4 col-header">Status</th>
                        <th className="p-4 col-header">Approved</th>
                    </tr>
                </thead>
                <tbody>
                    {companies.map((c) => (
                        <tr key={c.id} className="data-row">
                            <td className="p-4 text-sm font-bold">{c.name}</td>
                            <td className="p-4 data-value text-sm">{c.license_no || '--'}</td>
                            <td className="p-4 text-xs opacity-80">{c.incorporation_type || '--'}</td>
                            <td className="p-4 text-xs opacity-60">{c.free_zone_location || '--'}</td>
                            <td className="p-4">
                                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                                    {c.status}
                                </span>
                            </td>
                            <td className="p-4 data-value text-xs opacity-60">{c.approved_date || '--'}</td>
                        </tr>
                    ))}
                    {companies.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center italic opacity-40">
                                No approved companies available yet.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="border-t border-brand-line/10">
                <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif italic">
                            {canReviewApplications ? 'Company Applications Queue' : 'My Company Applications'}
                        </h2>
                        <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                            {canReviewApplications
                                ? 'Pending and processed submissions for review'
                                : 'Track the status of your submitted applications'}
                        </p>
                    </div>

                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                        {companyApplications.length} Total
                    </span>
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-brand-ink/5">
                            <th className="p-4 col-header">Reference</th>
                            <th className="p-4 col-header">Company</th>
                            <th className="p-4 col-header">Incorporation</th>
                            <th className="p-4 col-header">Free Zone</th>
                            <th className="p-4 col-header">Submitted</th>
                            <th className="p-4 col-header">Status</th>
                            {canReviewApplications && <th className="p-4 col-header">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {companyApplications.map((application) => {
                            const displayStatus =
                                application.linked_company_id && application.status !== 'Rejected'
                                    ? 'Approved'
                                    : application.status;
                            const canActOnApplication =
                                !application.linked_company_id &&
                                (
                                    (isComplianceReviewer &&
                                        (application.status === 'Submitted' || application.status === 'Under Review')) ||
                                    (isAdminReviewer && application.status === 'Awaiting Admin Approval')
                                );
                            const approveLabel = isComplianceReviewer ? 'Forward to Admin' : 'Final Approve';
                            const rejectLabel = isComplianceReviewer ? 'Reject' : 'Final Reject';

                            return (
                                <tr key={application.id} className="data-row">
                                    <td className="p-4 text-xs font-mono">{application.application_reference}</td>
                                    <td className="p-4">
                                        <div className="text-sm font-bold">{application.company_name}</div>
                                        {application.primary_contact_email && (
                                            <div className="text-[10px] opacity-50">{application.primary_contact_email}</div>
                                        )}
                                    </td>
                                    <td className="p-4 text-xs opacity-80">{application.incorporation_type}</td>
                                    <td className="p-4 text-xs opacity-60">{application.free_zone_location}</td>
                                    <td className="p-4 data-value text-xs opacity-60">
                                        {application.submitted_at
                                            ? new Date(application.submitted_at).toLocaleDateString()
                                            : '--'}
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${
                                                displayStatus === 'Approved'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : displayStatus === 'Rejected'
                                                        ? 'bg-rose-50 text-rose-700'
                                                        : 'bg-amber-50 text-amber-700'
                                            }`}
                                        >
                                            {displayStatus}
                                        </span>
                                        {application.rejection_reason && (
                                            <div className="text-[10px] opacity-50 mt-2 max-w-xs">
                                                Reason: {application.rejection_reason}
                                            </div>
                                        )}
                                    </td>
                                    {canReviewApplications && (
                                        <td className="p-4">
                                            {canActOnApplication ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={actionLoading}
                                                        onClick={() => onReviewApplication(application.id, 'Approved')}
                                                        className="bg-emerald-600 text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        {approveLabel}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={actionLoading}
                                                        onClick={() => handleRejectApplication(application.id)}
                                                        className="border border-rose-200 text-rose-700 px-3 py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        {rejectLabel}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] uppercase tracking-widest opacity-30">
                                                    No action
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {companyApplications.length === 0 && (
                            <tr>
                                <td colSpan={canReviewApplications ? 7 : 6} className="p-8 text-center italic opacity-40">
                                    No company applications available yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
