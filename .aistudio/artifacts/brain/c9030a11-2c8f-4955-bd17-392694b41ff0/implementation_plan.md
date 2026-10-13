# Blindagem e Controle Rigoroso de Acesso aos Cursos

Este plano estabelece a correção definitiva do controle de acesso a cursos na plataforma CFA Academy, garantindo que **nenhuma conta** (seja de aluno, visitante ou outro produtor) tenha passe livre ou acesso automático a cursos nos quais não possua matrícula explicitamente ativa e aprovada.

---

### Decisões Críticas Alinhadas com o Usuário

> [!IMPORTANT]
> As seguintes regras estritas foram confirmadas para guiar a implementação:
> 1. **Cursos Gratuitos**: Ter uma conta ou clicar no curso gratuito **não** libera o acesso automaticamente. Apenas o administrador tem autorização para vincular o curso à conta do usuário.
> 2. **Tentativa de Acesso Direto à Sala de Aula (`/classroom`)**: Usuários sem matrícula registrada para o curso específico terão o acesso bloqueado imediatamente e serão redirecionados para a página do curso com aviso claro de acesso não autorizado.
> 3. **Isenção de Perfis**: **Nenhum perfil** tem passe livre para assistir cursos sem matrícula registrada na conta. Produtores não têm acesso aos cursos de outros produtores.

---

### 1. Diagnóstico das Vulnerabilidades Identificadas

1. **Vulnerabilidade em `SalesPage.tsx`**:
   - O código verificava `isUserAdmin = userProfile?.role === 'admin' || userProfile?.role === 'producer'`. Isso fazia com que qualquer conta com role `producer` recebesse passe de admin global, exibindo `"Assistir Curso (Acesso Liberado)"` em todos os cursos do catálogo.
   - O botão em cursos com preço zero ou marcados como livres permitia abrir imediatamente a sala de aula sem verificação de matrícula no banco de dados.

2. **Vulnerabilidade em `StudentCatalog.tsx`**:
   - A função `checkUserHasAccess` continha regras frouxas (incluindo checagem de preço zero e auto-inclusão via `handleQuickAddFreeCourse`), exibindo botões de assistir sem que houvesse matrícula confirmada pelo administrador.

3. **Vulnerabilidade em `VideoLibrary.tsx` (Sala de Aulas `/classroom`)**:
   - A página de reprodução carregava o curso a partir do ID da URL (`?courseId=...`) sem verificar se o usuário autenticado possuía uma matrícula válida (`enrollment`) para aquele curso específico, permitindo que qualquer usuário autenticado assistisse a qualquer aula se soubesse ou recebesse o link.

---

### 2. Especificação das Mudanças

#### A. Refatoração do `SalesPage.tsx` (Página Inicial & Vitrine de Cursos)
- **Remoção do bypass de produtor**: Produtores não são considerados administradores com acesso livre aos cursos de outros instrutores.
- **Checagem estrita de matrícula**: O status de "Acesso Liberado" só será exibido se o `course.id` estiver presente na lista de matrículas ativas do usuário (`enrolledCourseIds`).
- **Tratamento de Cursos Gratuitos**:
  - Se o usuário não tiver matrícula registrada, o botão exibirá **"Saiba Mais"** ou direcionará para a página de detalhes do curso, indicando que a matrícula requer liberação pelo administrador.
  - Nunca exibirá "Assistir Curso (Acesso Liberado)" sem matrícula confirmada no banco.

#### B. Refatoração do `StudentCatalog.tsx` (Catálogo do Aluno)
- Atualizar `checkUserHasAccess` para validar estritamente a existência de um documento na coleção `enrollments` com status `active` associado ao `userId` e `courseId`.
- Desativar a auto-matrícula irrestrita para cursos gratuitos, exibindo mensagem informando que o curso necessita de vinculação administrativa ou inscrição formal.

#### C. Guarda de Segurança na Sala de Aula (`VideoLibrary.tsx`)
- Implementar verificação imediata de acesso assim que o `activeCourse` for carregado:
  - Consultar a coleção `enrollments` para o `currentUser.uid` e `activeCourse.id`.
  - Se não houver matrícula ativa:
    1. Bloquear a renderização dos vídeos e materiais.
    2. Disparar notificação visual de alerta: *"Acesso restrito: este curso não está associado à sua conta. Entre em contato com o suporte ou adquira o curso."*
    3. Redirecionar o usuário para a página de vendas/detalhes do curso (`/course/${activeCourse.id}` ou `/`).

#### D. Ajustes no `enrollmentService.ts`
- Padronizar a consulta `checkCourseEnrollment(userId, courseId)` para validação rápida e assíncrona, com cache local por sessão para evitar requisições redundantes no Firestore.

---

### 3. Plano de Verificação e Testes

- [ ] **Teste de Conta de Produtor**: Logar com conta de produtor e verificar que a Home Page **não** exibe "Acesso Liberado" em cursos de outros produtores.
- [ ] **Teste de Curso Gratuito**: Acessar um curso gratuito com usuário autenticado sem matrícula e garantir que ele não entra diretamente na sala de aula.
- [ ] **Teste de Acesso Direto por URL**: Tentar navegar diretamente para `/classroom?courseId=[ID_DE_CURSO_NAO_MATRICULADO]` e verificar o bloqueio com redirecionamento e mensagem de aviso.
- [ ] **Teste de Aluno com Matrícula Válida**: Confirmar que alunos com matrícula ativa no Firestore continuam acessando seus cursos normalmente.
- [ ] **Compilação e Linter**: Executar `compile_applet` para assegurar integridade sintática e ausência de regressões.
