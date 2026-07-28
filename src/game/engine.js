// The canonical engine lives under supabase/functions/_shared/ because
// that's the one location both the Vite app *and* the apply-action Edge
// Function can both reach: Supabase's CLI only bundles what's inside
// supabase/functions/ when deploying, so the shared rules engine has to
// live there - this file just re-exports it under a nicer app-side path
// so the rest of src/ doesn't need to know that.
export * from "./../../supabase/functions/_shared/engine.js";
