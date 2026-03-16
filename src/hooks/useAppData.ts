import { useCallback, useState } from 'react';
import { Stats } from 'motion/react';
import {
    User,
    Company,
    CompanyApplication,
    TradeOperationRequest,
    Operation,
    Revenue,
    ComplianceCase,
    Asset,
    Incident,
    Employee,
    AttendanceRecord,
    Certification,
    Shift,
    HRStats,
    Contractor,
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
    const [tradeOperations, setTradeOperations] = useState<TradeOperationRequest[]>([]);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [revenue, setRevenue] = useState<Revenue[]>([]);
    const [compliance, setCompliance] = useState<ComplianceCase[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [hrStats, setHrStats] = useState<HRStats | null>(null);

    const [contractors, setContractors] = useState<Contractor[]>([]);
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
            const canAccessTradeOperations =
                Boolean(user?.role?.includes('Admin')) ||
                Boolean(user?.role?.includes('Compliance')) ||
                Boolean(user?.role?.includes('Operations')) ||
                Boolean(user?.role?.includes('Contractor'));
            const canAccessComplianceWorkflow =
                Boolean(user?.role?.includes('Admin')) ||
                Boolean(user?.role?.includes('Compliance')) ||
                Boolean(user?.role?.includes('Contractor'));
            const canAccessIncidentWorkflow =
                Boolean(user?.role?.includes('Admin')) ||
                Boolean(user?.role?.includes('Compliance')) ||
                Boolean(user?.role?.includes('Contractor'));
            const canAccessAssetDirectory =
                Boolean(user?.role?.includes('Admin')) ||
                Boolean(user?.role?.includes('Operations')) ||
                Boolean(user?.role?.includes('Compliance'));
            const canAccessOperationsControl =
                Boolean(user?.role?.includes('Admin')) ||
                Boolean(user?.role?.includes('Operations'));

            const [s, c, companyApps, tradeOps, o, r, comp, a, inc, emp, att, certs, shf, hrs, usersData] = await Promise.all([
                fetch('/api/dashboard/stats', { headers }).then((res) => res.json()),
                fetch('/api/companies', { headers }).then((res) => res.json()),
                canAccessCompanyApplications
                    ? fetch('/api/company-applications', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
                canAccessTradeOperations
                    ? fetch('/api/trade-operations', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
                canAccessOperationsControl
                    ? fetch('/api/operations', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
                fetch('/api/revenue', { headers }).then((res) => res.json()),
                canAccessComplianceWorkflow
                    ? fetch('/api/compliance', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
                canAccessAssetDirectory
                    ? fetch('/api/assets', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
                canAccessIncidentWorkflow
                    ? fetch('/api/incidents', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
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
            setTradeOperations(tradeOps);
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

            const [cont, maint, team] = await Promise.all([
                fetch('/api/contractors', { headers }).then((res) => res.json()),
                canAccessOperationsControl
                    ? fetch('/api/maintenance', { headers }).then((res) =>
                        res.ok ? res.json() : []
                    )
                    : Promise.resolve([]),
                fetch('/api/change-management/team', { headers }).then((res) => res.json()),
            ]);

            setContractors(cont);
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
        tradeOperations,
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
        maintenance,
        teamMembers,
        allUsers,
        loading,
        fetchData,
    };
}
