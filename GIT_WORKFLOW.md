# RevisAI — Organização do Git e acompanhamento do Codex

> **Projeto:** RevisAI ("revisa aí")
> **Repositório desejado:** `RevisAI`, público no GitHub
> **Situação atual:** Etapas 0 e 1 aprovadas e concluídas; Etapa 1 na branch `feat/estrutura-inicial`, com commit e publicação autorizados pelo usuário nesta execução.
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
| 0 | `main` (exceção: preparação feita diretamente na branch existente) | Git, README, AGENTS.md e padrões | Concluída |
| 1 | `feat/estrutura-inicial` | Tauri, React, FastAPI, SQLite e interface inicial | Concluída |
| 2 | `feat/projetos-materiais` | Projetos e biblioteca | Não iniciada |
| 3 | `feat/ia-organizacao` | Ollama e sugestão de tópicos | Não iniciada |
| 4 | `feat/resumos-questoes` | Resumos, questões e correção (MVP) | Não iniciada |
| 5 | `feat/revisoes-metas` | Revisões e metas semanais | Não iniciada |
| 6 | `feat/editais-distribuicao` | Editais, OCR e instalador | Não iniciada |

Estados permitidos: **Não iniciada**, **Em andamento**, **Em validação**, **Aguardando aprovação**, **Concluída**, **Bloqueada**. Use **Aguardando aprovação** quando todos os critérios técnicos forem atendidos e faltar a aprovação do usuário; não marque **Concluída** antes dela.

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
| 0 — Git e documentação | Concluída | `main` | `cb1b02c`; `2a5a3fe` (`docs: conclui etapa 0 e organiza estrutura do projeto`) | `git diff --check` passou; `git check-ignore -v` confirmou regras para segredos, banco, dados privados, modelos e builds; sem testes de aplicação | Aprovada pelo usuário em 2026-11-23 |
| 1 — Base desktop | Concluída | `feat/estrutura-inicial` | `b515927cd8e0877eeb6d5e6470d5a21b8f20819c`; [PR #2](https://github.com/augusto-hog/RevisAI/pull/2) aberto para `main` | Backend: 5 testes; frontend: 3 testes; lint, build e `git diff --check` passaram. `.gitignore` validado para dados privados e artefatos. Execução Tauri, janela, tema, navegação, FastAPI, persistência e ausência de erros confirmados manualmente pelo usuário no Windows. | Aprovada pelo usuário em 2026-11-23 |
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
- Pendências e limitações: na sessão de execução, o Git HTTPS não encontrou credenciais; depois, `gh api repos/augusto-hog/RevisAI/branches/main` confirmou remotamente o commit `2a5a3fe`, que também é o `origin/main` local. Não afirmo que o push foi feito por esta sessão.
- Próxima ação: Etapa 0 aprovada; Etapa 1 iniciada na branch dedicada.

### 2026-11-23 — Etapa 1 — Fundação desktop
- Status: Em validação; implementação e testes automatizados executados, aguardando validação do usuário e execução da janela nativa.
- Branch: `feat/estrutura-inicial`, criada a partir da `main` local; o commit `2a5a3fe` coincide com a referência atual consultada na API do GitHub.
- Commit ou PR: não criado, conforme instrução do usuário.
- Implementado: frontend React + TypeScript + Vite + Tailwind, tema escuro inicial e preferência de tema persistida; estado vazio sem dados fictícios; navegação inicial e configurações; API FastAPI local, health check, configurações e migração SQLite; base Tauri 2; documentação de execução e segurança.
- Testes: backend `python -m pytest` — 5 passaram (com aviso de depreciação `TestClient`/httpx); frontend `npm.cmd run test` — 3 passaram; `npm.cmd run lint` e `npm.cmd run build` passaram; `npm.cmd audit` e `npm.cmd audit --omit=dev` — zero vulnerabilidades; integração HTTP confirmou frontend Vite e módulo React com HTTP 200, `/health` com SQLite ativo, CORS da origem Vite, tema inicial escuro, atualização e persistência de tema e listener em `127.0.0.1:8000`; teste de CORS rejeitou origem não permitida; `git diff --check` e a verificação de whitespace dos arquivos novos passaram.
- Verificação manual no Windows: API e Vite iniciados e exercitados por HTTP; inspeção visual pelo navegador não concluída. Janela Tauri não executada.
- Pendências e limitações: Rust/Cargo não instalado neste ambiente; janela nativa e build Tauri não foram validados. `Invoke-WebRequest` OPTIONS e a captura pelo navegador não funcionaram neste ambiente; o preflight foi verificado por `fetch` e a resposta CORS correta foi observada. A consulta de sockets via `Get-NetTCPConnection` foi negada pelo sandbox; `netstat` confirmou o bind em `127.0.0.1`.
- Próxima ação: validar a janela Tauri em ambiente com Rust/MSVC e revisar a etapa. Não iniciar a Etapa 2 sem autorização.

### 2026-11-23 — Etapa 1 — Validação de build e integração
- Status: Em validação; janela desktop e console não puderam ser verificados, então a etapa não está aguardando aprovação final.
- Branch: `feat/estrutura-inicial`, branch local criada nesta execução a partir de `ec18016`; o checkout estava limpo na `main`, sem referência local/remota `feat/estrutura-inicial` após o merge da PR #1.
- Commit ou PR: nenhum criado nesta execução. HEAD existente: `ec18016` (merge da PR #1), que inclui `5a9fde8` (`feat: estrutura inicial`); `origin/main` aponta para `ec18016`.
- Implementado/corrigido: testes FastAPI migrados de `TestClient` para `httpx.AsyncClient` com `ASGITransport`; conexões SQLite agora são fechadas explicitamente; testes frontend verificam tema escuro inicial e navegação Início/Configurações.
- Testes: `backend/.venv/Scripts/python.exe -m pytest -W default` — 5 passaram sem avisos; `npm.cmd run test` — 3 passaram; `npm.cmd run lint` — passou; `npm.cmd run build` — passou (TypeScript e Vite); `git diff --check` — passou. API em `127.0.0.1:8001` retornou health 200, preflight CORS 200 para `127.0.0.1:1421` e configuração `dark` após atualização e reinício; Vite em `127.0.0.1:1421` respondeu HTTP 200.
- Verificação manual no Windows: MSVC Build Tools 18 instalado e `cl.exe` executado (19.51.36260); Windows SDK 10.0.26100 e WebView2 Runtime 157.0.4341.60 encontrados. Inspeção visual e janela nativa pendentes; o acesso automatizado ao navegador não estava disponível. Build Tauri, executado da raiz, falhou em `cargo metadata` porque Cargo/Rust não estão instalados. As portas 1420 e 8000 já estavam ocupadas; os processos existentes não foram encerrados.
- Pendências e limitações: disponibilizar Rust com alvo MSVC e validar build/`tauri dev`, janela, aparência visual e console. Tema e navegação foram cobertos por testes automatizados, não por inspeção da janela nativa. Não foi possível declarar os critérios da Etapa 1 atendidos.
- Próxima ação: instalar/configurar Rust/Cargo no ambiente e repetir build e execução Tauri; validar visualmente antes de pedir aprovação. Não iniciar a Etapa 2.

### 2026-11-23 — Etapa 1 — Caminhos Tauri após reorganização
- Status: Em validação; não houve confirmação de compilação ou execução da janela Tauri.
- Branch: `feat/estrutura-inicial`; checkout no diretório raiz do RevisAI. A branch local permanece na base `ec18016`, compartilhada com `origin/main`.
- Commit ou PR: nenhum novo commit ou PR nesta execução; commits visíveis: `ec18016` (HEAD e `origin/main`), `5a9fde8` (`feat: estrutura inicial`) e `2a5a3fe` (Etapa 0).
- Implementado/corrigido: validada a estrutura `frontend/src-tauri`; `beforeDevCommand.cwd` e `beforeBuildCommand.cwd` em `..` resolvem para `frontend/`; `frontendDist` em `../dist` resolve para `frontend/dist/`. O comando de desenvolvimento documentado agora usa `frontend/src-tauri/tauri.conf.json`. `.gitignore` cobre o target Tauri nessa localização e ESLint ignora `**/target/**`, evitando lint em JavaScript gerado.
- Testes: resolução PowerShell confirmou `package.json`, `frontend/dist/index.html` e `frontend/src-tauri/Cargo.toml`; Vite iniciado do `cwd` `frontend`, porta isolada 1422, serviu HTTP 200 e foi encerrado; backend `pytest -W default` — 5 passaram sem avisos; frontend `npm.cmd run test` — 3 passaram; `npm.cmd run lint` — passou após ignorar artefatos `target`; `npm.cmd run build` — passou; `npm.cmd run tauri -- build --debug --no-bundle --config .\src-tauri\tauri.conf.json` reconheceu o projeto, mas parou em `cargo metadata` antes dos hooks porque Cargo não está instalado; `git diff --check` — passou.
- Verificação manual no Windows: build de assets frontend passou; janela nativa não foi aberta. Não houve inspeção de console da janela.
- Pendências e limitações: instalar/configurar Rust/Cargo com alvo MSVC e repetir o build e `tauri dev`. A Etapa 1 deve permanecer em validação até a execução real da janela Tauri.
- Próxima ação: disponibilizar Rust/Cargo e validar a janela; não iniciar a Etapa 2.

### 2026-11-23 — Etapa 1 — Ícones Windows do Tauri
- Status: Em validação; o arquivo ausente foi gerado, mas build e execução da janela seguem sem validação.
- Branch: `feat/estrutura-inicial`, diretório principal do repositório.
- Commit ou PR: nenhum novo commit ou PR. HEAD atual `ec18016`; commits anteriores visíveis `5a9fde8` e `2a5a3fe`.
- Implementado/corrigido: inspecionada `frontend/src-tauri` e confirmado que não havia diretório `icons`; criada arte vetorial provisória do RevisAI e usada a CLI oficial `npm.cmd run tauri -- icon .\src-tauri\icons\revisai-provisional.svg --output .\src-tauri\icons`. O conjunto gerado inclui `icon.ico` e PNGs/ícones de plataformas suportadas.
- Testes: comando oficial de geração de ícones passou; `Test-Path` confirmou `frontend/src-tauri/icons/icon.ico` (15.678 bytes); `git check-ignore` confirmou que os ícones não são ignorados. `cargo check --manifest-path .\src-tauri\Cargo.toml` falhou porque `cargo` não é reconhecido neste executor; `npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json` parou em `cargo metadata` (“program not found”). `git diff --check` passou.
- Verificação manual no Windows: ícone conferido visualmente; a janela Tauri não foi compilada nem aberta. O diretório `frontend/src-tauri` está não rastreado no estado atual; nenhum arquivo foi staged ou commitado.
- Pendências e limitações: Rust/Cargo não estão acessíveis no executor. Os ícones não estão ainda no HEAD/index; devem ser incluídos em commit futuro autorizado junto com a estrutura Tauri. Não foi possível confirmar correção total do build nem execução da janela.
- Próxima ação: executar `cargo check` e `tauri dev` em ambiente com Rust/Cargo, revisar a janela e manter Etapa 1 em validação até essa confirmação. Não iniciar Etapa 2.

### 2026-11-23 — Etapa 1 — EBUSY do watcher Vite durante build Rust
- Status: Em validação; a falha do watcher foi corrigida e testada, mas não houve abertura da janela Tauri.
- Branch: `feat/estrutura-inicial`, no diretório principal.
- Commit ou PR: nenhum novo; HEAD `ec18016` (`origin/main`), seguido no histórico por `5a9fde8` e `2a5a3fe`.
- Implementado/corrigido: `frontend/vite.config.ts` agora exclui `**/src-tauri/target/**` do watcher para o Vite não tentar observar DLLs que o Cargo mantém bloqueadas durante a compilação.
- Testes: frontend `npm.cmd run test` — 3 passaram; `npm.cmd run lint` — passou; `npm.cmd run build` — passou. Regressão: mantive `revisai_lib.dll` aberta com `FileShare.None`, iniciei Vite em `127.0.0.1:1420`, confirmei pronto e HTTP 200, e encerrei ambos os processos. `git diff --check` — passou. `cargo check` e Tauri dev ainda falham antes da compilação porque Cargo não está disponível neste executor.
- Verificação manual no Windows: o log do usuário confirmou `EBUSY` tentando observar `frontend/src-tauri/target/.../revisai_lib.dll`; a reprodução local com arquivo bloqueado não repetiu o erro após a exclusão. A janela não foi aberta.
- Pendências e limitações: executar novamente `npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json` no VS Code do usuário, onde Rust/Cargo estão instalados, e confirmar janela e console. Não iniciar Etapa 2.
- Próxima ação: aguardar validação real da janela e manter Etapa 1 em validação até então.

### 2026-11-23 — Etapa 1 — Aprovação e encerramento
- Status: Concluída após aprovação explícita do usuário.
- Branch: `feat/estrutura-inicial`, no diretório principal; HEAD inicial desta execução `ec18016` (`origin/main`).
- Commit ou PR: commit `b515927cd8e0877eeb6d5e6470d5a21b8f20819c` (`feat: conclui fundacao desktop do RevisAI`), enviado a `origin/feat/estrutura-inicial`; [PR #2](https://github.com/augusto-hog/RevisAI/pull/2) está aberto contra `main` e com estado `CLEAN`. O PR #1 anterior está merged e pertence à entrega anterior. Nenhum merge foi executado.
- Implementado: fundação Tauri 2 + React/TypeScript/Vite/Tailwind + FastAPI/SQLite, interface escura, navegação, configurações persistentes, ícones Tauri e exclusão dos artefatos Cargo do watcher Vite.
- Testes: `backend\.venv\Scripts\python.exe -m pytest -W default` — 5 passaram; `npm.cmd run test` — 3 passaram; `npm.cmd run lint` — passou; `npm.cmd run build` — passou (TypeScript e Vite); `git diff --check` e `git diff --cached --check` — passaram. `.gitignore` verificado para `.env`, banco SQLite, diretórios privados/materiais, modelos, `node_modules`, `.venv`, `frontend/src-tauri/target` e schemas gerados; ícones e arquivos de configuração Tauri permanecem versionáveis.
- Verificação manual no Windows: o usuário confirmou `revisai.exe`, janela sem erros, tema escuro, navegação, conexão FastAPI, persistência das preferências após reiniciar e ausência de erros durante uso.
- Pendências e limitações: `cargo check` não pôde ser executado neste executor porque Cargo não está no PATH; o usuário confirmou manualmente a compilação/execução e os critérios visuais no Windows. `gh auth status` e `git ls-remote origin HEAD` passaram fora do sandbox; nenhuma credencial foi copiada ou alterada. Nenhum problema pendente de implementação foi identificado.
- Próxima ação: aguardar revisão do PR #2; não fazer merge nem iniciar a Etapa 2 sem autorização.
