export interface Coupon {
  id: string;
  code: string; // Ex: "PROMO10", "CASSAMINHA20"
  type: 'percentage' | 'fixed'; // Porcentagem (%) ou Valor Fixo (Kz)
  discountValue: number; // Ex: 10 para 10% ou 5000 para 5.000 Kz
  scope: 'general' | 'course'; // 'general' = todos os cursos, 'course' = curso específico
  courseId?: string; // ID do curso se for específico
  courseTitle?: string; // Título do curso para exibição
  active: boolean; // Ativo / Inativo
  createdAt?: string;
  usageCount?: number;
}

export interface PlatformSettings {
  supportWhatsApp: string; // Ex: "244900000000" (Sem o + ou espaços)
  platformName?: string;
  defaultCurrency?: string;
  logoUrl?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail?: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  referenceNumber: string; // NOVO: Número da transação/referência
  paymentMethod?: string;
  amount?: number;
  originalAmount?: number;
  discountAmount?: number;
  appliedCoupon?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  proofUrl?: string;
}

export interface Lesson {
  id: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  duration: string;
  order?: number;
  // NOVOS CAMPOS PARA SUPORTAR MÚLTIPLAS FONTES:
  videoSource?: 'youtube' | 'wistia';
  videoData?: string; // Se for youtube, guarda o Link. Se for wistia, guarda o ID (código).
  videoUrl?: string; // Compatibilidade legado
  materials?: string;
}

export interface Module {
  id: string;
  title: string;
  status: 'published' | 'draft';
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  coverImage?: string;
  description?: string;
  structureType?: 'modules' | 'single_lesson' | 'direct_link';
  directLinkUrl?: string;
  singleLessonVideoSource?: 'youtube' | 'wistia';
  singleLessonVideoData?: string;
  singleLessonMaterials?: string;
  singleLessonDescription?: string;
  modules: Module[];
}

export interface UserProfile {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'producer' | 'student';
  subscriptionStatus: 'active' | 'inactive' | 'pending';
  enrolledCourses?: string[];
  completedLessons?: string[];
  plan?: string;
  phone?: string;
}
