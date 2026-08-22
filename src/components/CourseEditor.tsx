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
  CheckCircle2,
  GripVertical,
  ExternalLink
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
  const [coverImage, setCoverImage] = useState('');
  const [priceType, setPriceType] = useState<'free' | 'paid'>('paid');
  const [price, setPrice] = useState<number>(50000);
  const [isPublished, setIsPublished] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // NOVOS ESTADOS DE ESTRUTURA DO CURSO
  const [structureType, setStructureType] = useState<'modules' | 'single_lesson' | 'direct_link'>('modules');
  const [directLinkUrl, setDirectLinkUrl] = useState('');
  const [singleLessonVideoSource, setSingleLessonVideoSource] = useState<'youtube' | 'wistia'>('youtube');
  const [singleLessonVideoData, setSingleLessonVideoData] = useState('');
  const [singleLessonMaterials, setSingleLessonMaterials] = useState('');
  const [singleLessonDescription, setSingleLessonDescription] = useState('');
  
  // Estado do Auto-save
  const [saveStatus, setSaveStatus] = useState<'Salvo' | 'Salvando...' | 'Erro'>('Salvo');
  
  // Modal de Aula
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Estados para Drag & Drop de Aulas entre Módulos
  const [draggingLesson, setDraggingLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);
  const [draggedOverModuleId, setDraggedOverModuleId] = useState<string | null>(null);

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
            setCoverImage(data.coverImage || data.imageUrl || data.image || '');
            const p = Number(data.price) || 0;
            setPrice(p);
            setPriceType(p === 0 ? 'free' : 'paid');
            setIsPublished(data.isPublished ?? (data.status === 'published'));
            if (data.modules && Array.isArray(data.modules)) {
              setModules(data.modules);
            }
            
            // Carregar dados de estrutura personalizada
            setStructureType(data.structureType || 'modules');
            setDirectLinkUrl(data.directLinkUrl || '');
            setSingleLessonVideoSource(data.singleLessonVideoSource || 'youtube');
            setSingleLessonVideoData(data.singleLessonVideoData || '');
            setSingleLessonMaterials(data.singleLessonMaterials || '');
            setSingleLessonDescription(data.singleLessonDescription || '');
          }
        } else {
          // Curso novo limpo pronto para o administrador cadastrar dados reais
          if (isMounted) {
            setTitle('');
            setDescription('');
            setCoverImage('');
            setPrice(0);
            setIsPublished(false);
            setModules([
              {
                id: `m_${Date.now()}`,
                title: 'Módulo 1: Introdução',
                status: 'published',
                lessons: []
              }
            ]);
            setStructureType('modules');
            setDirectLinkUrl('');
            setSingleLessonVideoSource('youtube');
            setSingleLessonVideoData('');
            setSingleLessonMaterials('');
            setSingleLessonDescription('');
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
          coverImage,
          image: coverImage,
          imageUrl: coverImage,
          price: Number(price),
          isPublished,
          status: isPublished ? 'published' : 'draft',
          modules,
          structureType,
          directLinkUrl,
          singleLessonVideoSource,
          singleLessonVideoData,
          singleLessonMaterials,
          singleLessonDescription,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Sincronizar também no documento global de settings caso exista
        try {
          const settingsRef = doc(db, 'settings', 'course_structure');
          await setDoc(settingsRef, {
            id: courseId,
            title,
            coverImage,
            image: coverImage,
            modules,
            structureType,
            directLinkUrl,
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
  }, [
    title, description, coverImage, price, isPublished, modules, 
    structureType, directLinkUrl, singleLessonVideoSource, 
    singleLessonVideoData, singleLessonMaterials, singleLessonDescription, 
    courseId, isLoading
  ]);

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

  // 4. Modais de Gestão de Módulos e Aulas
  const [moduleModal, setModuleModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    moduleId?: string;
    title: string;
  }>({
    isOpen: false,
    mode: 'create',
    title: ''
  });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'module' | 'lesson';
    moduleId?: string;
    lessonId?: string;
    itemName: string;
  }>({
    isOpen: false,
    type: 'module',
    itemName: ''
  });

  // Criar ou Editar Módulo
  const handleOpenCreateModule = () => {
    setModuleModal({
      isOpen: true,
      mode: 'create',
      title: `Módulo ${modules.length + 1}: `
    });
  };

  const handleOpenEditModule = (moduleId: string, currentTitle: string) => {
    setModuleModal({
      isOpen: true,
      mode: 'edit',
      moduleId,
      title: currentTitle
    });
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleModal.title.trim()) return;

    if (moduleModal.mode === 'create') {
      const newMod: Module = {
        id: `m_${Date.now()}`,
        courseId,
        title: moduleModal.title.trim(),
        status: 'published',
        lessons: []
      };
      setModules([...modules, newMod]);
    } else if (moduleModal.moduleId) {
      setModules(modules.map(m => m.id === moduleModal.moduleId ? { ...m, title: moduleModal.title.trim() } : m));
    }

    setModuleModal({ isOpen: false, mode: 'create', title: '' });
  };

  // Solicitar Exclusão de Módulo
  const promptDeleteModule = (moduleId: string, title: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'module',
      moduleId,
      itemName: title
    });
  };

  // Solicitar Exclusão de Aula
  const promptDeleteLesson = (moduleId: string, lessonId: string, title: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'lesson',
      moduleId,
      lessonId,
      itemName: title
    });
  };

  // Executar Exclusão Confirmada
  const handleConfirmItemDelete = () => {
    if (deleteConfirmModal.type === 'module' && deleteConfirmModal.moduleId) {
      setModules(modules.filter(m => m.id !== deleteConfirmModal.moduleId));
    } else if (deleteConfirmModal.type === 'lesson' && deleteConfirmModal.moduleId && deleteConfirmModal.lessonId) {
      setModules(modules.map(mod => {
        if (mod.id === deleteConfirmModal.moduleId) {
          return {
            ...mod,
            lessons: mod.lessons.filter(l => l.id !== deleteConfirmModal.lessonId)
          };
        }
        return mod;
      }));
    }
    setDeleteConfirmModal({ isOpen: false, type: 'module', itemName: '' });
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

  // Eventos de Drag & Drop para mover aulas
  const handleDragStart = (e: React.DragEvent, sourceModId: string, lessonId: string) => {
    setDraggingLesson({ moduleId: sourceModId, lessonId });
    e.dataTransfer.setData('text/plain', JSON.stringify({ moduleId: sourceModId, lessonId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverModule = (e: React.DragEvent, targetModId: string) => {
    e.preventDefault();
    setDraggedOverModuleId(targetModId);
  };

  const handleDragLeaveModule = () => {
    setDraggedOverModuleId(null);
  };

  const handleDropOnModule = (e: React.DragEvent, targetModId: string) => {
    e.preventDefault();
    setDraggedOverModuleId(null);

    let sourceModId = '';
    let lessonId = '';

    if (draggingLesson) {
      sourceModId = draggingLesson.moduleId;
      lessonId = draggingLesson.lessonId;
    } else {
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (rawData) {
          const parsed = JSON.parse(rawData);
          sourceModId = parsed.moduleId;
          lessonId = parsed.lessonId;
        }
      } catch (err) {
        return;
      }
    }

    if (!sourceModId || !lessonId || sourceModId === targetModId) return;

    // Achar o modulo de origem
    const sourceMod = modules.find(m => m.id === sourceModId);
    if (!sourceMod) return;

    // Achar a aula
    const lessonToMove = sourceMod.lessons.find(l => l.id === lessonId);
    if (!lessonToMove) return;

    // Atualizar a aula
    const updatedLesson = { ...lessonToMove, moduleId: targetModId };

    // Remover da origem e colocar no destino
    const updatedModules = modules.map(m => {
      if (m.id === sourceModId) {
        return {
          ...m,
          lessons: m.lessons.filter(l => l.id !== lessonId)
        };
      }
      if (m.id === targetModId) {
        return {
          ...m,
          lessons: [...m.lessons, updatedLesson]
        };
      }
      return m;
    });

    setModules(updatedModules);
    setDraggingLesson(null);
  };

  const handleDragEnd = () => {
    setDraggingLesson(null);
    setDraggedOverModuleId(null);
  };

  return (
    <div className="p-6 lg:p-10 text-white max-w-6xl mx-auto min-h-screen">
      {/* Barra Superior / Header de Controle */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button 
            id="btn-back-to-courses-list"
            onClick={onBack} 
            className="flex items-center gap-2 px-3 py-2 bg-[#131313] border border-gray-800 rounded-xl hover:border-[#e9c349] hover:text-[#e9c349] transition-all cursor-pointer shadow-md text-sm font-semibold text-gray-300"
            title="Voltar para a Lista de Cursos"
          >
            <ArrowLeft className="w-4 h-4 text-[#e9c349]" />
            <span>Voltar aos Cursos</span>
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
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-5 bg-[#131313] p-6 rounded-2xl border border-gray-800 shadow-xl">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição do Curso (Exibida na Vitrine)</label>
                <span className="text-[11px] text-gray-400">Exibida na vitrine abaixo da imagem de propaganda</span>
              </div>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escreva a descrição do curso que será exibida na vitrine de entrada..."
                className="w-full bg-black border border-gray-700 text-white rounded-xl p-3.5 focus:border-[#e9c349] outline-none text-sm resize-y leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Capa do Curso (Thumbnail) */}
          <div className="bg-[#131313] p-6 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-[#e9c349] font-headline">Capa do Curso (Thumbnail)</h3>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Link da Imagem (Postimage ou Imgur)</label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://i.postimg.cc/..."
                className="w-full bg-black border border-gray-700 text-white rounded-xl p-3 focus:border-[#e9c349] outline-none text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Hospede a imagem no Postimage, copie o "Link Direto" e cole aqui.
              </p>
            </div>

            {/* Pré-visualização da Capa */}
            {coverImage && (
              <div className="w-full h-40 rounded-xl overflow-hidden border border-gray-800 mt-3 relative bg-black">
                <img 
                  src={coverImage} 
                  alt="Pré-visualização da Capa" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          {/* Estrutura do Curso */}
          <div className="bg-[#131313] p-6 rounded-2xl border border-gray-800 space-y-5 shadow-xl">
            <h3 className="text-lg font-bold text-[#e9c349] font-headline">Estrutura de Entrega</h3>
            <p className="text-xs text-gray-400 -mt-2">Escolha como este curso será exibido na sala de aula para o aluno.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStructureType('modules')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                  structureType === 'modules'
                    ? 'bg-[#e9c349]/10 border-[#e9c349] text-white'
                    : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <span className="font-bold text-sm text-[#e9c349]">Grade Completa</span>
                <span className="text-[11px] text-gray-400 leading-normal">Vários módulos e dezenas de aulas organizadas.</span>
              </button>

              <button
                type="button"
                onClick={() => setStructureType('single_lesson')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                  structureType === 'single_lesson'
                    ? 'bg-[#e9c349]/10 border-[#e9c349] text-white'
                    : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <span className="font-bold text-sm text-[#e9c349]">Aula Única / Replay</span>
                <span className="text-[11px] text-gray-400 leading-normal">Um único vídeo direto com descrição e materiais.</span>
              </button>

              <button
                type="button"
                onClick={() => setStructureType('direct_link')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                  structureType === 'direct_link'
                    ? 'bg-[#e9c349]/10 border-[#e9c349] text-white'
                    : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <span className="font-bold text-sm text-[#e9c349]">Link Externo / Direto</span>
                <span className="text-[11px] text-gray-400 leading-normal">Redireciona para um link (ex: WhatsApp, Drive).</span>
              </button>
            </div>

            {/* Condicionais para Aula Única */}
            {structureType === 'single_lesson' && (
              <div className="bg-black/40 border border-gray-800 p-4 rounded-xl space-y-4 pt-4">
                <div className="border-b border-gray-800 pb-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Configurações da Aula Única</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Fonte do Vídeo</label>
                    <select
                      value={singleLessonVideoSource}
                      onChange={(e) => setSingleLessonVideoSource(e.target.value as 'youtube' | 'wistia')}
                      className="w-full bg-black border border-gray-700 text-white rounded-lg p-2.5 focus:border-[#e9c349] outline-none text-xs"
                    >
                      <option value="youtube">YouTube (Link completo)</option>
                      <option value="wistia">Wistia (ID do Vídeo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                      {singleLessonVideoSource === 'youtube' ? 'Link do YouTube ou Código <iframe...>' : 'ID ou HTML do Wistia'}
                    </label>
                    <input
                      type="text"
                      value={singleLessonVideoData}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes('youtube.com') || val.includes('youtu.be') || (val.includes('<iframe') && val.includes('youtube'))) {
                          setSingleLessonVideoSource('youtube');
                        }
                        setSingleLessonVideoData(val);
                      }}
                      placeholder={singleLessonVideoSource === 'youtube' ? 'Link (https://youtube.com/...) ou Código (<iframe...)' : 'ex: 3m4v9f1j'}
                      className="w-full bg-black border border-gray-700 text-white rounded-lg p-2.5 focus:border-[#e9c349] outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Link de Materiais de Apoio (Opcional)</label>
                  <input
                    type="url"
                    value={singleLessonMaterials}
                    onChange={(e) => setSingleLessonMaterials(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-black border border-gray-700 text-white rounded-lg p-2.5 focus:border-[#e9c349] outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Informações Adicionais / Descrição da Aula</label>
                  <textarea
                    rows={3}
                    value={singleLessonDescription}
                    onChange={(e) => setSingleLessonDescription(e.target.value)}
                    placeholder="Notas específicas para esta masterclass..."
                    className="w-full bg-black border border-gray-700 text-white rounded-lg p-2.5 focus:border-[#e9c349] outline-none text-xs leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Condicionais para Link Direto */}
            {structureType === 'direct_link' && (
              <div className="bg-black/40 border border-gray-800 p-4 rounded-xl space-y-3">
                <div className="border-b border-gray-800 pb-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Configuração do Link Externo</h4>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">URL de Redirecionamento</label>
                  <input
                    type="url"
                    value={directLinkUrl}
                    onChange={(e) => setDirectLinkUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/... ou https://drive.google.com/..."
                    className="w-full bg-black border border-gray-700 text-white rounded-lg p-2.5 focus:border-[#e9c349] outline-none text-xs font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Ao adquirir este produto, o botão "Iniciar" ou "Acessar" abrirá diretamente esta URL.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Caixa de Preço e Moeda */}
        <div className="bg-[#131313] p-6 rounded-2xl border border-gray-800 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-[#e9c349] mb-4 font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">payments</span>
              Tipo de Acesso & Preço
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => { setPriceType('free'); setPrice(0); }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  priceType === 'free'
                    ? 'bg-[#e9c349] text-black border-[#e9c349] shadow-md'
                    : 'bg-black text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                Grátis (Livre)
              </button>
              <button
                type="button"
                onClick={() => { setPriceType('paid'); if (price === 0) setPrice(50000); }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  priceType === 'paid'
                    ? 'bg-[#e9c349] text-black border-[#e9c349] shadow-md'
                    : 'bg-black text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                Pago (Preço Kz)
              </button>
            </div>

            {priceType === 'paid' ? (
              <div>
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
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Curso <strong>Gratuito</strong>. Alunos podem acessar e assistir aos vídeos do YouTube instantaneamente sem checkout.</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-400 flex items-center gap-2">
            <span>💡</span>
            <span>As alterações salvam automaticamente em tempo real.</span>
          </div>
        </div>
      </div>

      {/* Seção de Módulos e Aulas */}
      {structureType === 'modules' ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#e9c349]" />
                Módulos e Aulas
              </h2>
              <p className="text-xs text-gray-400 mt-1">Organize os tópicos e gerencie os vídeos hospedados no YouTube ou Wistia.</p>
            </div>
            <button
              id="btn-add-module"
              onClick={handleOpenCreateModule}
              className="bg-[#e9c349] text-black px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#d4b03f] transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" /> Novo Módulo
            </button>
          </div>

          <div className="space-y-6">
            {modules.length > 0 && modules.some(m => m.lessons && m.lessons.length > 0) && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3 text-sm text-yellow-300">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <p className="font-bold text-white mb-0.5">Dica de Organização</p>
                  <p className="text-xs text-gray-300 leading-relaxed">Você pode mover aulas de um módulo para outro de forma rápida: basta **clicar e arrastar** qualquer aula para dentro do módulo desejado!</p>
                </div>
              </div>
            )}

            {modules.length === 0 ? (
              <div className="text-center py-16 bg-[#131313] border border-dashed border-gray-800 rounded-2xl text-gray-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-600 opacity-60" />
                <p className="text-base font-semibold text-gray-300">Nenhum módulo criado ainda.</p>
                <p className="text-xs text-gray-500 mt-1">Clique em "Novo Módulo" acima para estruturar a grade curricular.</p>
                <button
                  onClick={handleOpenCreateModule}
                  className="mt-4 px-4 py-2 bg-[#e9c349]/10 text-[#e9c349] border border-[#e9c349]/30 rounded-xl text-xs font-bold hover:bg-[#e9c349]/20 transition-all cursor-pointer"
                >
                  + Adicionar Primeiro Módulo
                </button>
              </div>
            ) : (
              modules.map((mod, index) => (
                <div 
                  key={mod.id} 
                  onDragOver={(e) => handleDragOverModule(e, mod.id)}
                  onDragLeave={handleDragLeaveModule}
                  onDrop={(e) => handleDropOnModule(e, mod.id)}
                  className={`bg-[#131313] border rounded-2xl p-6 shadow-xl space-y-4 transition-all duration-200 ${
                    draggedOverModuleId === mod.id 
                      ? 'border-[#e9c349] bg-[#e9c349]/5 shadow-yellow-500/5 ring-1 ring-[#e9c349]' 
                      : 'border-gray-800'
                  }`}
                >
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
                        id={`btn-add-lesson-mod-${mod.id}`}
                        onClick={() => openAddLesson(mod.id)}
                        className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 hover:border-[#e9c349] text-gray-300 hover:text-[#e9c349] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Aula
                      </button>
                      <button
                        id={`btn-edit-mod-${mod.id}`}
                        onClick={() => handleOpenEditModule(mod.id, mod.title)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                        title="Editar Título do Módulo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-mod-${mod.id}`}
                        onClick={() => promptDeleteModule(mod.id, mod.title)}
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
                        Nenhuma aula cadastrada neste módulo. Clique em "+ Adicionar Aula" ou arraste uma aula para cá.
                      </div>
                    ) : (
                      mod.lessons.map((lesson, lIdx) => {
                        const isWistia = lesson.videoSource === 'wistia' || (lesson.videoData || '').includes('wistia') || (!lesson.videoData?.includes('youtube') && (lesson.videoData || '').length < 25 && !lesson.videoData?.startsWith('http'));
                        const isCurrentlyDragged = draggingLesson?.lessonId === lesson.id;
                        
                        return (
                          <div 
                            key={lesson.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, mod.id, lesson.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-black/60 border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                              isCurrentlyDragged 
                                ? 'opacity-40 border-[#e9c349]/50 border-dashed bg-[#e9c349]/10' 
                                : 'border-gray-800/80 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                              <GripVertical className="w-4 h-4 text-gray-600 hover:text-[#e9c349] shrink-0 cursor-grab" />
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
                                id={`btn-edit-lesson-${lesson.id}`}
                                onClick={() => openEditLesson(mod.id, lesson)}
                                className="p-1.5 text-gray-400 hover:text-[#e9c349] hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                title="Editar Aula"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                id={`btn-delete-lesson-${lesson.id}`}
                                onClick={() => promptDeleteLesson(mod.id, lesson.id, lesson.title)}
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
        </>
      ) : (
        <div className="bg-[#131313] border border-gray-800 p-8 rounded-2xl text-center max-w-2xl mx-auto mb-10 shadow-xl">
          <div className="w-12 h-12 bg-[#e9c349]/10 text-[#e9c349] rounded-xl flex items-center justify-center mx-auto mb-4">
            {structureType === 'single_lesson' ? <Video className="w-6 h-6" /> : <ExternalLink className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-bold text-white font-headline">Estrutura Simplificada Ativa</h3>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Este curso está configurado para ser entregue como{' '}
            <strong className="text-[#e9c349]">
              {structureType === 'single_lesson' ? 'Aula Única / Replay' : 'Link Externo Direto'}
            </strong>.
          </p>
          <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            {structureType === 'single_lesson' 
              ? 'As informações do vídeo, materiais e notas adicionais já foram configurados na ficha "Estrutura de Entrega" acima, portanto a grade clássica de módulos e aulas não é necessária.'
              : 'Os alunos serão redirecionados diretamente para o link externo configurado assim que clicarem no botão de início do curso na biblioteca.'}
          </p>
          <button
            type="button"
            onClick={() => setStructureType('modules')}
            className="mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
          >
            Mudar para Grade Completa de Módulos
          </button>
        </div>
      )}

      {/* Modal de Módulo (Criar / Renomear) */}
      {moduleModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-1 font-headline">
              {moduleModal.mode === 'create' ? 'Novo Módulo' : 'Editar Módulo'}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Informe o título e organização dos tópicos deste módulo.
            </p>

            <form onSubmit={handleSaveModule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Título do Módulo *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={moduleModal.title}
                  onChange={(e) => setModuleModal({ ...moduleModal, title: e.target.value })}
                  placeholder="Ex: Módulo 1: Fundamentos e Estrutura"
                  className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-[#e9c349] outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModuleModal({ ...moduleModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#e9c349] hover:bg-[#d4b03f] text-black px-5 py-2 rounded-xl font-bold text-xs transition-colors shadow-md"
                >
                  {moduleModal.mode === 'create' ? 'Criar Módulo' : 'Salvar Título'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (Módulo / Aula) */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 font-headline">
              Excluir {deleteConfirmModal.type === 'module' ? 'Módulo' : 'Aula'}?
            </h3>
            <p className="text-xs text-gray-300 mb-4">
              Tem certeza que deseja excluir "{deleteConfirmModal.itemName}"?
              {deleteConfirmModal.type === 'module' && ' Todas as aulas deste módulo também serão excluídas.'}
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmItemDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

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
