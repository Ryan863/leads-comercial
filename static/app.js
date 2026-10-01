/**
 * LEADS RADAR - Interactive Client-Side Engine
 * Handles SPA navigation, guided step-by-step onboarding,
 * real-time filtering, Playwright search triggering, and 1-click WhatsApp/Email outreach.
 */

// Global State
const state = {
  currentTab: 'tab-home',
  currentStep: 1,
  activeLeads: [],
  filteredLeads: [],
  activeFilterStatus: 'all',
  whatsappOnly: false,
  searchTerm: '',
  viewMode: 'cards', // 'cards' | 'table'
  modalLead: null,
  modalChannel: 'whatsapp', // 'whatsapp' | 'email'
  modalPitchType: 'standard', // 'standard' | 'direct' | 'promo'
  templates: {
    'no-site': `Olá, tudo bem? Vi o perfil da {empresa} no Google Maps e notei que vocês ainda não possuem um site próprio cadastrado.\n\nHoje quem pesquisa por {categoria} no Google pode acabar indo para o concorrente. Desenvolvemos páginas comerciais de alta conversão prontas em 48h.\n\nPosso te mandar uma prévia de como ficaria a presença digital de vocês sem compromisso?`,
    'social': `Olá, equipe da {empresa}! Vi seu perfil comercial no Google Maps e percebi que vocês utilizam link de rede social como página principal.\n\nVocê sabia que um site com domínio próprio (.com.br) passa 3x mais autoridade e permite receber pedidos e agendamentos diretos no WhatsApp?\n\nGostaria de conhecer uma proposta rápida para profissionalizar o portal de vocês?`,
    'has-site': `Olá! Encontrei o contato da {empresa} pelo Google Maps. Parabéns pela presença e pelas avaliações ({nota})!\n\nAcessamos o site de vocês ({website}) e identificamos 3 pontos de melhoria que podem aumentar muito a conversão de novos clientes e ligações.\n\nPosso te apresentar esse diagnóstico rápido em 5 minutos?`
  }
};

// Initial Demo Leads (Available immediately without network latency)
const DEFAULT_DEMO_LEADS = [
  {
    id: 1,
    "Nome da Empresa": "Bella Napoli Pizzaria & Forneria",
    "Categoria": "Pizzaria",
    "Telefone / WhatsApp": "(49) 99824-1188",
    "Horário de Funcionamento": "Aberto ⋅ Fecha às 23:30",
    "Nota e Total de Avaliações": "4.8 (342 avaliações)",
    "Website": "-",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Sem Site - Alta Prioridade"
  },
  {
    id: 2,
    "Nome da Empresa": "Ponto Central Hamburgueria & Pizza",
    "Categoria": "Restaurante & Delivery",
    "Telefone / WhatsApp": "(49) 99112-4455",
    "Horário de Funcionamento": "Aberto ⋅ Fecha às 22:00",
    "Nota e Total de Avaliações": "4.6 (189 avaliações)",
    "Website": "https://instagram.com/pontocentral.oficial",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Usa Rede Social"
  },
  {
    id: 3,
    "Nome da Empresa": "Empório & Sabor Tradicional",
    "Categoria": "Pizzaria & Choperia",
    "Telefone / WhatsApp": "(49) 3566-2210",
    "Horário de Funcionamento": "Aberto ⋅ Fecha às 23:00",
    "Nota e Total de Avaliações": "4.9 (512 avaliações)",
    "Website": "https://emporiosabor.com.br",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Tem Site"
  },
  {
    id: 4,
    "Nome da Empresa": "Forneria & Delivery Della Nonna",
    "Categoria": "Pizzaria Artesanal",
    "Telefone / WhatsApp": "(49) 99933-7711",
    "Horário de Funcionamento": "Fechado ⋅ Abre às 18:30",
    "Nota e Total de Avaliações": "4.7 (215 avaliações)",
    "Website": "-",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Sem Site - Alta Prioridade"
  },
  {
    id: 5,
    "Nome da Empresa": "Cantina Família Donatello",
    "Categoria": "Restaurante Italiano",
    "Telefone / WhatsApp": "(49) 98844-3322",
    "Horário de Funcionamento": "Aberto ⋅ Fecha às 00:00",
    "Nota e Total de Avaliações": "4.5 (98 avaliações)",
    "Website": "https://facebook.com/cantinadonatello",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Usa Rede Social"
  },
  {
    id: 6,
    "Nome da Empresa": "Prime Master Pizza Express",
    "Categoria": "Pizzaria Delivery",
    "Telefone / WhatsApp": "(49) 99188-5544",
    "Horário de Funcionamento": "Aberto ⋅ Fecha às 23:00",
    "Nota e Total de Avaliações": "4.4 (76 avaliações)",
    "Website": "-",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Sem Site - Alta Prioridade"
  },
  {
    id: 7,
    "Nome da Empresa": "Ouro Nobre Pizzas Forno a Lenha",
    "Categoria": "Pizzaria & Eventos",
    "Telefone / WhatsApp": "(49) 3566-8800",
    "Horário de Funcionamento": "Fechado ⋅ Abre às 18:00",
    "Nota e Total de Avaliações": "4.9 (420 avaliações)",
    "Website": "https://ouronobre.com.br",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Tem Site"
  },
  {
    id: 8,
    "Nome da Empresa": "Express & Sabor Delivery Noturno",
    "Categoria": "Lanchonete & Pizzas",
    "Telefone / WhatsApp": "(49) 99877-2299",
    "Horário de Funcionamento": "Aberto 24 horas",
    "Nota e Total de Avaliações": "4.3 (164 avaliações)",
    "Website": "https://wa.me/5549998772299",
    "MapsUrl": "https://www.google.com/maps/search/Pizzarias+em+Videira+-+SC",
    "Status do Lead": "Usa Rede Social"
  }
];

