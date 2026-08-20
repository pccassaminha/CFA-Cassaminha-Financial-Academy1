import React, { useState, useEffect } from 'react';
import { Lock, PlayCircle, ArrowLeft, CheckCircle2, Shield, Clock } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CoursePreviewProps {
  courseId: string;
  onBack: () => void;
  onOpenCheckout: () => void;
}

interface CourseModule {
  title: string;
  lessonCount: number;
}

interface CourseData {
  title: string;
  description: string;
  price: number;
  image?: string;
  modules: CourseModule[];
}

const DEFAULT_COURSE_DATA: Record<string, CourseData> = {
  'cfa-financial-master': {
    title: 'A Mentalidade do Operador Institucional',
    description: 'Aprenda como os grandes bancos e instituições operam no mercado financeiro global e aplique as mesmas estratégias na sua gestão de capital e tomada de decisão.',
    price: 50000,
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
    modules: [
      { title: 'Módulo 1: Fundamentos da Soberania Financeira', lessonCount: 4 },
      { title: 'Módulo 2: Estrutura de Mercado & Liquidez', lessonCount: 6 },
      { title: 'Módulo 3: Gestão de Risco Institucional', lessonCount: 5 },
      { title: 'Módulo 4: Execução & Psicológico Operacional', lessonCount: 4 },
    ]
  },
  'cfa-soberania-financeira': {
    title: 'Fundamentos da Soberania Financeira',
    description: 'Construa sua base sólida de investimentos, reservas estratégicas em moeda forte e independência financeira passo a passo.',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
    modules: [
      { title: 'Módulo 1: Mentalidade & Desprogramação Financeira', lessonCount: 3 },
      { title: 'Módulo 2: Reserva Estratégica & Gestão de Caixa', lessonCount: 4 },
      { title: 'Módulo 3: Diversificação Internacional', lessonCount: 4 },
    ]
  },
  'cfa-cripto-ativos': {
    title: 'Mercado de Criptoativos e Finanças Descentralizadas',
    description: 'Estratégias avançadas de investimento, custódia própria blindada, segurança digital e análise fundamentalista on-chain.',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&q=80&w=800',
    modules: [
      { title: 'Módulo 1: Introdução ao Bitcoin & Blockchain', lessonCount: 3 },
      { title: 'Módulo 2: Custódia Fria & Segurança Pessoal', lessonCount: 4 },
      { title: 'Módulo 3: Protocolos DeFi & Geração de Renda', lessonCount: 5 },
    ]
  }
};

export default function CoursePreview({ courseId, onBack, onOpenCheckout }: CoursePreviewProps) {
  const [course, setCourse] = useState<CourseData>(() => {
    return DEFAULT_COURSE_DATA[courseId] || DEFAULT_COURSE_DATA['cfa-financial-master'];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const docRef = doc(db, 'courses', courseId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setCourse({
            title: data.title || 'Curso CFA Academy',
            description: data.description || 'Domine conceitos essenciais com instrutores de excelência.',
            price: data.price || 50000,
            image: data.imageUrl || data.image,
            modules: data.modules || [
              { title: 'Módulo 1: Fundamentos da Soberania', lessonCount: 4 },
              { title: 'Módulo 2: Estrutura de Mercado', lessonCount: 6 },
              { title: 'Módulo 3: Gestão de Risco', lessonCount: 5 },
            ]
          });
        } else if (DEFAULT_COURSE_DATA[courseId]) {
          setCourse(DEFAULT_COURSE_DATA[courseId]);
        }
      } catch (err) {
        console.warn("Utilizando dados padrão do curso:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <button 
        id="btn-back-marketplace"
        onClick={onBack} 
        className="flex items-center gap-2 text-gray-400 hover:text-[#e9c349] mb-8 transition-colors text-sm font-medium cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para vitrine
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Coluna da Esquerda: Descrição e Módulos */}
        <div className="lg:col-span-2 space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-[#e9c349]/10 text-[#e9c349] border border-[#e9c349]/20 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
                Programa Oficial
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 font-headline leading-tight">
              {course.title}
            </h1>
            <p className="text-gray-400 leading-relaxed text-base md:text-lg">
              {course.description}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white font-headline">Conteúdo Programático</h3>
              <span className="text-xs text-gray-400 font-mono">
                {course.modules.reduce((acc, m) => acc + m.lessonCount, 0)} aulas no total
              </span>
            </div>
            
            <div className="space-y-3">
              {course.modules.map((mod, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#131313] border border-gray-800/80 p-4 md:p-5 rounded-xl flex items-center justify-between hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm md:text-base font-headline">{mod.title}</h4>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{mod.lessonCount} aulas com material complementar</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#e9c349]/70 font-mono uppercase tracking-wider">Bloqueado</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#131313] border border-gray-800/60 p-6 rounded-2xl">
            <h4 className="text-white font-bold text-base font-headline mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#e9c349]" />
              O que está incluído no acesso:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#e9c349]" />
                <span>Acesso vitalício aos vídeos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#e9c349]" />
                <span>Suporte direto via WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#e9c349]" />
                <span>Exercícios e materiais em PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#e9c349]" />
                <span>Certificado digital de conclusão</span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Card de Compra */}
        <div className="relative">
          <div className="sticky top-10 bg-[#131313] border border-[#e9c349]/30 rounded-2xl p-6 shadow-2xl">
            <div className="aspect-video bg-gray-900 border border-gray-800 rounded-xl mb-6 flex items-center justify-center relative overflow-hidden group">
              {course.image ? (
                <>
                  <img 
                    src={course.image} 
                    alt={course.title} 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#e9c349]/90 text-black flex items-center justify-center shadow-lg">
                      <PlayCircle className="w-8 h-8" />
                    </div>
                  </div>
                </>
              ) : (
                <PlayCircle className="w-12 h-12 text-[#e9c349]" />
              )}
            </div>

            <div className="mb-6">
              <span className="text-xs uppercase text-gray-400 font-bold tracking-wider">Investimento Total</span>
              <div className="text-3xl font-extrabold text-[#e9c349] font-headline mt-1">
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(course.price)}
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#e9c349]" /> Pagamento único via Multicaixa / Express
              </p>
            </div>
            
            <button 
              id="btn-buy-course-preview"
              onClick={onOpenCheckout}
              className="w-full bg-[#e9c349] text-black font-extrabold py-4 px-4 rounded-xl hover:bg-[#d4b03f] active:scale-95 transition-all transform cursor-pointer shadow-lg font-headline text-base"
            >
              Comprar Curso
            </button>
            
            <p className="text-xs text-center text-gray-500 mt-4 leading-relaxed">
              Acesso liberado imediatamente após validação do comprovativo pelo suporte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
