import React, { useState, useEffect } from 'react';
import StudentCatalog from '../components/StudentCatalog';
import StudentMyCourses from '../components/StudentMyCourses';
import StudentProfile from '../components/StudentProfile';
import CoursePreview from '../components/CoursePreview';
import CourseCheckout from '../components/CourseCheckout';
import { BookOpen, Home, User, LogOut, Compass } from 'lucide-react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { logout, auth, db } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { DEFAULT_CFA_LOGO, getValidLogoUrl } from '../utils/constants';
import { slugify } from '../utils/slugify';

export default function StudentPortal() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  
  const [currentView, setCurrentView] = useState<'catalog' | 'my-courses' | 'profile' | 'preview' | 'checkout'>('catalog');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_CFA_LOGO);
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync URL to view state
  useEffect(() => {
    const syncStateFromUrl = async () => {
      if (!slug) {
        setCurrentView('catalog');
        setIsInitializing(false);
        return;
      }

      if (slug === 'meus-cursos') {
        setCurrentView('my-courses');
        setIsInitializing(false);
        return;
      }

      if (slug === 'perfil') {
        setCurrentView('profile');
        setIsInitializing(false);
        return;
      }

      // If it's a course slug, we need to fetch the course details
      // But only if we don't already have it selected
      if (!selectedCourse || slugify(selectedCourse.title) !== slug) {
        try {
          const q = query(collection(db, 'courses'), where('isPublished', '==', true));
          const snapshot = await getDocs(q);
          const courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const matchedCourse = courses.find((c: any) => slugify(c.title) === slug);
          
          if (matchedCourse) {
            setSelectedCourse(matchedCourse);
            // Default to preview when loaded from URL, unless they are already in checkout
            if (currentView !== 'checkout') {
              setCurrentView('preview');
            }
          } else {
            // Not found, go to catalog
            navigate('/library', { replace: true });
          }
        } catch (err) {
          console.error("Error fetching course for slug:", err);
          navigate('/library', { replace: true });
        }
      }
      setIsInitializing(false);
    };

    syncStateFromUrl();
  }, [slug]);

  const handleSetView = (view: typeof currentView) => {
    if (view === 'catalog') navigate('/library');
    else if (view === 'my-courses') navigate('/library/meus-cursos');
    else if (view === 'profile') navigate('/library/perfil');
    // preview and checkout are handled via handleSelectCourse / handleProceedToCheckout
    else setCurrentView(view);
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const generalDoc = await getDoc(doc(db, 'settings', 'general'));
        if (generalDoc.exists()) {
          const genData = generalDoc.data();
          if (genData.logoUrl) {
            setLogoUrl(getValidLogoUrl(genData.logoUrl));
          }
        }
        const platformDoc = await getDoc(doc(db, 'settings', 'platform'));
        if (platformDoc.exists()) {
          const pData = platformDoc.data();
          if (pData.logoUrl) {
            setLogoUrl(getValidLogoUrl(pData.logoUrl));
          }
        }
      } catch (err) {
        console.error("Error loading logo in StudentPortal:", err);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    const isMasterEmail = (email?: string | null) => {
      if (!email) return false;
      const clean = email.trim().toLowerCase();
      return clean === 'grupocassaminha@gmail.com' || clean === 'exportacoes.extras@gmail.com';
    };

    const checkAdmin = () => {
      const isSimulating = localStorage.getItem('viewAsStudent') === 'true';
      const currentUserEmail = auth.currentUser?.email;
      setIsAdmin(isSimulating || isMasterEmail(currentUserEmail));
    };

    checkAdmin();
    window.addEventListener('student-view-changed', checkAdmin);
    return () => window.removeEventListener('student-view-changed', checkAdmin);
  }, []);

  const handleReturnToAdmin = () => {
    localStorage.setItem('viewAsStudent', 'false');
    window.dispatchEvent(new Event('student-view-changed'));
    window.location.href = '/dashboard';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const handleSelectCourse = (course: any) => {
    setSelectedCourse(course);
    setCurrentView('preview');
    navigate(`/library/${slugify(course.title)}`);
  };

  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
    // Keeping same URL, just showing checkout component
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#e9c349] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* TOP NAVIGATION BAR / HEADER WITH CENTERED NAV & TRANSLUCENT GLASS */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSetView('catalog')}>
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-10 sm:h-14 md:h-16 w-auto object-contain rounded-xl shadow-md transition-all" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#e9c349] text-black flex items-center justify-center font-extrabold font-headline text-lg sm:text-xl shadow-md">
              CFA
            </div>
          )}
        </div>

        <nav className="hidden md:flex items-center justify-center gap-2">
          <button
            id="nav-inicio-btn"
            onClick={() => handleSetView('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'catalog' || currentView === 'preview' || currentView === 'checkout'
                ? 'bg-[#e9c349] text-black shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Início</span>
          </button>

          <button
            id="nav-my-courses-btn"
            onClick={() => handleSetView('my-courses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'my-courses'
                ? 'bg-[#e9c349] text-black shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Meus Cursos</span>
          </button>

          <button
            id="nav-profile-btn"
            onClick={() => handleSetView('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'profile'
                ? 'bg-[#e9c349] text-black shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Meus Dados de Acesso</span>
          </button>
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <button
            id="student-logout-top-btn"
            onClick={handleLogout}
            className="bg-white/5 border border-white/10 text-gray-300 hover:text-red-400 hover:border-red-500/30 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* MOBILE APP-STYLE TAB BAR (STICKY AT TOP OR FIXED AT BOTTOM) */}
      <div className="flex md:hidden bg-[#131313]/95 backdrop-blur-lg border-b border-gray-800/80 px-2 py-2 justify-around sticky top-[57px] z-30 shadow-md">
        <button
          onClick={() => handleSetView('catalog')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'catalog' || currentView === 'preview' || currentView === 'checkout'
              ? 'bg-[#e9c349]/20 text-[#e9c349] font-extrabold border border-[#e9c349]/30'
              : 'text-gray-400 font-medium'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Início</span>
        </button>

        <button
          onClick={() => handleSetView('my-courses')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'my-courses'
              ? 'bg-[#e9c349]/20 text-[#e9c349] font-extrabold border border-[#e9c349]/30'
              : 'text-gray-400 font-medium'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Meus Cursos</span>
        </button>

        <button
          onClick={() => handleSetView('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'profile'
              ? 'bg-[#e9c349]/20 text-[#e9c349] font-extrabold border border-[#e9c349]/30'
              : 'text-gray-400 font-medium'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Minha Conta</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'catalog' && (
          <StudentCatalog onSelectCourse={handleSelectCourse} />
        )}

        {currentView === 'my-courses' && (
          <StudentMyCourses onExplore={() => handleSetView('catalog')} />
        )}

        {currentView === 'profile' && (
          <StudentProfile />
        )}

        {currentView === 'preview' && selectedCourse && (
          <CoursePreview 
            courseId={selectedCourse.id}
            onBack={() => handleSetView('catalog')}
            onOpenCheckout={handleProceedToCheckout}
          />
        )}

        {currentView === 'checkout' && selectedCourse && (
          <CourseCheckout 
            courseId={selectedCourse.id}
            courseTitle={selectedCourse.title}
            coursePrice={selectedCourse.price}
            courseCover={selectedCourse.coverImage}
            onBack={() => setCurrentView('preview')}
          />
        )}
      </main>
    </div>
  );
}