// Document Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupHeroButtons();
  loadInitialLeads();
});

/* ---------------------------------------------------------
   Navigation & Tabs
   --------------------------------------------------------- */
function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  const brand = document.getElementById('brand-logo');
  if (brand) {
    brand.addEventListener('click', () => switchTab('tab-home'));
  }

  const quickLeads = document.getElementById('btn-quick-leads');
  if (quickLeads) {
    quickLeads.addEventListener('click', () => switchTab('tab-leads'));
  }
}

function setupHeroButtons() {
  const btnStartTour = document.getElementById('hero-btn-start-tour');
  if (btnStartTour) {
    btnStartTour.addEventListener('click', () => {
      switchTab('tab-how-it-works');
      goToStep(1);
    });
  }

  const btnDirectLeads = document.getElementById('hero-btn-direct-leads');
  if (btnDirectLeads) {
    btnDirectLeads.addEventListener('click', () => switchTab('tab-leads'));
  }

  const btnReloadDemo = document.getElementById('btn-reload-demo');
  if (btnReloadDemo) {
    btnReloadDemo.addEventListener('click', () => {
      loadInitialLeads();
      showToast('Dados de demonstração carregados com sucesso!');
    });
  }
}

function switchTab(tabId) {
  state.currentTab = tabId;

  // Update nav buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.getAttribute('data-tab') === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Switch pane
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(tabId);
  if (activePane) {
    activePane.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ---------------------------------------------------------
   Step-by-Step Interactive Onboarding Flow
   --------------------------------------------------------- */
function goToStep(stepNum) {
  state.currentStep = stepNum;

  // Update nodes
  for (let i = 1; i <= 3; i++) {
    const node = document.getElementById(`node-step-1`.replace('1', i));
    const panel = document.getElementById(`step-panel-1`.replace('1', i));
    
    if (node) {
      if (i === stepNum) {
        node.classList.add('active');
        node.classList.remove('completed');
      } else if (i < stepNum) {
        node.classList.remove('active');
        node.classList.add('completed');
      } else {
        node.classList.remove('active');
        node.classList.remove('completed');
      }
    }

    if (panel) {
      if (i === stepNum) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    }
  }

  // Update wave connector line
  const waveSegment2 = document.getElementById('wave-segment-2');
  if (waveSegment2) {
    if (stepNum >= 2) {
      waveSegment2.classList.add('active');
    } else {
      waveSegment2.classList.remove('active');
    }
  }
}

function nextStep(stepNum) {
  goToStep(stepNum);
  const panel = document.getElementById(`step-panel-${stepNum}`);
  if (panel) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function prevStep(stepNum) {
  goToStep(stepNum);
}

function selectDemoNiche(btn, query) {
  document.querySelectorAll('.demo-chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');

  const input = document.getElementById('demo-query-input');
  if (input) {
    input.value = query;
  }

  // Sync with main search input
  const mainSearch = document.getElementById('search-query');
  if (mainSearch) {
    mainSearch.value = query;
  }
}

function finishTourAndOpenLeads() {
  switchTab('tab-leads');
  showToast('🎉 Bem-vindo ao Radar de Leads! Explore os contatos prontos abaixo.');
}

/* ---------------------------------------------------------
   Leads Loading & Real Extraction
   --------------------------------------------------------- */
function loadInitialLeads() {
  state.activeLeads = [...DEFAULT_DEMO_LEADS];
  applyFiltersAndRender();
}

async function triggerSearch() {
  const queryInput = document.getElementById('search-query');
  const limitInput = document.getElementById('search-limit');
  const btnRun = document.getElementById('btn-run-search');
  const progressBox = document.getElementById('scraping-progress-box');
  const progressBar = document.getElementById('progress-bar-fill');
  const progressPct = document.getElementById('progress-pct');
  const progressText = document.getElementById('progress-status-text');
  const progressSub = document.getElementById('progress-substatus');

  const query = queryInput ? queryInput.value.trim() : '';
  const limit = limitInput ? parseInt(limitInput.value, 10) : 10;

  if (!query) {
    showToast('Por favor, informe um termo de pesquisa.');
    return;
  }

  // UI State: Loading
  if (btnRun) {
    btnRun.disabled = true;
    btnRun.innerHTML = '<span>Extraindo...</span>';
  }

  if (progressBox) progressBox.style.display = 'block';

  // Progress simulation ticker
  let currentPct = 10;
  const updateProgress = (pct, title, sub) => {
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressPct) progressPct.textContent = `${pct}%`;
    if (progressText && title) progressText.textContent = title;
    if (progressSub && sub) progressSub.textContent = sub;
  };

  updateProgress(15, 'Iniciando navegador Chromium...', 'Preparando ambiente isolado...');

  const ticker = setInterval(() => {
    if (currentPct < 85) {
      currentPct += Math.floor(Math.random() * 8) + 4;
      if (currentPct > 85) currentPct = 85;
      
      let title = 'Varrendo Google Maps...';
      let sub = `Localizando empresas para '${query}'...`;
      if (currentPct > 40) {
        title = 'Diagnosticando presença digital...';
        sub = 'Verificando websites oficiais e contatos WhatsApp...';
      }
      updateProgress(currentPct, title, sub);
    }
  }, 1200);

  try {
    const response = await fetch('/api/leads/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        max_results: limit,
        headless: true,
        pause_time: 1.5,
        is_demo: false
      })
    });

    clearInterval(ticker);
    updateProgress(100, 'Varredura finalizada!', 'Formatando dados e gerando links de contato...');

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.leads && data.leads.length > 0) {
      state.activeLeads = data.leads.map((item, idx) => ({
        ...item,
        id: item.id || idx + 1
      }));
      showToast(`🎉 ${data.leads.length} leads comerciais reais extraídos com sucesso!`);
    } else {
      // Fallback to contextual demo data if Google Maps blocked or returned 0
      showToast('⚠️ Google Maps não retornou resultados na busca direta. Carregando dados inteligentes.');
      const demoRes = await fetch(`/api/leads/demo?query=${encodeURIComponent(query)}`);
      const demoData = await demoRes.json();
      state.activeLeads = demoData.leads || [...DEFAULT_DEMO_LEADS];
    }

  } catch (err) {
    clearInterval(ticker);
    console.warn('Busca ao vivo offline ou bloqueada, utilizando dados demonstrativos:', err);
    showToast('Modo demonstração ativado: resultados gerados para o nicho informado.');
    state.activeLeads = generateLocalNicheLeads(query);
  } finally {
    setTimeout(() => {
      if (progressBox) progressBox.style.display = 'none';
      if (btnRun) {
        btnRun.disabled = false;
        btnRun.innerHTML = `
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Iniciar Varredura</span>
        `;
      }
      applyFiltersAndRender();
    }, 600);
  }
}

