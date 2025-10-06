/**
 * Firebase Polyfills for Next.js
 * Fixes XMLHttpRequest compatibility issues
 */

// Polyfill for XMLHttpRequest in Next.js environment
if (typeof window !== 'undefined' && !window.XMLHttpRequest) {
  // This should not be needed in modern browsers, but just in case
  console.warn('XMLHttpRequest not found, this should not happen in modern browsers')
}

// Ensure Firebase can find XMLHttpRequest
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.XMLHttpRequest = global.XMLHttpRequest || (typeof window !== 'undefined' ? window.XMLHttpRequest : undefined)
}

export {}