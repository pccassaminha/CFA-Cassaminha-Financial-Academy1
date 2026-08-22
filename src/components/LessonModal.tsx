import React, { useState, useEffect } from 'react';
import { X, Youtube, Video } from 'lucide-react';
import { extractWistiaId } from '../utils/wistia';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonData: {
    title: string;
    duration: string;
    videoSource: 'youtube' | 'wistia';
    videoData: string;
    materials?: string;
  }) => void;
  initialData?: {
    title?: string;
    duration?: string;
    videoSource?: 'youtube' | 'wistia';
    videoData?: string;
    materials?: string;
  } | null;
}

export default function LessonModal({ isOpen, onClose, onSave, initialData }: LessonModalProps) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [videoSource, setVideoSource] = useState<'youtube' | 'wistia'>('wistia');
  const [videoData, setVideoData] = useState('');
  const [materials, setMaterials] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDuration(initialData.duration || '');
      setVideoSource(initialData.videoSource || 'wistia');
      setVideoData(initialData.videoData || '');
      setMaterials(initialData.materials || '');
    } else {
      setTitle('');
      setDuration('');
      setVideoSource('wistia');
      setVideoData('');
      setMaterials('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleVideoDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Check if user pasted Wistia HTML embed snippet or URL
    if (val.includes('wistia') || val.includes('<wistia-player') || val.includes('media-id') || val.includes('/embed/')) {
      const extracted = extractWistiaId(val);
      if (extracted) {
        setVideoSource('wistia');
        setVideoData(extracted);
        return;
      }
    }
    setVideoData(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalVideoData = videoData.trim();
    if (videoSource === 'wistia') {
      finalVideoData = extractWistiaId(finalVideoData);
    }
    onSave({ title, duration, videoSource, videoData: finalVideoData, materials });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#131313] border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6 font-headline">
          {initialData ? 'Editar Aula' : 'Adicionar Nova Aula'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Título da Aula</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white rounded-lg p-3 focus:border-[#e9c349] outline-none text-sm"
              placeholder="Ex: A Mentalidade do Operador"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Duração</label>
            <input 
              type="text" 
              required 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white rounded-lg p-3 focus:border-[#e9c349] outline-none text-sm"
              placeholder="Ex: 45:20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Fonte do Vídeo</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setVideoSource('wistia')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all cursor-pointer text-sm font-medium ${
                  videoSource === 'wistia' 
                    ? 'border-[#e9c349] bg-[#e9c349]/10 text-[#e9c349]' 
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Video className="w-4 h-4" /> Wistia
              </button>
              <button 
                type="button"
                onClick={() => setVideoSource('youtube')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all cursor-pointer text-sm font-medium ${
                  videoSource === 'youtube' 
                    ? 'border-red-500 bg-red-500/10 text-red-500' 
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Youtube className="w-4 h-4" /> YouTube
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {videoSource === 'wistia' ? 'Código HTML ou ID do Wistia' : 'Link do YouTube'}
            </label>
            <input 
              type="text" 
              required 
              value={videoData} 
              onChange={handleVideoDataChange}
              className="w-full bg-black border border-gray-700 text-white rounded-lg p-3 focus:border-[#e9c349] outline-none text-sm font-mono"
              placeholder={videoSource === 'wistia' ? 'Cole o HTML do Wistia (<script>... <wistia-player...>) ou ID' : 'Ex: https://youtube.com/watch?v=...'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {videoSource === 'wistia' 
                ? 'Cole o código HTML completo do Wistia. O sistema reconhece e extrai o ID automaticamente.' 
                : 'Cole o link completo do vídeo do YouTube.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Materiais Complementares (Opcional)</label>
            <input 
              type="text" 
              value={materials} 
              onChange={(e) => setMaterials(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white rounded-lg p-3 focus:border-[#e9c349] outline-none text-sm"
              placeholder="Ex: https://drive.google.com/..."
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#e9c349] text-black font-bold py-3 rounded-lg mt-4 hover:bg-[#d4b03f] transition-all cursor-pointer active:scale-95 font-headline"
          >
            Salvar Aula
          </button>
        </form>
      </div>
    </div>
  );
}
