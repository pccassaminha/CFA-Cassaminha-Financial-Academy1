with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = """  platformName?: string;
  defaultCurrency?: string;
  logoUrl?: string;
}"""

new = """  platformName?: string;
  defaultCurrency?: string;
  logoUrl?: string;
  certificateTemplate?: string;
}"""

content = content.replace(old, new)

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
