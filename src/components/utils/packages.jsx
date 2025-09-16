import { useState, useEffect } from 'react';
import { Package } from '@/api/entities';
import { User } from '@/api/entities';

export async function listPackagesByRole(role) {
  try {
    const packages = await Package.filter({ role, status: 'active' });
    return packages;
  } catch (error) {
    console.error(`Failed to list packages for role ${role}:`, error);
    return [];
  }
}

export async function assignPackageToUser(userId, packageId, billingCycle) {
  try {
    const assigned_at = new Date();
    let expires_at = null;

    if (billingCycle === 'monthly') {
      expires_at = new Date(assigned_at);
      expires_at.setMonth(expires_at.getMonth() + 1);
    } else if (billingCycle === 'annual') {
      expires_at = new Date(assigned_at);
      expires_at.setFullYear(expires_at.getFullYear() + 1);
    }

    const updatedUser = await User.update(userId, {
      package_assignment: {
        package_id: packageId,
        assigned_at: assigned_at.toISOString(),
        expires_at: expires_at ? expires_at.toISOString() : null,
      }
    });

    return { data: updatedUser };
  } catch (error) {
    console.error(`Failed to assign package ${packageId} to user ${userId}:`, error);
    return { error: 'Failed to assign package.' };
  }
}

export function usePackages(role) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!role) {
      setLoading(false);
      return;
    }

    const fetchPackages = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listPackagesByRole(role);
        setPackages(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [role]);

  return { packages, loading, error };
}