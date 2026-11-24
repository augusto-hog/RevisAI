# Desenvolvimento local

## Requisitos

- Windows 10 ou 11.
- Node.js e npm.
- Python 3.11 ou superior.
- Para compilar a janela desktop: Rust com toolchain MSVC, Microsoft C++ Build Tools e WebView2 Runtime. A janela nativa e os fluxos da Etapa 1 foram confirmados manualmente pelo usuário no Windows; Rust/Cargo não estão disponíveis neste executor do Codex.

## 1. Backend local

Abra um terminal PowerShell na raiz do repositório. Em um terminal:

```powershell
Set-Location .\backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]" --cache-dir .pip-cache
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
```

O banco SQLite e as configurações são criados em `%LOCALAPPDATA%\RevisAI`. Para escolher outro diretório em desenvolvimento, defina `REVISAI_DATA_DIR` antes de iniciar o backend. Não use diretórios versionados no Git.
O servidor local escuta em `127.0.0.1:8765`, em vez da porta 8000 para não conflitar com o Django de outro projeto. O limite padrão de upload é 25 MiB; para alterá-lo antes de iniciar o backend, defina `$env:REVISAI_MAX_UPLOAD_BYTES = "52428800"` (bytes). A API publica o limite atual em `/api/v1/settings`, e a interface verifica o tamanho antes de enviar.

## 2. Frontend web de desenvolvimento

Abra outro terminal PowerShell na raiz do repositório:

```powershell
Set-Location .\frontend
npm.cmd install --cache .npm
npm.cmd run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://127.0.0.1:1420`. O servidor usa uma porta fixa e somente a interface local. O frontend chama o backend em `http://127.0.0.1:8765`, evitando conflito com o Django do usuário na porta 8000. Se necessário, configure `VITE_API_URL` para apontar para outra URL local.

## 3. Aplicativo desktop Tauri

Com Rust, MSVC Build Tools e WebView2 disponíveis, mantenha o backend em execução e abra outro terminal PowerShell na raiz do repositório:

```powershell
Set-Location .\frontend
npm.cmd install --cache .npm
npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json
```

O projeto Tauri fica em `frontend/src-tauri`. Nesse contexto, os `cwd: ".."` de `beforeDevCommand` e `beforeBuildCommand` apontam para `frontend`, onde está o `package.json`; `frontendDist: "../dist"` aponta para `frontend/dist`. O Vite ignora `src-tauri/target/**`: durante a compilação Rust, o Windows pode bloquear a DLL gerada e o watcher não deve tentar observá-la. O Tauri inicia o Vite automaticamente. O backend continua sendo iniciado separadamente nesta etapa; o sidecar e o instalador ficam para a Etapa 6.

O CSP do Tauri autoriza a API local em `127.0.0.1:8765`. Se escolher outra porta/URL para o backend, ajuste `VITE_API_URL` no build do frontend e a origem `connect-src` em `frontend/src-tauri/tauri.conf.json`.

Para tentar uma compilação Tauri de depuração sem empacotamento, ainda em `frontend/`:

```powershell
npm.cmd run tauri -- build --debug --no-bundle --config .\src-tauri\tauri.conf.json
```

Se a compilação Rust falhar com `E0786` e `os error 1455` ao mapear um arquivo `.rlib`, o Windows não conseguiu reservar memória virtual suficiente naquele momento. Confirme que o arquivo de paginação está habilitado e que há espaço livre na unidade; reinicie o Windows e feche aplicativos que consomem muita memória antes de compilar. Na tentativa de 2026-11-24, a captura das configurações mostrou gerenciamento automático habilitado, aproximadamente 30 GB atualmente alocados e 56 GB livres em C:, portanto o arquivo de paginação não estava desativado. Ainda assim, a pressão de memória comprometida durante a compilação pode causar o erro. Tente reduzir a compilação paralela no PowerShell:

