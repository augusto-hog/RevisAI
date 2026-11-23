# Desenvolvimento local

## Requisitos

- Windows 10 ou 11.
- Node.js e npm.
- Python 3.11 ou superior.
- Para abrir a janela desktop: Rust com toolchain MSVC, Microsoft C++ Build Tools e WebView2 Runtime. A janela nativa ainda não foi validada neste ambiente.

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
npm.cmd run tauri -- dev --config ..\src-tauri\tauri.conf.json
```

O comando Tauri inicia o Vite automaticamente. O backend continua sendo iniciado separadamente nesta etapa; o sidecar e o instalador ficam para a Etapa 6.

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

## Limites de segurança antes da distribuição

- Iniciar Uvicorn explicitamente em `127.0.0.1`; nunca escutar em `0.0.0.0`.
- A lista CORS contém somente origens locais conhecidas. CORS, por si só, não autentica chamadas locais nem impede DNS rebinding.
- Antes de incluir operações com dados do usuário, validar `Host` e `Origin`, rejeitar origens não permitidas, proteger operações mutáveis contra CSRF e associar as chamadas do processo desktop a um segredo efêmero protegido, inacessível a páginas externas.
- Manter CSP restritiva no Tauri e revisar permissões e origens antes de distribuir.
- Não abrir a API em interfaces de rede, nem colocar tokens ou dados privados no frontend, logs ou repositório.
