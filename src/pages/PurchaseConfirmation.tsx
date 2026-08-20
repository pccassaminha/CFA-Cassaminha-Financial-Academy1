import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Transaction } from '../types';

export default function PurchaseConfirmation() {
  const [transaction, setTransaction] = useState<Partial<Transaction> & { supportWhatsApp?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cfa_last_transaction');
      if (stored) {
        setTransaction(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse stored transaction", e);
    }
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
      
      <div className="max-w-2xl w-full bg-surface-container p-8 md:p-12 rounded-[2rem] border border-outline-variant/20 text-center relative overflow-hidden z-10">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
        
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30">
          <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline mb-2">Inscrição Registrada!</h1>
        <p className="text-on-surface-variant text-sm md:text-base mb-6">Sua transação foi registrada no sistema CFA com sucesso.</p>
        
        <div className="bg-surface-container-highest p-6 rounded-xl border border-outline-variant/10 mb-6 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-stone-400 font-label">Detalhes da Transação</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              Registrado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[10px] uppercase text-stone-400 font-label">Número de Referência</p>
              <p className="font-mono font-black text-lg text-primary">{refNum}</p>
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
              <p className="font-bold text-sm text-primary">Kz 150.000</p>
            </div>
          </div>
        </div>
        
        {/* Direct WhatsApp Support */}
        <div className="mb-8 p-5 bg-[#18231c] border border-secondary/30 rounded-2xl text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-on-surface">Envio Rápido de Comprovativo</h4>
              <p className="text-xs text-stone-400">Envie o número de referência e o comprovativo diretamente para o suporte no WhatsApp.</p>
            </div>
          </div>
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 bg-secondary text-surface font-bold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all text-center flex items-center justify-center gap-2 shrink-0 shadow-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">send</span>
            WhatsApp
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
