import React, { useState, useEffect } from 'react';
import {
    Mail,
    Lock,
    ShieldCheck,
    UserIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '@/middleware/types.middleware';

export const SignupPage = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
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