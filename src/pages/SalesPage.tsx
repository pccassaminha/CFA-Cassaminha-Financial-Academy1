import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function SalesPage() {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const generalDoc = await getDoc(doc(db, 'settings', 'general'));
        if (generalDoc.exists() && generalDoc.data().logoUrl) {
          setLogoUrl(generalDoc.data().logoUrl);
        }
        const platformDoc = await getDoc(doc(db, 'settings', 'platform'));
        if (platformDoc.exists() && platformDoc.data().logoUrl) {
          setLogoUrl(platformDoc.data().logoUrl);
        }
      } catch (err) {
        console.error("Error loading logo in Sales page:", err);
      }
    };
    fetchLogo();
  }, []);
  return (
    <div className="antialiased selection:bg-primary/30 selection:text-primary bg-[#131313] text-[#e5e2e1] font-body min-h-screen">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }}></div>
      
      {/* TopNavBar Navigation Shell */}
      <nav className="fixed top-0 w-full z-50 bg-[#131313]/60 backdrop-blur-xl transition-all border-none">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto font-headline tracking-tight">
          <Link to="/sales" className="flex items-center cursor-pointer" id="sales-logo-link">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-10 w-auto object-contain rounded-xl shadow-md" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-3xl font-black tracking-tighter text-[#e9c349]">CFA</span>
            )}
          </Link>
          <div className="hidden md:flex gap-8 items-center">
            <a className="text-[#e9c349] font-bold border-b-2 border-[#e9c349] pb-1" href="#">Curriculum</a>
            <a className="text-stone-400 hover:text-stone-200 transition-colors" href="#">Mentors</a>
            <a className="text-stone-400 hover:text-stone-200 transition-colors" href="#">Membership</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-stone-300 hover:text-[#e9c349] font-bold text-sm px-3 py-2 transition-colors">
              Entrar
            </Link>
            <Link to="/" state={{ register: true }} className="bg-[#e9c349] text-[#3c2f00] px-5 py-2.5 rounded-xl font-black text-sm hover:opacity-80 transition-opacity active:scale-95 duration-100 shadow-[0_4px_12px_rgba(233,195,115,0.2)]">
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[921px] flex items-center overflow-hidden px-6 lg:px-12 mb-24">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent z-10"></div>
            <img className="w-full h-full object-cover object-right opacity-40" alt="Hero background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU4sfTMuGvwnZlAeoifUx8z0Olr0Qavvnxv6udo1JmaB5k9OO1NbOp9sRBUYhX1x5xDW_r2OXrViSUyDfY5W4EjocWT9vHM52NGM0FeYPT7xCBpLIbG4IXCyMJt8e9mlrdsTH2rOb8MgLdMNS35NtCuBwgXCB82-Aj0BpOAEGqs3qglA7RN5j_pjq3yDErIhdIkeDHMEDUL65DieAC6jrgriXxquJWdtmjg5kE1oYrb9wrqT6FjcFWZrfhlMzL1F6OqUEDda0HjA" />
          </div>
          <div className="relative z-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/20">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="text-xs uppercase tracking-[0.2em] font-medium text-on-surface-variant font-label">Acesso Exclusivo</span>
              </div>
              <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] text-on-surface">
                CFA - Cassaminha <span className="bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent">Financial Academy</span>
              </h1>
              <p className="text-on-surface-variant text-lg md:text-xl max-w-xl font-body leading-relaxed">
                Domine a arte da importação, investimentos e competências corporativas de alta performance. Um ecossistema prático para expandir seus negócios globais.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Link to="/" state={{ register: true }} className="w-full sm:w-auto bg-[#e9c349] text-[#3c2f00] px-8 py-4 rounded-xl font-bold text-lg text-center hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-[0_4px_16px_rgba(233,195,115,0.25)]">
                  Criar Conta de Aluno
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link to="/" className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-sm text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-800 border border-stone-700/50 text-center transition-all">
                  Já tenho conta (Entrar)
                </Link>
              </div>
            </div>
            {/* Video/Image Presentation Frame */}
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl border border-outline-variant/10 bg-surface-container-highest group cursor-pointer">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" alt="Presentation" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB09JAqx5xMcLPKatcdrxHapeJfSDfXamPj30KrdHGO-gqXuzHwGhXsdt4XTbBX9pFGYV94DZHRSrkTA7fZjXcFX73ARtfRKti28RBZ85H3dH6Xj2-2evUg7niChG2dyFjw_pf3YP_kLoXj5mNyEh9ORq5bkoQw7AGHdtvtWEJwknrd5HO0HGAPJmvLkB_p8KtjDMvwWThYd_KThqqERu-Y15bIzeeiWfMWkKUSLsEsZXWT5WU4vgcOPD6KVZqBz4LHphWFEB0j4w" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-md px-4 py-2 rounded-lg border border-outline-variant/10">
                <p className="text-xs font-label text-on-surface">Introdução ao Método CFA</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: O que você vai aprender */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="mb-16">
            <span className="text-secondary font-label uppercase tracking-[0.3em] text-sm">Currículo de Autoridade</span>
            <h2 className="font-headline text-4xl font-bold mt-4 text-on-surface">Arquitetura do Conhecimento</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Card */}
            <div className="md:col-span-2 p-8 rounded-xl bg-surface-container-high border border-outline-variant/10 flex flex-col justify-between min-h-[320px]">
              <div>
                <span className="material-symbols-outlined text-primary text-4xl mb-6">local_shipping</span>
                <h3 className="text-xl font-headline font-bold text-on-surface mb-4">Importação descomplicada & Logística Global</h3>
                <p className="text-on-surface-variant leading-relaxed">Aprenda a intermediar, comprar e transportar mercadorias de fornecedores internacionais com segurança, eficiência fiscal, aduaneira e excelentes margens de lucro nas principais rotas globais.</p>
              </div>
              <div className="mt-8 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-surface-container text-xs text-secondary-fixed-dim">Módulo Geral</span>
                <span className="px-3 py-1 rounded-full bg-surface-container text-xs text-on-surface-variant">Prático</span>
              </div>
            </div>
            {/* Secondary Card */}
            <div className="p-8 rounded-xl bg-secondary-container/10 border border-secondary/20 flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-secondary text-4xl mb-6">trending_up</span>
                <h3 className="text-xl font-headline font-bold text-on-surface mb-4">Mercado Financeiro de Elite</h3>
                <p className="text-on-surface-variant text-sm">Navegue em renda variável, estratégias de câmbio e gestão de risco eficiente de forma descomplicada.</p>
              </div>
              <ul className="space-y-3 mt-6">
                <li className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Gestão de Carteira Inteligente
                </li>
                <li className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Psicologia do Investidor
                </li>
              </ul>
            </div>
            {/* Small Cards */}
            <div className="p-8 rounded-xl bg-surface-container-high border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary-fixed-dim text-3xl mb-4">account_balance_wallet</span>
              <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Finanças Pessoais</h3>
              <p className="text-on-surface-variant text-sm">Desenvolva uma mentalidade inteligente de controle e alocação de receitas.</p>
            </div>
            <div className="p-8 rounded-xl bg-surface-container-high border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary-fixed-dim text-3xl mb-4">rocket_launch</span>
              <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Crescimento de Negócios</h3>
              <p className="text-on-surface-variant text-sm">Estudos de caso reais de comercialização, precificação e distribuição de produtos.</p>
            </div>
            <div className="p-8 rounded-xl bg-surface-container-high border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary-fixed-dim text-3xl mb-4">shield</span>
              <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Preservação de Capital</h3>
              <p className="text-on-surface-variant text-sm">Estratégias de diversificação e proteção de capital de forma robusta e legal.</p>
            </div>
          </div>
        </section>

        {/* Course Description & Identity */}
        <section className="bg-surface-container-lowest py-24 border-y border-outline-variant/10">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 blur-[80px] rounded-full"></div>
              <img className="rounded-xl grayscale hover:grayscale-0 transition-all duration-1000 border border-outline-variant/20 relative z-10" alt="Workspace" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_Q0OmzECXhtHN7K5xJJ6iaSVwWVVgeCxcs6waQ_acfCFnrYFkZnYZbn5zp27CyokgJQUXCj0dpafacrUZjnmT9-o7hnO3NN8HvviTfvqhz9YhjDRMYq2qLhpesNu7_vcQPjOgivji6AMy1T1zNdNmlIwx4FQIJp_aX28bqFkibedtytYnQPWevO0tTfjrkqDMRsG5ga-QieLbKt4w6Fqw1NfJeSr1pH9r3hPEJWAxy6jOQR-AgNHzBYK41EKh2V0K4dNvF9FkJQ" />
            </div>
            <div>
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-8">Por que a CFA - Cassaminha Financial Academy?</h2>
              <div className="space-y-6">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary">verified_user</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Credibilidade Institucional</h4>
                    <p className="text-on-surface-variant text-sm font-body">Nossos métodos não são baseados em teorias de rede social, mas em anos de operações reais no mercado global.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary">hub</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Comunidade de Elite</h4>
                    <p className="text-on-surface-variant text-sm font-body">Ao matricular-se, você entra para um ecossistema de mentes focadas em liberdade financeira e autoridade.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary">language</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Perspectiva Global</h4>
                    <p className="text-on-surface-variant text-sm font-body">Entenda como o Kwanza se posiciona e como as moedas africanas interagem com o par EUR/USD.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA / Access Section */}
        <section className="max-w-4xl mx-auto px-6 py-32 text-center" id="acesso">
          <div className="bg-surface-container p-12 rounded-[2rem] border border-outline-variant/20 relative overflow-hidden">
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
            <h3 className="font-headline text-4xl font-extrabold text-on-surface mb-4">Inicie Sua Jornada na CFA</h3>
            <p className="text-on-surface-variant mb-10 max-w-lg mx-auto">Cadastre-se na plataforma para explorar os cursos, formações práticas e expandir seus conhecimentos.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto justify-center mb-6">
              <Link to="/" state={{ register: true }} className="w-full sm:w-auto px-8 bg-[#e9c349] text-[#3c2f00] py-4 rounded-xl font-black text-lg hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(233,195,115,0.25)]">
                Criar Conta de Aluno
              </Link>
              <Link to="/" className="w-full sm:w-auto px-8 bg-stone-800 text-stone-200 border border-stone-700 py-4 rounded-xl font-bold text-lg hover:bg-stone-700 transition-all">
                Já sou Aluno (Entrar)
              </Link>
            </div>
            
            <p className="text-stone-400 text-xs font-label">Acesse suas aulas de forma segura e personalizada</p>

            <div className="mt-12 flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
              <span className="text-xs font-bold tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-sm">lock</span> SSL SECURE</span>
              <span className="text-xs font-bold tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-sm">verified</span> CERTIFICADO DE CONCLUSÃO</span>
              <span className="text-xs font-bold tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-sm">devices</span> MULTIPLATAFORMA</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Navigation Shell */}
      <footer className="w-full border-t border-stone-800/30 bg-[#0e0e0e] font-label text-sm uppercase tracking-widest relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-10 gap-6 max-w-7xl mx-auto">
          <div className="text-[#e9c349] font-black tracking-tighter text-lg">CFA - Cassaminha Financial Academy</div>
          <div className="flex gap-8">
            <a className="text-stone-500 hover:text-[#93d6a0] transition-colors" href="#">Privacy Vault</a>
            <a className="text-stone-500 hover:text-[#93d6a0] transition-colors" href="#">Terms of Authority</a>
            <a className="text-stone-500 hover:text-[#93d6a0] transition-colors" href="#">Security Certifications</a>
          </div>
          <div className="text-stone-500 normal-case tracking-normal">
            © 2024 CFA - Cassaminha Financial Academy. Pagamentos seguros em Kwanza (Kz).
          </div>
        </div>
      </footer>
    </div>
  );
}
