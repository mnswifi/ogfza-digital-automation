import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
} from 'lucide-react';

export const ForgotPasswordPage = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
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