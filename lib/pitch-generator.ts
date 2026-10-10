import type { Lead } from './leads'

export type PitchTone = 'consultative' | 'preview' | 'direct'
export type SenderPersona = 'auto' | 'ryan' | 'rvll' | 'dev'

export type PitchSettings = {
  senderName: string
  senderCity: string
  senderRole: string
  persona: SenderPersona
  geminiApiKey?: string
  tone: PitchTone
}

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  senderName: 'Ryan',
  senderCity: 'Videira',
  senderRole: 'crio sites limpos e práticos',
  persona: 'auto',
  geminiApiKey: '',
  tone: 'consultative',
}

const STORAGE_KEY = 'sondar_pitch_settings_v2'

export function getStoredPitchSettings(): PitchSettings {
  if (typeof window === 'undefined') return DEFAULT_PITCH_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PITCH_SETTINGS
    return { ...DEFAULT_PITCH_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PITCH_SETTINGS
  }
}

export function saveStoredPitchSettings(settings: PitchSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('Erro ao salvar configurações de pitch:', err)
  }
}

/**
 * Detecta se o lead está na mesma cidade base do remetente (ex: Videira).
 */
export function isLeadInSameCity(address: string, senderCity = 'Videira'): boolean {
  if (!address || !senderCity) return false
  const cleanAddr = address
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const cleanCity = senderCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  if (!cleanCity) return false
  const regex = new RegExp(`(^|[^a-z0-9])${cleanCity}([^a-z0-9]|$)`, 'i')
  return regex.test(cleanAddr)
}

/**
 * Extrai o nome da cidade a partir do endereço do lead, caso disponível.
 */
