import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 
  | 'new_student' 
  | 'payment_submitted' 
  | 'new_producer' 
  | 'payment_approved' 
  | 'new_course' 
  | 'new_module' 
  | 'new_lesson' 
  | 'general';

export interface SystemNotification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  targetRole?: 'admin' | 'student' | 'producer' | 'all';
  targetUserId?: string;
  read?: boolean;
  metadata?: Record<string, any>;
  createdAt?: any;
  timestamp?: number;
}

const CFA_ICON = 'https://i.postimg.cc/mDY7XpVF/apenas-12-vagas.png';

/**
 * Toca um som suave de notificação de alta qualidade usando Web Audio API
 */
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Primeiro tom (dourado e suave)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Segundo tom (mais alto, harmônico)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.log('Audio notification fallback:', e);
  }
};

/**
 * Vibra o dispositivo móvel se suportado
 */
export const vibrateDevice = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch {
      // ignore
    }
  }
};

/**
 * Solicita permissão para Notificações do Navegador / Telemóvel
 */
export const requestPushPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showNativeNotification(
        'Notificações CFA Ativadas!',
        'Você receberá alertas no telemóvel quando alunos se cadastrarem ou enviarem pagamentos.',
        '/dashboard'
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao pedir permissão de notificações:', error);
    return false;
  }
};

/**
 * Dispara uma notificação nativa do sistema / telemóvel
 */
export const showNativeNotification = (title: string, body: string, link: string = '/') => {
  playNotificationSound();
  vibrateDevice();

  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: CFA_ICON,
            badge: CFA_ICON,
            tag: 'cfa-alert-' + Date.now(),
            data: { url: link },
          });
        });
      } else {
        const notif = new Notification(title, {
          body,
          icon: CFA_ICON,
          tag: 'cfa-alert-' + Date.now(),
        });
        notif.onclick = () => {
          window.focus();
          if (link) window.location.href = link;
          notif.close();
        };
      }
    } catch (err) {
      console.error('Falha ao exibir notificação nativa:', err);
    }
  }
};

/**
 * Envia uma notificação para o Firestore (visível para Admin e Alunos em tempo real)
 */
export const sendSystemNotification = async (payload: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  targetRole?: 'admin' | 'student' | 'producer' | 'all';
  targetUserId?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    const notificationData = {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link || '/dashboard',
      targetRole: payload.targetRole || 'all',
      targetUserId: payload.targetUserId || null,
      read: false,
      metadata: payload.metadata || {},
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Erro ao registrar notificação no Firestore:', error);
  }
};

/**
 * Dispara notificação de Novo Curso para todos os alunos
 */
export const notifyNewCourse = async (course: {
  id: string;
  title: string;
  instructor?: string;
  price?: number;
}) => {
  return sendSystemNotification({
    type: 'new_course',
    title: '🎓 Novo Curso Disponível!',
    message: `O curso "${course.title}" foi publicado na CFA Academy! Clique para ver os detalhes e garantir a sua vaga.`,
    link: `/preview/${course.id}`,
    targetRole: 'all',
    metadata: {
      courseId: course.id,
      courseTitle: course.title,
      instructor: course.instructor || 'CFA Academy',
      price: course.price
    }
  });
};

/**
 * Dispara notificação de Transmissão Push Personalizada do Admin para Alunos
 */
export const sendBroadcastPushNotification = async (params: {
  title: string;
  message: string;
  link?: string;
  targetRole?: 'admin' | 'student' | 'producer' | 'all';
  targetUserId?: string;
  senderName?: string;
}) => {
  return sendSystemNotification({
    type: 'general',
    title: params.title,
    message: params.message,
    link: params.link || '/library',
    targetRole: params.targetRole || 'all',
    targetUserId: params.targetUserId || undefined,
    metadata: {
      isBroadcast: true,
      senderName: params.senderName || 'Administração CFA',
      sentAt: new Date().toISOString()
    }
  });
};

/**
 * Dispara notificação de Novo Módulo em um Curso
 */
export const notifyNewModule = async (params: {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
}) => {
  return sendSystemNotification({
    type: 'new_module',
    title: '📦 Novo Módulo Liberado!',
    message: `O módulo "${params.moduleTitle}" foi adicionado ao curso "${params.courseTitle}". Clique para conferir o conteúdo!`,
    link: `/preview/${params.courseId}`,
    targetRole: 'all',
    metadata: {
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      moduleTitle: params.moduleTitle
    }
  });
};

/**
 * Dispara notificação de Nova Aula em um Curso
 */
export const notifyNewLesson = async (params: {
  courseId: string;
  courseTitle: string;
  moduleTitle?: string;
  lessonTitle: string;
}) => {
  return sendSystemNotification({
    type: 'new_lesson',
    title: '▶️ Nova Aula Disponível!',
    message: `Uma nova aula "${params.lessonTitle}" foi adicionada ao curso "${params.courseTitle}". Clique para assistir agora!`,
    link: `/preview/${params.courseId}`,
    targetRole: 'all',
    metadata: {
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      moduleTitle: params.moduleTitle || '',
      lessonTitle: params.lessonTitle
    }
  });
};

