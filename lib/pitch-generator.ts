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
  const addrClean = (address || '').toLowerCase()
  const text = `${address || ''} ${name || ''}`.toLowerCase()

  // Se for explicitamente Brasil (estados brasileiros ou menção a Brasil), é SEMPRE português
  if (
    /\b(?:sc|sp|pr|rs|mg|rj|ba|ce|pe|df|go|es|mt|ms|am|pa|rn|pb|al|se|ro|ac|ap|rr|to)\b/i.test(addrClean) ||
    /brasil|brazil|florian[oó]polis|joinville|blumenau|curitiba|s[aã]o paulo|porto alegre|videira|joa[cç]aba|chapec[oó]/i.test(text)
  ) {
    return 'pt'
  }

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
  // 7. Países de língua inglesa (com word boundary estrito nas siglas de províncias para evitar colidir com "pélvica", etc.)
  if (/dubai|emirados|uae|abu dhabi|sharjah|usa|united states|estados unidos|australia|austrália|uk|united kingdom|reino unido|england|canada|canadá|ireland|irlanda|amsterdam|netherlands|london|sydney|melbourne|brisbane|miami|new york|orlando|florida|california|texas|los angeles|chicago|toronto|vancouver|dublin|\bnsw\b|\bvic\b|\bqld\b|\bfl\b|\bca\b|\bny\b|\btx\b/i.test(text)) {
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
  autoGemini?: boolean
  tone: PitchTone
  language?: PitchLanguage
}

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  senderName: 'Ryan',
  senderCity: 'Videira',
  senderRole: 'crio sites limpos e práticos',
  persona: 'auto',
  geminiApiKey: '',
  autoGemini: true,
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
  if (/\b(?:sc|sp|pr|rs|mg|rj|ba|ce|pe|df|go|es|mt|ms|am|pa|rn|pb|al|se|ro|ac|ap|rr|to)\b/i.test(address || '') || /brasil|brazil/i.test(norm)) {
    return false
  }
  const internationalRegex = /\b(?:usa|united states|estados unidos|australia|austrália|uk|united kingdom|reino unido|england|canada|canadá|london|sydney|melbourne|brisbane|miami|new york|orlando|florida|california|texas|los angeles|chicago|toronto|vancouver|nsw|vic|qld|fl|ca|ny|tx)\b/i
  return internationalRegex.test(norm)
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

