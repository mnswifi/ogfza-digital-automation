import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Activity,
  DollarSign,
  ShieldCheck,
  Settings,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Clock,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Briefcase,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';

// --- Types ---
interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  operationalUnit: string;
  mustChangePassword?: boolean;
}
interface Stats {
  totalCompanies: { count: number };
  pendingPermits: { count: number };
  totalProduction: { total: number };
  totalRevenue: { total: number };
  totalIncidents?: { count: number };
}

interface Company {
  id: number;
  name: string;
  license_no: string;
  type: string;
  status: string;
  joined_date: string;
}

interface Permit {
  id: number;
  company_name: string;
  permit_type: string;
  status: string;
  applied_date: string;
  expiry_date: string;
}

interface Operation {
  id: number;
  field_name: string;
  production_volume: number;
  downtime_hours: number;
  report_date: string;
}

interface Revenue {
  id: number;
  company_name: string;
  amount: number;
  description: string;
  payment_date: string;
  status: string;
}

interface ComplianceAudit {
  id: number;
  company_name: string;
  audit_date: string;
  inspector: string;
  findings: string;
  status: string;
  penalty_amount: number;
}

interface Asset {
  id: number;
  asset_name: string;
  type: string;
  location_coordinates: string;
  status: string;
  maintenance_date: string;
}

interface Incident {
  id: number;
  company_name: string;
  incident_type: string;
  severity: string;
  description: string;
  reported_by: string;
  status: string;
  reported_date: string;
}

interface Contractor {
  id: number;
  name: string;
  category: string;
  representative: string;
  email: string;
  phone: string;
  status: string;
  joined_date: string;
}

interface ContractorDocument {
  id: number;
  contractor_id: number;
  contractor_name?: string;
  doc_type: string;
  file_name: string;
  upload_date: string;
  status: string;
}

interface Employee {
  id: number;
  full_name: string;
  department: string;
  position: string;
  zone: string;
  status: string;
  hire_date: string;
  email: string;
  phone: string;
  company: string;
}

interface WorkOrder {
  id: number;
  contractor_id: number;
  contractor_name: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date?: string;
  status: string;
}

interface MaintenanceRecord {
  id: number;
  asset_id: number;
  asset_name: string;
  maintenance_type: string;
  description: string;
  technician: string;
  cost: number;
  maintenance_date: string;
  next_due_date: string;
  status: string;
}

interface TeamMember {
  id: number;
  full_name: string;
  role: string;
  responsibilities: string;
  department: string;
  status: string;
}

interface AttendanceRecord {
  id: number;
  employee_id: number;
  full_name: string;
  department: string;
  zone: string;
  date: string;
  shift: string;
  check_in: string;
  check_out: string;
  status: string;
}

interface Certification {
  id: number;
  employee_id: number;
  full_name: string;
  department: string;
  company: string;
  cert_name: string;
  issued_date: string;
  expiry_date: string;
  status: string;
}

interface Shift {
  id: number;
  shift_name: string;
  zone: string;
  start_time: string;
  end_time: string;
  capacity: number;
  assigned: number;
}

