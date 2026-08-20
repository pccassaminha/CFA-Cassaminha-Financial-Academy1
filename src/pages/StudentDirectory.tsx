import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Sidebar from '../components/Sidebar';

export default function StudentDirectory() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), { subscriptionStatus: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, subscriptionStatus: newStatus } : u));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviteModalOpen(false);
    showNotification(`Convite enviado para ${inviteEmail}`);
    setInviteEmail('');
  };

  const filteredUsers = users.filter(u => {
    return u.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeUsersCount = users.filter(u => u.subscriptionStatus === 'active').length;
  const inactiveUsersCount = users.filter(u => u.subscriptionStatus === 'inactive').length;

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-body min-h-screen flex overflow-hidden">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[9999] bg-[#353534] border border-[#e9c349]/30 text-[#e5e2e1] px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-[#e9c349]">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <Sidebar />
      <main className="flex-1 flex flex-col h-screen ml-72">
        {/* Topbar */}
        <header className="h-20 border-b border-[#353534]/30 flex items-center justify-between px-8 bg-[#131313]">
          <h2 className="font-bold text-lg">Controle de Alunos</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</span>
              <input 
                type="text" 
                placeholder="Buscar aluno..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0e0e0e] border border-[#353534]/50 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#e9c349]/50 transition-colors w-64" 
              />
            </div>
            <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#e9c349] text-[#131313] rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-sm">person_add</span> Adicionar
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0e0e0e] border border-[#353534]/30 rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Total de Alunos</p>
              <h3 className="text-3xl font-bold text-[#e9c349]">{users.length}</h3>
            </div>
            <div className="bg-[#0e0e0e] border border-[#353534]/30 rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Assinaturas Ativas</p>
              <h3 className="text-3xl font-bold text-green-400">{activeUsersCount}</h3>
            </div>
            <div className="bg-[#0e0e0e] border border-[#353534]/30 rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Inadimplentes</p>
              <h3 className="text-3xl font-bold text-red-400">{inactiveUsersCount}</h3>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0e0e0e] border border-[#353534]/30 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#131313] border-b border-[#353534]/30">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Plano</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#353534]/30">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando alunos...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum aluno encontrado.</td>
                  </tr>
                ) : (
                  filteredUsers.map((student) => {
                    const cleanEmail = (student.email || '').trim().toLowerCase();
                    const isMaster = cleanEmail === 'grupocassaminha@gmail.com' || cleanEmail === 'exportacoes.extras@gmail.com';
                    const isAdmin = isMaster || student.role === 'admin' || student.role === 'producer';
                    const isActive = isMaster || student.subscriptionStatus === 'active';
                    
                    const fullName = student.firstName && student.lastName 
                      ? `${student.firstName} ${student.lastName}` 
                      : (student.email ? student.email.split('@')[0] : 'Usuário');
                    const initials = (student.firstName ? student.firstName[0] : (student.email ? student.email[0] : 'U')).toUpperCase();
                    const roleLabel = isMaster ? 'Master Admin' : (student.role === 'admin' ? 'Administrador' : student.role === 'producer' ? 'Produtor' : 'Aluno');
                    const plan = isAdmin ? 'Acesso Total (Admin)' : (student.plan || 'Membro VIP');
                    
                    return (
                      <tr key={student.id} className="hover:bg-[#353534]/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isMaster ? 'bg-[#e9c349] text-[#131313]' : 'bg-[#353534] text-[#e5e2e1]'}`}>
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{fullName}</span>
                                {isMaster && (
                                  <span className="px-1.5 py-0.5 bg-[#e9c349]/20 text-[#e9c349] border border-[#e9c349]/40 text-[10px] font-bold rounded uppercase tracking-wider">
                                    Master
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">{roleLabel}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs">{student.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={isAdmin ? 'text-[#e9c349] font-semibold text-xs' : 'text-gray-300 text-xs'}>
                            {plan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isMaster ? (
                            <span className="px-2 py-1 bg-[#e9c349]/10 text-[#e9c349] text-xs font-bold rounded border border-[#e9c349]/30">
                              Permanente
                            </span>
                          ) : (
                            <button onClick={() => toggleStatus(student.id, student.subscriptionStatus)}>
                              {isActive ? (
                                <span className="px-2 py-1 bg-green-400/10 text-green-400 text-xs font-bold rounded border border-green-400/20 hover:bg-green-400/20 cursor-pointer">Ativo</span>
                              ) : (
                                <span className="px-2 py-1 bg-red-400/10 text-red-400 text-xs font-bold rounded border border-red-400/20 hover:bg-red-400/20 cursor-pointer">Inativo</span>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => showNotification(`Detalhes de ${fullName}: ${student.email}`)}
                            className="text-gray-500 hover:text-[#e9c349] transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-sm">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-[#353534]/50 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-[#e5e2e1] mb-2">Convidar Aluno</h2>
            <p className="text-gray-400 text-sm mb-6">Envie um convite para um novo aluno acessar a plataforma.</p>
            <form onSubmit={handleInvite}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">E-mail do Aluno</label>
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-[#0e0e0e] border border-[#353534]/50 rounded-lg px-4 py-3 text-[#e5e2e1] focus:ring-1 focus:ring-[#e9c349] outline-none transition-all"
                  placeholder="aluno@exemplo.com"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm text-gray-400 hover:bg-[#353534]/30 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-[#e9c349] text-[#131313] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
