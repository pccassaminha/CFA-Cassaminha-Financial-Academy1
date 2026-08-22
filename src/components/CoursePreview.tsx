import React, { useState, useEffect } from 'react';
import { Lock, PlayCircle, ArrowLeft, CheckCircle2, Shield, Clock, Check } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { LinkifiedText } from './LinkifiedText';
import { useNavigate } from 'react-router-dom';

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

export default function CoursePreview({ courseId, onBack, onOpenCheckout }: CoursePreviewProps) {
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledSuccess, setEnrolledSuccess] = useState(false);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);

  const handleFreeEnroll = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Por favor, faça login ou cadastre-se para acessar o curso gratuito.');
      return;
    }
    try {
      setIsEnrolling(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      let enrolled: string[] = [];
      if (userSnap.exists()) {
        enrolled = Array.isArray(userSnap.data().enrolledCourses) ? userSnap.data().enrolledCourses : [];
      }
      if (!enrolled.includes(courseId)) {
        enrolled.push(courseId);
        await setDoc(userRef, { enrolledCourses: enrolled }, { merge: true });
      }
      setEnrolledSuccess(true);
      setTimeout(() => {
        navigate(`/classroom?courseId=${courseId}`);
      }, 1000);
    } catch (err) {
      console.error("Erro ao matricular em curso gratuito:", err);
      alert('Erro ao liberar acesso ao curso. Tente novamente.');
    } finally {
      setIsEnrolling(false);
    }
  };

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const docRef = doc(db, 'courses', courseId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const rawModules = Array.isArray(data.modules) ? data.modules : [];
          const formattedModules: CourseModule[] = rawModules.map((m: any, idx: number) => ({
            title: m.title || `Módulo ${idx + 1}`,
            lessonCount: Array.isArray(m.lessons) ? m.lessons.length : (m.lessonCount || 0)
          }));

          setCourse({
            title: data.title || 'Curso CFA Academy',
            description: data.description || 'Treinamento prático da CFA Academy.',
            price: Number(data.price) || 0,
            image: data.coverImage || data.imageUrl || data.image || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
            modules: formattedModules
          });
        } else {
          setCourse(null);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do curso:", err);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    const checkEnrollment = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const enrolled = userSnap.data().enrolledCourses || [];
          if (Array.isArray(enrolled) && enrolled.includes(courseId)) {
            setIsAlreadyEnrolled(true);
          }
        }
      } catch (err) {
        console.error("Error checking enrollment:", err);
      }
    };
    checkEnrollment();
  }, [courseId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <p className="text-sm animate-pulse">Carregando detalhes do curso...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-3">Curso não encontrado</h2>
        <p className="text-gray-400 text-sm mb-6">Este curso não está disponível ou foi atualizado recentemente.</p>
        <button
          onClick={onBack}
          className="bg-[#e9c349] text-black font-bold px-6 py-2.5 rounded-xl text-sm"
        >
          Voltar para a vitrine
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10 -m-6 md:-m-10 overflow-hidden">
      {/* CAPA DO CURSO NO FUNDO COM CONTRASTE PREMIUM */}
      {course.image && (
        <div className="absolute top-0 left-0 right-0 h-[520px] overflow-hidden pointer-events-none z-0">
          <img 
            src={course.image} 
            alt={course.title} 
            className="w-full h-full object-cover opacity-45 scale-105 filter brightness-90 saturate-125 transition-all duration-1000" 
            referrerPolicy="no-referrer"
          />
          {/* Gradients de Contraste Premium */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/85 to-[#0a0a0a]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]"></div>
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto">
        <button 
          id="btn-back-marketplace"
          onClick={onBack} 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 border border-gray-800/80 text-gray-300 hover:text-[#e9c349] hover:border-[#e9c349]/50 mb-8 transition-all text-sm font-medium cursor-pointer backdrop-blur-md shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para vitrine
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Coluna da Esquerda: Descrição e Módulos */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-[#131313]/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-gray-800/80 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3.5 py-1 bg-[#e9c349]/20 text-[#e9c349] border border-[#e9c349]/30 rounded-full text-xs font-bold font-mono uppercase tracking-widest shadow-sm">
                  🌟 Programa Oficial CFA
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 font-headline leading-tight drop-shadow-md">
                {course.title}
              </h1>
              <LinkifiedText 
                text={course.description || 'Descrição completa do treinamento e orientações.'} 
                className="text-gray-300 text-base md:text-lg leading-relaxed" 
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-xl md:text-2xl font-bold text-white font-headline">Conteúdo Programático</h3>
                <span className="text-xs text-stone-400 font-mono bg-black/50 px-3 py-1 rounded-full border border-gray-800">
                  {course.modules.reduce((acc, m) => acc + m.lessonCount, 0)} aulas no total
                </span>
              </div>
              
              <div className="space-y-3">
                {course.modules.map((mod, idx) => (
                  <div 
                    key={idx} 
                    className="bg-[#131313]/90 backdrop-blur-md border border-gray-800/80 p-4 md:p-5 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-all shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-800/90 border border-gray-700 flex items-center justify-center shrink-0 shadow-inner">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm md:text-base font-headline">{mod.title}</h4>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{mod.lessonCount} aulas com material complementar</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#e9c349]/70 font-mono uppercase tracking-wider bg-[#e9c349]/10 px-2.5 py-1 rounded-md border border-[#e9c349]/20">Bloqueado</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#131313]/90 backdrop-blur-md border border-gray-800/80 p-6 rounded-2xl shadow-lg">
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
            <div className="sticky top-10 bg-[#131313]/95 backdrop-blur-xl border border-[#e9c349]/40 rounded-3xl p-6 shadow-2xl">
              <div className="aspect-video bg-gray-900 border border-gray-800 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden group shadow-md">
                {course.image ? (
                  <>
                    <img 
                      src={course.image} 
                      alt={course.title} 
                      className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-[#e9c349]/90 text-black flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
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
                <div className={`text-3xl font-extrabold font-headline mt-1 ${!course.price || course.price === 0 ? 'text-emerald-400' : 'text-[#e9c349]'}`}>
                  {!course.price || course.price === 0 ? 'GRÁTIS' : new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(course.price)}
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#e9c349]" /> {!course.price || course.price === 0 ? 'Acesso livre e imediato ao conteúdo' : 'Pagamento único via Multicaixa / Express'}
                </p>
              </div>
              
              {isAlreadyEnrolled ? (
                <button 
                  id="btn-watch-course-preview"
                  onClick={() => navigate(`/classroom?courseId=${courseId}`)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-4 px-4 rounded-xl active:scale-95 transition-all transform cursor-pointer shadow-lg font-headline text-base flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" /> Assistir Curso
                </button>
              ) : enrolledSuccess ? (
                <div className="w-full bg-emerald-500 text-black font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg text-base">
                  <Check className="w-5 h-5" /> Acesso Liberado com Sucesso!
                </div>
              ) : !course.price || course.price === 0 ? (
                <button 
                  id="btn-access-free-course"
                  onClick={handleFreeEnroll}
                  disabled={isEnrolling}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-4 px-4 rounded-xl active:scale-95 transition-all transform cursor-pointer shadow-lg font-headline text-base disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEnrolling ? 'Liberando Acesso...' : 'Assistir Grátis'}
                </button>
              ) : (
                <button 
                  id="btn-buy-course-preview"
                  onClick={onOpenCheckout}
                  className="w-full bg-[#e9c349] text-black font-extrabold py-4 px-4 rounded-xl hover:bg-[#d4b03f] active:scale-95 transition-all transform cursor-pointer shadow-lg font-headline text-base"
                >
                  Comprar Curso
                </button>
              )}
              
              <p className="text-xs text-center text-gray-400 mt-4 leading-relaxed">
                {!course.price || course.price === 0 ? 'Assista aos vídeos do YouTube e estude os módulos sem restrições.' : 'Acesso liberado imediatamente após validação do comprovativo pelo suporte.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
