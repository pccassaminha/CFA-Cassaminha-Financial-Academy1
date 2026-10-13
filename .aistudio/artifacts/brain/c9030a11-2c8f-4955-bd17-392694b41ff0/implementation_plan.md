# Plano de Implementação: Redirecionamento Direto e Exibição de Desconto por Cupom Ativo

## 1. Visão Geral
Este plano atende a dois objetivos solicitados:
1. **Redirecionamento Direto e Silencioso da Sala de Aula**: Quando um usuário tentar acessar diretamente a sala de aula (`/classroom?courseId=...`) de um curso que não possui matriculado na sua conta, a plataforma eliminará a tela de aviso de acesso restrito e o contador regressivo de 5 segundos, redirecionando-o imediatamente e de forma silenciosa para a página de apresentação do curso (`/library/:slug`), onde poderá efetuar a compra ou inscrição.
2. **Exibição Dinâmica do Preço com Desconto na Área Administrativa**: Na área administrativa (tanto no editor de cursos como na listagem/cards de cursos e modais de criação), ao precificar um curso, o sistema verificará se existe um cupom de desconto ativo (global ou específico para o curso). Se houver cupom ativo, será exibido o preço com desconto aplicado juntamente com o código do cupom. Caso não haja cupom ativo, será exibido apenas o preço único original.

---

## 2. Modificações Propostas

### A. Utilitário Compartilhado de Desconto (`src/utils/discountUtils.ts`)
- Criar/centralizar a função utilitária `getCourseDiscountInfo(courseOrPrice, coupons, courseId?)` para calcular descontos baseados nos cupons ativos do Firestore (`settings/coupons` ou `coupons`).
- Retornar:
  - `hasDiscount: boolean`
  - `originalPrice: number`
  - `discountedPrice: number`
  - `couponCode: string | null`
  - `discountValue: number`
  - `discountType: 'percentage' | 'fixed'`

### B. Sala de Aula (`src/pages/VideoLibrary.tsx`)
- **Remover Tela de Acesso Restrito e Contador de 5s**: Eliminar o bloco visual que mostrava "Acesso Restrito - Curso Não Associado à Sua Conta" com contagem regressiva e botões manuais.
- **Redirecionamento Instantâneo**: No `useEffect`, assim que o status de matrícula for carregado e constatar que o usuário não possui o curso, executar `navigate('/library/' + courseSlug, { replace: true })` imediatamente.
- **Estado de Transição**: Exibir apenas um spinner discreto durante o milissegundo de transição, levando o usuário diretamente à página do produto para compra.

### C. Editor de Cursos Administrativo (`src/components/CourseEditor.tsx`)
- Carregar os cupons ativos no carregamento do editor.
- Na caixa **"Tipo de Acesso & Preço"**:
  - Quando o curso for pago (`priceType === 'paid'`), ao lado ou abaixo do campo de entrada de preço, exibir um indicador dinâmico caso haja cupom ativo:
    - *Com cupom ativo*: Exibe o badge informativo com o código do cupom, porcentagem/valor de desconto e o valor final com desconto (ex: `🏷️ Preço com Cupom Ativo (CFA75 • -75%): 12.500 Kz`).
    - *Sem cupom ativo*: Exibe apenas o campo de preço único padrão sem poluição visual.

### D. Listagem e Modais de Cursos (`src/components/CoursesList.tsx`)
- Carregar cupons ativos em `CoursesList`.
- **Nos Cards de Cursos**:
  - Se o curso tiver cupom ativo, exibir o preço original tachado ao lado do preço com desconto destacado com badge do cupom.
  - Se não houver cupom ativo, exibir apenas o preço normal em Kz.
- **No Modal de Criação / Edição Rápida de Curso**:
  - Logo abaixo do campo *"Preço da Matrícula"*, calcular em tempo real e exibir o preço com desconto resultante do cupom ativo.

---

## 3. Critérios de Verificação
- [ ] Tentar acessar `/classroom?courseId=ID_NAO_MATRICULADO` e verificar que o redirecionamento para `/library/slug` ocorre imediatamente, sem tela de bloqueio nem contagem regressiva.
- [ ] No painel administrativo (`/content`), abrir o editor de curso pago e verificar o cálculo em tempo real do preço com desconto caso haja cupom ativo.
- [ ] Criar/editar preço na lista de cursos e verificar o preço com desconto exibido nos cards e no modal.
- [ ] Desativar temporariamente o cupom ou testar sem cupom para confirmar que apenas o preço único é exibido.
- [ ] Compilação (`compile_applet`) e verificação de linter (`lint_applet`) sem erros.
