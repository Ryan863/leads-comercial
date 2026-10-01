# 📍 Leads Radar - Extrator Comercial do Google Maps

Painel local interativo de extração de leads comerciais do Google Maps desenvolvido com **Python**, **Streamlit**, **Playwright** e **Pandas**.

---

## 🚀 Funcionalidades

- **Busca Flexível**: Permite pesquisar por qualquer nicho e localidade (ex.: `Pizzarias em Videira - SC`, `Clínicas Odontológicas em São Paulo`, `Mecânicas em Curitiba`).
- **Controle de Quantidade**: Seletor numérico para definir a quantidade máxima de leads a extrair (ex.: 20, 50, 100).
- **Extração Completa**:
  - Nome da Empresa
  - Categoria
  - Telefone / WhatsApp
  - Nota e Total de Avaliações
  - Website
  - **Status do Lead**:
    - 🚨 `Sem Site - Alta Prioridade`: Empresas sem website cadastrado (oportunidade imediata para venda de sites/landing pages).
    - 📱 `Usa Rede Social`: Empresas que usam links de Instagram, Facebook ou WhatsApp como página principal.
    - 🌐 `Tem Site`: Empresas que já possuem domínio próprio.
- **Prevenção de Bloqueios**: Execução em modo `headless=True` com pausas humanas realistas configuráveis.
- **Tolerância a Falhas**: Tratamento de exceções que impede travamentos por dados ausentes (empresas sem telefone ou site).
- **Acompanhamento em Tempo Real**: Barra de progresso dinâmica, status em tempo real e prévia dos últimos leads capturados.
- **Filtros Interativos**: Filtragem por status do lead e busca textual dinâmica na tabela de resultados.
- **Exportação Rápida**:
  - Download em formato **CSV** (otimizado com codificação UTF-8 com BOM para Excel no Windows).
  - Download em formato **Excel (.xlsx)** com largura de colunas ajustadas automaticamente.

---

## 📦 Estrutura do Projeto

```
google_maps_leads/
├── .venv/               # Ambiente virtual Python
├── scraper.py           # Módulo isolado de extração e inteligência comercial
├── server.py            # Servidor FastAPI de alta performance para a aplicação web
├── static/              # Frontend moderno (UrTask inspired)
│   ├── index.html       # Estrutura HTML5 com onboarding guiado e painel de leads
│   ├── style.css        # CSS moderno (Dark Cosmic, Glassmorphism, Neon Glow)
│   └── app.js           # Engine interativo SPA, filtros e gatilhos de WhatsApp/E-mail
├── app.py               # Interface Streamlit clássica (preservada)
├── requirements.txt     # Dependências do projeto
└── README.md            # Documentação e instruções de uso
```

---

## 🛠️ Como Executar

### 1. Pré-requisitos
- Python 3.10 ou superior instalado no sistema.

### 2. Ativação do Ambiente Virtual
No terminal PowerShell:
```powershell
cd C:\Users\ryan_varella\.gemini\antigravity\scratch\google_maps_leads
.\.venv\Scripts\Activate.ps1
```

### 3. Instalação das Dependências (já realizada)
```powershell
pip install -r requirements.txt
python -m playwright install chromium
```

### 4. Iniciar o Novo Frontend Moderno (SaaS - UrTask Design) ⭐ [Recomendado]
```powershell
.\.venv\Scripts\python.exe server.py
```
Acesse no seu navegador: `http://localhost:8000`

✨ **Destaques do Novo Frontend:**
- **Página Inicial sem Cadastro Prévio**: Apresentação visual de alto nível com demonstração dinâmica.
- **Onboarding Guiado em 3 Etapas**: Passo a passo interativo com onda conectora e botão "Continuar Etapa".
- **Aba de Leads com Otimização de Contato**:
  - 🟢 **Botão WhatsApp com 1 Clique**: abre diretamente a conversa com mensagem comercial inteligente adaptada ao status do lead.
  - ✉️ **Botão E-mail com 1 Clique**: abre o cliente de e-mail com proposta pronta.
  - 💬 **Personalizador de Mensagens / Pitch Modal**: alterne entre tons (consultivo, direto, promocional) antes de enviar.
- **Exportação Rápida**: CSV (UTF-8 BOM para Excel) e Excel (.xlsx).

---

### 5. Iniciar o Painel Streamlit Clássico (Opcional)
```powershell
.\.venv\Scripts\python.exe -m streamlit run app.py
```
O painel Streamlit abrirá em `http://localhost:8501`.
