import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { ProducerContractModal } from '../components/ProducerContractModal';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { PlatformSettings, Coupon } from '../types';
import { DEFAULT_CFA_LOGO, getValidLogoUrl } from '../utils/constants';
import { 
  Building2, 
  Globe, 
  Smartphone, 
  Mail, 
  Coins, 
  Clock, 
  Upload, 
  CreditCard, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Save,
  RotateCcw,
  X,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  Ticket,
  Tag,
  Percent,
  DollarSign,
  Check,
  FileText
} from 'lucide-react';

interface CustomRole {
  id: string;
  name: string;
  description: string;
  modulesCount: string;
  isSystem?: boolean;
}

export default function Settings() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
  const [isSaving, setIsSaving] = useState(false);

  // Modal Visibility States for the 3 individual popups
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState<'channels' | 'coupons'>('channels');
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([
    {
      id: 'cp_cfa10',
      code: 'CFA10',
      type: 'percentage',
      discountValue: 10,
      scope: 'general',
      active: true,
      createdAt: new Date().toISOString()
    }
  ]);
  const [availableCourses, setAvailableCourses] = useState<{ id: string; title: string }[]>([]);

  // Sub-modal for creating/editing a coupon
  const [couponForm, setCouponForm] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    couponId?: string;
    code: string;
    type: 'percentage' | 'fixed';
    discountValue: number | string;
    scope: 'general' | 'course';
    courseId: string;
    active: boolean;
  }>({
    isOpen: false,
    mode: 'create',
    code: '',
    type: 'percentage',
    discountValue: 10,
    scope: 'general',
    courseId: '',
    active: true
  });

  // Sub-modal for creating/editing a single role inside permissions modal
  const [roleModal, setRoleModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    roleId?: string;
    name: string;
    description: string;
    modulesCount: string;
  }>({
    isOpen: false,
    mode: 'create',
    name: '',
    description: '',
    modulesCount: '6/12'
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Logo Link Modal States
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState('');

  // 1. Global Platform Identity State
  const [platformName, setPlatformName] = useState('CFA - Cassaminha Financial Academy');
  const [supportWhatsApp, setSupportWhatsApp] = useState('244923456789');
  const [supportEmail, setSupportEmail] = useState('suporte@grupocassaminha.com');
  const [defaultCurrency, setDefaultCurrency] = useState('Kz');
  const [timezone, setTimezone] = useState('WAT (UTC+01:00) Luanda');
  const [logoUrl, setLogoUrl] = useState(DEFAULT_CFA_LOGO);

  // Announcement Bar State
  const [announcementText, setAnnouncementText] = useState('Aproveite desconto de 33% em todos os cursos!');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementBgColor, setAnnouncementBgColor] = useState('#e9c349');
  const [announcementTextColor, setAnnouncementTextColor] = useState('#131313');

  // 2. Payment Channels State
  const [paymentSettings, setPaymentSettings] = useState({
    iban: 'AO06 0040 0000 7829 1048 1018 2',
    ibanActive: true,
    bankName: 'BFA (Banco de Fomento Angola)',
    ibanAccountName: 'GRUPO CASSAMINHA LDA',
    
    expressIban: 'AO06 0040 0000 7829 1048 1018 2',
    expressActive: true,
    expressPhone: '923 456 789',
    expressName: 'GRUPO CASSAMINHA LDA',
    
    kwikPhone: '923 456 789',
    kwikActive: true,
    kwikName: 'GRUPOCASSAMINHA',
    
    multicaixaEntity: '12345',
    multicaixaReference: '884 920 311',
    multicaixaActive: true,
    multicaixaName: 'GRUPO CASSAMINHA LDA'
  });

  // 3. Roles & Permissions State
  const [roles, setRoles] = useState<CustomRole[]>([
    { id: 'super_admin', name: 'Super Admin', description: 'Acesso Total e irrestrito ao sistema', modulesCount: '∞', isSystem: true },
    { id: 'content_curator', name: 'Curador de Conteúdo', description: 'Gestão de Cursos, Módulos e Trilhas', modulesCount: '8/12' },
    { id: 'community_mod', name: 'Moderador da Comunidade', description: 'Gestão de Fóruns, Dúvidas e Alunos', modulesCount: '4/12' }
  ]);

  // 4. Multi-Produtor / User Context
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'producer' | 'student'>('admin');
  const [currentUserFullProfile, setCurrentUserFullProfile] = useState<any | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [producerData, setProducerData] = useState({
    producerName: '',
    producerWhatsApp: '',
    producerBankName: 'BFA',
    producerHolderName: '',
    producerIban: '',
    producerExpressPhone: '',
    producerPlan: 'monthly' as 'monthly' | 'quarterly',
    producerPlanStatus: 'pending'
  });
  const [isSavingProducerData, setIsSavingProducerData] = useState(false);

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Load settings from Firestore
  const fetchSettings = async () => {
    try {
      // 0. Detect Current User Role & Producer Profile
      const user = auth.currentUser;
      if (user) {
        const uSnap = await getDoc(doc(db, 'users', user.uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          setCurrentUserFullProfile({ id: user.uid, uid: user.uid, ...uData });
          if (uData.role === 'producer' || uData.roleType === 'producer') {
            setCurrentUserRole('producer');
          } else if (uData.role === 'admin' || uData.role === 'super_admin' || uData.roleType === 'admin' || uData.email === 'grupocassaminha@gmail.com') {
            setCurrentUserRole('admin');
          }
          setProducerData({
            producerName: uData.producerName || `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || user.displayName || '',
            producerWhatsApp: uData.producerWhatsApp || uData.phone || '',
            producerBankName: uData.producerBankName || 'BFA',
            producerHolderName: uData.producerHolderName || '',
            producerIban: uData.producerIban || '',
            producerExpressPhone: uData.producerExpressPhone || '',
            producerPlan: uData.producerPlan || 'monthly',
            producerPlanStatus: uData.producerPlanStatus || 'pending'
          });
        }
      }
      // 1. Payment Settings
      const paymentDoc = await getDoc(doc(db, 'settings', 'payment'));
      if (paymentDoc.exists()) {
        setPaymentSettings(prev => ({ ...prev, ...paymentDoc.data() }));
      }
      
      // 2. General Settings
      const generalDoc = await getDoc(doc(db, 'settings', 'general'));
      if (generalDoc.exists()) {
        const genData = generalDoc.data();
        if (genData.platformName) setPlatformName(genData.platformName);
        if (genData.supportWhatsApp) setSupportWhatsApp(genData.supportWhatsApp);
        if (genData.supportEmail) setSupportEmail(genData.supportEmail);
        if (genData.defaultCurrency) setDefaultCurrency(genData.defaultCurrency);
        if (genData.timezone) setTimezone(genData.timezone);
        if (genData.logoUrl) setLogoUrl(getValidLogoUrl(genData.logoUrl));
        
        if (genData.announcementText !== undefined) setAnnouncementText(genData.announcementText);
        if (genData.announcementActive !== undefined) setAnnouncementActive(genData.announcementActive);
        if (genData.announcementBgColor) setAnnouncementBgColor(genData.announcementBgColor);
        if (genData.announcementTextColor) setAnnouncementTextColor(genData.announcementTextColor);
      }

      // 3. Platform Settings doc
      const platformDoc = await getDoc(doc(db, 'settings', 'platform'));
      if (platformDoc.exists()) {
        const pData = platformDoc.data() as PlatformSettings;
        if (pData.supportWhatsApp) setSupportWhatsApp(pData.supportWhatsApp);
        if (pData.platformName) setPlatformName(pData.platformName);
        if (pData.logoUrl) setLogoUrl(getValidLogoUrl(pData.logoUrl));
        if (pData.defaultCurrency) setDefaultCurrency(pData.defaultCurrency);
      }

      // 4. Roles doc
      const rolesDoc = await getDoc(doc(db, 'settings', 'roles'));
      if (rolesDoc.exists() && Array.isArray(rolesDoc.data().list)) {
        setRoles(rolesDoc.data().list);
      }

      // 5. Coupons doc
      const couponsDoc = await getDoc(doc(db, 'settings', 'coupons'));
      if (couponsDoc.exists() && Array.isArray(couponsDoc.data().list)) {
        setCoupons(couponsDoc.data().list);
      } else {
        const couponsSnap = await getDocs(collection(db, 'coupons'));
        if (!couponsSnap.empty) {
          const list = couponsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
          setCoupons(list);
        }
      }

      // 6. Fetch courses for coupon scope
      const coursesSnap = await getDocs(collection(db, 'courses'));
      if (!coursesSnap.empty) {
        const cList = coursesSnap.docs.map(d => ({
          id: d.id,
          title: d.data().title || 'Curso sem título'
        }));
        setAvailableCourses(cList);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Global Identity only
  const handleSaveIdentity = async () => {
    setIsSaving(true);
    try {
      const cleanWhatsApp = supportWhatsApp.replace(/[^0-9]/g, '');

      const generalPayload = {
        platformName: platformName.trim(),
        supportWhatsApp: cleanWhatsApp,
        supportEmail: supportEmail.trim(),
        defaultCurrency,
        timezone,
        logoUrl,
        announcementText: announcementText.trim(),
        announcementActive,
        announcementBgColor,
        announcementTextColor,
        updatedAt: new Date().toISOString()
      };

      const platformPayload: PlatformSettings = {
        supportWhatsApp: cleanWhatsApp,
        platformName: platformName.trim(),
        logoUrl,
        defaultCurrency
      };

      await setDoc(doc(db, 'settings', 'general'), generalPayload, { merge: true });
      await setDoc(doc(db, 'settings', 'platform'), platformPayload, { merge: true });

      setSupportWhatsApp(cleanWhatsApp);
      showNotification('Identidade da plataforma salva com sucesso!', 'success');
      setIsIdentityModalOpen(false);
    } catch (err) {
      console.error("Error saving identity to Firebase:", err);
      showNotification('Erro ao salvar identidade.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Payment Settings only
  const handleSavePayments = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentSettings, { merge: true });
      showNotification('Canais de pagamento salvos com sucesso!', 'success');
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error("Error saving payments to Firebase:", err);
      showNotification('Erro ao salvar pagamentos.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Dados do Produtor
  const handleSaveProducerData = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    setIsSavingProducerData(true);
    try {
      const payload = {
        producerName: producerData.producerName.trim(),
        producerWhatsApp: producerData.producerWhatsApp.trim(),
        producerBankName: producerData.producerBankName.trim(),
        producerHolderName: producerData.producerHolderName.trim(),
        producerIban: producerData.producerIban.trim(),
        producerExpressPhone: producerData.producerExpressPhone.trim(),
        producerPlan: producerData.producerPlan,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', user.uid), payload);

      const coursesSnap = await getDocs(collection(db, 'courses'));
      coursesSnap.forEach(async (cDoc) => {
        const cData = cDoc.data();
        if (cData.authorId === user.uid) {
          await updateDoc(doc(db, 'courses', cDoc.id), {
            producerName: producerData.producerName.trim(),
            producerPhone: producerData.producerWhatsApp.trim(),
            producerBankName: producerData.producerBankName.trim(),
            producerHolderName: producerData.producerHolderName.trim(),
            producerIban: producerData.producerIban.trim(),
            producerExpressPhone: producerData.producerExpressPhone.trim()
          }).catch(() => {});
        }
      });

      showNotification('Seus dados de recebimento das vendas foram salvos com sucesso!', 'success');
    } catch (err) {
      console.error("Erro ao salvar dados do produtor:", err);
      showNotification('Erro ao salvar seus dados bancários.', 'error');
    } finally {
      setIsSavingProducerData(false);
    }
  };

  // Helper to remove any undefined fields before writing to Firestore
  const cleanUndefined = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanUndefined);
    }
    if (obj !== null && typeof obj === 'object') {
      const res: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        if (obj[key] !== undefined) {
          res[key] = cleanUndefined(obj[key]);
        }
      }
      return res;
    }
    return obj;
  };

  // Save Coupons to Firebase with dual persistence (settings/coupons doc AND coupons collection)
  const handleSaveCouponsToDb = async (updatedCoupons: Coupon[]) => {
    try {
      const sanitizedList = cleanUndefined(updatedCoupons);

      // 1. Grava no documento centralizado settings/coupons
      await setDoc(doc(db, 'settings', 'coupons'), {
        list: sanitizedList,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Grava individualmente na coleção coupons para redundância e consultas rápidas
      for (const cp of sanitizedList) {
        if (cp && cp.id) {
          await setDoc(doc(db, 'coupons', cp.id), {
            ...cp,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (err) {
      console.error("Error saving coupons to Firebase:", err);
      showNotification('Erro ao sincronizar cupão na base de dados.', 'error');
    }
  };

  const handleCouponFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponForm.code.trim().toUpperCase();
    if (!cleanCode) {
      showNotification('Insira um código válido para o cupão.', 'error');
      return;
    }

    const val = Number(couponForm.discountValue);
    if (isNaN(val) || val <= 0) {
      showNotification('Insira um valor de desconto maior que zero.', 'error');
      return;
    }

    let selectedCourseTitle = '';
    if (couponForm.scope === 'course' && couponForm.courseId) {
      const match = availableCourses.find(c => c.id === couponForm.courseId);
      selectedCourseTitle = match ? match.title : '';
    }

    let updatedCoupons: Coupon[];
    if (couponForm.mode === 'create') {
      if (coupons.some(c => c.code.toUpperCase() === cleanCode)) {
        showNotification(`O cupão "${cleanCode}" já existe.`, 'error');
        return;
      }
      const newCoupon: Coupon = {
        id: `cp_${Date.now()}`,
        code: cleanCode,
        type: couponForm.type,
        discountValue: val,
        scope: couponForm.scope,
        ...(couponForm.scope === 'course' && couponForm.courseId ? {
          courseId: couponForm.courseId,
          courseTitle: selectedCourseTitle
        } : {}),
        active: couponForm.active,
        createdAt: new Date().toISOString()
      };
      updatedCoupons = [newCoupon, ...coupons];
      setCoupons(updatedCoupons);
      await handleSaveCouponsToDb(updatedCoupons);
      showNotification(`Cupão "${cleanCode}" criado com sucesso!`, 'success');
    } else if (couponForm.couponId) {
      updatedCoupons = coupons.map(c => {
        if (c.id !== couponForm.couponId) return c;
        const base: Coupon = {
          ...c,
          code: cleanCode,
          type: couponForm.type,
          discountValue: val,
          scope: couponForm.scope,
          active: couponForm.active
        };
        delete base.courseId;
        delete base.courseTitle;
        if (couponForm.scope === 'course' && couponForm.courseId) {
          base.courseId = couponForm.courseId;
          base.courseTitle = selectedCourseTitle;
        }
        return base;
      });
      setCoupons(updatedCoupons);
      await handleSaveCouponsToDb(updatedCoupons);
      showNotification(`Cupão "${cleanCode}" atualizado com sucesso!`, 'success');
    } else {
      updatedCoupons = coupons;
    }

    setCouponForm(prev => ({ ...prev, isOpen: false, code: '' }));
  };

  const handleToggleCouponStatus = async (couponId: string) => {
    const updated = coupons.map(c => c.id === couponId ? { ...c, active: !c.active } : c);
    setCoupons(updated);
    await handleSaveCouponsToDb(updated);
    const target = updated.find(c => c.id === couponId);
    if (target) {
      showNotification(`Cupão "${target.code}" ${target.active ? 'ativado' : 'desativado'}.`, 'info');
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (window.confirm(`Tem certeza de que deseja eliminar o cupão "${code}"?`)) {
      const updated = coupons.filter(c => c.id !== couponId);
      setCoupons(updated);
      try {
        const sanitizedList = cleanUndefined(updated);
        await setDoc(doc(db, 'settings', 'coupons'), {
          list: sanitizedList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        // Tenta remover também da collection se existir
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'coupons', couponId)).catch(() => {});
        showNotification(`Cupão "${code}" eliminado.`, 'info');
      } catch (err) {
        console.error("Error deleting coupon:", err);
      }
    }
  };

  // Save Roles to Firebase
  const handleSaveRolesToDb = async (updatedRoles: CustomRole[]) => {
    try {
      await setDoc(doc(db, 'settings', 'roles'), { list: updatedRoles, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error("Error saving roles to Firebase:", err);
    }
  };

  // Upload Logo from Device
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification('O arquivo deve ter no máximo 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
        showNotification('Novo logotipo carregado com sucesso!', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Role Create / Edit inside modal
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModal.name.trim()) return;

    let updatedRoles: CustomRole[];
    if (roleModal.mode === 'create') {
      const newRole: CustomRole = {
        id: `role_${Date.now()}`,
        name: roleModal.name.trim(),
        description: roleModal.description.trim() || 'Nível personalizado de acesso',
        modulesCount: roleModal.modulesCount || '6/12'
      };
      updatedRoles = [...roles, newRole];
      setRoles(updatedRoles);
      showNotification(`Nível "${newRole.name}" adicionado!`, 'success');
    } else if (roleModal.roleId) {
      updatedRoles = roles.map(r => r.id === roleModal.roleId ? {
        ...r,
        name: roleModal.name.trim(),
        description: roleModal.description.trim(),
        modulesCount: roleModal.modulesCount
      } : r);
      setRoles(updatedRoles);
      showNotification(`Nível "${roleModal.name}" atualizado!`, 'success');
    } else {
      updatedRoles = roles;
    }

    handleSaveRolesToDb(updatedRoles);
    setRoleModal({ isOpen: false, mode: 'create', name: '', description: '', modulesCount: '6/12' });
  };

  // Delete Role
  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o nível de permissão "${roleName}"?`)) {
      const updatedRoles = roles.filter(r => r.id !== roleId);
      setRoles(updatedRoles);
      handleSaveRolesToDb(updatedRoles);
      showNotification(`Nível "${roleName}" removido.`, 'info');
    }
  };

  // Count active payment channels
  const activePaymentsCount = [
    paymentSettings.ibanActive,
    paymentSettings.expressActive,
    paymentSettings.kwikActive,
    paymentSettings.multicaixaActive
  ].filter(Boolean).length;

  return (
    <div className="font-body text-on-surface antialiased overflow-x-hidden min-h-screen bg-[#131313]">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] opacity-[0.03]" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDyRlXPeuQHyr04UDACzvgZzlvnAl-Ymm_huVOBP1Tx8RPUIS-JJfsfChgZdQK4AWD944d8CIZfXKmqcwJ6pGmJWKYhGDPNe5jiERlMdUV_zPjChM6Ih2K3gMS79ysvlVR1LPXN90samT3hSPoNmZEWTHq2L9pZODvHm2ndmwZUWe49UERvhFh1gyLrQyv_VvOkRztU_qjqHac4In47o6YQf4d_CmkKlT25cNZYP5unKsjDLXnwa9nMaKPka12UJDaEBal7NSUhvw)' }}></div>
      
      <Sidebar />

      <main className="lg:ml-72 ml-0 min-h-screen pt-16 lg:pt-10 pb-20 px-4 sm:px-8 lg:px-12 relative">
        {/* Toast Notification */}
        {showToast && (
          <div className={`fixed top-4 right-4 z-[9999] bg-[#1a1a1a] border ${
            toastType === 'error' ? 'border-red-500/50 text-red-400' : 'border-[#e9c349]/50 text-white'
          } px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4`}>
            {toastType === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#e9c349] shrink-0" />
            )}
            <span className="text-sm font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Hidden File Input for Logo Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleLogoFileUpload} 
          accept="image/png, image/jpeg, image/svg+xml, image/webp" 
          className="hidden" 
        />

        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-outline-variant/10">
          <div>
            <p className="font-label text-xs text-[#e9c349] tracking-[0.3em] uppercase mb-1 font-bold">
              {currentUserRole === 'producer' ? 'Área do Produtor' : 'Gestão & Sistema'}
            </p>
            <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {currentUserRole === 'producer' ? 'Configurações de Produtor' : 'Painel de Configurações'}
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              {currentUserRole === 'producer' 
                ? 'Configure seus dados bancários para recebimento direto e gerencie seu plano de produtor CFA.' 
                : 'Clique em qualquer bloco abaixo para abrir o pop-up e configurar seus dados.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              id="btn-discard-settings"
              onClick={() => {
                fetchSettings();
                showNotification('Dados sincronizados com o servidor.', 'info');
              }}
              className="px-5 py-2.5 bg-surface-container-highest text-stone-300 hover:text-white font-semibold text-xs rounded-xl hover:bg-surface-bright transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recarregar
            </button>
          </div>
        </header>

        {/* 3 Main Interactive Buttons / Cards */}
        {currentUserRole === 'producer' ? (
          /* PAINEL DE CONFIGURAÇÕES DO PRODUTOR */
          <div className="space-y-8 max-w-4xl mb-12">
            {/* 1. DADOS DE RECEBIMENTO DAS VENDAS */}
            <form onSubmit={handleSaveProducerData} className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/10">
                <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-white">Seus Dados Bancários para Recebimento</h3>
                  <p className="text-xs text-stone-400">Quando um aluno comprar seu curso, o dinheiro vai direto para a sua conta.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                    Nome / Marca do Produtor
                  </label>
                  <input
                    type="text"
                    value={producerData.producerName}
                    onChange={(e) => setProducerData(p => ({ ...p, producerName: e.target.value }))}
                    placeholder="Ex: Prof. António Cassaminha"
                    className="w-full bg-[#0e0e0e] border border-stone-800 text-white rounded-xl px-4 py-3 text-xs focus:border-[#e9c349] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                    WhatsApp para Contacto
                  </label>
                  <input
                    type="text"
                    value={producerData.producerWhatsApp}
                    onChange={(e) => setProducerData(p => ({ ...p, producerWhatsApp: e.target.value }))}
                    placeholder="Ex: 923456789"
                    className="w-full bg-[#0e0e0e] border border-stone-800 text-white rounded-xl px-4 py-3 text-xs focus:border-[#e9c349] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                    Titular da Conta Bancária
                  </label>
                  <input
                    type="text"
                    value={producerData.producerHolderName}
                    onChange={(e) => setProducerData(p => ({ ...p, producerHolderName: e.target.value }))}
                    placeholder="Ex: Nome Completo do Titular"
                    className="w-full bg-[#0e0e0e] border border-stone-800 text-white rounded-xl px-4 py-3 text-xs focus:border-[#e9c349] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={producerData.producerBankName}
                    onChange={(e) => setProducerData(p => ({ ...p, producerBankName: e.target.value }))}
                    placeholder="Ex: BFA, BAI, BIC, Atlântico"
                    className="w-full bg-[#0e0e0e] border border-stone-800 text-white rounded-xl px-4 py-3 text-xs focus:border-[#e9c349] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                    IBAN (Angola)
                  </label>
                  <input
                    type="text"
                    value={producerData.producerIban}
                    onChange={(e) => setProducerData(p => ({ ...p, producerIban: e.target.value }))}
                    placeholder="Ex: AO06 0040 0000 0000 0000 0000 0"
                    className="w-full bg-[#0e0e0e] border border-stone-800 text-white rounded-xl px-4 py-3 text-xs font-mono focus:border-[#e9c349] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                    Multicaixa Express (Telefone)
                  </label>
                  <input
                    type="text"
                    value={producerData.producerExpressPhone}
                    onChange={(e) => setProducerData(p => ({ ...p, producerExpressPhone: e.target.value }))}
                    placeholder="Ex: 923456789"
                    className="w-full bg-[#0e0e0e] border border-stone-800 text-white rounded-xl px-4 py-3 text-xs font-mono focus:border-[#e9c349] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-outline-variant/10">
                <p className="text-[11px] text-stone-400 italic">
                  🔒 Seus dados serão exibidos no checkout dos seus cursos.
                </p>
                <button
                  type="submit"
                  disabled={isSavingProducerData}
                  className="px-6 py-3 bg-[#e9c349] hover:bg-[#d8b33c] text-stone-900 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingProducerData ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar Dados Bancários</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* 2. PLANO DE ASSINATURA DO PRODUTOR */}
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/10">
                <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-white">Seu Plano de Assinatura CFA</h3>
                  <p className="text-xs text-stone-400">Escolha o seu plano para publicar cursos e gerir seus alunos.</p>
                </div>
              </div>

              {/* Notice regarding free account and end of period payment */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-emerald-300 block text-sm">
                    🎁 Cadastro Inicial 100% Gratuito! Pagamento Apenas no Fim do Período
                  </span>
                  <p className="text-stone-300 leading-relaxed">
                    A sua conta de produtor permite criar, organizar e publicar os seus cursos gratuitamente. O pagamento da taxa do plano escolhido (Mensal ou Trimestral) só é realizado no final do mês ou trimestre de utilização.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div 
                  onClick={() => setProducerData(p => ({ ...p, producerPlan: 'monthly' }))}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    producerData.producerPlan === 'monthly'
                      ? 'bg-[#e9c349]/10 border-[#e9c349] text-white shadow-lg'
                      : 'bg-[#0e0e0e] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base text-[#e9c349]">Plano Mensal</span>
                    {producerData.producerPlan === 'monthly' && (
                      <span className="text-[10px] bg-[#e9c349] text-black font-bold px-2 py-0.5 rounded-full">Ativo</span>
                    )}
                  </div>
                  <div className="text-xl font-black text-white font-mono mb-2">3.500 Kz <span className="text-xs text-stone-400 font-normal">/ mês</span></div>
                  <p className="text-xs text-stone-400 leading-relaxed">Publicação de cursos, monitoramento de alunos e recebimento direto.</p>
                </div>

                <div 
                  onClick={() => setProducerData(p => ({ ...p, producerPlan: 'quarterly' }))}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    producerData.producerPlan === 'quarterly'
                      ? 'bg-[#e9c349]/10 border-[#e9c349] text-white shadow-lg'
                      : 'bg-[#0e0e0e] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base text-[#e9c349]">Plano Trimestral</span>
                    {producerData.producerPlan === 'quarterly' && (
                      <span className="text-[10px] bg-[#e9c349] text-black font-bold px-2 py-0.5 rounded-full">Ativo</span>
                    )}
                  </div>
                  <div className="text-xl font-black text-white font-mono mb-2">7.000 Kz <span className="text-xs text-stone-400 font-normal">/ 3 meses</span></div>
                  <p className="text-xs text-stone-400 leading-relaxed">Economia e estabilidade de 3 meses de subscrição na plataforma CFA.</p>
                </div>
              </div>

              <div className="p-4 bg-[#0e0e0e] border border-stone-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-white block">Suporte e Pagamento do Plano (Grupo Cassaminha)</span>
                  <span className="text-[11px] text-stone-400">Envie o comprovativo do pagamento da taxa do plano ao Maestro pelo WhatsApp.</span>
                </div>
                <a
                  href={`https://wa.me/${supportWhatsApp}?text=${encodeURIComponent(`Olá Maestro, acabei de efetuar o pagamento do meu plano de produtor (${producerData.producerPlan === 'monthly' ? 'Mensal - 3.500 Kz' : 'Trimestral - 7.000 Kz'}). Segue o comprovativo.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Enviar Comprovativo</span>
                </a>
              </div>
            </div>

            {/* 3. GERENCIAR CUPÕES DOS SEUS CURSOS */}
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 md:p-8 shadow-xl flex items-center justify-between">
              <div>
                <h3 className="font-headline text-lg font-bold text-white">Cupões dos Seus Cursos</h3>
                <p className="text-xs text-stone-400 mt-0.5">Crie códigos de desconto exclusivos para os alunos dos seus cursos.</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-5 py-2.5 bg-white/5 hover:bg-[#e9c349] hover:text-black text-white font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Gerenciar Cupões</span>
              </button>
            </div>

            {/* 4. CONTRATO DIGITAL DO PRODUTOR */}
            <div className="bg-surface-container-low border border-[#e9c349]/20 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-[#e9c349]" />
                  <h3 className="font-headline text-lg font-bold text-white">Meu Contrato Digital de Produtor</h3>
                </div>
                <p className="text-xs text-stone-400">
                  Consulte os termos legais celebrados com o Grupo Cassaminha e baixe uma cópia autenticada em PDF a qualquer momento.
                </p>
              </div>
              <button
                onClick={() => setIsContractModalOpen(true)}
                className="px-5 py-3 bg-[#e9c349] hover:bg-[#d4b03f] text-black font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Visualizar e Baixar PDF</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* BUTTON 1: Identidade Global da Plataforma */}
          <section 
            id="card-btn-identity"
            onClick={() => setIsIdentityModalOpen(true)}
            className="group relative bg-surface-container-low hover:bg-surface-container rounded-2xl p-6 sm:p-7 border border-outline-variant/10 hover:border-[#e9c349]/50 shadow-lg hover:shadow-[0_8px_30px_rgba(233,195,73,0.15)] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#e9c349]/10 group-hover:bg-[#e9c349] text-[#e9c349] group-hover:text-black flex items-center justify-center border border-[#e9c349]/20 transition-all">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="p-2 rounded-xl bg-surface-container-highest group-hover:bg-[#e9c349]/20 text-stone-400 group-hover:text-[#e9c349] transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#e9c349] block mb-1">Módulo 1</span>
                <h3 className="font-headline text-xl font-bold text-white group-hover:text-[#e9c349] transition-colors">
                  Identidade Global
                </h3>
                <p className="text-xs text-stone-400 mt-1.5 line-clamp-5 leading-relaxed">
                  Nome da academia, WhatsApp de suporte, e-mail oficial, moeda padrão e logotipo.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-outline-variant/10 text-xs">
                <div className="flex justify-between items-center text-stone-400">
                  <span>Nome:</span>
                  <span className="font-bold text-white truncate max-w-[140px]">{platformName}</span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>Moeda / Fuso:</span>
                  <span className="font-mono text-[#e9c349] font-bold">{defaultCurrency} • WAT</span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>WhatsApp:</span>
                  <span className="font-mono text-stone-300 font-medium">{supportWhatsApp}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/10">
              <div className="w-full py-2.5 px-4 bg-surface-container-highest group-hover:bg-[#e9c349] text-stone-300 group-hover:text-black font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2">
                <span>Editar Identidade</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* BUTTON 2: Canais de Pagamento (Angola) */}
          <section 
            id="card-btn-payments"
            onClick={() => setIsPaymentModalOpen(true)}
            className="group relative bg-surface-container-low hover:bg-surface-container rounded-2xl p-6 sm:p-7 border border-outline-variant/10 hover:border-[#e9c349]/50 shadow-lg hover:shadow-[0_8px_30px_rgba(233,195,73,0.15)] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#e9c349]/10 group-hover:bg-[#e9c349] text-[#e9c349] group-hover:text-black flex items-center justify-center border border-[#e9c349]/20 transition-all">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="p-2 rounded-xl bg-surface-container-highest group-hover:bg-[#e9c349]/20 text-stone-400 group-hover:text-[#e9c349] transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#e9c349] block mb-1">Módulo 2</span>
                <h3 className="font-headline text-xl font-bold text-white group-hover:text-[#e9c349] transition-colors">
                  Pagamentos & Cupões
                </h3>
                <p className="text-xs text-stone-400 mt-1.5 line-clamp-5 leading-relaxed">
                  Dados de IBAN, Express, KWIK, Referência e gestão de cupões de desconto.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-outline-variant/10 text-xs">
                <div className="flex justify-between items-center text-stone-400">
                  <span>Canais de Pagamento:</span>
                  <span className="font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full text-[11px]">
                    {activePaymentsCount} de 4 Ativos
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>Cupões Ativos:</span>
                  <span className="font-bold text-[#e9c349] font-mono text-[11px]">
                    {coupons.filter(c => c.active).length} Cupões
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>Beneficiário:</span>
                  <span className="font-mono text-stone-300 truncate max-w-[140px]">{paymentSettings.ibanAccountName || 'GRUPO CASSAMINHA'}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/10">
              <div className="w-full py-2.5 px-4 bg-surface-container-highest group-hover:bg-[#e9c349] text-stone-300 group-hover:text-black font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2">
                <span>Configurar Pagamentos</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* BUTTON 3: Gestão de Permissões */}
          <section 
            id="card-btn-permissions"
            onClick={() => setIsPermissionsModalOpen(true)}
            className="group relative bg-surface-container-low hover:bg-surface-container rounded-2xl p-6 sm:p-7 border border-outline-variant/10 hover:border-[#e9c349]/50 shadow-lg hover:shadow-[0_8px_30px_rgba(233,195,73,0.15)] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#e9c349]/10 group-hover:bg-[#e9c349] text-[#e9c349] group-hover:text-black flex items-center justify-center border border-[#e9c349]/20 transition-all">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="p-2 rounded-xl bg-surface-container-highest group-hover:bg-[#e9c349]/20 text-stone-400 group-hover:text-[#e9c349] transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#e9c349] block mb-1">Módulo 3</span>
                <h3 className="font-headline text-xl font-bold text-white group-hover:text-[#e9c349] transition-colors">
                  Gestão de Permissões
                </h3>
                <p className="text-xs text-stone-400 mt-1.5 line-clamp-5 leading-relaxed">
                  Níveis de acesso, permissões administrativas e limites de visualização de módulos.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-outline-variant/10 text-xs">
                <div className="flex justify-between items-center text-stone-400">
                  <span>Cargos Criados:</span>
                  <span className="font-bold text-[#e9c349] font-mono">{roles.length} Níveis</span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>Nível Principal:</span>
                  <span className="font-bold text-white">Super Admin (∞)</span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>Proteção do Sistema:</span>
                  <span className="text-stone-300 font-mono">RBAC Ativo</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/10">
              <div className="w-full py-2.5 px-4 bg-surface-container-highest group-hover:bg-[#e9c349] text-stone-300 group-hover:text-black font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2">
                <span>Gerenciar Permissões</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </section>
        </div>
        )}

        {/* System Status Footer */}
        <footer className="mt-12 flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5 gap-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Banco de Dados Firestore: Online</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Latência: 24ms</span>
            </div>
          </div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-stone-500 font-mono">
            CFA Core v2.8 • Sovereign Production
          </div>
        </footer>
      </main>

      {/* ========================================================================= */}
      {/* POPUP 1: IDENTIDADE GLOBAL DA PLATAFORMA */}
      {/* ========================================================================= */}
      {isIdentityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181818] border border-outline-variant/20 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center border border-[#e9c349]/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-headline">Identidade Global da Plataforma</h3>
                  <p className="text-xs text-stone-400">Preencha e salve os dados principais da instituição.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsIdentityModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Platform Name */}
              <div>
                <label className="block text-xs font-label uppercase tracking-widest text-stone-300 font-bold mb-1.5">
                  Nome da Plataforma *
                </label>
                <input 
                  className="w-full bg-black/60 border border-outline-variant/20 focus:border-[#e9c349] focus:ring-1 focus:ring-[#e9c349] rounded-xl text-white py-2.5 px-4 text-sm font-medium outline-none transition-all" 
                  type="text" 
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="Ex: CFA - Cassaminha Financial Academy"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp de Suporte */}
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-stone-300 font-bold mb-1.5">
                    WhatsApp de Suporte *
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full bg-black/60 border border-outline-variant/20 focus:border-[#e9c349] focus:ring-1 focus:ring-[#e9c349] rounded-xl text-white py-2.5 px-4 pl-10 font-mono text-sm font-medium outline-none transition-all" 
                      type="text" 
                      placeholder="Ex: 244923456789"
                      value={supportWhatsApp}
                      onChange={(e) => setSupportWhatsApp(e.target.value)}
                    />
                    <Smartphone className="w-4 h-4 absolute left-3.5 top-3 text-[#e9c349]" />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">Ex: <code className="text-[#e9c349] font-mono font-bold">244923456789</code></p>
                </div>

                {/* E-mail de Suporte */}
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-stone-300 font-bold mb-1.5">
                    E-mail Oficial
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full bg-black/60 border border-outline-variant/20 focus:border-[#e9c349] focus:ring-1 focus:ring-[#e9c349] rounded-xl text-white py-2.5 px-4 pl-10 text-sm font-medium outline-none transition-all" 
                      type="email" 
                      placeholder="Ex: suporte@grupocassaminha.com"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                    />
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#e9c349]" />
                  </div>
                </div>
              </div>

              {/* Currency & Timezone Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-stone-300 font-bold mb-1.5">Moeda Padrão</label>
                  <div className="relative">
                    <select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      className="w-full bg-black/60 border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2.5 px-3.5 text-xs font-semibold outline-none cursor-pointer appearance-none"
                    >
                      <option value="Kz" className="bg-[#181818]">Kz - Kwanza (Angola)</option>
                      <option value="USD" className="bg-[#181818]">USD - Dólar ($)</option>
                      <option value="EUR" className="bg-[#181818]">EUR - Euro (€)</option>
                      <option value="BRL" className="bg-[#181818]">BRL - Real (R$)</option>
                    </select>
                    <Coins className="w-3.5 h-3.5 absolute right-3 top-3 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-stone-300 font-bold mb-1.5">Fuso Horário</label>
                  <div className="relative">
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-black/60 border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2.5 px-3.5 text-xs font-semibold outline-none cursor-pointer appearance-none"
                    >
                      <option value="WAT (UTC+01:00) Luanda" className="bg-[#181818]">WAT (UTC+01:00) Luanda</option>
                      <option value="GMT (UTC+00:00) Lisboa" className="bg-[#181818]">GMT (UTC+00:00) Lisboa</option>
                      <option value="BRT (UTC-03:00) Brasília" className="bg-[#181818]">BRT (UTC-03:00) Brasília</option>
                    </select>
                    <Clock className="w-3.5 h-3.5 absolute right-3 top-3 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Logo Section */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-[#111] border border-outline-variant/20 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-stone-600" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <span className="text-xs font-bold text-white block">Logotipo da Plataforma</span>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-[#e9c349] hover:bg-[#d4b03f] text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Carregar Imagem
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setTempLogoUrl(logoUrl);
                        setLogoModalOpen(true);
                      }}
                      className="py-1.5 px-3 bg-surface-container-highest hover:bg-surface-bright text-stone-300 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Colar Link Web
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra de Anúncio / Comunicado Topo da Home */}
              <div className="p-4 rounded-xl bg-black/40 border border-[#e9c349]/20 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e9c349]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Barra de Anúncio no Topo da Home</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-stone-400">
                      {announcementActive ? 'Exibindo' : 'Oculto'}
                    </span>
                    <input 
                      type="checkbox"
                      checked={announcementActive}
                      onChange={(e) => setAnnouncementActive(e.target.checked)}
                      className="w-4 h-4 accent-[#e9c349] rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-stone-300 font-bold mb-1.5">
                    Mensagem em Destaque (Texto Rolante)
                  </label>
                  <input 
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Ex: Aproveite desconto de 33% em todos os cursos!"
                    className="w-full bg-black/60 border border-outline-variant/20 focus:border-[#e9c349] focus:ring-1 focus:ring-[#e9c349] rounded-xl text-white py-2.5 px-4 text-sm font-medium outline-none transition-all"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Esta mensagem irá deslizar continuamente da direita para a esquerda no topo da página principal.
                  </p>
                </div>

                {/* Live Preview */}
                {announcementActive && announcementText.trim() !== '' && (
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Pré-visualização do Anúncio:</span>
                    <div 
                      className="w-full h-8 overflow-hidden rounded-lg flex items-center font-headline font-bold text-xs"
                      style={{ backgroundColor: announcementBgColor, color: announcementTextColor }}
                    >
                      <div className="animate-marquee items-center py-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center gap-3 px-6 shrink-0 whitespace-nowrap">
                            <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-80 animate-pulse" />
                            <span>{announcementText}</span>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-40 mx-2"></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-outline-variant/10">
              <button 
                type="button"
                onClick={() => setIsIdentityModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                disabled={isSaving}
                onClick={handleSaveIdentity}
                className="bg-[#e9c349] hover:bg-[#d4b03f] text-black px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Identidade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP 2: CANAIS DE PAGAMENTO & GESTÃO DE CUPÕES (ANGOLA) */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181818] border border-outline-variant/20 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center border border-[#e9c349]/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-headline">Dados & Configuração de Pagamentos</h3>
                  <p className="text-xs text-stone-400">Gerencie os canais de recebimento e crie cupões de desconto para o checkout.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex gap-2 mb-6 border-b border-outline-variant/10 pb-3">
              <button
                type="button"
                onClick={() => setPaymentModalTab('channels')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  paymentModalTab === 'channels'
                    ? 'bg-[#e9c349] text-black shadow-md'
                    : 'bg-surface-container-highest text-stone-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Canais de Pagamento</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentModalTab('coupons')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  paymentModalTab === 'coupons'
                    ? 'bg-[#e9c349] text-black shadow-md'
                    : 'bg-surface-container-highest text-stone-400 hover:text-white'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Gestão de Cupões</span>
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${
                  paymentModalTab === 'coupons' ? 'bg-black text-[#e9c349]' : 'bg-surface-container-low text-stone-300'
                }`}>
                  {coupons.length}
                </span>
              </button>
            </div>

            {/* TAB 1: CANAIS DE PAGAMENTO */}
            {paymentModalTab === 'channels' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[55vh] overflow-y-auto pr-1">
                  
                  {/* Canal 1: Transferência Bancária */}
                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#e9c349]" />
                        <span className="font-bold text-sm text-white">1. Transferência Bancária (IBAN)</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setPaymentSettings(prev => ({ ...prev, ibanActive: !prev.ibanActive }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          paymentSettings.ibanActive ? 'bg-[#e9c349]' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                          paymentSettings.ibanActive ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Nome do Banco</label>
                      <input 
                        disabled={!paymentSettings.ibanActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.bankName}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="Ex: BFA (Banco de Fomento Angola)"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">IBAN de Recebimento</label>
                      <input 
                        disabled={!paymentSettings.ibanActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs font-mono outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.iban}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, iban: e.target.value }))}
                        placeholder="Ex: AO06 0040 0000 7829 1048 1018 2"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Beneficiário</label>
                      <input 
                        disabled={!paymentSettings.ibanActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.ibanAccountName || ''}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, ibanAccountName: e.target.value }))}
                        placeholder="Ex: GRUPO CASSAMINHA LDA"
                      />
                    </div>
                  </div>

                  {/* Canal 2: Multicaixa Express */}
                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#e9c349]" />
                        <span className="font-bold text-sm text-white">2. Multicaixa Express</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setPaymentSettings(prev => ({ ...prev, expressActive: !prev.expressActive }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          paymentSettings.expressActive ? 'bg-[#e9c349]' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                          paymentSettings.expressActive ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Contacto Express (Telefone)</label>
                      <input 
                        disabled={!paymentSettings.expressActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs font-mono outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.expressPhone}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, expressPhone: e.target.value }))}
                        placeholder="Ex: 923 456 789"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Nome Registrado</label>
                      <input 
                        disabled={!paymentSettings.expressActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.expressName || ''}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, expressName: e.target.value }))}
                        placeholder="Ex: GRUPO CASSAMINHA LDA"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">IBAN Associado (Opcional)</label>
                      <input 
                        disabled={!paymentSettings.expressActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs font-mono outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.expressIban || ''}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, expressIban: e.target.value }))}
                        placeholder="Ex: AO06 ..."
                      />
                    </div>
                  </div>

                  {/* Canal 3: KWIK Instantâneo */}
                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#e9c349]" />
                        <span className="font-bold text-sm text-white">3. Transferência KWIK</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setPaymentSettings(prev => ({ ...prev, kwikActive: !prev.kwikActive }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          paymentSettings.kwikActive ? 'bg-[#e9c349]' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                          paymentSettings.kwikActive ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Chave KWIK (Número ou Apelido)</label>
                      <input 
                        disabled={!paymentSettings.kwikActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.kwikPhone}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, kwikPhone: e.target.value }))}
                        placeholder="Ex: 923 456 789 ou Nome"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Nome no KWIK</label>
                      <input 
                        disabled={!paymentSettings.kwikActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.kwikName}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, kwikName: e.target.value }))}
                        placeholder="Ex: GRUPOCASSAMINHA"
                      />
                    </div>
                  </div>

                  {/* Canal 4: Referência Multicaixa */}
                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#e9c349]" />
                        <span className="font-bold text-sm text-white">4. Referência Multicaixa</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setPaymentSettings(prev => ({ ...prev, multicaixaActive: !prev.multicaixaActive }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          paymentSettings.multicaixaActive ? 'bg-[#e9c349]' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                          paymentSettings.multicaixaActive ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Entidade</label>
                        <input 
                          disabled={!paymentSettings.multicaixaActive}
                          className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs font-mono outline-none disabled:opacity-40" 
                          type="text" 
                          value={paymentSettings.multicaixaEntity}
                          onChange={(e) => setPaymentSettings(prev => ({ ...prev, multicaixaEntity: e.target.value }))}
                          placeholder="Ex: 12345"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Referência</label>
                        <input 
                          disabled={!paymentSettings.multicaixaActive}
                          className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs font-mono outline-none disabled:opacity-40" 
                          type="text" 
                          value={paymentSettings.multicaixaReference}
                          onChange={(e) => setPaymentSettings(prev => ({ ...prev, multicaixaReference: e.target.value }))}
                          placeholder="Ex: 884 920 311"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-wider text-stone-400 font-bold mb-1">Beneficiário da Referência</label>
                      <input 
                        disabled={!paymentSettings.multicaixaActive}
                        className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs outline-none disabled:opacity-40" 
                        type="text" 
                        value={paymentSettings.multicaixaName || ''}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, multicaixaName: e.target.value }))}
                        placeholder="Ex: GRUPO CASSAMINHA LDA"
                      />
                    </div>
                  </div>

                </div>

                <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-outline-variant/10">
                  <button 
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    disabled={isSaving}
                    onClick={handleSavePayments}
                    className="bg-[#e9c349] hover:bg-[#d4b03f] text-black px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Salvando...' : 'Salvar Pagamentos'}
                  </button>
                </div>
              </>
            )}

            {/* TAB 2: GESTÃO DE CUPÕES */}
            {paymentModalTab === 'coupons' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#e9c349]" />
                      <span>Cupões de Desconto Ativos no Sistema</span>
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Crie cupões por porcentagem (%) ou valor fixo (Kz) para aplicação no checkout do aluno.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCouponForm({
                      isOpen: true,
                      mode: 'create',
                      code: '',
                      type: 'percentage',
                      discountValue: 10,
                      scope: 'general',
                      courseId: availableCourses[0]?.id || '',
                      active: true
                    })}
                    className="px-4 py-2 bg-[#e9c349] hover:bg-[#d4b03f] text-black font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Novo Cupão</span>
                  </button>
                </div>

                {/* FORM OVERLAY/CARD TO CREATE OR EDIT A COUPON */}
                {couponForm.isOpen && (
                  <form onSubmit={handleCouponFormSubmit} className="bg-surface-container-lowest p-5 rounded-2xl border border-[#e9c349]/40 space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                      <h5 className="text-sm font-bold text-[#e9c349] flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        <span>{couponForm.mode === 'create' ? 'Novo Cupão de Desconto' : 'Editar Cupão'}</span>
                      </h5>
                      <button
                        type="button"
                        onClick={() => setCouponForm(prev => ({ ...prev, isOpen: false }))}
                        className="text-stone-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Code */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1">
                          Código do Cupão <span className="text-[#e9c349]">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={couponForm.code}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="Ex: CASSAMINHA20"
                          className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs font-mono font-bold tracking-wider uppercase outline-none"
                        />
                      </div>

                      {/* Type toggle */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1">
                          Tipo de Desconto
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCouponForm(prev => ({ ...prev, type: 'percentage' }))}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              couponForm.type === 'percentage'
                                ? 'bg-[#e9c349] text-black border-[#e9c349]'
                                : 'bg-black text-stone-400 border-outline-variant/20 hover:border-outline-variant/50'
                            }`}
                          >
                            <Percent className="w-3.5 h-3.5" />
                            <span>Porcentagem (%)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCouponForm(prev => ({ ...prev, type: 'fixed' }))}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              couponForm.type === 'fixed'
                                ? 'bg-[#e9c349] text-black border-[#e9c349]'
                                : 'bg-black text-stone-400 border-outline-variant/20 hover:border-outline-variant/50'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Valor Fixo (Kz)</span>
                          </button>
                        </div>
                      </div>

                      {/* Discount Value */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1">
                          Valor do Desconto {couponForm.type === 'percentage' ? '(%)' : '(Kz)'} <span className="text-[#e9c349]">*</span>
                        </label>
                        <input
                          required
                          type="number"
                          min="1"
                          max={couponForm.type === 'percentage' ? "100" : undefined}
                          value={couponForm.discountValue}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, discountValue: e.target.value }))}
                          placeholder={couponForm.type === 'percentage' ? "Ex: 20" : "Ex: 5000"}
                          className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs font-mono font-bold outline-none"
                        />
                      </div>

                      {/* Scope toggle */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1">
                          Aplicabilidade (Escopo)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCouponForm(prev => ({ ...prev, scope: 'general' }))}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              couponForm.scope === 'general'
                                ? 'bg-[#e9c349] text-black border-[#e9c349]'
                                : 'bg-black text-stone-400 border-outline-variant/20 hover:border-outline-variant/50'
                            }`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Todos os Cursos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCouponForm(prev => ({ ...prev, scope: 'course' }))}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              couponForm.scope === 'course'
                                ? 'bg-[#e9c349] text-black border-[#e9c349]'
                                : 'bg-black text-stone-400 border-outline-variant/20 hover:border-outline-variant/50'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Curso Específico</span>
                          </button>
                        </div>
                      </div>

                      {/* Select Course if Scope is course */}
                      {couponForm.scope === 'course' && (
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1">
                            Selecione o Curso Alvo <span className="text-[#e9c349]">*</span>
                          </label>
                          <select
                            value={couponForm.courseId}
                            onChange={(e) => setCouponForm(prev => ({ ...prev, courseId: e.target.value }))}
                            className="w-full bg-black border border-outline-variant/20 focus:border-[#e9c349] rounded-xl text-white py-2 px-3 text-xs outline-none cursor-pointer"
                          >
                            <option value="">Selecione um curso...</option>
                            {availableCourses.map(c => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={couponForm.active}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, active: e.target.checked }))}
                          className="w-4 h-4 accent-[#e9c349] rounded cursor-pointer"
                        />
                        <span className="text-xs text-stone-300 font-semibold">Ativar Cupão Imediatamente</span>
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCouponForm(prev => ({ ...prev, isOpen: false }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#e9c349] hover:bg-[#d4b03f] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Salvar Cupão</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* COUPONS LIST TABLE */}
                <div className="max-h-[42vh] overflow-y-auto pr-1 space-y-3">
                  {coupons.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-outline-variant/20 rounded-2xl bg-black/20">
                      <Ticket className="w-10 h-10 mx-auto text-stone-600 mb-2" />
                      <p className="text-xs text-stone-400 font-bold">Nenhum cupão cadastrado.</p>
                      <p className="text-[11px] text-stone-500 mt-1">Clique no botão "Criar Novo Cupão" acima para disponibilizar um desconto aos seus alunos.</p>
                    </div>
                  ) : (
                    coupons.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 hover:border-outline-variant/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center font-bold shrink-0 border border-[#e9c349]/20">
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-extrabold text-[#e9c349] tracking-wider bg-black/60 px-2 py-0.5 rounded border border-[#e9c349]/30">
                                {cp.code}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                cp.active 
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-stone-800 text-stone-500'
                              }`}>
                                {cp.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-300 mt-1">
                              <span className="font-bold text-white">
                                {cp.type === 'percentage' 
                                  ? `${cp.discountValue}% de Desconto` 
                                  : `Kz ${Number(cp.discountValue).toLocaleString('pt-AO')} de Desconto`}
                              </span>
                              <span className="text-stone-600">•</span>
                              <span className="text-stone-400">
                                {cp.scope === 'general' 
                                  ? 'Aplicável a Todos os Cursos' 
                                  : `Curso: ${cp.courseTitle || cp.courseId || 'Específico'}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {/* Active status switch button */}
                          <button
                            type="button"
                            onClick={() => handleToggleCouponStatus(cp.id)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              cp.active 
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                                : 'bg-surface-container-highest text-stone-400 hover:text-white'
                            }`}
                          >
                            {cp.active ? 'Ativado' : 'Ativar'}
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => setCouponForm({
                              isOpen: true,
                              mode: 'edit',
                              couponId: cp.id,
                              code: cp.code,
                              type: cp.type,
                              discountValue: cp.discountValue,
                              scope: cp.scope,
                              courseId: cp.courseId || '',
                              active: cp.active
                            })}
                            className="p-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-stone-300 hover:text-white transition-colors cursor-pointer"
                            title="Editar Cupão"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(cp.id, cp.code)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                            title="Eliminar Cupão"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center text-xs text-stone-400">
                  <span>Os cupões ativos ficam disponíveis imediatamente no formulário de checkout dos alunos.</span>
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 bg-[#e9c349] hover:bg-[#d4b03f] text-black font-bold text-xs rounded-xl transition-all"
                  >
                    Concluído
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP 3: GESTÃO DE PERMISSÕES */}
      {/* ========================================================================= */}
      {isPermissionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181818] border border-outline-variant/20 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center border border-[#e9c349]/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-headline">Gestão de Permissões & Cargos</h3>
                  <p className="text-xs text-stone-400">Gerencie níveis de acesso e permissões a recursos.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  id="btn-add-role-modal"
                  type="button"
                  onClick={() => setRoleModal({
                    isOpen: true,
                    mode: 'create',
                    name: '',
                    description: '',
                    modulesCount: '6/12'
                  })}
                  className="bg-[#e9c349] hover:bg-[#d4b03f] text-black px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Nível
                </button>
                <button 
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[55vh]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10 text-stone-400">
                    <th className="pb-3 text-[10px] uppercase tracking-[0.2em] font-bold">Cargo & Descrição</th>
                    <th className="pb-3 text-[10px] uppercase tracking-[0.2em] font-bold text-center">Módulos</th>
                    <th className="pb-3 text-[10px] uppercase tracking-[0.2em] font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-surface-container-highest/20 transition-colors">
                      <td className="py-3.5 pr-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white">{role.name}</span>
                          <span className="text-[11px] text-stone-400">{role.description}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono ${
                          role.modulesCount === '∞' 
                            ? 'bg-[#e9c349]/15 text-[#e9c349] border border-[#e9c349]/30' 
                            : 'bg-surface-container-highest text-stone-300'
                        }`}>
                          {role.modulesCount}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {role.isSystem ? (
                            <span className="p-1.5 text-stone-500 cursor-not-allowed" title="Cargo fixo do sistema">
                              <Lock className="w-4 h-4" />
                            </span>
                          ) : (
                            <>
                              <button 
                                onClick={() => setRoleModal({
                                  isOpen: true,
                                  mode: 'edit',
                                  roleId: role.id,
                                  name: role.name,
                                  description: role.description,
                                  modulesCount: role.modulesCount
                                })}
                                className="p-1.5 text-stone-400 hover:text-[#e9c349] hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                                title="Editar Permissões"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteRole(role.id, role.name)}
                                className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Cargo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end pt-6 mt-6 border-t border-outline-variant/10">
              <button 
                type="button"
                onClick={() => setIsPermissionsModalOpen(false)}
                className="bg-[#e9c349] hover:bg-[#d4b03f] text-black px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: CRIAR / EDITAR CARGO INDIVIDUAL */}
      {/* ========================================================================= */}
      {roleModal.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#e9c349]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-1 font-headline">
              {roleModal.mode === 'create' ? 'Novo Nível de Permissão' : 'Editar Nível de Permissão'}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Defina o título do cargo e a quantidade de módulos com permissão de acesso.
            </p>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Nome do Cargo / Nível *
                </label>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  value={roleModal.name} 
                  onChange={(e) => setRoleModal({ ...roleModal, name: e.target.value })}
                  placeholder="Ex: Tutor Assistente, Coordenador Pedagógico"
                  className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-[#e9c349] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Descrição das Atividades
                </label>
                <input 
                  type="text" 
                  value={roleModal.description} 
                  onChange={(e) => setRoleModal({ ...roleModal, description: e.target.value })}
                  placeholder="Ex: Auxilia nas dúvidas e validação de trabalhos"
                  className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-[#e9c349] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Acesso aos Módulos
                </label>
                <select
                  value={roleModal.modulesCount}
                  onChange={(e) => setRoleModal({ ...roleModal, modulesCount: e.target.value })}
                  className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-[#e9c349] outline-none"
                >
                  <option value="4/12">4/12 Módulos (Básico)</option>
                  <option value="6/12">6/12 Módulos (Intermediário)</option>
                  <option value="8/12">8/12 Módulos (Avançado)</option>
                  <option value="12/12">12/12 Módulos (Geral)</option>
                  <option value="∞">∞ (Acesso Total)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setRoleModal({ ...roleModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-[#e9c349] hover:bg-[#d4b03f] text-black px-5 py-2 rounded-xl font-bold text-xs transition-colors shadow-md"
                >
                  {roleModal.mode === 'create' ? 'Criar Cargo' : 'Salvar Permissão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM LOGO LINK MODAL */}
      {logoModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-outline-variant/10 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center border border-[#e9c349]/20 mb-4">
              <span className="material-symbols-outlined text-2xl">link</span>
            </div>
            <h4 className="text-base font-bold text-white mb-2 font-headline">Colar URL do Logotipo</h4>
            <p className="text-xs text-stone-400 mb-4 leading-relaxed">
              Insira o link direto para a imagem do seu novo logotipo. Ela deve estar hospedada na web e ser acessível publicamente.
            </p>

            <div className="space-y-4 mb-6">
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://exemplo.com/logo.png"
                  value={tempLogoUrl}
                  onChange={(e) => setTempLogoUrl(e.target.value)}
                  className="w-full bg-[#111] border border-stone-800 rounded-xl p-3 text-white text-xs placeholder-stone-600 focus:border-[#e9c349] outline-none"
                  autoFocus
                />
              </div>

              {tempLogoUrl.trim() && (
                <div className="p-3 bg-black/40 border border-stone-800 rounded-xl flex flex-col items-center justify-center min-h-[100px]">
                  <span className="text-[10px] text-stone-500 mb-2 uppercase font-bold tracking-widest">Pré-visualização</span>
                  <img 
                    src={tempLogoUrl.trim()} 
                    alt="Logo Preview" 
                    className="max-h-16 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/150x50/111/fff?text=Link+Invalido';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLogoModalOpen(false)}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempLogoUrl.trim()) {
                    setLogoUrl(tempLogoUrl.trim());
                    setLogoModalOpen(false);
                    showNotification('Logotipo atualizado no painel! Clique em "Salvar Alterações" abaixo para persistir.', 'info');
                  }
                }}
                className="px-4 py-2.5 bg-[#e9c349] hover:bg-[#d4b03f] text-black text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
              >
                Salvar Logotipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização do Contrato Digital do Produtor Logado */}
      {isContractModalOpen && currentUserFullProfile && (
        <ProducerContractModal
          isOpen={isContractModalOpen}
          producer={currentUserFullProfile}
          isReadOnly={true}
          onClose={() => setIsContractModalOpen(false)}
        />
      )}

    </div>
  );
}
