import { mergeCompanyApplicationDocuments } from '@/src/constants/companyApplication';
import { mergeTradeOperationDocuments } from '@/src/constants/tradeOperations';

export const createInitialCompanyApplicationForm = () => ({
    companyName: '',
    incorporationType: '',
    freeZoneLocation: '',
    requestedLicenseType: '',
    globalHeadOfficeAddress: '',
    globalPhone1: '',
    globalEmail: '',
    globalPhone2: '',
    globalWebsite: '',
    nigeriaOfficeAddress: '',
    nigeriaPhone1: '',
    nigeriaEmail: '',
    nigeriaPhone2: '',
    nigeriaWebsite: '',
    primaryContactName: '',
    primaryContactDesignation: '',
    primaryContactPhone: '',
    primaryContactEmail: '',
    secondaryContactName: '',
    secondaryContactDesignation: '',
    secondaryContactPhone: '',
    secondaryContactEmail: '',
    presentBusinessOperations: '',
    dprRegistrationNumber: '',
    activityDescription: '',
    countriesOfOperationWestAfrica: '',
    proposedBusinessActivity: '',
    undevelopedLandSqm: '',
    developedLandSqm: '',
    concreteStackingAreaSqm: '',
    warehouseSpaceSqm: '',
    factoryPremisesSqm: '',
    officeAccommodationSqm: '',
    equipmentRequirement: '',
    residentialAccommodationPersonnelCount: '',
    importsSummary: '',
    exportsSummary: '',
    proposedCommencementDate: '',
    declarationName: '',
    declarationDesignation: '',
    declarationSignatureDate: '',
    documents: mergeCompanyApplicationDocuments(),
});

export const createInitialTradeOperationForm = () => ({
    companyId: '',
    serviceType: '',
    requestSummary: '',
    requestedCompletionDate: '',
    documents: mergeTradeOperationDocuments(),
});

export const createInitialIncidentForm = () => ({
    companyId: '',
    assetId: '',
    incident_type: 'HSE',
    severity: 'Medium',
    description: '',
});

export const createInitialEmployeeForm = () => ({
    full_name: '',
    department: 'HSE',
    position: '',
    zone: 'Zone A',
    email: '',
    phone: '',
    company: '',
});

export const createInitialAttendanceForm = () => ({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    shift: 'Morning Alpha',
    check_in: '',
    check_out: '',
    status: 'Present',
});

export const createInitialCertificationForm = () => ({
    employee_id: '',
    cert_name: '',
    issued_date: '',
    expiry_date: '',
});

export const createInitialOpsForm = () => ({
    assetId: '',
    production_volume: '',
    downtime_hours: '',
    report_date: '',
    notes: '',
});
