# RevisAI — Organização do Git e acompanhamento do Codex

> **Projeto:** RevisAI ("revisa aí")
> **Repositório desejado:** `RevisAI`, público no GitHub
> **Situação atual:** repositório local em `main`; Etapa 0 aprovada pelo usuário e concluída. O acesso autenticado ao remoto ainda não foi verificado com sucesso.
> **Fonte de requisitos:** [`CODEX_PLANO.md`](./CODEX_PLANO.md)
> **Apresentação do portfólio:** [`README.md`](./README.md)

Este documento é a referência operacional para o **Git**, o **GitHub** e o **controle do progresso do Codex**. Deve evoluir junto ao projeto. Ele não comprova, por si só, que alguma etapa foi concluída.

## 1. Regras gerais

1. A branch `main` representa apenas código revisado e aprovado.
2. Desenvolva uma etapa de cada vez, em uma branch `feat/` ou `docs/` própria.
3. **Não crie worktrees automaticamente.** Trabalhe no mesmo diretório do projeto.
4. O Codex deve verificar a branch, `git status` e o diff antes de modificar arquivos.
5. O Codex **não deve executar `git commit`, `git push`, criar PRs, fazer merge, excluir branches ou criar releases sem autorização expressa**.
6. Nunca inclua no Git arquivos `.env` com segredos, documentos privados de estudo, editais de terceiros, banco de dados com dados pessoais, modelos locais, caches ou builds.
7. Não atualize o README como se uma funcionalidade planejada já estivesse pronta; registre apenas o que foi validado.
8. Ao finalizar cada etapa, atualize a tabela de progresso e o diário deste arquivo, **mas marque como concluído somente aquilo que foi realmente testado**.
9. Registre resultados de testes, limitações, decisões de arquitetura e pendências, sem inventar saídas ou medições.
10. Mantenha commits pequenos e com propósito claro, usando Conventional Commits.

## 2. Configuração inicial (uma única vez)

Abra o PowerShell na pasta do RevisAI:

```powershell
cd "$HOME\Documents\RevisAI"
git --version
git status
```

Se ainda não for um repositório Git:

```powershell
git init -b main
```

Confirme se `README.md`, `CODEX_PLANO.md`, `GIT_WORKFLOW.md` e o `.gitignore` estão presentes. **Antes do primeiro commit, crie e revise o `.gitignore`** para Node, Python, Rust/Tauri, bancos locais, documentos privados e modelos de IA.

Verifique a identidade do Git:

```powershell
git config user.name
git config user.email
```

Se estiverem vazias, configure com seus próprios dados (não use exemplos fictícios):

```powershell
git config --global user.name "SEU NOME"
git config --global user.email "SEU EMAIL"
```

Depois de revisar o conteúdo e garantir que não há dados privados:

```powershell
git add README.md CODEX_PLANO.md GIT_WORKFLOW.md .gitignore AGENTS.md
git diff --cached --stat
git diff --cached
git commit -m "docs: inicia documentacao do RevisAI"
```

> Caso `AGENTS.md` ainda não exista, execute a Etapa 0 do `CODEX_PLANO.md` primeiro. `git add` de um arquivo inexistente falhará.

### Criar o repositório no GitHub

