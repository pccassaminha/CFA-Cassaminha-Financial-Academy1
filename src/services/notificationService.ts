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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'new_student' | 'payment_submitted' | 'new_producer' | 'payment_approved' | 'general';

export interface SystemNotification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  targetRole?: 'admin' | 'student' | 'all';
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
  targetRole?: 'admin' | 'student' | 'all';
  targetUserId?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    const notificationData = {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link || '/dashboard',
      targetRole: payload.targetRole || 'admin',
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
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs: SystemNotification[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Filtro por papel
        if (targetRole === 'admin' && data.targetRole === 'student' && data.targetUserId !== userId) {
          return;
        }
        if (targetRole === 'student' && data.targetRole === 'admin') {
          return;
        }
        if (data.targetUserId && data.targetUserId !== userId && targetRole !== 'admin') {
          return;
        }

        notifs.push({
          id: docSnap.id,
          type: data.type || 'general',
          title: data.title || 'Notificação CFA',
          message: data.message || '',
          link: data.link || '/dashboard',
          targetRole: data.targetRole || 'admin',
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
            showNativeNotification(
              data.title || 'CFA Academy',
              data.message || 'Nova atualização na plataforma',
              data.link || '/dashboard'
            );
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
