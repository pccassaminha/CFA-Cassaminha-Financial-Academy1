import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logout, auth, db } from '../firebase';
import WistiaPlayer from '../components/WistiaPlayer';

interface Lesson {
  id: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  duration: string;
  order?: number;
  videoSource?: 'youtube' | 'wistia';
  videoData?: string; // Link se YouTube, ID se Wistia
  videoUrl?: string; // Compatibilidade legado
  materials?: string; // Slides/docs links
}

interface Module {
  id: string;
  title: string;
  status: 'published' | 'draft';
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  modules: Module[];
}

interface UserProfile {
  uid: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  completedLessons?: string[];
  lessonViews?: Record<string, number>;
}

interface VideoLibraryProps {
  courseId?: string;
}

export default function VideoLibrary({ courseId }: VideoLibraryProps = {}) {
  const navigate = useNavigate();
  
  // Real-time states
  const [course, setCourse] = useState<Course>({ id: '', title: '', modules: [] });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdminSimulating, setIsAdminSimulating] = useState(false);

  // Active Lesson state
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Interface controls
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Sidebar expand/collapse for modules
  const [collapsedSidebarModules, setCollapsedSidebarModules] = useState<Record<string, boolean>>({});

  // Comment section
  const [comment, setComment] = useState('');
  const [commentsByLesson, setCommentsByLesson] = useState<Record<string, Array<{ author: string; text: string }>>>({});

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Determine if viewing in administrator student simulator
  useEffect(() => {
    const isSimulating = localStorage.getItem('viewAsStudent') === 'true';
    setIsAdminSimulating(isSimulating);
  }, []);

  // Monitor Auth and Load User Profile
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        
        // Listen to live user profile changes (e.g. completedLessons)
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          }
        });

        return () => unsubscribeUser();
      } else {
        setCurrentUserId(null);
        setUserProfile(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Monitor Course collection in Real-Time
  useEffect(() => {
    let unsubscribeCourse = () => {};

    if (courseId) {
      const targetRef = doc(db, 'courses', courseId);
      unsubscribeCourse = onSnapshot(targetRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Course;
          setCourse({
            id: snap.id,
            title: data.title || 'Curso CFA',
            modules: Array.isArray(data.modules) ? data.modules : []
          });
          
          // Auto-select first lesson if none selected yet
          if (data.modules && data.modules.length > 0) {
            const publishedModules = data.modules.filter(m => m.status === 'published');
            const modulesToSearch = publishedModules.length > 0 ? publishedModules : data.modules;
            const firstModule = modulesToSearch[0];
            if (firstModule && firstModule.lessons && firstModule.lessons.length > 0) {
              setActiveLesson(firstModule.lessons[0]);
              setActiveModuleId(firstModule.id);
            }
          }
        }
      }, (err) => {
        console.error("Erro ao buscar dados do curso em tempo real:", err);
      });
    } else {
      // If no courseId in URL, query the courses collection for the first available course
      const coursesRef = collection(db, 'courses');
      unsubscribeCourse = onSnapshot(coursesRef, (snap) => {
        if (!snap.empty) {
          const firstDoc = snap.docs[0];
          const data = firstDoc.data() as Course;
          setCourse({
            id: firstDoc.id,
            title: data.title || 'Curso CFA',
            modules: Array.isArray(data.modules) ? data.modules : []
          });

          if (data.modules && data.modules.length > 0) {
            const publishedModules = data.modules.filter(m => m.status === 'published');
            const modulesToSearch = publishedModules.length > 0 ? publishedModules : data.modules;
            const firstModule = modulesToSearch[0];
            if (firstModule && firstModule.lessons && firstModule.lessons.length > 0) {
              setActiveLesson(firstModule.lessons[0]);
              setActiveModuleId(firstModule.id);
            }
          }
        }
      }, (err) => {
        console.error("Erro ao buscar primeiro curso:", err);
      });
    }

    return () => unsubscribeCourse();
  }, [courseId]);

  // Record Lesson view automatically on active lesson selection
  useEffect(() => {
    if (!activeLesson || !currentUserId || !userProfile) return;

    const recordLessonView = async () => {
      try {
        const userRef = doc(db, 'users', currentUserId);
        const currentViews = userProfile.lessonViews || {};
        const previousPlays = currentViews[activeLesson.id] || 0;
        
        const updatedViews = {
          ...currentViews,
          [activeLesson.id]: previousPlays + 1
        };

        await updateDoc(userRef, {
          lessonViews: updatedViews
        });
      } catch (err) {
        console.error("Failed to record play status in database:", err);
      }
    };

    recordLessonView();
  }, [activeLesson?.id, currentUserId]);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
    navigate('/');
  };

  const isMasterEmail = (email?: string | null) => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return clean === 'grupocassaminha@gmail.com' || clean === 'exportacoes.extras@gmail.com';
  };

  const isUserAdmin = isAdminSimulating || isMasterEmail(userProfile?.email) || isMasterEmail(auth.currentUser?.email) || userProfile?.role === 'admin';

  const returnToAdminView = () => {
    localStorage.setItem('viewAsStudent', 'false');
    window.dispatchEvent(new Event('student-view-changed'));
    showNotification('Retornando ao Painel Administrativo...');
    window.location.href = '/dashboard';
  };

  // Toggle module collapse in Student view
  const toggleSidebarModule = (moduleId: string) => {
    setCollapsedSidebarModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Toggle completed lesson checkbox
  const handleToggleLessonCompleted = async (lessonId: string) => {
    if (!currentUserId || !userProfile) {
      showNotification('Inicie sessão para poder salvar seu progresso.');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUserId);
      const prevCompleted = userProfile.completedLessons || [];
      let updatedCompleted: string[];

      if (prevCompleted.includes(lessonId)) {
        updatedCompleted = prevCompleted.filter(id => id !== lessonId);
        showNotification('Progresso removido.');
      } else {
        updatedCompleted = [...prevCompleted, lessonId];
        showNotification('Aula marcada como concluída! Parabéns!');
      }

      await updateDoc(userRef, {
        completedLessons: updatedCompleted
      });
    } catch (err) {
      console.error("Error setting completed status in Firestore:", err);
      showNotification('Erro ao salvar progresso no banco de dados.');
    }
  };

  // Calculate completion percentage for a given module
  const getModuleProgress = (module: Module) => {
    if (!module.lessons || module.lessons.length === 0) return { percent: 0, text: 'Vazio' };
    const completed = userProfile?.completedLessons || [];
    const completedInModule = module.lessons.filter(l => completed.includes(l.id)).length;
    const pct = Math.round((completedInModule / module.lessons.length) * 100);
    return {
      completedCount: completedInModule,
      totalCount: module.lessons.length,
      percent: pct,
      text: `${completedInModule}/${module.lessons.length}`
    };
  };

  // Helper to get total course progress
  const getCourseProgress = () => {
    const allPublishedLessons = course.modules
      .filter(m => m.status === 'published')
      .flatMap(m => m.lessons);

    if (allPublishedLessons.length === 0) return 0;
    
    const completed = userProfile?.completedLessons || [];
    const completedInCourse = allPublishedLessons.filter(l => completed.includes(l.id)).length;
    return Math.round((completedInCourse / allPublishedLessons.length) * 100);
  };

  const handleLessonSelect = (lesson: Lesson, moduleId: string) => {
    setActiveLesson(lesson);
    setActiveModuleId(moduleId);
    setIsPlaying(false);
  };

  const handleNextLesson = () => {
    if (!activeLesson || !course.modules) return;

    // Flatten overall lessons list to cycle easily
    const publishedModules = course.modules.filter(m => m.status === 'published');
    const allLessons = publishedModules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id })));
    const currentIndex = allLessons.findIndex(l => l.id === activeLesson.id);

    if (currentIndex > -1 && currentIndex < allLessons.length - 1) {
      const next = allLessons[currentIndex + 1];
      handleLessonSelect({ id: next.id, title: next.title, duration: next.duration, videoUrl: next.videoUrl, materials: next.materials }, next.moduleId);
      showNotification('Avançando para a próxima aula.');
    } else {
      showNotification('Parabéns! Você já está na última aula disponível.');
    }
  };

  const handlePrevLesson = () => {
    if (!activeLesson || !course.modules) return;

    const publishedModules = course.modules.filter(m => m.status === 'published');
    const allLessons = publishedModules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id })));
    const currentIndex = allLessons.findIndex(l => l.id === activeLesson.id);

    if (currentIndex > 0) {
      const prev = allLessons[currentIndex - 1];
      handleLessonSelect({ id: prev.id, title: prev.title, duration: prev.duration, videoUrl: prev.videoUrl, materials: prev.materials }, prev.moduleId);
      showNotification('Retornando para a aula anterior.');
    } else {
      showNotification('Você já está na primeira aula.');
    }
  };

  // Helper to parse wistia/youtube/vimeo link into high fidelity player or embed
  const renderVideoPlayer = (lesson: Lesson) => {
    const rawData = (lesson.videoData || lesson.videoUrl || '').trim();
    if (!rawData) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0e0e0e]">
          <span className="material-symbols-outlined text-[#e9c349] text-6xl mb-4">smart_display</span>
          <p className="text-gray-400 font-medium pb-2">O player de vídeo está pronto.</p>
          <button 
            onClick={() => setIsPlaying(true)}
            className="px-6 py-2 bg-[#e9c349] text-[#131313] hover:opacity-90 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Assistir Aula
          </button>
        </div>
      );
    }

    // Embed wistia/youtube/vimeo
    if (isPlaying) {
      // 1. Wistia check (either explicit videoSource or wistia string)
      const isWistia = lesson.videoSource === 'wistia' || rawData.includes('wistia.com') || rawData.includes('wistia.net') || (!rawData.includes('http') && rawData.length < 30);
      if (isWistia) {
        return <WistiaPlayer videoId={rawData} />;
      }

      // 2. YouTube check
      const isYoutube = lesson.videoSource === 'youtube' || rawData.includes('youtube.com') || rawData.includes('youtu.be');
      if (isYoutube) {
        let vidId = rawData;
        if (rawData.includes('youtube.com/watch?v=')) {
          vidId = rawData.split('v=')[1]?.split('&')[0] || '';
        } else if (rawData.includes('youtu.be/')) {
          vidId = rawData.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (rawData.includes('youtube.com/embed/')) {
          vidId = rawData.split('youtube.com/embed/')[1]?.split('?')[0] || '';
        }
        const embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1`;
        return (
          <iframe 
            src={embedUrl}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-2xl"
          />
        );
      }

      // 3. Vimeo check
      const isVimeo = rawData.includes('vimeo.com');
      if (isVimeo) {
        const vId = rawData.split('vimeo.com/')[1]?.split('?')[0] || '';
        const embedUrl = `https://player.vimeo.com/video/${vId}?autoplay=1`;
        return (
          <iframe 
            src={embedUrl}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-2xl"
          />
        );
      }

      // 4. Direct video fallback (e.g. mp4, m3u8)
      return (
        <video 
          src={rawData}
          controls
          autoPlay
          className="w-full h-full rounded-2xl bg-black"
        />
      );
    }

    // Locked Preview Cover
    return (
      <>
        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_Q0OmzECXhtHN7K5xJJ6iaSVwWVVgeCxcs6waQ_acfCFnrYFkZnYZbn5zp27CyokgJQUXCj0dpafacrUZjnmT9-o7hnO3NN8HvviTfvqhz9YhjDRMYq2qLhpesNu7_vcQPjOgivji6AMy1T1zNdNmlIwx4FQIJp_aX28bqFkibedtytYnQPWevO0tTfjrkqDMRsG5ga-QieLbKt4w6Fqw1NfJeSr1pH9r3hPEJWAxy6jOQR-AgNHzBYK41EKh2V0K4dNvF9FkJQ" alt="Video Cover" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <button 
            onClick={() => setIsPlaying(true)}
            className="w-20 h-20 rounded-full bg-[#e9c349]/20 backdrop-blur-md flex items-center justify-center border border-[#e9c349]/50 hover:scale-110 transition-transform"
          >
            <span className="material-symbols-outlined text-[#e9c349] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </button>
        </div>
      </>
    );
  };

  const comments = activeLesson ? (commentsByLesson[activeLesson.id] || []) : [];

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-body min-h-screen flex flex-col overflow-hidden">
      
      {/* Simulation / Admin Return Banner */}
      {isUserAdmin && (
        <div className="bg-[#e9c349]/10 border-b border-[#e9c349]/20 px-8 py-3 flex items-center justify-between z-50 text-xs">
          <div className="flex items-center gap-2 text-[#e9c349]">
            <span className="material-symbols-outlined text-sm animate-pulse font-bold">visibility</span>
            <span>Você está visualizando a plataforma como <strong>Aluno</strong>.</span>
          </div>
          <button 
            id="btn-return-admin-video-library"
            onClick={returnToAdminView} 
            className="bg-[#e9c349] text-[#131313] px-3 py-1.5 rounded-md font-bold hover:scale-[1.02] transition-transform cursor-pointer shadow-md"
          >
            Voltar para Administração
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-[9999] bg-[#353534] border border-[#e9c349]/30 text-[#e5e2e1] px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="material-symbols-outlined text-[#e9c349]">check_circle</span>
            <span className="text-sm font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Sidebar (Dynamic Student Version) */}
        <aside className="w-80 bg-[#0e0e0e] border-r border-[#353534]/30 flex flex-col h-full overflow-hidden">
          <div className="p-8">
            <h1 className="text-xl font-extrabold text-[#e9c349] tracking-tighter font-headline flex items-center gap-2">
              <span className="material-symbols-outlined">school</span>
              CFA
            </h1>
            <p className="text-[9px] text-[#bccabe]/50 uppercase tracking-widest mt-1 font-mono">Cassaminha Financial Academy</p>

            <div className="flex flex-col gap-2 mt-4">
              <Link
                to="/library"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-[#e9c349] bg-white/5 hover:bg-[#e9c349]/10 rounded-xl border border-white/5 hover:border-[#e9c349]/20 transition-all"
              >
                <span className="material-symbols-outlined text-sm">storefront</span>
                <span>Vitrine de Cursos</span>
              </Link>
              {isUserAdmin && (
                <button
                  onClick={returnToAdminView}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-black bg-[#e9c349] hover:bg-[#d4b03f] rounded-xl transition-all cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">dashboard</span>
                  <span>Painel Administrativo</span>
                </button>
              )}
            </div>

            {/* Course Global Progress Indicator */}
            <div className="mt-6 p-4 bg-[#353534]/10 rounded-xl border border-[#353534]/20">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-gray-400 font-medium">Progresso Geral</span>
                <span className="text-[#e9c349] font-bold">{getCourseProgress()}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#353534]/30 rounded-full overflow-hidden">
                <div 
                  className="bg-[#e9c349] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getCourseProgress()}%` }}
                />
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-4 overflow-y-auto pb-8">
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4">Módulos do Curso</p>

              {course.modules && course.modules.filter(m => m.status === 'published').length > 0 ? (
                course.modules.filter(m => m.status === 'published').map((module) => {
                  const isCollapsed = !!collapsedSidebarModules[module.id];
                  const progress = getModuleProgress(module);
                  return (
                    <div key={module.id} className="space-y-1">
                      {/* Module Expand Header */}
                      <div 
                        onClick={() => toggleSidebarModule(module.id)}
                        className={`flex flex-col p-4 rounded-xl cursor-pointer transition-colors border select-none ${
                          activeModuleId === module.id 
                            ? 'bg-[#353534]/30 border-[#e9c349]/30' 
                            : 'bg-[#151515]/30 border-[#353534]/10 hover:bg-[#353534]/15'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#e5e2e1] pr-2 break-words max-w-[80%]">
                            {module.title}
                          </span>
                          <span className="material-symbols-outlined text-gray-400 text-[20px]">
                            {isCollapsed ? 'expand_more' : 'expand_less'}
                          </span>
                        </div>
                        
                        {/* Module progress line requested by user */}
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <div className="flex-1 h-1 bg-[#353534]/30 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#e9c349] h-full rounded-full transition-all duration-300" 
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[#e9c349] whitespace-nowrap font-mono">
                            {progress.text}
                          </span>
                        </div>
                      </div>

                      {/* Module Lessons sub list */}
                      {!isCollapsed && module.lessons && (
                        <div className="pl-3 space-y-1 pt-1 ml-3 border-l border-[#353534]/30">
                          {module.lessons.map((lesson) => {
                            const isSelected = activeLesson?.id === lesson.id;
                            const isCompleted = userProfile?.completedLessons?.includes(lesson.id) || false;
                            
                            return (
                              <div 
                                key={lesson.id}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-[#e9c349]/15 text-[#e9c349] font-bold' 
                                    : 'text-gray-400 hover:bg-[#353534]/20 hover:text-white'
                                }`}
                                onClick={() => handleLessonSelect(lesson, module.id)}
                              >
                                <div className="flex items-center gap-2 max-w-[80%]">
                                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${
                                    isCompleted ? 'text-secondary font-bold' : 'text-gray-500'
                                  }`}>
                                    {isCompleted ? 'check_circle' : 'play_circle'}
                                  </span>
                                  <span className="text-xs truncate">{lesson.title}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 font-mono shrink-0">{lesson.duration}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-xs text-gray-500 italic">Nenhum módulo publicado no momento.</div>
              )}
            </div>
          </nav>

          <div className="p-4 mt-auto border-t border-[#353534]/30 bg-[#070707]/30">
            <a
              href="/"
              onClick={handleLogout}
              className="flex items-center gap-4 text-[#bccabe] px-4 py-3 hover:bg-[#353534]/30 hover:text-error rounded-xl transition-all duration-300 hover:translate-x-1"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="text-sm font-medium">Sair da Conta</span>
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#121212]">
          {activeLesson ? (
            <>
              {/* Top Bar for video details */}
              <header className="h-20 border-b border-[#353534]/30 flex items-center justify-between px-8 bg-[#131313] shrink-0">
                <div className="flex items-center gap-3 max-w-[60%]">
                  <span className="px-2 py-1 bg-[#353534] text-[#e9c349] text-[9px] font-bold uppercase rounded font-mono">Aula Ativa</span>
                  <h2 className="font-bold text-base text-[#e5e2e1] truncate">{activeLesson.title}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handlePrevLesson}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Anterior
                  </button>
                  <button 
                    onClick={handleNextLesson}
                    className="flex items-center gap-2 px-5 py-2 bg-[#e9c349] text-[#131313] rounded-lg font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    Próxima Aula <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </header>

              {/* Player/Details Container */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                <div className="max-w-5xl mx-auto space-y-8">
                  
                  {/* Dynamic Video Player Stage */}
                  <div className="aspect-video bg-black rounded-2xl border border-[#353534]/50 flex items-center justify-center relative group overflow-hidden shadow-2xl">
                    {renderVideoPlayer(activeLesson)}
                  </div>

                  {/* Watch Complete Progress Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-[#181818] border border-[#353534]/30 rounded-2xl gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-[#e5e2e1]">Controle o seu progresso neste treinamento</h4>
                      <p className="text-xs text-gray-400 mt-1">Marque a aula como concluída se você já assimilou o conteúdo.</p>
                    </div>
                    {/* Mark complete status requested by client */}
                    <button 
                      onClick={() => handleToggleLessonCompleted(activeLesson.id)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all outline-none ${
                        userProfile?.completedLessons?.includes(activeLesson.id)
                          ? 'bg-[#e5e2e1]/10 text-secondary border border-secondary/20'
                          : 'bg-[#e9c349] text-[#131313] hover:opacity-90 shadow-[0_0_15px_rgba(233,195,73,0.15)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {userProfile?.completedLessons?.includes(activeLesson.id) ? 'task_alt' : 'circle'}
                      </span>
                      {userProfile?.completedLessons?.includes(activeLesson.id) ? 'Aula Concluída' : 'Marcar como Concluída'}
                    </button>
                  </div>

                  {/* Details section & Comment Discussion board */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h1 className="text-2xl font-black text-[#e5e2e1] mb-3">{activeLesson.title}</h1>
                        <p className="text-gray-400 leading-relaxed text-sm">
                          Domine as habilidades técnicas oferecidas pela Cassamía Financial Academy. Acompanhe os materiais de apoio e utilize o campo de discussões ao lado caso tenha dúvidas sobre os ensinamentos.
                        </p>
                      </div>
                      
                      {activeLesson.materials && (
                        <div className="p-6 bg-[#353534]/10 rounded-2xl border border-[#353534]/20">
                          <h3 className="font-bold mb-4 flex items-center gap-2.5 text-sm">
                            <span className="material-symbols-outlined text-[#e9c349]">attach_file</span>
                            Material Complementar
                          </h3>
                          <div className="space-y-3">
                            <a 
                              href={activeLesson.materials} 
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-3.5 bg-[#0e0e0e]/50 rounded-xl border border-[#353534]/30 hover:border-[#e9c349]/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-gray-400">description</span>
                                <span className="text-xs font-bold font-mono text-gray-300">Acesse o Material da Aula</span>
                              </div>
                              <span className="material-symbols-outlined text-sm text-[#e9c349]">open_in_new</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Discussion List */}
                    <div className="bg-[#353534]/10 rounded-2xl border border-[#353534]/20 p-6 flex flex-col h-[350px]">
                      <h3 className="font-bold mb-4 text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#e9c349] text-base">forum</span>
                        Comentários ({comments.length})
                      </h3>
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin">
                        {comments.length > 0 ? (
                          comments.map((c, i) => (
                            <div key={i} className="text-xs bg-[#111]/30 p-2.5 rounded-lg border border-[#353534]/10">
                              <span className="font-bold text-[#e9c349]">{c.author}</span>
                              <p className="text-gray-300 mt-1">{c.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic text-[11px] text-center pt-8">
                            Nenhum comentário enviado para esta aula. Seja o primeiro a comentar!
                          </div>
                        )}
                      </div>
                      
                      <form 
                        className="relative mt-auto"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (comment.trim()) {
                            const newComments = [...comments, { author: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : 'Estudante', text: comment.trim() }];
                            setCommentsByLesson(prev => ({
                              ...prev,
                              [activeLesson.id]: newComments
                            }));
                            setComment('');
                            showNotification('Comentário enviado!');
                          }
                        }}
                      >
                        <input 
                          type="text" 
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Envie sua dúvida..." 
                          className="w-full bg-[#121212] border border-[#353534]/50 rounded-lg pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:border-[#e9c349]/50 transition-colors" 
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#e9c349] hover:opacity-80">
                          <span className="material-symbols-outlined text-[16px]">send</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-[#e9c349] text-6xl mb-4 animate-bounce">video_library</span>
              <h2 className="text-xl font-bold">Nenhuma aula disponível</h2>
              <p className="text-gray-400 text-sm mt-1">Carregando as aulas disponíveis no programa...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
