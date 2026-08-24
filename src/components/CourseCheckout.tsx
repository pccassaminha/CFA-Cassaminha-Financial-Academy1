import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowLeft, Copy, Check, MessageCircle, ShieldCheck, Building2, Smartphone, CreditCard, Ticket, Tag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Coupon } from '../types';

interface CheckoutProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  courseCover?: string;
  onBack: () => void;
}

const DEFAULT_PAYMENT_METHODS = [
  { id: 'multicaixa', type: 'multicaixa', shortName: 'Multicaixa', bankName: 'Multicaixa (Entidade / Referência)', accountNumber: 'Entidade: 12345 | Ref: 884920311', holderName: 'GRUPO CASSAMINHA LDA' },
  { id: 'iban', type: 'iban', shortName: 'Transferência IBAN', bankName: 'Banco BFA / BAI', accountNumber: 'AO06 0040 0000 7829 1048 1018 2', holderName: 'GRUPO CASSAMINHA LDA' },
  { id: 'express', type: 'express', shortName: 'Multicaixa Express', bankName: 'Multicaixa Express', accountNumber: '923 456 789', holderName: 'GRUPO CASSAMINHA LDA' },
  { id: 'kwik', type: 'kwik', shortName: 'KWIK Pagamentos', bankName: 'Transferência KWIK', accountNumber: '931 112 233', holderName: 'GRUPOCASSAMINHA' }
];

