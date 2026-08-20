import React, { useEffect, useState } from 'react';
import { logout, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { PlatformSettings } from '../types';

export default function PendingSubscription() {
  const navigate = useNavigate();
  const [supportWhatsApp, setSupportWhatsApp] = useState('244923456789');

  useEffect(() => {
    const loadPlatform = async () => {
      try {
        const pRef = doc(db, 'settings', 'platform');
        const pSnap = await getDoc(pRef);
        if (pSnap.exists() && (pSnap.data() as PlatformSettings).supportWhatsApp) {
          setSupportWhatsApp((pSnap.data() as PlatformSettings).supportWhatsApp);
        } else {
          const gRef = doc(db, 'settings', 'general');
          const gSnap = await getDoc(gRef);
          if (gSnap.exists() && gSnap.data().supportWhatsApp) {
            setSupportWhatsApp(gSnap.data().supportWhatsApp);
          }
        }
      } catch (err) {
        console.error("Failed to load platform settings:", err);
      }
    };
    loadPlatform();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const cleanWhatsApp = supportWhatsApp.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent('Olá Suporte CFA! Gostaria de verificar a ativação da minha assinatura.')}`;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover opacity-10 blur-md"
          alt="Trading floor"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOkxwvUgvLTY6Lm9DxFNpJFev2gyUaghB-KnWWM0CAXlOoXt-DpaosRTyEnAVvD6Jeuc8GJ6p5pn-w9yX3jYPk11vL_P1Z7lRiAOx9VgMRwvi13E40T5BMnTWA4spkL9TJvn94bx_36VDEmAoXy5LVWLRotAO9GyoyaMVpsdWLGSnbb-zYVz8MwKYzpTghH3wwCdX79DhiB9_NNy6pbVHgdCrWFNtTWUWyZ6iapmtJ_MEI1QaPFxMFk6fsrdIC-BKGTpOINpVQRQ"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/90 to-surface/80"></div>
        <div className="absolute inset-0 grain-overlay"></div>
      </div>

      <div className="relative z-10 max-w-md w-full bg-surface-container-highest/80 backdrop-blur-xl p-10 rounded-2xl text-center border border-outline-variant/20 shadow-2xl">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
          <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
        </div>
        
        <h1 className="text-2xl font-headline font-bold text-on-surface mb-3">Assinatura Pendente</h1>
        
        <p className="text-on-surface-variant font-body mb-6 text-sm leading-relaxed">
          Sua conta foi criada com sucesso, mas você ainda não possui uma assinatura ativa. 
          Conclua o pagamento ou envie seu comprovativo para acessar a academia.
        </p>
        
        <div className="space-y-3">
          <button onClick={() => navigate('/checkout')} className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold py-3.5 px-6 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all duration-300 font-headline flex items-center justify-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-lg">credit_card</span>
            Finalizar Inscrição
          </button>

          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 font-headline flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">chat</span>
            Enviar Comprovativo via WhatsApp
          </a>
          
          <button 
            onClick={handleLogout} 
            className="w-full bg-transparent text-on-surface-variant font-medium py-3 px-6 rounded-xl border border-outline-variant/30 hover:bg-surface-container-highest transition-all duration-300 text-sm"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