function capitalize(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Analisa o nome do lead para extrair um destinatário humanizado:
 * - Pessoa física: "Marisangela", "Dra. Letícia", "Camila"
 * - Clínica/Empresa: "equipe do Una Vita", "equipe da Gênesis Estética Automotiva"
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
    const isDr = /^dr/i.test(withoutSuffixes)
    return { type: 'person', display: isDr ? `Dra. ${capitalize(titleMatch[1])}` : capitalize(titleMatch[1]) }
  }

  const businessKeywords = [
    'espaço', 'espaco', 'clínica', 'clinica', 'consultório', 'consultorio', 'centro',
    'pizzaria', 'restaurante', 'lanchonete', 'hamburgueria', 'forneria', 'cantina',
    'studio', 'estúdio', 'auto', 'mecânica', 'mecanica', 'oficina', 'garage', 'detailing',
    'imobiliária', 'imobiliaria', 'imóveis', 'imoveis', 'farmácia', 'farmacia', 'loja',
    'laboratório', 'laboratorio', 'instituto', 'escola', 'academia', 'salão', 'salao', 'barbearia',
    'vidraçaria', 'refrigeração', 'refrigeracao', 'climatização', 'climatizacao', 'pet', 'vet',
    'estética automotiva', 'estetica automotiva',
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

  // Feminino vs Masculino
  const isFeminine = /^(clínica|pizzaria|hamburgueria|forneria|mecânica|imobiliária|oficina|barbearia|loja|escola|academia|vidraçaria|refrigeração|floricultura|ótica|estética|autoescola)\b/i.test(
    businessName,
  )
  const article = isFeminine ? 'da' : 'do'

  const shortName = businessName
    .replace(/^(clínica|consultório|pizzaria|oficina|restaurante|studio|barbearia|vidraçaria)\s+(de\s+|da\s+|do\s+)?/i, '')
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

export type SpecialtyInfo = {
  isHealth: boolean
  isPelvicOrPhysio: boolean
  isDental: boolean
  isFood: boolean
  isAuto: boolean
  isRealEstate: boolean
  isBarber: boolean
  isBeautyOrSpa: boolean
  isNailOrLash: boolean
  isTattoo: boolean
  isPilates: boolean
  isGym: boolean
  isPet: boolean
  isGlazing: boolean
  isFurniture: boolean
  isHvac: boolean
  isTechRepair: boolean
  isLaw: boolean
  isAccounting: boolean
  isPhoto: boolean
  isHospitality: boolean
  nicheType: string
  specialtyLabel: string
  clientTerm: string
  serviceTerm: string
  actionTerm: string
}

/**
 * Identifica com precisão o nicho e especialidade do lead.
 * IMPORTANTE: Termos compostos e específicos têm prioridade máxima
 * para evitar que palavras gerais (como "estética") colidam com subáreas ("estética automotiva").
 */
export function extractSpecialtyInfo(lead: Lead): SpecialtyInfo {
  const combined = `${lead.name} ${lead.category || ''} ${lead.address || ''}`.toLowerCase()

  // 1. ESTÉTICA AUTOMOTIVA, POLIMENTO, LAVAGEM & DETAILING
  // Deve vir obrigatoriamente ANTES de estética facial/humana!
  const isAutoDetail = /est[eé]tica\s*(?:automotiv|veicular|de ve[ií]culos)|detailer|detailing|polimento|vitrifica|cristaliza|lava\s*car|lavacar|lava\s*jato|lava[- ]r[aá]pido|lava[cç][aã]o|est[eé]tica\s+auto\b|estetica\s+automotiva|higieniza[cç][aã]o automotiva|martelinho\s*de\s*ouro|insulfilm/i.test(combined)
  if (isAutoDetail) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: true,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'auto_detail',
      specialtyLabel: 'serviços de estética automotiva e detalhamento',
      clientTerm: 'cliente',
      serviceTerm: 'polimento, higienização e estética veicular',
      actionTerm: 'pedir orçamento',
    }
  }

  // 2. PET SHOP, VETERINÁRIA, BANHO E TOSA
  // Deve vir antes de clínicas e estética humana!
  const isPet = /pet\s*shop|petshop|veterin[aá]r|banho\s*e\s*tosa|banho\s*&\s*tosa|est[eé]tica\s*(?:animal|canina|pet)|cl[ií]nica\s*vet|pet\s*care|hospital\s*veterin[aá]r/i.test(combined)
  if (isPet) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: true,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'pet',
      specialtyLabel: 'clínicas veterinárias e pet shops',
      clientTerm: 'tutor',
      serviceTerm: 'banho, tosa e consultas veterinárias',
      actionTerm: 'agendar horário',
    }
  }

  // 3. ODONTOLOGIA & DENTISTAS
  // Deve vir antes de estética geral humana!
  const isDental = /odont|dentist|sorriso|ortodont|implante\s*dent|clareamento\s*dent|pr[oó]tese\s*dent|invisalign|harmoniza[cç][aã]o\s*orofacial|est[eé]tica\s*dental|cirurgi[aã]o[- ]dentista/i.test(combined)
  if (isDental) {
    return {
      isHealth: true,
      isPelvicOrPhysio: false,
      isDental: true,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'dental',
      specialtyLabel: 'consultórios e clínicas odontológicas',
      clientTerm: 'paciente',
      serviceTerm: 'tratamentos odontológicos e reabilitação oral',
      actionTerm: 'marcar avaliação',
    }
  }

  // 4. FISIOTERAPIA PÉLVICA & SAÚDE DA MULHER
  // Deve vir antes de fisioterapia geral!
  const isPelvic = /p[eé]lvic|uroginecolog|sa[uú]de\s*da\s*mulher/i.test(combined)
  if (isPelvic) {
    return {
      isHealth: true,
      isPelvicOrPhysio: true,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'pelvic',
      specialtyLabel: 'fisioterapia pélvica e saúde íntima',
      clientTerm: 'paciente',
      serviceTerm: 'tratamentos e reabilitação pélvica',
      actionTerm: 'agendar avaliação',
    }
  }

  // 5. FISIOTERAPIA GERAL, QUIROPRAXIA & OSTEOPATIA
  const isPhysio = /fisioter|quiropra|osteopat|reabilita|coluna|traumato/i.test(combined)
  if (isPhysio) {
    return {
      isHealth: true,
      isPelvicOrPhysio: true,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'physio',
      specialtyLabel: 'fisioterapia, quiropraxia e reabilitação física',
      clientTerm: 'paciente',
      serviceTerm: 'tratamentos e alívio de dores',
      actionTerm: 'marcar avaliação',
    }
  }

  // 6. AUTOESCOLA (Não confundir com mecânica / auto)
  const isAutoSchool = /auto\s*escola|autoescola|cfc\s+|primeira\s*habilita[cç][aã]o/i.test(combined)
  if (isAutoSchool) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'auto_school',
      specialtyLabel: 'autoescolas e centros de formação de condutores',
      clientTerm: 'aluno',
      serviceTerm: 'aulas de direção e habilitação',
      actionTerm: 'solicitar matrícula',
    }
  }

  // 7. OFICINA MECÂNICA, AUTO CENTER & SERVIÇOS AUTOMOTIVOS
  const isAutoMechanic = /mec[aâ]nic|auto\s*center|centro\s*automotivo|oficina\b|funilaria|auto\s*el[eé]trica|troca\s*de\s*[oó]leo|alinhamento|balanceamento|freios|inje[cç][aã]o|suspens[aã]o|borracharia|ret[ií]fica/i.test(combined)
  if (isAutoMechanic) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: true,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'auto_mechanic',
      specialtyLabel: 'oficinas mecânicas e manutenção automotiva',
      clientTerm: 'cliente',
      serviceTerm: 'manutenções e revisões preventivas',
      actionTerm: 'solicitar orçamento',
    }
  }

  // 8. BARBEARIA & BARBEIRO
  const isBarber = /barbearia|barbeir|barber|corte\s*masculin|fade|degrad[eê]|navalha|corte\s*e\s*barba/i.test(combined)
  if (isBarber) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: true,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'barber',
      specialtyLabel: 'barbearias e cuidados masculinos',
      clientTerm: 'cliente',
      serviceTerm: 'cortes, barba e tratamentos',
      actionTerm: 'agendar horário',
    }
  }

  // 9. UNHAS, CÍLIOS & SOBRANCELHAS (Nails & Lash)
  const isNailOrLash = /nail|manicure|pedicure|alongamento\s*de\s*unhas|fibra\s*de\s*vidro|lash|c[ií]lios|extens[aã]o\s*de\s*c[ií]lios|designer\s*de\s*sobrancelhas|micropigmenta|microblading|sobrancelha/i.test(combined)
  if (isNailOrLash) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: true,
      isNailOrLash: true,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'nails_lash',
      specialtyLabel: 'studios de unhas, sobrancelhas e extensão de cílios',
      clientTerm: 'cliente',
      serviceTerm: 'procedimentos e manutenções',
      actionTerm: 'agendar horário',
    }
  }

  // 10. SALÃO DE BELEZA & CABELEIREIRO
  const isHairSalon = /sal[aã]o\s*de\s*beleza|cabeleireir|hair|cabelo|mechas|escova|loiro|alisamento|mega\s*hair/i.test(combined)
  if (isHairSalon) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: true,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'hair_salon',
      specialtyLabel: 'salões de beleza e cuidados capilares',
      clientTerm: 'cliente',
      serviceTerm: 'procedimentos capilares e transformações',
      actionTerm: 'agendar horário',
    }
  }

  // 11. STUDIO DE PILATES
  const isPilates = /pilates|studio\s*de\s*pilates|m[eé]todo\s*pilates/i.test(combined)
  if (isPilates) {
    return {
      isHealth: true,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: true,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'pilates',
      specialtyLabel: 'studios de Pilates e condicionamento físico',
      clientTerm: 'aluno',
      serviceTerm: 'aulas personalizadas e horários',
      actionTerm: 'agendar aula experimental',
    }
  }

  // 12. TATUAGEM & BODY PIERCING
  const isTattoo = /tatuag|tattoo|piercing|piercer|tatuador/i.test(combined)
  if (isTattoo) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: true,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'tattoo',
      specialtyLabel: 'studios de tatuagem e body piercing',
      clientTerm: 'cliente',
      serviceTerm: 'artes, projetos autorais e piercings',
      actionTerm: 'pedir orçamento',
    }
  }

  // 13. FOTOGRAFIA & ENSAIOS
  const isPhoto = /fot[oó]gra|fotografia|est[uú]dio\s*fotogr[aá]fico|ensaio\s*fotogr[aá]fico/i.test(combined)
  if (isPhoto) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: true,
      isHospitality: false,
      nicheType: 'photo',
      specialtyLabel: 'ensaios e estúdios de fotografia',
      clientTerm: 'cliente',
      serviceTerm: 'ensaios e coberturas visuais',
      actionTerm: 'conferir portfólio e orçamento',
    }
  }

  // 14. ESTÉTICA FACIAL, CORPORAL & BIOMÉDICA (Humana)
  // Só aciona se NÃO for automotiva, pet ou dental!
  const isAesthetics = /est[eé]tica|harmoniza|biom[eé]d|botox|preenchimento|limpeza\s*de\s*pele|esteta|spa\b|massoterapia|drenagem/i.test(combined)
  if (isAesthetics) {
    return {
      isHealth: true,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: true,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'aesthetics',
      specialtyLabel: 'clínicas e procedimentos de estética facial e corporal',
      clientTerm: 'paciente',
      serviceTerm: 'procedimentos e protocolos estéticos',
      actionTerm: 'marcar avaliação',
    }
  }

  // 15. GASTRONOMIA, RESTAURANTES, PIZZARIAS & LANCHONETES
  const isFood = /pizz|restaur|hamburg|lanch|lanche|forn|delivery|gastronom|sabor|comida|sushi|caf[eé]|padaria|confeitaria|doceria|a[cç]ougue|pastel/i.test(combined)
  if (isFood) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: true,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'food',
      specialtyLabel: 'restaurantes, lanchonetes e gastronomia',
      clientTerm: 'cliente',
      serviceTerm: 'cardápio digital e pedidos',
      actionTerm: 'fazer pedido',
    }
  }

  // 16. VIDRAÇARIA & ESQUADRIAS
  const isGlazing = /vidra[cç]|box\s*de\s*vidro|esquadria|vidro|temperado|espelho/i.test(combined)
  if (isGlazing) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: true,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'glazing',
      specialtyLabel: 'vidraçarias e esquadrias',
      clientTerm: 'cliente',
      serviceTerm: 'projetos e instalações em vidro',
      actionTerm: 'pedir orçamento',
    }
  }

  // 17. MÓVEIS PLANEJADOS & MARCENARIA
  const isFurniture = /m[oó]veis\s*planej|marcenaria|m[oó]veis\s*sob\s*medida|marceneiro/i.test(combined)
  if (isFurniture) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: true,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'furniture',
      specialtyLabel: 'móveis planejados e marcenaria',
      clientTerm: 'cliente',
      serviceTerm: 'projetos sob medida e acabamentos',
      actionTerm: 'solicitar projeto e orçamento',
    }
  }

  // 18. CLIMATIZAÇÃO, REFRIGERAÇÃO & ENERGIA SOLAR
  const isHvac = /climatiza|refrigera|ar[- ]condicionado|split|aquecedor|energia\s*solar/i.test(combined)
  if (isHvac) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: true,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'hvac',
      specialtyLabel: 'empresas de climatização e refrigeração',
      clientTerm: 'cliente',
      serviceTerm: 'instalações e manutenções técnicas',
      actionTerm: 'pedir orçamento',
    }
  }

  // 19. ASSISTÊNCIA TÉCNICA, CELULARES & INFORMÁTICA
  const isTechRepair = /assist[eê]ncia\s*t[eé]cnica|conserto\s*de\s*celular|smartphones|inform[aá]tica|computador|notebook|reparo\s*de\s*placas/i.test(combined)
  if (isTechRepair) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: true,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'tech_repair',
      specialtyLabel: 'assistências técnicas e conserto de aparelhos',
      clientTerm: 'cliente',
      serviceTerm: 'diagnósticos e consertos rápidos',
      actionTerm: 'solicitar orçamento',
    }
  }

  // 20. IMOBILIÁRIA & CORRETORES
  const isRealEstate = /imob|corret|im[oó]v/i.test(combined)
  if (isRealEstate) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: true,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'real_estate',
      specialtyLabel: 'imobiliárias e corretores de imóveis',
      clientTerm: 'cliente',
      serviceTerm: 'imóveis disponíveis e oportunidades',
      actionTerm: 'conferir opções no WhatsApp',
    }
  }

  // 21. ADVOCACIA & ESCRITÓRIOS JURÍDICOS
  const isLaw = /advog|advocacia|jur[ií]dic|direito|escrit[oó]rio\s*de\s*advocacia/i.test(combined)
  if (isLaw) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: true,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'law',
      specialtyLabel: 'escritórios de advocacia e assessoria jurídica',
      clientTerm: 'cliente',
      serviceTerm: 'áreas de atuação e consultoria',
      actionTerm: 'agendar atendimento',
    }
  }

  // 22. CONTABILIDADE & GESTÃO FISCAL
  const isAccounting = /cont[aá]bil|contabilidade|contador|assessoria\s*fiscal/i.test(combined)
  if (isAccounting) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: true,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'accounting',
      specialtyLabel: 'escritórios de contabilidade e gestão fiscal',
      clientTerm: 'cliente',
      serviceTerm: 'soluções contábeis e fiscais',
      actionTerm: 'solicitar contato',
    }
  }

  // 23. HOTELARIA, POUSADAS & TURISMO
  const isHospitality = /pousada|hotel|hostel|chal[eé]|hospedagem|turismo/i.test(combined)
  if (isHospitality) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: true,
      nicheType: 'hospitality',
      specialtyLabel: 'hotéis, pousadas e hospedagens',
      clientTerm: 'hóspede',
      serviceTerm: 'quartos, diárias e passeios',
      actionTerm: 'consultar reservas no WhatsApp',
    }
  }

  // 24. ACADEMIA, TREINAMENTO & MODALIDADES ESPORTIVAS
  const isGym = /academia|crossfit|fitness|muscula|personal\s*trainer|artes\s*marciais|jiu[- ]jitsu|muay\s*thai|boxe|funcional|dan[cç]a/i.test(combined)
  if (isGym) {
    return {
      isHealth: false,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: true,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'gym',
      specialtyLabel: 'academias, treinos e modalidades esportivas',
      clientTerm: 'aluno',
      serviceTerm: 'modalidades e planos de treino',
      actionTerm: 'agendar aula teste',
    }
  }

  // 25. SAÚDE GERAL (Médicos, Clínicas Médicas, Psicologia, Nutrição)
  const isHealth = /m[eé]dic|cl[ií]nic|sa[uú]de|psic[oó]l|nutri|terap|fonoaudi[oó]l|acupuntur/i.test(combined)
  if (isHealth) {
    return {
      isHealth: true,
      isPelvicOrPhysio: false,
      isDental: false,
      isFood: false,
      isAuto: false,
      isRealEstate: false,
      isBarber: false,
      isBeautyOrSpa: false,
      isNailOrLash: false,
      isTattoo: false,
      isPilates: false,
      isGym: false,
      isPet: false,
      isGlazing: false,
      isFurniture: false,
      isHvac: false,
      isTechRepair: false,
      isLaw: false,
      isAccounting: false,
      isPhoto: false,
      isHospitality: false,
      nicheType: 'health',
      specialtyLabel: 'clínicas e atendimentos de saúde',
      clientTerm: 'paciente',
      serviceTerm: 'consultas e atendimentos',
      actionTerm: 'marcar consulta',
    }
  }

  // 26. FALLBACK DINÂMICO INTELIGENTE
  // Nunca mais gera "empresas e atendimentos"!
  const rawCat = (lead.category || '')
    .replace(/^(loja de|serviço de|comércio de|comercio de|serviços de)\s+/i, '')
    .trim()
    .toLowerCase()
  const customLabel = rawCat && rawCat.length >= 3 ? `estabelecimentos de ${rawCat}` : 'negócios e comércios locais'

  return {
    isHealth: false,
    isPelvicOrPhysio: false,
    isDental: false,
    isFood: false,
    isAuto: false,
    isRealEstate: false,
    isBarber: false,
    isBeautyOrSpa: false,
    isNailOrLash: false,
    isTattoo: false,
    isPilates: false,
    isGym: false,
    isPet: false,
    isGlazing: false,
    isFurniture: false,
    isHvac: false,
    isTechRepair: false,
    isLaw: false,
    isAccounting: false,
    isPhoto: false,
    isHospitality: false,
    nicheType: 'custom',
    specialtyLabel: customLabel,
    clientTerm: 'cliente',
    serviceTerm: 'serviços e produtos',
    actionTerm: 'entrar em contato',
  }
}

