import React, { useState, useEffect } from 'react';
import StudentLayout from '../components/StudentLayout';
import Marketplace from '../components/Marketplace';
import CoursePreview from '../components/CoursePreview';
import CourseCheckout from '../components/CourseCheckout';
import VideoLibrary from './VideoLibrary';
import { auth, db, logout } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { BookOpen, CheckCircle, Clock, Compass, PlayCircle, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserData {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  subscriptionStatus?: string;
  enrolledCourses?: string[];
  completedLessons?: string[];
}

export default function StudentPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-courses' | 'profile'>('marketplace');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [playingCourseId, setPlayingCourseId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [coursesMap, setCoursesMap] = useState<Record<string, { title: string; image: string; description: string }>>({});

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserData(snap.data() as UserData);
          } else {
            setUserData({
              uid: user.uid,
              email: user.email || '',
              subscriptionStatus: 'inactive',
              enrolledCourses: []
            });
          }
        });
        return () => unsubscribeDoc();
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Busca cursos do Firestore para obter metadados reais
  useEffect(() => {
    const unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const map: Record<string, { title: string; image: string; description: string }> = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        map[docSnap.id] = {
          title: data.title || 'Curso CFA',
          image: data.coverImage || data.imageUrl || data.image || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
          description: data.description || 'Treinamento completo na CFA Academy.'
        };
      });
      setCoursesMap(map);
    });

    return () => unsubscribeCourses();
  }, []);

  // Se o aluno estiver assistindo uma aula diretamente de um curso
  if (playingCourseId) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a]">
        {/* Barra superior de navegação para voltar à vitrine/meus cursos */}
        <div className="bg-[#131313] border-b border-gray-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <button
            onClick={() => setPlayingCourseId(null)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-[#e9c349] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Voltar para o Portal do Aluno
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono">Modo Aula Ativa</span>
            <button
              onClick={() => {
                setPlayingCourseId(null);
                setActiveTab('marketplace');
              }}
              className="text-xs text-[#e9c349] hover:underline cursor-pointer"
            >
              Explorar Vitrine
            </button>
          </div>
        </div>

        <VideoLibrary courseId={playingCourseId} />
      </div>
    );
  }

  const enrolledCourseIds = Array.isArray(userData?.enrolledCourses) ? userData.enrolledCourses : [];
  const hasActiveSubscription = enrolledCourseIds.length > 0 && userData?.subscriptionStatus === 'active';

  return (
    <StudentLayout activeTab={activeTab} setActiveTab={(tab) => {
      setActiveTab(tab);
      setSelectedCourseId(null);
      setIsCheckoutOpen(false);
    }}>
      {/* 1. ABA EXPLORAR CURSOS / MARKETPLACE */}
      {activeTab === 'marketplace' && (
        <div>
          {isCheckoutOpen ? (
            <div className="p-6 md:p-10 max-w-2xl mx-auto">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="flex items-center gap-2 text-gray-400 hover:text-[#e9c349] mb-6 text-sm font-medium transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Voltar aos Detalhes
              </button>
              <CourseCheckout
                courseId={selectedCourseId || 'cfa-financial-master'}
                courseTitle={
                  selectedCourseId === 'cfa-soberania-financeira' 
                    ? 'Fundamentos da Soberania Financeira' 
                    : selectedCourseId === 'cfa-cripto-ativos'
                    ? 'Mercado de Criptoativos e Finanças Descentralizadas'
                    : 'A Mentalidade do Operador Institucional'
                }
                onSuccess={() => {
                  setIsCheckoutOpen(false);
                  setActiveTab('my-courses');
                }}
                onCancel={() => setIsCheckoutOpen(false)}
              />
            </div>
          ) : selectedCourseId ? (
            <CoursePreview
              courseId={selectedCourseId}
              onBack={() => setSelectedCourseId(null)}
              onOpenCheckout={() => setIsCheckoutOpen(true)}
            />
          ) : (
            <Marketplace onSelectCourse={(id) => setSelectedCourseId(id)} />
          )}
        </div>
      )}

      {/* 2. ABA MEUS CURSOS */}
      {activeTab === 'my-courses' && (
        <div className="p-8 md:p-10 max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#e9c349]">play_lesson</span>
              <span className="text-xs uppercase tracking-widest text-[#e9c349] font-bold font-mono">Área de Estudos</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2 font-headline">Meus Cursos Matriculados</h2>
            <p className="text-gray-400 text-sm">
              Continue seus treinamentos de onde parou e acompanhe seu progresso individual.
            </p>
          </div>

          {enrolledCourseIds.length === 0 ? (
            <div className="bg-[#131313] border border-gray-800/80 rounded-2xl p-10 text-center max-w-2xl mx-auto my-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center mx-auto mb-5 border border-[#e9c349]/20">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-headline">Nenhum Curso Matriculado</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Você está cadastrado na CFA Academy! Para ter sua assinatura ativa e ter acesso imediato às videoaulas e materiais, escolha um curso em nosso catálogo e confirme sua inscrição.
              </p>
              <button
                id="btn-go-to-marketplace-empty"
                onClick={() => {
                  setActiveTab('marketplace');
                  setSelectedCourseId(null);
                }}
                className="inline-flex items-center gap-2 bg-[#e9c349] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#d4b03f] active:scale-95 transition-all cursor-pointer font-headline text-sm shadow-lg"
              >
                <Compass className="w-4 h-4" />
                Explorar Catálogo de Cursos & Matricular-se
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourseIds.map((cId) => {
                const courseData = coursesMap[cId] || {
                  title: 'Curso CFA',
                  image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
                  description: 'Acesse todo o conteúdo programático e aulas gravadas deste treinamento oficial da CFA Academy.'
                };

                return (
                  <div key={cId} className="bg-[#131313] border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:border-[#e9c349]/40 transition-all group">
                    <div className="h-44 overflow-hidden relative">
                      <img
                        src={courseData.image}
                        alt={courseData.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131313] to-transparent"></div>
                      <div className="absolute top-3 left-3 bg-[#e9c349] text-black px-3 py-1 rounded-full text-xs font-bold font-mono">
                        Matriculado
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-lg font-bold text-white mb-2 font-headline group-hover:text-[#e9c349] transition-colors">
                        {courseData.title}
                      </h3>
                      <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                        {courseData.description}
                      </p>

                      <div className="mt-auto space-y-4 pt-2">
                        <div>
                          <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
                            <span>Progresso</span>
                            <span className="text-[#e9c349] font-bold">
                              {userData?.completedLessons?.length ? `${Math.min(100, Math.round((userData.completedLessons.length / 8) * 100))}%` : '0%'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#e9c349] h-full transition-all duration-500 rounded-full"
                              style={{
                                width: `${userData?.completedLessons?.length ? Math.min(100, Math.round((userData.completedLessons.length / 8) * 100)) : 0}%`
                              }}
                            ></div>
                          </div>
                        </div>

                        <button
                          id={`btn-access-lessons-${cId}`}
                          onClick={() => setPlayingCourseId(cId)}
                          className="w-full flex items-center justify-center gap-2 bg-[#e9c349] text-black font-bold py-3 px-4 rounded-xl hover:bg-[#d4b03f] active:scale-95 transition-all cursor-pointer font-headline text-sm shadow-md"
                        >
                          <PlayCircle className="w-5 h-5" />
                          Assistir Aulas do Curso
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Banner de Incentivo para Novos Cursos */}
              <div className="bg-gradient-to-br from-[#131313] to-[#1a1812] border border-[#e9c349]/20 border-dashed rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-headline">Expandir Conhecimento</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Descubra novos cursos de finanças, renda passiva, mercados internacionais e criptoativos na vitrine oficial.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('marketplace');
                    setSelectedCourseId(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-medium py-3 px-4 rounded-xl hover:bg-[#e9c349] hover:text-black transition-all cursor-pointer text-sm font-headline"
                >
                  <BookOpen className="w-4 h-4" />
                  Explorar Vitrine de Cursos
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ABA MEU PERFIL */}
      {activeTab === 'profile' && (
        <div className="p-8 md:p-10 max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-2 font-headline">Meu Perfil de Aluno</h2>
            <p className="text-gray-400 text-sm">
              Gerencie suas credenciais e visualize o status da sua conta de estudos.
            </p>
          </div>

          <div className="bg-[#131313] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-gray-800">
              <div className="w-16 h-16 rounded-full bg-[#e9c349]/15 border border-[#e9c349]/30 flex items-center justify-center text-[#e9c349] text-2xl font-bold font-headline">
                {userData?.firstName ? userData.firstName[0].toUpperCase() : 'A'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-headline">
                  {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'Aluno CFA Academy'}
                </h3>
                <p className="text-xs text-gray-400 font-mono">{userData?.email || auth.currentUser?.email || 'aluno@cfa.ao'}</p>
                <div className="flex items-center gap-2 mt-2">
                  {hasActiveSubscription ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" />
                      Assinatura Ativa ({enrolledCourseIds.length} {enrolledCourseIds.length === 1 ? 'curso' : 'cursos'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <span className="material-symbols-outlined text-xs">info</span>
                      Aluno Cadastrado (Sem Assinatura Ativa)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-black/50 border border-gray-800 p-4 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cursos Matriculados</span>
                <p className="text-2xl font-extrabold text-[#e9c349] font-headline mt-1">
                  {enrolledCourseIds.length}
                </p>
              </div>

              <div className="bg-black/50 border border-gray-800 p-4 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Aulas Concluídas</span>
                <p className="text-2xl font-extrabold text-white font-headline mt-1">
                  {userData?.completedLessons?.length || 0}
                </p>
              </div>

              <div className="bg-black/50 border border-gray-800 p-4 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Certificados</span>
                <p className="text-2xl font-extrabold text-emerald-400 font-headline mt-1">
                  {userData?.completedLessons && userData.completedLessons.length >= 8 ? '1' : '0'}
                </p>
              </div>
            </div>

            {!hasActiveSubscription && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-200">Deseja ativar seu acesso às aulas?</h4>
                  <p className="text-xs text-amber-300/80">Escolha um treinamento no marketplace para liberar seus módulos.</p>
                </div>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="px-4 py-2 bg-[#e9c349] text-black font-bold text-xs rounded-xl hover:bg-[#d4b03f] transition-all cursor-pointer font-headline"
                >
                  Ver Catálogo
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">CFA Academy • Plataforma Oficial de Ensino</span>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer"
              >
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
