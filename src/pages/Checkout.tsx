import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { PlatformSettings, Transaction } from '../types';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId') || '';

  const [selectedCourse, setSelectedCourse] = useState<{ id: string; title: string; price: number; coverImage?: string } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('multicaixa');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nif, setNif] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportWhatsApp, setSupportWhatsApp] = useState('244923456789');

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
    const loadCourse = async () => {
      try {
        if (courseIdParam) {
          const cSnap = await getDoc(doc(db, 'courses', courseIdParam));
          if (cSnap.exists()) {
            const data = cSnap.data();
            setSelectedCourse({
              id: cSnap.id,
              title: data.title || 'Formação CFA',
              price: Number(data.price) || 0,
              coverImage: data.coverImage || data.imageUrl || data.image || ''
            });
            return;
          }
        }
        // Fallback: pega o primeiro curso se houver
        const allSnap = await getDocs(collection(db, 'courses'));
        if (!allSnap.empty) {
          const first = allSnap.docs[0];
          const fData = first.data();
          setSelectedCourse({
            id: first.id,
            title: fData.title || 'Formação CFA',
            price: Number(fData.price) || 0,
            coverImage: fData.coverImage || fData.imageUrl || fData.image || ''
          });
        } else {
          setSelectedCourse({
            id: 'curso-cfa',
            title: 'Formação CFA',
            price: 0
          });
        }
      } catch (err) {
        console.error("Erro ao carregar curso no checkout:", err);
      }
    };
    loadCourse();
  }, [courseIdParam]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'payment');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPaymentSettings(prev => ({ ...prev, ...data }));
          
          if (data.multicaixaActive) {
            setSelectedMethod('multicaixa');
          } else if (data.ibanActive) {
            setSelectedMethod('transfer');
          } else if (data.expressActive) {
            setSelectedMethod('express');
          } else if (data.kwikActive) {
            setSelectedMethod('kwik');
          }
        }

        const platformRef = doc(db, 'settings', 'platform');
        const platformSnap = await getDoc(platformRef);
        if (platformSnap.exists()) {
          const pData = platformSnap.data() as PlatformSettings;
          if (pData.supportWhatsApp) setSupportWhatsApp(pData.supportWhatsApp);
        } else {
          const genRef = doc(db, 'settings', 'general');
          const genSnap = await getDoc(genRef);
          if (genSnap.exists() && genSnap.data().supportWhatsApp) {
            setSupportWhatsApp(genSnap.data().supportWhatsApp);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    const auth = getAuth();
    if (auth.currentUser) {
      setEmail(auth.currentUser.email || '');
      if (auth.currentUser.displayName) {
        setFullName(auth.currentUser.displayName);
      }
    }

    loadSettings();
  }, []);

  const coursePrice = selectedCourse ? selectedCourse.price : 0;
  const courseTitle = selectedCourse ? selectedCourse.title : 'Formação CFA';
  const courseId = selectedCourse ? selectedCourse.id : 'curso-cfa';

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userId = currentUser ? currentUser.uid : `guest_${Date.now()}`;
    const txId = `tx_${Date.now()}`;
    const cleanRef = referenceNumber.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`;

    const transactionData: Transaction = {
      id: txId,
      userId: userId,
      userEmail: email || currentUser?.email || 'aluno@cassaminha.ao',
      userName: fullName || 'Aluno CFA',
      courseId: courseId,
      courseTitle: courseTitle,
      referenceNumber: cleanRef,
      paymentMethod: selectedMethod,
      amount: coursePrice,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      // Create transaction record in Firestore
      await setDoc(doc(db, 'transactions', txId), transactionData);

      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          fullName: fullName || currentUser.displayName || '',
          nif: nif || '',
          lastTransactionRef: cleanRef
        });
      }

      localStorage.setItem('cfa_last_transaction', JSON.stringify({
        ...transactionData,
        supportWhatsApp
      }));

      navigate('/confirmation');
    } catch (err) {
      console.error("Error processing checkout transaction:", err);
      // Fallback local
      localStorage.setItem('cfa_last_transaction', JSON.stringify({
        ...transactionData,
        supportWhatsApp
      }));
      navigate('/confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none z-[99] opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
      
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#131313]/60 backdrop-blur-xl">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <Link to="/sales" className="text-3xl font-black tracking-tighter text-[#e9c349] font-headline">CFA</Link>
          <div className="hidden md:flex gap-8 items-center">
            <a className="text-stone-400 hover:text-stone-200 transition-colors font-headline tracking-tight" href="#">Curriculum</a>
            <a className="text-stone-400 hover:text-stone-200 transition-colors font-headline tracking-tight" href="#">Mentors</a>
            <a className="text-stone-400 hover:text-stone-200 transition-colors font-headline tracking-tight" href="#">Membership</a>
            <button className="bg-primary text-on-primary px-6 py-2 rounded-xl font-bold transition-opacity hover:opacity-80 active:scale-95">Secure Checkout</button>
          </div>
          <div className="md:hidden">
            <span className="material-symbols-outlined text-primary">menu</span>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <span className="text-xs font-bold uppercase tracking-widest font-label">Checkout Seguro CFA - Cassaminha Financial Academy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter font-headline text-on-surface">Finalize sua Inscrição</h1>
        </div>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Registration & Payment */}
          <div className="lg:col-span-7 space-y-8">
            {/* Identification Section */}
            <section className="bg-surface-container p-8 rounded-xl border border-outline-variant/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">01</div>
                <h2 className="text-xl font-bold font-headline">Identificação do Aluno</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Nome Completo</label>
                  <input 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary text-on-surface placeholder:text-stone-600 transition-all outline-none" 
                    placeholder="Como no seu documento" 
                    type="text" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">E-mail</label>
                  <input 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary text-on-surface placeholder:text-stone-600 transition-all outline-none" 
                    placeholder="seu@email.com" 
                    type="email" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">NIF (Número de Identificação Fiscal)</label>
                  <input 
                    required 
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary text-on-surface placeholder:text-stone-600 transition-all outline-none font-mono" 
                    placeholder="000000000" 
                    type="text" 
                  />
                </div>
              </div>
            </section>

            {/* Payment Methods Section */}
            <section className="bg-surface-container p-8 rounded-xl border border-outline-variant/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">02</div>
                <div>
                  <h2 className="text-xl font-bold font-headline">Coordenadas e Métodos de Pagamento</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Efectue o pagamento utilizando um dos métodos ativos abaixo e insira o comprovativo/referência.</p>
                </div>
              </div>

              {/* Summary of Active Payment Coordinates */}
              <div className="mb-6 space-y-4">
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#e9c349]/30">
                  <h3 className="text-sm font-bold text-[#e9c349] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">info</span>
                    Dados Oficiais para Pagamento (Ativos na Plataforma)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {paymentSettings.multicaixaActive && (
                      <div className="p-3 rounded-lg bg-surface-container-high/50 border border-outline-variant/20">
                        <div className="flex items-center gap-2 font-bold text-on-surface mb-2">
                          <span className="material-symbols-outlined text-primary text-base">payments</span>
                          Referência Multicaixa
                        </div>
                        <div className="space-y-1 font-mono text-xs">
                          <p><span className="text-stone-400">Entidade:</span> <strong className="text-[#e9c349]">{paymentSettings.multicaixaEntity}</strong></p>
                          <p><span className="text-stone-400">Referência:</span> <strong className="text-[#e9c349]">{paymentSettings.multicaixaReference}</strong></p>
                          <p><span className="text-stone-400">Beneficiário:</span> <span className="text-on-surface font-sans">{paymentSettings.multicaixaName || 'GRUPO CASSAMINHA LDA'}</span></p>
                        </div>
                      </div>
                    )}

                    {paymentSettings.ibanActive && (
                      <div className="p-3 rounded-lg bg-surface-container-high/50 border border-outline-variant/20">
                        <div className="flex items-center gap-2 font-bold text-on-surface mb-2">
                          <span className="material-symbols-outlined text-primary text-base">account_balance</span>
                          Transferência Bancária (IBAN)
                        </div>
                        <div className="space-y-1 font-mono text-xs">
                          <p><span className="text-stone-400">Banco:</span> <span className="text-on-surface font-sans font-bold">{paymentSettings.bankName}</span></p>
                          <p className="break-all"><span className="text-stone-400">IBAN:</span> <strong className="text-[#e9c349] select-all">{paymentSettings.iban}</strong></p>
                          <p><span className="text-stone-400">Titular:</span> <span className="text-on-surface font-sans">{paymentSettings.ibanAccountName || 'GRUPO CASSAMINHA'}</span></p>
                        </div>
                      </div>
                    )}

                    {paymentSettings.expressActive && (
                      <div className="p-3 rounded-lg bg-surface-container-high/50 border border-outline-variant/20">
                        <div className="flex items-center gap-2 font-bold text-on-surface mb-2">
                          <span className="material-symbols-outlined text-primary text-base">speed</span>
                          Multicaixa Express
                        </div>
                        <div className="space-y-1 font-mono text-xs">
                          <p><span className="text-stone-400">Telemóvel:</span> <strong className="text-[#e9c349]">{paymentSettings.expressPhone}</strong></p>
                          <p><span className="text-stone-400">Titular:</span> <span className="text-on-surface font-sans">{paymentSettings.expressName || 'GRUPO CASSAMINHA LDA'}</span></p>
                        </div>
                      </div>
                    )}

                    {paymentSettings.kwikActive && (
                      <div className="p-3 rounded-lg bg-surface-container-high/50 border border-outline-variant/20">
                        <div className="flex items-center gap-2 font-bold text-on-surface mb-2">
                          <span className="material-symbols-outlined text-primary text-base">qr_code_2</span>
                          Transferência KWIK
                        </div>
                        <div className="space-y-1 font-mono text-xs">
                          <p><span className="text-stone-400">Chave KWIK:</span> <strong className="text-[#e9c349] select-all">{paymentSettings.kwikPhone}</strong></p>
                          <p><span className="text-stone-400">Beneficiário:</span> <span className="text-on-surface font-sans">{paymentSettings.kwikName}</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Selecione o método utilizado:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {paymentSettings.multicaixaActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('multicaixa')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        selectedMethod === 'multicaixa' 
                          ? 'bg-surface-container-high border-primary text-primary shadow-md' 
                          : 'bg-surface-container-highest/50 border-outline-variant/20 text-on-surface hover:border-outline-variant/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">payments</span>
                      <span className="text-xs font-bold">Multicaixa</span>
                    </button>
                  )}

                  {paymentSettings.ibanActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('transfer')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        selectedMethod === 'transfer' 
                          ? 'bg-surface-container-high border-primary text-primary shadow-md' 
                          : 'bg-surface-container-highest/50 border-outline-variant/20 text-on-surface hover:border-outline-variant/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">account_balance</span>
                      <span className="text-xs font-bold">IBAN / Banco</span>
                    </button>
                  )}

                  {paymentSettings.expressActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('express')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        selectedMethod === 'express' 
                          ? 'bg-surface-container-high border-primary text-primary shadow-md' 
                          : 'bg-surface-container-highest/50 border-outline-variant/20 text-on-surface hover:border-outline-variant/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">speed</span>
                      <span className="text-xs font-bold">Express</span>
                    </button>
                  )}

                  {paymentSettings.kwikActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('kwik')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        selectedMethod === 'kwik' 
                          ? 'bg-surface-container-high border-primary text-primary shadow-md' 
                          : 'bg-surface-container-highest/50 border-outline-variant/20 text-on-surface hover:border-outline-variant/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                      <span className="text-xs font-bold">KWIK</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Step 3: Transaction Reference Number / Proof */}
            <section className="bg-surface-container p-8 rounded-xl border border-outline-variant/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">03</div>
                <div>
                  <h2 className="text-xl font-bold font-headline">Número de Referência da Transação</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Insira o código/referência do comprovativo da sua transferência ou pagamento.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    Número da Transação / Referência <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      required
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 pl-11 focus:ring-1 focus:ring-primary text-on-surface placeholder:text-stone-600 transition-all outline-none font-mono text-base" 
                      placeholder="Ex: TR-8920194 ou 9238472910" 
                      type="text" 
                    />
                    <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-stone-400 text-lg">tag</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-2">
                    Este número é registrado na transação e confere a validação da sua inscrição pelo suporte e sistema CFA.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-6">
              <div className="bg-surface-container-high p-8 rounded-xl overflow-hidden relative">
                {/* Decorative glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>
                <h2 className="text-xl font-bold font-headline mb-6">Resumo do Pedido</h2>
                <div className="flex gap-4 mb-8">
                  <div className="w-24 h-24 rounded-lg bg-surface-container-lowest flex-shrink-0 relative group overflow-hidden border border-outline-variant/10">
                    {selectedCourse?.coverImage ? (
                      <img alt={courseTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={selectedCourse.coverImage} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-900 text-[#e9c349]">
                        <span className="material-symbols-outlined text-3xl">school</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high/80 to-transparent"></div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1 block">Curso CFA</span>
                    <h3 className="font-bold text-lg leading-tight">{courseTitle}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Acesso direto e suporte via WhatsApp</p>
                  </div>
                </div>
                <div className="space-y-4 pt-6 border-t border-outline-variant/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span className="font-semibold">
                      {coursePrice > 0 ? `Kz ${coursePrice.toLocaleString('pt-AO')}` : 'Gratuito'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Taxas Académicas</span>
                    <span className="text-secondary">Kz 0</span>
                  </div>
                  <div className="flex justify-between items-end pt-4">
                    <span className="font-headline font-bold text-lg">Total</span>
                    <div className="text-right">
                      <span className="block text-3xl font-black text-primary font-headline tracking-tighter">
                        {coursePrice > 0 ? `Kz ${coursePrice.toLocaleString('pt-AO')}` : 'Kz 0'}
                      </span>
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full mt-8 bg-primary text-on-primary py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  Finalizar Inscrição Segura
                </button>
                <div className="mt-6 flex items-center justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                  <span className="material-symbols-outlined text-2xl">security</span>
                  <span className="material-symbols-outlined text-2xl">gpp_maybe</span>
                </div>
              </div>
              {/* Testimonial or Trust Banner */}
              <div className="p-6 rounded-xl border border-outline-variant/20 flex gap-4 items-start">
                <span className="material-symbols-outlined text-secondary text-3xl">workspace_premium</span>
                <div>
                  <p className="text-sm font-medium">Garantia de Autoridade</p>
                  <p className="text-xs text-on-surface-variant mt-1">Junte-se a mais de 2.500 investidores soberanos em toda a Angola.</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-800/30 bg-[#0e0e0e] relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-10 gap-6 max-w-7xl mx-auto">
          <div className="text-[#e9c349] font-black tracking-tighter text-xl">CFA - Cassaminha Financial Academy</div>
          <div className="text-stone-500 font-label text-[10px] md:text-sm uppercase tracking-widest text-center md:text-left">
            © 2024 CFA - Cassaminha Financial Academy. Pagamentos seguros em Kwanza (Kz).
          </div>
          <div className="flex gap-6">
            <a className="text-stone-500 hover:text-[#93d6a0] transition-colors font-label text-sm uppercase tracking-widest" href="#">Privacy Vault</a>
            <a className="text-stone-500 hover:text-[#93d6a0] transition-colors font-label text-sm uppercase tracking-widest" href="#">Terms of Authority</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
