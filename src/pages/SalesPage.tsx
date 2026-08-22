import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  BookOpen, 
  ArrowRight, 
  Lock, 
  ShieldCheck, 
  MessageCircle, 
  Play, 
  ShoppingBag, 
  CheckCircle,
  X,
  HelpCircle,
  Users
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
  isPublished: boolean;
  structureType?: 'modules' | 'single_lesson' | 'direct_link';
}

export default function SalesPage() {
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Modal State for authentication prompts
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalType, setModalType] = useState<'free' | 'paid'>('free');
  const [selectedCourseName, setSelectedCourseName] = useState('');

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch logo settings
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const generalDoc = await getDoc(doc(db, 'settings', 'general'));
        if (generalDoc.exists() && generalDoc.data().logoUrl) {
          setLogoUrl(generalDoc.data().logoUrl);
        }
        const platformDoc = await getDoc(doc(db, 'settings', 'platform'));
        if (platformDoc.exists() && platformDoc.data().logoUrl) {
          setLogoUrl(platformDoc.data().logoUrl);
        }
      } catch (err) {
        console.error("Error loading logo in Sales page:", err);
      }
    };
    fetchLogo();
  }, []);

  // Fetch published courses from database
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const q = query(collection(db, 'courses'), where("isPublished", "==", true));
        const querySnapshot = await getDocs(q);
        const coursesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Course[];
        setCourses(coursesList);
      } catch (err) {
        console.error("Erro ao carregar cursos na Landing Page:", err);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Handler for course CTA button clicks
  const handleCourseAction = (course: Course) => {
    const isFree = !course.price || course.price === 0;

    if (!currentUser) {
      // User is not logged in, trigger our high-end auth warning modal
      setSelectedCourseName(course.title);
      setModalType(isFree ? 'free' : 'paid');
      setShowAuthModal(true);
    } else {
      // User is logged in, navigate straight to library/checkout
      if (isFree) {
        navigate('/library');
      } else {
        // Redirect to portal which handles checkout previews
        navigate('/library');
      }
    }
  };

  return (
    <div className="antialiased selection:bg-primary/30 selection:text-primary bg-[#131313] text-[#e5e2e1] font-body min-h-screen relative">
      {/* Delicate background grids & glows */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }}></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#e9c349]/5 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-[#e9c349]/5 blur-[150px] rounded-full pointer-events-none"></div>
      
      {/* Top Navigation Bar (Middle Links removed per requested focus layout selection) */}
      <nav className="fixed top-0 w-full z-50 bg-[#131313]/85 backdrop-blur-xl transition-all border-b border-white/5">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto font-headline tracking-tight">
          <Link to="/sales" className="flex items-center cursor-pointer" id="sales-logo-link">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-16 md:h-20 w-auto object-contain rounded-xl shadow-md transition-all" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#e9c349] flex items-center justify-center font-black text-black text-base">CFA</div>
                <span className="text-2xl font-black tracking-tighter text-[#e9c349]">CFA Academy</span>
              </div>
            )}
          </Link>
          
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link to="/library" className="bg-[#e9c349] text-stone-900 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm hover:opacity-90 transition-all flex items-center gap-1.5 shadow-[0_4px_12px_rgba(233,195,115,0.2)]">
                <BookOpen className="w-4 h-4" /> Ir para Minha Área
              </Link>
            ) : (
              <>
                <Link to="/" className="text-stone-300 hover:text-[#e9c349] font-bold text-sm px-4 py-2 transition-colors">
                  Entrar
                </Link>
                <Link to="/" state={{ register: true }} className="bg-[#e9c349] text-stone-900 px-5 py-2.5 rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(233,195,115,0.2)]">
                  Criar Conta
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 relative z-10">
        
        {/* Dynamic Premium Hero Section */}
        <section className="relative min-h-[640px] md:min-h-[750px] flex items-center overflow-hidden px-6 lg:px-12 mb-16">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#131313] via-[#131313]/90 to-transparent z-10"></div>
            <img 
              className="w-full h-full object-cover object-right opacity-25" 
              alt="CFA Hero background" 
              src="https://images.unsplash.com/photo-1591696205602-2f950c417cb9?auto=format&fit=crop&q=80&w=1200" 
            />
          </div>
          <div className="relative z-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-8">
            <div className="space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high/60 border border-[#e9c349]/10">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-300 font-label">Cassaminha Financial Academy</span>
              </div>
              <h1 className="font-headline text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white">
                Aprenda as Habilidades <span className="bg-gradient-to-br from-[#e9c349] to-[#b39129] bg-clip-text text-transparent">Que Geram Resultados</span>
              </h1>
              <p className="text-stone-300 text-base md:text-lg max-w-xl font-body leading-relaxed">
                Tenha acesso a cursos práticos de alto impacto criados por especialistas de diversos nichos. Desenvolva novos talentos, domine ferramentas modernas e conquiste seus objetivos passo a passo.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link to="/" state={{ register: true }} className="w-full sm:w-auto bg-[#e9c349] text-stone-900 px-8 py-4 rounded-xl font-bold text-base text-center hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-[0_4px_16px_rgba(233,195,115,0.25)]">
                  Criar Minha Conta Grátis
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#cursos" className="w-full sm:w-auto px-6 py-4 rounded-xl font-semibold text-sm text-stone-300 hover:text-white bg-stone-800/40 hover:bg-stone-800/80 border border-stone-700/50 text-center transition-all">
                  Explorar Catálogo de Cursos
                </a>
              </div>
            </div>

            {/* Video Presentation Placeholder Frame */}
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-[#181818]/80 group cursor-pointer">
              <img 
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 opacity-45" 
                alt="Presentation Preview" 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#e9c349]/20 backdrop-blur-xl flex items-center justify-center border border-[#e9c349]/40 group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-7 h-7 text-[#e9c349] fill-[#e9c349]" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 bg-[#131313]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#e9c349]">Apresentação Oficial</p>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Showcase of Available Courses */}
        <section id="cursos" className="max-w-7xl mx-auto px-6 lg:px-12 py-16 scroll-mt-20">
          <div className="mb-12 text-center md:text-left space-y-2">
            <span className="text-[#e9c349] font-bold uppercase tracking-[0.3em] text-xs">Formações Exclusivas</span>
            <h2 className="font-headline text-3xl md:text-5xl font-black text-white">Nossos Treinamentos Disponíveis</h2>
            <p className="text-stone-400 text-sm md:text-base max-w-2xl leading-relaxed">
              Inicie agora mesmo a sua capacitação prática. Selecione abaixo o treinamento que melhor atende ao seu momento profissional:
            </p>
          </div>

          {isLoadingCourses ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-[#e9c349] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-stone-400 text-sm font-mono">Conectando ao banco de dados da CFA...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#181818] border border-white/5 text-center max-w-xl mx-auto space-y-4">
              <BookOpen className="w-12 h-12 text-stone-500 mx-auto opacity-50" />
              <h3 className="font-bold text-lg text-white">Nenhum treinamento publicado ainda</h3>
              <p className="text-sm text-stone-400">Nossa equipe está configurando novos cursos exclusivos. Por favor, volte a visitar esta página em instantes ou crie seu cadastro para receber avisos.</p>
              <Link to="/" state={{ register: true }} className="inline-block px-6 py-2.5 bg-[#e9c349] text-stone-900 rounded-xl font-bold text-xs hover:opacity-90">
                Criar Cadastro de Espera
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => {
                const isFree = !course.price || course.price === 0;
                
                return (
                  <div 
                    key={course.id} 
                    className="bg-[#181818]/60 border border-white/5 rounded-2xl overflow-hidden hover:border-[#e9c349]/30 transition-all flex flex-col group hover:shadow-2xl hover:shadow-[#e9c349]/5"
                  >
                    {/* Course Header/Cover */}
                    <div className="h-48 overflow-hidden relative bg-stone-900">
                      {course.coverImage ? (
                        <img 
                          src={course.coverImage} 
                          alt={course.title} 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#202020]">
                          <BookOpen className="w-12 h-12 text-[#e9c349] opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border tracking-wider shadow-lg ${
                          isFree 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : 'bg-[#e9c349]/15 text-[#e9c349] border-[#e9c349]/30'
                        }`}>
                          {isFree ? 'Conteúdo Grátis' : 'Inscrição Premium'}
                        </span>
                      </div>
                    </div>

                    {/* Course Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-headline font-bold text-lg md:text-xl text-white group-hover:text-[#e9c349] transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-stone-400 text-xs md:text-sm font-body leading-relaxed line-clamp-3">
                          {course.description || "Inicie os seus estudos práticos sobre esta competência essencial com o ecossistema e suporte integral da CFA."}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {/* Price Badge */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Valor do Curso</span>
                          <span className={`text-lg font-black ${isFree ? 'text-emerald-400' : 'text-white'}`}>
                            {isFree ? 'GRÁTIS' : new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(course.price)}
                          </span>
                        </div>

                        {/* Direct Call to Action buttons */}
                        <button
                          onClick={() => handleCourseAction(course)}
                          className={`w-full py-3.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isFree 
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/10' 
                              : 'bg-[#e9c349] hover:bg-[#d8b33c] text-stone-900 shadow-lg shadow-[#e9c349]/10'
                          }`}
                        >
                          {isFree ? (
                            <>
                              <Play className="w-4 h-4 fill-white" />
                              <span>Assistir Grátis</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-4 h-4" />
                              <span>Comprar Curso</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Benefits & Authority Section */}
        <section className="bg-[#181818]/40 py-20 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#e9c349]/5 blur-[80px] rounded-full"></div>
              <img 
                className="rounded-2xl grayscale hover:grayscale-0 transition-all duration-1000 border border-white/5 relative z-10 opacity-70" 
                alt="Workspace and authority" 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800" 
              />
            </div>
            <div className="space-y-6">
              <span className="text-[#e9c349] font-bold text-xs uppercase tracking-widest">Sólida Experiência</span>
              <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-white">Por que aprender com a nossa metodologia?</h2>
              <p className="text-stone-400 text-sm md:text-base leading-relaxed">
                Nossos métodos não se baseiam em teorias superficiais. Você aprende através de conteúdos diretos ao ponto, criados por instrutores experientes que vivem o que ensinam diariamente.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center shrink-0 border border-[#e9c349]/20">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Metodologia 100% Prática</h4>
                    <p className="text-stone-400 text-xs mt-0.5">Aulas dinâmicas e focadas em exercícios reais para você aprender aplicando.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center shrink-0 border border-[#e9c349]/20">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Comunidade de Alunos</h4>
                    <p className="text-stone-400 text-xs mt-0.5">Troque experiências, faça networking valioso e tire dúvidas com outros estudantes.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center shrink-0 border border-[#e9c349]/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Certificado de Conclusão</h4>
                    <p className="text-stone-400 text-xs mt-0.5">Documentação de prestígio que atesta suas novas competências profissionais.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final Registration CTA Section */}
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="bg-[#181818] p-8 md:p-12 rounded-[2rem] border border-white/5 relative overflow-hidden">
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#e9c349]/5 blur-[100px] rounded-full"></div>
            <h3 className="font-headline text-3xl md:text-4xl font-black text-white mb-3">Inicie sua Formação na CFA</h3>
            <p className="text-stone-400 mb-8 max-w-lg mx-auto text-sm">Cadastre-se hoje mesmo para ter acesso instantâneo ao nosso catálogo e começar a assistir às aulas gratuitas.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto justify-center mb-6">
              <Link to="/" state={{ register: true }} className="w-full sm:w-auto px-8 bg-[#e9c349] text-stone-900 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(233,195,115,0.25)]">
                Criar Minha Conta de Aluno
              </Link>
              <Link to="/" className="w-full sm:w-auto px-8 bg-stone-800 text-stone-200 border border-stone-700 py-4 rounded-xl font-bold text-base hover:bg-stone-700 transition-all">
                Entrar na Conta
              </Link>
            </div>
            
            <p className="text-stone-500 text-xs flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Acesso 100% criptografado e seguro.
            </p>
          </div>
        </section>

      </main>

      {/* Footer Navigation (With Portuguese terms links and currency information) */}
      <footer className="w-full border-t border-white/5 bg-[#0e0e0e] text-xs uppercase tracking-widest relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 md:px-12 py-10 gap-6 max-w-7xl mx-auto">
          <div className="text-[#e9c349] font-black tracking-tight text-base">CFA - Cassaminha Financial Academy</div>
          
          <div className="flex gap-6 md:gap-8 text-[10px]">
            <Link className="text-stone-500 hover:text-[#e9c349] transition-colors" to="/privacidade">Política de Privacidade</Link>
            <Link className="text-stone-500 hover:text-[#e9c349] transition-colors" to="/termos">Termos de Uso</Link>
          </div>
          
          <div className="text-stone-500 normal-case tracking-normal text-right text-[10px] md:text-xs">
            © 2026 CFA. Todos os direitos reservados. Faturamentos seguros em Kwanza (AOA).
          </div>
        </div>
      </footer>

      {/* Floating Support WhatsApp Button */}
      <a 
        href="https://wa.me/244923000000?text=Olá!%20Gostaria%20de%20tirar%20dúvidas%20sobre%20os%20cursos%20da%20CFA%20Academy." 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-full font-bold shadow-2xl hover:bg-[#20ba5a] active:scale-95 transition-all duration-200 group cursor-pointer"
        title="Dúvidas? Fale conosco no WhatsApp"
      >
        <MessageCircle className="w-5 h-5 fill-white" />
        <span className="text-xs tracking-wide uppercase font-headline">Dúvidas? WhatsApp</span>
        {/* Glow pulsing ring around the green button */}
        <span className="absolute -inset-1 rounded-full border-2 border-[#25D366]/40 animate-ping pointer-events-none"></span>
      </a>

      {/* Authentic Auth Warning Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setShowAuthModal(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          ></div>
          
          {/* Modal Container */}
          <div className="relative bg-[#181818] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center mx-auto border border-[#e9c349]/30">
              {modalType === 'free' ? <Play className="w-5 h-5 fill-[#e9c349]" /> : <ShoppingBag className="w-5 h-5" />}
            </div>

            <div className="space-y-2">
              <h3 className="font-headline font-black text-xl text-white">Identificação Necessária</h3>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Para {modalType === 'free' ? 'assistir gratuitamente às aulas do curso' : 'concluir a inscrição premium no curso'} <strong className="text-white">"{selectedCourseName}"</strong>, é necessário preencher seus dados de cadastro ou efetuar o seu login de aluno.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link 
                to="/" 
                state={{ register: true }} 
                className="w-full py-3 bg-[#e9c349] text-stone-900 rounded-xl font-bold text-sm block hover:opacity-90 transition-all shadow-md shadow-[#e9c349]/10"
              >
                Criar Minha Conta Grátis
              </Link>
              <Link 
                to="/" 
                className="w-full py-3 bg-stone-800 text-stone-200 border border-stone-700 rounded-xl font-semibold text-sm block hover:bg-stone-700 transition-all"
              >
                Já tenho conta (Entrar)
              </Link>
            </div>

            <p className="text-[10px] text-stone-500 font-medium">O cadastro leva menos de 1 minuto e é totalmente gratuito.</p>
          </div>
        </div>
      )}

    </div>
  );
}
