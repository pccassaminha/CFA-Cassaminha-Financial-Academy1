import React, { useState, useEffect } from 'react';
import StudentCatalog from '../components/StudentCatalog';
import StudentMyCourses from '../components/StudentMyCourses';
import StudentProfile from '../components/StudentProfile';
import CoursePreview from '../components/CoursePreview';
import CourseCheckout from '../components/CourseCheckout';
import { BookOpen, Home, User, LogOut, LayoutDashboard, Compass } from 'lucide-react';
import { logout, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function StudentPortal() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'catalog' | 'my-courses' | 'profile' | 'preview' | 'checkout'>('catalog');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
  };

  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* TOP NAVIGATION BAR / HEADER WITH "INICIO" BUTTON */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/70 backdrop-blur-xl border-b border-white/10 px-6 py-3.5 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('catalog')}>
            <div className="w-10 h-10 rounded-xl bg-[#e9c349] text-black flex items-center justify-center font-extrabold font-headline text-lg">
              CFA
            </div>
            <div>
              <h1 className="font-bold text-white text-base font-headline leading-none">CFA Academy</h1>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Portal do Aluno</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <button
              id="nav-inicio-btn"
              onClick={() => setCurrentView('catalog')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                currentView === 'catalog' || currentView === 'preview' || currentView === 'checkout'
                  ? 'bg-[#e9c349] text-black shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Início</span>
            </button>

            <button
              id="nav-my-courses-btn"
              onClick={() => setCurrentView('my-courses')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                currentView === 'my-courses'
                  ? 'bg-[#e9c349] text-black shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Meus Cursos</span>
            </button>

            <button
              id="nav-profile-btn"
              onClick={() => setCurrentView('profile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                currentView === 'profile'
                  ? 'bg-[#e9c349] text-black shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Meus Dados de Acesso</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              id="btn-return-admin"
              onClick={handleReturnToAdmin}
              className="bg-[#e9c349]/20 border border-[#e9c349]/40 text-[#e9c349] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#e9c349]/30 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar Admin</span>
            </button>
          )}

          <button
            id="student-logout-top-btn"
            onClick={handleLogout}
            className="bg-gray-900 border border-gray-800 text-gray-300 hover:text-red-400 hover:border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM / TOP SUBNAV */}
      <div className="flex md:hidden bg-[#131313] border-b border-gray-800 px-4 py-2.5 justify-around">
        <button
          onClick={() => setCurrentView('catalog')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${currentView === 'catalog' ? 'text-[#e9c349]' : 'text-gray-400'}`}
        >
          <Home className="w-4 h-4" />
          <span>Início</span>
        </button>
        <button
          onClick={() => setCurrentView('my-courses')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${currentView === 'my-courses' ? 'text-[#e9c349]' : 'text-gray-400'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Meus Cursos</span>
        </button>
        <button
          onClick={() => setCurrentView('profile')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${currentView === 'profile' ? 'text-[#e9c349]' : 'text-gray-400'}`}
        >
          <User className="w-4 h-4" />
          <span>Acesso</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'catalog' && (
          <StudentCatalog onSelectCourse={handleSelectCourse} />
        )}

        {currentView === 'my-courses' && (
          <StudentMyCourses onExplore={() => setCurrentView('catalog')} />
        )}

        {currentView === 'profile' && (
          <StudentProfile />
        )}

        {currentView === 'preview' && selectedCourse && (
          <CoursePreview 
            courseId={selectedCourse.id}
            courseData={selectedCourse} 
            onBack={() => setCurrentView('catalog')}
            onOpenCheckout={handleProceedToCheckout}
          />
        )}

        {currentView === 'checkout' && selectedCourse && (
          <CourseCheckout 
            courseId={selectedCourse.id}
            courseTitle={selectedCourse.title}
            coursePrice={selectedCourse.price}
            onBack={() => setCurrentView('preview')}
          />
        )}
      </main>
    </div>
  );
}
