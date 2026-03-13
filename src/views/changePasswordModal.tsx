import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export const ChangePasswordModal = ({ onComplete }: { onComplete: (newPassword: string) => void }) => {
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