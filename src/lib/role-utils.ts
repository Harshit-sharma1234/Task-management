/**
 * Shared role utilities.
 * Single source of truth for role → URL path mapping.
 * Previously duplicated in 5 files.
 */

/**
 * Convert a role name to a URL-safe path segment.
 */
export function getRolePath(roleName: string): string {
  switch (roleName) {
    case 'Admin': return 'admin'
    case 'Project Manager': return 'project-manager'
    case 'Senior Developer': return 'senior-developer'
    case 'Junior Developer': return 'junior-developer'
    default: return 'junior-developer'
  }
}
