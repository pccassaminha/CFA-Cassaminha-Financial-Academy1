import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

interface CheckoutProps {
  courseId?: string;
  courseTitle?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CourseCheckout({ 
  courseId = 'cfa-financial-master', 
  courseTitle = 'CFA - Cassaminha Financial Academy',
  onSuccess,
  onCancel
}: CheckoutProps) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  const [reference, setReference] = useState('');
  const [supportNumber, setSupportNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Busca o número do WhatsApp configurado no Admin
  useEffect(() => {
    const fetchSupportNumber = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().supportWhatsApp) {
          setSupportNumber(docSnap.data().supportWhatsApp);
        } else {
          const platRef = doc(db, 'settings', 'platform');
          const platSnap = await getDoc(platRef);
          if (platSnap.exists() && platSnap.data().supportWhatsApp) {
            setSupportNumber(platSnap.data().supportWhatsApp);
          } else {
            setSupportNumber('244923456789');
          }
        }
      } catch (err) {
        console.error("Erro ao carregar WhatsApp de suporte:", err);
        setSupportNumber('244923456789');
      }
    };
    fetchSupportNumber();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanRef = reference.trim();
    if (!cleanRef) {
      setFeedback({ text: 'Por favor, insira o número de referência da transação.', type: 'error' });
      return;
    }

    const cleanSupportNumber = (supportNumber || '244923456789').replace(/[^0-9]/g, '');
    if (!cleanSupportNumber) {
      setFeedback({ text: 'O número de suporte não está configurado. Tente novamente mais tarde.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    const studentName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Aluno CFA';
    const userId = currentUser?.uid || `guest_${Date.now()}`;

    try {
      // 1. Cria o pedido "Pendente" no banco de dados da plataforma
      await addDoc(collection(db, 'transactions'), {
        userId: userId,
        userName: studentName,
        userEmail: currentUser?.email || 'aluno@cassaminha.ao',
        courseId,
        courseTitle,
        referenceNumber: cleanRef,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. Prepara a mensagem amigável para o WhatsApp
      const message = `Olá, suporte da CFA! Realizei o pagamento do curso *${courseTitle}*. \n\n*Meu Nome:* ${studentName}\n*Nº da Referência:* ${cleanRef}\n\nSegue em anexo o meu comprovativo:`;
      const encodedMessage = encodeURIComponent(message);
      
      // 3. Redireciona o aluno para o WhatsApp do suporte
      const whatsappUrl = `https://wa.me/${cleanSupportNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      // 4. Limpa o formulário e avisa o aluno
      setReference('');
      setFeedback({ 
        text: 'Pedido registrado! Seu curso será liberado após a verificação do comprovativo enviado no WhatsApp.', 
        type: 'success' 
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Erro ao registrar transação:', error);
      setFeedback({ text: 'Ocorreu um erro ao salvar seu pedido. Tente novamente.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-[#131313] rounded-2xl border border-gray-800 max-w-md mx-auto shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#e9c349]">verified</span>
        <h3 className="text-xl font-bold text-white font-headline">Confirmar Pagamento</h3>
      </div>
      
      <p className="text-gray-400 text-sm mb-6">
        Curso: <span className="text-[#e9c349] font-semibold">{courseTitle}</span>
      </p>

      {feedback && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          <span className="material-symbols-outlined text-base">
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
            Número de Referência / Transação <span className="text-[#e9c349]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: 000123456789"
              className="w-full bg-black/70 border border-gray-700 text-white rounded-lg p-3 pl-10 focus:outline-none focus:border-[#e9c349] font-mono text-sm"
              required
            />
            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-500 text-sm">tag</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Insira o número gerado no recibo do Multicaixa ou transferência bancária.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3.5 px-4 rounded-lg hover:bg-[#1ebd5a] active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-lg font-headline"
          >
            {/* Ícone simples do WhatsApp */}
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            {isSubmitting ? 'Processando...' : 'Enviar Comprovativo no WhatsApp'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full text-center text-xs text-gray-400 hover:text-white py-2 cursor-pointer transition-colors"
            >
              Cancelar e voltar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
