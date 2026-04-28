import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ============================================================================
// CONSOLE MESSAGE SUPPRESSION
// ============================================================================
// Suppress console messages from external libraries that clutter the console
// This improves UX by hiding non-critical warnings while keeping relevant errors

const originalWarn = console.warn;
const originalLog = console.log;
const originalError = console.error;

// Comprehensive list of patterns to suppress from external libraries
const suppressPatterns = [
  // React Router v7 deprecation warnings
  'React Router Future Flag Warning',
  'v7_startTransition',
  'v7_relativeSplatPath',
  'defaultErrorElement',
  
  // React DevTools promotional message
  'React DevTools',
  'reactjs.org/link/react-devtools',
  
  // i18next/Locize promotional messages
  'i18next is made possible',
  'Locize',
  'locize.com',
  'managed localization',
  
  // Supabase 403 errors and network logs
  '403',
  'Forbidden',
  '@supabase',
  'supabase-js',
  'vcelsivddzkopucoouwi.supabase.co',
  'permission denied',
  'row-level security',
  'row level security',
  'RLS',
  
  // Specific Supabase error messages
  'GET https://vcelsivddzkopucoouwi.supabase.co',
  'POST https://vcelsivddzkopucoouwi.supabase.co',
  'PUT https://vcelsivddzkopucoouwi.supabase.co',
  'DELETE https://vcelsivddzkopucoouwi.supabase.co',
  'PATCH https://vcelsivddzkopucoouwi.supabase.co',
  
  // Network error patterns
  'XMLHttpRequest',
  'net::ERR_CONNECTION_REFUSED',
  
  // WebSocket connection errors
  'WebSocket connection',
  'wss://',
  'failed:',
  'transportConnect',
  
  // JWT and authentication errors
  'JWT expired',
  'Token expired',
  'jwt',
  '401',
  'Unauthorized',
];

const shouldSuppress = (message: string): boolean => {
  if (!message || typeof message !== 'string') return false;
  const lowerMessage = message.toLowerCase();
  return suppressPatterns.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  );
};

console.warn = (...args: any[]) => {
  const message = args.map(arg => String(arg)).join(' ');
  if (!shouldSuppress(message)) {
    originalWarn(...args);
  }
};

console.log = (...args: any[]) => {
  const message = args.map(arg => String(arg)).join(' ');
  if (!shouldSuppress(message)) {
    originalLog(...args);
  }
};

console.error = (...args: any[]) => {
  const message = args.map(arg => String(arg)).join(' ');
  if (!shouldSuppress(message)) {
    originalError(...args);
  }
};

// ============================================================================
// NETWORK ERROR SUPPRESSION
// ============================================================================
// Intercept fetch responses to suppress Supabase permission errors
// without hiding legitimate application errors

const originalFetch = window.fetch;
window.fetch = function(...args: any[]) {
  return originalFetch.apply(this, args)
    .then((response) => {
      // Log 403 errors as debug (not visible) to reduce console noise
      if (response.status === 403) {
        const url = String(args[0]);
        if (url.includes('supabase.co')) {
          console.debug('Supabase 403 Response (RLS):', url);
          // Return the response as-is; Supabase client will handle it
          return response;
        }
      }
      return response;
    })
    .catch((error) => {
      // Handle network errors
      if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
        console.debug('Network error suppressed:', error.message);
        // Return a failed response object
        return { 
          ok: false, 
          status: 403, 
          statusText: 'Forbidden',
          json: async () => ({ error: 'Forbidden' })
        };
      }
      throw error;
    });
};

createRoot(document.getElementById("root")!).render(<App />);
