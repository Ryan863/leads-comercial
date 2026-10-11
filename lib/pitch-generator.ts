import type { Lead } from './leads'

export type PitchTone = 'consultative' | 'preview' | 'direct'
export type SenderPersona = 'auto' | 'ryan' | 'rvll' | 'dev'
export type PitchLanguage = 'auto' | 'pt' | 'en' | 'ja' | 'es' | 'it' | 'de' | 'fr' | 'ar'

export const SUPPORTED_LANGUAGES = [
  { code: 'auto' as const, label: 'Automático (País)', flag: '🌍' },
  { code: 'pt' as const, label: 'Português', flag: '🇧🇷' },
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
  { code: 'ja' as const, label: '日本語 (Japonês)', flag: '🇯🇵' },
  { code: 'ar' as const, label: 'العربية (Árabe/Dubai)', flag: '🇦🇪' },
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
  { code: 'it' as const, label: 'Italiano', flag: '🇮🇹' },
  { code: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
] as const

export function detectLeadLanguage(address?: string, name?: string): PitchLanguage {
  const text = `${address || ''} ${name || ''}`.toLowerCase()

  // 1. Árabe explícito
  if (/[\u0600-\u06ff]/.test(text)) {
    return 'ar'
  }
  // 2. Japão
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]|japan|japão|tokyo|osaka|kyoto|yokohama|nagoya|shibuya|shinjuku/i.test(text)) {
    return 'ja'
  }
  // 3. Espanha / Países hispânicos
  if (/spain|espanha|españa|mexico|méxico|argentina|colombia|chile|madrid|barcelona|buenos aires|valencia|bogota|santiago/i.test(text)) {
    return 'es'
  }
  // 4. Itália
  if (/italy|itália|italia|roma|rome|milano|milan|firenze|florence|napoli|torino/i.test(text)) {
    return 'it'
  }
  // 5. Alemanha / Áustria / Suíça alemã
  if (/germany|alemanha|deutschland|austria|áustria|berlin|munich|münchen|hamburg|frankfurt|köln|vienna|viena|zurich/i.test(text)) {
    return 'de'
  }
  // 6. França / Bélgica francófona / Suíça francesa
  if (/france|frança|paris|lyon|marseille|bordeaux|toulouse|geneva|genebra|brussels|bruxelas/i.test(text)) {
    return 'fr'
  }
  // 7. Países de língua inglesa (EUA, Dubai/UAE comercial, Austrália, UK, Canadá, Irlanda, Holanda negócios)
  if (/dubai|emirados|uae|abu dhabi|sharjah|usa|united states|estados unidos|australia|austrália|uk|united kingdom|reino unido|england|canada|canadá|ireland|irlanda|amsterdam|netherlands|london|sydney|melbourne|brisbane|miami|new york|orlando|florida|california|texas|los angeles|chicago|toronto|vancouver|dublin|nsw|vic|qld|\bfl\b|\bca\b|\bny\b|\btx\b/i.test(text)) {
    return 'en'
  }
  // Padrão Brasil / Portugal
  return 'pt'
}

export type PitchSettings = {
  senderName: string
  senderCity: string
  senderRole: string
  persona: SenderPersona
  geminiApiKey?: string
  tone: PitchTone
  language?: PitchLanguage
}

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  senderName: 'Ryan',
  senderCity: 'Videira',
  senderRole: 'crio sites limpos e práticos',
  persona: 'auto',
  geminiApiKey: '',
  tone: 'consultative',
  language: 'auto',
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

  const regex = new RegExp(`(^|[^a-z0-9])${cleanCity}([^a-z0-9]|$)`, 'i')
  return regex.test(cleanAddr)
}

/**
 * Detecta se o lead é de um país internacional (EUA, Austrália, UK, Canadá, etc.)
 */
