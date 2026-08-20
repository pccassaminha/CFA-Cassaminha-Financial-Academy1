/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './pages/Login';
import StudentDirectory from './pages/StudentDirectory';
import VideoLibrary from './pages/VideoLibrary';
import StudentPortal from './pages/StudentPortal';
import PendingSubscription from './pages/PendingSubscription';
import SalesPage from './pages/SalesPage';
import Checkout from './pages/Checkout';
import PurchaseConfirmation from './pages/PurchaseConfirmation';
import Dashboard from './pages/Dashboard';
import ContentManager from './pages/ContentManager';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsStudent, setViewAsStudent] = useState(() => {
    return localStorage.getItem('viewAsStudent') === 'true';
  });

  useEffect(() => {
    const handleToggle = () => {
      setViewAsStudent(localStorage.getItem('viewAsStudent') === 'true');
    };
    window.addEventListener('student-view-changed', handleToggle);
    return () => window.removeEventListener('student-view-changed', handleToggle);
  }, []);

  const isMasterEmail = (email?: string | null) => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return clean === 'grupocassaminha@gmail.com' || clean === 'exportacoes.extras@gmail.com';
  };

  const isAdminEmail = isMasterEmail(userProfile?.email) || isMasterEmail(user?.email);
  const isReallyAdmin = userProfile?.role === 'admin' || userProfile?.role === 'producer' || isAdminEmail;
  const effectiveRole = (isReallyAdmin && viewAsStudent) ? 'student' : (isReallyAdmin ? 'admin' : userProfile?.role);
  const effectiveStatus = (isReallyAdmin && viewAsStudent) ? 'active' : (isReallyAdmin ? 'active' : userProfile?.subscriptionStatus);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(userRef, async (snap) => {
          const isMaster = isMasterEmail(currentUser.email);
          if (snap.exists()) {
            const data = snap.data();
            if (isMaster && (data.role !== 'admin' || data.subscriptionStatus !== 'active')) {
              setUserProfile({ ...data, role: 'admin', subscriptionStatus: 'active', roleType: 'admin' });
              try {
                await setDoc(userRef, { role: 'admin', subscriptionStatus: 'active', roleType: 'admin' }, { merge: true });
              } catch (e) {
                console.error("Failed to correct admin privileges in firestore:", e);
              }
            } else {
              setUserProfile(data);
            }
          } else {
            if (isMaster) {
              const masterProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                role: 'admin',
                roleType: 'admin',
                subscriptionStatus: 'active'
              };
              setUserProfile(masterProfile);
              try {
                await setDoc(userRef, masterProfile);
              } catch (e) {
                console.error("Failed to create admin profile in firestore:", e);
              }
            } else {
              setUserProfile(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error loading user profile:", error);
          if (isMasterEmail(currentUser.email)) {
            setUserProfile({
              uid: currentUser.uid,
              email: currentUser.email,
              role: 'admin',
              subscriptionStatus: 'active'
            });
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {isReallyAdmin && viewAsStudent && (
        <div style={{ zIndex: 9999 }} className="fixed top-0 left-0 right-0 h-12 bg-gradient-to-r from-[#e9c349] to-amber-500 text-[#0e0e0e] flex items-center justify-between px-6 shadow-xl font-headline font-bold text-sm select-none">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl animate-pulse">visibility</span>
            <span>Você está navegando com a <strong className="underline">Visão de Aluno (Marketplace & Cursos)</strong>.</span>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('viewAsStudent', 'false');
              window.dispatchEvent(new Event('student-view-changed'));
              window.location.href = '/dashboard';
            }}
            className="bg-[#0e0e0e] text-[#e9c349] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-zinc-900 transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            Voltar para Admin
          </button>
        </div>
      )}
      <div className={isReallyAdmin && viewAsStudent ? "pt-12 min-h-screen" : "min-h-screen"}>
        <Routes>
          <Route 
            path="/" 
            element={
              !user ? <Login /> : (
                (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Navigate to="/dashboard" replace /> :
                effectiveStatus === 'active' ? <Navigate to="/library" replace /> :
                <Navigate to="/pending" replace />
              )
            } 
          />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirmation" element={<PurchaseConfirmation />} />
          
          <Route 
            path="/dashboard" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Dashboard /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/directory" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <StudentDirectory /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/content" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <ContentManager /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/analytics" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Analytics /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/settings" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Settings /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/" replace />} 
          />
          
          <Route 
            path="/library" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer' || effectiveStatus === 'active') ? <StudentPortal /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/portal" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer' || effectiveStatus === 'active') ? <StudentPortal /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/classroom" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer' || effectiveStatus === 'active') ? <VideoLibrary /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/pending" 
            element={
              user ? (
                (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Navigate to="/dashboard" replace /> :
                effectiveStatus === 'active' ? <Navigate to="/library" replace /> :
                <PendingSubscription />
              ) : <Navigate to="/" replace />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
