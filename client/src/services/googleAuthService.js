import { auth, googleProvider } from '@/firebase/firebase';
import { signInWithPopup, signOut, updateProfile } from 'firebase/auth';

export const mapFirebaseAuthError = (error) => {
  const messages = {
    'auth/popup-closed-by-user': 'Google sign-in popup was closed. Please try again when you are ready.',
    'auth/cancelled-popup-request': 'Another Google sign-in popup is already open.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Please allow popups and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email. Try signing in with your original method.',
    'auth/user-disabled': 'This Google account has been disabled for this app.',
    'auth/operation-not-allowed': 'Google Sign-In is not enabled in Firebase Authentication.',
    'auth/invalid-api-key': 'Firebase API key is invalid. Please check your Firebase configuration.',
    'auth/invalid-app-credential': 'Firebase app credentials are invalid. Please check your Firebase configuration.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.',
    'auth/too-many-requests': 'Too many sign-in attempts. Please wait and try again.'
  };
  return messages[error?.code] || error?.message || 'Google sign-in failed. Please try again.';
};

export const signInWithGooglePopup = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    const idToken = await firebaseUser.getIdToken();

    return {
      idToken,
      profile: {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || '',
        provider: 'google'
      }
    };
  } catch (error) {
    error.friendlyMessage = mapFirebaseAuthError(error);
    throw error;
  }
};

export const updateGoogleDisplayName = async ({ displayName, photoURL }) => {
  if (!auth.currentUser) return false;
  await updateProfile(auth.currentUser, {
    displayName,
    photoURL: photoURL || auth.currentUser.photoURL || undefined
  });
  return true;
};

export const syncFirebaseUserProfile = async () => false;

export const logoutGoogle = async () => {
  await signOut(auth);
};
