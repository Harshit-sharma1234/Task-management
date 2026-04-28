import { getBaseUrl } from './src/lib/urls.js'

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'https://custom.com'
console.log('Test 1 (Explicit APP_URL):', getBaseUrl() === 'https://custom.com' ? 'PASS' : 'FAIL')

delete process.env.NEXT_PUBLIC_APP_URL
process.env.VERCEL_URL = 'preview.vercel.app'
console.log('Test 2 (VERCEL_URL):', getBaseUrl() === 'https://preview.vercel.app' ? 'PASS' : 'FAIL')

delete process.env.VERCEL_URL
console.log('Test 3 (Fallback):', getBaseUrl() === 'http://localhost:3000' ? 'PASS' : 'FAIL')
