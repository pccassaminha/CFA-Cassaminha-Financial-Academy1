import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, CheckCircle2, Key, Phone, BookOpen, Lock, AlertCircle, Hash, RefreshCw, Send } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function StudentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handlePasswordReset = async () => {
    const email = profile?.email || auth.currentUser?.email;
    if (!email) {
      setResetError('E-mail não encontrado para redefinição.');
      return;
    }
    try {
      setSendingReset(true);
      setResetError('');
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      console.error("Erro ao enviar e-mail de redefinição:", err);
      setResetError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setSendingReset(false);
    }
  };

  // Convert Firebase UID to a short clean numeric string
  const getNumericId = (uid: string) => {
    if (!uid) return '100458';
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = (hash * 31 + uid.charCodeAt(i)) % 1000000000;
    }
    return Math.abs(hash).toString().padStart(6, '0');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile({
            uid: user.uid,
            email: user.email,
            ...docSnap.data()
          });
        } else {
          setProfile({
            uid: user.uid,
            email: user.email,
            role: 'student',
            subscriptionStatus: 'active'
          });
        }
      } catch (err) {
        console.error("Erro ao buscar perfil do aluno:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-[#e9c349] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const enrolledCount = Array.isArray(profile?.enrolledCourses) ? profile.enrolledCourses.length : 0;
  const completedCount = Array.isArray(profile?.completedLessons) ? profile.completedLessons.length : 0;
  const numericId = getNumericId(profile?.uid || auth.currentUser?.uid || '');
  const fullName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : (auth.currentUser?.displayName || 'Estudante CFA');
  const fullPhone = profile?.phoneNumber ? `${profile.phoneCountryCode || '+244'} ${profile.phoneNumber}` : 'Não informado';

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white font-headline">Meus Dados de Acesso & Conta</h1>
        <p className="text-gray-400 text-sm mt-1">Visualize suas credenciais de acesso, nome, telefone, número de ID numérico e status da conta.</p>
      </div>

      <div className="space-y-6">
        {/* Cartão de Credenciais de Acesso */}
        <div className="bg-[#131313] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-gray-800 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#e9c349]/15 text-[#e9c349] flex items-center justify-center font-bold">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Credenciais & Dados do Estudante</h3>
              <p className="text-xs text-gray-400">Informações de identificação, nome, contato e ID numérico</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">Nome Completo do Aluno</span>
              <p className="text-white text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-[#e9c349]" />
                {fullName}
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">Número de Telefone / Contato</span>
              <p className="text-white text-sm font-bold flex items-center gap-2 font-mono">
                <Phone className="w-4 h-4 text-[#e9c349]" />
                {fullPhone}
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">ID Numérico de Matrícula</span>
              <p className="font-mono text-[#e9c349] text-base font-extrabold flex items-center gap-2">
                <Hash className="w-4 h-4" />
                #{numericId}
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">E-mail de Acesso (Login)</span>
              <p className="font-mono text-white text-sm font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#e9c349]" />
                {profile?.email || auth.currentUser?.email || 'N/A'}
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">Status da Matrícula / Acesso</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30 gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Acesso Ativo (Liberado)
                </span>
              </div>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">Tipo de Conta</span>
              <p className="text-white text-sm font-bold capitalize mt-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#e9c349]" />
                {profile?.role === 'admin' ? 'Administrador / Produtor' : 'Estudante Verificado'}
              </p>
            </div>
          </div>

          {/* Botão de Recuperação / Redefinição de Senha */}
          <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#e9c349]" />
                Segurança & Senha da Conta
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">Precisa atualizar sua senha? Enviaremos um link de redefinição para seu e-mail.</p>
            </div>

            <div className="w-full sm:w-auto">
              {resetSent ? (
                <div className="bg-green-500/15 border border-green-500/30 text-green-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  E-mail de recuperação enviado com sucesso!
                </div>
              ) : (
                <button
                  onClick={handlePasswordReset}
                  disabled={sendingReset}
                  className="w-full sm:w-auto bg-[#e9c349] hover:bg-[#d4b03f] text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {sendingReset ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Recuperar / Alterar Senha</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {resetError && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}
        </div>

        {/* Estatísticas de Aprendizado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#131313] border border-gray-800 rounded-2xl p-6 text-center">
            <BookOpen className="w-8 h-8 text-[#e9c349] mx-auto mb-2 opacity-80" />
            <span className="text-3xl font-extrabold text-white font-mono">{enrolledCount}</span>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Cursos Adquiridos</p>
          </div>

          <div className="bg-[#131313] border border-gray-800 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2 opacity-80" />
            <span className="text-3xl font-extrabold text-white font-mono">{completedCount}</span>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Aulas Concluídas</p>
          </div>

          <div className="bg-[#131313] border border-gray-800 rounded-2xl p-6 text-center">
            <User className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-80" />
            <span className="text-3xl font-extrabold text-white font-mono">100%</span>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Segurança SSL</p>
          </div>
        </div>

        {/* Suporte e Ajuda */}
        <div className="bg-[#131313] border border-gray-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Precisa de Ajuda ou Suporte Técnico?</h4>
              <p className="text-xs text-gray-400 mt-0.5">Entre em contato com nossa equipe acadêmica para assistência imediata.</p>
            </div>
          </div>
          <a
            href="https://wa.me/244900000000"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-black font-bold px-5 py-3 rounded-xl text-xs hover:bg-[#20ba5a] transition-all flex items-center gap-2 cursor-pointer shadow-md shrink-0"
          >
            Falar com Suporte WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
