import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Play } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
  isPublished: boolean;
}

interface StudentCatalogProps {
  onSelectCourse: (course: Course) => void; 
}

export default function StudentCatalog({ onSelectCourse }: StudentCatalogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPublishedCourses = async () => {
      try {
        const q = query(collection(db, 'courses'), where("isPublished", "==", true));
        const querySnapshot = await getDocs(q);
        const coursesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Course[];
        
        setCourses(coursesList);
      } catch (error) {
        console.error("Erro ao buscar cursos:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublishedCourses();
  }, []);

  useEffect(() => {
    if (courses.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % courses.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [courses.length]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-[#0a0a0a] text-[#e9c349]">Carregando catálogo da CFA...</div>;
  }

  if (courses.length === 0) {
    return <div className="flex justify-center items-center h-screen bg-[#0a0a0a] text-gray-500">Nenhum curso disponível no momento.</div>;
  }

  const currentCourse = courses[currentIndex];

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white pb-20">
      {/* BANNER DESTAQUE (HERO) */}
      <div className="relative w-full h-[480px] overflow-hidden bg-black">
        <div className="absolute inset-0">
          {currentCourse.coverImage && (
            <img src={currentCourse.coverImage} alt={currentCourse.title} className="w-full h-full object-cover opacity-50 transition-all duration-1000 scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-end px-6 lg:px-10 pb-12">
          <span className="bg-[#e9c349]/20 text-[#e9c349] text-xs font-bold px-3 py-1 rounded-full w-max mb-3 uppercase tracking-widest">
            🌟 Em Destaque
          </span>
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-3 max-w-2xl drop-shadow-lg">{currentCourse.title}</h1>
          <p className="text-gray-300 text-sm lg:text-base max-w-xl mb-6 line-clamp-2">{currentCourse.description}</p>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => onSelectCourse(currentCourse)}
              className="bg-[#e9c349] text-black font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 hover:bg-[#d4b03f] transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black" /> Acessar Treinamento
            </button>
            <span className="text-xl font-extrabold text-[#e9c349] px-4 py-2 bg-black/60 rounded-xl border border-gray-800">
              {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(currentCourse.price || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* VITRINE EM GRID */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-12">
        <h2 className="text-2xl font-bold tracking-tight mb-8">Catálogo de Cursos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <div key={course.id} onClick={() => onSelectCourse(course)} className="bg-[#131313] border border-gray-800/80 rounded-2xl overflow-hidden hover:border-[#e9c349]/50 transition-all cursor-pointer flex flex-col">
              <div className="h-52 overflow-hidden relative">
                {course.coverImage ? (
                  <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">Sem Capa</div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{course.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-6">{course.description}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-800/60 mt-auto">
                  <span className="text-[#e9c349] font-bold text-lg">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(course.price || 0)}
                  </span>
                  <span className="bg-white/5 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#e9c349] hover:text-black transition-all">
                    Ver Detalhes
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
