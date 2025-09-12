import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7e4a45e4fe6b403e8e50d505bce0984e',
  appName: 'nutrifit2',
  webDir: 'dist',
  server: {
    url: 'https://7e4a45e4-fe6b-403e-8e50-d505bce0984e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffffff',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;