export function isInternationalLead(address?: string, name?: string): boolean {
  const norm = `${address || ''} ${name || ''}`.toLowerCase()
  const internationalKeywords = [
    'usa', 'united states', 'estados unidos', 'australia', 'austrália', 'uk', 'united kingdom',
    'reino unido', 'england', 'canada', 'canadá', 'london', 'sydney', 'melbourne', 'brisbane',
    'miami', 'new york', 'orlando', 'florida', 'california', 'texas', 'los angeles', 'chicago',
    'toronto', 'vancouver', 'nsw', 'vic', 'qld', 'fl 3', 'ca 9', 'ny 1', 'tx 7'
  ]
  return internationalKeywords.some((w) => norm.includes(w))
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

  // Resolve idioma final (configurado manualmente ou detectado pela localização do lead)
  const lang = (settings.language && settings.language !== 'auto')
    ? settings.language
    : detectLeadLanguage(lead.address, lead.name)

  let activePersona = persona
  if (persona === 'auto') {
    activePersona = recipient.type === 'business' && variationIndex % 2 === 1 ? 'rvll' : 'ryan'
  }

  // 1. JAPONÊS (日本語) - Abordagem cortês empresarial (Keigo / 丁寧語)
  if (lang === 'ja') {
    const greeting = `${recipient.display}様、初めまして。突然のご連絡失礼いたします。`

    let presentation = ''
    if (activePersona === 'rvll') {
      presentation = `Webサイト・LP制作を行っておりますRvllチームと申します。地域ビジネスや店舗様向けに、スマートフォンで見やすく問い合わせ・予約につながる公式ページの制作を行っております。`
    } else if (activePersona === 'dev') {
      presentation = `Web開発をしておりますエンジニアです。表示速度が速く、LINEやWebからの予約・集客に特化したサイト構築を行っております。`
    } else {
      presentation = `フリーランスでWebサイト制作をしております${senderName}と申します。スマートフォンに最適化された清潔感のあるホームページ制作を専門にしております。`
    }

    let diagnosisAndValue = ''
    if (hasInstagram) {
      diagnosisAndValue = `Instagramでの素敵な発信を拝見いたしました。一方で、Google等で検索された新規のお客様がメニューや詳細をすぐに確認できる専用ページがあると、SNSのフォロワー様も迷わずスムーズにご予約・お問い合わせへと繋げることができます。`
    } else if (presence === 'none') {
      diagnosisAndValue = `Googleマップにて貴店を拝见したところ、専用の公式ホームページがまだ掲載されていないようでした。スマホで手軽に見られる清潔感のあるページを用意することで、初めてのお客様にも大きな安心感をお届けできます。`
    } else {
      diagnosisAndValue = `現在のオンラインでのご案内を拝見いたしました。現在8割以上のお客様がスマートフォンから検索されますので、表示速度が速く直感的に予約できる構造に整えることで、反響率を大幅に向上させることが可能です。`
    }

    let cta = `もしご興味がございましたら、貴店に合わせた簡単なプレビュー案を画像または動画でご案内できますが、いかがでしょうか？`
    if (tone === 'direct') {
      cta = `ご迷惑でなければ、今週中に簡単なデモ案をお送りすることも可能ですので、お気軽にお知らせください。`
    }

    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 1.5. ÁRABE (العربية - Dubai / Emirados Árabes)
  if (lang === 'ar') {
    const greeting = `مرحباً ${recipient.display}، أتمنى أن تكونوا بخير!`
    let presentation = ''
    if (activePersona === 'rvll') {
      presentation = `نحن من فريق Rvll، متخصصون في تصميم وتطوير مواقع إلكترونية عصرية وسريعة تركز على تحويل الزوار إلى حجوزات واستفسارات مباشرة عبر واتساب.`
    } else if (activePersona === 'dev') {
      presentation = `أنا مطور مواقع ويب متخصص في إنشاء صفحات هبوط سريعة وخفيفة ومتوافقة تماماً مع الهواتف الذكية لجلب العملاء.`
    } else {
      presentation = `اسمي ${senderName}، مطور مواقع ويب ومصمم صفحات هبوط متقدمة تركز على نمو الأعمال المحلية والخدمية.`
    }

    let diagnosisAndValue = ''
    if (hasInstagram) {
      diagnosisAndValue = `لقد اطلعت على حسابكم في إنستغرام وعملكم المميز! ومع ذلك، فإن العملاء الجدد القادمين من غوغل غالباً ما يبحثون عن صفحة رسمية متكاملة توضح كافة الخدمات وتتيح الحجز الفوري بضغطة زر واحدة.`
    } else if (presence === 'none') {
      diagnosisAndValue = `لاحظت نشاطكم التجاري على خرائط غوغل وتبيّن لي أنه ليس لديكم موقع رسمي مخصص حتى الآن. وجود موقع إلكتروني يعزز مصداقية العمل ويسهّل وصول العملاء للتواصل والحجز المباشر.`
    } else {
      diagnosisAndValue = `أكثر من 80% من عمليات البحث تتم اليوم عبر الهواتف، وامتلاك موقع حديث وفائق السرعة ومربوط بواتساب يضاعف عادةً عدد الاستفسارات الواردة.`
    }

    let cta = 'هل يناسبكم أن أشارككم نموذجاً مبسطاً وتصوراً سريعاً لكيفية ظهور هذه الصفحة لعملكم؟'
    if (tone === 'preview') {
      cta = 'هل ترغبون في رؤية فيديو توضيحي لمدة دقيقة يعرض هذا النموذج التجريبي؟'
    } else if (tone === 'direct') {
      cta = 'هل لديكم اهتمام بالاطلاع على نموذج تجريبي دون أي التزام خلال هذا الأسبوع؟'
    }

    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 2. ESPANHOL (Español)
  if (lang === 'es') {
    const greeting = `Hola, ${recipient.display}, ¿cómo estás?`
    let presentation = ''
    if (activePersona === 'rvll') {
      presentation = `Somos del equipo Rvll, especializados en el diseño de páginas web modernas y enfocadas en conversiones y citas directas por WhatsApp.`
    } else if (activePersona === 'dev') {
      presentation = `Soy desarrollador web enfocado en la creación de páginas institucionales rápidas, limpias y optimizadas para celulares.`
    } else {
      presentation = `Mi nombre es ${senderName}, soy desarrollador web y me dedico a crear sitios rápidos y prácticos para negocios locales.`
    }

    let diagnosisAndValue = ''
    if (hasInstagram) {
      diagnosisAndValue = `Vi su perfil en Instagram y el excelente trabajo que comparten. Sin embargo, quienes buscan en Google o entran al enlace de la bio muchas veces necesitan una página oficial donde ver todos los servicios y contactar directo por WhatsApp con 1 toque.`
    } else if (presence === 'none') {
      diagnosisAndValue = `Noté su negocio en Google y vi que no cuentan con un sitio web oficial. Tener una página propia brinda confianza inmediata, resuelve dudas frecuentes y facilita que nuevos clientes reserven directo por WhatsApp.`
    } else {
      diagnosisAndValue = `Estuve viendo su presencia online. Hoy más del 80% de los clientes busca por celular, y una página moderna ultra rápida suele duplicar la cantidad de contactos recibidos.`
    }

    let cta = '¿Tendrías interés en ver un modelo sencillo sin compromiso de cómo quedaría esta estructura para su negocio?'
    if (tone === 'preview') {
      cta = '¿Tendría sentido que te muestre una vista previa rápida de 1 minuto de cómo quedaría esta estructura?'
    }

    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 3. ITALIANO
  if (lang === 'it') {
    const greeting = `Ciao ${recipient.display}, piacere di conoscerti!`
    const presentation = activePersona === 'rvll'
      ? `Siamo il team Rvll, specializzati nella realizzazione di siti web moderni e veloci pensati per convertire visitatori in prenotazioni dirette.`
      : `Mi chiamo ${senderName}, sono uno sviluppatore web e creo siti puliti, veloci e ad alta conversione per attività locali.`
    const diagnosisAndValue = hasInstagram
      ? `Ho visto la vostra bella presenza su Instagram. Tuttavia, chi vi cerca su Google spesso ha bisogno di un sito ufficiale dove visualizzare tutti i servizi e contattarvi direttamente in un clic.`
      : presence === 'none'
        ? `Ho notato la vostra attività su Google e ho visto che non avete ancora un sito web ufficiale. Avere una pagina chiara e moderna trasmette subito fiducia e facilita le prenotazioni.`
        : `Oggi oltre l'80% delle persone naviga da smartphone: un sito ultra-veloce ottimizzato per il contatto diretto raddoppia i messaggi ricevuti.`
    const cta = `Ti farebbe piacere vedere un'anteprima veloce senza impegno di come potrebbe apparire il sito per la tua attività?`
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 4. ALEMÃO (Deutsch)
  if (lang === 'de') {
    const greeting = `Hallo ${recipient.display}, ich hoffe, es geht Ihnen gut!`
    const presentation = `Mein Name ist ${senderName}, ich bin Webentwickler und erstelle moderne, schnelle und für Mobilgeräte optimierte Websites für lokale Unternehmen.`
    const diagnosisAndValue = presence === 'none'
      ? `Ich habe Ihr Unternehmen auf Google gesehen und bemerkt, dass Sie noch keine offizielle Website haben. Eine klare mobile Website schafft sofortiges Vertrauen und ermöglicht direkte Buchungen.`
      : `Eine moderne, schnelle Website verdoppelt oft die direkten Kundenanfragen über mobile Endgeräte.`
    const cta = `Hätten Sie Interesse an einer kurzen, unverbindlichen Vorschau, wie so eine moderne Website für Ihr Unternehmen aussehen könnte?`
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 5. FRANCÊS (Français)
  if (lang === 'fr') {
    const greeting = `Bonjour ${recipient.display}, j'espère que vous allez bien !`
    const presentation = `Je m'appelle ${senderName}, je suis développeur web et je conçois des sites vitrines modernes, rapides et optimisés pour générer des prises de contact directes.`
    const diagnosisAndValue = presence === 'none'
      ? `J'ai remarqué votre établissement sur Google et j'ai vu que vous n'aviez pas encore de site officiel. Un site clair et soigné renforce la crédibilité et facilite la prise de contact en 1 clic.`
      : `Aujourd'hui, plus de 80% des recherches se font sur mobile. Un site ultra-rapide permet souvent de doubler le taux de réservation.`
    const cta = `Seriez-vous ouvert à voir un aperçu rapide et sans engagement de ce que cela donnerait pour votre établissement ?`
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 6. INGLÊS (English - EUA, Austrália, UK, Canadá, etc.)
  if (lang === 'en') {
    const greeting = `Hi ${recipient.display}, hope you're doing well!`

    let presentation = ''
    if (activePersona === 'rvll') {
      presentation = `We're from the Rvll team, specializing in clean, modern, and high-converting websites designed to turn visitors into booked clients.`
    } else if (activePersona === 'dev') {
      presentation = `I'm a web developer focused on building fast, mobile-friendly landing pages that drive direct inquiries and appointments.`
    } else {
      presentation = `My name is ${senderName}, I'm a web developer creating clean, high-performance websites for ${specialty.isHealth ? 'healthcare practices' : specialty.isFood ? 'restaurants and food services' : 'local businesses'}.`
    }

    let diagnosisAndValue = ''
    if (hasInstagram) {
      diagnosisAndValue = `I came across your Instagram profile and loved your work! However, customers finding you on Google or clicking your bio link often look for an official mobile page with your full services, making it easy to book or contact you directly in one tap.`
    } else if (presence === 'none') {
      diagnosisAndValue = `I noticed ${lead.name} on Google and saw that customers searching for your services don't find an official dedicated website. Having a clean, dedicated website builds immediate credibility, answers key questions, and directs customers straight to your direct contact.`
    } else {
      diagnosisAndValue = `I checked your online presence. Today, over 80% of local searches happen on mobile phones, and having an ultra-fast page optimized for instant WhatsApp or call inquiries often doubles the inquiry rate.`
    }

    let cta = 'Would you be open to checking out a quick, no-obligation preview of what this structure could look like for your business?'
    if (tone === 'direct') {
      cta = 'Would you be interested in taking a look at a clean model sometime this week?'
    } else if (tone === 'preview') {
      cta = 'Would it make sense for me to share a quick 1-minute video preview of this layout?'
    }

    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 1. Saudação em Português
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
