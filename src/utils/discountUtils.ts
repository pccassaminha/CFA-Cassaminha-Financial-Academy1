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
 * Cupom padrão ativo da plataforma (CFA10 com 10% de desconto geral)
 */
export const DEFAULT_PLATFORM_COUPONS: Coupon[] = [
  {
    id: 'cp_cfa10',
    code: 'CFA10',
    type: 'percentage',
    discountValue: 10,
    scope: 'general',
    active: true,
    createdAt: new Date().toISOString()
  }
];

/**
 * Busca a lista de cupões cadastrados no Firebase Firestore
 */
export async function getActiveCoupons(): Promise<Coupon[]> {
  try {
    const couponsDoc = await getDoc(doc(db, 'settings', 'coupons')).catch(() => null);
    if (couponsDoc?.exists() && Array.isArray(couponsDoc.data().list)) {
      const list = couponsDoc.data().list as Coupon[];
      if (list.length > 0) {
        return list.filter(c => c && c.active !== false);
      }
      return [];
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
  return DEFAULT_PLATFORM_COUPONS;
}

/**
 * Escuta atualizações de cupões em tempo real
 */
export function subscribeCoupons(onUpdate: (coupons: Coupon[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'coupons'), (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data().list)) {
        const list = docSnap.data().list;
        if (list.length > 0) {
          onUpdate(list.filter((c: any) => c && c.active !== false));
        } else {
          onUpdate([]);
        }
      } else {
        // Fallback para coleção ou cupom padrão da plataforma
        getDocs(collection(db, 'coupons')).then(cSnap => {
          if (!cSnap.empty) {
            onUpdate(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)).filter(c => c && c.active !== false));
          } else {
            onUpdate(DEFAULT_PLATFORM_COUPONS);
          }
        }).catch(() => onUpdate(DEFAULT_PLATFORM_COUPONS));
      }
    }, (error) => {
      console.warn("Erro no listener de cupões, usando padrão:", error);
      onUpdate(DEFAULT_PLATFORM_COUPONS);
    });

    return unsubscribe;
  } catch (e) {
    console.warn("Erro ao iniciar listener de cupões, usando padrão:", e);
    onUpdate(DEFAULT_PLATFORM_COUPONS);
    return () => {};
  }
}

/**
 * Calcula o preço com desconto baseado nos cupões ativos
 */
export function getCourseDiscountInfo(
  priceOrCourse: number | { price?: number; id?: string; authorId?: string },
  coupons?: Coupon[],
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

  if (originalPrice <= 0) {
    return defaultNoDiscount;
  }

  // Se a lista de cupons não foi carregada ainda ou estiver vazia, utiliza os cupons ativos padrão da plataforma
  const sourceCoupons = (coupons && coupons.length > 0) ? coupons : DEFAULT_PLATFORM_COUPONS;
  const activeCoupons = sourceCoupons.filter(c => c && c.active !== false);

  if (activeCoupons.length === 0) {
    return defaultNoDiscount;
  }

  // Filtra cupons aplicáveis ao curso / autor / geral
  const candidates = activeCoupons.filter(c => {
    const scope = c.scope || 'general';
    if (scope === 'course') {
      return courseId && (c.courseId === courseId || (c as any).targetCourseId === courseId);
    }
    if (scope === 'producer') {
      return authorId && (c.producerId === authorId || c.authorId === authorId);
    }
    // general ou all
    return true;
  });

  if (candidates.length === 0) {
    return defaultNoDiscount;
  }

  // Avalia o melhor cupom (maior economia)
  let bestCoupon: Coupon | null = null;
  let maxSavings = 0;
  let bestBadge = '';

  for (const cp of candidates) {
    let savings = 0;
    let badge = '';
    const discountVal = Number(cp.discountValue) || 0;

    if (cp.type === 'percentage') {
      const pct = Math.min(100, Math.max(0, discountVal));
      savings = Math.round((originalPrice * pct) / 100);
      badge = `-${pct}%`;
    } else {
      // Valor fixo em Kz
      savings = Math.min(originalPrice, Math.max(0, discountVal));
      badge = `-${savings.toLocaleString('pt-AO')} Kz`;
    }

    if (savings > maxSavings) {
      maxSavings = savings;
      bestCoupon = cp;
      bestBadge = badge;
    }
  }

  if (!bestCoupon || maxSavings <= 0) {
    return defaultNoDiscount;
  }

  const discountedPrice = Math.max(0, originalPrice - maxSavings);

  return {
    hasDiscount: true,
    originalPrice,
    discountedPrice,
    appliedCoupon: bestCoupon,
    couponCode: bestCoupon.code,
    discountBadge: bestBadge,
    savingsAmount: maxSavings
  };
}
