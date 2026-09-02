import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Upload, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  initialStudentName: string;
  instructorName?: string;
}

export function CertificateModal({ isOpen, onClose, courseTitle, initialStudentName, instructorName = "Pedro Cassaminha" }: CertificateModalProps) {
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
  };

  const handleGeneratePDF = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);
    
    try {
      const element = certificateRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for PDF
        useCORS: true,
        backgroundColor: null,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificado-${studentName.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar certificado:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-4">
      
      {/* Controles do Certificado */}
      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-end justify-between mb-4 gap-4 bg-[#131313] p-4 rounded-2xl border border-[#353534] shadow-2xl">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-400 mb-1">Nome no Certificado</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full bg-[#0e0e0e] border border-[#353534] rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-[#e9c349] outline-none"
          />
        </div>
        
        <div className="flex-1 w-full">
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
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-[#e9c349] text-black hover:bg-[#d4b03f] active:scale-95 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Baixar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visualização do Certificado */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-gray-800 shadow-2xl flex-1 max-h-[75vh] bg-stone-900 flex items-center justify-center">
        
        <div className="overflow-auto w-full h-full flex items-center justify-center p-4 custom-scrollbar">
            
            {/* O Elemento Exato do Certificado para Captura (A4 Landscape = 1123x794 px) */}
            <div 
              ref={certificateRef}
              style={{
                width: '1123px',
                height: '794px',
                position: 'relative',
                backgroundImage: `url(${bgImage})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: '#fff',
                fontFamily: 'serif',
                color: '#1a1a1a',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                flexShrink: 0,
                transformOrigin: 'center center',
              }}
            >
              
              {/* DATA (Canto Superior Direito) */}
              <div style={{
                position: 'absolute',
                top: '110px',
                right: '70px',
                width: '260px',
                textAlign: 'center',
                fontSize: '18px',
                color: '#ffffff', // Cor branca para contraste na fita preta
                fontFamily: 'sans-serif',
                fontWeight: '500',
                letterSpacing: '1px'
              }}>
                {new Date().toLocaleDateString('pt-PT')}
              </div>

              {/* NOME DO ALUNO */}
              <div style={{
                position: 'absolute',
                top: '47.5%',
                left: '0',
                width: '100%',
                textAlign: 'center',
                fontSize: '44px',
                fontStyle: 'italic',
                fontWeight: 'bold',
                color: '#1a1a1a',
                padding: '0 80px',
                fontFamily: '"Georgia", serif'
              }}>
                {studentName}
              </div>

              {/* NOME DO CURSO */}
              <div style={{
                position: 'absolute',
                top: '61.5%',
                left: '0',
                width: '100%',
                textAlign: 'center',
                fontSize: '30px',
                fontWeight: '600',
                color: '#b08d3e', // Tom dourado para combinar com o layout
                padding: '0 100px',
                fontFamily: '"Georgia", serif'
              }}>
                {courseTitle}
              </div>

              {/* NOME DO AUTOR (Assinatura) */}
              <div style={{
                position: 'absolute',
                bottom: '128px',
                left: '180px',
                width: '320px',
                textAlign: 'center',
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#1a1a1a',
                fontFamily: '"Georgia", serif'
              }}>
                {instructorName}
              </div>

              {/* CÓDIGO QR & VALIDAÇÃO */}
              <div style={{
                position: 'absolute',
                bottom: '75px',
                right: '90px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.85)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <QRCodeSVG 
                  value={`https://cfa-academy.site/validar?code=${validationCode.current}`} 
                  size={90}
                  level="M"
                />
                <div style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#1a1a1a',
                  fontWeight: 'bold'
                }}>
                  {validationCode.current}
                </div>
              </div>

            </div>
        </div>
        
        {/* Alerta caso o fundo não esteja carregado ainda */}
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
        )}

      </div>
    </div>
  );
}
