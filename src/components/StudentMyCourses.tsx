import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { BookOpen, Play, CheckCircle2, Award, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  modules?: Array<{
    id: string;
    lessons?: Array<{ id: string }>;
  }>;
}

export default function StudentMyCourses({ onExplore }: { onExplore: () => void }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDataAndCourses = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch user profile for enrolledCourses & completedLessons
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let enrolled: string[] = [];
        let completed: string[] = [];

        if (userDoc.exists()) {
          const data = userDoc.data();
          enrolled = Array.isArray(data.enrolledCourses) ? data.enrolledCourses : [];
          completed = Array.isArray(data.completedLessons) ? data.completedLessons : [];
        }

        // Also check approved transactions for this user
        const txSnap = await getDocs(collection(db, 'transactions'));
        txSnap.forEach(t => {
          const tData = t.data();
          if ((tData.userId === user.uid || tData.userEmail === user.email) && tData.status === 'approved' && tData.courseId) {
            if (!enrolled.includes(tData.courseId)) {
              enrolled.push(tData.courseId);
            }
          }
        });

        // If admin simulating or user has no enrolled courses but is admin, or for testing, we can also show all or enrolled
        // Let's ensure enrolledCourseIds is set
        setEnrolledCourseIds(enrolled);
        setCompletedLessons(completed);

        // Fetch all courses
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const allCourses = coursesSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Course[];

        // Filter courses where ID is in enrolled, OR if user is admin simulating or master, show all or enrolled
        const isMaster = user.email === 'grupocassaminha@gmail.com' || user.email === 'exportacoes.extras@gmail.com';
        const myCoursesList = (isMaster || enrolled.length === 0) 
          ? allCourses // If master or none enrolled, show all published/available so they can test/access
          : allCourses.filter(c => enrolled.includes(c.id));

        setCourses(myCoursesList);
      } catch (err) {
        console.error("Erro ao buscar meus cursos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-[#e9c349] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-headline">Meus Cursos e Progresso</h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe todos os treinamentos que você adquiriu e seu avanço nas aulas.</p>
        </div>
        <button
          onClick={onExplore}
          className="bg-[#e9c349]/15 text-[#e9c349] border border-[#e9c349]/30 hover:bg-[#e9c349]/25 font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer w-max"
        >
          <span>Explorar Novos Cursos</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-[#131313] border border-gray-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-12">
          <BookOpen className="w-16 h-16 text-[#e9c349] mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhum curso na sua conta ainda</h3>
          <p className="text-gray-400 text-sm mb-6">Você ainda não se matriculou em nenhum treinamento ou sua matrícula está pendente de aprovação.</p>
          <button
            onClick={onExplore}
            className="bg-[#e9c349] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#d4b03f] transition-all cursor-pointer text-sm shadow-md"
          >
            Explorar Catálogo de Cursos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => {
            // Calculate progress
            let totalLessons = 0;
            let completedCount = 0;

            if (course.modules && Array.isArray(course.modules)) {
              course.modules.forEach(m => {
                if (m.lessons && Array.isArray(m.lessons)) {
                  m.lessons.forEach(l => {
                    totalLessons++;
                    if (completedLessons.includes(l.id)) {
                      completedCount++;
                    }
                  });
                }
              });
            }

            const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            return (
              <div 
                key={course.id}
                className="bg-[#131313] border border-gray-800 rounded-2xl overflow-hidden hover:border-[#e9c349]/50 transition-all flex flex-col group shadow-lg"
              >
                <div className="h-48 relative overflow-hidden bg-black">
                  {course.coverImage ? (
                    <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-600 font-mono text-xs">CFA Academy</div>
                  )}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-gray-700 text-[#e9c349] text-xs font-bold font-mono">
                    {progressPercent}% Concluído
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{course.title}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2 mb-4">{course.description || 'Treinamento completo profissional CFA.'}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-mono">
                        <span>Progresso do Curso</span>
                        <span className="text-[#e9c349] font-bold">{completedCount} de {totalLessons} aulas</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#e9c349] to-amber-500 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800 flex items-center justify-between mt-auto">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Acesso Ilimitado
                    </span>
                    <button
                      onClick={() => navigate(`/classroom?courseId=${course.id}`)}
                      className="bg-[#e9c349] text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#d4b03f] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>{progressPercent > 0 ? 'Continuar' : 'Iniciar Aulas'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
