import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BookOpen, Layers } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface CourseItem {
  id: string;
  title: string;
  price: number;
  status: 'published' | 'draft';
  modulesCount: number;
  description?: string;
}

interface CoursesListProps {
  onSelectCourse: (courseId: string) => void;
}

const defaultCourses: CourseItem[] = [
  { id: 'c1', title: 'Formação de Traders Profissionais', price: 50000, status: 'published', modulesCount: 2 },
  { id: 'c2', title: 'Fundamentos da Soberania Financeira', price: 35000, status: 'draft', modulesCount: 1 },
  { id: 'c3', title: 'Mercado de Criptoativos e Finanças Descentralizadas', price: 45000, status: 'published', modulesCount: 1 },
];

export default function CoursesList({ onSelectCourse }: CoursesListProps) {
  const [courses, setCourses] = useState<CourseItem[]>(defaultCourses);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'courses'));
        if (!querySnapshot.empty) {
          const list: CourseItem[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              title: data.title || 'Curso Sem Título',
              price: Number(data.price) || 0,
              status: (data.isPublished ?? data.status === 'published') ? 'published' : 'draft',
              modulesCount: Array.isArray(data.modules) ? data.modules.length : (data.modulesCount || 0),
              description: data.description || ''
            });
          });
          if (isMounted) setCourses(list);
        }
      } catch (err) {
        console.error("Erro ao carregar lista de cursos:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCourses();
    return () => { isMounted = false; };
  }, []);

  const handleCreateNewCourse = async () => {
    const courseTitle = prompt('Título da nova formação / curso:');
    if (!courseTitle || !courseTitle.trim()) return;

    const newId = `c_${Date.now()}`;
    const newCourseData = {
      title: courseTitle.trim(),
      description: 'Descrição do curso e estrutura de aprendizado.',
      price: 50000,
      isPublished: false,
      status: 'draft',
      modules: [
        {
          id: `m_${Date.now()}`,
          title: 'Módulo 1: Introdução e Fundamentos',
          status: 'published',
          lessons: []
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'courses', newId), newCourseData);
      setCourses(prev => [
        {
          id: newId,
          title: courseTitle.trim(),
          price: 50000,
          status: 'draft',
          modulesCount: 1
        },
        ...prev
      ]);
      onSelectCourse(newId);
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      // Fallback local
      onSelectCourse(newId);
    }
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("Tem certeza que deseja excluir este curso e toda a sua grade?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'courses', courseId));
    } catch (err) {
      console.error("Erro ao deletar curso:", err);
    }
    setCourses(prev => prev.filter(c => c.id !== courseId));
  };

  return (
    <div className="p-6 lg:p-10 text-white max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10 pb-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2 text-[#e9c349] mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest font-label">Catálogo de Formações</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline">Gestão de Conteúdo</h1>
          <p className="text-xs text-gray-400 mt-1">Gerencie os cursos, módulos, aulas em vídeo (Wistia/YouTube) e preços da academia.</p>
        </div>
        <button 
          onClick={handleCreateNewCourse}
          className="bg-[#e9c349] text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#d4b03f] transition-all cursor-pointer shadow-lg active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Novo Curso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <div 
            key={course.id} 
            className="bg-[#131313] border border-gray-800 rounded-2xl p-6 hover:border-[#e9c349]/50 transition-all shadow-xl flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase ${
                  course.status === 'published' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {course.status === 'published' ? 'PUBLICADO' : 'RASCUNHO'}
                </span>
                <div className="flex gap-1 text-gray-400">
                  <button 
                    onClick={() => onSelectCourse(course.id)}
                    className="hover:text-[#e9c349] p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Editar Curso"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteCourse(course.id, e)}
                    className="hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Excluir Curso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-[#e9c349] transition-colors line-clamp-2 font-headline">
                {course.title}
              </h3>
              
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-lg font-bold text-[#e9c349] font-mono">
                  {Number(course.price || 0).toLocaleString('pt-AO')}
                </span>
                <span className="text-xs text-[#e9c349]/80 font-bold">Kz</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800/80 text-xs">
              <span className="text-gray-400 font-mono flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                {course.modulesCount} {course.modulesCount === 1 ? 'Módulo' : 'Módulos'}
              </span>
              <button 
                onClick={() => onSelectCourse(course.id)}
                className="text-[#e9c349] font-bold hover:underline cursor-pointer flex items-center gap-1 text-xs"
              >
                Gerenciar Aulas →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
