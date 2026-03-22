'use server';

import { hashSync, genSaltSync } from 'bcrypt-ts';
import { auth } from './index.js';
import {
  createFirstUser,
  createUser,
  getUsers,
  deleteUser,
  getUserByEmail,
  getUserCount,
  updateUserEmail,
  updateUserRole,
  updateUserPasswordById,
  verifyPassword,
} from '../db/users.js';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'admin') throw new Error('Forbidden');
  return user;
}

/**
 * Create the first admin user (setup action).
 * Uses atomic createFirstUser() to prevent race conditions.
 * No session/token is created -- the admin must log in through the normal auth flow.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success?: boolean, error?: string }>}
 */
export async function setupAdmin(email, password) {
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  try {
    const passwordHash = hashSync(password, genSaltSync(10));
    await createFirstUser({ email, passwordHash });
    return { success: true };
  } catch (err) {
    if (err.message === 'Users already exist') {
      return { error: 'Setup already completed.' };
    }
    return { error: err.message };
  }
}

/**
 * Get all users.
 */
export async function getAllUsers() {
  await requireAdmin();
  return await getUsers();
}

/**
 * Add a new user.
 */
export async function addUser(email, password, role) {
  await requireAdmin();

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Invalid email format.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  try {
    const passwordHash = hashSync(password, genSaltSync(10));
    const user = await createUser({ email, passwordHash, role: role || 'member' });
    return { success: true };
  } catch (err) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return { error: 'A user with this email already exists.' };
    }
    return { error: 'Failed to create user.' };
  }
}

/**
 * Edit a user's email and/or role.
 */
export async function editUser(id, { email, role }) {
  const user = await requireAdmin();

  if (role !== undefined && id === user.id) {
    return { error: 'Cannot change your own role.' };
  }

  try {
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Invalid email format.' };
      }
      await updateUserEmail(id, email);
    }
    if (role !== undefined) {
      await updateUserRole(id, role);
    }
    return { success: true };
  } catch (err) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return { error: 'A user with this email already exists.' };
    }
    return { error: 'Failed to update user.' };
  }
}

/**
 * Remove a user.
 */
export async function removeUser(id) {
  const user = await requireAdmin();

  if (id === user.id) {
    return { error: 'Cannot delete yourself.' };
  }

  try {
    await deleteUser(id);
    return { success: true };
  } catch (err) {
    return { error: 'User not found.' };
  }
}

/**
 * Reset a user's password.
 */
export async function resetPassword(id, newPassword) {
  await requireAdmin();

  if (!newPassword || newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  try {
    await updateUserPasswordById(id, newPassword);
    return { success: true };
  } catch (err) {
    return { error: 'User not found.' };
  }
}

/**
 * Update the current user's own email and/or password.
 * Requires current password for verification.
 */
export async function updateProfile({ email, currentPassword, newPassword }) {
  const sessionUser = await requireAuth();

  if (!currentPassword) {
    return { error: 'Current password is required.' };
  }

  const user = await getUserByEmail(sessionUser.email);
  if (!user) {
    return { error: 'User not found.' };
  }

  const valid = await verifyPassword(user, currentPassword);
  if (!valid) {
    return { error: 'Current password is incorrect.' };
  }

  try {
    if (email !== undefined && email !== sessionUser.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Invalid email format.' };
      }
      await updateUserEmail(user.id, email);
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return { error: 'New password must be at least 8 characters.' };
      }
      await updateUserPasswordById(user.id, newPassword);
    }

    return { success: true };
  } catch (err) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return { error: 'A user with this email already exists.' };
    }
    return { error: 'Failed to update profile.' };
  }
}
