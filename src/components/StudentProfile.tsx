import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, CheckCircle2, Key, Phone, BookOpen, Lock, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function StudentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white font-headline">Meus Dados de Acesso & Conta</h1>
        <p className="text-gray-400 text-sm mt-1">Visualize suas credenciais de acesso, status de assinatura e informações da conta.</p>
      </div>

      <div className="space-y-6">
        {/* Cartão de Credenciais de Acesso */}
        <div className="bg-[#131313] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-gray-800 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#e9c349]/15 text-[#e9c349] flex items-center justify-center font-bold">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Credenciais de Acesso à Plataforma</h3>
              <p className="text-xs text-gray-400">Informações de login e identificação do estudante</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">E-mail de Acesso (Login)</span>
              <p className="font-mono text-white text-sm font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#e9c349]" />
                {profile?.email || auth.currentUser?.email || 'N/A'}
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[11px] text-gray-500 uppercase font-mono block mb-1">ID Único do Aluno (UID)</span>
              <p className="font-mono text-gray-300 text-xs break-all select-all pt-1">
                {profile?.uid || auth.currentUser?.uid || 'N/A'}
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
