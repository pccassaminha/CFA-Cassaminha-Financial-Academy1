import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Copy, Check, MessageCircle, ShieldCheck, Building2, Smartphone, CreditCard } from 'lucide-react';

interface CheckoutProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  onBack: () => void;
}

export default function CourseCheckout({ courseId, courseTitle, coursePrice, onBack }: CheckoutProps) {
  const currentUser = { uid: 'user_123', name: 'Pedro Cassaminha', email: 'pedro@cassaminha.com' };

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [activeMethodIndex, setActiveMethodIndex] = useState<number>(0);
  const [supportNumber, setSupportNumber] = useState('244923456789');
  const [bankReference, setBankReference] = useState(''); 
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safePrice = coursePrice || 0;
  const safeTitle = courseTitle || 'Curso Selecionado';

  useEffect(() => {
    const fetchCheckoutConfig = async () => {
      try {
        // 1. Busca WhatsApp de suporte geral/platform
        const genSnap = await getDoc(doc(db, 'settings', 'general'));
        if (genSnap.exists() && genSnap.data().supportWhatsApp) {
          setSupportNumber(genSnap.data().supportWhatsApp);
        } else {
          const platSnap = await getDoc(doc(db, 'settings', 'platform'));
          if (platSnap.exists() && platSnap.data().supportWhatsApp) {
            setSupportNumber(platSnap.data().supportWhatsApp);
          }
        }

        // 2. Busca configurações de pagamento na collection settings/payment (configuradas no Admin)
        const paymentSettingsSnap = await getDoc(doc(db, 'settings', 'payment'));
        const activeMethods: any[] = [];

        if (paymentSettingsSnap.exists()) {
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

        // 3. Também verifica collection paymentMethods
        const methodsSnap = await getDocs(collection(db, 'paymentMethods'));
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

        // Se nenhum método ativo for encontrado, define os métodos oficiais reais da instituição
        if (activeMethods.length === 0) {
          setPaymentMethods([
            { id: '1', type: 'multicaixa', shortName: 'Multicaixa', bankName: 'Multicaixa (Entidade / Referência)', accountNumber: 'Entidade: 12345 | Ref: 884920311', holderName: 'GRUPO CASSAMINHA LDA' },
            { id: '2', type: 'iban', shortName: 'Transferência IBAN', bankName: 'Banco BFA', accountNumber: 'AO06 0040 0000 7829 1048 1018 2', holderName: 'GRUPO CASSAMINHA LDA' },
            { id: '3', type: 'express', shortName: 'Multicaixa Express', bankName: 'Multicaixa Express', accountNumber: '923 456 789', holderName: 'GRUPO CASSAMINHA LDA' },
            { id: '4', type: 'kwik', shortName: 'KWIK Pagamentos', bankName: 'Transferência KWIK', accountNumber: '931 112 233', holderName: 'GRUPOCASSAMINHA' }
          ]);
        } else {
          setPaymentMethods(activeMethods);
        }
      } catch (error) {
        console.error("Erro ao buscar dados de pagamento:", error);
        setPaymentMethods([
          { id: '1', type: 'multicaixa', shortName: 'Multicaixa', bankName: 'Multicaixa (Entidade / Referência)', accountNumber: 'Entidade: 12345 | Ref: 884920311', holderName: 'GRUPO CASSAMINHA LDA' },
          { id: '2', type: 'iban', shortName: 'Transferência IBAN', bankName: 'Banco BFA', accountNumber: 'AO06 0040 0000 7829 1048 1018 2', holderName: 'GRUPO CASSAMINHA LDA' },
          { id: '4', type: 'kwik', shortName: 'KWIK Pagamentos', bankName: 'Transferência KWIK', accountNumber: '931 112 233', holderName: 'GRUPOCASSAMINHA' }
        ]);
      }
    };
    fetchCheckoutConfig();
  }, []);

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

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        userName: currentUser.name,
        courseId,
        courseTitle: safeTitle,
        referenceNumber: bankReference,
        paymentMethod: selectedMethod.shortName || selectedMethod.bankName || 'Transferência',
        amount: safePrice,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      const cleanSupport = supportNumber.replace(/[^0-9]/g, '');
      const message = `Olá, equipe CFA! Realizei o pagamento do curso.%0A%0A` +
        `📚 *Curso:* ${safeTitle}%0A` +
        `💵 *Valor:* ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(safePrice)}%0A` +
        `👤 *Aluno:* ${currentUser.name}%0A` +
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
    <div className="w-full bg-[#0a0a0a] min-h-screen text-white p-6 md:p-10">
      <div className="w-full max-w-6xl mx-auto">
        
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-medium cursor-pointer">
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
            <div className="flex overflow-x-auto gap-3 mb-8 pb-2 scrollbar-hide">
              {paymentMethods.map((method, index) => (
                <button
                  key={method.id || index}
                  type="button"
                  onClick={() => setActiveMethodIndex(index)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                    activeMethodIndex === index 
                      ? 'bg-[#e9c349] text-black border-[#e9c349]' 
                      : 'bg-black/50 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white'
                  }`}
                >
                  {method.type === 'iban' ? <Building2 className="w-4 h-4" /> : method.type === 'multicaixa' ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  {method.shortName || method.bankName}
                </button>
              ))}
            </div>

            {/* EXIBIÇÃO DA COORDENADA SELECIONADA */}
            {activeMethod && (
              <div className="bg-black/80 border border-gray-700 p-6 rounded-2xl w-full shadow-inner">
                <div className="mb-4">
                  <h4 className="font-bold text-white uppercase text-sm md:text-base text-[#e9c349]">
                    {activeMethod.bankName}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{activeMethod.holderName}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#131313] p-4 rounded-xl border border-gray-800 gap-4">
                  <span className="font-mono text-white font-bold text-base md:text-lg break-words w-full select-all">
                    {activeMethod.accountNumber}
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
            <form onSubmit={handleConfirmAndRedirect} className="bg-[#131313] border border-gray-800 rounded-3xl p-6 md:p-8 sticky top-8 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 pb-4 border-b border-gray-800 font-headline">Resumo da Inscrição</h3>
              
              <div className="space-y-4 mb-8">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Curso</span>
                  <span className="text-white font-bold text-base md:text-lg block line-clamp-2">{safeTitle}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <span className="text-gray-300 font-medium">Total:</span>
                  <span className="text-2xl font-black text-[#e9c349]">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(safePrice)}
                  </span>
                </div>
              </div>

              {/* INPUT PARA REFERÊNCIA BANCÁRIA DO ALUNO */}
              <div className="mb-6">
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
                  {isSubmitting ? 'Processando...' : 'Enviar Comprovativo WhatsApp'}
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800 flex items-start gap-3 text-gray-400 text-xs">
                <ShieldCheck className="w-5 h-5 text-[#e9c349] shrink-0" />
                <span className="leading-relaxed">Seu acesso será liberado assim que nossa equipe validar a referência inserida no WhatsApp.</span>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