Com [GitHub CLI](https://cli.github.com/) instalado e autenticado:

```powershell
gh auth login
gh repo create RevisAI --public --source=. --remote=origin --push --description "Aplicativo desktop para organizar estudos e revisoes com IA local"
git remote -v
```

**Atenção:** `gh repo create` cria um repositório público e `--push` envia código para o GitHub. Execute somente depois de revisar os arquivos e autorizar a publicação. Se o remoto `origin` já existir, não execute o comando novamente; investigue com `git remote -v`.

Alternativa: crie um repositório vazio `RevisAI` no site do GitHub, sem gerar um novo README, e então configure o `origin` com o endereço fornecido pelo GitHub.

## 3. Branches por etapa

| Etapa | Nome sugerido da branch | Entrega | Estado |
|---|---|---|---|
| 0 | `main` (exceção: preparação feita diretamente na branch existente) | Git, README, AGENTS.md e padrões | Em validação |
| 1 | `feat/base-desktop` | Tauri, React, FastAPI e SQLite | Não iniciada |
| 2 | `feat/projetos-materiais` | Projetos e biblioteca | Não iniciada |
| 3 | `feat/ia-organizacao` | Ollama e sugestão de tópicos | Não iniciada |
| 4 | `feat/resumos-questoes` | Resumos, questões e correção (MVP) | Não iniciada |
| 5 | `feat/revisoes-metas` | Revisões e metas semanais | Não iniciada |
| 6 | `feat/editais-distribuicao` | Editais, OCR e instalador | Não iniciada |

Estados permitidos: **Não iniciada**, **Em andamento**, **Em validação**, **Concluída**, **Bloqueada**. Não marque `Concluída` antes da aprovação após testes.

Se a Etapa 0 já foi preparada diretamente na `main`, não é necessário recriar seu histórico: documente essa exceção no diário.

### Início de cada etapa

```powershell
git switch main
git pull --ff-only
git switch -c feat/base-desktop
```

Substitua o nome pela branch correspondente. Para a Etapa 0, use `docs/configuracao-inicial` se ainda não tiver criado o commit inicial. Se `main` ainda não tiver remoto, **não execute** `git pull`; confirme com `git remote -v`.

Antes de pedir mudanças ao Codex:

```powershell
git branch --show-current
git status --short
```

Caso haja alterações não relacionadas, resolva-as antes. Não descarte arquivos sem revisá-los.

## 4. Durante a implementação com Codex

Em cada etapa:

1. Diga ao Codex qual etapa do `CODEX_PLANO.md` será executada.
2. Instrua-o a permanecer na branch e no diretório atuais.
3. Peça um plano curto antes das alterações e a implementação **apenas do escopo da etapa**.
4. Peça testes, lint e typecheck aplicáveis, com resultados reais.
5. Revise os critérios de aceite e teste a aplicação manualmente no Windows.
6. Corrija problemas na mesma branch antes de avançar.
7. Atualize a seção **Registro de progresso** deste documento e o README, se a funcionalidade tiver sido efetivamente validada.
8. Somente com autorização, faça commit, push, PR e merge.

### Prompt permanente para o Codex

```text
Você está trabalhando no projeto RevisAI.
Antes de editar qualquer arquivo, leia CODEX_PLANO.md, GIT_WORKFLOW.md,
README.md e AGENTS.md (se existir). Confirme diretório, branch e git status.
Execute somente a etapa solicitada. Não crie worktrees, branches, commits,
pushes, PRs, merges ou releases sem minha autorização explícita.
Ao terminar, execute os testes possíveis; informe os critérios de aceite
realmente validados, as pendências e o git diff --stat.
Atualize GIT_WORKFLOW.md com evidências da etapa e estado correto.
Atualize README.md apenas com recursos realmente concluídos.
Não registre como aprovado algo que eu ainda não validei.
```

## 5. Fechar uma etapa: verificação, commit e PR

Após testar e autorizar o commit:

```powershell
git status
git diff --check
git diff --stat
git add -A
git diff --cached --stat
git diff --cached
git commit -m "feat: cria estrutura desktop inicial"
git push -u origin feat/base-desktop
```

**Importante:** `git add -A` inclui todos os arquivos não ignorados. Leia o diff staged antes de executar o commit. Troque a mensagem e o nome da branch conforme a etapa. Se houver arquivos pessoais, remova-os do stage e revise o `.gitignore`.

Para abrir um pull request (com aprovação do usuário):

```powershell
gh pr create --base main --head feat/base-desktop --title "feat: estrutura desktop inicial" --body "Implementa e valida a Etapa 1 do RevisAI."
```

Depois da revisão e dos testes, faça o merge pelo GitHub ou GitHub CLI **somente quando autorizado**. Depois atualize o checkout local:

```powershell
git switch main
git pull --ff-only
```

Não exclua branches automaticamente. Para correções pontuais, use `fix/descricao-curta`; para documentação, `docs/descricao-curta`.

### Convenção de commits

- `docs:` documentação e README.
- `feat:` funcionalidade nova.
- `fix:` correção de erro.
- `test:` testes.
- `refactor:` melhoria estrutural sem mudança funcional.
- `chore:` dependências e manutenção.

Exemplos: `feat: importa arquivos PDF`, `fix: corrige persistencia de respostas`, `docs: atualiza instalacao Windows`.

## 6. Como atualizar o README para portfólio

Ao concluir e validar uma etapa:

- Atualize o item correspondente no roadmap de `[ ]` para `[x]`.
- Acrescente comandos de execução **testados**.
- Descreva funcionalidades comprovadamente funcionando.
- Insira screenshots **reais**, se disponíveis, em `docs/screenshots/`.
- Documente decisões técnicas e desafios superados, sem divulgar dados privados.
- Mantenha instruções de instalação e requisitos de hardware atualizados.
- Não publique chaves, documentos pessoais, material de prova de terceiros ou dados de estudo.

Evite frases como “totalmente pronto” ou “100% offline” sem testar todo o fluxo.

## 7. Registro de progresso (atualizar a cada etapa)

| Etapa | Status | Branch real | Commit/PR | Testes executados | Validação do usuário |
|---|---|---|---|---|---|
| 0 — Git e documentação | Concluída | `main` | `cb1b02c` (base); `docs: conclui etapa 0 e organiza estrutura do projeto` criado nesta execução | `git diff --check` passou; `git check-ignore -v` confirmou regras para segredos, banco, dados privados, modelos e builds; sem testes de aplicação | Aprovada pelo usuário em 2026-11-23 |
| 1 — Base desktop | Não iniciada | — | — | — | Pendente |
| 2 — Materiais | Não iniciada | — | — | — | Pendente |
| 3 — IA local | Não iniciada | — | — | — | Pendente |
| 4 — Resumos e questões | Não iniciada | — | — | — | Pendente |
| 5 — Revisões e metas | Não iniciada | — | — | — | Pendente |
| 6 — Editais e distribuição | Não iniciada | — | — | — | Pendente |

### Diário de alterações

Registre uma entrada quando o Codex concluir seu trabalho em uma etapa. Use este modelo e preserve as entradas anteriores:

```markdown
### AAAA-MM-DD — Etapa N — Título
- Status: Em validação / Concluída / Bloqueada
- Branch: nome-real-da-branch
- Commit ou PR: hash/link real, ou "não criado"
- Implementado: funcionalidades efetivamente presentes
- Testes: comandos executados e resultados observados
- Verificação manual no Windows: aprovada / pendente / falhou
- Pendências e limitações: ...
- Próxima ação: ...
```

### 2026-11-23 — Preparação documental
- Status: Documentação inicial preparada; implementação e repositório remoto não verificados.
- Arquivos de referência: `README.md`, `CODEX_PLANO.md`, `GIT_WORKFLOW.md`.
- Testes: não aplicáveis; nenhum comando Git foi executado no computador do usuário.
- Próxima ação: concluir Etapa 0, revisar `.gitignore`, criar repositório e validar o primeiro commit.

## 8. Prompt de atualização para usar após cada etapa

Copie e cole no Codex substituindo `[N]`:

```text
Concluímos a implementação da Etapa [N] do RevisAI e precisamos registrar
exatamente o que aconteceu. Confira CODEX_PLANO.md e GIT_WORKFLOW.md,
inspecione git status, branch atual e git diff. Execute os testes disponíveis
e compare o resultado com os critérios de aceite.
Atualize em GIT_WORKFLOW.md a tabela de progresso e acrescente uma entrada
datada no Diário de alterações. Registre apenas fatos verificados: arquivos,
testes, branch, commits e PRs reais, pendências e limitações. Se a validação
manual do usuário estiver pendente, use status "Em validação", jamais
"Concluída". Atualize o README somente com funcionalidades já verificadas.
Não faça commit, push, PR nem merge automaticamente.
Mostre um resumo das alterações propostas para minha revisão.
```

## 9. Continuidade entre conversas

O Codex pode ler este arquivo dentro do repositório. **Esta conversa não monitora automaticamente o Git ou os passos executados no Codex.** Para eu atualizar o documento aqui, envie o `git status`, o resumo da etapa ou os arquivos alterados. Se o Codex tiver acesso ao repositório, ele próprio poderá manter `GIT_WORKFLOW.md` atualizado conforme o prompt anterior.

### 2026-11-23 — Etapa 0 — Documentação e organização do repositório
- Status: Concluída após aprovação explícita do usuário.
- Branch: `main` (preparação executada diretamente na branch existente, conforme exceção da seção 3).
- Commit ou PR: commit-base `cb1b02c` (`docs: inicia projeto RevisAI`); commit local `docs: conclui etapa 0 e organiza estrutura do projeto` criado nesta execução. Nenhum PR criado.
- Implementado: README para portfólio, regras permanentes em `AGENTS.md`, `.gitignore` para ferramentas e dados locais e `docs/ROADMAP.md` com escopo e critérios de aceite das etapas 1 a 6.
- Testes: `git diff --check` sem erros; `git check-ignore -v` confirmou padrões para `.env`, banco SQLite, diretórios privados/materiais, modelos locais, `node_modules` e builds Tauri. Nenhum teste de aplicação se aplica à etapa documental.
- Verificação manual no Windows: documentação aprovada pelo usuário em 2026-11-23.
- Pendências e limitações: `gh auth status` falhou porque o token está inválido; `git ls-remote origin HEAD` falhou por falta de credenciais. O remoto existente é `https://github.com/augusto-hog/RevisAI.git`; push pendente até autenticação e acesso funcionarem.
- Próxima ação: reautenticar com `gh auth login -h github.com` e, após confirmar acesso, enviar o commit local para `origin/main`. A Etapa 1 não foi iniciada.