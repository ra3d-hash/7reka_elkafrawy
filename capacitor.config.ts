import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elarb.fitpro.ultra',
  appName: 'ELARB FitPro Ultra',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
