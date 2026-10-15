// Fallback configuration for Chung Family Washington Trip 2026
const DEFAULT_CONFIG = {
  projectId: 'gen-lang-client-0586063899',
  appId: '1:232307575365:web:f6bfca801d211595de312c',
  apiKey: '',
  authDomain: 'gen-lang-client-0586063899.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-chungfamilywashi-af2d6720-74fe-412d-b56b-f7269eb1a16c',
  storageBucket: 'gen-lang-client-0586063899.firebasestorage.app',
  messagingSenderId: '232307575365',
};

// Check if a local config file exists via Vite eager glob (does not fail if file is missing)
const localConfigs = import.meta.glob<{ default: Record<string, string> }>('/firebase-applet-config*.json', { eager: true });
const localFileConfig = localConfigs['/firebase-applet-config.json']?.default || localConfigs['/firebase-applet-config.example.json']?.default;

export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || localFileConfig?.apiKey || DEFAULT_CONFIG.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || localFileConfig?.authDomain || DEFAULT_CONFIG.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || localFileConfig?.projectId || DEFAULT_CONFIG.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || localFileConfig?.storageBucket || DEFAULT_CONFIG.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || localFileConfig?.messagingSenderId || DEFAULT_CONFIG.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || localFileConfig?.appId || DEFAULT_CONFIG.appId,
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || localFileConfig?.firestoreDatabaseId || DEFAULT_CONFIG.firestoreDatabaseId,
};
