import React, { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Trash2, 
  Plus, 
  Globe, 
  Lock, 
  Video, 
  Youtube, 
  ArrowLeft, 
  Save, 
  Edit3, 
  BookOpen, 
  Clock, 
  Link as LinkIcon,
  CheckCircle2
} from 'lucide-react';
import LessonModal from './LessonModal';

interface Lesson {
  id: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  duration: string;
  order?: number;
  videoSource?: 'youtube' | 'wistia';
  videoData?: string;
  videoUrl?: string;
  materials?: string;
}

interface Module {
  id: string;
  courseId?: string;
  title: string;
  status?: 'published' | 'draft';
  lessons: Lesson[];
}

interface CourseEditorProps {
  courseId: string;
  onBack: () => void;
}

export default function CourseEditor({ courseId, onBack }: CourseEditorProps) {
  // Estados do Curso
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado do Auto-save
  const [saveStatus, setSaveStatus] = useState<'Salvo' | 'Salvando...' | 'Erro'>('Salvo');
  
  // Modal de Aula
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // 1. Carregar dados do curso e módulos do Firebase
  useEffect(() => {
    let isMounted = true;

    const fetchCourseData = async () => {
      setIsLoading(true);
      try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseDocRef);
        
        if (courseSnap.exists()) {
          const data = courseSnap.data();
          if (isMounted) {
            setTitle(data.title || '');
            setDescription(data.description || '');
            setPrice(data.price || 0);
            setIsPublished(data.isPublished ?? (data.status === 'published'));
            if (data.modules && Array.isArray(data.modules)) {
              setModules(data.modules);
            }
          }
        } else {
          // Preenchimento com dados padrão estruturados de acordo com o ID
          let defaultTitle = 'Novo Curso Sem Título';
          let defaultDesc = 'Descrição do curso e programa de aprendizado.';
          let defaultPrice = 50000;
          let defaultModules: Module[] = [];

          if (courseId === 'c1') {
            defaultTitle = 'Formação de Traders Profissionais';
            defaultDesc = 'Domine a leitura de fluxo institucional, Smart Money Concepts, e gestão de risco matemática para mercados globais.';
            defaultPrice = 50000;
            defaultModules = [
              {
                id: 'm1',
                title: 'Módulo 1: Fundamentos da Soberania',
                status: 'published',
                lessons: [
                  {
                    id: 'l1',
                    moduleId: 'm1',
                    courseId: 'c1',
                    title: '1.1 A Mentalidade do Operador Institucional',
                    duration: '45:20',
                    videoSource: 'youtube',
                    videoData: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    materials: 'https://drive.google.com/exemplo'
                  },
                  {
                    id: 'l2',
                    moduleId: 'm1',
                    courseId: 'c1',
                    title: '1.2 Estrutura do Mercado Cambial e Bancário',
                    duration: '38:15',
                    videoSource: 'wistia',
                    videoData: 'abc123wistiaid',
                    videoUrl: 'abc123wistiaid'
                  }
                ]
              },
              {
                id: 'm2',
                title: 'Módulo 2: Leitura de Fluxo & SMC Avançado',
                status: 'published',
                lessons: [
                  {
                    id: 'l3',
                    moduleId: 'm2',
                    courseId: 'c1',
                    title: '2.1 Liquidez Institucional e Order Blocks',
                    duration: '52:10',
                    videoSource: 'wistia',
                    videoData: 'smc456wistia'
                  }
                ]
              }
            ];
          } else if (courseId === 'c2') {
            defaultTitle = 'Fundamentos da Soberania Financeira';
            defaultDesc = 'Princípios essenciais de alocação de ativos em moeda forte, reservas patrimoniais e descorrelação cambial.';
            defaultPrice = 35000;
            defaultModules = [
              {
                id: 'm_sob_1',
                title: 'Módulo 1: Mentalidade & Gestão Patrimonial',
                status: 'published',
                lessons: []
              }
            ];
          } else if (courseId === 'c3') {
            defaultTitle = 'Mercado de Criptoativos e Finanças Descentralizadas';
            defaultDesc = 'Entenda a tecnologia blockchain, custódia própria segura e estratégias de DeFi para proteção patrimonial.';
            defaultPrice = 45000;
            defaultModules = [
              {
                id: 'm_crip_1',
                title: 'Módulo 1: Introdução a Blockchain e Bitcoin',
                status: 'published',
                lessons: []
              }
            ];
          }

          if (isMounted) {
            setTitle(defaultTitle);
            setDescription(defaultDesc);
            setPrice(defaultPrice);
            setIsPublished(true);
            setModules(defaultModules);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar curso:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCourseData();
    return () => { isMounted = false; };
  }, [courseId]);

  // 2. Sistema de Auto-Save Inteligente (Dispara quando você altera os campos)
  useEffect(() => {
    if (!title || isLoading) return;

    setSaveStatus('Salvando...');
    const handler = setTimeout(async () => {
      try {
        const courseRef = doc(db, 'courses', courseId);
        await setDoc(courseRef, {
          title,
          description,
          price: Number(price),
          isPublished,
          status: isPublished ? 'published' : 'draft',
          modules,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Sincronizar também no documento global de settings caso exista
        try {
          const settingsRef = doc(db, 'settings', 'course_structure');
          await setDoc(settingsRef, {
            id: courseId,
            title,
            modules,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch {
          // opcional
        }

        setSaveStatus('Salvo');
      } catch (error) {
        console.error("Erro no auto-save:", error);
        setSaveStatus('Erro');
      }
    }, 1000); // Salva 1 segundo após parar de digitar

    return () => clearTimeout(handler);
  }, [title, description, price, isPublished, modules, courseId, isLoading]);

  // 3. Alternar Publicação (Publicado / Rascunho)
  const togglePublish = async () => {
    const newStatus = !isPublished;
    setIsPublished(newStatus);
    setSaveStatus('Salvando...');
    try {
      const courseRef = doc(db, 'courses', courseId);
      await setDoc(courseRef, { 
        isPublished: newStatus,
        status: newStatus ? 'published' : 'draft',
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('Salvo');
    } catch (error) {
      console.error("Erro ao alterar publicação:", error);
      setIsPublished(!newStatus); // Reverte se der erro
      setSaveStatus('Erro');
    }
  };

  // 4. Criar Novo Módulo
  const handleAddModule = () => {
    const moduleTitle = prompt('Nome do novo módulo:');
    if (!moduleTitle || !moduleTitle.trim()) return;

    const newMod: Module = {
      id: `m_${Date.now()}`,
      courseId,
      title: moduleTitle.trim(),
      status: 'published',
      lessons: []
    };

    setModules([...modules, newMod]);
  };

  // 5. Editar Nome do Módulo
  const handleEditModule = (moduleId: string, currentTitle: string) => {
    const newTitle = prompt('Editar nome do módulo:', currentTitle);
    if (!newTitle || !newTitle.trim()) return;

    setModules(modules.map(m => m.id === moduleId ? { ...m, title: newTitle.trim() } : m));
  };

  // 6. Apagar Módulo com Confirmação de Segurança
  const handleDeleteModule = (moduleId: string) => {
    const confirmDelete = window.confirm("Tem certeza? Isso apagará o módulo e todas as aulas associadas a ele.");
    if (!confirmDelete) return;

    setModules(modules.filter(m => m.id !== moduleId));
  };

  // 7. Modal de Aulas
  const openAddLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    setIsLessonModalOpen(true);
  };

  const openEditLesson = (moduleId: string, lesson: Lesson) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(lesson);
    setIsLessonModalOpen(true);
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    if (!window.confirm('Excluir esta aula?')) return;
    setModules(modules.map(mod => {
      if (mod.id === moduleId) {
        return {
          ...mod,
          lessons: mod.lessons.filter(l => l.id !== lessonId)
        };
      }
      return mod;
    }));
  };

  const handleSaveLesson = (lessonData: {
    title: string;
    duration: string;
    videoSource: 'youtube' | 'wistia';
    videoData: string;
    materials?: string;
  }) => {
    if (!selectedModuleId) return;

    setModules(modules.map(mod => {
      if (mod.id === selectedModuleId) {
        if (editingLesson) {
          // Atualiza aula existente
          return {
            ...mod,
            lessons: mod.lessons.map(l => {
              if (l.id === editingLesson.id) {
                return {
                  ...l,
                  title: lessonData.title.trim(),
                  duration: lessonData.duration.trim(),
                  videoSource: lessonData.videoSource,
                  videoData: lessonData.videoData.trim(),
                  videoUrl: lessonData.videoData.trim(),
                  materials: (lessonData.materials || '').trim()
                };
              }
              return l;
            })
          };
        } else {
          // Adiciona nova aula
          const newLesson: Lesson = {
            id: `l_${Date.now()}`,
            moduleId: selectedModuleId,
            courseId,
            title: lessonData.title.trim(),
            duration: lessonData.duration.trim(),
            order: mod.lessons.length + 1,
            videoSource: lessonData.videoSource,
            videoData: lessonData.videoData.trim(),
            videoUrl: lessonData.videoData.trim(),
            materials: (lessonData.materials || '').trim()
          };
          return {
            ...mod,
            lessons: [...mod.lessons, newLesson]
          };
        }
      }
      return mod;
    }));
  };

  return (
    <div className="p-6 lg:p-10 text-white max-w-6xl mx-auto min-h-screen">
      {/* Barra Superior / Header de Controle */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-[#131313] border border-gray-800 rounded-xl hover:border-[#e9c349] hover:text-[#e9c349] transition-all cursor-pointer shadow-md"
            title="Voltar para Cursos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-headline">Editor de Curso</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 transition-colors ${
                saveStatus === 'Salvando...' 
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' 
                  : saveStatus === 'Erro'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {saveStatus === 'Salvando...' && <span className="animate-spin text-xs">🔄</span>}
                {saveStatus === 'Salvo' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {saveStatus === 'Salvando...' ? 'Salvando alterações...' : saveStatus === 'Erro' ? 'Erro ao salvar' : 'Salvo na nuvem'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Gerencie as informações, preço e módulos estruturados da formação.</p>
          </div>
        </div>

        {/* Botão de Publicação e Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePublish}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
              isPublished 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30'
            }`}
          >
            {isPublished ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {isPublished ? 'Curso Publicado' : 'Salvo como Rascunho (Publicar)'}
          </button>
        </div>
      </div>

      {/* Grid de Configurações Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 space-y-5 bg-[#131313] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Título do Curso</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Formação de Traders Profissionais"
              className="w-full bg-black border border-gray-700 text-white rounded-xl p-3.5 focus:border-[#e9c349] outline-none text-base font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição Completa</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que o aluno vai aprender..."
              className="w-full bg-black border border-gray-700 text-white rounded-xl p-3.5 focus:border-[#e9c349] outline-none text-sm resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Caixa de Preço e Moeda */}
        <div className="bg-[#131313] p-6 rounded-2xl border border-gray-800 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-[#e9c349] mb-4 font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">payments</span>
              Precificação
            </h3>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preço do Curso (Kz)</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="50000"
                className="w-full bg-black border border-gray-700 text-white rounded-xl p-3.5 focus:border-[#e9c349] outline-none text-2xl font-bold font-mono text-[#e9c349]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                Kz
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Valor cobrado individualmente para liberar o acesso vitalício por aluno.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-400 flex items-center gap-2">
            <span>💡</span>
            <span>As alterações de preço e dados salvam automaticamente em tempo real.</span>
          </div>
        </div>
      </div>

      {/* Seção de Módulos e Aulas */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#e9c349]" />
            Módulos e Aulas
          </h2>
          <p className="text-xs text-gray-400 mt-1">Organize os tópicos e gerencie os vídeos hospedados no YouTube ou Wistia.</p>
        </div>
        <button
          onClick={handleAddModule}
          className="bg-[#e9c349] text-black px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#d4b03f] transition-all cursor-pointer shadow-lg active:scale-95"
        >
          <Plus className="w-4 h-4" /> Novo Módulo
        </button>
      </div>

      <div className="space-y-6">
        {modules.length === 0 ? (
          <div className="text-center py-16 bg-[#131313] border border-dashed border-gray-800 rounded-2xl text-gray-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-600 opacity-60" />
            <p className="text-base font-semibold text-gray-300">Nenhum módulo criado ainda.</p>
            <p className="text-xs text-gray-500 mt-1">Clique em "Novo Módulo" acima para estruturar a grade curricular.</p>
          </div>
        ) : (
          modules.map((mod, index) => (
            <div key={mod.id} className="bg-[#131313] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
              {/* Header do Módulo */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#e9c349]/10 border border-[#e9c349]/20 flex items-center justify-center text-[#e9c349] font-bold text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <span className="text-[10px] text-[#e9c349] font-bold uppercase tracking-wider">Módulo {index + 1}</span>
                    <h3 className="text-lg font-bold text-white font-headline">{mod.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAddLesson(mod.id)}
                    className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 hover:border-[#e9c349] text-gray-300 hover:text-[#e9c349] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Aula
                  </button>
                  <button
                    onClick={() => handleEditModule(mod.id, mod.title)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                    title="Editar Título do Módulo"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteModule(mod.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Apagar Módulo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lista de Aulas do Módulo */}
              <div className="space-y-2.5 pt-1">
                {(!mod.lessons || mod.lessons.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
                    Nenhuma aula cadastrada neste módulo. Clique em "+ Adicionar Aula".
                  </div>
                ) : (
                  mod.lessons.map((lesson, lIdx) => {
                    const isWistia = lesson.videoSource === 'wistia' || (lesson.videoData || '').includes('wistia') || (!lesson.videoData?.includes('youtube') && (lesson.videoData || '').length < 25 && !lesson.videoData?.startsWith('http'));
                    
                    return (
                      <div 
                        key={lesson.id} 
                        className="bg-black/60 border border-gray-800/80 hover:border-gray-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                          <span className="text-xs font-mono text-gray-500 w-5">
                            {index + 1}.{lIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{lesson.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Clock className="w-3 h-3 text-gray-500" />
                                {lesson.duration || '00:00'}
                              </span>
                              
                              {/* Badge Provedor */}
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                isWistia 
                                  ? 'bg-[#e9c349]/15 text-[#e9c349] border border-[#e9c349]/30' 
                                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
                              }`}>
                                {isWistia ? <Video className="w-2.5 h-2.5" /> : <Youtube className="w-2.5 h-2.5" />}
                                {isWistia ? 'Wistia ID' : 'YouTube'}
                              </span>

                              {lesson.materials && (
                                <span className="text-gray-500 text-[11px] flex items-center gap-1 truncate max-w-[150px]">
                                  <LinkIcon className="w-2.5 h-2.5" />
                                  Materiais
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditLesson(mod.id, lesson)}
                            className="p-1.5 text-gray-400 hover:text-[#e9c349] hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar Aula"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Aula"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Aula */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          setEditingLesson(null);
        }}
        initialData={editingLesson ? {
          title: editingLesson.title,
          duration: editingLesson.duration,
          videoSource: editingLesson.videoSource || (editingLesson.videoData?.includes('youtube') ? 'youtube' : 'wistia'),
          videoData: editingLesson.videoData || editingLesson.videoUrl || '',
          materials: editingLesson.materials || ''
        } : null}
        onSave={handleSaveLesson}
      />
    </div>
  );
}
