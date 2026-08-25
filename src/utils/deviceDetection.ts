import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const isMobileOrTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check screen width (mobile & tablet < 1024px)
  const isSmallScreen = window.innerWidth < 1024;
  
  // Check User Agent for mobile/tablet devices
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isTouchDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|Mobile/i.test(userAgent);
  
  // Also check touch points (e.g. iPad Pro in desktop mode)
  const isMaxTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  
  return isSmallScreen || isTouchDevice || isMaxTouchPoints;
};

export const isAppInstalledOrStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check display-mode standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check iOS standalone mode
  const isNavStandalone = (navigator as any).standalone === true;
  
  // Check referrer android app
  const isAndroidApp = document.referrer.includes('android-app://');
  
  return isStandalone || isNavStandalone || isAndroidApp;
};

export const shouldShowInstallPopup = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // 1. MUST be on Mobile or Tablet
  if (!isMobileOrTabletDevice()) {
    return false;
  }
  
  // 2. MUST NOT be already installed or running in standalone mode
  if (isAppInstalledOrStandalone()) {
    return false;
  }
  
  // 3. MUST NOT have dismissed/saved before
  if (localStorage.getItem('hasSeenInstallGuide') === 'true') {
    return false;
  }
  
  return true;
};

export const syncUserDeviceStatus = async (userId: string) => {
  if (!userId) return;
  try {
    const isMobile = isMobileOrTabletDevice();
    const isInstalled = isAppInstalledOrStandalone();
    const pushPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

    const updates: Record<string, any> = {
      isMobileDevice: isMobile,
      appInstalled: isInstalled,
      pushStatus: pushPermission,
      pushEnabled: pushPermission === 'granted',
      lastDeviceSync: new Date().toISOString()
    };

    if (isInstalled) {
      updates.installedAppAt = new Date().toISOString();
    }

    await updateDoc(doc(db, 'users', userId), updates);
  } catch (err) {
    console.warn('Erro ao sincronizar status do dispositivo:', err);
  }
};

