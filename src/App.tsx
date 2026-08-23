/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { subscribeUserEnrollments } from './services/enrollmentService';
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
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

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
        unsubscribeProfile = subscribeUserEnrollments(currentUser, (enrollData) => {
          const isMaster = isMasterEmail(currentUser.email);
          let baseProfile = enrollData.userProfile || {};

          if (isMaster) {
            baseProfile = {
              ...baseProfile,
              uid: currentUser.uid,
              email: currentUser.email,
              role: 'admin',
              roleType: 'admin',
              subscriptionStatus: 'active'
            };
          }

          setUserProfile({
            ...baseProfile,
            enrolledCourses: enrollData.enrolledCourses,
            completedLessons: enrollData.completedLessons,
            subscriptionStatus: isMaster ? 'active' : (baseProfile.subscriptionStatus || enrollData.subscriptionStatus)
          });
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
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
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<SalesPage />} />
          
          <Route 
            path="/entrar" 
            element={
              !user ? <Login /> : (
                (effectiveRole === 'admin' || effectiveRole === 'producer') ? (
                  (effectiveStatus === 'pending_approval' || (userProfile?.isApproved === false && !isAdminEmail))
                    ? <Navigate to="/pending" replace />
                    : <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/library" replace />
                )
              )
            } 
          />
          
          <Route 
            path="/criar-conta" 
            element={
              !user ? <Login /> : (
                (effectiveRole === 'admin' || effectiveRole === 'producer') ? (
                  (effectiveStatus === 'pending_approval' || (userProfile?.isApproved === false && !isAdminEmail))
                    ? <Navigate to="/pending" replace />
                    : <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/library" replace />
                )
              )
            } 
          />

          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirmation" element={<PurchaseConfirmation />} />
          
          <Route 
            path="/dashboard" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Dashboard /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/entrar" replace />} 
          />
          <Route 
            path="/directory" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <StudentDirectory /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/entrar" replace />} 
          />
          <Route 
            path="/content" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <ContentManager /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/entrar" replace />} 
          />
          <Route 
            path="/analytics" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Analytics /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/entrar" replace />} 
          />
          <Route 
            path="/settings" 
            element={user && (effectiveRole === 'admin' || effectiveRole === 'producer') ? <Settings /> : (isReallyAdmin && viewAsStudent) ? <Navigate to="/library" replace /> : <Navigate to="/entrar" replace />} 
          />
          
          <Route 
            path="/library" 
            element={user ? <StudentPortal /> : <Navigate to="/entrar" replace />} 
          />
          <Route 
            path="/library/:slug" 
            element={user ? <StudentPortal /> : <Navigate to="/entrar" replace />} 
          />
          <Route 
            path="/portal" 
            element={user ? <StudentPortal /> : <Navigate to="/entrar" replace />} 
          />
          <Route 
            path="/classroom" 
            element={
              user && (
                effectiveRole === 'admin' || 
                effectiveRole === 'producer' || 
                (userProfile?.enrolledCourses && userProfile.enrolledCourses.length > 0) || 
                effectiveStatus === 'active'
              ) ? <VideoLibrary /> : <Navigate to="/library" replace />
            } 
          />
          <Route 
            path="/pending" 
            element={
              user ? (
                ((effectiveRole === 'admin' || effectiveRole === 'producer') && (effectiveStatus === 'pending_approval' || userProfile?.isApproved === false && !isAdminEmail)) 
                  ? <PendingSubscription /> 
                  : <Navigate to="/entrar" replace />
              ) : <Navigate to="/entrar" replace />
            } 
          />
          <Route path="/termos" element={<Terms />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
