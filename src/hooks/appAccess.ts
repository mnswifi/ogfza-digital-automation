import { User } from '@/middleware/types.middleware';

const getRoles = (user: User | null) => {
    if (!user) return [];
    return user.role.split(',').map((role) => role.trim());
};

export const hasRole = (user: User | null, roleNeeded: string) => {
    const roles = getRoles(user);

    if (roles.includes('Admin')) return true;

    return roles.includes(roleNeeded);
};

export const canAccessTab = (user: User | null, tab: string) => {
    const roles = getRoles(user);
    const isAdmin = roles.includes('Admin');
    const isContractor = roles.includes('Contractor');

    if (isAdmin) return true;

    if (tab === 'dashboard') return !isContractor;
    if (tab === 'operations' && hasRole(user, 'Operations')) return true;
    if (tab === 'hr' && (hasRole(user, 'HR Manager') || hasRole(user, 'Operations'))) return true;
    if (tab === 'finance' && hasRole(user, 'Finance')) return true;
    if (tab === 'companies' && (hasRole(user, 'Compliance') || isContractor)) return true;
    if (tab === 'trade-operations' && (hasRole(user, 'Compliance') || isContractor)) return true;

    if (tab === 'compliance' && (hasRole(user, 'Compliance') || isContractor)) return true;
    if (tab === 'incidents' && (hasRole(user, 'Compliance') || isContractor)) return true;

    if (tab === 'logistics' && (hasRole(user, 'Operations') || hasRole(user, 'Admin'))) return true;
    if (tab === 'settings' && hasRole(user, 'Admin')) return true;

    return false;
};
