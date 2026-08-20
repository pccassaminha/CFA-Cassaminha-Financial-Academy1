import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../firebase';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [viewAsStudent, setViewAsStudent] = React.useState(() => {
    return localStorage.getItem('viewAsStudent') === 'true';
  });

  React.useEffect(() => {
    const handleToggle = () => {
      setViewAsStudent(localStorage.getItem('viewAsStudent') === 'true');
    };
    window.addEventListener('student-view-changed', handleToggle);
    return () => window.removeEventListener('student-view-changed', handleToggle);
  }, []);

  const toggleStudentView = () => {
    const current = localStorage.getItem('viewAsStudent') === 'true';
    localStorage.setItem('viewAsStudent', String(!current));
    window.dispatchEvent(new Event('student-view-changed'));
    if (!current) {
      navigate('/library');
    } else {
      navigate('/dashboard');
    }
  };

  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  const showSidebarNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
    navigate('/');
  };

  return (
    <>
      {toastMsg && (
        <div className="fixed top-4 right-4 z-[9999] bg-[#353534] border border-[#e9c349]/30 text-[#e5e2e1] px-5 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span className="material-symbols-outlined text-[#e9c349] text-sm">info</span>
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}
      <aside className="fixed left-0 top-0 h-full flex flex-col pt-24 pb-8 bg-[#0e0e0e] w-72 border-r border-[#353534]/30 z-40">
      <div className="px-8 mb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
        </div>
        <div>
          <h2 className="font-headline font-bold text-lg leading-tight tracking-tight text-on-surface">CFA</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-label">Cassaminha Financial Academy</p>
        </div>
      </div>
      <div className="px-8 mb-6">
        <p className="text-[10px] text-on-surface-variant font-body">Uma empresa do <strong className="text-primary">Grupo Cassaminha</strong></p>
      </div>
      <nav className="flex-1 space-y-1">
        <Link
          to="/dashboard"
          className={`flex items-center gap-4 px-4 py-3 mx-2 my-1 font-headline font-medium transition-transform duration-300 rounded-lg ${
            location.pathname === '/dashboard'
              ? 'bg-[#353534] text-[#e9c349] active:scale-95 brightness-110'
              : 'text-[#bccabe] hover:bg-[#353534]/30 hover:translate-x-1'
          }`}
        >
          <span className="material-symbols-outlined" style={location.pathname === '/dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            dashboard
          </span>
          <span>Dashboard</span>
        </Link>
        <Link
          to="/content"
          className={`flex items-center gap-4 px-4 py-3 mx-2 my-1 font-headline font-medium transition-transform duration-300 rounded-lg ${
            location.pathname === '/content'
              ? 'bg-[#353534] text-[#e9c349] active:scale-95 brightness-110'
              : 'text-[#bccabe] hover:bg-[#353534]/30 hover:translate-x-1'
          }`}
        >
          <span className="material-symbols-outlined" style={location.pathname === '/content' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            video_library
          </span>
          <span>Gestão de Conteúdo</span>
        </Link>
        <Link
          to="/directory"
          className={`flex items-center gap-4 px-4 py-3 mx-2 my-1 font-headline font-medium transition-transform duration-300 rounded-lg ${
            location.pathname === '/directory'
              ? 'bg-[#353534] text-[#e9c349] active:scale-95 brightness-110'
              : 'text-[#bccabe] hover:bg-[#353534]/30 hover:translate-x-1'
          }`}
        >
          <span className="material-symbols-outlined" style={location.pathname === '/directory' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            group
          </span>
          <span>Controle de Alunos</span>
        </Link>
        <Link
          to="/analytics"
          className={`flex items-center gap-4 px-4 py-3 mx-2 my-1 font-headline font-medium transition-transform duration-300 rounded-lg ${
            location.pathname === '/analytics'
              ? 'bg-[#353534] text-[#e9c349] active:scale-95 brightness-110'
              : 'text-[#bccabe] hover:bg-[#353534]/30 hover:translate-x-1'
          }`}
        >
          <span className="material-symbols-outlined" style={location.pathname === '/analytics' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            insights
          </span>
          <span>Análise</span>
        </Link>
        <Link
          to="/settings"
          className={`flex items-center gap-4 px-4 py-3 mx-2 my-1 font-headline font-medium transition-transform duration-300 rounded-lg ${
            location.pathname === '/settings'
              ? 'bg-[#353534] text-[#e9c349] active:scale-95 brightness-110'
              : 'text-[#bccabe] hover:bg-[#353534]/30 hover:translate-x-1'
          }`}
        >
          <span className="material-symbols-outlined" style={location.pathname === '/settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            settings
          </span>
          <span>Configurações</span>
        </Link>
        
        <button
          id="btn-view-as-student"
          onClick={toggleStudentView}
          className="w-[calc(100%-16px)] flex items-center gap-4 px-4 py-3 mx-2 my-2 font-headline font-semibold text-xs uppercase tracking-wider text-[#e9c349] border border-[#e9c349]/20 bg-[#e9c349]/5 rounded-xl hover:bg-[#e9c349]/15 transition-all text-left outline-none cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[#e9c349]" style={{ fontVariationSettings: "'FILL' 1" }}>
            visibility
          </span>
          <span>Ver como Aluno</span>
        </button>
      </nav>
      <div className="mt-auto px-4">
        <div className="p-4 rounded-xl bg-surface-container-high mb-6 border border-primary/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1 font-label">Status</span>
            {location.pathname === '/library' ? (
              <span className="text-xs font-bold text-primary font-body">78%</span>
            ) : null}
          </div>
          {location.pathname === '/library' ? (
            <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden mb-4">
              <div className="bg-primary h-full w-[78%]"></div>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <span className="font-headline font-bold text-sm text-on-surface">Status Premium</span>
              <span className="w-2 h-2 bg-secondary rounded-full"></span>
            </div>
          )}
          <button onClick={() => showSidebarNotice('Upgrade de status disponível em breve.')} className="w-full py-2 text-xs font-headline font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer">
            Status Premium
          </button>
        </div>
        <div className="space-y-1">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); showSidebarNotice('Suporte: envie email para suporte@cassaminha.ao'); }}
            className="flex items-center gap-4 text-[#bccabe] px-4 py-2 hover:bg-[#353534]/30 rounded-lg transition-transform duration-300 hover:translate-x-1"
          >
            <span className="material-symbols-outlined text-sm">help_outline</span>
            <span className="text-sm font-medium font-body">Suporte</span>
          </a>
          <a
            href="/"
            onClick={handleLogout}
            className="flex items-center gap-4 text-[#bccabe] px-4 py-2 hover:bg-[#353534]/30 hover:text-error rounded-lg transition-transform duration-300 hover:translate-x-1"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="text-sm font-medium font-body">Sair</span>
          </a>
        </div>
      </div>
    </aside>
    </>
  );
}
