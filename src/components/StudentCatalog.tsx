import React, { useState, useEffect } from 'react';
import { Play, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
}

export interface StudentCatalogProps {
  onSelectCourse: (courseId: string) => void;
}

export default function StudentCatalog({ onSelectCourse }: StudentCatalogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Busca cursos cadastrados no Firestore em tempo real
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const firestoreCourses: Course[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Apenas cursos publicados ou com dados válidos
        const isPub = data.isPublished ?? (data.status === 'published');
        if (isPub !== false) {
          firestoreCourses.push({
            id: docSnap.id,
            title: data.title || 'Curso CFA',
            description: data.description || 'Treinamento prático na CFA Academy.',
            price: Number(data.price) || 0,
            coverImage: data.coverImage || data.imageUrl || data.image || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200'
          });
        }
      });
      setCourses(firestoreCourses);
      setLoading(false);
    }, (error) => {
      console.warn("Erro ao buscar catálogo do Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Efeito de rotação automática do Banner em Destaque (troca a cada 5 segundos)
  useEffect(() => {
    if (courses.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % courses.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [courses.length]);

  const safeIndex = courses.length > 0 ? (currentIndex < courses.length ? currentIndex : 0) : 0;
  const currentCourse = courses.length > 0 ? courses[safeIndex] : null;

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-white flex items-center justify-center p-8">
        <p className="text-gray-400 text-sm animate-pulse">Carregando catálogo de treinamentos...</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-white p-6 lg:p-12">
        <div className="max-w-2xl mx-auto text-center py-20 bg-[#131313] border border-dashed border-gray-800 rounded-3xl p-10">
          <div className="w-16 h-16 rounded-full bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-headline text-white mb-2">Catálogo em Preparação</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Os cursos de teste foram removidos. Novos treinamentos e formações da CFA Academy estão sendo cadastrados pelo administrador e serão disponibilizados aqui em breve.
          </p>
          <span className="text-xs px-3.5 py-1.5 bg-gray-800/80 rounded-full text-gray-400 font-mono">
            Aguardando publicação de novos conteúdos
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white pb-20">
      {/* --- BANNER ROTATIVO EM DESTAQUE (HERO SECTION) --- */}
      {currentCourse && (
        <div className="relative w-full h-[480px] overflow-hidden bg-black">
          {/* Imagem de Fundo com Gradiente */}
          <div className="absolute inset-0">
            <img 
              src={currentCourse.coverImage} 
              alt={currentCourse.title} 
              className="w-full h-full object-cover opacity-50 transition-all duration-1000 scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent"></div>
          </div>

          {/* Conteúdo do Banner */}
          <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-end px-6 lg:px-10 pb-12">
            <span className="bg-[#e9c349]/20 text-[#e9c349] border border-[#e9c349]/30 text-xs font-bold px-3 py-1 rounded-full w-max mb-3 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5" /> Em Destaque na CFA
            </span>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-3 max-w-2xl drop-shadow-lg font-headline">
              {currentCourse.title}
            </h1>
            <p className="text-gray-300 text-sm lg:text-base max-w-xl mb-6 line-clamp-2 leading-relaxed">
              {currentCourse.description}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                id={`btn-featured-course-${currentCourse.id}`}
                onClick={() => onSelectCourse(currentCourse.id)}
                className="bg-[#e9c349] text-black font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 hover:bg-[#d4b03f] transition-all transform hover:scale-105 shadow-lg shadow-[#e9c349]/20 cursor-pointer font-headline text-sm"
              >
                <Play className="w-5 h-5 fill-black" /> Ver Detalhes e Acesso
              </button>
              <span className="text-xl font-extrabold text-[#e9c349] px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-gray-800 font-headline">
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(currentCourse.price)}
              </span>
            </div>

            {/* Indicadores de Slide (Pontinhos) */}
            {courses.length > 1 && (
              <div className="absolute bottom-4 right-10 flex gap-2">
                {courses.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${idx === safeIndex ? 'w-8 bg-[#e9c349]' : 'w-2 bg-gray-600 hover:bg-gray-400'}`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VITRINE DE TODOS OS CURSOS --- */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-headline">Catálogo de Cursos</h2>
            <p className="text-gray-400 text-sm mt-1">Escolha um treinamento abaixo para expandir suas habilidades.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <div 
              key={course.id} 
              id={`course-card-${course.id}`}
              onClick={() => onSelectCourse(course.id)}
              className="bg-[#131313] border border-gray-800/80 rounded-2xl overflow-hidden hover:border-[#e9c349]/50 transition-all duration-300 group cursor-pointer flex flex-col shadow-xl hover:-translate-y-1"
            >
              <div className="h-52 overflow-hidden relative">
                <img 
                  src={course.coverImage} 
                  alt={course.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent"></div>
                <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-lg border border-gray-800 font-mono">
                  Cursos CFA
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#e9c349] transition-colors line-clamp-1 font-headline">
                    {course.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-6 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-800/60 mt-auto">
                  <span className="text-[#e9c349] font-bold text-lg font-headline">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(course.price)}
                  </span>
                  <span className="bg-white/5 text-white px-4 py-2 rounded-xl text-xs font-bold group-hover:bg-[#e9c349] group-hover:text-black transition-all font-headline">
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
