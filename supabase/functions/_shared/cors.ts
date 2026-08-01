// Every edge function that's called directly from the browser (as opposed
// to server-to-server) needs this: without it, the browser's CORS
// preflight (an OPTIONS request) gets no Access-Control-Allow-* headers
// back, fails silently, and the browser never even sends the real
// request - which is exactly what "Failed to send a request to the Edge
// Function" on the client means. It's not an error the function logs,
// because the function's own logic never runs for a rejected preflight.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
