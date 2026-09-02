import re

with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add certificateTemplate state
old_state = "const [logoUrl, setLogoUrl] = useState(DEFAULT_CFA_LOGO);"
new_state = """const [logoUrl, setLogoUrl] = useState(DEFAULT_CFA_LOGO);
  const [certificateTemplate, setCertificateTemplate] = useState('');"""
if "setCertificateTemplate" not in content:
    content = content.replace(old_state, new_state)

# 2. Add to platform settings load
old_load = """if (pData.defaultCurrency) setDefaultCurrency(pData.defaultCurrency);
      }"""
new_load = """if (pData.defaultCurrency) setDefaultCurrency(pData.defaultCurrency);
        if (pData.certificateTemplate) setCertificateTemplate(pData.certificateTemplate);
      }"""
if "pData.certificateTemplate" not in content:
    content = content.replace(old_load, new_load)

# 3. Add to platform payload save
old_save = """const platformPayload: PlatformSettings = {
        platformName: platformName.trim(),
        defaultCurrency
      };"""
new_save = """const platformPayload: PlatformSettings = {
        platformName: platformName.trim(),
        defaultCurrency,
        certificateTemplate
      };"""
if "certificateTemplate" not in content.replace(old_save, new_save) and "certificateTemplate" not in old_save: # careful
    content = content.replace(old_save, new_save)

# 4. Add file upload handler
old_upload = """// Upload Logo from Device
  const handleLogoFileUpload"""
new_upload = """// Upload Certificate Template
  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showNotification('O certificado deve ter no máximo 3MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCertificateTemplate(event.target.result as string);
        showNotification('Modelo de certificado carregado temporariamente! Salve para aplicar.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload Logo from Device
  const handleLogoFileUpload"""
if "handleCertificateUpload" not in content:
    content = content.replace(old_upload, new_upload)

# 5. Add input ref for certificate upload
old_ref = "const fileInputRef = useRef<HTMLInputElement>(null);"
new_ref = """const fileInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);"""
if "certInputRef" not in content:
    content = content.replace(old_ref, new_ref)

# 6. Add hidden input and UI
old_hidden = """{/* Hidden File Input for Logo Upload */}"""
new_hidden = """{/* Hidden File Input for Certificate */}
        <input 
          type="file" 
          ref={certInputRef} 
          onChange={handleCertificateUpload} 
          accept="image/png, image/jpeg, image/webp" 
          className="hidden" 
        />

        {/* Hidden File Input for Logo Upload */}"""
if "certInputRef" not in content and "Hidden File Input for Certificate" not in content:
    content = content.replace(old_hidden, new_hidden)

# 7. Add UI inside the Identity Modal (Configurações da Plataforma)
old_ui = """{/* Logo Settings */}"""
new_ui = """{/* Certificado Padrão */}
              <div className="flex flex-col gap-3 p-4 bg-black/40 border border-outline-variant/10 rounded-xl">
                <label className="text-xs font-bold text-stone-300">Molde Padrão de Certificados</label>
                <div className="flex flex-col gap-3">
                  {certificateTemplate && (
                    <div className="w-full max-w-[200px] aspect-[1.414] bg-[#181818] rounded-lg overflow-hidden border border-outline-variant/10 relative">
                      <img src={certificateTemplate} alt="Certificado Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCertificateTemplate('')}
                        className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => certInputRef.current?.click()}
                      className="flex items-center gap-1.5 py-1.5 px-3 bg-[#e9c349]/10 hover:bg-[#e9c349]/20 text-[#e9c349] border border-[#e9c349]/20 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir Imagem de Fundo (PNG/JPG)
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Esta imagem será usada como fundo (molde oficial) sempre que o aluno gerar o seu certificado. O sistema preencherá automaticamente os nomes e as datas por cima dela.
                  </p>
                </div>
              </div>

              {/* Logo Settings */}"""
if "Molde Padrão de Certificados" not in content:
    content = content.replace(old_ui, new_ui)

with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
