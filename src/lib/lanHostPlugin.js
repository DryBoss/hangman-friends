import { registerPlugin } from "@capacitor/core";

// Native Android plugin - see android/.../LanHostPlugin.java. Only ever
// used by whichever device chooses "Host" for local-network play. The web
// fallback below just means the app doesn't crash if this runs somewhere
// the native plugin isn't registered (a browser tab, an iOS build) - it
// simply can't host from there, which LanHostSetup surfaces as an error
// rather than a crash.
const LanHost = registerPlugin("LanHost", {
  web: () => ({
    async start() {
      throw new Error("Hosting a local-network room needs the Android app - it isn't available in a browser.");
    },
    async stop() {},
    async send() {},
    async getStatus() {
      return { ipAddress: null, port: null, running: false };
    },
  }),
});

export default LanHost;
