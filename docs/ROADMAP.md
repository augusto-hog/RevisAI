# RevisAI — roadmap

As Etapas 0, 1 e 2 foram aprovadas e estao concluidas. A Etapa 2 foi validada na branch `feat/biblioteca-estudos`, incluindo hierarquia, reordenacao, biblioteca e persistencia após reiniciar. Backend: 23 testes; frontend: 11 testes; lint, TypeScript, build e migracoes em SQLite temporario passaram. Alembic esta na revisao `0004_project_kind`. Foram exercitados PDF, DOCX, TXT, PNG e JPG; textos foram exibidos para PDF/DOCX, imagens informaram que OCR sera futuro, e PDF corrompido foi rejeitado. O usuario confirmou a persistencia após reiniciar o aplicativo. A Etapa 3 continua planejada e nao foi iniciada. Cada etapa deve ser revisada antes da seguinte. As regras permanentes estao em [`AGENTS.md`](../AGENTS.md); o roteiro completo esta em [`CODEX_PLANO.md`](../CODEX_PLANO.md).

## Etapa 1 — Fundação desktop — Concluída

Implementar a base Tauri 2 + Vite + React + TypeScript, Tailwind CSS e interface escura acessível; backend FastAPI + SQLite; organização `frontend/`, `backend/`, `src-tauri/` e `docs/`. Criar `/api/v1/health`, diretório local de dados, inicialização segura do SQLite e primeira migração. A API deve escutar apenas em `127.0.0.1`. A janela terá navegação para Início, Meus Estudos, Revisões, Metas e Configurações, além de estado vazio real, status do backend e acesso às configurações. Documentar execução separada de frontend, backend e desktop e proteção das chamadas locais antes da distribuição. Não implementar biblioteca ou IA.

**Aceite:** janela abre em tema escuro; endpoint de saúde responde; SQLite é criado no diretório local; dados e configurações persistem; testes básicos passam.

## Etapa 2 — Projetos e biblioteca

Criar projetos e a hierarquia Projeto -> Disciplina -> Assunto -> Topico, com CRUD, reordenacao e persistencia SQLite/Alembic. A Etapa 2 foi aprovada pelo usuario. A biblioteca importa PDF, DOCX, TXT, PNG, JPG e JPEG, valida extensao e conteudo, aplica limite configuravel, armazena localmente, registra metadados e SHA-256, deduplica blobs entre projetos e exclui associacoes com seguranca. Extrai texto com PyMuPDF/python-docx e preserva separacao de paginas PDF quando possivel. PDF sem texto fica marcado para OCR futuro; imagens sao registradas sem OCR. Migrações aditivas preservam bancos existentes. A interface oferece Meus Estudos, CRUD e reordenacao da hierarquia, biblioteca por projeto, consulta de texto e confirmacoes de exclusao. Validacao: 23 testes backend, 11 frontend, lint, TypeScript, build, migracoes SQLite temporarias e verificacoes manuais no Windows aprovados. A Etapa 2 esta Concluida. A Etapa 3 permanece planejada e nao foi iniciada.

**Aceite:** criar o projeto Estoicismo, importar três documentos, ver seus estados e consultar o texto extraído; PDFs escaneados exibem um aviso claro.

## Etapa 3 — Ollama e organização do estudo

Integrar Ollama local com no máximo uma inferência pesada simultânea. Detectar conexão, listar e selecionar modelos; considerar Qwen3 4B sem download automático. Informar indisponibilidade de Ollama ou do modelo. Sugerir tópicos a partir dos textos extraídos, recuperando trechos pertinentes e limitando o contexto. Validar com Pydantic JSON contendo título, ordem, descrição e referências rastreáveis. Apresentar proposta editável antes de salvar. Sem evidência suficiente, avisar sem inventar fontes. Tratar documentos como entrada não confiável. Testar com cliente Ollama simulado e documentar limites no hardware-alvo.

**Aceite:** materiais do exemplo Estoicismo produzem uma proposta editável que o usuário pode aprovar; sugestões aprovadas persistem sem sobrescrever edições posteriores.

## Etapa 4 — Resumos e questões (MVP)

Ao abrir um tópico, permitir gerar resumo didático em português, com conceitos, exemplos e síntese, usando apenas trechos pertinentes dos materiais do projeto. Exibir referências e páginas disponíveis; sinalizar conhecimento geral como `Complemento da IA`. Salvar versões sem apagar as anteriores. Permitir gerar 5 ou 10 questões objetivas de múltipla escolha (quatro alternativas e uma correta) ou certo/errado. Validar a saída estruturada com Pydantic, alternativas, respostas, justificativas e referências. Registrar tentativas; só exibir gabarito após confirmação; calcular acertos, explicar erros e permitir sinalizar questão ruim. Não incluir correção discursiva, flashcards, casos práticos, concurso, notificações ou dashboards complexos. Testar fluxos com mocks, documentar validação manual com três materiais e manter uso offline quando Ollama e modelo estiverem disponíveis.

**Aceite:** selecionar tópico, gerar resumo, responder dez questões, consultar gabarito e explicações e encontrar histórico após reiniciar.

## Etapa 5 — Revisões e metas semanais

Registrar tentativas por questão e tópico. Classificar tópicos como não iniciado, em aprendizado, revisar ou consolidado com número mínimo de tentativas. Criar fila `Revisar agora` priorizando baixo aproveitamento e revisões vencidas, com agenda inicial de 1, 3 e 7 dias ajustável. Permitir novas rodadas sem reutilizar imediatamente a mesma questão quando houver alternativas. Oferecer meta semanal de minutos estudados ou sessões, registrando conclusão real sem presumir tempo ativo pela janela aberta. Exibir progresso semanal persistente e permitir estudar sem meta. Testar datas, histórico e persistência após reinício.

**Aceite:** erros alimentam a fila; uma sessão atualiza o progresso; metas persistem e não contabilizam tempo ocioso automaticamente.

## Etapa 6 — Editais, OCR e distribuição

Importar edital PDF e sugerir lista editável de assuntos, separando conteúdo programático de outras seções; não inventar quando a identificação falhar. Adicionar OCR local sob demanda para PDFs escaneados e imagens JPG/PNG, informando estados e limitações. Criar backup e restauração local com verificação básica de integridade. Executar testes de regressão e desempenho em Windows com 16 GB de RAM e sem GPU dedicada, registrando apenas medidas realizadas. Empacotar backend Python como sidecar Tauri com gestão segura de ciclo de vida; Ollama pode continuar como dependência separada, com instruções guiadas. Gerar instalador Windows e testá-lo em máquina limpa quando possível. Atualizar README com instalação verificada, capturas reais, limitações e roadmap executado. Não publicar release nem criar tags sem confirmação explícita.

**Aceite:** editar assuntos do edital, verificar OCR em exemplo local e backup/restauração; validar instalador ou registrar explicitamente impedimentos.
