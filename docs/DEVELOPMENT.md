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
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

O banco SQLite e as configurações são criados em `%LOCALAPPDATA%\RevisAI`. Para escolher outro diretório em desenvolvimento, defina `REVISAI_DATA_DIR` antes de iniciar o backend. Não use diretórios versionados no Git.

## 2. Frontend web de desenvolvimento

Abra outro terminal PowerShell na raiz do repositório:

```powershell
Set-Location .\frontend
npm.cmd install --cache .npm
npm.cmd run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://127.0.0.1:1420`. O servidor usa uma porta fixa e somente a interface local. O frontend chama o backend em `http://127.0.0.1:8000`; a tela inicial mostra se a API e o SQLite responderam.

## 3. Aplicativo desktop Tauri

Com Rust, MSVC Build Tools e WebView2 disponíveis, mantenha o backend em execução e abra outro terminal PowerShell na raiz do repositório:

```powershell
Set-Location .\frontend
npm.cmd install --cache .npm
npm.cmd run tauri -- dev --config .\src-tauri\tauri.conf.json
```

O projeto Tauri fica em `frontend/src-tauri`. Nesse contexto, os `cwd: ".."` de `beforeDevCommand` e `beforeBuildCommand` apontam para `frontend`, onde está o `package.json`; `frontendDist: "../dist"` aponta para `frontend/dist`. O Vite ignora `src-tauri/target/**`: durante a compilação Rust, o Windows pode bloquear a DLL gerada e o watcher não deve tentar observá-la. O Tauri inicia o Vite automaticamente. O backend continua sendo iniciado separadamente nesta etapa; o sidecar e o instalador ficam para a Etapa 6.

Para tentar uma compilação Tauri de depuração sem empacotamento, ainda em `frontend/`:

```powershell
npm.cmd run tauri -- build --debug --no-bundle --config .\src-tauri\tauri.conf.json
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
