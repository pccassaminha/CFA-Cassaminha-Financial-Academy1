import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'instant' | 'playstore'>('instant');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('Para instalar no seu telemóvel Android:\n1. Toque nos 3 pontinhos do navegador Chrome (canto superior direito)\n2. Selecione "Adicionar ao ecrã principal" ou "Instalar aplicação".');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-[#12141a] border border-white/15 text-stone-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-[#0a0c10] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#e9c349]/10 border border-[#e9c349]/30 flex items-center justify-center text-[#e9c349] shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-headline">
                  CFA Academy &middot; Versão Android
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e9c349]/10 text-[#e9c349] border border-[#e9c349]/30">
                  Pronto para Testes
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Experiência de App Nativo para telemóveis e preparação para a Google Play Store
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            title="Fechar"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-[#0d0f14] p-1.5 gap-2">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'instant'
                ? 'bg-[#e9c349] text-black shadow-md'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Testar no Telemóvel Agora</span>
          </button>
          <button
            onClick={() => setActiveTab('playstore')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'playstore'
                ? 'bg-[#e9c349] text-black shadow-md'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Publicação na Google Play (APK/AAB)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[68vh] overflow-y-auto">

          {activeTab === 'instant' ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#1a1c23] to-[#0f1117] border border-[#e9c349]/30 rounded-2xl p-5 text-center space-y-3">
                <div className="w-14 h-14 bg-stone-900 rounded-2xl border border-white/10 mx-auto flex items-center justify-center shadow-lg p-2">
                  <img 
                    src="https://i.postimg.cc/Jz2CYxYq/fvcom.png" 
                    alt="CFA Academy App" 
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-headline">
                    Instalar CFA Academy no seu Android
                  </h3>
                  <p className="text-xs text-stone-300 max-w-md mx-auto mt-1">
                    Instale como um aplicativo no seu telemóvel. Abre em ecrã completo, com ícone próprio na sua tela inicial e sem a barra do navegador.
                  </p>
                </div>

                <button
                  onClick={handleInstallClick}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#e9c349] hover:bg-[#d4b03f] text-black font-extrabold rounded-xl shadow-[0_4px_20px_rgba(233,195,73,0.35)] active:scale-95 transition-all text-xs font-headline flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'Aplicação Já Instalada' : 'Instalar Agora no Android'}</span>
                </button>
              </div>

              {/* Passos Manuais de Teste */}
              <div className="bg-[#181a20] border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#e9c349]" />
                  Passo a Passo de Instalação Manual no Android:
                </h4>
                <div className="space-y-2 text-xs text-stone-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#e9c349]/20 text-[#e9c349] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <p>Abra o link da plataforma no navegador <strong>Google Chrome</strong> do seu smartphone Android.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#e9c349]/20 text-[#e9c349] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <p>Toque no menu de <strong>3 pontinhos</strong> (canto superior direito do Chrome).</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#e9c349]/20 text-[#e9c349] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                    <p>Selecione <strong>"Instalar aplicação"</strong> ou <strong>"Adicionar ao ecrã principal"</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#e9c349]/20 text-[#e9c349] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                    <p>O ícone oficial da <strong>CFA Academy</strong> aparecerá na tela do seu telemóvel funcionando como app nativo!</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#181a20] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#e9c349]">
                  <ShieldCheck className="w-5 h-5" />
                  <h4 className="text-sm font-bold text-white font-headline">
                    Estrutura Nativa Capacitor Pronta
                  </h4>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  O projeto já possui o <strong>Capacitor Android</strong> configurado com o identificador de pacote <code className="text-[#e9c349] font-mono bg-black/40 px-1.5 py-0.5 rounded">com.grupocassaminha.cfa</code>.
                </p>

                <div className="space-y-2 pt-1">
                  <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs font-mono space-y-1">
                    <div className="text-stone-400 text-[10px] flex justify-between items-center">
                      <span>Comandos para gerar no Android Studio / APK:</span>
                      <button
                        onClick={() => handleCopy('npx cap add android && npx cap sync', 'cmd1')}
                        className="text-[#e9c349] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedText === 'cmd1' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedText === 'cmd1' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <p className="text-emerald-400 select-all">npx cap add android</p>
                    <p className="text-emerald-400 select-all">npx cap sync</p>
                    <p className="text-emerald-400 select-all">npx cap open android</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#181a20] border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Checklist para a Google Play Console:
                </h4>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Conta Google Play Console criada pelo Grupo Cassaminha.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Gerar o arquivo <strong>.AAB (Android App Bundle)</strong> assinado no Android Studio.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Upload na Play Console e envio para aprovação da Google.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#0a0c10] border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            Grupo Cassaminha &middot; CFA Mobile Engine
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-white/10"
          >
            Entendido, Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