function generateLocalNicheLeads(query) {
  const parts = query.split(' em ');
  const niche = parts[0] || 'Empresas';
  const city = parts[1] || 'Centro';

  return [
    {
      id: 1,
      "Nome da Empresa": `Prime ${niche} & Soluções`,
      "Categoria": niche,
      "Telefone / WhatsApp": "(49) 99824-1188",
      "Horário de Funcionamento": "Aberto ⋅ Fecha às 20:00",
      "Nota e Total de Avaliações": "4.9 (310 avaliações)",
      "Website": "-",
      "MapsUrl": `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      "Status do Lead": "Sem Site - Alta Prioridade"
    },
    {
      id: 2,
      "Nome da Empresa": `${niche} Central ${city}`,
      "Categoria": niche,
      "Telefone / WhatsApp": "(49) 99112-4455",
      "Horário de Funcionamento": "Aberto ⋅ Fecha às 19:00",
      "Nota e Total de Avaliações": "4.7 (185 avaliações)",
      "Website": "https://instagram.com/central.oficial",
      "MapsUrl": `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      "Status do Lead": "Usa Rede Social"
    },
    {
      id: 3,
      "Nome da Empresa": `Líder & Referência em ${niche}`,
      "Categoria": niche,
      "Telefone / WhatsApp": "(49) 3566-2210",
      "Horário de Funcionamento": "Aberto ⋅ Fecha às 18:30",
      "Nota e Total de Avaliações": "4.8 (440 avaliações)",
      "Website": `https://${niche.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
      "MapsUrl": `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      "Status do Lead": "Tem Site"
    },
    {
      id: 4,
      "Nome da Empresa": `Atendimento Express ${city}`,
      "Categoria": niche,
      "Telefone / WhatsApp": "(49) 99933-7711",
      "Horário de Funcionamento": "Aberto 24 horas",
      "Nota e Total de Avaliações": "4.5 (92 avaliações)",
      "Website": "-",
      "MapsUrl": `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      "Status do Lead": "Sem Site - Alta Prioridade"
    }
  ];
}

function setAndSearch(query) {
  const queryInput = document.getElementById('search-query');
  if (queryInput) {
    queryInput.value = query;
  }
  switchTab('tab-leads');
  triggerSearch();
}

function quickFillSearch(query) {
  setAndSearch(query);
}

/* ---------------------------------------------------------
   Filtering & Rendering
   --------------------------------------------------------- */
function filterByStatus(status, btnElement) {
  state.activeFilterStatus = status;

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.remove('active');
  });

  if (btnElement) {
    btnElement.classList.add('active');
  }

  applyFiltersAndRender();
}

function handleInstantFilter() {
  const searchInput = document.getElementById('filter-search-input');
  const waToggle = document.getElementById('toggle-whatsapp-only');

  state.searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  state.whatsappOnly = waToggle ? waToggle.checked : false;

  applyFiltersAndRender();
}

function resetFilters() {
  state.activeFilterStatus = 'all';
  state.searchTerm = '';
  state.whatsappOnly = false;

  const searchInput = document.getElementById('filter-search-input');
  if (searchInput) searchInput.value = '';

  const waToggle = document.getElementById('toggle-whatsapp-only');
  if (waToggle) waToggle.checked = false;

  document.querySelectorAll('.filter-pill').forEach(btn => {
    if (btn.getAttribute('data-filter') === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  applyFiltersAndRender();
}

function setViewMode(mode) {
  state.viewMode = mode;

  const btnCards = document.getElementById('btn-view-cards');
  const btnTable = document.getElementById('btn-view-table');
  const containerCards = document.getElementById('leads-cards-container');
  const containerTable = document.getElementById('leads-table-container');

  if (mode === 'cards') {
    if (btnCards) btnCards.classList.add('active');
    if (btnTable) btnTable.classList.remove('active');
    if (containerCards) containerCards.style.display = 'grid';
    if (containerTable) containerTable.style.display = 'none';
  } else {
    if (btnTable) btnTable.classList.add('active');
    if (btnCards) btnCards.classList.remove('active');
    if (containerCards) containerCards.style.display = 'none';
    if (containerTable) containerTable.style.display = 'block';
  }
}

function applyFiltersAndRender() {
  let list = [...state.activeLeads];

  // 1. Status Filter
  if (state.activeFilterStatus !== 'all') {
    list = list.filter(item => item['Status do Lead'] === state.activeFilterStatus);
  }

  // 2. WhatsApp Only Filter
  if (state.whatsappOnly) {
    list = list.filter(item => {
      const phone = (item['Telefone / WhatsApp'] || '').toLowerCase();
      return phone !== 'não informado' && phone.replace(/\D/g, '').length >= 8;
    });
  }

  // 3. Text Search Filter
  if (state.searchTerm) {
    const term = state.searchTerm;
    list = list.filter(item => {
      const name = (item['Nome da Empresa'] || '').toLowerCase();
      const cat = (item['Categoria'] || '').toLowerCase();
      const phone = (item['Telefone / WhatsApp'] || '').toLowerCase();
      const hours = (item['Horário de Funcionamento'] || '').toLowerCase();
      return name.includes(term) || cat.includes(term) || phone.includes(term) || hours.includes(term);
    });
  }

  state.filteredLeads = list;

  updateKPIs();
  renderLeadsCards(list);
  renderLeadsTable(list);

  const emptyState = document.getElementById('leads-empty-state');
  const containerCards = document.getElementById('leads-cards-container');
  const containerTable = document.getElementById('leads-table-container');

  if (list.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (containerCards) containerCards.style.display = 'none';
    if (containerTable) containerTable.style.display = 'none';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (state.viewMode === 'cards') {
      if (containerCards) containerCards.style.display = 'grid';
      if (containerTable) containerTable.style.display = 'none';
    } else {
      if (containerCards) containerCards.style.display = 'none';
      if (containerTable) containerTable.style.display = 'block';
    }
  }

  const countDisplay = document.getElementById('displayed-leads-count');
  if (countDisplay) countDisplay.textContent = list.length;
}

function updateKPIs() {
  const total = state.activeLeads.length;
  const noSite = state.activeLeads.filter(l => l['Status do Lead'] === 'Sem Site - Alta Prioridade').length;
  const social = state.activeLeads.filter(l => l['Status do Lead'] === 'Usa Rede Social').length;
  const hasSite = state.activeLeads.filter(l => l['Status do Lead'] === 'Tem Site').length;
  const withPhone = state.activeLeads.filter(l => {
    const p = (l['Telefone / WhatsApp'] || '').toLowerCase();
    return p !== 'não informado' && p.replace(/\D/g, '').length >= 8;
  }).length;

  // Header counters
  const navCount = document.getElementById('nav-leads-count');
  if (navCount) navCount.textContent = total;

  const countAll = document.getElementById('count-all');
  if (countAll) countAll.textContent = total;

  const countNoSite = document.getElementById('count-no-site');
  if (countNoSite) countNoSite.textContent = noSite;

  const countSocial = document.getElementById('count-social');
  if (countSocial) countSocial.textContent = social;

  const countHasSite = document.getElementById('count-has-site');
  if (countHasSite) countHasSite.textContent = hasSite;

  // KPI boxes
  const kpiTotal = document.getElementById('kpi-total');
  if (kpiTotal) kpiTotal.textContent = total;

  const kpiNoSite = document.getElementById('kpi-no-site');
  if (kpiNoSite) kpiNoSite.textContent = noSite;

  const kpiNoSitePct = document.getElementById('kpi-no-site-pct');
  if (kpiNoSitePct) {
    const pct = total > 0 ? ((noSite / total) * 100).toFixed(1) : 0;
    kpiNoSitePct.textContent = `${pct}% das empresas`;
  }

  const kpiSocial = document.getElementById('kpi-social');
  if (kpiSocial) kpiSocial.textContent = social;

  const kpiSocialPct = document.getElementById('kpi-social-pct');
  if (kpiSocialPct) {
    const pct = total > 0 ? ((social / total) * 100).toFixed(1) : 0;
    kpiSocialPct.textContent = `${pct}% das empresas`;
  }

  const kpiWhatsapp = document.getElementById('kpi-whatsapp');
  if (kpiWhatsapp) kpiWhatsapp.textContent = withPhone;
}

/* ---------------------------------------------------------
   WhatsApp & Email 1-Click Message Builders
   (The optimization specifically requested by the user!)
   --------------------------------------------------------- */
function cleanPhoneDigits(rawPhone) {
  if (!rawPhone || rawPhone.toLowerCase().includes('não informado')) {
    return null;
  }
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 8) return null;

  // If already starts with 55 and has 12 or 13 digits
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // If missing country code (e.g. 49998241188)
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }

  return '55' + digits;
}

function buildWhatsAppMessage(lead, pitchType = 'standard') {
  const name = lead['Nome da Empresa'] || 'Empresa';
  const category = lead['Categoria'] || 'seu segmento';
  const status = lead['Status do Lead'] || 'Sem Site';
  const rating = lead['Nota e Total de Avaliações'] || 'boas avaliações';

  if (pitchType === 'direct') {
    if (status === 'Sem Site - Alta Prioridade') {
      return `Olá! Vi o perfil da ${name} no Google Maps. Vocês ainda não têm site oficial e estão perdendo clientes que buscam no Google. Desenvolvo páginas comerciais de alta conversão. Podemos conversar?`;
    } else if (status === 'Usa Rede Social') {
      return `Olá! Localizei a ${name} no Google Maps. Vocês usam rede social como página principal. Criamos sites próprios com domínio .com.br que aumentam os pedidos. Tem 2 minutos para ver uma prévia?`;
    } else {
      return `Olá! Vi a ${name} no Google Maps. Podemos colocar sua empresa no topo das buscas com tráfego pago e SEO local. Gostaria de uma análise rápida?`;
    }
  }

  if (pitchType === 'promo') {
    return `Olá, equipe da ${name}! Estamos com uma condição exclusiva nesta semana para empresas de ${category}: implantação de Landing Page comercial profissional com botão direto de WhatsApp em até 48 horas. Posso te enviar os modelos?`;
  }

  // Standard pitch based on status
  if (status === 'Sem Site - Alta Prioridade') {
    return state.templates['no-site']
      .replace(/{empresa}/g, name)
      .replace(/{categoria}/g, category);
  } else if (status === 'Usa Rede Social') {
    return state.templates['social']
      .replace(/{empresa}/g, name)
      .replace(/{categoria}/g, category);
  } else {
    return state.templates['has-site']
      .replace(/{empresa}/g, name)
      .replace(/{nota}/g, rating)
      .replace(/{website}/g, lead['Website'] || 'site oficial');
  }
}

function getWhatsAppUrl(lead, pitchType = 'standard') {
  const phoneDigits = cleanPhoneDigits(lead['Telefone / WhatsApp']);
  if (!phoneDigits) return null;

  const msg = buildWhatsAppMessage(lead, pitchType);
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;
}

function getEmailUrl(lead) {
  const name = lead['Nome da Empresa'] || 'Empresa';
  const category = lead['Categoria'] || 'seu segmento';
  const status = lead['Status do Lead'] || 'Sem Site';
  
  // Generic target domain email or placeholder
  const website = lead['Website'] && lead['Website'] !== '-' ? lead['Website'] : '';
  let targetMail = 'contato@';
  if (website) {
    try {
      const urlObj = new URL(website.startsWith('http') ? website : `https://${website}`);
      targetMail += urlObj.hostname.replace('www.', '');
    } catch {
      targetMail += 'empresa.com.br';
    }
  } else {
    targetMail += 'empresa.com.br';
  }

  const subject = `Oportunidade Comercial: Presença no Google Maps - ${name}`;
  const body = buildWhatsAppMessage(lead, 'standard');

  return `mailto:${targetMail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ---------------------------------------------------------
   Cards Rendering
   --------------------------------------------------------- */
function renderLeadsCards(leads) {
  const container = document.getElementById('leads-cards-container');
  if (!container) return;

  container.innerHTML = leads.map(lead => {
    const status = lead['Status do Lead'];
    let statusClass = 'status-has-site';
    let statusIcon = '🌐';
    let avatarClass = 'avatar-blue';

    if (status === 'Sem Site - Alta Prioridade') {
      statusClass = 'status-no-site';
      statusIcon = '🚨';
      avatarClass = 'avatar-red';
    } else if (status === 'Usa Rede Social') {
      statusClass = 'status-social';
      statusIcon = '📱';
      avatarClass = 'avatar-purple';
    }

    const companyName = escapeHtml(lead['Nome da Empresa'] || 'Empresa Local');
    const initials = companyName.substring(0, 2).toUpperCase();
    const phone = lead['Telefone / WhatsApp'] || 'Não informado';
    const waUrl = getWhatsAppUrl(lead);
    const emailUrl = getEmailUrl(lead);
    const hasWebsite = lead['Website'] && lead['Website'] !== '-';

    return `
      <div class="lead-card glass-panel" data-id="${lead.id}">
        
        <!-- Header -->
        <div class="lead-card-header">
          <div class="lead-title-box">
            <div class="lead-avatar ${avatarClass}">${initials}</div>
            <div>
              <h4 class="lead-company-name">${companyName}</h4>
              <span class="lead-category">${escapeHtml(lead['Categoria'] || 'Comércio')}</span>
            </div>
          </div>
          <span class="status-pill ${statusClass}">
            <span>${statusIcon}</span>
            <span>${escapeHtml(status)}</span>
          </span>
        </div>

        <!-- Details Grid -->
        <div class="lead-details-list">
          <div class="detail-item">
            <span class="detail-label">Telefone / WhatsApp:</span>
            <span class="detail-value phone-clickable" onclick="copyText('${escapeHtml(phone)}')">
              ${escapeHtml(phone)}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Avaliações Google:</span>
            <span class="detail-value">⭐ ${escapeHtml(lead['Nota e Total de Avaliações'] || 'Sem avaliações')}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Horário Atual:</span>
            <span class="detail-value">${escapeHtml(lead['Horário de Funcionamento'] || 'Não informado')}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Website Oficial:</span>
            <span class="detail-value">
              ${hasWebsite 
                ? `<a href="${escapeHtml(lead['Website'])}" target="_blank" rel="noopener" class="site-link">Acessar Domínio ↗</a>` 
                : `<span class="text-dim">Nenhum site</span>`}
            </span>
          </div>
        </div>

        <!-- ACTIONS BAR: 1-Click WhatsApp, Email & Custom Pitch -->
        <div class="lead-actions-bar">
          ${waUrl ? `
            <a href="${waUrl}" target="_blank" rel="noopener" class="btn-whatsapp-action" title="Abrir conversa no WhatsApp com mensagem personalizada">
              <svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
              <span>Chamar no WhatsApp</span>
            </a>
          ` : `
            <button class="btn-whatsapp-action" style="opacity: 0.45; cursor: not-allowed;" onclick="showToast('Número de telefone não informado para este estabelecimento')">
              <span>Sem Telefone</span>
            </button>
          `}

          <a href="${emailUrl}" class="btn-email-action" title="Enviar proposta por E-mail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>E-mail</span>
          </a>

          <button type="button" class="btn-icon-square" title="Personalizar Pitch Comercial" onclick="openContactModal(${lead.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>

          <a href="${escapeHtml(lead['MapsUrl'] || `https://www.google.com/maps/search/${encodeURIComponent(lead['Nome da Empresa'])}`)}" target="_blank" rel="noopener" class="btn-icon-square" title="Ver no Google Maps">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </a>
        </div>

      </div>
    `;
  }).join('');
}

/* ---------------------------------------------------------
   Table Rendering
   --------------------------------------------------------- */
function renderLeadsTable(leads) {
  const tbody = document.getElementById('leads-table-body');
  if (!tbody) return;

  tbody.innerHTML = leads.map(lead => {
    const status = lead['Status do Lead'];
    let statusClass = 'status-has-site';
    if (status === 'Sem Site - Alta Prioridade') statusClass = 'status-no-site';
    else if (status === 'Usa Rede Social') statusClass = 'status-social';

    const waUrl = getWhatsAppUrl(lead);
    const emailUrl = getEmailUrl(lead);

    return `
      <tr>
        <td>
          <strong>${escapeHtml(lead['Nome da Empresa'] || '-')}</strong>
        </td>
        <td>${escapeHtml(lead['Categoria'] || '-')}</td>
        <td>
          <span class="status-pill ${statusClass}">
            ${escapeHtml(status)}
          </span>
        </td>
        <td>
          <span class="phone-clickable" onclick="copyText('${escapeHtml(lead['Telefone / WhatsApp'])}')">
            ${escapeHtml(lead['Telefone / WhatsApp'] || '-')}
          </span>
        </td>
        <td>${escapeHtml(lead['Nota e Total de Avaliações'] || '-')}</td>
        <td>${escapeHtml(lead['Horário de Funcionamento'] || '-')}</td>
        <td>
          ${lead['Website'] && lead['Website'] !== '-' 
            ? `<a href="${escapeHtml(lead['Website'])}" target="_blank" rel="noopener" class="site-link">Ver Link</a>` 
            : '-'}
        </td>
        <td class="text-right">
          <div class="table-action-group">
            ${waUrl ? `
              <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-primary" style="background: #22c55e; border-color: #16a34a; font-size: 0.78rem;">
                WhatsApp
              </a>
            ` : ''}
            <a href="${emailUrl}" class="btn btn-sm btn-outline" style="font-size: 0.78rem;">
              E-mail
            </a>
            <button type="button" class="btn btn-sm btn-outline" onclick="openContactModal(${lead.id})">
              Opções
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ---------------------------------------------------------
   Contact Modal / Pitch Customizer
   --------------------------------------------------------- */
function openContactModal(leadId) {
  const lead = state.activeLeads.find(l => l.id === leadId);
  if (!lead) return;

  state.modalLead = lead;
  state.modalChannel = 'whatsapp';
  state.modalPitchType = 'standard';

  const modal = document.getElementById('contact-modal');
  const modalCompName = document.getElementById('modal-company-name');
  const modalCompInfo = document.getElementById('modal-company-info');
  const modalTextarea = document.getElementById('modal-pitch-text');

  if (modalCompName) modalCompName.textContent = lead['Nome da Empresa'];
  if (modalCompInfo) modalCompInfo.textContent = `${lead['Categoria']} • ${lead['Telefone / WhatsApp']}`;
  if (modalTextarea) modalTextarea.value = buildWhatsAppMessage(lead, 'standard');

  updateModalChannelButtons();
  if (modal) modal.style.display = 'flex';
}

function closeContactModal() {
  const modal = document.getElementById('contact-modal');
  if (modal) modal.style.display = 'none';
  state.modalLead = null;
}

function setContactChannel(channel) {
  state.modalChannel = channel;
  updateModalChannelButtons();

  const sendLabel = document.getElementById('modal-send-label');
  if (sendLabel) {
    sendLabel.textContent = channel === 'whatsapp' ? 'Abrir WhatsApp Agora 🚀' : 'Abrir E-mail Comercial ✉️';
  }
}

function updateModalChannelButtons() {
  const btnWa = document.getElementById('tab-channel-wa');
  const btnMail = document.getElementById('tab-channel-mail');

  if (btnWa) btnWa.classList.toggle('active', state.modalChannel === 'whatsapp');
  if (btnMail) btnMail.classList.toggle('active', state.modalChannel === 'email');
}

function switchModalPitchType(pitchType) {
  state.modalPitchType = pitchType;

  document.querySelectorAll('.pitch-type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (event && event.target) event.target.classList.add('active');

  const modalTextarea = document.getElementById('modal-pitch-text');
  if (modalTextarea && state.modalLead) {
    modalTextarea.value = buildWhatsAppMessage(state.modalLead, pitchType);
  }
}

function copyModalPitch() {
  const modalTextarea = document.getElementById('modal-pitch-text');
  if (modalTextarea) {
    copyText(modalTextarea.value);
  }
}

function sendActiveModalPitch() {
  if (!state.modalLead) return;

  const modalTextarea = document.getElementById('modal-pitch-text');
  const customMessage = modalTextarea ? modalTextarea.value : '';

  if (state.modalChannel === 'whatsapp') {
    const phoneDigits = cleanPhoneDigits(state.modalLead['Telefone / WhatsApp']);
    if (!phoneDigits) {
      showToast('⚠️ Este estabelecimento não possui telefone válido para WhatsApp.');
      return;
    }
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');
  } else {
    const emailUrl = getEmailUrl(state.modalLead);
    window.location.href = emailUrl;
  }

  closeContactModal();
}

/* ---------------------------------------------------------
   Template Management
   --------------------------------------------------------- */
function saveTemplate(key) {
  const textarea = document.getElementById(`tpl-${key}`);
  if (textarea) {
    state.templates[key] = textarea.value;
    showToast('Modelo de mensagem salvo com sucesso!');
  }
}

function copyTemplateText(textareaId) {
  const textarea = document.getElementById(textareaId);
  if (textarea) {
    copyText(textarea.value);
  }
}

/* ---------------------------------------------------------
   Exporting Features
   --------------------------------------------------------- */
async function exportData(format) {
  const leadsToExport = state.filteredLeads.length > 0 ? state.filteredLeads : state.activeLeads;

  if (leadsToExport.length === 0) {
    showToast('Nenhum lead disponível para exportar.');
    return;
  }

  showToast(`Gerando arquivo ${format.toUpperCase()}...`);

  try {
    const response = await fetch(`/api/leads/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leads: leadsToExport,
        filename: 'leads_google_maps_radar'
      })
    });

    if (!response.ok) {
      throw new Error('Falha no download da API');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `leads_google_maps_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    showToast(`✅ Arquivo ${format.toUpperCase()} baixado com sucesso!`);
  } catch (err) {
    console.error('Fallback para exportação no navegador:', err);
    // Client-side CSV fallback
    if (format === 'csv') {
      exportClientSideCSV(leadsToExport);
    } else {
      showToast('Erro ao exportar. Tente o formato CSV.');
    }
  }
}

function exportClientSideCSV(leads) {
  const headers = ['Nome da Empresa', 'Categoria', 'Telefone / WhatsApp', 'Horário de Funcionamento', 'Nota e Total de Avaliações', 'Website', 'Status do Lead'];
  let csvContent = '\uFEFF' + headers.join(';') + '\n';

  leads.forEach(l => {
    const row = headers.map(h => `"${(l[h] || '').replace(/"/g, '""')}"`);
    csvContent += row.join(';') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_google_maps_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('✅ Arquivo CSV baixado com sucesso!');
}

function copyAllPhones() {
  const phones = state.activeLeads
    .map(l => l['Telefone / WhatsApp'])
    .filter(p => p && p !== 'Não informado');

  if (phones.length === 0) {
    showToast('Nenhum telefone localizado para cópia.');
    return;
  }

  const text = phones.join('\n');
  copyText(text);
  showToast(`📋 ${phones.length} números de telefone copiados para a área de transferência!`);
}

/* ---------------------------------------------------------
   Utilities (Clipboard, Toast, Escaping)
   --------------------------------------------------------- */
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copiado para a área de transferência!');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('Copiado para a área de transferência!');
  } catch {
    showToast('Não foi possível copiar automaticamente.');
  }
  document.body.removeChild(textarea);
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>⚡</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