```powershell
$env:CARGO_BUILD_JOBS = "1"
Set-Location .\src-tauri
cargo clean
Set-Location ..
npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json
```

As primeiras tentativas no PowerShell falharam por `cargo` ausente do `PATH`, além de falhas transitórias de alocação ao compilar `syn`. O arquivo `C:\Users\augustogomes\.cargo\bin\cargo.exe` existia, mas a pasta não estava no `PATH` do terminal. Nesta validação, adicionar a pasta somente à sessão permitiu executar `cargo metadata` e `cargo check -j 1`, ambos aprovados. As versões observadas foram Cargo 1.100.0 e rustc 1.100.0 (`stable-x86_64-pc-windows-msvc`). O primeiro `tauri dev` dentro do sandbox foi bloqueado pelo acesso do esbuild; a repetição aprovada fora do sandbox compilou os 343 crates e abriu `revisai.exe`.

O backend foi iniciado em `127.0.0.1:8765` com `REVISAI_DATA_DIR` apontando para `%TEMP%\RevisAI-stage2c-validation\data`, sem tocar no banco local habitual. O health respondeu `ok`. Na janela Tauri, tema escuro e conexão com a API foram confirmados; foram criados projeto, disciplina, assunto e tópico; um TXT de teste foi importado, seus metadados/texto foram exibidos e a exclusão solicitou confirmação. Após fechar e reabrir a janela, a API e a interface ainda mostraram a hierarquia salva. O material foi removido do projeto de teste. A janela compilou e abriu, mas o roteiro manual completo ainda está pendente (não foram importados três documentos nem exercitados todos os formatos na janela); mantenha Etapa 2 como **Em validação**.

Para iniciar no PowerShell quando Cargo estiver fora do `PATH`, adicione a pasta apenas à sessão antes do Tauri:

```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
$env:CARGO_BUILD_JOBS = "1"
npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json
```

### Ícones Tauri

O conjunto padrão de ícones fica em `frontend/src-tauri/icons`. O SVG `revisai-provisional.svg` é uma arte provisória de livro aberto e brilho, até a identidade visual definitiva. Para regenerar os ícones com a CLI oficial do Tauri, execute em `frontend/`:

```powershell
npm.cmd run tauri -- icon .\src-tauri\icons\revisai-provisional.svg --output .\src-tauri\icons
```

