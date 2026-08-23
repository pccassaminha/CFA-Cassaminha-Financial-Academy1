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
      {isReallyAdmin && viewAsStudent && (
        <div 
          style={{ zIndex: 9999 }} 
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 group flex items-center bg-[#0e0e0e]/95 backdrop-blur-xl border border-[#e9c349]/70 text-[#e9c349] p-2 rounded-full shadow-2xl hover:bg-[#18181b] transition-all duration-300 select-none overflow-hidden hover:pr-3 cursor-pointer"
          title="Visão de Aluno (Passe o mouse ou toque para expandir)"
        >
          {/* Ícone compacto padrão */}
          <div className="flex items-center gap-2 p-1">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e9c349] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#e9c349]"></span>
            </span>
            <span className="material-symbols-outlined text-lg sm:text-xl text-[#e9c349]">visibility</span>
          </div>

          {/* Conteúdo expandido no hover/toque */}
          <div className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out flex items-center gap-2.5 whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-bold font-headline">
              <span className="text-gray-300 text-[11px] font-medium hidden sm:inline">Modo:</span>
              <span className="text-[#e9c349] text-xs font-bold">Visão de Aluno</span>
            </div>
            <span className="h-4 w-[1px] bg-gray-800 my-auto" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                localStorage.setItem('viewAsStudent', 'false');
                window.dispatchEvent(new Event('student-view-changed'));
                window.location.href = '/dashboard';
              }}
              className="bg-[#e9c349] hover:bg-[#d8b238] text-black px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shrink-0"
              title="Sair da Visão de Aluno e voltar para o Painel Admin"
            >
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              <span className="text-[11px] sm:text-xs">Voltar Admin</span>
            </button>
          </div>
        </div>
      )}
      <div className="min-h-screen">
        <Routes>
          <Route 
            path="/" 
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
            element={user ? <StudentPortal /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/library/:slug" 
            element={user ? <StudentPortal /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/portal" 
            element={user ? <StudentPortal /> : <Navigate to="/" replace />} 
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
                  : <Navigate to="/" replace />
              ) : <Navigate to="/" replace />
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
