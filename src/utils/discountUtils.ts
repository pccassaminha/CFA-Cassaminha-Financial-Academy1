import { doc, getDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Coupon } from '../types';

export interface CourseDiscountInfo {
  hasDiscount: boolean;
  originalPrice: number;
  discountedPrice: number;
  appliedCoupon: Coupon | null;
  couponCode: string | null;
  discountBadge: string;
  savingsAmount: number;
}

/**
 * Busca a lista de cupões cadastrados no Firebase Firestore
 */
export async function getActiveCoupons(): Promise<Coupon[]> {
  try {
    const couponsDoc = await getDoc(doc(db, 'settings', 'coupons')).catch(() => null);
    if (couponsDoc?.exists() && Array.isArray(couponsDoc.data().list)) {
      return (couponsDoc.data().list as Coupon[]).filter(c => c && c.active !== false);
    }

    const cSnap = await getDocs(collection(db, 'coupons')).catch(() => null);
    if (cSnap && !cSnap.empty) {
      return cSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Coupon))
        .filter(c => c && c.active !== false);
    }
  } catch (err) {
    console.error("Erro ao carregar cupões ativos:", err);
  }
  return [];
}

/**
 * Escuta atualizações de cupões em tempo real
 */
export function subscribeCoupons(onUpdate: (coupons: Coupon[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'coupons'), (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data().list)) {
        onUpdate(docSnap.data().list.filter((c: any) => c && c.active !== false));
      } else {
        // Fallback para coleção
        getDocs(collection(db, 'coupons')).then(cSnap => {
          if (!cSnap.empty) {
            onUpdate(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)).filter(c => c && c.active !== false));
          } else {
            onUpdate([]);
          }
        }).catch(() => onUpdate([]));
      }
    }, (error) => {
      console.warn("Erro no listener de cupões:", error);
    });

    return unsubscribe;
  } catch (e) {
    console.warn("Erro ao iniciar listener de cupões:", e);
    return () => {};
  }
}

/**
 * Calcula o preço com desconto baseado nos cupões ativos
 */
export function getCourseDiscountInfo(
  priceOrCourse: number | { price?: number; id?: string; authorId?: string },
  coupons: Coupon[],
  courseIdParam?: string,
  authorIdParam?: string
): CourseDiscountInfo {
  let originalPrice = 0;
  let courseId = courseIdParam;
  let authorId = authorIdParam;

  if (typeof priceOrCourse === 'number') {
    originalPrice = Number(priceOrCourse) || 0;
  } else if (priceOrCourse) {
    originalPrice = Number(priceOrCourse.price) || 0;
    if (!courseId) courseId = priceOrCourse.id;
    if (!authorId) authorId = priceOrCourse.authorId;
  }

  const defaultNoDiscount: CourseDiscountInfo = {
    hasDiscount: false,
    originalPrice,
    discountedPrice: originalPrice,
    appliedCoupon: null,
    couponCode: null,
    discountBadge: '',
    savingsAmount: 0
  };

  if (originalPrice <= 0 || !coupons || coupons.length === 0) {
    return defaultNoDiscount;
  }

  const activeCoupons = coupons.filter(c => c && c.active !== false);
  if (activeCoupons.length === 0) {
    return defaultNoDiscount;
  }

  // 1. Cupom específico para o curso
  const courseSpecific = courseId ? activeCoupons.find(c => c.scope === 'course' && c.courseId === courseId) : undefined;
  // 2. Cupom específico do produtor
  const producerSpecific = authorId ? activeCoupons.find(c => c.scope === 'producer' && (c.producerId === authorId || c.authorId === authorId)) : undefined;
  // 3. Cupom geral aplicável a todos os cursos
  const generalCoupon = activeCoupons.find(c => c.scope === 'general' || c.scope === 'all');

  const selectedCoupon = courseSpecific || producerSpecific || generalCoupon;

  if (!selectedCoupon) {
    return defaultNoDiscount;
  }

  let savings = 0;
  let badge = '';

  if (selectedCoupon.type === 'percentage') {
    const pct = Math.min(100, Math.max(0, Number(selectedCoupon.discountValue) || 0));
    savings = Math.round((originalPrice * pct) / 100);
    badge = `-${pct}%`;
  } else {
    // Valor fixo em Kz
    const fixedVal = Math.max(0, Number(selectedCoupon.discountValue) || 0);
    savings = Math.min(originalPrice, fixedVal);
    badge = `-${Number(fixedVal).toLocaleString('pt-AO')} Kz`;
  }

  const discountedPrice = Math.max(0, originalPrice - savings);

  // Se o desconto resultar em 0 de poupança (ex: valor fixo 0 ou pct 0), não considera
  if (savings <= 0) {
    return defaultNoDiscount;
  }

  return {
    hasDiscount: true,
    originalPrice,
    discountedPrice,
    appliedCoupon: selectedCoupon,
    couponCode: selectedCoupon.code,
    discountBadge: badge,
    savingsAmount: savings
  };
}
