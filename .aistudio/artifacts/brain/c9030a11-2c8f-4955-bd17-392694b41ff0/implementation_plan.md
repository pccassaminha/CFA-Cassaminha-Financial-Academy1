# Sistema de Cópia e Colagem de Módulos entre Cursos (Clonagem Segura)

Permite aos administradores copiar módulos completos com todas as suas aulas, vídeos, descrições e materiais de apoio de um curso existente e colá-los em qualquer outro curso na posição desejada, viabilizando a criação rápida de combos e packs sem recadastramento manual e com garantia de integridade no banco de dados.

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões operacionais e de interface abaixo foram alinhadas com base nas suas preferências:

- **Fluxo Selecionado**: Botão **"Copiar Módulo"** diretamente no cabeçalho de cada módulo, e botão **"Colar Módulo"** no curso de destino (com banner de área de transferência ativa).
- **Escopo dos Dados Clonados**: Clonagem completa de todos os atributos das aulas (títulos, links de vídeo YouTube/Wistia, tempos de duração, descrições textuais, materiais de download e links personalizados de apoio).
- **Posicionamento Customizado**: Janela modal de colagem permitindo escolher onde o módulo deve ser inserido (no final, no início ou entre módulos existentes), com renumeração sequencial automática.
- **Integridade Garantida**: Cada módulo e aula colados recebem identificadores únicos (IDs) novos e independentes, assegurando que futuras edições ou exclusões em um curso nunca afetem o curso de origem.

---

### 1. Overview & Core Concept

- **O que faz**: Adiciona um mecanismo de "Clipboard / Área de Transferência" na área administrativa que permite copiar um módulo (juntamente com todo o seu acervo de aulas e anexos) de um curso "A" e colá-lo em um curso "B" ou pacote de cursos ("3 em 1").
- **Público-alvo**: Administradores e produtores da CFA Academy que criam formações modulares, trilhas especializadas ou ofertas empacotadas.
- **Valor Principal**: Elimina centenas de cliques e minutos de retrabalho manual ao montar novos cursos ou packs, sem qualquer risco de corrupção ou dependência cruzada entre cursos.

---

### 2. User Experience & Visual Design

#### Fluxo do Usuário Passo a Passo
1. **Copiar o Módulo de Origem**:
   - No editor do curso original (`CourseEditor`), o administrador localiza o módulo desejado.
   - No cabeçalho do módulo (ao lado de "Adicionar Aula" e "Editar"), haverá o botão **"Copiar Módulo"** com ícone discreto e elegante.
   - Ao clicar, o módulo é armazenado na área de transferência (`localStorage`). Um aviso flutuante elegante (toast) confirma: *"Módulo '[Nome]' copiado com sucesso! (X aulas incluídas)"*.

2. **Indicador Visual de Transferência (Clipboard Ativo)**:
   - Ao navegar para outro curso (ou novo curso), surge uma barra contextual discreta acima da grade curricular:
     - Badge dourado: `📋 Módulo na Área de Transferência: [Título do Módulo] (X aulas do curso [Origem])`.
     - Botões de ação rápida: **"Colar Módulo Aqui"** e **"Limpar Cópia"**.
   - Junto ao botão principal **"+ Novo Módulo"**, fica ativo o botão **"Colar Módulo Copiado"**.

3. **Escolha de Posição & Inserção**:
   - Ao clicar em **"Colar Módulo"**, abre-se o modal **"Colar Módulo no Curso"**:
     - Exibe pré-visualização: título do módulo e quantidade de aulas a serem clonadas.
     - Campo de seleção de posição:
       - *No final do curso (Módulo N+1)* [Padrão recomendado]
       - *No início do curso (Módulo 1)*
       - *Antes do Módulo [Selecionar da lista]*
       - *Depois do Módulo [Selecionar da lista]*
     - Opção de renomear o título do módulo antes de inserir (ex: ajustar a numeração automaticamente).
   - Ao clicar em **"Confirmar e Colar"**, a clonagem é executada instantaneamente, a lista é reordenada e os dados são sincronizados no Firebase.

4. **Estilo Visual & Microinterações**:
   - Padrão visual escuro nativo do CFA Academy (`#0a0a0a` / `#131313`) com realce dourado (`#e9c349`).
   - Sem uso de `window.alert` genérico; feedback imediato por meio de toasts visuais estilizados.

---

### 3. Key Product Decisions & Trade-Offs

- **Clonagem Profunda (Deep Copy) vs. Referenciamento Compartilhado**:
  - *Abordagem Escolhida*: Clonagem profunda com novos IDs para o módulo e para cada aula.
  - *Por quê*: Se as aulas fossem compartilhadas pelo mesmo ID, qualquer alteração futura (como trocar o vídeo ou mudar a descrição) no curso pack alteraria também o curso individual original. A clonagem profunda garante 100% de autonomia e segurança.
  - *Trade-off*: Pequeno acréscimo de registros no documento do curso no Firestore, que é totalmente insignificante e seguro dentro dos limites do Firestore.

- **Persistência do Clipboard no `localStorage`**:
  - *Abordagem Escolhida*: Salvar os dados do módulo copiado em `localStorage` com timestamp e metadados.
  - *Por quê*: Permite que o usuário copie em um curso, volte para a lista geral de cursos, crie um novo curso do zero ou abra qualquer outro curso sem perder o que copiou.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Diagrama de Arquitetura & Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────┐
│                  Curso de Origem (Curso A)                   │
│  [Módulo 2: Estratégias Avançadas] ──► [Botão Copiar Módulo] │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│             Área de Transferência (LocalStorage)             │
│  { idOriginal, title, lessons: [...], copiedAt, sourceTitle } │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                 Curso de Destino (Curso B / Pack)            │
│  1. Detecta clipboard ativo -> Exibe barra de colar          │
│  2. Modal de Posicionamento (Início / Final / Intermediário)  │
│  3. Gerador de Clonagem Profunda (Novos IDs únicos)          │
│     - newModId = m_${timestamp}_${rand}                      │
│     - newLessonId = l_${timestamp}_${idx}_${rand}            │
│     - courseId = targetCourseId                              │
│  4. Reordenação e renumeração automática                     │
│  5. Auto-Save sincronizado no Firestore (db.courses)         │
└──────────────────────────────────────────────────────────────┘
```

#### Mapeamento de Estado e Handlers
- `copiedModule`: Estado que lê e escuta o `cfa_copied_module` no `localStorage`.
- `handleCopyModule(module: Module)`: Serializa o módulo com metadados do curso de origem e exibe toast de confirmação.
- `handleClearCopiedModule()`: Remove o item do `localStorage` e limpa o estado.
- `handleOpenPasteModal()`: Abre o modal de colagem e seleção de posição.
- `handleConfirmPasteModule(targetPosition: number, customTitle?: string)`: Executa a clonagem profunda, atualiza o array `modules` no estado do componente, renumera e dispara o auto-save para persistência no Firebase.

#### Verificação e Testes
- Teste de cópia de módulo com 0 aulas e com múltiplas aulas (YouTube e Wistia).
- Teste de colagem no mesmo curso (duplicação) e em cursos diferentes.
- Teste de colagem no início, no meio e no final da lista.
- Validação de compilação sem erros via `compile_applet`.
