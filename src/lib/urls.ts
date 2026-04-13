/**
 * Returns the base URL for the application.
 * logic:
 * 1. NEXT_PUBLIC_APP_URL (Explicitly set by user)
 * 2. VERCEL_URL (Automatically set by Vercel for preview/production)
 * 3. Fallback to localhost:3000
 */
export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}
