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
