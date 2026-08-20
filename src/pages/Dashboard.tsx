import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { collection, onSnapshot, updateDoc, doc, arrayUnion, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';

export default function Dashboard() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Firestore Real-time States
  const [students, setStudents] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    setToastMessage('Relatório exportado com sucesso!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAction = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Listen to Users in real-time
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Dashboard failed to subscribe to users:", err);
      setLoading(false);
    });

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
      const txList: Transaction[] = [];
      snap.forEach((docSnap) => {
        txList.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
      });
      // sort latest first
      txList.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setTransactions(txList);
    }, (err) => {
      console.error("Dashboard failed to subscribe to transactions:", err);
    });

    return () => {
      unsubUsers();
      unsubTransactions();
    };
  }, []);

  const handleApproveTransaction = async (tx: Transaction) => {
    try {
      const batch = writeBatch(db);

      // 1. Muda o status da transação para aprovado
      const transactionRef = doc(db, 'transactions', tx.id);
      batch.update(transactionRef, { status: 'approved' });

      // 2. Destranca o curso inserindo o ID na lista do aluno
      const courseIdToEnroll = tx.courseId || 'cfa-financial-master';
      if (tx.userId && !tx.userId.startsWith('guest_')) {
        const userRef = doc(db, 'users', tx.userId);
        batch.update(userRef, { 
          enrolledCourses: arrayUnion(courseIdToEnroll),
          subscriptionStatus: 'active'
        });
      }

      // Executa as duas ações simultaneamente
      await batch.commit();
      handleAction(`Pagamento da transação ${tx.referenceNumber} aprovado e curso liberado com sucesso!`);
    } catch (err) {
      console.error("Erro ao aprovar:", err);
      handleAction('Erro ao processar aprovação.');
    }
  };

  const handleRejectTransaction = async (tx: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'rejected' });
      handleAction(`Transação ${tx.referenceNumber} marcada como recusada.`);
    } catch (err) {
      console.error("Error rejecting transaction:", err);
      handleAction('Erro ao atualizar status.');
    }
  };

  // Compute stats
  const totalStudents = students.filter(s => s.role === 'student').length;
  const activeStudents = students.filter(s => s.role === 'student' && s.subscriptionStatus === 'active').length;
  
  // Total completions across all users
  const totalCompletions = students.reduce((sum, s) => {
    const completed = s.completedLessons || [];
    return sum + completed.length;
  }, 0);

  // Financial metric (simulate 150000 Kz subscription fee for active users)
  const simulatedMonthlyRevenue = activeStudents * 150000;
  const revenueFormatted = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(simulatedMonthlyRevenue);

  return (
    <div className="flex h-screen bg-background text-on-surface font-body overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[9999] bg-surface-container-high border border-primary/30 text-on-surface px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <Sidebar />
      
      <main className="flex-1 overflow-y-auto relative ml-72">
        <div className="fixed inset-0 pointer-events-none z-[99] opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
        
        <div className="p-8 lg:p-12 max-w-7xl mx-auto relative z-10">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-secondary mb-2">
                <span className="material-symbols-outlined text-sm">monitoring</span>
                <span className="text-xs font-bold uppercase tracking-widest font-label">Visão Geral</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter font-headline">Dashboard Premium</h1>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => handleAction('Filtro de data aplicado: Todo o Período')}
                className="bg-surface-container-high border border-outline-variant/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                Todo o Período
              </button>
              <button 
                onClick={handleExport}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_15px_rgba(233,195,73,0.2)]"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Exportar Relatório
              </button>
            </div>
          </header>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <span className="material-symbols-outlined text-4xl text-primary">account_balance_wallet</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Faturamento Mensal Estimado</p>
              <h3 className="text-3xl font-black font-headline text-on-surface mb-2">{revenueFormatted}</h3>
              <div className="flex items-center gap-1 text-secondary text-xs font-medium">
                <span className="material-symbols-outlined text-sm">payments</span>
                <span>Baseado em assinaturas ativas</span>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <span className="material-symbols-outlined text-4xl text-primary">group</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Alunos Registados</p>
              <h3 className="text-3xl font-black font-headline text-on-surface mb-2">{totalStudents}</h3>
              <div className="flex items-center gap-1 text-secondary text-xs font-medium">
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span>{activeStudents} alunos com acesso ativo</span>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <span className="material-symbols-outlined text-4xl text-error">cancel</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Taxa de Adesão</p>
              <h3 className="text-3xl font-black font-headline text-on-surface mb-2">
                {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}%
              </h3>
              <div className="flex items-center gap-1 text-secondary text-xs font-medium">
                <span className="material-symbols-outlined text-sm">done_all</span>
                <span>Percentual de alunos ativos</span>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <span className="material-symbols-outlined text-4xl text-primary">play_circle</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Aulas Concluídas</p>
              <h3 className="text-3xl font-black font-headline text-on-surface mb-2">{totalCompletions}</h3>
              <div className="flex items-center gap-1 text-secondary text-xs font-medium">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>Total de checklists validados</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions & Payment References */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-8 mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <span className="material-symbols-outlined text-base">receipt_long</span>
                  <span className="text-xs font-bold uppercase tracking-widest font-label">Validação de Pagamentos</span>
                </div>
                <h3 className="text-xl font-extrabold font-headline text-on-surface">Transações & Referências de Pagamento</h3>
              </div>
              <span className="text-xs px-3 py-1 bg-surface-container-highest rounded-full text-stone-400 font-mono">
                {transactions.length} Registros
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-outline-variant/20 rounded-xl bg-surface-container-lowest/30">
                <span className="material-symbols-outlined text-4xl text-stone-600 mb-2">inbox</span>
                <p className="text-sm text-stone-400">Nenhuma transação pendente no momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-stone-500 font-label border-b border-outline-variant/10">
                    <tr>
                      <th className="pb-3 px-3">Referência</th>
                      <th className="pb-3 px-3">Aluno</th>
                      <th className="pb-3 px-3">Curso</th>
                      <th className="pb-3 px-3">Data</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5 font-body">
                    {transactions.slice(0, 10).map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface-container-highest/30 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-primary">{tx.referenceNumber || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-on-surface">{tx.userName || 'Aluno'}</p>
                          <p className="text-[11px] text-stone-500">{tx.userEmail || ''}</p>
                        </td>
                        <td className="py-3 px-3 text-stone-300">{tx.courseTitle || 'CFA Master'}</td>
                        <td className="py-3 px-3 text-stone-400 text-xs">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('pt-AO') : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            tx.status === 'approved' 
                              ? 'bg-secondary/15 text-secondary border border-secondary/30'
                              : tx.status === 'rejected'
                              ? 'bg-error/15 text-error border border-error/30'
                              : 'bg-primary/15 text-primary border border-primary/30 animate-pulse'
                          }`}>
                            {tx.status === 'approved' ? 'Aprovado' : tx.status === 'rejected' ? 'Recusado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {tx.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveTransaction(tx)}
                                className="px-3 py-1 bg-secondary text-surface font-bold text-xs rounded-lg hover:brightness-110 transition-all flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">check</span>
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleRejectTransaction(tx)}
                                className="px-2 py-1 bg-error/20 text-error hover:bg-error/30 font-bold text-xs rounded-lg transition-all"
                              >
                                Recusar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-500 italic">Processado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area (Placeholder) */}
            <div className="lg:col-span-2 bg-surface-container p-8 rounded-2xl border border-outline-variant/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold font-headline text-lg">Crescimento de Receita</h3>
                <button onClick={() => handleAction('Opções do gráfico abertas')} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
              </div>
              <div className="h-64 w-full bg-surface-container-highest/50 rounded-xl border border-outline-variant/5 flex items-center justify-center relative overflow-hidden">
                {/* Mock Chart Lines */}
                <div className="absolute bottom-0 left-0 w-full h-full flex items-end px-4 pb-4 gap-2 opacity-50">
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[30%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[45%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[40%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[60%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[55%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[75%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[70%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[85%]"></div>
                  <div className="w-1/12 bg-primary/40 rounded-t-sm h-[80%]"></div>
                  <div className="w-1/12 bg-primary/60 rounded-t-sm h-[95%] relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-high px-2 py-1 rounded text-[10px] font-bold border border-outline-variant/20">Atual</div>
                  </div>
                </div>
                <span className="text-on-surface-variant font-label text-sm relative z-10">Gráfico de Receita de Assinaturas (Kz)</span>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-surface-container p-8 rounded-2xl border border-outline-variant/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold font-headline text-lg">Atividade Recente da Academia</h3>
              </div>
              <div className="space-y-6">
                {[
                  { icon: 'person_add', text: 'Novo aluno matriculado: João Silva', time: 'Há 5 min', color: 'text-secondary' },
                  { icon: 'payments', text: 'Pagamento recebido por IBAN', time: 'Há 12 min', color: 'text-primary' },
                  { icon: 'play_lesson', text: 'Mestre atualizou plano de aulas', time: 'Há 5 horas', color: 'text-on-surface' },
                  { icon: 'forum', text: 'Nova dúvida respondida no fórum', time: 'Há 1 dia', color: 'text-on-surface-variant' },
                ].map((activity, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                      <span className="material-symbols-outlined text-[16px]">{activity.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{activity.text}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => handleAction('Carregando logs adicionais da academia...')}
                className="w-full mt-8 py-3 rounded-xl border border-outline-variant/20 text-sm font-bold hover:bg-surface-container-highest transition-colors"
              >
                Ver Logs Recorrentes
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
