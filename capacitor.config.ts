import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dc95ae5b5e1f495781885e317397c59c',
  appName: 'light-event-hub',
  webDir: 'dist',
  server: {
    url: 'https://dc95ae5b-5e1f-4957-8188-5e317397c59c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    BarcodeScanner: {
      // Add any configuration if needed
    }
  }
};

export default config;