export default function CourseCheckout({ courseId, courseTitle, coursePrice, courseCover, onBack }: CheckoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [existingTxStatus, setExistingTxStatus] = useState<'pending' | 'approved' | null>(null);
  const [hasClickedPaid, setHasClickedPaid] = useState(false);

  // Inicializa com métodos padrão imediatamente para renderização instantânea (0ms de atraso)
  const [paymentMethods, setPaymentMethods] = useState<any[]>(DEFAULT_PAYMENT_METHODS);
  const [activeMethodIndex, setActiveMethodIndex] = useState<number>(0);
  const [supportNumber, setSupportNumber] = useState('244923456789');
  const [bankReference, setBankReference] = useState(''); 
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [effectiveCover, setEffectiveCover] = useState<string>(courseCover || '');

  // Estado dos Cupões de Desconto
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);

  const safePrice = coursePrice || 0;
  const safeTitle = courseTitle || 'Curso Selecionado';

  // Cálculo de desconto e preço final
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discountAmount = (safePrice * Number(appliedCoupon.discountValue)) / 100;
    } else if (appliedCoupon.type === 'fixed') {
      discountAmount = Number(appliedCoupon.discountValue);
    }
    if (discountAmount > safePrice) discountAmount = safePrice;
  }
  const finalPrice = Math.max(0, safePrice - discountAmount);

  useEffect(() => {
    if (courseCover) {
      setEffectiveCover(courseCover);
      return;
    }
    const fetchCover = async () => {
      if (!courseId) return;
      try {
        const snap = await getDoc(doc(db, 'courses', courseId));
        if (snap.exists()) {
          const d = snap.data();
          setEffectiveCover(d.coverImage || d.image || d.imageUrl || '');
        }
      } catch (e) {
        console.error("Erro ao buscar capa no checkout:", e);
      }
    };
    fetchCover();
  }, [courseId, courseCover]);

  useEffect(() => {
    const fetchCheckoutConfig = async () => {
      try {
        // Executa todas as buscas em PARALELO para velocidade máxima
        const [genSnap, platSnap, paymentSettingsSnap, methodsSnap, couponsSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'general')).catch(() => null),
          getDoc(doc(db, 'settings', 'platform')).catch(() => null),
          getDoc(doc(db, 'settings', 'payment')).catch(() => null),
          getDocs(collection(db, 'paymentMethods')).catch(() => null),
          getDoc(doc(db, 'settings', 'coupons')).catch(() => null)
        ]);

        // 1. Suporte WhatsApp
        if (genSnap?.exists() && genSnap.data().supportWhatsApp) {
          setSupportNumber(genSnap.data().supportWhatsApp);
        } else if (platSnap?.exists() && platSnap.data().supportWhatsApp) {
          setSupportNumber(platSnap.data().supportWhatsApp);
        }

        // 2. Cupões de Desconto
        let loadedCoupons: Coupon[] = [];
        if (couponsSnap?.exists() && Array.isArray(couponsSnap.data().list)) {
          loadedCoupons = couponsSnap.data().list;
        } else {
          const directCouponsSnap = await getDocs(collection(db, 'coupons')).catch(() => null);
          if (directCouponsSnap && !directCouponsSnap.empty) {
            loadedCoupons = directCouponsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
          }
        }
        setCouponsList(loadedCoupons);

        // 3. Métodos de Pagamento das Configurações
        const activeMethods: any[] = [];

        if (paymentSettingsSnap?.exists()) {
          const pData = paymentSettingsSnap.data();

          if (pData.multicaixaActive) {
            activeMethods.push({
              id: 'multicaixa',
              type: 'multicaixa',
              shortName: 'Multicaixa',
              bankName: 'Multicaixa (Entidade / Referência)',
              accountNumber: `Entidade: ${pData.multicaixaEntity || '12345'} | Ref: ${pData.multicaixaReference || '884920311'}`,
              holderName: pData.multicaixaName || 'GRUPO CASSAMINHA LDA'
            });
          }

          if (pData.ibanActive) {
            activeMethods.push({
              id: 'iban',
              type: 'iban',
              shortName: 'Transferência IBAN',
              bankName: pData.bankName || 'Banco BFA / BAI',
              accountNumber: pData.iban || 'AO06 0040 0000 7829 1048 1018 2',
              holderName: pData.ibanAccountName || 'GRUPO CASSAMINHA LDA'
            });
          }

          if (pData.expressActive) {
            activeMethods.push({
              id: 'express',
              type: 'express',
              shortName: 'Multicaixa Express',
              bankName: 'Multicaixa Express',
              accountNumber: pData.expressPhone || '923 456 789',
              holderName: pData.expressName || 'GRUPO CASSAMINHA LDA'
            });
          }

          if (pData.kwikActive) {
            activeMethods.push({
              id: 'kwik',
              type: 'kwik',
              shortName: 'KWIK Pagamentos',
              bankName: 'Transferência KWIK',
              accountNumber: pData.kwikPhone || '931 112 233',
              holderName: pData.kwikName || 'GRUPOCASSAMINHA'
            });
          }
        }

        // 4. Collection complementar paymentMethods
        if (methodsSnap && !methodsSnap.empty) {
          methodsSnap.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.active !== false) {
              activeMethods.push({
                id: docSnap.id,
                type: data.type || 'iban',
                shortName: data.shortName || data.bankName || 'Método',
                bankName: data.bankName || 'Banco Oficial',
                accountNumber: data.accountNumber || data.phoneNumber || '',
                holderName: data.holderName || 'GRUPO CASSAMINHA LDA'
              });
            }
          });
        }

        if (activeMethods.length > 0) {
          setPaymentMethods(activeMethods);
        }

        // 5. Usuário e duplicidade de transação
        const u = auth.currentUser;
        if (u) {
          const userDocSnap = await getDoc(doc(db, 'users', u.uid)).catch(() => null);
          let resolvedName = u.displayName || 'Aluno';
          let resolvedEmail = u.email || '';
          if (userDocSnap?.exists()) {
            const data = userDocSnap.data();
            resolvedName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || u.displayName || 'Aluno';
            resolvedEmail = u.email || data.email || '';
          }
          setUser({
            uid: u.uid,
            name: resolvedName,
            email: resolvedEmail
          });

          // Check for existing transactions
          const { query, where, collection, getDocs } = await import('firebase/firestore');
          const q = query(
            collection(db, 'transactions'),
            where('userId', '==', u.uid),
            where('courseId', '==', courseId)
          );
          const snap = await getDocs(q).catch(() => null);
          if (snap) {
            let foundApproved = false;
            let foundPending = false;
            snap.forEach(d => {
              const status = d.data().status;
              if (status === 'approved') foundApproved = true;
              if (status === 'pending' || !status) foundPending = true;
            });
            if (foundApproved) {
              setExistingTxStatus('approved');
            } else if (foundPending) {
              setExistingTxStatus('pending');
            }
          }
        }
      } catch (e) {
        console.error("Erro ao carregar configurações do checkout:", e);
      }
    };

    fetchCheckoutConfig();
  }, [courseId]);

  const handleApplyCoupon = () => {
    setCouponError(null);
    setCouponSuccessMsg(null);
    const clean = couponCodeInput.trim().toUpperCase();
    if (!clean) {
      setCouponError('Por favor, digite o código do cupão.');
      return;
    }

    const match = couponsList.find(c => c.code && c.code.trim().toUpperCase() === clean);
    if (!match) {
      setCouponError('Cupão de desconto inválido ou inexistente.');
      return;
    }

    if (match.active === false) {
      setCouponError('Este cupão de desconto não está mais ativo.');
      return;
    }

    if (match.scope === 'course' && match.courseId && match.courseId !== courseId) {
      setCouponError(`Cupão válido apenas para o curso "${match.courseTitle || 'específico'}".`);
      return;
    }

    setAppliedCoupon(match);
    const discountLabel = match.type === 'percentage' 
      ? `${match.discountValue}% de desconto` 
      : `${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Number(match.discountValue))} de desconto`;
    setCouponSuccessMsg(`Cupão ${match.code} aplicado com sucesso! (${discountLabel})`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError(null);
    setCouponSuccessMsg(null);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleConfirmAndRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankReference.trim()) {
      alert('Por favor, insira o número de referência do seu comprovativo de pagamento.');
      return;
    }

    if (!supportNumber) {
      alert('O número de suporte não está configurado.');
      return;
    }

    setIsSubmitting(true);
    const selectedMethod = paymentMethods[activeMethodIndex] || paymentMethods[0];
    const finalUser = user || { uid: 'user_123', name: 'Pedro Cassaminha', email: 'pedro@cassaminha.com' };

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: finalUser.uid,
        userName: finalUser.name,
        userEmail: finalUser.email || '',
        courseId,
        courseTitle: safeTitle,
        referenceNumber: bankReference,
        paymentMethod: selectedMethod.shortName || selectedMethod.bankName || 'Transferência',
        amount: finalPrice,
        originalAmount: safePrice,
        discountAmount: discountAmount,
        appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Update local state to pending so duplicate check triggers instantly
      setExistingTxStatus('pending');

      const cleanSupport = supportNumber.replace(/[^0-9]/g, '');
      const couponLine = appliedCoupon 
        ? `%0A🎟️ *Cupão de Desconto:* ${appliedCoupon.code} (Desconto de ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(discountAmount)})`
        : '';

      const originalPriceLine = discountAmount > 0 
        ? ` _(Valor original: ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(safePrice)})_` 
        : '';

      const message = `Olá, equipe CFA! Realizei o pagamento do curso.%0A%0A` +
        `📚 *Curso:* ${safeTitle}%0A` +
        `💵 *Valor:* ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(finalPrice)}${originalPriceLine}${couponLine}%0A` +
        `👤 *Aluno:* ${finalUser.name}%0A` +
        `💳 *Método:* ${selectedMethod.shortName || selectedMethod.bankName}%0A` +
        `🔖 *Referência do Talão:* ${bankReference}%0A%0A` +
        `Segue em anexo o meu comprovativo de pagamento.`;

      const whatsappUrl = `https://wa.me/${cleanSupport}?text=${message}`;
      window.open(whatsappUrl, '_blank');

    } catch (error) {
      console.error("Erro ao registrar transação:", error);
      alert('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeMethod = paymentMethods[activeMethodIndex] || paymentMethods[0];

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10 -m-6 md:-m-10 overflow-hidden font-body">
      {/* CAPA DO CURSO NO FUNDO COM CONTRASTE PREMIUM */}
      {effectiveCover && (
        <div className="absolute top-0 left-0 right-0 h-[520px] overflow-hidden pointer-events-none z-0">
          <img 
            src={effectiveCover} 
            alt={safeTitle} 
            className="w-full h-full object-cover opacity-45 scale-105 filter brightness-90 saturate-125 transition-all duration-1000" 
            referrerPolicy="no-referrer"
          />
          {/* Gradients de Contraste Premium */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/85 to-[#0a0a0a]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]"></div>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto">
        
        <button 
          onClick={onBack} 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 border border-gray-800/80 text-gray-300 hover:text-[#e9c349] hover:border-[#e9c349]/50 mb-8 transition-all text-sm font-medium cursor-pointer backdrop-blur-md shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar aos detalhes do curso
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          
          {/* LADO ESQUERDO: Abas e Coordenadas Oficiais Ativas */}
          <div className="w-full lg:w-3/5 bg-[#131313] border border-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl">
            <h1 className="text-3xl font-extrabold mb-3 font-headline">Finalizar Matrícula</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              1. Selecione abaixo o método de pagamento oficial ativo.<br/>
              2. Efetue a transferência ou depósito correspondente.<br/>
              3. Insira o número de referência/talão no campo ao lado para envio automático.
            </p>

            {/* ABAS HORIZONTAIS DE MÉTODOS */}
            <div className="flex flex-wrap gap-2 mb-6">
              {paymentMethods.map((method, index) => (
                <button
                  key={method.id || index}
                  type="button"
                  onClick={() => setActiveMethodIndex(index)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    activeMethodIndex === index 
                      ? 'bg-[#e9c349] text-black border-[#e9c349]' 
                      : 'bg-black/50 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white'
                  }`}
                >
                  {method.type === 'iban' ? <Building2 className="w-3.5 h-3.5" /> : method.type === 'multicaixa' ? <CreditCard className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                  {method.shortName || method.bankName}
                </button>
              ))}
            </div>

            {/* EXIBIÇÃO DA COORDENADA SELECIONADA */}
            {activeMethod && (
              <div className="bg-black/80 border border-gray-700 p-6 rounded-2xl w-full shadow-inner">
                <div className="mb-4">

                  <h4 className="font-bold text-white text-lg md:text-xl text-[#e9c349] tracking-wide">
                    {activeMethod.holderName}
                  </h4>
                  <p className="text-xs text-stone-300 mt-1 font-medium">{activeMethod.bankName}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#131313] p-4 rounded-xl border border-gray-800 gap-4">
                  <span className="font-mono text-white font-bold text-sm md:text-base break-words w-full select-all">
                    {activeMethod.type === 'multicaixa' ? 'Entidade & Referência acima (Pronto para copiar)' : activeMethod.accountNumber}
                  </span>
                  <button 
                    type="button"
                    onClick={() => handleCopy(activeMethod.accountNumber, activeMethod.id || String(activeMethodIndex))}
                    className="shrink-0 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto cursor-pointer whitespace-nowrap"
                  >
                    {copiedKey === (activeMethod.id || String(activeMethodIndex)) ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copiedKey === (activeMethod.id || String(activeMethodIndex)) ? 'Copiado' : 'Copiar Dados'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LADO DIREITO: Resumo e Formulário de Envio */}
          <div className="w-full lg:w-2/5">
            <div className="bg-[#131313] border border-gray-800 rounded-3xl p-6 md:p-8 sticky top-8 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 pb-4 border-b border-gray-800 font-headline">Resumo da Inscrição</h3>
              
              <div className="space-y-4 mb-6">
                {courseCover && (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-gray-800 bg-black/40">
                    <img 
                      src={courseCover} 
                      alt={safeTitle} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold text-[#e9c349] uppercase tracking-wider block mb-1 font-mono">Curso</span>
                  <span className="text-white font-bold text-base md:text-lg block leading-snug">{safeTitle}</span>
                </div>

                {/* Preços e Subtotal com Detalhamento de Desconto */}
                <div className="pt-4 border-t border-gray-800/80 space-y-2.5">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Preço do Curso:</span>
                    <span className={`font-semibold ${discountAmount > 0 ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                      {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(safePrice)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Desconto ({appliedCoupon?.code}):
                      </span>
                      <span className="font-mono font-bold">- {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(discountAmount)}</span>
                    </div>
                  )}

                  {/* SEÇÃO DO CUPÃO DE DESCONTO */}
                  <div className="pt-2 pb-1">
                    {!appliedCoupon ? (
                      <div>
                        {!showCouponInput ? (
                          <button
                            type="button"
                            onClick={() => setShowCouponInput(true)}
                            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-[#e9c349] p-3 rounded-xl bg-black/40 hover:bg-black/60 border border-gray-800 hover:border-[#e9c349]/30 transition-all cursor-pointer group"
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <Ticket className="w-4 h-4 text-[#e9c349] group-hover:scale-110 transition-transform" />
                              Possui um cupão de desconto?
                            </span>
                            <span className="text-[11px] font-bold text-[#e9c349] underline group-hover:no-underline">Inserir código</span>
                          </button>
                        ) : (
                          <div className="bg-black/70 border border-gray-700/80 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                <Ticket className="w-3.5 h-3.5 text-[#e9c349]" />
                                Digite o Cupão de Desconto
                              </label>
                              <button 
                                type="button" 
                                onClick={() => { setShowCouponInput(false); setCouponError(null); }}
                                className="text-[11px] text-gray-500 hover:text-gray-300 cursor-pointer"
                              >
                                Fechar
                              </button>
                            </div>
                            
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={couponCodeInput}
                                onChange={(e) => {
                                  setCouponCodeInput(e.target.value.toUpperCase());
                                  setCouponError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleApplyCoupon();
                                  }
                                }}
                                placeholder=""
                                className="flex-1 bg-[#131313] border border-gray-700 focus:border-[#e9c349] text-white rounded-xl px-3 py-2 text-xs font-mono uppercase tracking-wider outline-none transition-all placeholder:text-gray-600"
                              />
                              <button
                                type="button"
                                onClick={handleApplyCoupon}
                                className="bg-[#e9c349] hover:bg-[#d4b03f] text-black font-extrabold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                              >
                                Aplicar
                              </button>
                            </div>

                            {couponError && (
                              <p className="text-red-400 text-[11px] font-medium flex items-center gap-1 animate-in fade-in">
                                <span className="material-symbols-outlined text-[14px]">error</span> {couponError}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-emerald-400 font-mono tracking-wider">{appliedCoupon.code}</span>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                                {appliedCoupon.type === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `-${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(Number(appliedCoupon.discountValue))}`}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 block">Cupão aplicado com sucesso!</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs text-gray-400 hover:text-red-400 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remover cupão"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                    <span className="text-gray-300 font-medium">Total:</span>
                    <span className="text-2xl font-black text-[#e9c349]">
                      {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(finalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {existingTxStatus === 'approved' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center text-emerald-400 text-sm font-medium">
                  <p className="mb-3">Você já tem acesso ativo a este curso!</p>
                  <button 
                    type="button"
                    onClick={() => {
                      navigate(`/classroom?courseId=${courseId}`);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    Assistir Curso Agora
                  </button>
                </div>
              ) : existingTxStatus === 'pending' ? (
                <div className="bg-[#e9c349]/10 border border-[#e9c349]/30 p-5 rounded-2xl text-center text-[#e9c349] text-sm font-medium">
                  <p>Inscrição pendente de aprovação pela equipe administrativa.</p>
                  <p className="text-xs text-stone-400 mt-2">Nossa equipe está validando seu pagamento no momento. Por favor, aguarde.</p>
                </div>
              ) : !hasClickedPaid ? (
                <button
                  type="button"
                  onClick={() => setHasClickedPaid(true)}
                  className="w-full bg-[#e9c349] text-black font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#d4b03f] transition-all transform hover:scale-[1.02] text-base cursor-pointer font-headline"
                >
                  <Check className="w-5 h-5 shrink-0" />
                  Já Paguei
                </button>
              ) : (
                <form onSubmit={handleConfirmAndRedirect} className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
                  {/* INPUT PARA REFERÊNCIA BANCÁRIA DO ALUNO */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Referência do Pagamento / Talão (Obrigatório)
                    </label>
                    <input
                      type="text"
                      required
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      placeholder="Ex: 884920311 ou Nº do Comprovativo"
                      className="w-full bg-black border border-gray-700 text-white rounded-xl p-4 focus:border-[#e9c349] outline-none font-mono placeholder:font-sans placeholder:text-gray-600 text-lg"
                    />
                  </div>

                  <div className="space-y-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#25D366] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#1ebd5a] transition-all transform hover:scale-[1.02] disabled:opacity-50 text-base cursor-pointer"
                    >
                      <MessageCircle className="w-6 h-6 fill-white shrink-0" />
                      {isSubmitting ? 'Processando...' : 'Enviar para o WhatsApp'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 pt-6 border-t border-gray-800 flex items-start gap-3 text-gray-400 text-xs">
                <ShieldCheck className="w-5 h-5 text-[#e9c349] shrink-0" />
                <span className="leading-relaxed">Seu acesso será liberado assim que nossa equipe validar a referência inserida no WhatsApp.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
