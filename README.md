# RevisAI

**Estude. Pratique. Revise.**

RevisAI é um projeto pessoal de portfólio: um aplicativo desktop para Windows que pretende ajudar estudantes e candidatos a concursos a organizar os estudos, praticar e revisar assuntos com apoio de inteligência artificial local.

> **Status:** Etapa 0 aprovada e concluída; as etapas de implementação ainda não foram iniciadas. As funcionalidades descritas como planejadas ainda não estão implementadas.

## Objetivo

Ajudar a manter o foco no que estudar e revisar, priorizando materiais fornecidos pelo usuário e mantendo dados e processamento no computador. A internet poderá ser necessária para instalação e recursos futuros.

## Funcionalidades planejadas

- **Projetos de estudo:** organizar estudos livres e preparação para concursos.
- **Materiais:** importar PDF, DOCX, TXT e imagens; OCR local está previsto para uma etapa futura.
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
- [ ] **Etapa 1:** base Tauri + React + FastAPI + SQLite e interface escura.
- [ ] **Etapa 2:** projetos de estudo e importação de materiais.
- [ ] **Etapa 3:** integração com Ollama e organização de tópicos.
- [ ] **Etapa 4:** geração de resumos, questões e correções.
- [ ] **Etapa 5:** revisão de pontos fracos e metas semanais.
- [ ] **Etapa 6:** leitura de editais, OCR, testes e instalador Windows.

O detalhamento e os critérios de aceite estão em [docs/ROADMAP.md](docs/ROADMAP.md). O roteiro de implementação está em [CODEX_PLANO.md](CODEX_PLANO.md).

## Executar localmente

A execução local ainda não está disponível. As instruções serão adicionadas depois que a fundação da aplicação for implementada e validada no Windows.

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
