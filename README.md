# 📡 LeadRadar — Radar de Captação de Leads Comerciais B2B

Micro-SaaS moderno de prospecção ativa local e B2B sob demanda, com motor próprio de automação/scraping em tempo real (zero custos de APIs externas como Google Places).

---

## ⚡ Diferenciais do Sistema

- **Zero Custo de API:** Automação headless via **Playwright Stealth** no Google Maps e fallback resiliente em diretórios públicos (OpenStreetMap). Sem cobranças no Google Cloud.
- **Identificação de Empresas "Sem Site":** Filtro inteligente que destaca comércios sem presença digital ou com redes sociais precárias (leads com maior taxa de conversão para agências, freelancers e empresas de tecnologia).
- **Streaming em Tempo Real (SSE):** Resultados transmitidos via *Server-Sent Events* e renderizados lead-a-lead a 60fps na tela com microinterações fluidas.
- **Abordagem Comercial em 1 Clique:** Detecção de celular/WhatsApp para abertura instantânea de conversas com mensagem personalizada.
- **Exportação Flexível:** Download direto para CSV (compatível com Excel brasileiro via UTF-8 BOM) ou planilha Excel (.xls).

---

## 🛠️ Stack Tecnológica

### Front-end
- **Next.js 16.3.3** (App Router com Turbopack, React 19)
- **Tailwind CSS v4** (`@theme inline` com espaço de cores OKLCH e `tw-animate-css`)
- **Lucide React** & Componentes `@base-ui/react`
- **ScrollReveal & Animações CSS 60fps** (Staggered entrance na Hero, card-enter no feed e microinterações de hover)

### Back-end & Engine de Automação
- **Python 3.11+ / FastAPI**
- **Playwright** (execução headless via canais nativos Chrome/Edge com plugins e scripts de evasão stealth)
- **Server-Sent Events (SSE)** para streaming de dados em tempo real
- **Fallback Híbrido** com API pública OpenStreetMap (Nominatim/Overpass)

---

## 🚀 Como Executar Localmente

### 1. Iniciar o Back-end de Raspagem (FastAPI / Playwright)

No diretório do projeto:

```powershell
cd backend

# Crie e ative o ambiente virtual (ou use uv)
python -m venv .venv
.\.venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor
python main.py
```
> O servidor estará rodando em `http://127.0.0.1:8000`  
> Documentação Swagger interativa: `http://127.0.0.1:8000/docs`

### 2. Iniciar o Front-end (Next.js)

Em outro terminal, na raiz do projeto:

```powershell
# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse:
- **Landing Page:** `http://localhost:3000`
- **Radar de Leads:** `http://localhost:3000/app`

---

## 🔌 Endpoints da API

- `POST /api/search` — Dispara a busca em segundo plano (`query`, `quantity`, `source`).
- `GET /api/search/{id}/stream` — Stream SSE em tempo real enviando cada lead extraído.
- `GET /api/search/{id}/status` — Status e lista de leads acumulados.
- `GET /api/leads/export?format=csv` ou `?format=excel` — Download formatado para planilhas.
- `GET /api/health` — Verificação de saúde e modo zero-cost ativo.

---

## 📄 Licença
Distribuído sob licença proprietária para uso interno do projeto.
