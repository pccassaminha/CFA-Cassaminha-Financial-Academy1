import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, adminCreateStudentAccount, auth } from '../firebase';
import Sidebar from '../components/Sidebar';
import { 
  UserPlus, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Key, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Layers, 
  Clock, 
  Phone, 
  Mail, 
  User,
  AlertCircle
} from 'lucide-react';

interface CourseOption {
  id: string;
  title: string;
  price?: number;
}

export default function StudentDirectory() {
  const [users, setUsers] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'students' | 'active_students' | 'registered_only' | 'producers' | 'pending'>('all');
  
  // Modal de Cadastro de Aluno
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneCountryCode: '+244',
    phoneNumber: '',
    selectedCourses: [] as string[],
    plan: 'Acesso Padrão CFA'
  });

  // Modal de Gerenciamento de Cursos de um Aluno
  const [selectedStudentForCourses, setSelectedStudentForCourses] = useState<any | null>(null);
  const [studentEnrolledCourses, setStudentEnrolledCourses] = useState<string[]>([]);
  const [isUpdatingCourses, setIsUpdatingCourses] = useState(false);

  // Toast Feedback
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Carregar Cursos Reais do Banco em Tempo Real
  useEffect(() => {
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const list: CourseOption[] = [];
      snap.forEach(d => {
        list.push({
          id: d.id,
          title: d.data().title || 'Curso Sem Título',
          price: d.data().price
        });
      });
      setAvailableCourses(list);
    }, (err) => {
      console.warn("Erro ao buscar cursos do banco:", err);
    });

    return () => unsubCourses();
  }, []);

  // Escutar Usuários em Tempo Real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(list);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar usuários:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Gerar senha aleatória segura para o aluno
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = 'Cfa@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
  };

  // Cadastrar Novo Aluno pelo Painel do Admin
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.firstName) {
      showNotification('Preencha os campos obrigatórios (Nome, E-mail e Senha).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminCreateStudentAccount(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneCountryCode: formData.phoneCountryCode,
        phoneNumber: formData.phoneNumber,
        enrolledCourses: formData.selectedCourses,
        plan: formData.plan
      });

      showNotification(`Aluno ${formData.firstName} cadastrado e cursos liberados com sucesso!`, 'success');
      setIsRegisterModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneCountryCode: '+244',
        phoneNumber: '',
        selectedCourses: [] as string[],
        plan: 'Acesso Padrão CFA'
      });
    } catch (error: any) {
      console.error("Erro ao cadastrar aluno:", error);
      const msg = error.code === 'auth/email-already-in-use' 
        ? 'Este e-mail já está cadastrado no sistema.' 
        : (error.message || 'Erro ao criar conta de aluno.');
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aprovar Produtor / Administrador Pendente
  const handleApproveProducer = async (userId: string, userEmail: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'producer',
        roleType: 'producer',
        subscriptionStatus: 'active',
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: auth.currentUser?.email || 'admin'
      });
      showNotification(`Produtor ${userEmail} aprovado com sucesso! Acesso liberado ao painel.`, 'success');
    } catch (error) {
      console.error("Erro ao aprovar produtor:", error);
      showNotification('Erro ao aprovar produtor.', 'error');
    }
  };

  // Rejeitar ou transformar em Aluno Comum
  const handleMakeStudent = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'student',
        roleType: 'student',
        subscriptionStatus: 'inactive',
        isApproved: true,
        enrolledCourses: []
      });
      showNotification(`Perfil alterado para Aluno.`, 'success');
    } catch (error) {
      console.error("Erro ao alterar papel:", error);
      showNotification('Erro ao atualizar usuário.', 'error');
    }
  };

  // Alternar Status Ativo / Inativo
  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), { subscriptionStatus: newStatus });
      showNotification(`Status alterado para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      showNotification('Erro ao atualizar status.', 'error');
    }
  };

  // Abrir Modal de Gerenciar Cursos do Aluno
  const handleOpenCourseManager = (student: any) => {
    setSelectedStudentForCourses(student);
    setStudentEnrolledCourses(Array.isArray(student.enrolledCourses) ? [...student.enrolledCourses] : []);
  };

  // Salvar Cursos do Aluno
  const handleSaveStudentCourses = async () => {
    if (!selectedStudentForCourses) return;
    setIsUpdatingCourses(true);
    try {
      const hasEnrolled = studentEnrolledCourses.length > 0;
      await updateDoc(doc(db, 'users', selectedStudentForCourses.id), {
        enrolledCourses: studentEnrolledCourses,
        subscriptionStatus: hasEnrolled ? 'active' : 'inactive'
      });
      showNotification(`Cursos atualizados com sucesso para ${selectedStudentForCourses.email}!`, 'success');
      setSelectedStudentForCourses(null);
    } catch (error) {
      console.error("Erro ao salvar cursos do aluno:", error);
      showNotification('Erro ao salvar cursos.', 'error');
    } finally {
      setIsUpdatingCourses(false);
    }
  };

  // Toggle de seleção de curso no formulário de cadastro
  const toggleCourseSelection = (courseId: string) => {
    setFormData(prev => {
      const exists = prev.selectedCourses.includes(courseId);
      return {
        ...prev,
        selectedCourses: exists
          ? prev.selectedCourses.filter(id => id !== courseId)
          : [...prev.selectedCourses, courseId]
      };
    });
  };

  // Toggle de seleção de curso no modal de edição
  const toggleStudentCourse = (courseId: string) => {
    setStudentEnrolledCourses(prev => {
      return prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId];
    });
  };

  // Helpers
  const isMasterEmail = (email?: string | null) => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return clean === 'grupocassaminha@gmail.com' || clean === 'exportacoes.extras@gmail.com';
  };

  const pendingApprovals = users.filter(u => {
    const isMaster = isMasterEmail(u.email);
    if (isMaster) return false;
    const isPendingStatus = u.subscriptionStatus === 'pending_approval' || ( (u.role === 'producer' || u.role === 'admin' || u.roleType === 'producer') && u.isApproved === false );
    return isPendingStatus;
  });

  const filteredUsers = users.filter(u => {
    const cleanEmail = (u.email || '').toLowerCase();
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const matchesSearch = cleanEmail.includes(searchTerm.toLowerCase()) || fullName.includes(searchTerm.toLowerCase()) || (u.phoneNumber || '').includes(searchTerm);

    if (!matchesSearch) return false;

    const isMaster = isMasterEmail(u.email);
    const isProducer = u.role === 'producer' || u.role === 'admin' || u.roleType === 'producer' || isMaster;
    const isStudent = !isProducer;
    const hasEnrolled = Array.isArray(u.enrolledCourses) && u.enrolledCourses.length > 0;

    if (roleFilter === 'pending') {
      return pendingApprovals.some(p => p.id === u.id);
    }
    if (roleFilter === 'students') {
      return isStudent;
    }
    if (roleFilter === 'active_students') {
      return isStudent && hasEnrolled && u.subscriptionStatus === 'active';
    }
    if (roleFilter === 'registered_only') {
      return isStudent && !hasEnrolled;
    }
    if (roleFilter === 'producers') {
      return isProducer;
    }

    return true;
  });

  // Alunos reais da plataforma (exclui Master Admin e Produtores)
  const studentUsers = users.filter(u => {
    const cleanEmail = (u.email || '').trim().toLowerCase();
    const isMaster = isMasterEmail(cleanEmail);
    const isProducer = u.role === 'producer' || u.role === 'admin' || u.roleType === 'producer';
    return !isMaster && !isProducer;
  });

  const studentsCount = studentUsers.length;

  // Assinatura Ativa: Aluno que REALMENTE possui pelo menos 1 curso matriculado
  const activeUsersCount = studentUsers.filter(u => {
    const hasEnrolled = Array.isArray(u.enrolledCourses) && u.enrolledCourses.length > 0;
    return hasEnrolled && u.subscriptionStatus === 'active';
  }).length;

  // Apenas Cadastrado: Aluno que ainda não se matriculou em nenhum curso
  const registeredOnlyCount = studentUsers.filter(u => {
    const hasEnrolled = Array.isArray(u.enrolledCourses) && u.enrolledCourses.length > 0;
    return !hasEnrolled;
  }).length;

  return (
    <div className="bg-[#0e0e0e] text-[#e5e2e1] font-body min-h-screen flex overflow-hidden">
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-[9999] border px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          toastType === 'success' 
            ? 'bg-[#181818] border-[#e9c349]/50 text-white' 
            : 'bg-red-950/90 border-red-500/50 text-red-100'
        }`}>
          <span className="material-symbols-outlined text-[#e9c349]">
            {toastType === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      <Sidebar />
      
      <main className="flex-1 flex flex-col h-screen ml-72">
        {/* Topbar */}
        <header className="h-20 border-b border-[#353534]/30 flex items-center justify-between px-8 bg-[#131313] shrink-0">
          <div>
            <div className="flex items-center gap-2 text-[#e9c349] mb-0.5">
              <span className="material-symbols-outlined text-sm">groups</span>
              <span className="text-xs font-bold uppercase tracking-widest font-mono">Gestão de Usuários</span>
            </div>
            <h2 className="font-extrabold text-xl text-white font-headline">Controle de Alunos & Cursos</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar por nome, email ou tel..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0e0e0e] border border-[#353534]/50 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#e9c349] transition-colors w-72" 
              />
            </div>

            <button 
              id="btn-open-register-student-modal"
              onClick={() => setIsRegisterModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-2 bg-[#e9c349] text-[#131313] rounded-xl font-bold text-sm hover:bg-[#d4b03f] active:scale-95 transition-all shadow-md cursor-pointer font-headline"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Aluno</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Alerta de Produtores Pendentes de Aprovação */}
          {pendingApprovals.length > 0 && (
            <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg animate-pulse">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-200 font-headline">
                    {pendingApprovals.length} Solicitação(ões) de Produtor / Administrador Aguardando Aprovação
                  </h4>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    O acesso destes cadastros está bloqueado até a verificação do Administrador Master.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setRoleFilter('pending')}
                className="px-4 py-2 bg-amber-400 text-black font-bold text-xs rounded-xl hover:bg-amber-300 transition-colors self-start md:self-auto cursor-pointer"
              >
                Ver Pendentes de Aprovação
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div 
              onClick={() => setRoleFilter('students')}
              className={`bg-[#131313] border rounded-2xl p-5 shadow-md cursor-pointer transition-all hover:border-[#e9c349]/50 ${
                roleFilter === 'students' ? 'border-[#e9c349] ring-1 ring-[#e9c349]/30' : 'border-[#353534]/30'
              }`}
            >
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Total de Alunos</p>
              <h3 className="text-2xl font-black text-[#e9c349] font-headline">{studentsCount}</h3>
            </div>
            <div 
              onClick={() => setRoleFilter('active_students')}
              className={`bg-[#131313] border rounded-2xl p-5 shadow-md cursor-pointer transition-all hover:border-emerald-400/50 ${
                roleFilter === 'active_students' ? 'border-emerald-400 ring-1 ring-emerald-400/30' : 'border-[#353534]/30'
              }`}
            >
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Assinaturas Ativas</p>
              <h3 className="text-2xl font-black text-emerald-400 font-headline">{activeUsersCount}</h3>
            </div>
            <div 
              onClick={() => setRoleFilter('registered_only')}
              className={`bg-[#131313] border rounded-2xl p-5 shadow-md cursor-pointer transition-all hover:border-amber-400/50 ${
                roleFilter === 'registered_only' ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-[#353534]/30'
              }`}
            >
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Apenas Cadastrados</p>
              <h3 className="text-2xl font-black text-amber-400 font-headline">{registeredOnlyCount}</h3>
            </div>
            <div className="bg-[#131313] border border-[#353534]/30 rounded-2xl p-5 shadow-md">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Cursos no Catálogo</p>
              <h3 className="text-2xl font-black text-blue-400 font-headline">{availableCourses.length}</h3>
            </div>
          </div>

          {/* Filtros de Lista */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 bg-[#131313] p-1.5 rounded-xl border border-gray-800">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'all' ? 'bg-[#e9c349] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter('students')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'students' ? 'bg-[#e9c349] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                Todos os Alunos ({studentsCount})
              </button>
              <button
                onClick={() => setRoleFilter('active_students')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'active_students' ? 'bg-emerald-400 text-black shadow-sm' : 'text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                Com Assinatura ({activeUsersCount})
              </button>
              <button
                onClick={() => setRoleFilter('registered_only')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'registered_only' ? 'bg-amber-400 text-black shadow-sm' : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                Apenas Cadastrados ({registeredOnlyCount})
              </button>
              <button
                onClick={() => setRoleFilter('producers')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'producers' ? 'bg-[#e9c349] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                Produtores & Admins
              </button>
              {pendingApprovals.length > 0 && (
                <button
                  onClick={() => setRoleFilter('pending')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    roleFilter === 'pending' ? 'bg-amber-400 text-black shadow-sm' : 'text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Pendentes ({pendingApprovals.length})
                </button>
              )}
            </div>

            <span className="text-xs text-gray-500 font-mono">
              Mostrando {filteredUsers.length} de {users.length} usuários
            </span>
          </div>

          {/* Tabela de Usuários */}
          <div className="bg-[#131313] border border-[#353534]/30 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0e0e0e] border-b border-[#353534]/30">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Contato</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Papel & Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Cursos Liberados</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353534]/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-[#e9c349] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Carregando registros...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Nenhum usuário encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((userItem) => {
                      const cleanEmail = (userItem.email || '').trim().toLowerCase();
                      const isMaster = isMasterEmail(cleanEmail);
                      const isProducerRole = userItem.role === 'producer' || userItem.roleType === 'producer';
                      const isPendingApproval = !isMaster && (userItem.subscriptionStatus === 'pending_approval' || (isProducerRole && userItem.isApproved === false));
                      const isActive = isMaster || userItem.subscriptionStatus === 'active';
                      
                      const fullName = userItem.firstName 
                        ? `${userItem.firstName} ${userItem.lastName || ''}` 
                        : (userItem.email ? userItem.email.split('@')[0] : 'Usuário');
                      const initials = (userItem.firstName ? userItem.firstName[0] : (userItem.email ? userItem.email[0] : 'U')).toUpperCase();
                      
                      const enrolledList: string[] = Array.isArray(userItem.enrolledCourses) ? userItem.enrolledCourses : [];

                      return (
                        <tr key={userItem.id} className="hover:bg-[#353534]/10 transition-colors">
                          {/* Nome e Avatar */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                                isMaster ? 'bg-[#e9c349] text-black shadow-md' : isProducerRole ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-200'
                              }`}>
                                {initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">{fullName}</span>
                                  {isMaster && (
                                    <span className="px-1.5 py-0.5 bg-[#e9c349]/20 text-[#e9c349] border border-[#e9c349]/40 text-[9px] font-bold rounded uppercase tracking-wider">
                                      Master Admin
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400 font-mono">{userItem.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Telefone / WhatsApp */}
                          <td className="px-6 py-4 text-xs text-gray-300">
                            {userItem.phoneNumber ? (
                              <span className="font-mono">{userItem.phoneCountryCode || '+244'} {userItem.phoneNumber}</span>
                            ) : (
                              <span className="text-gray-600 italic">Não informado</span>
                            )}
                          </td>

                          {/* Papel & Status */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {isPendingApproval ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 w-max">
                                  <Clock className="w-3 h-3" />
                                  Pendente Aprovação
                                </span>
                              ) : isMaster ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#e9c349]/10 text-[#e9c349] border border-[#e9c349]/30 w-max">
                                  <ShieldCheck className="w-3 h-3" />
                                  Acesso Permanente
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isProducerRole ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  }`}>
                                    {isProducerRole ? 'Produtor' : 'Aluno'}
                                  </span>
                                  {isProducerRole ? (
                                    <button 
                                      onClick={() => toggleStatus(userItem.id, userItem.subscriptionStatus)}
                                      className="cursor-pointer"
                                      title="Alternar Ativo/Inativo"
                                    >
                                      {isActive ? (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 hover:bg-emerald-500/20">
                                          Ativo
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded border border-red-500/30 hover:bg-red-500/20">
                                          Inativo
                                        </span>
                                      )}
                                    </button>
                                  ) : enrolledList.length > 0 ? (
                                    <button 
                                      onClick={() => toggleStatus(userItem.id, userItem.subscriptionStatus)}
                                      className="cursor-pointer"
                                      title="Alternar Assinatura Ativa/Inativa"
                                    >
                                      {isActive ? (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 hover:bg-emerald-500/20">
                                          Assinatura Ativa
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded border border-red-500/30 hover:bg-red-500/20">
                                          Inativo
                                        </span>
                                      )}
                                    </button>
                                  ) : (
                                    <span 
                                      className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded border border-amber-500/30"
                                      title="Aluno cadastrado sem cursos ativos"
                                    >
                                      Cadastrado (Sem Curso)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Cursos Liberados */}
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                              {isMaster ? (
                                <span className="text-xs font-semibold text-[#e9c349]">Acesso Total aos Cursos</span>
                              ) : (
                                <>
                                  {enrolledList.length === 0 ? (
                                    <span className="text-[11px] text-gray-500 italic mr-1">Nenhum curso matriculado</span>
                                  ) : (
                                    enrolledList.map(cId => {
                                      const courseInfo = availableCourses.find(c => c.id === cId);
                                      return (
                                        <span 
                                          key={cId}
                                          className="px-2 py-0.5 bg-[#0e0e0e] border border-gray-800 text-gray-300 text-[10px] font-medium rounded-md truncate max-w-[140px]"
                                          title={courseInfo?.title || cId}
                                        >
                                          {courseInfo?.title || cId}
                                        </span>
                                      );
                                    })
                                  )}
                                  <button
                                    onClick={() => handleOpenCourseManager(userItem)}
                                    className="px-2 py-0.5 bg-[#e9c349]/10 hover:bg-[#e9c349]/20 text-[#e9c349] border border-[#e9c349]/30 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                                    title="Adicionar ou remover cursos deste aluno"
                                  >
                                    {enrolledList.length === 0 ? '+ Matricular' : '+ Editar'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Ações */}
                          <td className="px-6 py-4 text-right">
                            {isPendingApproval ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveProducer(userItem.id, userItem.email)}
                                  className="px-3 py-1.5 bg-[#e9c349] hover:bg-[#d4b03f] text-black font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Aprovar Produtor
                                </button>
                                <button
                                  onClick={() => handleMakeStudent(userItem.id)}
                                  className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                                  title="Liberar apenas como aluno"
                                >
                                  Tornar Aluno
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenCourseManager(userItem)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-[#e9c349] hover:text-black text-gray-300 rounded-xl text-xs font-semibold border border-white/5 hover:border-[#e9c349] transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Gerenciar Cursos</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: CADASTRAR NOVO ALUNO COM EMAIL, SENHA E CURSOS */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-[#353534]/50 rounded-2xl p-6 md:p-8 w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-headline">Cadastrar Novo Aluno</h3>
                  <p className="text-xs text-gray-400">Defina os dados de acesso e libere os cursos desejados</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-gray-500 hover:text-white p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="space-y-4">
              {/* Nome e Sobrenome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Primeiro Nome <span className="text-[#e9c349]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Ex: João"
                    className="w-full bg-[#0e0e0e] border border-[#353534] rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-1 focus:ring-[#e9c349] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Ex: Silva"
                    className="w-full bg-[#0e0e0e] border border-[#353534] rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-1 focus:ring-[#e9c349] outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  E-mail de Login do Aluno <span className="text-[#e9c349]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="aluno@exemplo.com"
                    className="w-full bg-[#0e0e0e] border border-[#353534] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-[#e9c349] outline-none font-mono"
                  />
                </div>
              </div>

              {/* Senha com gerador */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Senha de Acesso <span className="text-[#e9c349]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-xs text-[#e9c349] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Gerar Senha Automática
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full bg-[#0e0e0e] border border-[#353534] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:ring-1 focus:ring-[#e9c349] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Telefone / WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.phoneCountryCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneCountryCode: e.target.value }))}
                    className="w-20 bg-[#0e0e0e] border border-[#353534] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-[#e9c349] outline-none font-mono text-center"
                    placeholder="+244"
                  />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="923 456 789"
                    className="flex-1 bg-[#0e0e0e] border border-[#353534] rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-1 focus:ring-[#e9c349] outline-none font-mono"
                  />
                </div>
              </div>

              {/* Seleção de Cursos a Liberar */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Cursos a Liberar Imediatamente para o Aluno
                </label>
                <div className="space-y-2 bg-[#0e0e0e] p-3.5 rounded-xl border border-gray-800">
                  {availableCourses.map(course => {
                    const isSelected = formData.selectedCourses.includes(course.id);
                    return (
                      <label 
                        key={course.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected ? 'bg-[#e9c349]/10 border-[#e9c349]/40 text-white' : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCourseSelection(course.id)}
                          className="w-4 h-4 rounded text-[#e9c349] focus:ring-[#e9c349] cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-bold">{course.title}</p>
                          <span className="text-[10px] text-gray-500 font-mono">ID: {course.id}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#e9c349] text-black hover:bg-[#d4b03f] active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Cadastrar Aluno & Liberar Cursos</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GERENCIAR CURSOS DE UM ALUNO ESPECÍFICO */}
      {selectedStudentForCourses && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-[#353534]/50 rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e9c349]/10 text-[#e9c349] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-headline">Gerenciar Cursos do Aluno</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedStudentForCourses.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForCourses(null)}
                className="text-gray-500 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Marque os cursos que devem estar destrancados para este aluno na área de estudos:
            </p>

            <div className="space-y-2 mb-6 bg-[#0e0e0e] p-3.5 rounded-xl border border-gray-800 max-h-60 overflow-y-auto">
              {availableCourses.map(course => {
                const isSelected = studentEnrolledCourses.includes(course.id);
                return (
                  <label 
                    key={course.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected ? 'bg-[#e9c349]/10 border-[#e9c349]/40 text-white' : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStudentCourse(course.id)}
                      className="w-4 h-4 rounded text-[#e9c349] focus:ring-[#e9c349] cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-bold">{course.title}</p>
                      <span className="text-[10px] text-gray-500 font-mono">ID: {course.id}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedStudentForCourses(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isUpdatingCourses}
                onClick={handleSaveStudentCourses}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#e9c349] text-black hover:bg-[#d4b03f] active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isUpdatingCourses ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Salvar e Liberar Acesso</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
