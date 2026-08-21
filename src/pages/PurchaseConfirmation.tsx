import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';

export default function PurchaseConfirmation() {
  const [transaction, setTransaction] = useState<Partial<Transaction> & { supportWhatsApp?: string } | null>(null);
  const [paymentSettings, setPaymentSettings] = useState({
    iban: 'AO06 0040 0000 7829 1048 1018 2',
    ibanActive: true,
    bankName: 'BFA (Banco de Fomento Angola)',
    expressPhone: '923 456 789',
    expressActive: true,
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
    try {
      const stored = localStorage.getItem('cfa_last_transaction');
      if (stored) {
        setTransaction(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse stored transaction", e);
    }

    const loadPaymentSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'payment'));
        if (docSnap.exists()) {
          setPaymentSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error("Error loading payment settings:", err);
      }
    };
    loadPaymentSettings();
  }, []);

  const whatsappNumber = transaction?.supportWhatsApp?.replace(/[^0-9]/g, '') || '244923456789';
  const refNum = transaction?.referenceNumber || 'REF-CFA-2024';
  const studentName = transaction?.userName || 'Aluno CFA';
  const courseTitle = transaction?.courseTitle || 'CFA - Cassaminha Financial Academy';

  const whatsappMessage = encodeURIComponent(
    `Olá Suporte CFA! Gostaria de confirmar a minha inscrição no curso "${courseTitle}".\n\nNome: ${studentName}\nNúmero de Referência: ${refNum}\n\nSegue o meu comprovativo.`
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none z-[99] opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
      
      <div className="max-w-3xl w-full bg-surface-container p-8 md:p-12 rounded-[2rem] border border-outline-variant/20 text-center relative overflow-hidden z-10 my-10">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
        
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
          <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline mb-2">Métodos e Coordenadas de Pagamento</h1>
        <p className="text-on-surface-variant text-sm md:text-base mb-6">Efetue o pagamento através de um dos métodos ativos abaixo e envie o número de referência/comprovativo para o WhatsApp.</p>
        
        {/* Active Payment Methods Coordinates */}
        <div className="mb-8 p-6 bg-surface-container-lowest rounded-xl border border-[#e9c349]/30 text-left">
          <h3 className="text-sm font-bold text-[#e9c349] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">payments</span>
            Coordenadas Oficiais Ativas na Plataforma
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {paymentSettings.multicaixaActive && (
              <div className="p-3.5 rounded-lg bg-surface-container-high/60 border border-outline-variant/20">
                <p className="font-bold text-on-surface mb-2 flex items-center gap-1.5 text-xs uppercase">
                  <span className="material-symbols-outlined text-primary text-base">credit_card</span> Multicaixa (Referência)
                </p>
                <div className="space-y-1 font-mono text-xs">
                  <p><span className="text-stone-400">Entidade:</span> <strong className="text-[#e9c349]">{paymentSettings.multicaixaEntity}</strong></p>
                  <p><span className="text-stone-400">Referência:</span> <strong className="text-[#e9c349]">{paymentSettings.multicaixaReference}</strong></p>
                  <p><span className="text-stone-400">Titular:</span> <span className="text-on-surface font-sans">{paymentSettings.multicaixaName || 'GRUPO CASSAMINHA LDA'}</span></p>
                </div>
              </div>
            )}

            {paymentSettings.ibanActive && (
              <div className="p-3.5 rounded-lg bg-surface-container-high/60 border border-outline-variant/20">
                <p className="font-bold text-on-surface mb-2 flex items-center gap-1.5 text-xs uppercase">
                  <span className="material-symbols-outlined text-primary text-base">account_balance</span> Transferência (IBAN)
                </p>
                <div className="space-y-1 font-mono text-xs">
                  <p><span className="text-stone-400">Banco:</span> <span className="text-on-surface font-sans font-bold">{paymentSettings.bankName}</span></p>
                  <p className="break-all"><span className="text-stone-400">IBAN:</span> <strong className="text-[#e9c349] select-all">{paymentSettings.iban}</strong></p>
                </div>
              </div>
            )}

            {paymentSettings.expressActive && (
              <div className="p-3.5 rounded-lg bg-surface-container-high/60 border border-outline-variant/20">
                <p className="font-bold text-on-surface mb-2 flex items-center gap-1.5 text-xs uppercase">
                  <span className="material-symbols-outlined text-primary text-base">speed</span> Multicaixa Express
                </p>
                <div className="space-y-1 font-mono text-xs">
                  <p><span className="text-stone-400">Telemóvel:</span> <strong className="text-[#e9c349]">{paymentSettings.expressPhone}</strong></p>
                  <p><span className="text-stone-400">Titular:</span> <span className="text-on-surface font-sans">{paymentSettings.expressName}</span></p>
                </div>
              </div>
            )}

            {paymentSettings.kwikActive && (
              <div className="p-3.5 rounded-lg bg-surface-container-high/60 border border-outline-variant/20">
                <p className="font-bold text-on-surface mb-2 flex items-center gap-1.5 text-xs uppercase">
                  <span className="material-symbols-outlined text-primary text-base">qr_code_2</span> Transferência KWIK
                </p>
                <div className="space-y-1 font-mono text-xs">
                  <p><span className="text-stone-400">Chave KWIK:</span> <strong className="text-[#e9c349] select-all">{paymentSettings.kwikPhone}</strong></p>
                  <p><span className="text-stone-400">Beneficiário:</span> <span className="text-on-surface font-sans">{paymentSettings.kwikName}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-container-highest p-6 rounded-xl border border-outline-variant/10 mb-6 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-stone-400 font-label">Referência da sua Inscrição</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              Pronto para Envio
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[10px] uppercase text-stone-400 font-label">Número de Referência / Transação</p>
              <p className="font-mono font-black text-xl text-primary">{refNum}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-stone-400 font-label">Nome do Aluno</p>
              <p className="font-semibold text-sm text-on-surface">{studentName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-stone-400 font-label">Curso</p>
              <p className="font-medium text-sm text-on-surface">{courseTitle}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-stone-400 font-label">Valor</p>
              <p className="font-bold text-sm text-primary">
                {transaction?.amount && Number(transaction.amount) > 0 
                  ? `Kz ${Number(transaction.amount).toLocaleString('pt-AO')}` 
                  : 'A confirmar'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Direct WhatsApp Support */}
        <div className="mb-8 p-6 bg-[#18231c] border border-secondary/30 rounded-2xl text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-3xl">chat</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-on-surface">Enviar Referência e Comprovativo</h4>
              <p className="text-xs text-stone-400">Clique para enviar a sua referência e comprovativo diretamente para o WhatsApp oficial.</p>
            </div>
          </div>
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 bg-secondary text-surface font-extrabold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all text-center flex items-center justify-center gap-2 shrink-0 shadow-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">send</span>
            Enviar no WhatsApp
          </a>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/library" className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-xl font-bold text-base hover:opacity-90 transition-all">
            Acessar Videoteca do Curso
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