export function extractCityFromAddress(address: string): string | null {
  if (!address) return null
  const match = address.match(/(?:[-—,]\s*)([A-Za-zÀ-ú\s]{3,24})\s*-\s*[A-Z]{2}\b/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  return null
}

/**
 * Analisa o nome do lead para extrair um destinatário humanizado:
 * - Pessoa física: "Marisangela", "Jayne", "Camila"
 * - Clínica/Empresa: "equipe do Una Vita", "equipe da Bella Napoli"
 */
export function extractRecipient(name: string): { type: 'person' | 'business'; display: string } {
  const clean = name.trim()

  const withoutSuffixes = clean
    .replace(
      /\s*[-–—|•]\s*(fisioterapeuta|dentista|médic[ao]|nutricionista|psicólog[ao]|advogad[ao]|estética|clínica|consultório|pizzaria|delivery|epp|me|ltda|sc|sp|pr|rs|videira).*$/i,
      '',
    )
    .trim()

  const titleMatch = withoutSuffixes.match(
    /^(?:dra?\.?|doutor(?:a)?|fisioterapeuta|nutricionista|psicólog(?:a|o))\s+([A-Za-zÀ-ú]+)/i,
  )
  if (titleMatch && titleMatch[1]) {
    return { type: 'person', display: capitalize(titleMatch[1]) }
  }

  const businessKeywords = [
    'espaço', 'espaco', 'clínica', 'clinica', 'consultório', 'consultorio', 'centro',
    'pizzaria', 'restaurante', 'lanchonete', 'hamburgueria', 'forneria', 'cantina',
    'studio', 'estúdio', 'auto', 'mecânica', 'mecanica', 'oficina', 'garage', 'detailing',
    'imobiliária', 'imobiliaria', 'imóveis', 'imoveis', 'farmácia', 'farmacia', 'loja',
    'laboratório', 'laboratorio', 'instituto', 'escola', 'academia', 'salão', 'salao', 'barbearia',
  ]

  const lower = withoutSuffixes.toLowerCase()
  const isBusiness = businessKeywords.some((w) => lower.includes(w))

  if (!isBusiness) {
    const words = withoutSuffixes.split(/\s+/)
    if (words.length >= 1 && words.length <= 4) {
      const first = words[0].replace(/[^A-Za-zÀ-ú]/g, '')
      if (first.length >= 3) {
        return { type: 'person', display: capitalize(first) }
      }
    }
  }

  const businessName = withoutSuffixes.replace(/^(?:o|a|os|as)\s+/i, '').trim()

  if (/^espaço\s+/i.test(businessName)) {
    const afterEspaco = businessName.replace(/^espaço\s+/i, '').trim()
    return { type: 'business', display: `equipe do ${afterEspaco || businessName}` }
  }

  const isFeminine = /^(clínica|pizzaria|hamburgueria|forneria|mecânica|imobiliária|oficina|barbearia|loja|escola|academia)\b/i.test(
    businessName,
  )
  const article = isFeminine ? 'da' : 'do'

  const shortName = businessName
    .replace(/^(clínica|consultório|pizzaria|oficina|restaurante|studio)\s+(de\s+|da\s+|do\s+)?/i, '')
    .trim()

  return { type: 'business', display: `equipe ${article} ${shortName || businessName}` }
}

/**
 * Extrai rua ou bairro do endereço para gancho de localização.
 */
export function extractLocationHook(address: string, isSameCity: boolean, leadCity: string | null): string {
  if (!address || address.length < 4) {
    return isSameCity ? 'aqui na cidade' : leadCity ? `em ${leadCity}` : 'da região'
  }

  const clean = address.replace(/\b\d{5}-?\d{3}\b/g, '').trim()
  const segments = clean
    .split(/[-—,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  let street = ''
  let neighborhood = ''

  for (const seg of segments) {
    if (
      /^\d+$/.test(seg) ||
      /\d{5}/.test(seg) ||
      /^(sc|sp|pr|rs|mg|rj|ba|ce|pe|df|go)$/i.test(seg) ||
      (leadCity && seg.toLowerCase() === leadCity.toLowerCase())
    ) {
      continue
    }

    if (!street && (/(?:rua|r\.|av\.|avenida|travessa|alameda)\s+/i.test(seg) || /^[A-Za-zÀ-ú\s]{4,}$/.test(seg))) {
      street = seg
        .replace(/^(?:rua|r\.|avenida|av\.|alameda|travessa)\s+/i, '')
        .replace(/\s*\d+.*$/, '')
        .trim()
      continue
    }

    if (street && !neighborhood && !/^\d+/.test(seg)) {
      neighborhood = seg.replace(/^(?:bairro|no|jardim)\s+/i, '').trim()
      break
    }
  }

  if (street && street.length >= 3) {
    const isAv = /^(av|avenida|travessa|alameda)\b/i.test(street)
    const prefix = isAv ? 'na' : 'na'

    if (neighborhood && neighborhood.length >= 3 && neighborhood.toLowerCase() !== 'centro') {
      return `${prefix} ${street} no ${neighborhood}`
    }
    return `${prefix} ${street}`
  }

  return isSameCity ? 'aqui na cidade' : leadCity ? `em ${leadCity}` : 'da região'
}

/**
 * Identifica o nicho e especialidade do lead.
 */
export function extractSpecialtyInfo(lead: Lead): {
  isHealth: boolean
  isPelvicOrPhysio: boolean
  isDental: boolean
  isFood: boolean
  isAuto: boolean
  isRealEstate: boolean
  specialtyLabel: string
  clientTerm: string
} {
  const combined = `${lead.name} ${lead.category}`.toLowerCase()

  const isPelvic = combined.includes('pélvic') || combined.includes('pelvic')
  const isPhysio = combined.includes('fisioter') || isPelvic
  const isDental = combined.includes('odont') || combined.includes('dent') || combined.includes('sorriso')
  const isHealth = isPhysio || isDental || /cl[ií]nic|m[eé]dic|sa[uú]de|psic[oó]l|terap|nutri/i.test(combined)
  const isFood = /pizz|restaur|hamburg|lanch|lanche|forn|delivery|gastronom|sabor|comida/i.test(combined)
  const isAuto = /mec[aâ]n|auto|oficina|est[eé]tica autom|lava|detail|garag|turbo/i.test(combined)
  const isRealEstate = /imob|corret|im[oó]v/i.test(combined)

  let specialtyLabel = 'serviços e atendimentos'
  let clientTerm = 'cliente'

  if (isPelvic) {
    specialtyLabel = 'fisioterapia pélvica'
    clientTerm = 'paciente'
  } else if (isPhysio) {
    specialtyLabel = 'fisioterapia e reabilitação'
    clientTerm = 'paciente'
  } else if (isDental) {
    specialtyLabel = 'odontologia e estética bucal'
    clientTerm = 'paciente'
  } else if (isHealth) {
    specialtyLabel = 'serviços de saúde e bem-estar'
    clientTerm = 'paciente'
  } else if (isFood) {
    specialtyLabel = 'gastronomia e pedidos rápidos'
    clientTerm = 'cliente'
  } else if (isAuto) {
    specialtyLabel = 'cuidados e serviços automotivos'
    clientTerm = 'cliente'
  } else if (isRealEstate) {
    specialtyLabel = 'negócios imobiliários'
    clientTerm = 'cliente'
  }

  return {
    isHealth,
    isPelvicOrPhysio: isPhysio,
    isDental,
    isFood,
    isAuto,
    isRealEstate,
    specialtyLabel,
    clientTerm,
  }
}

function capitalize(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Gera a assinatura adaptada conforme persona escolhida:
 * - 'ryan': "Sou o Ryan..."
 * - 'rvll': "Somos da equipe Rvll..."
 * - 'dev': "Sou desenvolvedor web..."
 * - 'auto': escolhe com base no contexto do lead (pessoa física vs clínica/empresa)
 */
export function buildPresentation(
  persona: SenderPersona,
  senderName: string,
  senderCity: string,
  isSameCity: boolean,
  specialtyLabel: string,
  isHealth: boolean,
  isBusinessLead: boolean,
  variationIndex = 0,
): string {
  // Resolve modo auto
  let activePersona = persona
  if (persona === 'auto') {
    // Se for empresa/espaço, alterna entre Rvll e Ryan; se for profissional individual, prioriza contato pessoal
    if (isBusinessLead && variationIndex % 2 === 1) {
      activePersona = 'rvll'
    } else if (variationIndex % 3 === 2) {
      activePersona = 'dev'
    } else {
      activePersona = 'ryan'
    }
  }

  // 1. Caso seja da MESMA CIDADE (fala que mora/é dali)
  if (isSameCity) {
    if (activePersona === 'rvll') {
      const rvllLocalVariants = [
        `Somos da equipe Rvll, atuamos aqui em ${senderCity} criando sites institucionais limpos e focados em ${specialtyLabel}.`,
        `Aqui é da equipe Rvll, trabalhamos com desenvolvimento de páginas modernas e práticas para ${isHealth ? 'profissionais e clínicas de saúde' : 'empresas locais'} da nossa cidade.`,
      ]
      return rvllLocalVariants[variationIndex % rvllLocalVariants.length]
    }

    if (activePersona === 'dev') {
      const devLocalVariants = [
        `Sou desenvolvedor web aqui em ${senderCity} e crio sites limpos e rápidos para ${isHealth ? 'profissionais da saúde' : 'estabelecimentos'} da região.`,
        `Trabalho com desenvolvimento de sites práticos aqui em ${senderCity}, com foco especial em ${specialtyLabel}.`,
      ]
      return devLocalVariants[variationIndex % devLocalVariants.length]
    }

    // Persona Ryan na mesma cidade (padrão original do Ryan)
    const ryanLocalVariants = [
      `Meu nome é ${senderName}, moro aqui em ${senderCity} e crio sites limpos e práticos para ${isHealth ? 'profissionais da saúde' : 'empresas'} da cidade.`,
      `Sou o ${senderName}, sou aqui de ${senderCity} e desenvolvo sites rápidos focados em ${specialtyLabel}.`,
      `Meu nome é ${senderName}, sou de ${senderCity} e trabalho desenvolvendo sites institucionais para ${isHealth ? 'consultórios e atendimentos de saúde' : 'negócios locais'}.`,
    ]
    return ryanLocalVariants[variationIndex % ryanLocalVariants.length]
  }

  // 2. Caso NÃO SEJA DA CIDADE DELE (NÃO fala onde mora nem cita a própria cidade!)
  if (activePersona === 'rvll') {
    const rvllRemoteVariants = [
      `Somos da equipe Rvll, trabalhamos desenvolvendo sites institucionais limpos e de alta conversão para ${isHealth ? 'consultórios e clínicas' : 'empresas e atendimentos'}.`,
      `Aqui é da equipe Rvll. Atuamos criando páginas web rápidas e práticas com foco em agendamentos diretos no WhatsApp para ${specialtyLabel}.`,
    ]
    return rvllRemoteVariants[variationIndex % rvllRemoteVariants.length]
  }

  if (activePersona === 'dev') {
    const devRemoteVariants = [
      `Sou desenvolvedor web focado na criação de sites limpos, modernos e de carregamento rápido para ${isHealth ? 'profissionais e consultórios de saúde' : 'negócios locais'}.`,
      `Trabalho com desenvolvimento de páginas institucionais práticas e enxutas com foco em ${specialtyLabel}.`,
    ]
    return devRemoteVariants[variationIndex % devRemoteVariants.length]
  }

  // Persona Ryan fora da cidade (NUNCA diz que mora na cidade do lead nem onde mora)
  const ryanRemoteVariants = [
    `Meu nome é ${senderName}, sou desenvolvedor web e crio sites limpos e práticos focados em ${isHealth ? 'consultórios e profissionais de saúde' : 'empresas de serviços'}.`,
    `Sou o ${senderName}, trabalho com desenvolvimento de páginas rápidas e institucionais com foco em ${specialtyLabel}.`,
    `Meu nome é ${senderName}, atuo desenvolvendo sites modernos focados em agendamentos diretos no WhatsApp para ${isHealth ? 'atendimentos de saúde' : 'empresas locais'}.`,
  ]
  return ryanRemoteVariants[variationIndex % ryanRemoteVariants.length]
}

/**
 * Gera a mensagem adaptada completa para o lead, considerando:
 * - Cidade do lead vs cidade base (não cita moradia se for de fora)
 * - Se tem Instagram (foca na necessidade de transformar seguidores e quem busca no Google em agendamentos no WhatsApp)
 * - Se não tem site (foca em autoridade, tirar dúvidas pré-atendimento)
 * - Se tem site (foca em velocidade móvel e foco em conversão no WhatsApp)
 * - Persona flexível (Ryan, Equipe Rvll, Dev Web)
 */
export function generatePitch(
  lead: Lead,
  customSettings?: Partial<PitchSettings>,
  variationIndex = 0,
): string {
  const settings: PitchSettings = {
    ...DEFAULT_PITCH_SETTINGS,
    ...(typeof window !== 'undefined' ? getStoredPitchSettings() : {}),
    ...customSettings,
  }

  const { senderName, senderCity, persona, tone } = settings
  const recipient = extractRecipient(lead.name)
  const isSameCity = isLeadInSameCity(lead.address, senderCity)
  const leadCity = extractCityFromAddress(lead.address)
  const location = extractLocationHook(lead.address, isSameCity, leadCity)
  const specialty = extractSpecialtyInfo(lead)
  const presence = lead.presence
  const hasInstagram = presence === 'social' || (lead.website && /instagram\.com/i.test(lead.website))

  // 1. Saudação
  const greeting = `Olá, ${recipient.display}, tudo bem?`

  // 2. Apresentação adaptada (persona + mesma cidade ou de fora)
  const presentation = buildPresentation(
    persona,
    senderName,
    senderCity,
    isSameCity,
    specialty.specialtyLabel,
    specialty.isHealth,
    recipient.type === 'business',
    variationIndex,
  )

  // 3. Diagnóstico e Necessidade Real da Empresa
  let diagnosisAndValue = ''

  // CENÁRIO A: TEM INSTAGRAM (Necessidade do Instagram -> Site Oficial -> WhatsApp)
  if (hasInstagram) {
    if (specialty.isPelvicOrPhysio) {
      diagnosisAndValue = `Acompanhei o perfil de vocês no Instagram e vi o ótimo trabalho que fazem divulgando a fisioterapia pélvica. Porém, como é uma área que envolve muita intimidade e dúvidas prévias, quem pesquisa pelo tratamento no Google ou clica na bio muitas vezes sente falta de uma página acolhedora explicando os casos indicados e permitindo agendar a avaliação no WhatsApp com 1 toque.`
    } else if (specialty.isHealth) {
      diagnosisAndValue = `Acompanhei a presença de vocês no Instagram e o cuidado com as postagens. No entanto, no feed as informações se perdem rápido, e quem busca por atendimento no Google muitas vezes não encontra uma página oficial que reúna todas as especialidades e tire as dúvidas mais frequentes antes do agendamento no WhatsApp.`
    } else if (specialty.isFood) {
      diagnosisAndValue = `Vi o Instagram de vocês e as fotos dão água na boca! Porém, quem vai pedir muitas vezes não encontra um cardápio digital próprio rápido para pedir direto pelo WhatsApp. Ter uma página web na bio e no Google agiliza o atendimento das mensagens e evita que vocês percam clientes para taxas de aplicativos.`
    } else {
      diagnosisAndValue = `Vi o trabalho bacana que vocês compartilham no Instagram. Mas quem busca pela empresa no Google ou clica no link da bio muitas vezes não encontra uma página oficial que organize todos os serviços e passe credibilidade imediata. Um site próprio limpo serve como vitrine para converter esses visitantes em clientes direto no WhatsApp.`
    }
  }

  // CENÁRIO B: NÃO TEM SITE (Necessidade de Vitrine Oficial no Google)
  else if (presence === 'none') {
    if (specialty.isPelvicOrPhysio) {
      if (variationIndex % 2 === 0) {
        diagnosisAndValue = `Vi o seu consultório ${location} e notei a sua especialização em fisioterapia pélvica. Por ser uma área tão específica e que exige muita confiança, ter um site institucional explicando de forma acolhedora para quais casos o tratamento é indicado tira as principais dúvidas da ${specialty.clientTerm} antes do primeiro contato e facilita o agendamento no WhatsApp.`
      } else {
        diagnosisAndValue = `Notei o seu atendimento ${location} com foco em ${specialty.specialtyLabel}. Ter uma página oficial na internet valoriza muito o seu nome profissional, esclarece as dúvidas mais comuns sobre o tratamento e permite que a ${specialty.clientTerm} marque a avaliação no seu WhatsApp com apenas um toque.`
      }
    } else if (specialty.isHealth) {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e notei que quem pesquisa pela clínica no Google não encontra uma página oficial que reúna todas as atividades e cuidados oferecidos. Um site simples organiza as terapias do espaço e serve como uma vitrine acolhedora para novos ${specialty.clientTerm}s da região.`
    } else if (specialty.isFood) {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e notei que quem pesquisa pelo estabelecimento no Google não encontra um cardápio digital oficial fácil para pedir direto pelo WhatsApp. Ter uma página própria rápida com fotos reais e botão direto pro WhatsApp economiza tempo no atendimento e fideliza clientes sem taxas de aplicativos.`
    } else if (specialty.isAuto) {
      diagnosisAndValue = `Vi o trabalho de vocês ${location} e o padrão dos serviços oferecidos. Ter um site simples apresentando os principais cuidados realizados e botão direto pro WhatsApp passa muita confiança para quem está procurando por socorro ou manutenção na região.`
    } else {
      diagnosisAndValue = `Vi o negócio de vocês ${location} e notei que quem pesquisa pela empresa no Google não encontra uma página oficial com serviços e horários atualizados. Um site limpo e bem posicionado serve como vitrine e direciona contatos quentes direto para o seu WhatsApp.`
    }
  }

  // CENÁRIO C: JÁ TEM SITE (Necessidade de Otimização Mobile e Conversão WhatsApp)
  else {
    diagnosisAndValue = `Dei uma olhada na presença online de vocês ${location}. Hoje, mais de 80% das pessoas buscam serviços pelo celular, e muitos sites antigos acabam perdendo oportunidades por não serem rápidos ou não direcionarem com clareza para o WhatsApp. Uma página moderna e ultrarrápida costuma dobrar a taxa de contatos recebidos.`
  }

  // 4. Pergunta de fechamento (CTA suave sem pressão)
  let cta = ''
  if (tone === 'preview') {
    cta = 'Faz sentido eu mostrar uma prévia de como ficaria essa estrutura?'
  } else if (tone === 'direct') {
    cta = 'Teria interesse em ver um modelo simples sem compromisso?'
  } else {
    const ctaVariants = [
      'Teria interesse em avaliar a criação de um site próprio para o seu consultório?',
      'Faz sentido eu mostrar uma prévia de como ficaria essa estrutura?',
      'Teria interesse em ver um modelo simples sem compromisso?',
      'Se fizer sentido, posso gravar um vídeo rápido de 1 minuto mostrando como ficaria essa vitrine na prática.',
    ]
    cta = ctaVariants[variationIndex % ctaVariants.length]
  }

  return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
}
