import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlatformSettings } from '../types';

export default function Settings() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [platformName, setPlatformName] = useState('CFA - Cassaminha Financial Academy');
  const [supportWhatsApp, setSupportWhatsApp] = useState('244923456789');
  const [isSaving, setIsSaving] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({
    iban: 'AO06 0040 0000 7829 1048 1018 2',
    ibanActive: true,
    bankName: 'BFA (Banco de Fomento Angola)',
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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const paymentDoc = await getDoc(doc(db, 'settings', 'payment'));
        if (paymentDoc.exists()) {
          setPaymentSettings(prev => ({ ...prev, ...paymentDoc.data() }));
        }
        
        const generalDoc = await getDoc(doc(db, 'settings', 'general'));
        if (generalDoc.exists()) {
          const genData = generalDoc.data();
          if (genData.platformName) setPlatformName(genData.platformName);
          if (genData.supportWhatsApp) setSupportWhatsApp(genData.supportWhatsApp);
        }

        const platformDoc = await getDoc(doc(db, 'settings', 'platform'));
        if (platformDoc.exists()) {
          const pData = platformDoc.data() as PlatformSettings;
          if (pData.supportWhatsApp) setSupportWhatsApp(pData.supportWhatsApp);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const cleanWhatsApp = supportWhatsApp.replace(/[^0-9]/g, '');
      const platformPayload: PlatformSettings = {
        supportWhatsApp: cleanWhatsApp,
        platformName
      };

      await setDoc(doc(db, 'settings', 'payment'), paymentSettings);
      await setDoc(doc(db, 'settings', 'general'), { platformName, supportWhatsApp: cleanWhatsApp }, { merge: true });
      await setDoc(doc(db, 'settings', 'platform'), platformPayload, { merge: true });
      
      setSupportWhatsApp(cleanWhatsApp);
      showNotification('Todas as configurações salvas com sucesso!');
    } catch (err) {
      console.error("Error saving settings:", err);
      showNotification('Erro ao conectar ao Firebase para salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="font-body text-on-surface antialiased overflow-x-hidden min-h-screen bg-[#131313]">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] opacity-[0.03]" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDyRlXPeuQHyr04UDACzvgZzlvnAl-Ymm_huVOBP1Tx8RPUIS-JJfsfChgZdQK4AWD944d8CIZfXKmqcwJ6pGmJWKYhGDPNe5jiERlMdUV_zPjChM6Ih2K3gMS79ysvlVR1LPXN90samT3hSPoNmZEWTHq2L9pZODvHm2ndmwZUWe49UERvhFh1gyLrQyv_VvOkRztU_qjqHac4In47o6YQf4d_CmkKlT25cNZYP5unKsjDLXnwa9nMaKPka12UJDaEBal7NSUhvw)' }}></div>
      
      <Sidebar />

      <main className="ml-72 min-h-screen pt-10 pb-20 px-12 relative">
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-[9999] bg-surface-container-high border border-primary/30 text-on-surface px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="material-symbols-outlined text-primary">check_circle</span>
            <span className="text-sm font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <p className="font-label text-sm text-primary tracking-[0.3em] uppercase mb-2">Sovereign Curator</p>
            <h2 className="font-headline text-5xl font-extrabold tracking-tight">Painel de Configurações</h2>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => showNotification('Alterações descartadas.')}
              className="px-6 py-2 bg-surface-container-highest text-on-surface font-semibold rounded-xl hover:bg-surface-bright transition-colors"
            >
              Descartar
            </button>
            <button 
              disabled={isSaving}
              onClick={handleSaveAll}
              className={`px-8 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-[0_4px_20px_rgba(233,195,73,0.3)] hover:brightness-110 transition-all ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </header>

        {/* Bento Grid Configuration */}
        <div className="grid grid-cols-12 gap-6">
          {/* Global Identity Section */}
          <section className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary">public</span>
              <h3 className="font-headline text-xl font-bold tracking-tight">Identidade Global da Plataforma</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-gray-500 mb-2">Nome da Plataforma</label>
                  <input 
                    className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-3 px-4 font-medium outline-none" 
                    type="text" 
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-gray-500 mb-2">
                    WhatsApp de Suporte (Sem o + ou espaços)
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-3 px-4 pl-10 font-mono text-sm font-medium outline-none" 
                      type="text" 
                      placeholder="Ex: 244923456789"
                      value={supportWhatsApp}
                      onChange={(e) => setSupportWhatsApp(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3 text-stone-400 text-sm">chat</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Ex: <code className="text-primary font-mono font-bold">244923456789</code> (Utilizado para envio de comprovativos e atendimento dos alunos)</p>
                </div>
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-gray-500 mb-2">Moeda Padrão</label>
                  <div className="flex items-center gap-4 bg-surface-container-highest rounded-lg px-4 py-3">
                    <span className="font-bold text-primary">Kz</span>
                    <span className="text-on-surface">Kwanza (Angola)</span>
                    <span className="material-symbols-outlined ml-auto text-gray-500">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-gray-500 mb-2">Fuso Horário</label>
                  <div className="flex items-center gap-4 bg-surface-container-highest rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-gray-500 text-sm">schedule</span>
                    <span className="text-on-surface">WAT (UTC+01:00) Luanda</span>
                    <span className="material-symbols-outlined ml-auto text-gray-500 text-sm">lock</span>
                  </div>
                </div>
              </div>
              <div 
                onClick={() => showNotification('Abrindo seletor de arquivos...')}
                className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-xl bg-surface-container-lowest/50 p-6 group cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="w-24 h-24 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <img alt="Logo" className="w-16 h-16 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDg2ourU5Dm8zztnRMw1EG-AbEnTx0VlZWThpzNsgGPyWHEL1ss5WBn84MjWdUQKNE1UhZAny2CIo8ADOYPyQHL6Yhh1HYmrBfSuXBw2SgFukSalREb8HRwGYnT1S3rnmDLdJ93ZXINZTkuECd-VIvvZiivD69ZoxJrZXnHv8zZtpXiY9HEvrFz_beufZBHHBmIasC0EQOj0swhfv8vTMS78-LutwUNzvH0ngirGht36W7rPZXjagZCm2_k4GMbtwu-STyJPlTlXg" />
                </div>
                <span className="text-sm font-bold text-primary">Alterar Logotipo</span>
                <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">PNG ou SVG (Máx 2MB)</span>
              </div>
            </div>
          </section>

          {/* API Integrations */}
          <section className="col-span-12 lg:col-span-4 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary">api</span>
              <h3 className="font-headline text-xl font-bold tracking-tight">Integrações API</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-lg">payments</span>
                  </div>
                  <span className="text-sm font-semibold">Stripe Gateway</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(147,214,160,0.6)]"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-400 text-lg">mail</span>
                  </div>
                  <span className="text-sm font-semibold">SendGrid SMTP</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(147,214,160,0.6)]"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl grayscale">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-400 text-lg">monitoring</span>
                  </div>
                  <span className="text-sm font-semibold">Analytics Engine</span>
                </div>
                <div className="px-2 py-1 bg-surface-container text-[8px] uppercase tracking-widest font-bold rounded">Off</div>
              </div>
            </div>
            <button 
              onClick={() => showNotification('Abrindo gerenciador de chaves API...')}
              className="w-full mt-6 py-3 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary/5 transition-all"
            >
              Gerenciar Chaves
            </button>
          </section>

          {/* Configurações de Métodos de Recebimento de Pagamento */}
          <section className="col-span-12 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">payments</span>
                <div>
                  <h3 className="font-headline text-2xl font-black tracking-tight">Canais de Recebimento de Pagamento</h3>
                  <p className="text-xs text-gray-500 mt-1">Defina os detalhes de IBAN, Express, KWIK e Referência que os alunos verão quando finalizarem a inscrição.</p>
                </div>
              </div>
              <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest font-bold px-3 py-1 rounded-full shrink-0">Angola Local Gateways</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Canal 1: Transferência Bancária */}
              <div className="bg-surface-container-highest/40 rounded-xl p-6 border border-outline-variant/5">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
                    <span className="font-headline font-bold text-lg">1. Transferência Bancária</span>
                  </div>
                  <button 
                    onClick={() => setPaymentSettings(prev => ({ ...prev, ibanActive: !prev.ibanActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none cursor-pointer ${paymentSettings.ibanActive ? 'bg-primary' : 'bg-surface-container-lowest'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-[#131313] transition-transform ${paymentSettings.ibanActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">Nome do Banco</label>
                    <input 
                      disabled={!paymentSettings.ibanActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.bankName}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="Ex: BFA (Banco de Fomento Angola)"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">IBAN de Recebimento</label>
                    <input 
                      disabled={!paymentSettings.ibanActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-mono font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.iban}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, iban: e.target.value }))}
                      placeholder="Ex: AO06 0000 0000 0000 0000 0"
                    />
                  </div>
                </div>
              </div>

              {/* Canal 2: Transferência Express */}
              <div className="bg-surface-container-highest/40 rounded-xl p-6 border border-outline-variant/5">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">speed</span>
                    <span className="font-headline font-bold text-lg">2. Transferência Express</span>
                  </div>
                  <button 
                    onClick={() => setPaymentSettings(prev => ({ ...prev, expressActive: !prev.expressActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none cursor-pointer ${paymentSettings.expressActive ? 'bg-primary' : 'bg-surface-container-lowest'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-[#131313] transition-transform ${paymentSettings.expressActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">Contacto Express (Apenas o Número)</label>
                    <input 
                      disabled={!paymentSettings.expressActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.expressPhone}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, expressPhone: e.target.value }))}
                      placeholder="Ex: 923 456 789"
                    />
                  </div>
                </div>
              </div>

              {/* Canal 3: Transferência KWIK */}
              <div className="bg-surface-container-highest/40 rounded-xl p-6 border border-outline-variant/5">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">qr_code_2</span>
                    <span className="font-headline font-bold text-lg">3. Transferência KWIK</span>
                  </div>
                  <button 
                    onClick={() => setPaymentSettings(prev => ({ ...prev, kwikActive: !prev.kwikActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none cursor-pointer ${paymentSettings.kwikActive ? 'bg-primary' : 'bg-surface-container-lowest'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-[#131313] transition-transform ${paymentSettings.kwikActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">Chave KWIK (Número de Telefone, IBAN ou Nome)</label>
                    <input 
                      disabled={!paymentSettings.kwikActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.kwikPhone}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, kwikPhone: e.target.value }))}
                      placeholder="Ex: 923 456 789, IBAN ou Nome"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">Nome / Apelido do Beneficiário no KWIK</label>
                    <input 
                      disabled={!paymentSettings.kwikActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.kwikName}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, kwikName: e.target.value }))}
                      placeholder="Nome amigável registrado"
                    />
                  </div>
                </div>
              </div>

              {/* Canal 4: Referência Multicaixa */}
              <div className="bg-surface-container-highest/40 rounded-xl p-6 border border-outline-variant/5">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
                    <span className="font-headline font-bold text-lg">4. Referência Multicaixa</span>
                  </div>
                  <button 
                    onClick={() => setPaymentSettings(prev => ({ ...prev, multicaixaActive: !prev.multicaixaActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none cursor-pointer ${paymentSettings.multicaixaActive ? 'bg-primary' : 'bg-surface-container-lowest'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-[#131313] transition-transform ${paymentSettings.multicaixaActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">Entidade Multicaixa</label>
                    <input 
                      disabled={!paymentSettings.multicaixaActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-mono font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.multicaixaEntity}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, multicaixaEntity: e.target.value }))}
                      placeholder="Ex: 56789"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">Referência Padrão</label>
                    <input 
                      disabled={!paymentSettings.multicaixaActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-mono font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.multicaixaReference}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, multicaixaReference: e.target.value }))}
                      placeholder="Ex: 000 000 000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-label uppercase tracking-wider text-gray-500 mb-1">Beneficiário da Referência</label>
                    <input 
                      disabled={!paymentSettings.multicaixaActive}
                      className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded-lg text-on-surface py-2.5 px-3.5 text-sm font-medium outline-none disabled:opacity-40" 
                      type="text" 
                      value={paymentSettings.multicaixaName || ''}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, multicaixaName: e.target.value }))}
                      placeholder="Ex: GRUPO CASSAMINHA LDA"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Permissions Management */}
          <section className="col-span-12 lg:col-span-7 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">verified_user</span>
                <h3 className="font-headline text-xl font-bold tracking-tight">Gestão de Permissões</h3>
              </div>
              <button 
                onClick={() => showNotification('Criando novo nível de permissão...')}
                className="text-primary text-sm font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Novo Nível
              </button>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10">
                    <th className="pb-4 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Cargo</th>
                    <th className="pb-4 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold text-center">Módulos</th>
                    <th className="pb-4 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  <tr>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Super Admin</span>
                        <span className="text-[10px] text-gray-500">Acesso Total</span>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-bold">∞</span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="material-symbols-outlined text-gray-600 cursor-not-allowed">lock</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Curador de Conteúdo</span>
                        <span className="text-[10px] text-gray-500">Gestão de Cursos e Trilhas</span>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-xs px-2 py-1 bg-surface-container-highest text-on-surface-variant rounded-full font-medium">8/12</span>
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => showNotification('Editando permissões do Curador...')}
                        className="material-symbols-outlined text-primary text-lg hover:brightness-150 transition-all"
                      >
                        edit
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Moderador da Comunidade</span>
                        <span className="text-[10px] text-gray-500">Gestão de Fóruns e Comentários</span>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-xs px-2 py-1 bg-surface-container-highest text-on-surface-variant rounded-full font-medium">4/12</span>
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => showNotification('Editando permissões do Moderador...')}
                        className="material-symbols-outlined text-primary text-lg hover:brightness-150 transition-all"
                      >
                        edit
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Audit Logs */}
          <section className="col-span-12 lg:col-span-5 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">history_edu</span>
                <h3 className="font-headline text-xl font-bold tracking-tight">Logs de Auditoria</h3>
              </div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Tempo Real</span>
            </div>
            <div className="space-y-6 relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-outline-variant/20"></div>
              <div className="relative pl-10 flex flex-col gap-1">
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-secondary">update</span>
                </div>
                <span className="text-xs font-bold">API Key Regenerada</span>
                <span className="text-[10px] text-gray-500">Super Admin • Há 12 minutos</span>
              </div>
              <div className="relative pl-10 flex flex-col gap-1">
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-primary">person_edit</span>
                </div>
                <span className="text-xs font-bold">Permissões Alteradas (Moderador)</span>
                <span className="text-[10px] text-gray-500">Sistema Autônomo • Há 45 minutos</span>
              </div>
              <div className="relative pl-10 flex flex-col gap-1">
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-red-400">warning</span>
                </div>
                <span className="text-xs font-bold">Tentativa de Acesso Negada</span>
                <span className="text-[10px] text-gray-500">IP: 197.94.22.1 • Há 2 horas</span>
              </div>
              <div className="relative pl-10 flex flex-col gap-1">
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-secondary">settings</span>
                </div>
                <span className="text-xs font-bold">Logo da Plataforma Atualizado</span>
                <span className="text-[10px] text-gray-500">Super Admin • Há 5 horas</span>
              </div>
            </div>
            <button 
              onClick={() => showNotification('Carregando histórico completo de auditoria...')}
              className="w-full mt-10 py-3 text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:text-primary transition-all"
            >
              Ver Histórico Completo
            </button>
          </section>
        </div>

        {/* System Status Footer */}
        <footer className="mt-12 flex items-center justify-between px-6 py-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Database Status: Online</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">API Latency: 42ms</span>
            </div>
          </div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-gray-600">
            v2.4.0-sovereign-production
          </div>
        </footer>
      </main>

      {/* FAB for Quick Actions */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
          onClick={() => showNotification('Abrindo terminal de comandos...')}
          className="w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_8px_30px_rgba(233,195,73,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-3xl">terminal</span>
        </button>
      </div>
    </div>
  );
}
