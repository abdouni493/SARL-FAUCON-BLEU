import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const originalWarn = console.warn;
const originalLog = console.log;
const originalError = console.error;

const suppressPatterns = [
  'React Router Future Flag Warning',
  'v7_startTransition',
  'v7_relativeSplatPath',
  'defaultErrorElement',
  'React DevTools',
  'reactjs.org/link/react-devtools',
  'i18next is made possible',
  'Locize',
  'locize.com',
  'managed localization',
  'Forbidden',
  '@supabase',
  'supabase-js',
  'vcelsivddzkopucoouwi.supabase.co',
  'drvngvfijnvyazxqebto.supabase.co',
  'permission denied',
  'row-level security',
  'row level security',
  'RLS',
  'GET https://vcelsivddzkopucoouwi.supabase.co',
  'POST https://vcelsivddzkopucoouwi.supabase.co',
  'PUT https://vcelsivddzkopucoouwi.supabase.co',
  'DELETE https://vcelsivddzkopucoouwi.supabase.co',
  'PATCH https://vcelsivddzkopucoouwi.supabase.co',
  'GET https://drvngvfijnvyazxqebto.supabase.co',
  'POST https://drvngvfijnvyazxqebto.supabase.co',
  'PUT https://drvngvfijnvyazxqebto.supabase.co',
  'DELETE https://drvngvfijnvyazxqebto.supabase.co',
  'PATCH https://drvngvfijnvyazxqebto.supabase.co',
  '/auth/v1/token',
  'net::ERR_CONNECTION_REFUSED',
  'WebSocket connection',
  'wss://',
  'transportConnect',
  'JWT expired',
  'Token expired',
  'jwt',
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
  if (!shouldSuppress(message)) originalWarn(...args);
};

console.log = (...args: any[]) => {
  const message = args.map(arg => String(arg)).join(' ');
  if (!shouldSuppress(message)) originalLog(...args);
};

console.error = (...args: any[]) => {
  const message = args.map(arg => String(arg)).join(' ');
  if (!shouldSuppress(message)) originalError(...args);
};

const originalGroup = console.group;
const originalGroupCollapsed = console.groupCollapsed;

console.group = function (...args: any[]) {
  const message = args.map(arg => String(arg)).join(' ');
  if (!shouldSuppress(message)) originalGroup.apply(console, args);
};

console.groupCollapsed = function (...args: any[]) {
  const message = args.map(arg => String(arg)).join(' ');
  if (!shouldSuppress(message)) originalGroupCollapsed.apply(console, args);
};

// Intercept fetch to handle Supabase auth failures gracefully
const originalFetch = window.fetch;
window.fetch = function (...args: Parameters<typeof fetch>) {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  const isSupabaseCall = url.includes('supabase.co');
  const isAuthEndpoint = url.includes('/auth/v1/token');

  return originalFetch.apply(this, args)
    .then((response) => {
      // If /auth/v1/token returns 5xx, convert to 503 so Supabase treats it as unavailable
      if (isAuthEndpoint && response.status >= 500) {
        return new Response(JSON.stringify({ error: 'Service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return response; // pass through untouched
    })
    .catch((error: Error) => {
      if (isSupabaseCall) {
        return new Response(JSON.stringify({ error: 'Service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    });
};

window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason);
  if (shouldSuppress(message)) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);