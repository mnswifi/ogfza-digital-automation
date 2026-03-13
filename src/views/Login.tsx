import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    AlertCircle,
    Mail,
    Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '@/middleware/types.middleware';

export const LoginPage = ({ onLogin, onSwitchToSignup, onSwitchToForgot }: { onLogin: (user: User, token: string) => void, onSwitchToSignup: () => void, onSwitchToForgot: () => void }) => {
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