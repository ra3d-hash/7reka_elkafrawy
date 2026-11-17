export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  android?: {
    allowMixedContent?: boolean;
    backgroundColor?: string;
  };
  server?: {
    androidScheme?: string;
  };
}

const config: CapacitorConfig = {
  appId: 'com.elarb.fitpro.ultra',
  appName: 'ELARB FitPro Ultra',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    backgroundColor: '#070a11',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
