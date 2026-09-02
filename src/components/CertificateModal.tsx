import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DEFAULT_CFA_LOGO } from '../utils/constants';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  initialStudentName: string;
}

export function CertificateModal({ isOpen, onClose, courseTitle, initialStudentName }: CertificateModalProps) {
  const [studentName, setStudentName] = useState(initialStudentName);
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleGeneratePDF = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);
    
    try {
      // Temporarily make it visible for html2canvas
      const element = certificateRef.current;
      element.style.display = 'block';
      
      const canvas = await html2canvas(element, {
        scale: 3, // High quality
        useCORS: true, // For images
        backgroundColor: '#FCFBF8'
      });
      
      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificado-${courseTitle.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar certificado:", error);
      alert("Houve um problema ao gerar o certificado. Tente novamente.");
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#181818] border border-[#353534]/50 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-[#353534]/50">
          <h2 className="text-xl font-headline font-bold text-white mb-2">Emitir Certificado</h2>
          <p className="text-sm text-stone-400">
            Confirme ou edite o nome que deseja que apareça impresso no seu certificado de conclusão.
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              Seu Nome Completo
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-[#0e0e0e] border border-[#353534]/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e9c349] transition-colors"
              placeholder="Digite seu nome completo"
            />
          </div>
        </div>

        <div className="p-4 bg-[#0e0e0e] border-t border-[#353534]/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-stone-400 hover:text-white hover:bg-[#353534]/50 transition-colors"
            disabled={isGenerating}
          >
            Cancelar
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || !studentName.trim()}
            className="px-5 py-2.5 rounded-xl font-bold bg-[#e9c349] text-black hover:bg-[#e9c349]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                Gerando PDF...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">download</span>
                Baixar Certificado
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden layout for PDF capture - using inline styles rigorously for html2canvas compatibility */}
      <div 
        ref={certificateRef}
        style={{ 
          display: 'none', 
          width: '1123px', // A4 Landscape ratio
          height: '794px',
          backgroundColor: '#FCFBF8',
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          fontFamily: 'serif',
          color: '#1a1a1a',
          boxSizing: 'border-box',
          padding: '40px'
        }}
      >
        <div style={{
          border: '4px solid #e9c349',
          borderRadius: '12px',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 80px'
        }}>
          {/* Top Logo */}
          <div style={{ position: 'absolute', top: '40px', right: '40px' }}>
            <img 
              src={DEFAULT_CFA_LOGO} 
              alt="Logo CFA" 
              crossOrigin="anonymous"
              style={{ height: '60px', objectFit: 'contain' }}
            />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: '700', 
              margin: '0', 
              color: '#1a1a1a',
              letterSpacing: '4px',
              textTransform: 'uppercase'
            }}>
              Certificado de Conclusão
            </h1>
            <div style={{
              width: '120px',
              height: '3px',
              backgroundColor: '#e9c349',
              margin: '24px auto 0'
            }}></div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '22px', color: '#4a4a4a', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ margin: '0 0 16px 0' }}>Certificamos que</p>
            <h2 style={{ 
              fontSize: '42px', 
              fontWeight: 'bold', 
              color: '#1a1a1a', 
              margin: '0 0 24px 0',
              fontStyle: 'italic'
            }}>
              {studentName}
            </h2>
            <p style={{ margin: '0 0 16px 0' }}>concluiu com sucesso o</p>
            <h3 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#e9c349', 
              margin: '0 0 32px 0',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {courseTitle}
            </h3>
            <p style={{ margin: '0', fontSize: '20px' }}>
              Está agora preparado(a) para exercer a função com excelência e agir também como formador(a) nesta área.
            </p>
          </div>

          {/* Signatures & Footer */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: '80px',
            right: '80px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end'
          }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: '0', fontSize: '16px', color: '#666', fontStyle: 'italic' }}>
                Formação realizada na CFA Academy<br/>(Cassaminha Financial Academy)
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#999', fontFamily: 'sans-serif' }}>
                {new Date().toLocaleDateString('pt-PT')}
              </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: '"Great Vibes", cursive, serif', // Fallback to serif if web font fails in canvas
                fontSize: '36px',
                color: '#1a1a1a',
                borderBottom: '1px solid #1a1a1a',
                paddingBottom: '8px',
                marginBottom: '8px',
                width: '240px'
              }}>
                Pedro Cassaminha
              </div>
              <p style={{ margin: '0', fontSize: '16px', color: '#4a4a4a', fontWeight: 'bold' }}>
                Pedro Cassaminha
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                Formador Principal
              </p>
            </div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '0',
            right: '0',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', fontSize: '12px', color: '#999', fontFamily: 'sans-serif', letterSpacing: '1px' }}>
              cfa-academy.site
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
