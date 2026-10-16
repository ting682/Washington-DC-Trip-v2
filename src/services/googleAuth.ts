import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { firebaseConfig } from '../config/firebaseConfig';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const PHOTOS_SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
];

export const BASIC_SCOPES = [
  'profile',
  'email',
];

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (options?: {
  promptAccountSelect?: boolean;
  loginHint?: string;
  requestPhotosScope?: boolean;
}): Promise<{ user: User; accessToken: string } | null> => {
  // Default to non-sensitive BASIC_SCOPES (profile, email) so Google OAuth does not block the app
  // with "Access blocked: has not completed the Google verification process"
  const tryScopes = options?.requestPhotosScope === true ? [...PHOTOS_SCOPES, ...BASIC_SCOPES] : BASIC_SCOPES;

  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    tryScopes.forEach(scope => provider.addScope(scope));

    const customParams: Record<string, string> = {
      prompt: options?.promptAccountSelect === false ? 'consent' : 'select_account',
    };
    if (options?.loginHint) {
      customParams.login_hint = options.loginHint;
    }
    provider.setCustomParameters(customParams);

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || '';

    cachedAccessToken = token;
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.warn('Initial Google Sign-In error:', error?.code || error?.message);

    // If Google blocked the sensitive photos scope (e.g. invalid_scope or 400),
    // retry once with standard profile and email scopes so the user can still connect!
    if (
      options?.requestPhotosScope !== false &&
      (error?.code === 'auth/invalid-scope' ||
        error?.message?.includes('scope') ||
        error?.message?.includes('invalid_scope') ||
        error?.code === 'auth/internal-error')
    ) {
      console.info('Retrying Google sign-in with basic profile scope...');
      return googleSignIn({ ...options, requestPhotosScope: false });
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
