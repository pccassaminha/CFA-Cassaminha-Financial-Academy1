import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface MarketplaceCourse {
  id: string;
  title: string;
  price: number;
  image: string;
  description?: string;
  instructor?: string;
}

const DEFAULT_COURSES: MarketplaceCourse[] = [
  { 
    id: 'cfa-financial-master', 
    title: 'Operador Institucional Avançado', 
    price: 50000, 
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
    description: 'Domine a mecânica do mercado financeiro e a gestão de risco de nível institucional.'
  },
  { 
    id: 'cfa-soberania-financeira', 
    title: 'Fundamentos da Soberania Financeira', 
    price: 35000, 
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
    description: 'Construa sua base sólida de investimentos, reservas estratégicas e independência.'
  },
  {
    id: 'cfa-cripto-ativos',
    title: 'Mercado de Criptoativos e Finanças Descentralizadas',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&q=80&w=800',
    description: 'Estratégias de investimento, segurança em custódia própria e análise on-chain.'
  }
];

export default function Marketplace({ onSelectCourse }: { onSelectCourse: (id: string) => void }) {
  const [courses, setCourses] = useState<MarketplaceCourse[]>(DEFAULT_COURSES);

  useEffect(() => {
    // Busca cursos cadastrados no Firestore (se existirem)
    const unsubscribe = onSnapshot(collection(db, 'courses'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreCourses: MarketplaceCourse[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Curso CFA',
            price: data.price || 35000,
            image: data.imageUrl || data.image || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
            description: data.description || '',
            instructor: data.instructor || 'CFA Academy'
          };
        });
        setCourses(firestoreCourses);
      }
    }, (error) => {
      console.warn("Utilizando catálogo padrão da CFA:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 md:p-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[#e9c349]">school</span>
          <span className="text-xs uppercase tracking-widest text-[#e9c349] font-bold font-mono">CFA Academy Catalog</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2 font-headline">Descubra novos conhecimentos</h2>
        <p className="text-gray-400 text-sm max-w-xl">
          Escolha um curso, faça o pagamento e expanda suas habilidades financeiras com metodologias comprovadas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <div 
            key={course.id} 
            id={`course-card-${course.id}`}
            className="bg-[#131313] border border-gray-800/80 rounded-2xl overflow-hidden hover:border-[#e9c349]/50 transition-all duration-300 group cursor-pointer flex flex-col shadow-xl hover:-translate-y-1" 
            onClick={() => onSelectCourse(course.id)}
          >
            <div className="h-48 overflow-hidden relative">
              <img 
                src={course.image} 
                alt={course.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent"></div>
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
                <span className="text-[11px] font-bold text-[#e9c349] font-mono uppercase tracking-wider">Acesso Imediato</span>
              </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 font-headline group-hover:text-[#e9c349] transition-colors">
                {course.title}
              </h3>
              
              {course.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                  {course.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800/60">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-500 font-bold">Investimento</span>
                  <span className="text-[#e9c349] font-bold text-xl font-headline">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(course.price)}
                  </span>
                </div>
                <button 
                  id={`btn-view-${course.id}`}
                  className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#e9c349] hover:text-black active:scale-95 transition-all cursor-pointer font-headline"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
