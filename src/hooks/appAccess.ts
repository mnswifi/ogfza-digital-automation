import { User } from '@/middleware/types.middleware';

export const hasRole = (user: User | null, roleNeeded: string) => {
    if (!user) return false;

    const roles = user.role.split(',').map((role) => role.trim());

    if (roles.includes('Admin')) return true;

    return roles.includes(roleNeeded);
};

export const canAccessTab = (user: User | null, tab: string) => {
    if (hasRole(user, 'Admin')) return true;

    if (tab === 'dashboard') return true;
    if (tab === 'operations' && hasRole(user, 'Operations')) return true;
    if (tab === 'hr' && (hasRole(user, 'HR Manager') || hasRole(user, 'Operations'))) return true;
    if (tab === 'finance' && hasRole(user, 'Finance')) return true;

    if (tab === 'compliance' || tab === 'companies' || tab === 'incidents') {
        if (hasRole(user, 'Compliance')) return true;
    }

    if (tab === 'permits' && (hasRole(user, 'Compliance') || hasRole(user, 'Operations'))) return true;
    if (tab === 'logistics' && (hasRole(user, 'Operations') || hasRole(user, 'Admin'))) return true;
    if (tab === 'settings' && hasRole(user, 'Admin')) return true;
    if (tab === 'contractors' && (hasRole(user, 'Admin') || hasRole(user, 'Operations') || hasRole(user, 'Contractor'))) return true;

    return false;
};