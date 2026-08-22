import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Play } from 'lucide-react';

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
  isPublished: boolean;
}

export interface StudentCatalogProps {
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
    <div className="bg-[#0a0a0a] min-h-screen text-white pb-16 sm:pb-20">
      {/* BANNER DESTAQUE (HERO) */}
      <div className="relative w-full h-[380px] sm:h-[480px] overflow-hidden bg-black">
        <div className="absolute inset-0">
          {currentCourse.coverImage && (
            <img src={currentCourse.coverImage} alt={currentCourse.title} className="w-full h-full object-cover opacity-50 transition-all duration-1000 scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-end px-4 sm:px-6 lg:px-10 pb-8 sm:pb-12">
          <span className="bg-[#e9c349]/20 text-[#e9c349] text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full w-max mb-2 sm:mb-3 uppercase tracking-widest border border-[#e9c349]/30">
            🌟 Em Destaque
          </span>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-2 sm:mb-3 max-w-2xl drop-shadow-lg leading-tight">{currentCourse.title}</h1>
          <p className="text-gray-300 text-xs sm:text-sm lg:text-base max-w-xl mb-4 sm:mb-6 line-clamp-3 sm:line-clamp-5 leading-relaxed">{currentCourse.description}</p>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
            <button 
              onClick={() => onSelectCourse(currentCourse)}
              className="w-full sm:w-auto bg-[#e9c349] text-black font-extrabold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#d4b03f] transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Play className="w-5 h-5 fill-black" /> Aprender Agora
            </button>
            <span className={`text-lg sm:text-xl font-extrabold px-4 py-2.5 bg-black/70 backdrop-blur-md rounded-xl border border-gray-800 text-center w-full sm:w-auto ${!currentCourse.price || currentCourse.price === 0 ? 'text-emerald-400' : 'text-[#e9c349]'}`}>
              {!currentCourse.price || currentCourse.price === 0 ? 'GRÁTIS' : new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(currentCourse.price)}
            </span>
          </div>
        </div>
      </div>

      {/* VITRINE EM GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-8 sm:mt-12">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-6 sm:mb-8 font-headline">Catálogo de Cursos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          {courses.map((course) => (
            <div key={course.id} onClick={() => onSelectCourse(course)} className="bg-[#131313] border border-gray-800/80 rounded-2xl overflow-hidden hover:border-[#e9c349]/50 transition-all cursor-pointer flex flex-col shadow-lg active:scale-[0.99]">
              <div className="h-44 sm:h-52 overflow-hidden relative">
                {course.coverImage ? (
                  <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">Sem Capa</div>
                )}
              </div>
              <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm line-clamp-3 sm:line-clamp-5 leading-relaxed mb-4 sm:mb-6">{course.description}</p>
                </div>
                <div className="flex items-center justify-between pt-3.5 border-t border-gray-800/60 mt-auto">
                  <span className={`font-bold text-base sm:text-lg ${!course.price || course.price === 0 ? 'text-emerald-400 font-extrabold' : 'text-[#e9c349]'}`}>
                    {!course.price || course.price === 0 ? 'GRÁTIS' : new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(course.price)}
                  </span>
                  <span className="bg-white/5 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[#e9c349] hover:text-black transition-all">
                    Aprender Agora
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
