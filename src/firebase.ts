import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export interface NewStudentPayload {
  firstName: string;
  lastName: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  enrolledCourses?: string[];
  plan?: string;
}

export const adminCreateStudentAccount = async (
  email: string, 
  pass: string, 
  studentData: NewStudentPayload
) => {
  const secondaryAppName = `SecondaryApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), pass);
    const newUid = userCredential.user.uid;

    const userRef = doc(db, 'users', newUid);
    await setDoc(userRef, {
      uid: newUid,
      email: email.trim().toLowerCase(),
      firstName: studentData.firstName.trim(),
      lastName: studentData.lastName.trim(),
      phoneCountryCode: studentData.phoneCountryCode || '+244',
      phoneNumber: studentData.phoneNumber || '',
      role: 'student',
      roleType: 'student',
      subscriptionStatus: 'active',
      enrolledCourses: studentData.enrolledCourses || [],
      plan: studentData.plan || 'Aluno Matriculado',
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || 'admin'
    });

    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);

    return { uid: newUid, email: email.trim() };
  } catch (error: any) {
    try {
      await deleteApp(secondaryApp);
    } catch (_) {}
    console.error('Error creating student account as admin:', error);
    throw error;
  }
};

export const sendResetEmail = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email', error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Error signing in with email', error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Error registering with email', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
    throw error;
  }
};
