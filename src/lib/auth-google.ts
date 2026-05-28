import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db } from './db';
import { signInWithOAuth } from './oauth';

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let configured = false;
let googleSignInModulePromise: Promise<GoogleSignInModule> | null = null;

export function googleInstantClientName(os = Platform.OS): 'google-ios' | 'google-android' {
  if (os === 'ios') return 'google-ios';
  if (os === 'android') return 'google-android';
  throw new Error(`Google native sign-in is not supported on ${os}`);
}

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

function isMissingNativeGoogleModuleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('RNGoogleSignin') ||
    message.includes('TurboModuleRegistry') ||
    message.includes('could not be found')
  );
}

function googleNativeBuildError() {
  return new Error(
    'Google sign-in is not included in the installed app build. Rebuild and reinstall the iOS/Android development build after adding @react-native-google-signin/google-signin, then restart Metro with npx expo start --dev-client -c.'
  );
}

async function getGoogleSigninModule() {
  try {
    googleSignInModulePromise ??= import('@react-native-google-signin/google-signin');
    return await googleSignInModulePromise;
  } catch (error) {
    googleSignInModulePromise = null;
    if (isMissingNativeGoogleModuleError(error)) {
      throw googleNativeBuildError();
    }
    throw error;
  }
}

function configureGoogleSignin({ GoogleSignin }: GoogleSignInModule) {
  if (configured) return;

  try {
    GoogleSignin.configure({
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
      ...(GOOGLE_WEB_CLIENT_ID ? { webClientId: GOOGLE_WEB_CLIENT_ID } : {}),
    });
  } catch (error) {
    if (isMissingNativeGoogleModuleError(error)) {
      throw googleNativeBuildError();
    }
    throw error;
  }

  configured = true;
}

export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS === 'web') {
    await signInWithOAuth('google');
    return;
  }

  if (isExpoGo()) {
    await signInWithOAuth('google');
    return;
  }

  const clientName = googleInstantClientName();
  const googleSignin = await getGoogleSigninModule();

  configureGoogleSignin(googleSignin);

  if (Platform.OS === 'android') {
    await googleSignin.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const response = await googleSignin.GoogleSignin.signIn();
  if (googleSignin.isCancelledResponse(response)) return;

  if (!googleSignin.isSuccessResponse(response)) {
    throw new Error('Google sign-in did not complete');
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error(
      'Google did not return an ID token. Confirm the native Google client setup and set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for Android builds.'
    );
  }

  await db.auth.signInWithIdToken({
    clientName,
    idToken,
  });
}
