/**
 * Generates a short, human-readable ID for a project or issue.
 * Pattern: [PREFIX]-[2-CHARS-OF-UUID]
 * Example: TEC-F1, ISS-A2
 */

export function generateShortId(name: string, id: string, type: 'project' | 'issue' = 'project'): string {
    if (!id) return '---';
    
    let prefix = '';
    if (type === 'project') {
        // Take first 3 chars of project name, or 'PRO' if too short
        prefix = name?.substring(0, 3).toUpperCase() || 'PRO';
    } else {
        // Usually we'd want the project code here, but if we only have issue name, use 'ISS'
        prefix = 'ISS';
    }
    
    // Take first 2 chars of UUID (after removing non-alphanumeric if needed, but UUIDs are fine)
    const shortUuid = id.replace(/-/g, '').substring(0, 2).toUpperCase();
    
    return `${prefix}-${shortUuid}`;
}

/**
 * Specifically for issues that have access to their project's name.
 */
export function generateIssueId(projectName: string | undefined, issueId: string): string {
    const prefix = projectName?.substring(0, 3).toUpperCase() || 'KAP';
    const shortUuid = issueId.replace(/-/g, '').substring(0, 2).toUpperCase();
    return `${prefix}-${shortUuid}`;
}