Os caminhos seguem a configuração da [documentação oficial do Tauri 2](https://v2.tauri.app/reference/config/): `cwd` indica o diretório de execução do hook, e `frontendDist` identifica os assets web servidos/embutidos.

## Testes e verificações

```powershell
Set-Location .\frontend
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

```powershell
Set-Location .\backend
.\.venv\Scripts\python.exe -m pytest
```

## Etapa 2 — validação manual no Windows

Os testes automatizados exercitam os fluxos de interface com mocks da API; para validar a persistência real na janela, inicie o backend no primeiro terminal usando o comando acima, e então inicie o Tauri no segundo. Na janela, confira:

1. Abra **Meus Estudos**, crie o projeto Estoicismo e edite seu nome/descrição.
2. Abra o projeto; crie uma disciplina, um assunto e tópicos; renomeie, mova para cima/baixo e exclua com confirmação.
3. Importe um PDF com texto, DOCX, TXT e uma imagem. Confirme nome, formato, tamanho, data, status e andamento do envio.
4. Consulte o texto extraído; confirme os avisos de PDF sem texto e de imagem sem OCR.
5. Exclua um material após confirmação; feche e reabra o app e confirme que os demais registros permanecem.

Comandos para a janela Windows (a partir de `frontend/`):

```powershell
npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json
npm.cmd run tauri -- build --debug --no-bundle --config .\src-tauri\tauri.conf.json
```

## Resultados da Etapa 2C — 2026-11-24

- Backend `backend/.venv/Scripts/python.exe -m pytest -q`: 22 testes passaram; inclui migração SQLite nova e upgrade de banco legado em diretórios temporários.
- Frontend `npm.cmd run test`: 10 testes passaram; `npm.cmd run lint`, `npm.cmd exec -- tsc -b` e `npm.cmd run build` passaram.
- `git diff --check` passou. Alembic reporta `0003_shared_material_blobs` como head.
- O Tauri não foi compilado nem iniciado pelo executor: `cargo` e `rustc` não estão no PATH. O fluxo visual da Etapa 2 aguarda validação manual da janela Windows. OCR permanece fora do escopo; imagens não têm extração de texto nesta etapa.

## Validação complementar da Etapa 2 — 2026-11-24

A validação foi feita na janela `revisai.exe` ligada a uma instância FastAPI descartável em `127.0.0.1:8766`. A origem Vite/Tauri foi isolada na porta 1422 porque 1420 já estava ocupada. `REVISAI_DATA_DIR` apontou para `%TEMP%\RevisAI-etapa2-manual-cbcd46b1ba7d46d8b40590ff361093db\data`; os fixtures também ficaram dentro dessa pasta temporária. O banco habitual não foi usado.

- Janela dark mode e conexão real com FastAPI confirmadas.
- Criados dados hierárquicos temporários; disciplina, assunto e tópico foram renomeados e reordenados usando os controles da interface. Essa validação encontrou a falha de preflight CORS para `PUT`; a API foi corrigida para permitir o método e o teste `test_cors_allows_put_preflight_for_hierarchy_reordering` protege a regressão.
- Importados no mesmo projeto PDF, DOCX, TXT, PNG e JPG. A tela exibiu nome, formato, tamanho, data e status. PDF e DOCX abriram texto extraído; o PDF preservou separação de páginas. PNG/JPG informaram que não têm OCR. Um arquivo com extensão PDF e conteúdo inválido foi rejeitado com mensagem de erro.
- A API e o banco temporários foram reiniciados mantendo o mesmo diretório de dados; a hierarquia e os cinco materiais continuaram disponíveis em `GET /api/v1/projects/1` e `/api/v1/projects/1/materials`. A listagem retornou estados/textos armazenados.
- Um novo `tauri dev` compilou e iniciou o executável com a API temporária em 8766 e Vite em 1422; o backend registrou health 200. A inspeção visual após o lançamento não ficou disponível: a captura do executor mostrou a tela de bloqueio do Windows e a ativação da janela falhou. Portanto, isso não confirma que os materiais aparecem após reabrir a janela.
- Testes atualizados: backend `pytest -q` — 23 passaram; frontend `npm.cmd run test` — 11 passaram; lint e build Vite/TypeScript passaram. Migrações verificadas em SQLite temporário, com head `0004_project_kind`; `git diff --check` passou. Permanece apenas o aviso upstream do PyMuPDF (`typing.ByteString`).

O usuário confirmou que fechou e reabriu backend e frontend e os dados persistiram; em seguida, aprovou formalmente a Etapa 2. A etapa está **Concluída**. Os dados e fixtures usados pelo executor estavam em `%TEMP%` e foram removidos. Não remova o diretório de dados habitual.

## Validação da reorganização Tauri — 2026-11-23

- A partir de `frontend/src-tauri/tauri.conf.json`, a resolução dos caminhos confirmou `..` como `frontend/`, com `package.json`, e `../dist` como `frontend/dist/`, contendo `index.html` após o build. O script Vite executado desse diretório, com porta isolada 1422, serviu a interface em HTTP 200; o servidor de teste foi encerrado.
- `npm.cmd run test`: 3 testes passaram; `npm.cmd run lint`: passou após excluir `**/target/**` do ESLint, pois os artefatos Rust gerados passaram a ficar sob `frontend/src-tauri/target`; `npm.cmd run build`: TypeScript e Vite passaram.
- Backend: `backend/.venv/Scripts/python.exe -m pytest -W default`: 5 testes passaram sem avisos.
- A tentativa `npm.cmd run tauri -- build --debug --no-bundle --config .\src-tauri\tauri.conf.json`, iniciada em `frontend/`, foi reconhecida pela CLI, mas parou em `cargo metadata` porque Cargo/Rust não estão instalados; por isso, a CLI não chegou a executar os hooks. O build frontend foi executado separadamente com sucesso. O build nativo e a abertura da janela continuam pendentes; a Etapa 1 permanece em validação.
- Em seguida, a pasta `frontend/src-tauri/icons` foi criada com a CLI oficial (`npm.cmd run tauri -- icon ...`); `icon.ico` e os demais tamanhos da plataforma foram gerados. Os arquivos não são ignorados pelo Git, mas aparecem como não rastreados porque `frontend/src-tauri` ainda não foi incluído em um commit. `cargo check` e `npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json` foram tentados e pararam porque `cargo` não está disponível neste executor. A janela Windows ainda não foi compilada nem aberta.
- Investigação do erro `EBUSY` de `FSWatcher`: o Vite tentava observar `frontend/src-tauri/target/.../revisai_lib.dll` durante a compilação Rust. `vite.config.ts` agora exclui `**/src-tauri/target/**`. A regressão foi simulada bloqueando essa DLL com compartilhamento exclusivo: `npm.cmd run dev -- --host 127.0.0.1` iniciou normalmente e a interface retornou HTTP 200; os processos de teste foram encerrados.
- Após a correção: `npm.cmd run test` — 3 testes passaram; `npm.cmd run lint` — passou; `npm.cmd run build` — TypeScript e Vite passaram. `cargo check` e `tauri dev` continuam não verificáveis neste executor, pois Rust/Cargo não estão no PATH. A janela permanece pendente e a Etapa 1 continua em validação.

## Aprovação da Etapa 1 — 2026-11-23

O usuário aprovou a Etapa 1 após confirmar no Windows que `revisai.exe` inicia, a janela Tauri abre sem erros, o modo escuro e a navegação funcionam, a comunicação com FastAPI está ativa, as preferências persistem após reiniciar e não houve erros durante o uso. Nesta validação, o backend passou em 5 testes; o frontend passou em 3 testes, lint e build. O `cargo check` não foi repetido pelo Codex porque Cargo não está no PATH deste executor. A Etapa 1 está concluída; as etapas seguintes continuam não iniciadas.

## Limites de segurança antes da distribuição

- Iniciar Uvicorn explicitamente em `127.0.0.1`; nunca escutar em `0.0.0.0`.
- A lista CORS contém somente origens locais conhecidas. CORS, por si só, não autentica chamadas locais nem impede DNS rebinding.
- Antes de incluir operações com dados do usuário, validar `Host` e `Origin`, rejeitar origens não permitidas, proteger operações mutáveis contra CSRF e associar as chamadas do processo desktop a um segredo efêmero protegido, inacessível a páginas externas.
- Manter CSP restritiva no Tauri e revisar permissões e origens antes de distribuir.
- Não abrir a API em interfaces de rede, nem colocar tokens ou dados privados no frontend, logs ou repositório.

## Correção de compatibilidade com bancos legados — 2026-11-24

O erro `sqlite3.OperationalError: no such column: projects.kind` ocorria quando uma instalação já possuía a tabela `projects`: a migração `0002_study_library` criava essa coluna somente ao criar a tabela, e a migração `0003_shared_material_blobs` não a adicionava. Foi criada a migração aditiva `0004_project_kind`, que adiciona `kind VARCHAR(20) NOT NULL DEFAULT 'livre'` quando ausente, preservando projetos existentes. Teste de regressão usa SQLite temporário legado e confirmou GET `/api/v1/projects`, preservação dos dados e revisão Alembic `0004_project_kind`. Suíte backend: 22 testes passaram. Aviso upstream do PyMuPDF sobre `typing.ByteString` permanece.
