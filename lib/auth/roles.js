export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
};

export function canViewTeamChats(role) {
  return role === 'admin' || role === 'manager';
}

export function canManageUsers(role) {
  return role === 'admin';
}

export function canManageKnowledge(role) {
  return role === 'admin';
}

export function canViewAllChats(role) {
  return role === 'admin';
}

export function isAdmin(role) {
  return role === 'admin';
}

export function isManagerOrAbove(role) {
  return role === 'admin' || role === 'manager';
}
