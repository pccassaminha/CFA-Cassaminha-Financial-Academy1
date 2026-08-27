import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { subscribeUserEnrollments, addCourseToUser } from '../services/enrollmentService';
import { Play, SearchX, Plus, Check, BookmarkCheck, Sparkles } from 'lucide-react';
import ExpandableSearch from './ExpandableSearch';
import { Coupon } from '../types';
import { EcosystemFooter } from './EcosystemFooter';

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
  isPublished: boolean;
  producerName?: string;
  instructor?: string;
}

export interface StudentCatalogProps {
  onSelectCourse: (course: Course) => void; 
}

export default function StudentCatalog({ onSelectCourse }: StudentCatalogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const couponsSnap = await getDoc(doc(db, 'settings', 'coupons')).catch(() => null);
        let loadedCoupons: Coupon[] = [];
        if (couponsSnap?.exists() && Array.isArray(couponsSnap.data().list)) {
          loadedCoupons = couponsSnap.data().list;
        } else {
          const directCouponsSnap = await getDocs(collection(db, 'coupons')).catch(() => null);
          if (directCouponsSnap && !directCouponsSnap.empty) {
            loadedCoupons = directCouponsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
          }
        }
        const activeCoupons = loadedCoupons.filter(c => c && c.active !== false);
        setCoupons(activeCoupons);
      } catch (err) {
        console.error("Erro ao carregar cupões no catálogo:", err);
      }
    };
    fetchCoupons();
  }, []);

  const getCourseDiscountInfo = (course: Course) => {
    if (!course.price || course.price === 0) return { isFree: true, hasDiscount: false, discountedPrice: 0, couponCode: null, discountValue: 0, discountType: 'percentage' };
    
    // Filtrar todos os cupões aplicáveis a este curso
    const applicableCoupons = coupons.filter(c => {
      if (c.active === false) return false; // Ignorar inativos

      if (c.scope === 'course') {
        return c.courseId === course.id;
      }
      if (c.scope === 'producer') {
        const adminEmails = ['grupocassaminha@gmail.com', 'exportacoes.extras@gmail.com', 'grupocassaminha@gmail.com'];
        const courseAuthorId = course.authorId;
        const courseAuthorEmail = course.authorEmail;
        const couponProducerId = c.producerId;
        const couponProducerEmail = c.producerEmail;
        
        if (couponProducerId && courseAuthorId && couponProducerId === courseAuthorId) return true;
        if (couponProducerEmail && courseAuthorEmail && couponProducerEmail.toLowerCase() === courseAuthorEmail.toLowerCase()) return true;
        
        // Cursos antigos sem owner são do admin
        const isCourseOldAdmin = !courseAuthorId && !courseAuthorEmail;
        // Cupões criados pelo admin (ou antes de ter email salvo)
        const isCouponAdmin = !couponProducerEmail || adminEmails.includes(couponProducerEmail.toLowerCase());
        
        if (isCourseOldAdmin && isCouponAdmin) {
           return true;
        }
        
        return false;
      }
      if (c.scope === 'all' || c.scope === 'general' || !c.scope) {
        return !c.courseId; // Cupão geral não pode estar atrelado a um ID de curso específico
      }
      return false;
    });

    if (applicableCoupons.length === 0) {
      return { isFree: false, hasDiscount: false, discountedPrice: course.price, couponCode: null, discountValue: 0, discountType: 'percentage' };
    }

    // Encontrar o cupão que oferece o MAIOR desconto
    let bestCoupon = null;
    let maxDiscountAmount = 0;

    applicableCoupons.forEach(coupon => {
      let currentDiscountAmount = 0;
      if (coupon.type === 'percentage') {
        currentDiscountAmount = (course.price * Number(coupon.discountValue)) / 100;
      } else if (coupon.type === 'fixed') {
        currentDiscountAmount = Number(coupon.discountValue);
      }
      
      if (currentDiscountAmount > course.price) {
        currentDiscountAmount = course.price;
      }

      if (currentDiscountAmount > maxDiscountAmount) {
        maxDiscountAmount = currentDiscountAmount;
        bestCoupon = coupon;
      }
    });

    if (!bestCoupon || maxDiscountAmount <= 0) {
      return { isFree: false, hasDiscount: false, discountedPrice: course.price, couponCode: null, discountValue: 0, discountType: 'percentage' };
    }
    
    const discountedPrice = Math.max(0, course.price - maxDiscountAmount);
    return {
      isFree: false,
      hasDiscount: discountedPrice < course.price,
      discountedPrice,
      couponCode: bestCoupon.code,
      discountValue: bestCoupon.discountValue,
      discountType: bestCoupon.type
    };
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const unsub = subscribeUserEnrollments(currentUser, (enrollData) => {
      setEnrolledCourseIds(enrollData.enrolledCourses);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'courses'), where("isPublished", "==", true)), (snapshot) => {
      const coursesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];
      setCourses(coursesList);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar cursos:", error);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (courses.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % courses.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [courses.length]);

  const handleQuickAddFreeCourse = async (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      onSelectCourse(course);
      return;
    }

    try {
      setEnrollingCourseId(course.id);
      await addCourseToUser(currentUser.uid, currentUser.email, course.id);
      setToastMessage(`" ${course.title} " foi adicionado aos Meus Cursos!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Erro ao adicionar curso grátis:", err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-[#0a0a0a] text-[#e9c349]">Carregando catálogo da CFA...</div>;
  }

  if (courses.length === 0) {
    return <div className="flex justify-center items-center h-screen bg-[#0a0a0a] text-gray-500">Nenhum curso disponível no momento.</div>;
  }

  const currentCourse = courses[currentIndex];

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white pb-16 sm:pb-20 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-black font-extrabold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-in slide-in-from-top duration-300 border border-emerald-300">
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BANNER DESTAQUE (HERO) */}
      <div className="relative w-full h-[280px] xs:h-[320px] sm:h-[400px] md:h-[460px] lg:h-[480px] overflow-hidden bg-black">
        <div className="absolute inset-0">
          {currentCourse.coverImage && (
            <img src={currentCourse.coverImage} alt={currentCourse.title} className="w-full h-full object-cover opacity-50 transition-all duration-1000 scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-end px-3.5 sm:px-6 lg:px-10 pb-4 sm:pb-8 lg:pb-12">
          <span className="bg-[#e9c349]/20 text-[#e9c349] text-[9px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full w-max mb-1.5 sm:mb-2.5 uppercase tracking-widest border border-[#e9c349]/30">
            🌟 Em Destaque
          </span>
          <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-1.5 sm:mb-2.5 max-w-2xl drop-shadow-lg leading-tight sm:leading-tight">{currentCourse.title}</h1>
          <p className="text-gray-300 text-[11px] xs:text-xs sm:text-sm lg:text-base max-w-xl mb-3 sm:mb-5 line-clamp-4 leading-relaxed opacity-90">{currentCourse.description}</p>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
            <button 
              onClick={() => onSelectCourse(currentCourse)}
              className="w-full sm:w-auto bg-[#e9c349] text-black font-extrabold px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm rounded-lg sm:rounded-xl flex items-center justify-center gap-2 hover:bg-[#d4b03f] transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black" /> {enrolledCourseIds.includes(currentCourse.id) ? 'Acessar Treinamento' : 'Aprender Agora'}
            </button>
            {(() => {
              const discountInfo = getCourseDiscountInfo(currentCourse);
              if (discountInfo.isFree) {
                return (
                  <span className="text-xs sm:text-base md:text-lg font-extrabold px-3 py-2 sm:px-4 sm:py-2.5 bg-black/70 backdrop-blur-md rounded-lg sm:rounded-xl border border-gray-800 text-center w-full sm:w-auto text-emerald-400">
                    GRÁTIS
                  </span>
                );
              }
              if (discountInfo.hasDiscount) {
                return (
                  <span className="text-xs sm:text-base md:text-lg font-extrabold px-3 py-2 sm:px-4 sm:py-2.5 bg-black/70 backdrop-blur-md rounded-lg sm:rounded-xl border border-gray-800 text-center w-full sm:w-auto flex items-center justify-center gap-2.5">
                    <span className="text-[#e9c349]">
                      {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(discountInfo.discountedPrice)}
                    </span>
                    <span className="text-xs line-through text-stone-500 font-bold font-mono">
                      {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(currentCourse.price)}
                    </span>
                  </span>
                );
              }
              return (
                <span className="text-xs sm:text-base md:text-lg font-extrabold px-3 py-2 sm:px-4 sm:py-2.5 bg-black/70 backdrop-blur-md rounded-lg sm:rounded-xl border border-gray-800 text-center w-full sm:w-auto text-[#e9c349]">
                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(currentCourse.price)}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* VITRINE EM GRID */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-10 mt-6 sm:mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight font-headline">Catálogo de Cursos</h2>
          <ExpandableSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Pesquisar por título ou descrição..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.includes(course.id);
              const isFree = !course.price || course.price === 0;

              return (
                <div key={course.id} onClick={() => onSelectCourse(course)} className="bg-[#131313] border border-gray-800/80 rounded-xl sm:rounded-2xl overflow-hidden hover:border-[#e9c349]/50 transition-all cursor-pointer flex flex-col shadow-lg active:scale-[0.99] group">
                  <div className="h-36 sm:h-48 md:h-52 overflow-hidden relative">
                    {course.coverImage ? (
                      <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">Sem Capa</div>
                    )}
                    {isEnrolled ? (
                      <div className="absolute top-2.5 right-2.5 bg-emerald-500/90 text-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold font-mono shadow-md flex items-center gap-1 backdrop-blur-md">
                        <Check className="w-3 h-3 stroke-[3]" /> Na sua conta
                      </div>
                    ) : isFree ? (
                      <div className="absolute top-2.5 right-2.5 bg-emerald-500/80 text-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold font-mono shadow-md backdrop-blur-md">
                        Grátis
                      </div>
                    ) : null}
                  </div>
                  <div className="p-3.5 sm:p-5 md:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] sm:text-xs text-gray-400 font-semibold mb-1">
                        Por: <span className="text-[#e9c349] font-bold">{course.producerName || course.instructor || 'CFA Academy'}</span>
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1.5 sm:mb-2 line-clamp-2">{course.title}</h3>
                      <p className="text-gray-400 text-[11px] sm:text-xs md:text-sm line-clamp-4 leading-relaxed mb-3 sm:mb-5">{course.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-800/60 mt-auto">
                      {(() => {
                        const discountInfo = getCourseDiscountInfo(course);
                        if (discountInfo.isFree) {
                          return <span className="font-extrabold text-sm sm:text-base md:text-lg text-emerald-400">GRÁTIS</span>;
                        }
                        if (discountInfo.hasDiscount) {
                          return (
                            <div className="flex flex-col items-start leading-none py-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] sm:text-xs text-stone-500 line-through font-bold font-mono">
                                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(course.price)}
                                </span>
                                <span className="text-[9px] font-extrabold text-[#e9c349] bg-[#e9c349]/10 border border-[#e9c349]/20 px-1 py-0.2 rounded-md font-mono scale-90 origin-left">
                                  -{discountInfo.discountType === 'percentage' ? `${discountInfo.discountValue}%` : 'Desconto'}
                                </span>
                              </div>
                              <span className="font-black text-sm sm:text-base md:text-lg text-[#e9c349] tracking-tight">
                                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(discountInfo.discountedPrice)}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <span className="font-bold text-sm sm:text-base md:text-lg text-[#e9c349]">
                            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(course.price)}
                          </span>
                        );
                      })()}
                      {isEnrolled ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1">
                          <BookmarkCheck className="w-3.5 h-3.5" /> Acessar Curso
                        </span>
                      ) : isFree ? (
                        <button
                          onClick={(e) => handleQuickAddFreeCourse(e, course)}
                          disabled={enrollingCourseId === course.id}
                          className="bg-emerald-500 text-black px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold hover:bg-emerald-400 active:scale-95 transition-all flex items-center gap-1 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {enrollingCourseId === course.id ? 'Adicionando...' : 'Adicionar aos Meus Cursos'}
                        </button>
                      ) : (
                        <span className="bg-[#e9c349] text-black px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold hover:bg-[#d4b03f] transition-all">
                          Ver Detalhes / Comprar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
              <SearchX className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhum curso encontrado com esse termo.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 border-t border-gray-800/60">
        <EcosystemFooter />
      </div>
    </div>
  );
}
