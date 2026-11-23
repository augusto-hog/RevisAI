# RevisAI

**Estude. Pratique. Revise.**

O **RevisAI** (*"revisa aí"*) é um projeto pessoal e de portfólio para tornar os estudos mais organizados e objetivos com o auxílio de inteligência artificial local.

A proposta é simples: importar materiais ou um edital, organizar assuntos, estudar com resumos e explicações e descobrir o que revisar a partir dos erros nas questões.

> **Status:** Em desenvolvimento. Este README apresenta a proposta e o roadmap. As funcionalidades descritas abaixo ainda não devem ser consideradas concluídas até serem marcadas como implementadas.

## Objetivo

Criar um aplicativo desktop para Windows que ajude estudantes e candidatos a concursos a manter o foco no que precisam estudar e revisar, sem depender de serviços de IA pagos para suas funções principais.

## Funcionalidades planejadas

- **Projetos de estudo:** organizar estudos livres e preparação para concursos.
- **Materiais:** importar PDF, DOCX, TXT e imagens, com OCR local quando necessário.
- **Organização por IA:** sugerir assuntos e tópicos a partir dos materiais ou do conteúdo programático de um edital.
- **Resumos:** produzir explicações para leitura, um tópico por vez, priorizando os documentos enviados.
- **Questões:** gerar múltipla escolha e certo/errado, com gabarito comentado.
- **Revisões:** registrar erros, identificar pontos fracos e sugerir revisões.
- **Metas semanais:** acompanhar sessões de estudo e progresso.
- **Privacidade:** manter os dados no computador; internet opcional para instalação e recursos futuros.

## Tecnologias previstas

| Camada | Tecnologia |
|---|---|
| Aplicativo desktop | Tauri 2 |
| Frontend | React, TypeScript e Vite |
| Interface | Tailwind CSS e shadcn/ui |
| Backend local | Python e FastAPI |
| Banco de dados | SQLite |
| IA local | Ollama (modelo configurável) |
| Documentos | PyMuPDF, python-docx e OCR local |
| Versionamento | Git e GitHub |

A escolha dos modelos e ferramentas de OCR será validada no hardware-alvo: **Windows, 16 GB de RAM e sem GPU dedicada**.

## Como deverá funcionar

1. Criar um projeto, por exemplo, **Estoicismo**.
2. Anexar os materiais de referência.
3. Solicitar à IA uma proposta de tópicos, que poderá ser editada.
4. Escolher um tópico e gerar um resumo ou explicação.
5. Responder questões e consultar o gabarito comentado.
6. Revisar os assuntos com mais erros e acompanhar a meta semanal.

Para concursos, o usuário poderá anexar o edital e confirmar a estrutura do conteúdo programático antes de começar.

## Roadmap

- [ ] **Etapa 0:** repositório, documentação e padrões de trabalho.
- [ ] **Etapa 1:** base Tauri + React + FastAPI + SQLite e interface escura.
- [ ] **Etapa 2:** projetos de estudo e importação de materiais.
- [ ] **Etapa 3:** integração com Ollama e organização de tópicos.
- [ ] **Etapa 4:** geração de resumos, questões e correções.
- [ ] **Etapa 5:** revisão de pontos fracos e metas semanais.
- [ ] **Etapa 6:** leitura de editais, testes e instalador Windows.

## Executando localmente

**Ainda em preparação.** Os comandos exatos de instalação e execução serão incluídos após a implementação da Etapa 1 e a validação do ambiente Windows.

A execução final deverá ocorrer por um aplicativo desktop; durante o desenvolvimento, serão necessárias as ferramentas da stack e o Ollama para as funções de IA.

## Princípios do projeto

- Simplicidade antes de funcionalidades extras.
- Conteúdo gerado sob demanda, sem processar tudo de uma vez.
- Priorizar as fontes enviadas pelo usuário e sinalizar complementações da IA.
- Não inventar páginas, citações ou referências aos documentos.
- Permitir que o usuário edite a organização sugerida.
- Salvar progresso e histórico localmente.
- Não incluir arquivos privados, bancos locais, modelos de IA ou materiais protegidos por direitos autorais no repositório.

## Screenshots

Capturas reais da aplicação serão adicionadas conforme as telas forem concluídas. Não serão utilizadas imagens fictícias para representar funcionalidades prontas.

## Aprendizados e desafios técnicos

Este projeto explora integração entre aplicações desktop e APIs locais, processamento de documentos, execução de modelos de linguagem em CPU, validação de saídas geradas por IA, persistência de dados e construção incremental de software.

## Contribuições e licença

Projeto pessoal de portfólio. A política de contribuições e a licença serão definidas antes da publicação da primeira versão estável.
