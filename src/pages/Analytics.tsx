import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  BarChart3, 
  Layers, 
  BookOpen, 
  Users, 
  Eye, 
  CheckCircle2, 
  TrendingUp, 
  Download, 
  Filter, 
  ArrowUpRight, 
  PlayCircle, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface LessonStats {
  id: string;
  title: string;
  moduleTitle: string;
  courseTitle: string;
  courseId: string;
  duration: string;
  videoType?: string;
  views: number;
  completions: number;
  completionRate: number;
}

interface ModuleInfo {
  id: string;
  title: string;
  courseTitle: string;
  courseId: string;
  status: string;
  lessonsCount: number;
  totalDurationMinutes: number;
}

interface CourseData {
  id: string;
  title: string;
  description?: string;
  price?: number;
  status?: string;
  isPublished?: boolean;
  coverImage?: string;
  modules?: any[];
}

export default function Analytics() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Real-time Firestore states
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'views' | 'completions' | 'rate'>('views');

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // 1. Listen to Real Courses Collection
  useEffect(() => {
    const coursesRef = collection(db, 'courses');
    const unsubCourses = onSnapshot(coursesRef, (snap) => {
      const cList: CourseData[] = [];
      snap.forEach((docSnap) => {
        cList.push({ id: docSnap.id, ...docSnap.data() } as CourseData);
      });
      setCourses(cList);
    }, (err) => {
      console.error("Failed to subscribe to courses in analytics:", err);
    });

    return () => unsubCourses();
  }, []);

  // 2. Listen to Users Collection
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const uList: any[] = [];
      snap.forEach((docSnap) => {
        uList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(uList);
      setLoading(false);
    }, (err) => {
      console.error("Failed to read user files for analytics:", err);
      setLoading(false);
    });

    return () => unsubUsers();
  }, []);

  const isMasterEmail = (email?: string | null) => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return clean === 'grupocassaminha@gmail.com' || clean === 'exportacoes.extras@gmail.com';
  };

  // Real Registered Students
  const realStudents = useMemo(() => {
    return users.filter(u => {
      const cleanEmail = (u.email || '').trim().toLowerCase();
      const isMaster = isMasterEmail(cleanEmail);
      const isProducer = u.role === 'producer' || u.role === 'admin' || u.roleType === 'producer';
      return !isMaster && !isProducer;
    });
  }, [users]);

  // Filtered Courses based on selection
  const activeCourses = useMemo(() => {
    if (selectedCourseId === 'all') {
      return courses;
    }
    return courses.filter(c => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  // Aggregate All Modules from active courses
  const modulesList = useMemo<ModuleInfo[]>(() => {
    const list: ModuleInfo[] = [];

    activeCourses.forEach(course => {
      const courseModules = Array.isArray(course.modules) ? course.modules : [];
      courseModules.forEach((m: any) => {
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        let totalMinutes = 0;
        lessons.forEach((l: any) => {
          if (l.duration) {
            const parts = String(l.duration).split(':');
            if (parts.length === 2) {
              totalMinutes += parseInt(parts[0], 10) || 0;
            }
          }
        });

        list.push({
          id: m.id,
          title: m.title || 'Módulo sem título',
          courseTitle: course.title || 'Curso CFA',
          courseId: course.id,
          status: m.status || 'published',
          lessonsCount: lessons.length,
          totalDurationMinutes: totalMinutes
        });
      });
    });

    return list;
  }, [activeCourses]);

  // Compute Lesson Statistics from active courses and real student interactions
  const lessonStats = useMemo<LessonStats[]>(() => {
    if (activeCourses.length === 0) return [];

    const stats: LessonStats[] = [];

    activeCourses.forEach(course => {
      // Determine student audience for this course
      const enrolledStudents = realStudents.filter(s => {
        if (selectedCourseId === 'all') return true;
        const enrolled = Array.isArray(s.enrolledCourses) ? s.enrolledCourses : [];
        return enrolled.includes(course.id) || s.subscriptionStatus === 'active';
      });
      const audienceCount = enrolledStudents.length || realStudents.length || 1;

      const courseModules = Array.isArray(course.modules) ? course.modules : [];
      courseModules.forEach((mod: any) => {
        const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
        lessons.forEach((lesson: any) => {
          let totalViews = 0;
          let totalCompletions = 0;

          users.forEach((u) => {
            // Count completions
            const completedList = Array.isArray(u.completedLessons) ? u.completedLessons : [];
            if (completedList.includes(lesson.id)) {
              totalCompletions += 1;
            }

            // Count views/clicks
            const viewsMap = u.lessonViews || {};
            const viewsForLesson = Number(viewsMap[lesson.id]) || 0;
            totalViews += viewsForLesson;
          });

          const rawRate = audienceCount > 0 ? Math.round((totalCompletions / audienceCount) * 100) : 0;
          const rate = Math.min(100, Math.max(0, rawRate));

          stats.push({
            id: lesson.id,
            title: lesson.title || 'Aula sem título',
            moduleTitle: mod.title || 'Módulo',
            courseTitle: course.title || 'Curso CFA',
            courseId: course.id,
            duration: lesson.duration || '00:00',
            videoType: lesson.videoType || 'youtube',
            views: totalViews,
            completions: totalCompletions,
            completionRate: rate
          });
        });
      });
    });

    // Sort according to active sort criteria
    return stats.sort((a, b) => {
      if (sortBy === 'views') return b.views - a.views || b.completions - a.completions;
      if (sortBy === 'completions') return b.completions - a.completions || b.views - a.views;
      return b.completionRate - a.completionRate || b.views - a.views;
    });
  }, [activeCourses, realStudents, users, selectedCourseId, sortBy]);

  // Overall KPIs
  const totalSubscribers = realStudents.length;
  const activeSubscribers = realStudents.filter(u => 
    u.subscriptionStatus === 'active' && 
    Array.isArray(u.enrolledCourses) && 
    u.enrolledCourses.length > 0
  ).length;
  const activeSubscriptionRate = totalSubscribers > 0 
    ? Math.round((activeSubscribers / totalSubscribers) * 100) 
    : 0;

  const totalLessonsCount = lessonStats.length;
  const totalViewsCount = lessonStats.reduce((acc, curr) => acc + curr.views, 0);
  const totalCompletionsCount = lessonStats.reduce((acc, curr) => acc + curr.completions, 0);

  // Export Real Data to CSV
  const handleExportCSV = () => {
    if (lessonStats.length === 0) {
      showNotification('Nenhum dado de aula para exportar.');
      return;
    }

    const headers = ['Aula', 'Módulo', 'Curso', 'Duração', 'Visualizações', 'Conclusões', 'Taxa de Conclusão (%)'];
    const rows = lessonStats.map(s => [
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.moduleTitle.replace(/"/g, '""')}"`,
      `"${s.courseTitle.replace(/"/g, '""')}"`,
      `"${s.duration}"`,
      s.views,
      s.completions,
      `${s.completionRate}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_analitico_cfa_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Relatório CSV baixado com sucesso!');
  };

  return (
    <div className="flex h-screen bg-background text-on-surface font-body overflow-hidden selection:bg-primary/30 selection:text-primary">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto relative ml-72">
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-[9999] bg-surface-container-high border border-primary/30 text-on-surface px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="material-symbols-outlined text-primary">check_circle</span>
            <span className="text-sm font-bold">{toastMessage}</span>
          </div>
        )}

        <div className="fixed inset-0 pointer-events-none z-[99] opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
        
        <div className="p-8 lg:p-12 max-w-7xl mx-auto relative z-10">
          
          {/* Header with Course Selector */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-6 border-b border-outline-variant/10">
            <div>
              <div className="flex items-center gap-2 text-secondary mb-2">
                <span className="material-symbols-outlined text-sm">insights</span>
                <span className="text-xs font-bold uppercase tracking-widest font-label">Inteligência & Desempenho</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter font-headline text-on-surface">
                Análise de Cursos & Engajamento
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Métricas em tempo real sincronizadas com os cursos, módulos e interações dos alunos.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Course Selector Dropdown */}
              <div className="flex items-center bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm">
                <BookOpen className="w-4 h-4 text-[#e9c349] mr-2 shrink-0" />
                <select 
                  id="select-course-analytics"
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    const selectedName = e.target.value === 'all' 
                      ? 'Todos os Cursos' 
                      : courses.find(c => c.id === e.target.value)?.title || 'Curso';
                    showNotification(`Filtrando métricas por: ${selectedName}`);
                  }}
                  className="bg-transparent text-on-surface font-semibold text-xs sm:text-sm focus:outline-none cursor-pointer pr-2"
                >
                  <option value="all" className="bg-[#181818] text-white">
                    Todos os Cursos ({courses.length})
                  </option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#181818] text-white">
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Period Filter */}
              <div className="flex items-center bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-sm">
                <Calendar className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
                <select 
                  value={timeFilter}
                  onChange={(e) => {
                    setTimeFilter(e.target.value);
                    showNotification(`Período ajustado: ${e.target.options[e.target.selectedIndex].text}`);
                  }}
                  className="bg-transparent text-on-surface font-medium text-xs sm:text-sm focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#181818] text-white">Todo o Período</option>
                  <option value="30d" className="bg-[#181818] text-white">Últimos 30 Dias</option>
                  <option value="7d" className="bg-[#181818] text-white">Últimos 7 Dias</option>
                </select>
              </div>

              {/* Export CSV Button */}
              <button 
                id="btn-export-analytics-csv"
                onClick={handleExportCSV}
                className="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(233,195,73,0.2)] cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </header>

          {/* Warning Banner if No Courses Created */}
          {courses.length === 0 && !loading && (
            <div className="bg-[#241a12] border border-[#e9c349]/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-[#e9c349] shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-sm">Nenhum curso cadastrado no sistema</h4>
                  <p className="text-xs text-stone-400 mt-0.5">Cadastre seus cursos e aulas no painel de Gestão de Conteúdo para gerar relatórios detalhados.</p>
                </div>
              </div>
              <Link 
                to="/content" 
                className="bg-[#e9c349] text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#d4b03f] transition-all shrink-0"
              >
                Ir para Gestão de Conteúdo →
              </Link>
            </div>
          )}

          {/* KPI Panels (Real Synced Data) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group hover:border-[#e9c349]/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest font-label">Alunos Registados</p>
                <Users className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-3xl font-extrabold font-headline text-primary mt-1">{totalSubscribers}</h2>
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>{activeSubscribers} com matrícula ativa</span>
              </p>
            </div>

            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group hover:border-secondary/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest font-label">Formações / Cursos</p>
                <BookOpen className="w-5 h-5 text-secondary opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-3xl font-extrabold font-headline text-secondary mt-1">{courses.length}</h2>
              <p className="text-xs text-stone-400 mt-1">
                {selectedCourseId === 'all' ? 'Cursos totais na academia' : 'Filtrando 1 formação'}
              </p>
            </div>

            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest font-label">Aulas Cadastradas</p>
                <PlayCircle className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-3xl font-extrabold font-headline text-on-surface mt-1">{totalLessonsCount}</h2>
              <p className="text-xs text-stone-400 mt-1">
                Distribuídas em {modulesList.length} módulos
              </p>
            </div>

            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group hover:border-secondary/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest font-label">Visualizações Totais</p>
                <Eye className="w-5 h-5 text-secondary opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-3xl font-extrabold font-headline text-secondary mt-1">{totalViewsCount}</h2>
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline-block" />
                <span>{totalCompletionsCount} conclusões validadas</span>
              </p>
            </div>
          </div>

          {/* Módulos Publicados & Estrutura */}
          <div className="mb-8">
            <div className="bg-surface-container p-6 sm:p-8 rounded-2xl border border-outline-variant/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-outline-variant/10">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#e9c349]" />
                    <h3 className="font-bold font-headline text-lg text-white">Módulos dos Cursos</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-surface-container-highest rounded-lg text-stone-400 font-mono">
                    {modulesList.length} {modulesList.length === 1 ? 'Módulo' : 'Módulos'}
                  </span>
                </div>

                <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                  {modulesList.length === 0 ? (
                    <div className="py-12 text-center text-stone-500">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum módulo encontrado para o filtro atual.</p>
                      <Link to="/content" className="text-xs text-[#e9c349] hover:underline mt-2 inline-block font-semibold">
                        Criar Módulos no Painel de Conteúdo →
                      </Link>
                    </div>
                  ) : (
                    modulesList.map((m) => (
                      <div 
                        key={m.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10 hover:border-outline-variant/30 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{m.title}</p>
                          <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                            <span className="text-[#e9c349] font-medium">{m.courseTitle}</span>
                            <span>•</span>
                            <span>{m.lessonsCount} {m.lessonsCount === 1 ? 'aula' : 'aulas'}</span>
                            {m.totalDurationMinutes > 0 && (
                              <>
                                <span>•</span>
                                <span>~{m.totalDurationMinutes} min</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md self-start sm:self-center border shrink-0 ${
                          m.status === 'published' 
                            ? 'bg-secondary/15 text-secondary border-secondary/30' 
                            : 'bg-surface-container-highest text-stone-400 border-outline-variant/20'
                        }`}>
                          {m.status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-outline-variant/10 flex justify-between items-center text-xs text-stone-400">
                <span>Total de {totalLessonsCount} aulas ativas</span>
                <Link to="/content" className="text-[#e9c349] hover:underline font-semibold flex items-center gap-1">
                  <span>Editar Estrutura</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Top Content Table (Sincronizado com os Cursos Reais) */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden mb-12 shadow-xl">
            <div className="p-6 border-b border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-bold font-headline text-lg text-white">Desempenho Detalhado por Aula</h3>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Visualizações, conclusões e taxa de retenção por aula em cada formação.
                </p>
              </div>

              {/* Sorting filters */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-label uppercase">Ordenar por:</span>
                <div className="flex bg-surface-container-high p-1 rounded-xl border border-outline-variant/10">
                  <button
                    onClick={() => setSortBy('views')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sortBy === 'views' 
                        ? 'bg-primary text-black shadow-sm' 
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Clicks
                  </button>
                  <button
                    onClick={() => setSortBy('completions')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sortBy === 'completions' 
                        ? 'bg-primary text-black shadow-sm' 
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Conclusões
                  </button>
                  <button
                    onClick={() => setSortBy('rate')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sortBy === 'rate' 
                        ? 'bg-primary text-black shadow-sm' 
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Taxa (%)
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-sm text-stone-500 italic">
                  <p className="animate-pulse">Calculando estatísticas em tempo real com o banco de dados...</p>
                </div>
              ) : lessonStats.length === 0 ? (
                <div className="p-12 text-center text-stone-400">
                  <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#e9c349]" />
                  <p className="font-bold text-white text-base">Nenhuma aula cadastrada ainda</p>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Adicione módulos e vídeos nos cursos para acompanhar métricas de retenção e cliques.
                  </p>
                  <Link 
                    to="/content" 
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#e9c349] text-black font-bold text-xs rounded-xl hover:bg-[#d4b03f] transition-all"
                  >
                    Cadastrar Conteúdo Agora →
                  </Link>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-highest/50 text-on-surface-variant font-label uppercase tracking-wider text-xs border-b border-outline-variant/10">
                    <tr>
                      <th className="p-4 font-semibold">Aula & Duração</th>
                      <th className="p-4 font-semibold">Módulo</th>
                      <th className="p-4 font-semibold">Curso Pertencente</th>
                      <th className="p-4 font-semibold text-center">Visualizações (Clicks)</th>
                      <th className="p-4 font-semibold text-center">Alunos que Concluíram</th>
                      <th className="p-4 font-semibold text-center">Taxa de Conclusão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {lessonStats.map((stat) => (
                      <tr key={stat.id} className="hover:bg-surface-container-highest/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center shrink-0 border border-[#e9c349]/20">
                              <PlayCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-on-surface block leading-snug">{stat.title}</span>
                              <span className="text-[11px] font-mono text-stone-400">⏱ {stat.duration}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium text-stone-300">
                          {stat.moduleTitle}
                        </td>
                        <td className="p-4 text-xs">
                          <span className="font-semibold text-[#e9c349] bg-[#e9c349]/10 px-2.5 py-1 rounded-md border border-[#e9c349]/20">
                            {stat.courseTitle}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold font-mono text-primary text-base">
                          {stat.views}
                        </td>
                        <td className="p-4 text-center font-bold font-mono text-on-surface text-base">
                          {stat.completions}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            stat.completionRate >= 50 
                              ? 'bg-secondary/15 text-secondary border border-secondary/30' 
                              : stat.completionRate > 0 
                              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                              : 'bg-stone-800 text-stone-400'
                          }`}>
                            {stat.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
