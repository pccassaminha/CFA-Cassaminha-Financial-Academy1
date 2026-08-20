import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface LessonStats {
  id: string;
  title: string;
  moduleTitle: string;
  duration: string;
  views: number;
  completions: number;
  completionRate: number;
}

export default function Analytics() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Real-time Firestore states
  const [course, setCourse] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonStats, setLessonStats] = useState<LessonStats[]>([]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 1. Listen to Course Structure
  useEffect(() => {
    const courseRef = doc(db, 'settings', 'course');
    const unsubCourse = onSnapshot(courseRef, (snap) => {
      if (snap.exists()) {
        setCourse(snap.data());
      }
    });
    return () => unsubCourse();
  }, []);

  // 2. Listen to Users Collection
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const uList: any[] = [];
      snap.forEach((docSnap) => {
        uList.push(docSnap.data());
      });
      setUsers(uList);
      setLoading(false);
    }, (err) => {
      console.error("Failed to read user files for analytics:", err);
      setLoading(false);
    });
    return () => unsubUsers();
  }, []);

  // 3. Compute Metrics Dynamically
  useEffect(() => {
    if (!course || !course.modules || users.length === 0) return;

    // Get all students (role === 'student' or excluding admins)
    const students = users.filter(u => u.role === 'student');
    const studentCount = students.length || 1; // avoid divide by zero

    const computedStats: LessonStats[] = [];

    // Traverse all modules and their lessons to aggregate user records
    course.modules.forEach((module: any) => {
      if (!module.lessons) return;

      module.lessons.forEach((lesson: any) => {
        let totalViews = 0;
        let totalCompletions = 0;

        users.forEach((u) => {
          // Add completions
          const completedList = u.completedLessons || [];
          if (completedList.includes(lesson.id)) {
            totalCompletions += 1;
          }

          // Add views
          const viewsMap = u.lessonViews || {};
          const viewsForLesson = viewsMap[lesson.id] || 0;
          totalViews += viewsForLesson;
        });

        // Completion Rate is the percentage of students who completed this lesson
        const rate = Math.round((totalCompletions / studentCount) * 100);

        computedStats.push({
          id: lesson.id,
          title: lesson.title,
          moduleTitle: module.title,
          duration: lesson.duration || '00:00',
          views: totalViews,
          completions: totalCompletions,
          completionRate: rate > 100 ? 100 : rate
        });
      });
    });

    // Sort by views descending, then completions descending
    computedStats.sort((a, b) => b.views - a.views || b.completions - a.completions);

    setLessonStats(computedStats);
  }, [course, users]);

  // Aggregate stats
  const totalSubscribers = users.filter(u => u.role === 'student').length;
  const activeSubscribers = users.filter(u => u.role === 'student' && u.subscriptionStatus === 'active').length;
  const activeSubscriptionRate = totalSubscribers > 0 
    ? Math.round((activeSubscribers / totalSubscribers) * 100) 
    : 0;

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
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-secondary mb-2">
                <span className="material-symbols-outlined text-sm">insights</span>
                <span className="text-xs font-bold uppercase tracking-widest font-label">Inteligência de Negócios</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter font-headline">Análise Profunda</h1>
            </div>
            <div className="flex gap-4">
              <select 
                onChange={(e) => showNotification(`Período filtrado: ${e.target.value}`)}
                className="bg-surface-container-high border border-outline-variant/20 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              >
                <option>Todo o Período</option>
                <option>Últimos 30 Dias</option>
                <option>Últimos 7 Dias</option>
              </select>
              <button 
                onClick={() => showNotification('Exportando relatório analítico de visualizações...')}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_15px_rgba(233,195,73,0.2)]"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Exportar CSV
              </button>
            </div>
          </header>

          {/* KPI Mini Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Inscritos Totais</p>
              <h2 className="text-3xl font-extrabold font-headline text-primary mt-2">{totalSubscribers}</h2>
              <p className="text-xs text-gray-500 mt-1">Alunos registados na CFA</p>
            </div>
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Inscritos Ativos</p>
              <h2 className="text-3xl font-extrabold font-headline text-secondary mt-2">{activeSubscribers}</h2>
              <p className="text-xs text-gray-400 mt-1">Acesso garantido e verificado</p>
            </div>
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Taxa de Adesão Ativa</p>
              <h2 className="text-3xl font-extrabold font-headline text-on-surface mt-2">{activeSubscriptionRate}%</h2>
              <p className="text-xs text-gray-500 mt-1">Alunos em dia com a mensalidade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Engagement Chart */}
            <div className="bg-surface-container p-8 rounded-2xl border border-outline-variant/10">
              <h3 className="font-bold font-headline text-lg mb-6">Módulos Publicados</h3>
              <div className="space-y-4">
                {course?.modules ? (
                  course.modules.map((m: any) => {
                    const lessonsCount = m.lessons?.length || 0;
                    return (
                      <div key={m.id} className="flex justify-between items-center bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/5">
                        <div>
                          <p className="text-sm font-bold">{m.title}</p>
                          <p className="text-xs text-on-surface-variant">{lessonsCount} aulas inseridas</p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                          m.status === 'published' ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-highest text-gray-400'
                        }`}>
                          {m.status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400 italic">Carregando módulos do sistema...</p>
                )}
              </div>
            </div>

            {/* Student Progress Metrics Summary */}
            <div className="bg-surface-container p-8 rounded-2xl border border-outline-variant/10">
              <h3 className="font-bold font-headline text-lg mb-6">Consistência / Conclusões de Alunos</h3>
              <div className="space-y-4">
                {lessonStats.slice(0, 4).map((stat) => (
                  <div key={stat.id}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-on-surface-variant truncate max-w-[70%]">{stat.title}</span>
                      <span className="font-mono text-secondary font-bold">{stat.completionRate}% de adesão</span>
                    </div>
                    <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-secondary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${stat.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                {lessonStats.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Carregando métricas de progresso...</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Content Table */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden mb-12">
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-bold font-headline text-lg">Aulas Mais Assistidas</h3>
              <span className="text-xs font-bold text-primary font-mono select-none px-2.5 py-1 bg-primary/10 rounded">Ordenado por Clicks</span>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500 italic">
                  Calculando estatísticas em tempo real...
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-highest/50 text-on-surface-variant font-label uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-4 font-medium">Aula</th>
                      <th className="p-4 font-medium">Módulo Pertencente</th>
                      <th className="p-4 font-medium text-center">Visualizações Totais (Clicks)</th>
                      <th className="p-4 font-medium text-center">Inscritos que Completaram</th>
                      <th className="p-4 font-medium text-center">Taxa de Conclusão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {lessonStats.map((stat) => (
                      <tr key={stat.id} className="hover:bg-surface-container-highest/30 transition-colors">
                        <td className="p-4 font-semibold text-on-surface">{stat.title}</td>
                        <td className="p-4 text-xs font-medium text-on-surface-variant">{stat.moduleTitle}</td>
                        <td className="p-4 text-center font-bold font-mono text-primary">{stat.views}</td>
                        <td className="p-4 text-center font-bold font-mono text-on-surface">{stat.completions}</td>
                        <td className="p-4 text-center font-bold font-mono text-secondary">{stat.completionRate}%</td>
                      </tr>
                    ))}
                    {lessonStats.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                          Insira módulos e aulas para começar a colher estatísticas de engajamento.
                        </td>
                      </tr>
                    )}
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