/**
 * Gera a apresentação humana adaptada ao tipo exato de estabelecimento e persona:
 * - 'ryan': "Meu nome é Ryan..."
 * - 'rvll': "Somos da equipe Rvll..."
 * - 'dev': "Sou desenvolvedor web..."
 * - 'auto': escolhe com base no contexto do lead
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
  let activePersona = persona
  if (persona === 'auto') {
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
        `Somos da equipe Rvll, atuamos aqui em ${senderCity} criando páginas modernas, leves e focadas em ${specialtyLabel}.`,
        `Aqui é da equipe Rvll, desenvolvemos sites modernos e práticos com foco em agendamentos diretos no WhatsApp para ${specialtyLabel} aqui da cidade.`,
      ]
      return rvllLocalVariants[variationIndex % rvllLocalVariants.length]
    }

    if (activePersona === 'dev') {
      const devLocalVariants = [
        `Sou desenvolvedor web aqui em ${senderCity} e crio páginas rápidas e limpas para ${specialtyLabel} da região.`,
        `Trabalho com desenvolvimento de páginas práticas aqui em ${senderCity}, com foco especial em ${specialtyLabel}.`,
      ]
      return devLocalVariants[variationIndex % devLocalVariants.length]
    }

    // Persona Ryan na mesma cidade
    const ryanLocalVariants = [
      `Meu nome é ${senderName}, moro aqui em ${senderCity} e crio páginas bem práticas e diretas para ${specialtyLabel} da nossa cidade.`,
      `Sou o ${senderName}, sou aqui de ${senderCity} e desenvolvo sites rápidos focados em agendamentos no WhatsApp para ${specialtyLabel}.`,
      `Meu nome é ${senderName}, sou de ${senderCity} e trabalho criando páginas limpas e objetivas para ${specialtyLabel}.`,
    ]
    return ryanLocalVariants[variationIndex % ryanLocalVariants.length]
  }

  // 2. Caso NÃO SEJA DA CIDADE DELE (NÃO fala onde mora nem cita a própria cidade!)
  if (activePersona === 'rvll') {
    const rvllRemoteVariants = [
      `Somos da equipe Rvll, trabalhamos desenvolvendo páginas web rápidas e focadas em converter quem busca no Google em contatos no WhatsApp para ${specialtyLabel}.`,
      `Aqui é da equipe Rvll. Atuamos criando páginas práticas com foco em agendamentos e orçamentos diretos no WhatsApp para ${specialtyLabel}.`,
    ]
    return rvllRemoteVariants[variationIndex % rvllRemoteVariants.length]
  }

  if (activePersona === 'dev') {
    const devRemoteVariants = [
      `Sou desenvolvedor web focado na criação de páginas limpas, modernas e de carregamento ultrarrápido para ${specialtyLabel}.`,
      `Trabalho com desenvolvimento de páginas práticas e enxutas para ${specialtyLabel}, pensadas para quem navega pelo celular.`,
    ]
    return devRemoteVariants[variationIndex % devRemoteVariants.length]
  }

  // Persona Ryan fora da cidade
  const ryanRemoteVariants = [
    `Meu nome é ${senderName}, sou desenvolvedor web e crio páginas limpas e práticas focadas em ${specialtyLabel}.`,
    `Sou o ${senderName}, trabalho com páginas rápidas focadas em transformar visitas no Google em agendamentos no WhatsApp para ${specialtyLabel}.`,
    `Meu nome é ${senderName}, atuo desenvolvendo sites modernos focados em orçamentos e agendamentos diretos no WhatsApp para ${specialtyLabel}.`,
  ]
  return ryanRemoteVariants[variationIndex % ryanRemoteVariants.length]
}

/**
 * Gera a mensagem adaptada completa para o lead, considerando:
 * - Tipo específico do estabelecimento (Barbearia, Estética Automotiva, Clínica Estética, Oficina, Dentista, Pet, etc.)
 * - Cidade do lead vs cidade base (não cita moradia se for de fora)
 * - Se tem Instagram (transforma seguidores e buscas em agendamentos no WhatsApp)
 * - Se não tem site (cria vitrine de autoridade e tira dúvidas prévias)
 * - Se já tem site (foca em velocidade mobile e conversão para o WhatsApp)
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

  // Resolve idioma final
  const lang = (settings.language && settings.language !== 'auto')
    ? settings.language
    : detectLeadLanguage(lead.address, lead.name)

  let activePersona = persona
  if (persona === 'auto') {
    activePersona = recipient.type === 'business' && variationIndex % 2 === 1 ? 'rvll' : 'ryan'
  }

  // 1. JAPONÊS (日本語)
  if (lang === 'ja') {
    const greeting = `${recipient.display}様、初めまして。突然のご連絡失礼いたします。`
    const presentation = activePersona === 'rvll'
      ? `Web制作・LP制作を行っておりますRvllチームと申します。地域店舗様向けに、スマートフォンで見やすく問い合わせ・予約につながる公式ページの制作を行っております。`
      : `フリーランスでWebサイト制作をしております${senderName}と申します。スマートフォンに最適化された清潔感のあるホームページ制作を専門にしております。`
    const diagnosisAndValue = hasInstagram
      ? `Instagramでの発信を拝見いたしました。Googleで検索された新規のお客様がメニューや詳細をすぐに確認できる専用ページがあると、SNSのフォロワー様も迷わずスムーズにご予約・お問い合わせへと繋げることができます。`
      : presence === 'none'
        ? `Googleマップにて貴店を拝見したところ、専用の公式ホームページがまだ掲載されていないようでした。スマホで手軽に見られる清潔感のあるページを用意することで、初めてのお客様にも大きな安心感をお届けできます。`
        : `現在のオンラインでのご案内を拝見いたしました。表示速度が速く直感的に予約できる構造に整えることで、反響率を大幅に向上させることが可能です。`
    const cta = `もしご興味がございましたら、貴店に合わせた簡単なプレビュー案を画像または動画でご案内できますが、いかがでしょうか？`
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 2. ÁRABE (العربية)
  if (lang === 'ar') {
    const greeting = `مرحباً ${recipient.display}، أتمنى أن تكونوا بخير!`
    const presentation = activePersona === 'rvll'
      ? `نحن من فريق Rvll، متخصصون في تطوير صفحات ومواقع إلكترونية سريعة تركز على تحويل الزوار إلى حجوزات واستفسارات مباشرة عبر واتساب.`
      : `اسمي ${senderName}، مطور مواقع ويب ومصمم صفحات هبوط متقدمة تركز على نمو الأعمال والخدمات المحلية.`
    const diagnosisAndValue = hasInstagram
      ? `لقد اطلعت على حسابكم في إنستغرام وعملكم المميز! ومع ذلك، فإن العملاء القادمين من غوغل يبحثون عن صفحة رسمية توضح كافة الخدمات وتتيح الحجز الفوري بضغطة زر واحدة.`
      : presence === 'none'
        ? `لاحظت نشاطكم على خرائط غوغل وتبيّن لي أنه ليس لديكم موقع رسمي حتى الآن. وجود صفحة خاصة يعزز الثقة ويسهّل وصول العملاء للحجز والتواصل المباشر.`
        : `أكثر من 80% من عمليات البحث تتم عبر الهواتف، وامتلاك موقع فائق السرعة ومربوط بواتساب يضاعف عادةً عدد الاستفسارات.`
    const cta = 'هل يناسبكم أن أشارككم نموذجاً مبسطاً وتصوراً سريعاً لكيفية ظهور هذه الصفحة لعملكم دون أي التزام؟'
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 3. ESPANHOL (Español)
  if (lang === 'es') {
    const greeting = `Hola, ${recipient.display}, ¿cómo estás?`
    const presentation = activePersona === 'rvll'
      ? `Somos del equipo Rvll, especializados en crear páginas web modernas y enfocadas en conversiones y citas directas por WhatsApp para ${specialty.specialtyLabel}.`
      : `Mi nombre es ${senderName}, soy desarrollador web y me dedico a crear páginas rápidas y prácticas para ${specialty.specialtyLabel}.`
    const diagnosisAndValue = hasInstagram
      ? `Vi su perfil en Instagram y el excelente trabajo que comparten. Sin embargo, quienes buscan en Google o entran al enlace de la bio muchas veces necesitan una página oficial donde ver todos los servicios y contactar directo por WhatsApp con 1 toque.`
      : presence === 'none'
        ? `Noté su negocio en Google y vi que aún no cuentan con un sitio web oficial. Tener una página propia brinda confianza inmediata, resuelve dudas frecuentes y facilita que nuevos ${specialty.clientTerm}s reserven directo por WhatsApp.`
        : `Estuve viendo su presencia online. Hoy más del 80% de los clientes busca por celular, y una página moderna ultra rápida suele duplicar la cantidad de contactos recibidos.`
    const cta = '¿Tendrías interés en ver un modelo sencillo sin compromiso de cómo quedaría esta estructura para su negocio?'
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 4. INGLÊS (English)
  if (lang === 'en') {
    const greeting = `Hi ${recipient.display}, hope you're doing well!`
    const presentation = activePersona === 'rvll'
      ? `We're from the Rvll team, specializing in clean, modern, and high-converting websites designed to turn visitors into booked clients.`
      : `My name is ${senderName}, I'm a web developer creating clean, high-performance websites for ${specialty.isHealth ? 'healthcare practices' : specialty.isFood ? 'restaurants and food services' : 'local businesses'}.`
    const diagnosisAndValue = hasInstagram
      ? `I came across your Instagram profile and loved your work! However, customers finding you on Google or clicking your bio link often look for an official mobile page with your full services, making it easy to book or contact you directly in one tap.`
      : presence === 'none'
        ? `I noticed ${lead.name} on Google and saw that customers searching for your services don't find an official dedicated website. Having a clean, dedicated website builds immediate credibility, answers key questions, and directs customers straight to your direct contact.`
        : `I checked your online presence. Today, over 80% of local searches happen on mobile phones, and having an ultra-fast page optimized for instant WhatsApp or call inquiries often doubles the inquiry rate.`
    const cta = 'Would you be open to checking out a quick, no-obligation preview of what this structure could look like for your business?'
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // ==========================================
  // PORTUGUÊS (BRASIL) — ALTA CONVERSÃO & ZERO SPAM
  // ==========================================

  // 1. Saudação humana e calorosa
  const greeting = `Olá, ${recipient.display}, tudo bem por aí?`

  // 2. Apresentação sob medida para o nicho real
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

  // 3. Diagnóstico e Necessidade Real Específica de cada Estabelecimento
  let diagnosisAndValue = ''

  // ----------------------------------------------------
  // CENÁRIO A: POSSUI INSTAGRAM
  // ----------------------------------------------------
  if (hasInstagram) {
    if (specialty.nicheType === 'auto_detail') {
      diagnosisAndValue = `Acompanhei o perfil de vocês no Instagram e os resultados e polimentos nos veículos são impecáveis! Só que quem procura por estética automotiva no Google na região quer ver uma página prática com fotos dos serviços, cuidados oferecidos e botão direto pro WhatsApp sem ter que esperar retorno no direct.`
    } else if (specialty.nicheType === 'auto_mechanic') {
      diagnosisAndValue = `Acompanhei a oficina de vocês no Instagram e o padrão dos reparos. Mas quem está com o carro precisando de manutenção na região e pesquisa no Google procura uma página ágil para ver os serviços atendidos e pedir orçamento direto no WhatsApp.`
    } else if (specialty.isBarber) {
      diagnosisAndValue = `Acompanhei a barbearia no Instagram e o padrão dos cortes tá muito diferenciado! Só que quem pesquisa por corte ou barba no Google muitas vezes não encontra uma página rápida com a tabela de serviços e o botão direto pra agendar no WhatsApp sem ter que ficar esperando resposta no direct.`
    } else if (specialty.nicheType === 'aesthetics') {
      diagnosisAndValue = `Acompanhei o perfil de vocês no Instagram e os resultados dos procedimentos são impecáveis! Porém, como procedimentos estéticos envolvem muitas dúvidas e confiança, quem pesquisa no Google ou clica na bio sente falta de uma página elegante explicando cada tratamento antes de agendar a avaliação no WhatsApp.`
    } else if (specialty.isHairSalon) {
      diagnosisAndValue = `Vi o perfil de vocês no Instagram e as fotos das transformações e mechas ficaram incríveis! Só que quem busca no Google muitas vezes quer ver a tabela de procedimentos e horários em um clique rápido pro WhatsApp.`
    } else if (specialty.isNailOrLash) {
      diagnosisAndValue = `Acompanhei os trabalhos de vocês no Instagram e a qualidade das unhas e cílios é impecável! Ter uma página própria na bio e no Google facilita para as clientes verem os modelos, tirar dúvidas de manutenção e já agendar o horário no WhatsApp com 1 toque.`
    } else if (specialty.isTattoo) {
      diagnosisAndValue = `Vi os trabalhos e artes de vocês no Instagram, muito estilo! Só que quem tá procurando tatuador ou piercer na região pelo Google muitas vezes não encontra uma página própria com orientações de orçamento e cuidados, facilitando chamar no WhatsApp.`
    } else if (specialty.isPelvicOrPhysio) {
      diagnosisAndValue = `Acompanhei o perfil de vocês no Instagram e vi o ótimo trabalho que fazem divulgando a fisioterapia pélvica. Porém, como é uma área que envolve muita intimidade e dúvidas prévias, quem pesquisa pelo tratamento no Google ou clica na bio muitas vezes sente falta de uma página acolhedora explicando os casos indicados e permitindo agendar a avaliação no WhatsApp com 1 toque.`
    } else if (specialty.isDental) {
      diagnosisAndValue = `Acompanhei a presença de vocês no Instagram e o cuidado com os sorrisos dos pacientes. Mas quem pesquisa por dentista no Google muitas vezes quer ver uma página oficial que passe segurança imediata, esclareça os tratamentos oferecidos e permita agendar a avaliação com facilidade no WhatsApp.`
    } else if (specialty.isHealth) {
      diagnosisAndValue = `Acompanhei a presença de vocês no Instagram e o cuidado com as postagens. No entanto, no feed as informações se perdem rápido, e quem busca por atendimento no Google muitas vezes não encontra uma página oficial que reúna todas as especialidades e tire as dúvidas mais frequentes antes do agendamento no WhatsApp.`
    } else if (specialty.isPilates || specialty.isGym) {
      diagnosisAndValue = `Acompanhei o dia a dia das aulas no Instagram e a energia dos alunos é ótima! Quem busca por aula ou matrícula no Google valoriza muito uma página prática com a metodologia e o botão pra agendar a aula experimental no WhatsApp.`
    } else if (specialty.isPet) {
      diagnosisAndValue = `Vi o carinho com os pets que vocês compartilham no Instagram! Porém, quem precisa de banho & tosa, vacina ou consulta no dia a dia quer ver os serviços e mandar mensagem direto no WhatsApp em poucos segundos.`
    } else if (specialty.isFood) {
      diagnosisAndValue = `Vi o Instagram de vocês e as fotos dão água na boca! Porém, quem vai pedir muitas vezes não encontra um cardápio digital próprio rápido para pedir direto pelo WhatsApp. Ter uma página web na bio e no Google agiliza os pedidos e evita que vocês percam clientes pras taxas pesadas dos apps de entrega.`
    } else if (specialty.isGlazing || specialty.isFurniture) {
      diagnosisAndValue = `Vi os projetos e instalações que vocês compartilham no Instagram, muito capricho! Ter uma página no Google reunindo fotos de trabalhos entregues passa total segurança para quem quer pedir orçamento no WhatsApp.`
    } else {
      diagnosisAndValue = `Vi o trabalho bacana que vocês compartilham no Instagram. Mas quem busca por ${specialty.specialtyLabel} no Google ou clica no link da bio muitas vezes não encontra uma página oficial que organize todos os serviços e passe credibilidade imediata. Uma página própria limpa serve como vitrine para converter esses visitantes em ${specialty.clientTerm}s direto no WhatsApp.`
    }
  }

  // ----------------------------------------------------
  // CENÁRIO B: NÃO TEM SITE (OPORTUNIDADE DE VITRINE NO GOOGLE)
  // ----------------------------------------------------
  else if (presence === 'none') {
    if (specialty.nicheType === 'auto_detail') {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e o padrão da estética automotiva. Ter uma página web direta no Google com fotos de antes e depois dos veículos e botão de orçamento rápido no WhatsApp passa total credibilidade pra quem quer cuidar do carro na região.`
    } else if (specialty.nicheType === 'auto_mechanic') {
      diagnosisAndValue = `Vi a oficina de vocês ${location} e a estrutura dos atendimentos. Ter uma página web direta no Google com os principais serviços mecânicos e botão de orçamento rápido no WhatsApp passa total segurança pra quem precisa de manutenção preventiva ou socorro na região.`
    } else if (specialty.isBarber) {
      diagnosisAndValue = `Vi a barbearia de vocês ${location} e o estilo dos atendimentos. Como hoje quase todo mundo procura corte ou barba pelo celular no Google Maps, ter uma página simples mostrando os cortes, horários e botão de agendamento no WhatsApp evita que novos clientes da região procurem outro lugar.`
    } else if (specialty.nicheType === 'aesthetics') {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e os procedimentos que realizam. Como estética envolve muita confiança e pesquisa prévia, ter uma página acolhedora explicando cada tratamento tira as principais dúvidas da ${specialty.clientTerm} antes do contato e facilita o agendamento da avaliação no WhatsApp.`
    } else if (specialty.isHairSalon) {
      diagnosisAndValue = `Vi o salão de vocês ${location} e o padrão dos cuidados capilares. Ter uma página simples mostrando fotos de antes e depois e botão direto pro WhatsApp facilita para novas clientes agendarem horários sem complicação.`
    } else if (specialty.isNailOrLash) {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e o capricho nos atendimentos. Ter uma página simples mostrando fotos dos procedimentos e botão direto pro WhatsApp valoriza o trabalho e facilita para novas clientes agendarem horários sem complicação.`
    } else if (specialty.isTattoo) {
      diagnosisAndValue = `Vi o studio de vocês ${location} e o estilo dos trabalhos. Ter uma página web prática apresentando fotos de tattoos/piercings e botão de orçamento no WhatsApp atrai novos clientes que buscam por estúdios de confiança no Google.`
    } else if (specialty.isPelvicOrPhysio) {
      diagnosisAndValue = `Vi o seu consultório ${location} e notei a sua especialização em ${specialty.specialtyLabel}. Por ser uma área que exige muita confiança, ter uma página acolhedora explicando para quais casos o tratamento é indicado tira as principais dúvidas da ${specialty.clientTerm} antes do primeiro contato e facilita o agendamento no WhatsApp.`
    } else if (specialty.isDental) {
      diagnosisAndValue = `Vi o consultório de vocês ${location} e o padrão dos atendimentos. Ter uma página oficial na internet valoriza muito o nome do consultório, passa segurança imediata para quem tem dúvidas sobre tratamentos e facilita o agendamento de avaliações no WhatsApp.`
    } else if (specialty.isHealth) {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e notei que quem pesquisa pela clínica no Google não encontra uma página oficial que reúna todas as atividades e cuidados oferecidos. Um site simples organiza as terapias do espaço e serve como uma vitrine acolhedora para novos ${specialty.clientTerm}s da região.`
    } else if (specialty.isPilates || specialty.isGym) {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e a proposta das aulas. Quem pesquisa por ${specialty.specialtyLabel} no Google muitas vezes não encontra uma página explicando as modalidades, turmas e o botão pra agendar aula experimental no WhatsApp.`
    } else if (specialty.isPet) {
      diagnosisAndValue = `Vi o atendimento de vocês com os pets ${location}. Ter uma página simples apresentando os cuidados veterinários, banho & tosa e horários passa muita segurança pros tutores e agiliza contatos no WhatsApp.`
    } else if (specialty.isFood) {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e a qualidade do cardápio. Ter uma página própria rápida com fotos reais e botão direto pro WhatsApp economiza tempo no atendimento e fideliza clientes sem as comissões abusivas dos apps de entrega.`
    } else if (specialty.isGlazing || specialty.isFurniture) {
      diagnosisAndValue = `Vi a qualidade dos serviços de vocês ${location}. Ter uma página com fotos de trabalhos já entregues e botão para orçamento rápido no WhatsApp passa muita credibilidade para quem está orçando na região.`
    } else {
      diagnosisAndValue = `Vi o espaço de vocês ${location} e notei que quem pesquisa por ${specialty.specialtyLabel} no Google não encontra uma página oficial com serviços e horários atualizados. Um site limpo e bem posicionado serve como vitrine e direciona contatos quentes direto para o seu WhatsApp.`
    }
  }

  // ----------------------------------------------------
  // CENÁRIO C: JÁ TEM SITE (OTIMIZAÇÃO MOBILE & CONVERSÃO)
  // ----------------------------------------------------
  else {
    diagnosisAndValue = `Dei uma olhada na presença online de vocês ${location}. Hoje mais de 80% das pessoas pesquisam serviços pelo celular, e muitos sites antigos acabam demorando para carregar ou não direcionam com clareza para o WhatsApp. Uma página moderna e ultrarrápida costuma dobrar a taxa de contatos recebidos de novos ${specialty.clientTerm}s.`
  }

  // 4. Pergunta de fechamento suave (Soft CTA com gramática 100% natural)
  const ctaTarget = recipient.type === 'person' ? 'você' : 'o espaço de vocês'
  let cta = ''
  if (tone === 'preview') {
    cta = `Faz sentido eu te mandar uma prévia rápida de como ficaria essa estrutura para ${ctaTarget}?`
  } else if (tone === 'direct') {
    cta = `Teria interesse em ver um modelo simples sem compromisso nenhum?`
  } else {
    const ctaVariants = [
      `Faz sentido eu te mandar uma prévia simples sem compromisso de como ficaria essa estrutura para ${ctaTarget}?`,
      `Se fizer sentido, posso gravar um vídeo rápido de 1 minuto mostrando como ficaria essa vitrine na prática para ${ctaTarget}.`,
      `Teria interesse em dar uma olhada em um modelo simples e sem compromisso para ${ctaTarget}?`,
    ]
    cta = ctaVariants[variationIndex % ctaVariants.length]
  }

  return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
}
