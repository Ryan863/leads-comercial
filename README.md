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
├── app.py               # Código completo da aplicação (Streamlit + Playwright)
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

### 4. Iniciar o Painel Streamlit
```powershell
.\.venv\Scripts\python.exe -m streamlit run app.py
```
O painel abrirá automaticamente no navegador no endereço `http://localhost:8501`.