interface HRStats {
  totalEmployees: { count: number };
  presentToday: { count: number };
  expiredCerts: { count: number };
  onLeave: { count: number };
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${active
      ? 'bg-brand-ink text-brand-bg'
      : 'text-brand-ink/60 hover:bg-brand-ink/5 hover:text-brand-ink'
      }`}
  >
    <Icon size={18} />
    <span>{label}</span>
    {active && <ChevronRight size={14} className="ml-auto" />}
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend }: { label: string, value: string | number, icon: any, trend?: string }) => (
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

// --- Auth Views ---

const ChangePasswordModal = ({ onComplete }: { onComplete: (newPassword: string) => void }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    onComplete(newPassword);
  };

  return (
    <div className="fixed inset-0 bg-brand-ink/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl rounded-sm border border-brand-line/10">
        <h2 className="text-xl font-serif italic mb-2">Change Password Required</h2>
        <p className="text-sm opacity-60 mb-6">As this is your first login, you must update your password to continue.</p>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold uppercase">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="col-header">New Password</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
          </div>
          <div className="space-y-1">
            <label className="col-header">Confirm Password</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
          </div>
          <button className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs">Update Password</button>
        </form>
      </motion.div>
    </div>
  );
};

const LoginPage = ({ onLogin, onSwitchToSignup, onSwitchToForgot }: { onLogin: (user: User, token: string) => void, onSwitchToSignup: () => void, onSwitchToForgot: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const demoUsers = [
    { email: 'admin@petroflow.com', pass: 'admin123', role: 'Admin' },
    { email: 'compliance@ogfza.gov', pass: 'demo123', role: 'Compliance' },
    { email: 'ops@shell.com', pass: 'demo123', role: 'Operations' },
    { email: 'finance@ogfza.gov', pass: 'demo123', role: 'Finance' },
    { email: 'hr@ogfza.gov', pass: 'demo123', role: 'HR Manager' },
    { email: 'contractor@buildit.com', pass: 'demo123', role: 'Contractor' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-brand-line/10 p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-2 mb-8 justify-center">
          <div className="w-12 h-12 bg-brand-ink flex items-center justify-center rounded-sm">
            <TrendingUp size={24} className="text-brand-bg" />
          </div>
          <h1 className="font-bold tracking-tighter text-2xl text-center">OGFZA_digital_automation</h1>
        </div>

        <h2 className="text-xl font-serif italic mb-6 text-center">Operational Access</h2>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="col-header">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-brand-ink/5 border-none p-3 pl-10 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                placeholder="name@petroflow.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="col-header">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-brand-ink/5 border-none p-3 pl-10 text-sm focus:ring-1 focus:ring-brand-ink outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={onSwitchToForgot} className="text-[10px] font-bold uppercase opacity-50 hover:opacity-100">Forgot Password?</button>
          </div>

          <button
            disabled={loading}
            className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-[0.2em] text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 border-t border-brand-line/10 pt-6 text-center">
          <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">New to the platform?</p>
          <button onClick={onSwitchToSignup} className="text-xs font-bold uppercase underline underline-offset-4 mb-6 block w-full text-center">Request Access / Sign Up</button>

          <div className="pt-6 border-t border-brand-line/5">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full text-[10px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 flex items-center justify-center gap-2"
            >
              <AlertCircle size={14} />
              {showDemo ? 'Hide Demo Access' : 'Quick Demo Access'}
            </button>

            <AnimatePresence>
              {showDemo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid grid-cols-1 gap-2 text-left">
                    {demoUsers.map(u => (
                      <button
                        key={u.email}
                        type="button"
                        onClick={() => {
                          setEmail(u.email);
                          setPassword(u.pass);
                        }}
                        className="p-3 bg-brand-ink/5 hover:bg-brand-ink/10 rounded-sm transition-colors group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold opacity-60 group-hover:opacity-100">{u.role}</span>
                          <span className="text-[8px] font-mono opacity-20">Auto-fill</span>
                        </div>
                        <div className="text-[11px] font-mono mt-0.5">{u.email}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const SignupPage = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'Operations',
    operationalUnit: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
        <div className="w-full max-w-md bg-white border border-brand-line/10 p-8 text-center">
          <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-600" />
          <h2 className="text-xl font-serif italic mb-2">Request Submitted</h2>
          <p className="text-sm opacity-60 mb-6">Your account has been created. You can now log in with your credentials.</p>
          <button onClick={onSwitchToLogin} className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs">Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-brand-line/10 p-8 shadow-2xl"
      >
        <h2 className="text-xl font-serif italic mb-6 text-center">Platform Registration</h2>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="col-header">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-brand-ink/5 border-none p-3 pl-10 text-sm outline-none"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="col-header">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-brand-ink/5 border-none p-3 pl-10 text-sm outline-none"
                placeholder="name@petroflow.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="col-header">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-brand-ink/5 border-none p-3 pl-10 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="col-header">Unit / Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-brand-ink/5 border-none p-3 text-sm outline-none"
              >
                <option value="Operations">Operations</option>
                <option value="Finance">Finance</option>
                <option value="Compliance">Compliance</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="col-header">Operational Unit</label>
              <input
                type="text"
                required
                value={formData.operationalUnit}
                onChange={e => setFormData({ ...formData, operationalUnit: e.target.value })}
                className="w-full bg-brand-ink/5 border-none p-3 text-sm outline-none"
                placeholder="e.g. Bonga Field"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={onSwitchToLogin} className="text-xs font-bold uppercase underline underline-offset-4 opacity-50 hover:opacity-100">Already have an account? Sign In</button>
        </div>
      </motion.div>
    </div>
  );
};

const ForgotPasswordPage = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [view, setView] = useState<'email' | 'otp' | 'reset' | 'success'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setView('otp');
      else setError('Failed to send OTP');
    } catch (err) { setError('Connection error'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      if (res.ok) setView('reset');
      else setError('Invalid OTP code');
    } catch (err) { setError('Connection error'); }
    finally { setLoading(false); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      if (res.ok) setView('success');
      else setError('Failed to reset password');
    } catch (err) { setError('Connection error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="w-full max-w-md bg-white border border-brand-line/10 p-8 shadow-2xl">
        <h2 className="text-xl font-serif italic mb-6 text-center">Security Verification</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-[10px] font-bold uppercase">{error}</div>}

        {view === 'email' && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div className="space-y-1">
              <label className="col-header">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" placeholder="name@petroflow.com" />
            </div>
            <button disabled={loading} className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs">Send OTP Code</button>
            <button type="button" onClick={onSwitchToLogin} className="w-full text-xs font-bold uppercase opacity-50">Cancel</button>
          </form>
        )}

        {view === 'otp' && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-xs text-center opacity-60 mb-2">We sent a verification code to {email}</p>
            <div className="space-y-1">
              <label className="col-header">Enter 6-Digit OTP</label>
              <input type="text" required maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-brand-ink/5 p-3 text-center text-lg font-mono tracking-[0.5em] focus:ring-1 focus:ring-brand-ink outline-none" />
            </div>
            <button disabled={loading} className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs">Verify Code</button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="col-header">New Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
            </div>
            <button disabled={loading} className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs">Reset Password</button>
          </form>
        )}

        {view === 'success' && (
          <div className="text-center">
            <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-600" />
            <p className="text-sm opacity-60 mb-6">Password reset successful. You can now login with your new credentials.</p>
            <button onClick={onSwitchToLogin} className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs">Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('petroflow_token'));
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const hasRole = (roleNeeded: string) => {
    if (!user) return false;
    const roles = user.role.split(',').map((r: string) => r.trim());
    if (roles.includes('Admin')) return true;
    return roles.includes(roleNeeded);
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [compliance, setCompliance] = useState<ComplianceAudit[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  // HR State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [hrStats, setHrStats] = useState<HRStats | null>(null);
  const [hrTab, setHrTab] = useState<'employees' | 'attendance' | 'certs' | 'shifts' | 'safety'>('employees');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorDocs, setContractorDocs] = useState<ContractorDocument[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [uploadDoc, setUploadDoc] = useState({ contractor_id: '', doc_type: 'License', file_name: '' });
  const [newProject, setNewProject] = useState({ title: '', description: '', location: '' });
  const [showOpsModal, setShowOpsModal] = useState(false);
  const [newOps, setNewOps] = useState({ field_name: '', production_volume: '', downtime_hours: '', report_date: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('petroflow_user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && user) {
      fetchData();

      // Setup Real-time Push Notifications
      const eventSource = new EventSource('/api/notifications/stream');
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'SUCCESS') {
          toast.success(
            <div className="flex flex-col">
              <span className="font-bold">{data.message}</span>
              <span className="text-[10px] opacity-70">{data.detail}</span>
            </div>,
            { duration: 5000, position: 'top-right', style: { borderRadius: '2px', border: '1px solid #1a1a1a', background: '#fff', color: '#1a1a1a' } }
          );
        } else {
          toast(
            <div className="flex flex-col">
              <span className="font-bold">{data.message}</span>
              <span className="text-[10px] opacity-70">{data.detail}</span>
            </div>,
            { icon: <Activity size={16} />, duration: 5000, position: 'top-right', style: { borderRadius: '2px', border: '1px solid #1a1a1a', background: '#fff', color: '#1a1a1a' } }
          );
        }
      };

      return () => eventSource.close();
    }
  }, [token, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [s, c, p, o, r, comp, a, inc, emp, att, certs, shf, hrs, usersData] = await Promise.all([
        fetch('/api/dashboard/stats', { headers }).then(res => res.json()),
        fetch('/api/companies', { headers }).then(res => res.json()),
        fetch('/api/permits', { headers }).then(res => res.json()),
        fetch('/api/operations', { headers }).then(res => res.json()),
        fetch('/api/revenue', { headers }).then(res => res.json()),
        fetch('/api/compliance', { headers }).then(res => res.json()),
        fetch('/api/assets', { headers }).then(res => res.json()),
        fetch('/api/incidents', { headers }).then(res => res.json()),
        fetch('/api/hr/employees', { headers }).then(res => res.json()),
        fetch('/api/hr/attendance', { headers }).then(res => res.json()),
        fetch('/api/hr/certifications', { headers }).then(res => res.json()),
        fetch('/api/hr/shifts', { headers }).then(res => res.json()),
        fetch('/api/hr/stats', { headers }).then(res => res.json()),
        user?.role?.includes('Admin') ? fetch('/api/users', { headers }).then(res => res.json()) : Promise.resolve([]),
      ]);
      setStats(s);
      setCompanies(c);
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
      if (usersData) setAllUsers(usersData);
      const [cont, contDocs, wo, maint, team] = await Promise.all([
        fetch('/api/contractors', { headers }).then(res => res.json()),
        fetch('/api/contractors/documents', { headers }).then(res => res.json()),
        fetch('/api/work-orders', { headers }).then(res => res.json()),
        fetch('/api/maintenance', { headers }).then(res => res.json()),
        fetch('/api/change-management/team', { headers }).then(res => res.json())
      ]);
      setContractors(cont);
      setContractorDocs(contDocs);
      setWorkOrders(wo);
      setMaintenance(maint);
      setTeamMembers(team);
    } catch (err) {
      console.error("Failed to fetch data", err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem('petroflow_token', t);
    localStorage.setItem('petroflow_user', JSON.stringify(u));
    if (u.mustChangePassword) return; // Wait for modal
    // Set initial tab based on role
    if (u.role === 'Operations') setActiveTab('operations');
    else if (u.role === 'Finance') setActiveTab('finance');
    else if (u.role === 'Compliance') setActiveTab('companies');
    else if (u.role === 'HR Manager') setActiveTab('dashboard');
    else setActiveTab('dashboard');
  };

  const [showRegModal, setShowRegModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', licenseNo: '', tin: '', sector: '', type: 'Energy', leaseInfo: '', representativeEmail: '' });

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCompany),
      });
      if (res.ok) {
        setShowRegModal(false);
        setNewCompany({ name: '', licenseNo: '', tin: '', sector: '', type: 'Energy', leaseInfo: '', representativeEmail: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('petroflow_token');
    localStorage.removeItem('petroflow_user');
    setAuthView('login');
  };

  const handleChangePassword = async (newPassword: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        const updatedUser = { ...user!, mustChangePassword: false };
        setUser(updatedUser);
        localStorage.setItem('petroflow_user', JSON.stringify(updatedUser));
        // Reset tab
        if (updatedUser.role === 'Operations') setActiveTab('operations');
        else if (updatedUser.role === 'Finance') setActiveTab('finance');
        else if (updatedUser.role === 'Compliance') setActiveTab('companies');
        else if (updatedUser.role === 'HR Manager') setActiveTab('dashboard');
        else setActiveTab('dashboard');
      }
    } catch (err) { console.error(err); }
  };

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [newIncident, setNewIncident] = useState({ company_name: '', incident_type: 'HSE', severity: 'Medium', description: '' });

  // Permit Application State
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [newPermit, setNewPermit] = useState({ company_id: '', permit_type: '' });
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [permitExpiry, setPermitExpiry] = useState('');

  const handleApplyPermit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newPermit),
      });
      if (res.ok) {
        setShowPermitModal(false);
        setNewPermit({ company_id: '', permit_type: '' });
        fetchData();
        toast.success('Permit application submitted. Regulatory team has been notified.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleUpdatePermit = async (id: number, status: string, expiry_date: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/permits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status, expiry_date }),
      });
      if (res.ok) {
        setSelectedPermit(null);
        setPermitExpiry('');
        fetchData();
        toast.success(`Permit status updated to ${status}.`);
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        toast.success("User role updated successfully.");
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user role.");
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newIncident),
      });
      if (res.ok) {
        setShowIncidentModal(false);
        setNewIncident({ company_name: '', incident_type: 'HSE', severity: 'Medium', description: '' });
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  // HR Module Actions
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ full_name: '', department: 'HSE', position: '', zone: 'Zone A', email: '', phone: '', company: '' });

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newEmp),
      });
      if (res.ok) {
        setShowAddEmpModal(false);
        setNewEmp({ full_name: '', department: 'HSE', position: '', zone: 'Zone A', email: '', phone: '', company: '' });
        fetchData();
        toast.success('Personnel registered successfully.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const [showLogAttModal, setShowLogAttModal] = useState(false);
  const [newAtt, setNewAtt] = useState({ employee_id: '', date: new Date().toISOString().split('T')[0], shift: 'Morning Alpha', check_in: '', check_out: '', status: 'Present' });

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newAtt),
      });
      if (res.ok) {
        setShowLogAttModal(false);
        setNewAtt({ employee_id: '', date: new Date().toISOString().split('T')[0], shift: 'Morning Alpha', check_in: '', check_out: '', status: 'Present' });
        fetchData();
        toast.success('Attendance logged successfully.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const [showLogCertModal, setShowLogCertModal] = useState(false);
  const [newCert, setNewCert] = useState({ employee_id: '', cert_name: '', issued_date: '', expiry_date: '' });

  const handleLogCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/hr/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newCert),
      });
      if (res.ok) {
        setShowLogCertModal(false);
        setNewCert({ employee_id: '', cert_name: '', issued_date: '', expiry_date: '' });
        fetchData();
        toast.success('Certification logged successfully.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleRequestProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      // Find the contractor associated with this user if applicable
      // For demo, we just use contractor_id 1
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newProject, contractor_id: 1 }),
      });
      if (res.ok) {
        setShowProjectModal(false);
        setNewProject({ title: '', description: '', location: '' });
        fetchData();
        toast.success('Project request submitted for review.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleLogProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...newOps,
          production_volume: Number(newOps.production_volume),
          downtime_hours: Number(newOps.downtime_hours)
        }),
      });
      if (res.ok) {
        setShowOpsModal(false);
        setNewOps({ field_name: '', production_volume: '', downtime_hours: '', report_date: '' });
        fetchData();
        toast.success('Production report logged successfully.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {hasRole('Admin') && (
              <div className="bg-brand-ink text-brand-bg p-6 rounded-sm flex items-center justify-between">
                <div>
                  <h3 className="font-serif italic text-lg">System-wide Reporting Center</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Master Access: Generate all unit reports</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors">Export Comprehensive</button>
                </div>
              </div>
            )}

            {hasRole('HR Manager') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Active Personnel" value={hrStats?.totalEmployees.count || 0} icon={UserIcon} trend="Active" />
                  <StatCard label="Present on Shift" value={hrStats?.presentToday.count || 0} icon={Activity} trend="Today" />
                  <StatCard label="Expired Certs" value={hrStats?.expiredCerts.count || 0} icon={AlertTriangle} trend="Action Req" />
                  <StatCard label="Active Shifts" value={shifts.length} icon={Clock} trend="Deployed" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                    <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                      <h3 className="font-serif italic text-sm">Recent Attendance</h3>
                      <button onClick={() => { setActiveTab('hr'); setHrTab('attendance'); }} className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100">Manage</button>
                    </div>
                    <table className="w-full text-left">
                      <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Date</th><th className="p-4 col-header">Personnel</th><th className="p-4 col-header">Status</th></tr></thead>
                      <tbody>{attendance.slice(0, 5).map(a => (
                        <tr key={a.id} className="border-b border-brand-line/5"><td className="p-4 text-xs font-mono">{a.date}</td><td className="p-4 text-sm font-bold">{a.full_name}</td>
                          <td className="p-4"><span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{a.status}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                    <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                      <h3 className="font-serif italic text-sm">Workforce Deployment</h3>
                      <button onClick={() => { setActiveTab('hr'); setHrTab('employees'); }} className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100">View Roster</button>
                    </div>
                    <div className="p-4 bg-brand-ink/5 border-b border-brand-line/5">
                      <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1">Zone Deployment Heatmap (Active)</p>
                      <div className="flex gap-2">
                        {['Zone A', 'Zone B', 'Zone C', 'HQ'].map(z => (
                          <div key={z} className="flex-1 bg-white p-2 border border-brand-line/10 shadow-sm">
                            <div className="text-[9px] opacity-50 mb-1">{z}</div>
                            <div className="text-lg font-bold">{employees.filter(e => e.zone === z && e.status === 'Active').length}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <table className="w-full text-left">
                      <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Personnel</th><th className="p-4 col-header">Location / Zone</th><th className="p-4 col-header">Assigned Company</th></tr></thead>
                      <tbody>{employees.slice(0, 5).map(e => (
                        <tr key={e.id} className="border-b border-brand-line/5"><td className="p-4 text-xs font-bold">{e.full_name}</td><td className="p-4 text-xs font-mono opacity-60">{e.zone}</td>
                          <td className="p-4 text-xs italic">{e.company}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hasRole('Compliance') && <StatCard label="Total Companies" value={stats?.totalCompanies.count || 0} icon={Building2} trend="Registered" />}
              {hasRole('Compliance') && <StatCard label="Audit Records" value={compliance.length} icon={ShieldCheck} trend="All Time" />}
              {hasRole('Operations') && <StatCard label="Daily Production (BBL)" value={stats?.totalProduction.total?.toLocaleString() || 0} icon={Activity} trend="+5.1%" />}
              {hasRole('Finance') && <StatCard label="Total Revenue (USD)" value={`$${(stats?.totalRevenue.total || 0).toLocaleString()}`} icon={DollarSign} trend="+8.2%" />}
              {hasRole('Admin') && <StatCard label="Contractor Registry" value={contractors.length} icon={Briefcase} trend="Active" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hasRole('Compliance') ? (
                <>
                  <StatCard
                    label="Open HSE Incidents"
                    value={stats?.totalIncidents?.count || 0}
                    icon={AlertTriangle}
                    trend={stats?.totalIncidents?.count ? "Action Required" : "Stable"}
                  />
                  <StatCard
                    label="Completed Audits"
                    value={compliance.filter(c => c.status === 'Completed').length}
                    icon={ShieldCheck}
                    trend="Verified"
                  />
                  <StatCard
                    label="Pending Audits"
                    value={compliance.filter(c => c.status !== 'Completed').length}
                    icon={FileText}
                    trend="Scheduled"
                  />
                  <StatCard
                    label="Violation Rate"
                    value={compliance.length > 0 ? `${Math.round((compliance.filter(c => c.status === 'Violation').length / compliance.length) * 100)}%` : '0%'}
                    icon={AlertTriangle}
                    trend="Compliance Score"
                  />
                </>
              ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {hasRole('Operations') && (
                <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                  <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                    <h3 className="font-serif italic text-sm">Recent Operations</h3>
                    <button className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-brand-ink/5">
                          <th className="p-4 col-header">Field Name</th>
                          <th className="p-4 col-header">Volume (BBL)</th>
                          <th className="p-4 col-header">Downtime</th>
                          <th className="p-4 col-header">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operations.slice(0, 5).map(op => (
                          <tr key={op.id} className="data-row">
                            <td className="p-4 text-sm font-medium">{op.field_name}</td>
                            <td className="p-4 data-value text-sm">{op.production_volume.toLocaleString()}</td>
                            <td className="p-4 data-value text-sm">{op.downtime_hours}h</td>
                            <td className="p-4 data-value text-xs opacity-60">{op.report_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasRole('Compliance') && (
                <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                  <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                    <h3 className="font-serif italic text-sm">Compliance & Audit Summary</h3>
                    <button onClick={() => setActiveTab('compliance')} className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100">Full Report</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-brand-ink/5">
                          <th className="p-4 col-header">Company</th>
                          <th className="p-4 col-header">Inspector</th>
                          <th className="p-4 col-header">Audit Date</th>
                          <th className="p-4 col-header">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compliance.slice(0, 5).map(c => (
                          <tr key={c.id} className="data-row">
                            <td className="p-4 text-sm font-medium">{c.company_name}</td>
                            <td className="p-4 text-xs opacity-80">{c.inspector}</td>
                            <td className="p-4 data-value text-xs opacity-60">{c.audit_date}</td>
                            <td className="p-4">
                              <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${c.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                                c.status === 'Violation' ? 'bg-red-50 text-red-700' :
                                  'bg-amber-50 text-amber-700'
                                }`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {compliance.length === 0 && <tr><td colSpan={4} className="p-8 text-center italic opacity-40">No audit records found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'companies':
        return (
          <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showRegModal && (
              <div className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg p-8 shadow-2xl border border-brand-line/10">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-serif italic text-brand-ink">Register New OGFZA Entity</h2>
                    <button onClick={() => setShowRegModal(false)}><X size={20} /></button>
                  </div>
                  <form onSubmit={handleRegisterCompany} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="col-header">Company Name</label>
                        <input type="text" required value={newCompany.name} onChange={e => setNewCompany({ ...newCompany, name: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="col-header">License No.</label>
                        <input type="text" required value={newCompany.licenseNo} onChange={e => setNewCompany({ ...newCompany, licenseNo: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="col-header">TIN</label>
                        <input type="text" required value={newCompany.tin} onChange={e => setNewCompany({ ...newCompany, tin: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="col-header">Sector</label>
                        <input type="text" required value={newCompany.sector} onChange={e => setNewCompany({ ...newCompany, sector: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="col-header">Lease Information</label>
                      <input type="text" required value={newCompany.leaseInfo} onChange={e => setNewCompany({ ...newCompany, leaseInfo: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="col-header">Representative Email</label>
                      <input type="email" required value={newCompany.representativeEmail} onChange={e => setNewCompany({ ...newCompany, representativeEmail: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" placeholder="Email for permit certificates" />
                    </div>
                    <button disabled={actionLoading} className="w-full bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-xs">
                      {actionLoading ? 'Registering...' : 'Complete Registration'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif italic">Company Directory</h2>
                <p className="text-xs opacity-50 uppercase tracking-widest mt-1">OGFZA Registered Entities</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors">Export Registry Report</button>
                {user?.role === 'Admin' && (
                  <button
                    onClick={() => setShowRegModal(true)}
                    className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    Register New Company
                  </button>
                )}
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-brand-ink/5">
                  <th className="p-4 col-header">Company Name</th>
                  <th className="p-4 col-header">License No.</th>
                  <th className="p-4 col-header">Sector</th>
                  <th className="p-4 col-header">Status</th>
                  <th className="p-4 col-header">Joined</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id} className="data-row">
                    <td className="p-4 text-sm font-bold">{c.name}</td>
                    <td className="p-4 data-value text-sm">{c.license_no}</td>
                    <td className="p-4 text-xs opacity-80">{c.type}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 data-value text-xs opacity-60">{c.joined_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'permits':
        return (
          <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {/* New Application Modal */}
            {showPermitModal && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-2">New Permit Application</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">OGFZA Regulatory Workflow</p>
                  <form onSubmit={handleApplyPermit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="col-header">Select Company</label>
                      <select required value={newPermit.company_id} onChange={e => setNewPermit({ ...newPermit, company_id: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                        <option value="">-- Select Registered Entity --</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="col-header">Permit Type</label>
                      <select required value={newPermit.permit_type} onChange={e => setNewPermit({ ...newPermit, permit_type: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                        <option value="">-- Select Permit Type --</option>
                        <option>Drilling License</option>
                        <option>Environmental Impact Assessment</option>
                        <option>Oil Mining Lease</option>
                        <option>Gas Flare Permit</option>
                        <option>Export License</option>
                        <option>Zone Entry Permit</option>
                        <option>Construction Permit</option>
                      </select>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowPermitModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">
                        {actionLoading ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* Permit Review / Approve Modal */}
            {selectedPermit && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-1">Permit Review</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">#{selectedPermit.id.toString().padStart(4, '0')}</p>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-xs border-b border-brand-line/10 pb-2">
                      <span className="opacity-50">Company</span>
                      <span className="font-bold">{selectedPermit.company_name}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-brand-line/10 pb-2">
                      <span className="opacity-50">Permit Type</span>
                      <span>{selectedPermit.permit_type}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-brand-line/10 pb-2">
                      <span className="opacity-50">Applied Date</span>
                      <span>{selectedPermit.applied_date}</span>
                    </div>
                    <div className="flex justify-between text-xs pb-2">
                      <span className="opacity-50">Current Status</span>
                      <span className={`font-bold ${selectedPermit.status === 'Approved' ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedPermit.status}</span>
                    </div>
                  </div>
                  {(hasRole('Admin') || hasRole('Compliance')) && selectedPermit.status === 'Pending' && (
                    <div className="space-y-1 mb-4">
                      <label className="col-header">Set Expiry Date</label>
                      <input type="date" value={permitExpiry} onChange={e => setPermitExpiry(e.target.value)} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setSelectedPermit(null); setPermitExpiry(''); }} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Close</button>
                    {(hasRole('Admin') || hasRole('Compliance')) && selectedPermit.status === 'Pending' && (
                      <>
                        <button onClick={() => handleUpdatePermit(selectedPermit.id, 'Rejected', permitExpiry)} disabled={actionLoading} className="flex-1 border border-red-200 text-red-600 py-3 font-bold uppercase tracking-widest text-[10px]">Reject</button>
                        <button onClick={() => handleUpdatePermit(selectedPermit.id, 'Approved', permitExpiry)} disabled={actionLoading} className="flex-1 bg-emerald-600 text-white py-3 font-bold uppercase tracking-widest text-[10px]">{actionLoading ? '...' : 'Approve'}</button>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif italic">Permits & Approvals</h2>
                <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Regulatory Workflow Tracking</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors">Export Permits Report</button>
                {(hasRole('Admin') || hasRole('Operations')) && (
                  <button onClick={() => setShowPermitModal(true)} className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90">
                    New Application
                  </button>
                )}
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-brand-ink/5">
                  <th className="p-4 col-header">ID</th>
                  <th className="p-4 col-header">Company</th>
                  <th className="p-4 col-header">Permit Type</th>
                  <th className="p-4 col-header">Applied</th>
                  <th className="p-4 col-header">Status</th>
                  <th className="p-4 col-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {permits.map(p => (
                  <tr key={p.id} className="data-row">
                    <td className="p-4 data-value text-xs opacity-50">#{p.id.toString().padStart(4, '0')}</td>
                    <td className="p-4 text-sm font-bold">{p.company_name}</td>
                    <td className="p-4 text-xs">{p.permit_type}</td>
                    <td className="p-4 data-value text-xs opacity-60">{p.applied_date}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                        p.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-3">
                      <button onClick={() => { setSelectedPermit(p); setPermitExpiry(p.expiry_date || ''); }} className="text-[10px] font-bold uppercase underline underline-offset-4 opacity-50 hover:opacity-100">Review</button>
                      {p.status === 'Approved' && (
                        <button onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Approval Certificate - ${p.company_name}</title>
                                  <style>
                                    body { font-family: serif; text-align: center; padding: 50px; }
                                    .container { border: 10px solid #0a192f; padding: 50px; }
                                    h1 { font-size: 40px; text-transform: uppercase; letter-spacing: 5px; color: #0a192f; }
                                    p { font-size: 20px; line-height: 1.6; }
                                    .highlight { font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding: 0 10px; }
                                    .seal { margin-top: 50px; width: 150px; height: 150px; border: 4px dashed #0a192f; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; align-content: center; font-weight: bold; color: #0a192f; text-transform: uppercase; font-size: 14px; }
                                  </style>
                                </head>
                                <body>
                                  <div class="container">
                                    <h1>Certificate of Approval</h1>
                                    <p>This certifies that</p>
                                    <p class="highlight">${p.company_name}</p>
                                    <p>has been officially granted the following permit:</p>
                                    <p class="highlight">${p.permit_type}</p>
                                    <p>Effective Date: <b>${p.applied_date}</b> &nbsp;&nbsp;&nbsp; Expiry Date: <b>${p.expiry_date || 'N/A'}</b></p>
                                    <p>Issued by the Oil & Gas Free Zones Authority (OGFZA)</p>
                                    <div class="seal"><span style="margin: auto;">Official<br/>OGFZA<br/>Seal</span></div>
                                  </div>
                                  <script>
                                    window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }} className="text-[10px] font-bold uppercase underline underline-offset-4 opacity-50 hover:opacity-100 text-emerald-600">Download Cert</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'finance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-brand-ink text-brand-bg p-6 rounded-sm">
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Total Revenue YTD</p>
                <p className="text-3xl font-bold data-value">${(stats?.totalRevenue.total || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white border border-brand-line/10 p-6 rounded-sm">
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Outstanding Invoices</p>
                <p className="text-3xl font-bold data-value">$12,450</p>
              </div>
              <div className="bg-white border border-brand-line/10 p-6 rounded-sm">
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Collection Rate</p>
                <p className="text-3xl font-bold data-value text-emerald-600">94.2%</p>
              </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
              <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif italic">Revenue & Financials</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Transaction History</p>
                </div>
                <button onClick={() => window.print()} className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors">Export Financial Report</button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-ink/5">
                    <th className="p-4 col-header">Company</th>
                    <th className="p-4 col-header">Description</th>
                    <th className="p-4 col-header">Amount</th>
                    <th className="p-4 col-header">Date</th>
                    <th className="p-4 col-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map(r => (
                    <tr key={r.id} className="data-row">
                      <td className="p-4 text-sm font-bold">{r.company_name}</td>
                      <td className="p-4 text-xs opacity-80">{r.description}</td>
                      <td className="p-4 data-value text-sm font-bold">${r.amount.toLocaleString()}</td>
                      <td className="p-4 data-value text-xs opacity-60">{r.payment_date}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'compliance':
        return (
          <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif italic">Compliance & Audit</h2>
                <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Inspection & Monitoring Log</p>
              </div>
              <button onClick={() => window.print()} className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors">Export Audit Report</button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-brand-ink/5">
                  <th className="p-4 col-header">Date</th>
                  <th className="p-4 col-header">Company</th>
                  <th className="p-4 col-header">Inspector</th>
                  <th className="p-4 col-header">Findings</th>
                  <th className="p-4 col-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {compliance.map(comp => (
                  <tr key={comp.id} className="data-row">
                    <td className="p-4 data-value text-xs">{comp.audit_date}</td>
                    <td className="p-4 text-sm font-bold">{comp.company_name}</td>
                    <td className="p-4 text-xs">{comp.inspector}</td>
                    <td className="p-4 text-xs opacity-80">{comp.findings}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${comp.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                        {comp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'operations':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
              <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif italic">Field Assets & Logistics</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Infrastructure & Production Management</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors">Export Logs</button>
                  {(hasRole('Admin') || hasRole('Operations')) && (
                    <button onClick={() => setShowOpsModal(true)} className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90">
                      Log Production Report
                    </button>
                  )}
                </div>
              </div>

              {/* Production Reporting Modal */}
              {showOpsModal && (
                <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                    <h3 className="font-serif italic text-lg mb-2">Daily Production Report</h3>
                    <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">Operations Unit Data Entry</p>
                    <form onSubmit={handleLogProduction} className="space-y-4">
                      <div className="space-y-1">
                        <label className="col-header">Field / Asset Name</label>
                        <input required type="text" value={newOps.field_name} onChange={e => setNewOps({ ...newOps, field_name: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" placeholder="e.g. Rig Delta 07" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="col-header">Volume (BBL)</label>
                          <input required type="number" value={newOps.production_volume} onChange={e => setNewOps({ ...newOps, production_volume: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                          <label className="col-header">Downtime (Hrs)</label>
                          <input required type="number" step="0.5" value={newOps.downtime_hours} onChange={e => setNewOps({ ...newOps, downtime_hours: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" placeholder="0" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="col-header">Report Date</label>
                        <input required type="date" value={newOps.report_date} onChange={e => setNewOps({ ...newOps, report_date: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowOpsModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                        <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">
                          {actionLoading ? 'Logging...' : 'Submit Report'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              <div className="p-4 bg-brand-ink/[0.02] border-b border-brand-line/5">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 px-2 pb-2">Recent Production History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-brand-ink/5">
                        <th className="p-4 col-header">Field Name</th>
                        <th className="p-4 col-header">Volume (BBL)</th>
                        <th className="p-4 col-header">Downtime</th>
                        <th className="p-4 col-header">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operations.map(op => (
                        <tr key={op.id} className="data-row">
                          <td className="p-4 text-sm font-medium">{op.field_name}</td>
                          <td className="p-4 data-value text-sm">{op.production_volume.toLocaleString()}</td>
                          <td className="p-4 data-value text-sm">{op.downtime_hours}h</td>
                          <td className="p-4 data-value text-xs opacity-60">{op.report_date}</td>
                        </tr>
                      ))}
                      {operations.length === 0 && <tr><td colSpan={4} className="p-8 text-center italic opacity-40">No production data reported.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-white">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 px-2 pb-2">Infrastructure Assets</h3>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-brand-ink/5">
                      <th className="p-4 col-header">Asset Name</th>
                      <th className="p-4 col-header">Type</th>
                      <th className="p-4 col-header">Location</th>
                      <th className="p-4 col-header">Status</th>
                      <th className="p-4 col-header">Maintenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id} className="data-row">
                        <td className="p-4 text-sm font-bold">{a.asset_name}</td>
                        <td className="p-4 text-xs opacity-80">{a.type}</td>
                        <td className="p-4 data-value text-xs">{a.location_coordinates}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${a.status === 'Operational' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 data-value text-xs opacity-60">Next: {a.maintenance_date || 'TBD'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
              <div className="p-6 border-b border-brand-line/10">
                <h3 className="font-serif italic text-base">Equipment Maintenance Tracker</h3>
                <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Lifecycle Management & Scheduling</p>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-brand-ink/5">
                      <th className="p-4 col-header">Asset</th>
                      <th className="p-4 col-header">Maintenance Type</th>
                      <th className="p-4 col-header">Technician</th>
                      <th className="p-4 col-header">Cost</th>
                      <th className="p-4 col-header">Date / Due</th>
                      <th className="p-4 col-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line/5">
                    {maintenance.map(m => (
                      <tr key={m.id} className="hover:bg-brand-ink/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="text-sm font-bold">{m.asset_name}</div>
                          <div className="text-[10px] opacity-40">{m.description}</div>
                        </td>
                        <td className="p-4 text-xs font-bold">{m.maintenance_type}</td>
                        <td className="p-4 text-xs opacity-70">{m.technician}</td>
                        <td className="p-4 text-xs font-mono">${m.cost.toLocaleString()}</td>
                        <td className="p-4 text-xs font-mono opacity-60">
                          {m.maintenance_date}
                          <div className="text-[9px] text-brand-ink font-bold mt-0.5">Next: {m.next_due_date}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${m.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{m.status}</span>
                        </td>
                      </tr>
                    ))}
                    {maintenance.length === 0 && <tr><td colSpan={6} className="p-8 text-center italic opacity-30">No maintenance records found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'incidents':
        return (
          <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden relative">
            {showIncidentModal && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-6">Report OGFZA Incident</h3>
                  <form onSubmit={handleReportIncident} className="space-y-4">
                    <div className="space-y-1">
                      <label className="col-header">Entity Name</label>
                      <select required value={newIncident.company_name} onChange={e => setNewIncident({ ...newIncident, company_name: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="col-header">Incident Type</label>
                        <select value={newIncident.incident_type} onChange={e => setNewIncident({ ...newIncident, incident_type: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                          <option>HSE</option>
                          <option>Operational</option>
                          <option>Security</option>
                          <option>Technical</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="col-header">Severity</label>
                        <select value={newIncident.severity} onChange={e => setNewIncident({ ...newIncident, severity: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                          <option>Critical</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="col-header">Description</label>
                      <textarea required value={newIncident.description} onChange={e => setNewIncident({ ...newIncident, description: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm h-32 focus:ring-1 focus:ring-brand-ink outline-none resize-none" />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowIncidentModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Back</button>
                      <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">{actionLoading ? 'Reporting...' : 'Submit Report'}</button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
              <div>
                <h3 className="font-serif italic text-base">Safety & Incident Logs</h3>
                <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">HSE Digitization & Workflow</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="border border-brand-line/20 px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors">Export Incident Report</button>
                <button
                  onClick={() => setShowIncidentModal(true)}
                  className="bg-brand-ink text-brand-bg px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Log New Incident
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-ink/5">
                    <th className="p-4 col-header">ID</th>
                    <th className="p-4 col-header">Entity</th>
                    <th className="p-4 col-header">Type</th>
                    <th className="p-4 col-header">Severity</th>
                    <th className="p-4 col-header">Status</th>
                    <th className="p-4 col-header">Reported Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line/10">
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-brand-ink/[0.02] transition-colors group">
                      <td className="p-4 text-xs font-mono opacity-50">#{inc.id}</td>
                      <td className="p-4 text-xs font-bold uppercase">{inc.company_name}</td>
                      <td className="p-4 text-xs italic">{inc.incident_type}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-full ${inc.severity === 'Critical' ? 'bg-red-500 text-white' :
                          inc.severity === 'High' ? 'bg-orange-500 text-white' :
                            inc.severity === 'Medium' ? 'bg-yellow-500 text-brand-ink' :
                              'bg-emerald-500 text-white'
                          }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${inc.status === 'Open' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs opacity-50">{new Date(inc.reported_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {incidents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-20 text-center opacity-30 italic">No incidents recorded in the system.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'logistics':
        return (
          <div className="space-y-6">
            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif italic">Integrated Logistics (Single Window)</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">CargoTrack Integration & Movement SLAs</p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="bg-white/10 p-3 rounded-sm border border-white/10">
                  <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Target SLA</div>
                  <div className="text-xl font-bold font-mono">48 HRS</div>
                </div>
                <div className="bg-emerald-500/20 p-3 rounded-sm border border-emerald-500/30">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-200 mb-1">SLA Compliance</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">96.5%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-brand-line/10 rounded-sm p-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Inbound Operations</p>
                <div className="text-3xl font-bold mb-2">124</div>
                <p className="text-[10px] uppercase tracking-widest opacity-80">Pending Clearances</p>
                <div className="mt-4 flex gap-2 justify-center text-[10px] uppercase tracking-[0.2em] opacity-40">
                  <span>Sea: 82</span> • <span>Air: 42</span>
                </div>
              </div>
              <div className="bg-white border border-brand-line/10 rounded-sm p-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Outbound Operations</p>
                <div className="text-3xl font-bold mb-2">48</div>
                <p className="text-[10px] uppercase tracking-widest opacity-80">Export Approvals</p>
                <div className="mt-4 flex gap-2 justify-center text-[10px] uppercase tracking-[0.2em] opacity-40">
                  <span>Processing</span>
                </div>
              </div>
              <div className="bg-white border border-brand-line/10 rounded-sm p-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Internal Transfers</p>
                <div className="text-3xl font-bold mb-2">15</div>
                <p className="text-[10px] uppercase tracking-widest opacity-80">Zone Movements</p>
                <div className="mt-4 flex gap-2 justify-center text-[10px] uppercase tracking-[0.2em] opacity-40">
                  <span>Active</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
              <div className="p-6 border-b border-brand-line/10 flex justify-between items-center bg-brand-ink/5">
                <div>
                  <h3 className="font-serif italic text-base">Current Requests & Movements</h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Pending actions within the 48-Hour SLA timeframe</p>
                </div>
                <button className="bg-brand-ink text-brand-bg px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90">
                  New Request
                </button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-ink/5">
                    <th className="p-4 col-header">Request Type</th>
                    <th className="p-4 col-header">Company</th>
                    <th className="p-4 col-header">Time Elapsed</th>
                    <th className="p-4 col-header">Status</th>
                    <th className="p-4 col-header">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line/10">
                  {[
                    { type: 'Free Zone Sea Freight Procedure', company: 'TOTAL ENERGIES', elapsed: '12 Hours', status: 'Processing' },
                    { type: 'Procedure for Unstuffing and Unpacking', company: 'CHEVRON', elapsed: '38 Hours', status: 'Pending Review' },
                    { type: 'Export of Goods (Air)', company: 'SEPLAT ENERGY', elapsed: '46 Hours', status: 'SLA Warning' },
                    { type: 'Transloading of Goods', company: 'OANDO', elapsed: '05 Hours', status: 'Processing' }
                  ].map((req, idx) => (
                    <tr key={idx} className="hover:bg-brand-ink/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="text-xs font-bold">{req.type}</div>
                      </td>
                      <td className="p-4 text-xs font-mono">{req.company}</td>
                      <td className="p-4">
                        <div className={`text-xs font-mono ${req.status === 'SLA Warning' ? 'text-red-500 font-bold' : ''}`}>{req.elapsed} / 48H</div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full ${req.status === 'SLA Warning' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button className="text-[10px] font-bold uppercase tracking-widest underline opacity-50 hover:opacity-100">Review</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm">
              <h2 className="text-2xl font-serif italic">System Administration</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">Change Management & User Configuration</p>
            </div>

            {/* User Management */}
            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
              <div className="p-6 border-b border-brand-line/10 flex justify-between items-center">
                <div>
                  <h3 className="font-serif italic text-base">User Management</h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Active Platform Users</p>
                </div>
                <button
                  onClick={() => setAuthView('signup' as any)}
                  className="bg-brand-ink text-brand-bg px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                  title="Invite new user"
                >
                  + Invite User
                </button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-ink/5">
                    <th className="p-4 col-header">Name</th>
                    <th className="p-4 col-header">Email</th>
                    <th className="p-4 col-header">Role</th>
                    <th className="p-4 col-header">Unit</th>
                    <th className="p-4 col-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line/10">
                  {allUsers.map((u, i) => (
                    <tr key={i} className="hover:bg-brand-ink/[0.02] transition-colors">
                      <td className="p-4 text-sm font-bold">{u.fullName}</td>
                      <td className="p-4 text-xs opacity-60 italic">{u.email}</td>
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          className="px-2 py-1 text-[10px] font-bold uppercase rounded-sm bg-brand-ink/5 border border-brand-line/10 outline-none hover:border-brand-ink/30 cursor-pointer"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Compliance">Compliance</option>
                          <option value="Operations">Operations</option>
                          <option value="Finance">Finance</option>
                          <option value="HR Manager">HR Manager</option>
                          <option value="Contractor">Contractor</option>
                          <option value="Admin, Finance">Admin, Finance</option>
                          <option value="Compliance, HR Manager">Compliance, HR Manager</option>
                        </select>
                      </td>
                      <td className="p-4 text-xs opacity-60">{u.unit}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* System Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-brand-line/10 rounded-sm p-6">
                <h3 className="font-serif italic text-base mb-4">Email Notifications</h3>
                <div className="space-y-3">
                  {[
                    { label: 'New Company Registration', enabled: true },
                    { label: 'Permit Status Updates', enabled: true },
                    { label: 'HSE Incident Alerts', enabled: true },
                    { label: 'Daily Operations Report', enabled: false },
                    { label: 'Weekly Compliance Summary', enabled: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-brand-line/10 last:border-0">
                      <span className="text-xs">{item.label}</span>
                      <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer relative ${item.enabled ? 'bg-brand-ink' : 'bg-brand-line/30'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${item.enabled ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-brand-line/10 rounded-sm p-6">
                <h3 className="font-serif italic text-base mb-4">SMTP Configuration</h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between py-2 border-b border-brand-line/10">
                    <span className="opacity-50">Host</span>
                    <span>smtp.office365.com</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-brand-line/10">
                    <span className="opacity-50">Port</span>
                    <span>587</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-brand-line/10">
                    <span className="opacity-50">Sender</span>
                    <span>noreply-npl@norrenpensions.com</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-brand-line/10">
                    <span className="opacity-50">Security</span>
                    <span className="text-emerald-600">STARTTLS ✓</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="opacity-50">Status</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-brand-line/10 rounded-sm p-6">
              <h3 className="font-serif italic text-base mb-4">Platform Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold data-value">{companies.length}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Registered Entities</p>
                </div>
                <div>
                  <p className="text-2xl font-bold data-value">{permits.length}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Total Permits</p>
                </div>
                <div>
                  <p className="text-2xl font-bold data-value">{incidents.length}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Incident Records</p>
                </div>
                <div>
                  <p className="text-2xl font-bold data-value">v1.0</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Platform Version</p>
                </div>
              </div>
            </div>

            {/* Implementation & Change Management Team */}
            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
              <div className="p-6 border-b border-brand-line/10">
                <h3 className="font-serif italic text-base">Implementation & Change Management Team</h3>
                <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Project Steering & Onboarding Unit</p>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-brand-ink/5">
                      <th className="p-4 col-header">Team Member</th>
                      <th className="p-4 col-header">Project Role</th>
                      <th className="p-4 col-header">Core Responsibilities</th>
                      <th className="p-4 col-header">Onboarding Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map(member => (
                      <tr key={member.id} className="border-b border-brand-line/5 hover:bg-brand-ink/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="text-sm font-bold">{member.full_name}</div>
                          <div className="text-[10px] opacity-40 font-mono italic">{member.department}</div>
                        </td>
                        <td className="p-4 text-xs font-bold uppercase tracking-widest opacity-70">{member.role}</td>
                        <td className="p-4">
                          <ul className="text-[10px] space-y-1 list-disc list-inside opacity-70">
                            {member.responsibilities.split(',').map((res, i) => (
                              <li key={i}>{res.trim()}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 rounded-full uppercase tracking-widest">{member.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'hr':
        return (
          <div className="space-y-6 relative">
            {/* HR Modals */}
            {showAddEmpModal && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-4">Register Personnel</h3>
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    <input type="text" placeholder="Full Name" required value={newEmp.full_name} onChange={e => setNewEmp({ ...newEmp, full_name: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <select value={newEmp.department} onChange={e => setNewEmp({ ...newEmp, department: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                        <option>HSE</option><option>Operations</option><option>Maintenance</option><option>HR</option>
                      </select>
                      <input type="text" placeholder="Position" required value={newEmp.position} onChange={e => setNewEmp({ ...newEmp, position: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <select value={newEmp.zone} onChange={e => setNewEmp({ ...newEmp, zone: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                        <option>Zone A</option><option>Zone B</option><option>Zone C</option><option>HQ</option>
                      </select>
                      <input type="text" placeholder="Company" required value={newEmp.company} onChange={e => setNewEmp({ ...newEmp, company: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    </div>
                    <input type="email" placeholder="Email" required value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    <input type="tel" placeholder="Phone" required value={newEmp.phone} onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowAddEmpModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">Save</button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {showLogAttModal && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-4">Log Attendance</h3>
                  <form onSubmit={handleLogAttendance} className="space-y-4">
                    <select required value={newAtt.employee_id} onChange={e => setNewAtt({ ...newAtt, employee_id: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                      <option value="">-- Select Personnel --</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="date" required value={newAtt.date} onChange={e => setNewAtt({ ...newAtt, date: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      <select required value={newAtt.shift} onChange={e => setNewAtt({ ...newAtt, shift: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                        {shifts.map(s => <option key={s.id} value={s.shift_name}>{s.shift_name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="time" placeholder="Check In" value={newAtt.check_in} onChange={e => setNewAtt({ ...newAtt, check_in: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      <input type="time" placeholder="Check Out" value={newAtt.check_out} onChange={e => setNewAtt({ ...newAtt, check_out: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    </div>
                    <select value={newAtt.status} onChange={e => setNewAtt({ ...newAtt, status: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                      <option>Present</option><option>Absent</option><option>On Leave</option>
                    </select>
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowLogAttModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">Save Log</button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {showLogCertModal && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-4">Log Certification</h3>
                  <form onSubmit={handleLogCert} className="space-y-4">
                    <select required value={newCert.employee_id} onChange={e => setNewCert({ ...newCert, employee_id: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                      <option value="">-- Select Personnel --</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                    </select>
                    <input type="text" placeholder="Certification Name (e.g. HSE Level 2)" required value={newCert.cert_name} onChange={e => setNewCert({ ...newCert, cert_name: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold opacity-50">Issued Date</label>
                        <input type="date" required value={newCert.issued_date} onChange={e => setNewCert({ ...newCert, issued_date: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold opacity-50">Expiry Date</label>
                        <input type="date" required value={newCert.expiry_date} onChange={e => setNewCert({ ...newCert, expiry_date: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowLogCertModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">Save Cert</button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            <div className="bg-brand-ink text-brand-bg p-8 rounded-sm relative text-center">
              <h2 className="text-2xl font-serif italic">HR & Workforce Digitization</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mt-1">Field Attendance • Deployments • Certifications</p>
              <button onClick={() => window.print()} className="absolute top-8 right-8 border border-white/20 hover:bg-white/10 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors">Export Dept Report</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-brand-ink transition-colors" onClick={() => setHrTab('employees')}>
                <div className="flex justify-center mb-3 text-brand-ink opacity-70"><UserIcon size={24} /></div>
                <p className="text-2xl font-bold font-mono">{hrStats?.totalEmployees.count || 0}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Active Personnel</p>
              </div>
              <div className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-emerald-500 transition-colors" onClick={() => setHrTab('attendance')}>
                <div className="flex justify-center mb-3 text-emerald-600 opacity-70"><Activity size={24} /></div>
                <p className="text-2xl font-bold font-mono text-emerald-600">{hrStats?.presentToday.count || 0}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Present on Shift</p>
              </div>
              <div className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-amber-500 transition-colors" onClick={() => setHrTab('certs')}>
                <div className="flex justify-center mb-3 text-amber-600 opacity-70"><FileText size={24} /></div>
                <p className="text-2xl font-bold font-mono text-amber-600">{hrStats?.expiredCerts.count || 0}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Expired Certs</p>
              </div>
              <div className="bg-white border border-brand-line/10 p-6 rounded-sm text-center cursor-pointer hover:border-brand-ink transition-colors" onClick={() => setHrTab('shifts')}>
                <div className="flex justify-center mb-3 text-brand-ink opacity-70"><Clock size={24} /></div>
                <p className="text-2xl font-bold font-mono">{shifts.length}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Active Shifts</p>
              </div>
            </div>

            {/* Sub-Tabs View */}
            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
              <div className="flex border-b border-brand-line/10 text-xs font-bold uppercase tracking-widest">
                <button onClick={() => setHrTab('employees')} className={`p-4 flex-1 transition-colors ${hrTab === 'employees' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'}`}>Personnel Registry</button>
                <button onClick={() => setHrTab('attendance')} className={`p-4 flex-1 transition-colors ${hrTab === 'attendance' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'}`}>Field Attendance Tracking</button>
                <button onClick={() => setHrTab('shifts')} className={`p-4 flex-1 transition-colors ${hrTab === 'shifts' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'}`}>Workforce Deployment Visibility</button>
                <button onClick={() => setHrTab('certs')} className={`p-4 flex-1 transition-colors ${hrTab === 'certs' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'}`}>Certification & Training</button>
                <button onClick={() => setHrTab('safety')} className={`p-4 flex-1 transition-colors ${hrTab === 'safety' ? 'bg-brand-ink text-white' : 'hover:bg-brand-ink/5'}`}>Safety Compliance</button>
              </div>

              <div className="p-0">
                {hrTab === 'employees' && (
                  <div>
                    <div className="p-4 border-b border-brand-line/5 flex justify-end">
                      <button onClick={() => setShowAddEmpModal(true)} className="bg-brand-ink text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90">+ Add Personnel</button>
                    </div>
                    <table className="w-full text-left">
                      <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Name</th><th className="p-4 col-header">Position</th><th className="p-4 col-header">Zone</th><th className="p-4 col-header">Status</th></tr></thead>
                      <tbody>{employees.map(e => (
                        <tr key={e.id} className="border-b border-brand-line/5"><td className="p-4 text-sm font-bold">{e.full_name}<br /><span className="text-[10px] font-mono opacity-50">{e.company}</span></td><td className="p-4 text-xs">{e.position}</td><td className="p-4 text-xs">{e.zone}</td>
                          <td className="p-4"><span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${e.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{e.status}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}

                {hrTab === 'attendance' && (
                  <div>
                    <div className="p-4 border-b border-brand-line/5 flex justify-end">
                      <button onClick={() => setShowLogAttModal(true)} className="bg-emerald-600 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90">+ Log Attendance</button>
                    </div>
                    <table className="w-full text-left">
                      <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Date</th><th className="p-4 col-header">Personnel</th><th className="p-4 col-header">Shift</th><th className="p-4 col-header">Log Times</th><th className="p-4 col-header">Status</th></tr></thead>
                      <tbody>{attendance.map(a => (
                        <tr key={a.id} className="border-b border-brand-line/5"><td className="p-4 text-xs font-mono">{a.date}</td><td className="p-4 text-sm font-bold">{a.full_name}<br /><span className="text-[10px] opacity-50">{a.zone}</span></td><td className="p-4 text-xs">{a.shift}</td>
                          <td className="p-4 text-xs font-mono opacity-60">{a.check_in || '--:--'} - {a.check_out || '--:--'}</td><td className="p-4"><span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : a.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{a.status}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}

                {hrTab === 'certs' && (
                  <div>
                    <div className="p-4 border-b border-brand-line/5 flex justify-end">
                      <button onClick={() => setShowLogCertModal(true)} className="bg-brand-ink text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90">+ Log Cert</button>
                    </div>
                    <table className="w-full text-left">
                      <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Personnel</th><th className="p-4 col-header">Certification</th><th className="p-4 col-header">Expiry Date</th><th className="p-4 col-header">Validity</th></tr></thead>
                      <tbody>{certifications.map(c => (
                        <tr key={c.id} className="border-b border-brand-line/5"><td className="p-4 text-sm font-bold">{c.full_name}<br /><span className="text-[10px] opacity-50">{c.company}</span></td><td className="p-4 text-xs font-bold">{c.cert_name}</td><td className="p-4 text-xs font-mono opacity-60">{c.expiry_date}</td>
                          <td className="p-4"><span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${c.status === 'Valid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700 animate-pulse'}`}>{c.status}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}

                {hrTab === 'shifts' && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shifts.map(s => (
                      <div key={s.id} className="border border-brand-line/10 p-4 rounded-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div><h4 className="font-bold text-sm">{s.shift_name}</h4><p className="text-[10px] uppercase font-mono tracking-widest opacity-50 mt-1">{s.start_time} - {s.end_time}</p></div>
                          <span className="bg-brand-ink/5 px-2 py-1 text-[10px] font-bold rounded-sm uppercase tracking-widest">{s.zone}</span>
                        </div>
                        <div className="w-full bg-brand-line/10 h-1 mt-4 rounded-full overflow-hidden">
                          <div className={`h-full ${s.assigned >= s.capacity ? 'bg-amber-500' : 'bg-brand-ink'}`} style={{ width: `${(s.assigned / s.capacity) * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-right mt-1 opacity-50 font-mono">{s.assigned} / {s.capacity} Deployed</p>
                      </div>
                    ))}
                  </div>
                )}

                {hrTab === 'safety' && (
                  <table className="w-full text-left">
                    <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Date</th><th className="p-4 col-header">Incident / Observance</th><th className="p-4 col-header">Severity</th><th className="p-4 col-header">Status</th></tr></thead>
                    <tbody>
                      {incidents.filter(i => i.incident_type === 'HSE').map(i => (
                        <tr key={i.id} className="border-b border-brand-line/5"><td className="p-4 text-xs font-mono">{i.reported_date}</td><td className="p-4 text-sm font-bold">{i.description}<br /><span className="text-[10px] opacity-50">{i.company_name} - Logged by {i.reported_by}</span></td>
                          <td className="p-4"><span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${i.severity === 'High' ? 'bg-red-50 text-red-700 animate-pulse' : i.severity === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{i.severity}</span></td>
                          <td className="p-4 text-xs font-bold">{i.status}</td></tr>
                      ))}
                      {incidents.filter(i => i.incident_type === 'HSE').length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center opacity-50 italic text-sm">No safety compliance incidents currently flagged.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      case 'contractors':
        return (
          <div className="space-y-6">
            {showUploadDocModal && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-sm w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-4">Upload Document</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setActionLoading(true);
                    try {
                      const res = await fetch('/api/contractors/documents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(uploadDoc),
                      });
                      if (res.ok) {
                        setShowUploadDocModal(false);
                        fetchData();
                        toast.success('Document uploaded to OGFZA server.');
                      }
                    } catch (e) { }
                    finally { setActionLoading(false); }
                  }} className="space-y-4">
                    <select required value={uploadDoc.contractor_id} onChange={e => setUploadDoc({ ...uploadDoc, contractor_id: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                      <option value="">-- Select Contractor --</option>
                      {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={uploadDoc.doc_type} onChange={e => setUploadDoc({ ...uploadDoc, doc_type: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none">
                      <option>Operational License</option>
                      <option>Professional Insurance</option>
                      <option>Technical Profile</option>
                      <option>HSE Compliance Cert</option>
                    </select>
                    <input type="text" placeholder="File Name (e.g. license_2024.pdf)" required value={uploadDoc.file_name} onChange={e => setUploadDoc({ ...uploadDoc, file_name: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" />
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowUploadDocModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">Upload</button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-brand-ink/5 flex items-center justify-center rounded-full mb-4">
                <Briefcase size={32} className="text-brand-ink" />
              </div>
              <h2 className="text-2xl font-serif italic">Contractor Management Portal</h2>
              <p className="max-w-md text-xs opacity-50 uppercase tracking-widest mt-2">Manage external vendors, technical documentation, and performance compliance within OGFZA zones.</p>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setShowUploadDocModal(true)} className="bg-brand-ink text-brand-bg px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all">Submit Documentation</button>
                <button onClick={() => setShowProjectModal(true)} className="border border-brand-line/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-ink/5 transition-all">Request New Project</button>
              </div>
            </div>

            {/* Project Request Modal */}
            {showProjectModal && (
              <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full shadow-2xl border border-brand-line/20">
                  <h3 className="font-serif italic text-lg mb-2">New Project Request</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">Contractor Portal / Work Order Request</p>
                  <form onSubmit={handleRequestProject} className="space-y-4">
                    <div className="space-y-1">
                      <label className="col-header">Project Title</label>
                      <input type="text" required value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" placeholder="e.g. Zone B Excavation" />
                    </div>
                    <div className="space-y-1">
                      <label className="col-header">Location / Coordinates</label>
                      <input type="text" required value={newProject.location} onChange={e => setNewProject({ ...newProject, location: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm focus:ring-1 focus:ring-brand-ink outline-none" placeholder="e.g. Zone B, Plot 5" />
                    </div>
                    <div className="space-y-1">
                      <label className="col-header">Detailed Description</label>
                      <textarea required value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} className="w-full bg-brand-ink/5 p-3 text-sm h-24 focus:ring-1 focus:ring-brand-ink outline-none resize-none" placeholder="Outline the scope of work..." />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowProjectModal(false)} className="flex-1 border border-brand-line/20 py-3 font-bold uppercase tracking-widest text-[10px]">Back</button>
                      <button type="submit" disabled={actionLoading} className="flex-1 bg-brand-ink text-brand-bg py-3 font-bold uppercase tracking-widest text-[10px]">
                        {actionLoading ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-4 border-b border-brand-line/10 bg-brand-ink/5 flex justify-between items-center">
                  <h3 className="font-serif italic text-sm">Vendor Registry</h3>
                  <span className="text-[10px] font-bold opacity-30 uppercase">{contractors.length} ACTIVE</span>
                </div>
                <div className="p-0">
                  <table className="w-full text-left">
                    <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Vendor</th><th className="p-4 col-header">Category</th><th className="p-4 col-header">Status</th></tr></thead>
                    <tbody>
                      {contractors.map(c => (
                        <tr key={c.id} className="border-b border-brand-line/5">
                          <td className="p-4"><p className="text-sm font-bold">{c.name}</p><p className="text-[10px] opacity-50 uppercase">{c.representative}</p></td>
                          <td className="p-4 text-[10px] font-mono">{c.category}</td>
                          <td className="p-4"><span className="px-2 py-1 text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 rounded-full">{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-4 border-b border-brand-line/10 bg-brand-ink/5 flex justify-between items-center">
                  <h3 className="font-serif italic text-sm">Recent Document Submissions</h3>
                  <button onClick={() => window.print()} className="border border-brand-line/20 px-2 py-1 text-[9px] uppercase tracking-widest font-bold hover:bg-brand-ink/5 transition-colors">Export Logs</button>
                </div>
                <div className="p-0">
                  <table className="w-full text-left">
                    <thead><tr className="bg-brand-ink/5"><th className="p-4 col-header">Document</th><th className="p-4 col-header">Upload Date</th><th className="p-4 col-header">Status</th></tr></thead>
                    <tbody>
                      {contractorDocs.map(d => (
                        <tr key={d.id} className="border-b border-brand-line/5 text-xs">
                          <td className="p-4"><p className="font-bold">{d.doc_type}</p><p className="text-[10px] opacity-50 truncate max-w-[150px]">{d.file_name} - {d.contractor_name}</p></td>
                          <td className="p-4 font-mono opacity-60 text-[10px]">{d.upload_date}</td>
                          <td className="p-4 text-emerald-600 font-bold tracking-widest text-[9px] uppercase">{d.status}</td>
                        </tr>
                      ))}
                      {contractorDocs.length === 0 && <tr><td colSpan={3} className="p-8 text-center italic opacity-40">No documents recently filed.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-brand-line/10 rounded-sm overflow-hidden">
                <div className="p-4 border-b border-brand-line/10 flex justify-between items-center">
                  <h3 className="font-serif italic text-sm">Deployment & Projects</h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Live Status</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-brand-ink/5">
                        <th className="p-4 col-header">Project Title</th>
                        <th className="p-4 col-header">Assigned Vendor</th>
                        <th className="p-4 col-header">Location</th>
                        <th className="p-4 col-header">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map(wo => (
                        <tr key={wo.id} className="data-row">
                          <td className="p-4">
                            <div className="text-sm font-bold">{wo.title}</div>
                            <div className="text-[10px] opacity-50">{wo.description}</div>
                          </td>
                          <td className="p-4 text-xs">{wo.contractor_name}</td>
                          <td className="p-4 text-xs opacity-60">{wo.location}</td>
                          <td className="p-4">
                            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${wo.status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                              wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                                'bg-brand-ink/5 text-brand-ink/50'
                              }`}>
                              {wo.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {workOrders.length === 0 && <tr><td colSpan={4} className="p-8 text-center italic opacity-40">No active work orders.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <div className="p-20 text-center opacity-50 italic">Select a module to continue...</div>;
    }
  };

  if (!user) {
    if (authView === 'signup') return <SignupPage onSwitchToLogin={() => setAuthView('login')} />;
    if (authView === 'forgot') return <ForgotPasswordPage onSwitchToLogin={() => setAuthView('login')} />;
    return <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setAuthView('signup')} onSwitchToForgot={() => setAuthView('forgot')} />;
  }

  if (loading && !stats) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-brand-bg gap-4">
        <div className="w-12 h-12 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
        <p className="font-serif italic text-sm animate-pulse">Initializing OGFZA Digital Automation Infrastructure...</p>
      </div>
    );
  }

  const canAccess = (tab: string) => {
    if (hasRole('Admin')) return true;
    if (tab === 'dashboard') return true;
    if (tab === 'operations' && hasRole('Operations')) return true;
    if (tab === 'hr' && (hasRole('HR Manager') || hasRole('Operations'))) return true;
    if (tab === 'finance' && hasRole('Finance')) return true;
    if (tab === 'compliance' || tab === 'companies' || tab === 'incidents') {
      if (hasRole('Compliance')) return true;
    }
    if (tab === 'permits' && (hasRole('Compliance') || hasRole('Operations'))) return true;
    if (tab === 'logistics' && (hasRole('Operations') || hasRole('Admin'))) return true;
    if (tab === 'settings' && hasRole('Admin')) return true;
    if (tab === 'contractors' && (hasRole('Admin') || hasRole('Operations') || hasRole('Contractor'))) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      <Toaster />
      {/* Sidebar */}
      <aside className="w-64 border-r border-brand-line bg-white flex flex-col">
        <div className="p-6 border-b border-brand-line">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-brand-ink flex items-center justify-center rounded-sm">
              <TrendingUp size={14} className="text-brand-bg" />
            </div>
            <h1 className="font-bold tracking-tighter text-base">OGFZA_automation</h1>
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-40">Digital Automation v1.0</p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-2">
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2">Core Operations</p>
          </div>
          {canAccess('dashboard') && <SidebarItem icon={LayoutDashboard} label={!user.role.includes('Admin') && user.role.includes('HR Manager') ? 'HR Dashboard' : 'Executive Dashboard'} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />}
          {canAccess('companies') && <SidebarItem icon={Building2} label="Company Management" active={activeTab === 'companies'} onClick={() => setActiveTab('companies')} />}
          {canAccess('permits') && <SidebarItem icon={FileText} label="Permits & Approvals" active={activeTab === 'permits'} onClick={() => setActiveTab('permits')} />}
          {canAccess('operations') && <SidebarItem icon={Activity} label="Field Assets" active={activeTab === 'operations'} onClick={() => setActiveTab('operations')} />}
          {canAccess('compliance') && <SidebarItem icon={ShieldCheck} label="Compliance & Audit" active={activeTab === 'compliance'} onClick={() => setActiveTab('compliance')} />}
          {canAccess('compliance') && <SidebarItem icon={AlertTriangle} label="Safety & Incident Logs" active={activeTab === 'incidents'} onClick={() => setActiveTab('incidents')} />}

          {canAccess('logistics') && <SidebarItem icon={Package} label="Integrated Logistics" active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} />}
          {canAccess('finance') && <SidebarItem icon={DollarSign} label="Revenue & Finance" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />}
          {canAccess('settings') && <SidebarItem icon={Settings} label="Change Management" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />}
        </nav>

        <div className="p-4 border-t border-brand-line bg-brand-ink/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-ink text-brand-bg flex items-center justify-center text-xs font-bold">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold truncate max-w-[100px]">{user.fullName}</p>
                <p className="text-[10px] opacity-50">{user.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-brand-ink/10 transition-colors rounded-sm" title="Logout">
              <LogOut size={16} className="opacity-60" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-brand-line bg-white flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-60">
              {activeTab.replace('-', ' ')}
            </h2>
            <div className="h-4 w-[1px] bg-brand-line/20" />
            <div className="flex items-center gap-2 text-[10px] font-mono opacity-40">
              <Clock size={12} />
              <span>Unit: {user.operationalUnit}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <AlertCircle size={18} className="text-brand-ink opacity-40 cursor-pointer hover:opacity-100" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full border border-white" />
            </div>
            <button
              onClick={fetchData}
              className="text-xs font-bold uppercase tracking-widest border border-brand-line/20 px-4 py-2 hover:bg-brand-ink/5 transition-colors"
            >
              Sync Data
            </button>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-8">
          {user.mustChangePassword && <ChangePasswordModal onComplete={handleChangePassword} />}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
