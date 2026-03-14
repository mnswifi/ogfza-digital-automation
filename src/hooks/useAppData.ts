import { useCallback, useState } from 'react';
import { Stats } from 'motion/react';
import {
    User,
    Company,
    CompanyApplication,
    Permit,
    Operation,
    Revenue,
    ComplianceAudit,
    Asset,
    Incident,
    Employee,
    AttendanceRecord,
    Certification,
    Shift,
    HRStats,
    Contractor,
    ContractorDocument,
    WorkOrder,
    MaintenanceRecord,
    TeamMember,
} from '@/middleware/types.middleware';

type UseAppDataParams = {
    token: string | null;
    user: User | null;
    onAuthFail: () => void;
};

export function useAppData({ token, user, onAuthFail }: UseAppDataParams) {
    const [stats, setStats] = useState<Stats<any> | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyApplications, setCompanyApplications] = useState<CompanyApplication[]>([]);
    const [permits, setPermits] = useState<Permit[]>([]);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [revenue, setRevenue] = useState<Revenue[]>([]);
    const [compliance, setCompliance] = useState<ComplianceAudit[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [hrStats, setHrStats] = useState<HRStats | null>(null);

    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [contractorDocs, setContractorDocs] = useState<ContractorDocument[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!token) return;

        setLoading(true);

        try {
            const headers = { Authorization: `Bearer ${token}` };
            const canAccessCompanyApplications =
                Boolean(user?.role?.includes('Admin')) ||
                Boolean(user?.role?.includes('Compliance')) ||
                Boolean(user?.role?.includes('Contractor'));

            const [s, c, companyApps, p, o, r, comp, a, inc, emp, att, certs, shf, hrs, usersData] = await Promise.all([
                fetch('/api/dashboard/stats', { headers }).then((res) => res.json()),
                fetch('/api/companies', { headers }).then((res) => res.json()),
                canAccessCompanyApplications
                    ? fetch('/api/company-applications', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
                fetch('/api/permits', { headers }).then((res) => res.json()),
                fetch('/api/operations', { headers }).then((res) => res.json()),
                fetch('/api/revenue', { headers }).then((res) => res.json()),
                fetch('/api/compliance', { headers }).then((res) => res.json()),
                fetch('/api/assets', { headers }).then((res) => res.json()),
                fetch('/api/incidents', { headers }).then((res) => res.json()),
                fetch('/api/hr/employees', { headers }).then((res) => res.json()),
                fetch('/api/hr/attendance', { headers }).then((res) => res.json()),
                fetch('/api/hr/certifications', { headers }).then((res) => res.json()),
                fetch('/api/hr/shifts', { headers }).then((res) => res.json()),
                fetch('/api/hr/stats', { headers }).then((res) => res.json()),
                user?.role?.includes('Admin')
                    ? fetch('/api/users', { headers }).then((res) => res.json())
                    : Promise.resolve([]),
            ]);

            setStats(s);
            setCompanies(c);
            setCompanyApplications(companyApps);
            setPermits(p);
            setOperations(o);
            setRevenue(r);
            setCompliance(comp);
            setAssets(a);
            setIncidents(inc);
            setEmployees(emp);
            setAttendance(att);
            setCertifications(certs);
            setShifts(shf);
            setHrStats(hrs);
            setAllUsers(usersData || []);

            const [cont, contDocs, wo, maint, team] = await Promise.all([
                fetch('/api/contractors', { headers }).then((res) => res.json()),
                fetch('/api/contractors/documents', { headers }).then((res) => res.json()),
                fetch('/api/work-orders', { headers }).then((res) => res.json()),
                fetch('/api/maintenance', { headers }).then((res) => res.json()),
                fetch('/api/change-management/team', { headers }).then((res) => res.json()),
            ]);

            setContractors(cont);
            setContractorDocs(contDocs);
            setWorkOrders(wo);
            setMaintenance(maint);
            setTeamMembers(team);
        } catch (error) {
            console.error('Failed to fetch data', error);
            onAuthFail();
        } finally {
            setLoading(false);
        }
    }, [token, user, onAuthFail]);

    return {
        stats,
        companies,
        companyApplications,
        permits,
        operations,
        revenue,
        compliance,
        assets,
        incidents,
        employees,
        attendance,
        certifications,
        shifts,
        hrStats,
        contractors,
        contractorDocs,
        workOrders,
        maintenance,
        teamMembers,
        allUsers,
        loading,
        fetchData,
    };
}
