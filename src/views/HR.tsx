import React from 'react';
import { Activity, Clock, FileText, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import {
    AttendanceRecord,
    Certification,
    Employee,
    HRStats,
    Incident,
    Shift,
} from '@/middleware/types.middleware';

type HrTab = 'employees' | 'attendance' | 'certs' | 'shifts' | 'safety';

type NewEmpForm = {
    full_name: string;
    department: string;
    position: string;
    zone: string;
    email: string;
    phone: string;
    company: string;
};

type NewAttForm = {
    employee_id: string;
    date: string;
    shift: string;
    check_in: string;
    check_out: string;
    status: string;
};

type NewCertForm = {
    employee_id: string;
    cert_name: string;
    issued_date: string;
    expiry_date: string;
};

type HRProps = {
    hrStats: HRStats | null;
    shifts: Shift[];
    employees: Employee[];
    attendance: AttendanceRecord[];
    certifications: Certification[];
    incidents: Incident[];
    hrTab: HrTab;
    setHrTab: (value: HrTab) => void;

    showAddEmpModal: boolean;
    setShowAddEmpModal: (value: boolean) => void;
    newEmp: NewEmpForm;
    setNewEmp: (value: NewEmpForm) => void;

    showLogAttModal: boolean;
    setShowLogAttModal: (value: boolean) => void;
    newAtt: NewAttForm;
    setNewAtt: (value: NewAttForm) => void;

    showLogCertModal: boolean;
    setShowLogCertModal: (value: boolean) => void;
    newCert: NewCertForm;
    setNewCert: (value: NewCertForm) => void;

    actionLoading: boolean;
    onAddEmployee: (e: React.FormEvent) => void;
    onLogAttendance: (e: React.FormEvent) => void;
    onLogCert: (e: React.FormEvent) => void;
};

export default function HRView({
    hrStats,
    shifts,
    employees,
    attendance,
    certifications,
    incidents,
    hrTab,
    setHrTab,
    showAddEmpModal,
    setShowAddEmpModal,
    newEmp,
    setNewEmp,
    showLogAttModal,
    setShowLogAttModal,
    newAtt,
    setNewAtt,
    showLogCertModal,
    setShowLogCertModal,
    newCert,
    setNewCert,
    actionLoading,
    onAddEmployee,
    onLogAttendance,
    onLogCert,
}: HRProps) {
    return (
        <div className="space-y-6 relative">
            {showAddEmpModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-4">Register Personnel</h3>
                        <form onSubmit={onAddEmployee} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Full Name"
                                required
                                value={newEmp.full_name}
                                onChange={(e) => setNewEmp({ ...newEmp, full_name: e.target.value })}
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={newEmp.department}
                                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option>HSE</option>
                                    <option>Operations</option>
                                    <option>Maintenance</option>
                                    <option>HR</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Position"
                                    required
                                    value={newEmp.position}
                                    onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={newEmp.zone}
                                    onChange={(e) => setNewEmp({ ...newEmp, zone: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    <option>Zone A</option>
                                    <option>Zone B</option>
                                    <option>Zone C</option>
                                    <option>HQ</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Company"
                                    required
                                    value={newEmp.company}
                                    onChange={(e) => setNewEmp({ ...newEmp, company: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                />
                            </div>

                            <input
                                type="email"
                                placeholder="Email"
                                required
                                value={newEmp.email}
                                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            />

                            <input
                                type="tel"
                                placeholder="Phone"
                                required
                                value={newEmp.phone}
                                onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            />

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddEmpModal(false)}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showLogAttModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-4">Log Attendance</h3>
                        <form onSubmit={onLogAttendance} className="space-y-4">
                            <select
                                required
                                value={newAtt.employee_id}
                                onChange={(e) => setNewAtt({ ...newAtt, employee_id: e.target.value })}
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            >
                                <option value="">-- Select Personnel --</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.full_name}
                                    </option>
                                ))}
                            </select>

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="date"
                                    required
                                    value={newAtt.date}
                                    onChange={(e) => setNewAtt({ ...newAtt, date: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                />

                                <select
                                    required
                                    value={newAtt.shift}
                                    onChange={(e) => setNewAtt({ ...newAtt, shift: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                >
                                    {shifts.map((s) => (
                                        <option key={s.id} value={s.shift_name}>
                                            {s.shift_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="time"
                                    placeholder="Check In"
                                    value={newAtt.check_in}
                                    onChange={(e) => setNewAtt({ ...newAtt, check_in: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                />
                                <input
                                    type="time"
                                    placeholder="Check Out"
                                    value={newAtt.check_out}
                                    onChange={(e) => setNewAtt({ ...newAtt, check_out: e.target.value })}
                                    className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                />
                            </div>

                            <select
                                value={newAtt.status}
                                onChange={(e) => setNewAtt({ ...newAtt, status: e.target.value })}
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            >
                                <option>Present</option>
                                <option>Absent</option>
                                <option>On Leave</option>
                            </select>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowLogAttModal(false)}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Save Log
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showLogCertModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20"
                    >
                        <h3 className="font-serif italic text-lg mb-4">Log Certification</h3>
                        <form onSubmit={onLogCert} className="space-y-4">
                            <select
                                required
                                value={newCert.employee_id}
                                onChange={(e) => setNewCert({ ...newCert, employee_id: e.target.value })}
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            >
                                <option value="">-- Select Personnel --</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.full_name}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Certification Name (e.g. HSE Level 2)"
                                required
                                value={newCert.cert_name}
                                onChange={(e) => setNewCert({ ...newCert, cert_name: e.target.value })}
                                className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold opacity-50">Issued Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={newCert.issued_date}
                                        onChange={(e) => setNewCert({ ...newCert, issued_date: e.target.value })}
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold opacity-50">Expiry Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={newCert.expiry_date}
                                        onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                                        className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowLogCertModal(false)}
                                    className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Save Cert
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm relative text-center">
                <h2 className="text-2xl font-serif italic">HR & Workforce Digitization</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">
                    Field Attendance • Deployments • Certifications
                </p>
                <button
                    onClick={() => window.print()}
                    className="absolute top-8 right-8 border border-white/20 hover:bg-white/10 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors"
                >
                    Export Dept Report
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-brand-ink transition-colors"
                    onClick={() => setHrTab('employees')}
                >
                    <div className="flex justify-center mb-3 text-brand-ink opacity-70">
                        <UserIcon size={24} />
                    </div>
                    <p className="text-2xl font-bold font-mono">{hrStats?.totalEmployees.count || 0}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Active Personnel</p>
                </div>

                <div
                    className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-emerald-500 transition-colors"
                    onClick={() => setHrTab('attendance')}
                >
                    <div className="flex justify-center mb-3 text-emerald-600 opacity-70">
                        <Activity size={24} />
                    </div>
                    <p className="text-2xl font-bold font-mono text-emerald-600">
                        {hrStats?.presentToday.count || 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Present on Shift</p>
                </div>

                <div
                    className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-amber-500 transition-colors"
                    onClick={() => setHrTab('certs')}
                >
                    <div className="flex justify-center mb-3 text-amber-600 opacity-70">
                        <FileText size={24} />
                    </div>
                    <p className="text-2xl font-bold font-mono text-amber-600">
                        {hrStats?.expiredCerts.count || 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Expired Certs</p>
                </div>

                <div
                    className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-brand-ink transition-colors"
                    onClick={() => setHrTab('shifts')}
                >
                    <div className="flex justify-center mb-3 text-brand-ink opacity-70">
                        <Clock size={24} />
                    </div>
                    <p className="text-2xl font-bold font-mono">{shifts.length}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Active Shifts</p>
                </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="flex border-b border-brand-line/10 text-xs font-bold uppercase tracking-widest">
                    <button
                        onClick={() => setHrTab('employees')}
                        className={`p-4 flex-1 transition-colors ${hrTab === 'employees' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'
                            }`}
                    >
                        Personnel Registry
                    </button>
                    <button
                        onClick={() => setHrTab('attendance')}
                        className={`p-4 flex-1 transition-colors ${hrTab === 'attendance' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'
                            }`}
                    >
                        Field Attendance Tracking
                    </button>
                    <button
                        onClick={() => setHrTab('shifts')}
                        className={`p-4 flex-1 transition-colors ${hrTab === 'shifts' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'
                            }`}
                    >
                        Workforce Deployment Visibility
                    </button>
                    <button
                        onClick={() => setHrTab('certs')}
                        className={`p-4 flex-1 transition-colors ${hrTab === 'certs' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'
                            }`}
                    >
                        Certification & Training
                    </button>
                    <button
                        onClick={() => setHrTab('safety')}
                        className={`p-4 flex-1 transition-colors ${hrTab === 'safety' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'
                            }`}
                    >
                        Safety Compliance
                    </button>
                </div>

                <div className="p-0">
                    {hrTab === 'employees' && (
                        <div>
                            <div className="p-4 border-b border-brand-line/5 flex justify-end">
                                <button
                                    onClick={() => setShowAddEmpModal(true)}
                                    className="bg-brand-ink text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                                >
                                    + Add Personnel
                                </button>
                            </div>

                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Name</th>
                                        <th className="p-4 col-header">Position</th>
                                        <th className="p-4 col-header">Zone</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((e) => (
                                        <tr key={e.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">
                                                {e.full_name}
                                                <br />
                                                <span className="text-[10px] font-mono opacity-50">{e.company}</span>
                                            </td>
                                            <td className="p-4 text-xs">{e.position}</td>
                                            <td className="p-4 text-xs">{e.zone}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${e.status === 'Active'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-amber-50 text-amber-700'
                                                        }`}
                                                >
                                                    {e.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {hrTab === 'attendance' && (
                        <div>
                            <div className="p-4 border-b border-brand-line/5 flex justify-end">
                                <button
                                    onClick={() => setShowLogAttModal(true)}
                                    className="bg-emerald-600 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                                >
                                    + Log Attendance
                                </button>
                            </div>

                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Date</th>
                                        <th className="p-4 col-header">Personnel</th>
                                        <th className="p-4 col-header">Shift</th>
                                        <th className="p-4 col-header">Log Times</th>
                                        <th className="p-4 col-header">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.map((a) => (
                                        <tr key={a.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-xs font-mono">{a.date}</td>
                                            <td className="p-4 text-sm font-bold">
                                                {a.full_name}
                                                <br />
                                                <span className="text-[10px] opacity-50">{a.zone}</span>
                                            </td>
                                            <td className="p-4 text-xs">{a.shift}</td>
                                            <td className="p-4 text-xs font-mono opacity-60">
                                                {a.check_in || '--:--'} - {a.check_out || '--:--'}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${a.status === 'Present'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : a.status === 'Absent'
                                                                ? 'bg-red-50 text-red-700'
                                                                : 'bg-amber-50 text-amber-700'
                                                        }`}
                                                >
                                                    {a.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {hrTab === 'certs' && (
                        <div>
                            <div className="p-4 border-b border-brand-line/5 flex justify-end">
                                <button
                                    onClick={() => setShowLogCertModal(true)}
                                    className="bg-brand-ink text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                                >
                                    + Log Cert
                                </button>
                            </div>

                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-ink/5">
                                        <th className="p-4 col-header">Personnel</th>
                                        <th className="p-4 col-header">Certification</th>
                                        <th className="p-4 col-header">Expiry Date</th>
                                        <th className="p-4 col-header">Validity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {certifications.map((c) => (
                                        <tr key={c.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-sm font-bold">
                                                {c.full_name}
                                                <br />
                                                <span className="text-[10px] opacity-50">{c.company}</span>
                                            </td>
                                            <td className="p-4 text-xs font-bold">{c.cert_name}</td>
                                            <td className="p-4 text-xs font-mono opacity-60">{c.expiry_date}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${c.status === 'Valid'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-red-50 text-red-700 animate-pulse'
                                                        }`}
                                                >
                                                    {c.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {hrTab === 'shifts' && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {shifts.map((s) => (
                                <div key={s.id} className="border border-brand-line/10 p-4 rounded-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-sm">{s.shift_name}</h4>
                                            <p className="text-[10px] uppercase font-mono tracking-widest opacity-50 mt-1">
                                                {s.start_time} - {s.end_time}
                                            </p>
                                        </div>
                                        <span className="bg-brand-ink/5 px-2 py-1 text-[10px] font-bold rounded-sm uppercase tracking-widest">
                                            {s.zone}
                                        </span>
                                    </div>
                                    <div className="w-full bg-brand-line/10 h-1 mt-4 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${s.assigned >= s.capacity ? 'bg-amber-500' : 'bg-brand-ink'}`}
                                            style={{ width: `${(s.assigned / s.capacity) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-right mt-1 opacity-50 font-mono">
                                        {s.assigned} / {s.capacity} Deployed
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {hrTab === 'safety' && (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-brand-ink/5">
                                    <th className="p-4 col-header">Date</th>
                                    <th className="p-4 col-header">Incident / Observance</th>
                                    <th className="p-4 col-header">Severity</th>
                                    <th className="p-4 col-header">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents
                                    .filter((i) => i.incident_type === 'HSE')
                                    .map((i) => (
                                        <tr key={i.id} className="border-b border-brand-line/5">
                                            <td className="p-4 text-xs font-mono">{i.reported_date}</td>
                                            <td className="p-4 text-sm font-bold">
                                                {i.description}
                                                <br />
                                                <span className="text-[10px] opacity-50">
                                                    {i.company_name} - Logged by {i.reported_by}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${i.severity === 'High'
                                                            ? 'bg-red-50 text-red-700 animate-pulse'
                                                            : i.severity === 'Medium'
                                                                ? 'bg-amber-50 text-amber-700'
                                                                : 'bg-emerald-50 text-emerald-700'
                                                        }`}
                                                >
                                                    {i.severity}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-bold">{i.status}</td>
                                        </tr>
                                    ))}

                                {incidents.filter((i) => i.incident_type === 'HSE').length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center opacity-50 italic text-sm">
                                            No safety compliance incidents currently flagged.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}