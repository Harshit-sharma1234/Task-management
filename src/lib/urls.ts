/**
 * Returns the base URL for the application.
 * logic:
 * 1. NEXT_PUBLIC_APP_URL (Explicitly set by user)
 * 2. VERCEL_URL (Automatically set by Vercel for preview/production)
 * 3. Fallback to localhost:3000
 */
export function getBaseUrl() {
  let baseUrl = '';

  if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    baseUrl = 'http://localhost:3000';
  }

  // Ensure it's a valid URL format for metadataBase
  if (!baseUrl.startsWith('http')) {
    console.warn(`[getBaseUrl] Invalid URL detected: "${baseUrl}". Falling back to localhost.`);
    return 'http://localhost:3000';
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}
