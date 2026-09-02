import re

with open('src/components/CertificateModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add firestore imports
old_imports = """import { jsPDF } from 'jspdf';
import { Download, Upload, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';"""
new_imports = """import { jsPDF } from 'jspdf';
import { Download, Upload, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';"""
if "import { doc, getDoc }" not in content:
    content = content.replace(old_imports, new_imports)

# 2. Add fetching logic and remove manual upload UI
# We need to replace the entire component logic where it loads the template
old_modal_start = """export function CertificateModal({ isOpen, onClose, courseTitle, initialStudentName, instructorName = "Pedro Cassaminha" }: CertificateModalProps) {
  const [studentName, setStudentName] = useState(initialStudentName);
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  
  // Default background image (should be in public folder)
  const [bgImage, setBgImage] = useState<string>('/certificado-bg.png'); 
  const [hasCustomUpload, setHasCustomUpload] = useState(false);

  // Generate a random validation code once per modal open
  const validationCode = useRef(`CFA-${Math.random().toString(36).substr(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`);

  if (!isOpen) return null;

  // Handle local background upload for quick testing
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBgImage(event.target.result as string);
          setHasCustomUpload(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };"""

new_modal_start = """export function CertificateModal({ isOpen, onClose, courseTitle, initialStudentName, instructorName = "Pedro Cassaminha" }: CertificateModalProps) {
  const [studentName, setStudentName] = useState(initialStudentName);
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const [bgImage, setBgImage] = useState<string>('/certificado-bg.png'); 
  const [hasCustomUpload, setHasCustomUpload] = useState(false);
  const [isLoadingBg, setIsLoadingBg] = useState(false);

  // Generate a random validation code once per modal open
  const validationCode = useRef(`CFA-${Math.random().toString(36).substr(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`);

  // Fetch the certificate template from platform settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const fetchTemplate = async () => {
        setIsLoadingBg(true);
        try {
          const docRef = doc(db, 'settings', 'platform');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().certificateTemplate) {
            setBgImage(docSnap.data().certificateTemplate);
            setHasCustomUpload(true);
          }
        } catch (error) {
          console.error("Erro ao buscar template do certificado:", error);
        } finally {
          setIsLoadingBg(false);
        }
      };
      fetchTemplate();
    }
  }, [isOpen]);

  if (!isOpen) return null;"""

content = content.replace(old_modal_start, new_modal_start)

# 3. Simplify the UI by removing the local upload box
ui_replace_old = """<div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-400 mb-1">Upload Fundo (Testar Imagem)</label>
          <div className="relative">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleBgUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-full bg-[#0e0e0e] border border-[#353534] rounded-lg px-3 py-2 text-gray-400 hover:text-white hover:border-[#e9c349] transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#e9c349]" />
              <span className="text-sm truncate">Selecione a imagem do certificado</span>
            </div>
          </div>
        </div>"""

ui_replace_new = """<div className="flex-1 w-full flex items-center justify-start text-xs text-stone-400">
          <p>O design do fundo (molde) é gerido automaticamente pela administração da plataforma.</p>
        </div>"""

content = content.replace(ui_replace_old, ui_replace_new)

# 4. Remove or adjust the fallback alert overlay
overlay_old = """{/* Alerta caso o fundo não esteja carregado ainda */}
        {!hasCustomUpload && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 p-6 text-center">
             <div className="bg-[#131313] p-6 rounded-2xl border border-[#353534] max-w-md shadow-2xl pointer-events-auto">
               <Upload className="w-12 h-12 text-[#e9c349] mx-auto mb-4" />
               <h3 className="text-white font-bold text-lg mb-2">Adicione a Imagem de Fundo</h3>
               <p className="text-gray-400 text-sm mb-4">
                 Para ver como fica, faça o upload da imagem do certificado que me enviou usando o botão "Upload Fundo" lá em cima!
               </p>
             </div>
          </div>
        )}"""

overlay_new = """{/* Alerta caso o fundo não esteja carregado ainda */}
        {!hasCustomUpload && !isLoadingBg && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 p-6 text-center">
             <div className="bg-[#131313] p-6 rounded-2xl border border-[#353534] max-w-md shadow-2xl pointer-events-auto">
               <h3 className="text-white font-bold text-lg mb-2">A aguardar Molde Oficial</h3>
               <p className="text-gray-400 text-sm mb-4">
                 O molde padrão do certificado ainda não foi configurado pela administração na aba "Configurações".
               </p>
             </div>
          </div>
        )}
        
        {isLoadingBg && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 p-6 text-center">
             <div className="w-8 h-8 border-2 border-[#e9c349] border-t-transparent rounded-full animate-spin mb-3"></div>
             <p className="text-[#e9c349] text-sm font-bold">A carregar molde do certificado...</p>
          </div>
        )}"""

content = content.replace(overlay_old, overlay_new)

with open('src/components/CertificateModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