/**
 * Inscreve-se nas notificações em tempo real com disparo automático no telemóvel
 */
export const subscribeToNotifications = (
  onUpdate: (notifications: SystemNotification[]) => void,
  targetRole: string = 'admin',
  userId?: string
) => {
  let initialLoad = true;

  const q = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs: SystemNotification[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docRole = data.targetRole || 'all';

        // Filtro por papel do utilizador
        if (targetRole === 'student') {
          // Alunos só recebem notificações públicas ('all') ou dirigidas a 'student'
          if (docRole === 'admin') {
            return;
          }
          // Se for endereçada a um aluno específico, valida o ID
          if (data.targetUserId && data.targetUserId !== userId) {
            return;
          }
        } else if (targetRole !== 'admin') {
          // Se for outro papel não-admin, não recebe alertas de admin
          if (docRole === 'admin') {
            return;
          }
          if (data.targetUserId && data.targetUserId !== userId) {
            return;
          }
        }

        notifs.push({
          id: docSnap.id,
          type: data.type || 'general',
          title: data.title || 'Notificação CFA',
          message: data.message || '',
          link: data.link || '/dashboard',
          targetRole: docRole,
          targetUserId: data.targetUserId,
          read: data.read || false,
          metadata: data.metadata || {},
          timestamp: data.timestamp || (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()),
        });
      });

      // Se houver novas notificações após o carregamento inicial, dispara notificação nativa
      if (!initialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const docRole = data.targetRole || 'all';

            // Verifica se o usuário atual deve receber a notificação nativa
            let shouldNotify = true;
            if (targetRole === 'student') {
              if (docRole === 'admin') shouldNotify = false;
              if (data.targetUserId && data.targetUserId !== userId) shouldNotify = false;
            } else if (targetRole !== 'admin') {
              if (docRole === 'admin') shouldNotify = false;
              if (data.targetUserId && data.targetUserId !== userId) shouldNotify = false;
            }

            if (shouldNotify) {
              showNativeNotification(
                data.title || 'CFA Academy',
                data.message || 'Nova atualização na plataforma',
                data.link || '/library'
              );
            }
          }
        });
      }

      initialLoad = false;
      onUpdate(notifs);
    },
    (error) => {
      console.error('Erro no listener de notificações:', error);
    }
  );
};

/**
 * Marca uma notificação como lida
 */
export const markNotificationAsRead = async (id: string) => {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
  }
};

/**
 * Marca todas as notificações como lidas
 */
export const markAllNotificationsAsRead = async (notifications: SystemNotification[]) => {
  try {
    const unread = notifications.filter((n) => !n.read && n.id);
    await Promise.all(
      unread.map((n) => updateDoc(doc(db, 'notifications', n.id!), { read: true }))
    );
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error);
  }
};

/**
 * Remove uma notificação
 */
export const deleteNotification = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    console.error('Erro ao excluir notificação:', error);
  }
};

/**
 * Gera o Relatório Diário de Desempenho (20:00) para Administradores
 * Calcula faturamento do dia, novos alunos registados e matrículas efetuadas.
 */
export const generateDailyAdminSummaryNotification = async (scheduledTime: string = '20:00') => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Consulta novos alunos cadastrados hoje
    let newStudentsCount = 0;
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        const u = d.data();
        if (u.createdAt) {
          const created = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
          if (created >= todayStart) {
            newStudentsCount++;
          }
        }
      });
    } catch (e) {
      console.warn('Erro ao ler novos alunos:', e);
    }

    // 2. Consulta compras / matrículas efetuadas hoje e faturamento
    let totalRevenue = 0;
    let enrollmentsCount = 0;

    try {
      const purchasesSnap = await getDocs(collection(db, 'purchases'));
      purchasesSnap.forEach(d => {
        const p = d.data();
        const pDate = p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt ? new Date(p.createdAt) : null;
        if (!pDate || pDate >= todayStart) {
          enrollmentsCount++;
          totalRevenue += Number(p.price || p.amount || 0);
        }
      });
    } catch (e) {
      console.warn('Erro ao ler compras do dia:', e);
    }

    const formattedRevenue = new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(totalRevenue).replace('AOA', 'Kz');

    const title = `📊 Relatório Diário de Desempenho (${scheduledTime})`;
    const message = `Resumo de Hoje: 💰 Faturamento: ${formattedRevenue} | 👥 ${newStudentsCount} Novos Alunos | 🎓 ${enrollmentsCount} Novas Matrículas efetuadas!`;

    // Dispara a notificação para Admins
    await sendSystemNotification({
      type: 'general',
      title,
      message,
      link: '/analytics',
      targetRole: 'admin',
      metadata: {
        isDailySummary: true,
        revenue: totalRevenue,
        newStudents: newStudentsCount,
        enrollments: enrollmentsCount,
        generatedAt: new Date().toISOString()
      }
    });

    return {
      success: true,
      revenue: totalRevenue,
      newStudents: newStudentsCount,
      enrollments: enrollmentsCount
    };
  } catch (err) {
    console.error('Erro ao gerar relatório diário de desempenho:', err);
    throw err;
  }
};
