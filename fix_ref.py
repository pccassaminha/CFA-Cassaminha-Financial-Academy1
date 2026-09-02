with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const fileInputRef = useRef<HTMLInputElement | null>(null);", "const fileInputRef = useRef<HTMLInputElement | null>(null);\n  const certInputRef = useRef<HTMLInputElement | null>(null);")

with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
