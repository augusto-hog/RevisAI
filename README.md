# RevisAI

**Estude. Pratique. Revise.**

RevisAI é um projeto pessoal de portfólio: um aplicativo desktop para Windows que pretende ajudar estudantes e candidatos a concursos a organizar os estudos, praticar e revisar assuntos com apoio de inteligência artificial local.

> **Status:** Etapas 0, 1 e 2 concluídas e aprovadas. A Etapa 2 foi validada no Windows, incluindo projetos, hierarquia, biblioteca local e persistência após reinício. A Etapa 3 e os recursos de IA continuam planejados.

## Objetivo

Ajudar a manter o foco no que estudar e revisar, priorizando materiais fornecidos pelo usuário e mantendo dados e processamento no computador. A internet poderá ser necessária para instalação e recursos futuros.

## Funcionalidades disponíveis

- **Meus Estudos:** criar, editar, abrir e excluir projetos; organizar disciplinas, assuntos e tópicos com controles de ordem.
- **Biblioteca local:** importar PDF, DOCX, TXT, PNG, JPG e JPEG; consultar metadados e texto extraído; os arquivos permanecem no diretório local de dados do usuário.
- **Extração:** texto extraído de PDF, DOCX e TXT. PDFs sem texto e imagens indicam que OCR ainda não está disponível.
- **Persistência:** projetos, hierarquia, materiais e preferências ficam no SQLite local; os arquivos importados são armazenados localmente e deduplicados por hash entre projetos.
- **Configurações:** alternar tema claro/escuro e consultar o diretório de dados local.

## Funcionalidades planejadas

- **Ollama e organização assistida:** sugerir assuntos e tópicos a partir dos materiais (Etapa 3).
- **Materiais:** OCR local para documentos digitalizados e imagens (Etapa 6).
- **Organização:** sugerir assuntos e tópicos com base nos materiais ou no conteúdo programático de um edital.
- **Resumos:** gerar explicações didáticas, um tópico por vez, priorizando os documentos enviados.
- **Questões:** criar questões de múltipla escolha e certo/errado, com gabarito comentado.
- **Revisões:** registrar erros, identificar pontos fracos e sugerir assuntos para revisar.
- **Metas semanais:** acompanhar sessões de estudo e progresso.
- **Privacidade:** manter os dados no computador e evitar dependência de serviços pagos para as funções principais.

## Stack prevista

| Camada | Tecnologia |
|---|---|
| Aplicativo desktop | Tauri 2 |
| Frontend | React, TypeScript e Vite |
| Interface | Tailwind CSS e shadcn/ui |
| Backend local | Python e FastAPI |
| Banco de dados | SQLite |
| IA local | Ollama, com modelo configurável |
| Documentos | PyMuPDF, python-docx e OCR local em etapa futura |
| Versionamento | Git e GitHub |

Modelos e ferramentas de OCR serão avaliados no hardware-alvo: Windows, 16 GB de RAM e sem GPU dedicada.

## Fluxo planejado

1. Criar um projeto de estudo, como **Estoicismo**.
2. Adicionar materiais de referência.
3. Revisar e editar uma sugestão de tópicos.
4. Estudar um tópico com um resumo ou explicação.
5. Responder questões e consultar o gabarito comentado.
6. Usar os erros para orientar revisões e acompanhar uma meta semanal.

Em projetos de concurso, a estrutura extraída do edital deverá ser revisada pelo usuário antes de ser usada.

## Roadmap

- [x] **Etapa 0:** repositório, documentação e padrões de trabalho.
- [x] **Etapa 1:** base Tauri + React + FastAPI + SQLite e interface escura — concluída e aprovada.
- [x] **Etapa 2:** projetos, hierarquia e biblioteca local — concluída e aprovada.
- [ ] **Etapa 3:** integração com Ollama e organização de tópicos.
- [ ] **Etapa 4:** geração de resumos, questões e correções.
- [ ] **Etapa 5:** revisão de pontos fracos e metas semanais.
- [ ] **Etapa 6:** leitura de editais, OCR, testes e instalador Windows.

O detalhamento e os critérios de aceite estão em [docs/ROADMAP.md](docs/ROADMAP.md). O roteiro de implementação está em [CODEX_PLANO.md](CODEX_PLANO.md). Os comandos de desenvolvimento e limites de segurança estão em [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Executar localmente

O aplicativo desktop abriu no Windows e os fluxos principais da Etapa 2 foram exercitados com uma API, banco e documentos descartáveis em `%TEMP%`. A interface permitiu editar e reordenar disciplinas, assuntos e tópicos; importar os cinco formatos suportados; consultar texto extraído de PDF/DOCX e exibir os estados sem OCR de PNG/JPG; e rejeitar um PDF corrompido. O usuário confirmou a persistência após fechar e reabrir backend e frontend. O backend usa a porta **8765** por padrão para não conflitar com serviços Django na 8000. Consulte [Desenvolvimento local](docs/DEVELOPMENT.md) para comandos e resultados detalhados.

## Princípios

- Preferir simplicidade, consumo moderado de recursos e geração sob demanda.
- Priorizar fontes fornecidas pelo usuário e identificar conteúdo complementar da IA.
- Não inventar páginas, citações ou referências documentais.
- Permitir que o usuário revise e edite sugestões geradas.
- Salvar progresso e histórico localmente.
- Tratar materiais importados como dados, nunca como instruções a executar.
- Não versionar dados pessoais, documentos privados, bancos locais ou modelos de IA.

## Capturas de tela

Capturas reais serão adicionadas quando as telas estiverem implementadas. Imagens ilustrativas não serão apresentadas como funcionalidades prontas.

## Aprendizados técnicos

O projeto explora integração entre aplicativo desktop e APIs locais, processamento de documentos, execução de modelos de linguagem em CPU, validação de conteúdo gerado e persistência local, com desenvolvimento incremental.

## Contribuições e licença

Projeto pessoal de portfólio. Política de contribuições e licença serão definidas antes da primeira versão estável.
