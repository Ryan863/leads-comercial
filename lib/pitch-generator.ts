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

const ACCENT_DICTIONARY: Record<string, string> = {
  estetica: 'estética',
  esteticas: 'estéticas',
  acai: 'açaí',
  'açai': 'açaí',
  acaiteria: 'açaiteria',
  mecanica: 'mecânica',
  mecanico: 'mecânico',
  mecanicas: 'mecânicas',
  clinica: 'clínica',
  clinicas: 'clínicas',
  consultorio: 'consultório',
  consultorios: 'consultórios',
  escritorio: 'escritório',
  escritorios: 'escritórios',
  laboratorio: 'laboratório',
  laboratorios: 'laboratórios',
  otica: 'ótica',
  oticas: 'óticas',
  optica: 'óptica',
  construcao: 'construção',
  moveis: 'móveis',
  imoveis: 'imóveis',
  imobiliaria: 'imobiliária',
  imobiliarias: 'imobiliárias',
  informatica: 'informática',
  contabil: 'contábil',
  contabeis: 'contábeis',
  grafica: 'gráfica',
  graficas: 'gráficas',
  farmacia: 'farmácia',
  farmacias: 'farmácias',
  vidracaria: 'vidraçaria',
  vidracarias: 'vidraçarias',
  nutricao: 'nutrição',
  psicologo: 'psicólogo',
  psicologa: 'psicóloga',
  medico: 'médico',
  medica: 'médica',
  medicos: 'médicos',
  veterinaria: 'veterinária',
  veterinario: 'veterinário',
  chale: 'chalé',
  chales: 'chalés',
  refugio: 'refúgio',
  acougue: 'açougue',
  acougues: 'açougues',
  salao: 'salão',
  saloes: 'salões',
  manutencao: 'manutenção',
  refrigeracao: 'refrigeração',
  climatizacao: 'climatização',
  higienizacao: 'higienização',
  impermeabilizacao: 'impermeabilização',
  comunicacao: 'comunicação',
  seguranca: 'segurança',
  eletronica: 'eletrônica',
  eletrica: 'elétrica',
  hidraulica: 'hidráulica',
  concessionaria: 'concessionária',
  concessionarias: 'concessionárias',
  deposito: 'depósito',
  conveniencia: 'conveniência',
  estacao: 'estação',
  empório: 'empório',
  emporio: 'empório',
  cafe: 'café',
  picole: 'picolé',
  picoles: 'picolés',
  tapecaria: 'tapeçaria',
  atuacao: 'atuação',
  reabilitacao: 'reabilitação',
  decoracao: 'decoração',
  locacao: 'locação',
  formacao: 'formação',
  natacao: 'natação',
  danca: 'dança',
  musica: 'música',
  ingles: 'inglês',
  calcados: 'calçados',
  vestuario: 'vestuário',
  joias: 'joias',
  relogios: 'relógios',
  racoes: 'rações',
  racao: 'ração',
  assistencia: 'assistência',
  tecnica: 'técnica',
  juridica: 'jurídica',
  juridico: 'jurídico',
  fotografo: 'fotógrafo',
  fotografa: 'fotógrafa',
  estudio: 'estúdio',
  estudios: 'estúdios',
  paes: 'pães',
  pao: 'pão',
  gas: 'gás',
  agua: 'água',
  colchoes: 'colchões',
  colchao: 'colchão',
  portoes: 'portões',
  portao: 'portão',
}

/**
 * Restaura a acentuação correta em português para termos digitados sem acento na barra de pesquisa.
 */
export function restorePortugueseAccents(text: string): string {
  if (!text) return ''
  return text.replace(/[A-Za-zÀ-ú]+/g, (word) => {
    const lower = word.toLowerCase()
    const replacement = ACCENT_DICTIONARY[lower]
    if (!replacement) return word
    if (word === word.toUpperCase() && word.length > 1) {
      return replacement.toUpperCase()
    }
    if (word[0] === word[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1)
    }
    return replacement
  })
}

const GENERIC_CATEGORIES = new Set([
  'comércio e serviços',
  'comercio e servicos',
  'comércio local',
  'comercio local',
  'serviços',
  'servicos',
  'empresa local',
  'estabelecimento',
  'estabelecimentos',
  'estabelecimentos de comércio e serviços',
  'business',
  'local business',
  'point of interest',
  'establishment',
  'store',
  'loja',
  'empresa',
])

/**
 * Extrai de forma limpa apenas o nicho/ramo pesquisado pelo usuário a partir da query completa.
 * Ex: "estetica automotiva em Videira - SC" -> "estética automotiva"
 * Ex: "sorveteria em Videira - SC" -> "sorveteria"
 */
export function extractNicheFromQuery(query?: string): string {
  if (!query || !query.trim()) return ''
  let raw = query.trim()

  // 1. Separa por preposições de localização ("em", "no", "na", "in", "en", "at")
  const prepParts = raw.split(/\s+(?:em|no|na|nos|nas|in|en|at|near|perto de)\s+/i)
  if (prepParts.length > 1 && prepParts[0].trim().length >= 2) {
    raw = prepParts[0].trim()
  } else if (raw.includes(' - ')) {
    raw = raw.split(' - ')[0].trim()
  } else if (raw.includes(',')) {
    raw = raw.split(',')[0].trim()
  } else if (raw.includes('-')) {
    const dashParts = raw.split('-')
    if (dashParts[0].trim().length >= 3) {
      raw = dashParts[0].trim()
    }
  }

  // 2. Remove siglas de estados ou nomes de cidades conhecidos se ficaram grudados no final
  raw = raw
    .replace(
      /\s+\b(?:ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to|videira|ca[cç]ador|joa[cç]aba|fraiburgo|chapec[oó]|curitibanos|lages|florian[oó]polis|floripa|joinville|blumenau|curitiba|s[aã]o paulo|porto alegre|salvador|belo horizonte|rio de janeiro|campinas|santos|londrina|maring[aá]|caxias do sul)\b\s*$/i,
      '',
    )
    .trim()

  const cleaned = restorePortugueseAccents(raw.replace(/^["']+|["']+$/g, '').trim())
  if (!cleaned || GENERIC_CATEGORIES.has(cleaned.toLowerCase())) {
    return ''
  }
  return cleaned
}

export function detectLeadLanguage(address?: string, name?: string): PitchLanguage {
  const addrClean = (address || '').toLowerCase()
  const text = `${address || ''} ${name || ''}`.toLowerCase()

  if (
    /\b(?:sc|sp|pr|rs|mg|rj|ba|ce|pe|df|go|es|mt|ms|am|pa|rn|pb|al|se|ro|ac|ap|rr|to)\b/i.test(addrClean) ||
    /brasil|brazil|florian[oó]polis|joinville|blumenau|curitiba|s[aã]o paulo|porto alegre|videira|joa[cç]aba|chapec[oó]|ca[cç]ador|fraiburgo/i.test(text)
  ) {
    return 'pt'
  }

  if (/[\u0600-\u06ff]/.test(text)) return 'ar'
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]|japan|japão|tokyo|osaka|kyoto|yokohama|nagoya|shibuya|shinjuku/i.test(text)) return 'ja'
  if (/spain|espanha|españa|mexico|méxico|argentina|colombia|chile|madrid|barcelona|buenos aires|valencia|bogota|santiago/i.test(text)) return 'es'
  if (/italy|itália|italia|roma|rome|milano|milan|firenze|florence|napoli|torino/i.test(text)) return 'it'
  if (/germany|alemanha|deutschland|austria|áustria|berlin|munich|münchen|hamburg|frankfurt|köln|vienna|viena|zurich/i.test(text)) return 'de'
  if (/france|frança|paris|lyon|marseille|bordeaux|toulouse|geneva|genebra|brussels|bruxelas/i.test(text)) return 'fr'
  if (/dubai|emirados|uae|abu dhabi|sharjah|usa|united states|estados unidos|australia|austrália|uk|united kingdom|reino unido|england|canada|canadá|ireland|irlanda|amsterdam|netherlands|london|sydney|melbourne|brisbane|miami|new york|orlando|florida|california|texas|los angeles|chicago|toronto|vancouver|dublin|\bnsw\b|\bvic\b|\bqld\b|\bfl\b|\bca\b|\bny\b|\btx\b/i.test(text)) {
    return 'en'
  }
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
  customInstructions?: string
}

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  senderName: 'Ryan',
  senderCity: 'Videira',
  senderRole: 'desenvolvedor web',
  persona: 'ryan',
  geminiApiKey: '',
  autoGemini: true,
  tone: 'consultative',
  language: 'auto',
  customInstructions: '',
}

const STORAGE_KEY = 'sondar_pitch_settings_v3'

export function getStoredPitchSettings(): PitchSettings {
  if (typeof window === 'undefined') return DEFAULT_PITCH_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const oldRaw = localStorage.getItem('sondar_pitch_settings_v2')
      if (oldRaw) {
        const old = JSON.parse(oldRaw)
        const cleaned: PitchSettings = {
          ...DEFAULT_PITCH_SETTINGS,
          ...old,
          senderName: old.senderName || DEFAULT_PITCH_SETTINGS.senderName,
          senderCity: old.senderCity || DEFAULT_PITCH_SETTINGS.senderCity,
          persona: old.persona || DEFAULT_PITCH_SETTINGS.persona,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
        return cleaned
      }
      return DEFAULT_PITCH_SETTINGS
    }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PITCH_SETTINGS, ...parsed }
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

export function isLeadInSameCity(address: string, senderCity = ''): boolean {
  if (!address || !senderCity || !senderCity.trim()) return false
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

export function isInternationalLead(address?: string, name?: string): boolean {
  const norm = `${address || ''} ${name || ''}`.toLowerCase()
  if (/\b(?:sc|sp|pr|rs|mg|rj|ba|ce|pe|df|go|es|mt|ms|am|pa|rn|pb|al|se|ro|ac|ap|rr|to)\b/i.test(address || '') || /brasil|brazil/i.test(norm)) {
    return false
  }
  const internationalRegex = /\b(?:usa|united states|estados unidos|australia|austrália|uk|united kingdom|reino unido|england|canada|canadá|london|sydney|melbourne|brisbane|miami|new york|orlando|florida|california|texas|los angeles|chicago|toronto|vancouver|nsw|vic|qld|fl|ca|ny|tx)\b/i
  return internationalRegex.test(norm)
}

export function extractCityFromAddress(address: string): string | null {
  if (!address) return null
  const match = address.match(/(?:[-—,]\s*)([A-Za-zÀ-ú\s]{3,28})\s*-\s*[A-Z]{2}\b/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  return null
}

function capitalize(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

function toCleanTitleCase(text: string): string {
  if (!text) return ''
  const restored = restorePortugueseAccents(text.trim())
  const smallWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'no', 'na'])
  const keepUpper = new Set(['sc', 'sp', 'pr', 'rs', 'rj', 'mg', 'ba', 'df', 'go', 'mt', 'ms', 'ce', 'pe', 'es', 'br', 'vip', '3d', '24h', 'cfc', 'cnh', 'mm', 'jm', 'jp', 'jr', 'dr', 'dra', 'ii', 'iii', 'iv', 'xv'])

  return restored
    .split(/\s+/)
    .map((word, index) => {
      const cleanWord = word.toLowerCase()
      if (keepUpper.has(cleanWord)) return cleanWord.toUpperCase()
      if (index > 0 && smallWords.has(cleanWord)) return cleanWord
      if (word.includes("'")) {
        return word
          .split("'")
          .map((p) => capitalize(p))
          .join("'")
      }
      return capitalize(cleanWord)
    })
    .join(' ')
}

/**
 * Analisa o nome do lead para extrair um destinatário humanizado, limpo e gramaticalmente impecável:
 * - Remove sufixos societários (LTDA, ME, EIRELI, EPP, S/A)
 * - Remove nomes de cidades/UF pendurados no final do título (ex: "The Best Açaí - Videira", "Eskimó Sorvetes Videira")
 * - Identifica profissionais liberais ("Dra. Letícia", "Dr. Marcos", "Camila")
 * - Identifica gênero correto do estabelecimento ("pessoal da Sorveteria Italiana", "pessoal da Estação Açaí", "pessoal do Studio Auto")
 */
export function extractRecipient(name: string, address?: string): { type: 'person' | 'business'; display: string; cleanName: string } {
  let clean = restorePortugueseAccents((name || '').trim())

  const detectedCity = address ? extractCityFromAddress(address) : null

  // 1. Remove sufixos societários e CNPJ
  clean = clean
    .replace(/\b(?:ltda\.?|me\b|epp\b|eireli\b|s\/a\b|s\.a\.?|cia\.?)\b/gi, '')
    .replace(/\s+\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/, '')
    .trim()

  // 2. Remove complementos após separadores (-, –, —, |, •, :)
  const separatorParts = clean.split(/\s*(?:[-–—|•:]|\s+-\s+)\s*/)
  if (separatorParts.length > 1 && separatorParts[0].trim().length >= 3) {
    clean = separatorParts[0].trim()
  }

  // 3. Remove cidade ou UF no final mesmo quando sem traço (ex: "Eskimó Sorvetes Videira", "Sorveteria Polar SC")
  if (detectedCity && detectedCity.length >= 3) {
    const cityRegex = new RegExp(`\\s+${detectedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\/?\\s*[A-Z]{2})?\\s*$`, 'i')
    const stripped = clean.replace(cityRegex, '').trim()
    if (stripped.length >= 3) clean = stripped
  }

  clean = clean
    .replace(
      /\s+\b(?:videira|ca[cç]ador|joa[cç]aba|fraiburgo|chapec[oó]|curitibanos|lages|florian[oó]polis|floripa|joinville|blumenau|itaja[ií]|curitiba|s[aã]o paulo|porto alegre|salvador|belo horizonte|rio de janeiro|sc|sp|pr|rs|mg|rj|ba)\b\s*$/i,
      '',
    )
    .trim()

  // 4. Títulos explícitos de pessoas físicas (Dra, Dr, Doutor, Doutora, Nutricionista, Psicólogo(a), Advogado(a), etc.)
  const titleMatch = clean.match(
    /^(?:dra?\.?|doutor(?:a)?|dr\b|dra\b|nutri(?:cionista)?|psic[oó]log[ao]|advogad[ao]|arquiteto?a?|eng(?:enheir[ao])?|prof(?:essor[ao])?|fisioterapeuta|dentista|fonoaudi[oó]log[ao])\s+([A-Za-zÀ-ú]+)/i,
  )
  if (titleMatch && titleMatch[1]) {
    const rawPrefix = titleMatch[0].toLowerCase()
    const firstName = capitalize(titleMatch[1])
    if (/^dra\b|doutora\b|psic[oó]loga|advogada|fisioterapeuta|nutricionista/i.test(rawPrefix)) {
      const isDoc = /^dra\b|doutora\b|advogada|dentista/i.test(rawPrefix)
      return { type: 'person', display: isDoc ? `Dra. ${firstName}` : firstName, cleanName: toCleanTitleCase(clean) }
    }
    if (/^dr\b|doutor\b|advogado\b/i.test(rawPrefix)) {
      return { type: 'person', display: `Dr. ${firstName}`, cleanName: toCleanTitleCase(clean) }
    }
    return { type: 'person', display: firstName, cleanName: toCleanTitleCase(clean) }
  }

  // 5. Nome próprio seguido de especialidade (ex: "Camila Fisioterapia", "Lucas Barber", "Mariana Nutrição")
  const personMatch = clean.match(
    /^([A-Za-zÀ-ú]{3,})\s+(?:[A-Za-zÀ-ú]{3,}\s+)?(?:fisioterapia|fisio|nutri|nutri[cç][aã]o|advocacia|advogad[ao]|psic[oó]log[ao]|psicologia|barber|barbeiro|tatuador|personal|arquiteto?a?|arquitetura|odontologia|dentista|podologia|est[eé]tica\s+facial)\b/i,
  )
  if (personMatch && personMatch[1]) {
    const firstWord = personMatch[1].toLowerCase()
    const notPersonWords = new Set(['clínica', 'clinica', 'studio', 'estúdio', 'estudio', 'espaço', 'espaco', 'centro', 'instituto', 'consultório', 'consultorio', 'oficina', 'salão', 'salao', 'auto', 'prime', 'elite', 'nova', 'bela', 'santa', 'são', 'sao', 'dom', 'dona', 'vila', 'casa', 'ponto'])
    if (!notPersonWords.has(firstWord)) {
      return { type: 'person', display: capitalize(personMatch[1]), cleanName: toCleanTitleCase(clean) }
    }
  }

  // 6. Negócio / Estabelecimento Comercial
  let businessName = toCleanTitleCase(clean.replace(/^(?:o|a|os|as)\s+/i, '').trim())

  // Se o nome for excessivamente longo (> 4 palavras), enxuga termos redundantes no final mantendo a identidade
  const words = businessName.split(/\s+/)
  if (words.length > 4) {
    businessName = words.slice(0, 4).join(' ')
  }

  // Se já começa com preposição (ex: "Do Zé", "Da Villa", "De Minas")
  if (/^(?:de|da|do|dos|das)\s+/i.test(businessName)) {
    return { type: 'business', display: `equipe ${businessName}`, cleanName: businessName }
  }

  // Detecta gênero feminino com cobertura ampla da língua portuguesa:
  // Qualquer estabelecimento começando ou contendo substantivo feminino principal (-aria, -eria, clínica, estética, oficina, loja, etc.)
  const startsFeminine =
    /^(?:cl[íi]nica|sorveteria|gelateria|a[cç]aiteria|paleteria|pizzaria|hamburgueria|forneria|padaria|panificadora|confeitaria|doceria|pastelaria|churrascaria|cafeteria|lanchonete|espetaria|creperia|brigaderia|choperia|cervejaria|petiscaria|galeteria|peixaria|marmitaria|mec[âa]nica|auto\s*mec[âa]nica|auto\s*el[ée]trica|oficina|borracharia|funilaria|ret[íi]fica|lava[cç][ãa]o|est[ée]tica|barbearia|escola|autoescola|academia|vidra[çc]aria|marmoraria|serralheria|marcenaria|carpintaria|tape[çc]aria|estofaria|refrigera[çc][ãa]o|climatiza[çc][ãa]o|floricultura|[óo]tica|[óo]ptica|lavanderia|tinturaria|gr[áa]fica|drogaria|farm[áa]cia|imobili[áa]ria|construtora|empreiteira|incorporadora|arquitetura|engenharia|contabilidade|advocacia|assessoria|consultoria|corretora|seguradora|locadora|concession[áa]ria|revenda|garagem|transportadora|dedetizadora|desentupidora|assist[êe]ncia|ag[êe]ncia|produtora|casa|cabana|pousada|fazenda|est[aâ]ncia|ch[áa]cara|hospedagem|hospedaria|vila|est[aá][cç][ãa]o|distribuidora|adega|conveni[êe]ncia|mercearia|quitanda|frutaria|loja|boutique|sapataria|joalheria|relojoaria|papelaria|livraria|tabacaria|bicicletaria|agropecu[áa]ria|creche|fisioterapia|odontologia|psicologia|nutri[cç][ãa]o|podologia|terapia|massoterapia|bella|la\s+|santa|nossa\s+senhora|dona)\b/i.test(
      businessName,
    )

  const containsFeminineCore =
    /\b(?:sorveteria|sorvetes|gelateria|pizzaria|hamburgueria|padaria|confeitaria|doceria|lanchonete|cafeteria|barbearia|cl[íi]nica|est[ée]tica|oficina|mec[âa]nica|imobili[áa]ria|vidra[çc]aria|marmoraria|serralheria|marcenaria|farm[áa]cia|drogaria|[óo]tica|floricultura|lavanderia|gr[áa]fica|academia|escola|autoescola|pousada|cabana)\b/i.test(
      businessName,
    ) && !/^(?:studio|est[uú]dio|espa[cç]o|centro|instituto|grupo|imp[eé]rio|ponto|recanto|ref[uú]gio|posto|atelier|ateli[eê]|sal[aã]o|consult[oó]rio|escrit[oó]rio|hospital|laborat[oó]rio|hotel|supermercado|mercado|a[cç]ougue|dep[oó]sito|shopping)\b/i.test(businessName)

  const isFeminine = startsFeminine || containsFeminineCore
  const article = isFeminine ? 'da' : 'do'

  return {
    type: 'business',
    display: `pessoal ${article} ${businessName}`,
    cleanName: businessName,
  }
}

export function extractLocationHook(address: string, isSameCity: boolean, leadCity: string | null): string {
  if (!address || address.length < 4) {
    return isSameCity ? 'aqui na cidade' : leadCity ? `em ${leadCity}` : 'da região'
  }

  const clean = address
    .replace(/\b\d{5}-?\d{3}\b/g, '')
    .replace(/(?:[-—,]\s*)\b(?:brasil|brazil)\b\s*$/gi, '')
    .trim()

  const segments = clean
    .split(/[-—,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  let streetFull = ''
  let neighborhood = ''

  for (const seg of segments) {
    if (
      /^\d+$/.test(seg) ||
      /\d{5}/.test(seg) ||
      /^(sc|sp|pr|rs|mg|rj|ba|ce|pe|df|go|es|mt|ms|am|pa|rn|pb|al|se|ro|ac|ap|rr|to)$/i.test(seg) ||
      (leadCity && seg.toLowerCase() === leadCity.toLowerCase())
    ) {
      continue
    }

    if (!streetFull && (/(?:rua|r\.|av\.|avenida|travessa|alameda|rodovia|rod\.|pra[cç]a|estrada)\s+/i.test(seg) || /^[A-Za-zÀ-ú\s]{4,}$/.test(seg))) {
      let s = seg.replace(/\s*\d+.*$/, '').trim()
      if (/^r\.\s+/i.test(s)) {
        s = s.replace(/^r\.\s+/i, 'Rua ')
      } else if (/^av\.\s+/i.test(s)) {
        s = s.replace(/^av\.\s+/i, 'Av. ')
      } else if (/^rod\.\s+/i.test(s)) {
        s = s.replace(/^rod\.\s+/i, 'Rodovia ')
      } else if (!/^(?:rua|av\.|avenida|travessa|alameda|rodovia|pra[cç]a|estrada)\b/i.test(s)) {
        s = `Rua ${s}`
      }
      streetFull = toCleanTitleCase(s)
      continue
    }

    if (streetFull && !neighborhood && !/^\d+/.test(seg) && seg.length >= 3) {
      const cleanedNeigh = seg.replace(/^(?:bairro|no|na)\s+/i, '').trim()
      if (!/^(?:shopping|sala|loja|bloco|andar|centro)\b/i.test(cleanedNeigh)) {
        neighborhood = toCleanTitleCase(cleanedNeigh)
      }
      break
    }
  }

  if (streetFull && streetFull.length >= 5) {
    const isMasculineStreet = /^(?:caminho|largo|trevo|contorno)\b/i.test(streetFull)
    const streetPrep = isMasculineStreet ? 'no' : 'na'

    if (neighborhood && neighborhood.length >= 3) {
      const isFemNeigh = /^(?:vila|barra|prainha|enseada|lagoa|serra|colina|vargem|fazenda|ch[aá]cara|aldeia|itoupava|velha|nova|santa)\b/i.test(neighborhood)
      const neighPrep = isFemNeigh ? 'na' : 'no'
      return `${streetPrep} ${streetFull} (${neighPrep} ${neighborhood})`
    }
    return `${streetPrep} ${streetFull}`
  }

  return isSameCity ? 'aqui na cidade' : leadCity ? `em ${leadCity}` : 'da região'
}

export type SpecialtyInfo = {
  isHealth: boolean
  isPelvicOrPhysio: boolean
  isDental: boolean
  isFood: boolean
  isIceCream?: boolean
  isAuto: boolean
  isRealEstate: boolean
  isBarber: boolean
  isBeautyOrSpa: boolean
  isHairSalon?: boolean
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
  isPsychology?: boolean
  isNutrition?: boolean
  isArchitecture?: boolean
  isEvents?: boolean
  isUpholsteryCleaning?: boolean
  isConstruction?: boolean
  isPrintSign?: boolean
  isSecurity?: boolean
  isEducation?: boolean
  isBeverage?: boolean
  isFlorist?: boolean
  isLaundry?: boolean
  nicheType: string
  /** Rótulo natural que vai direto no texto ("estética automotiva", "sorveteria", "barbearia", etc.) */
  specialtyLabel: string
  /** Termo exato pesquisado pelo usuário quando disponível (ex: "estética automotiva", "sorveteria") */
  searchedTerm: string
  clientTerm: string
  serviceTerm: string
  actionTerm: string
}

const BASE_SPECIALTY: Omit<SpecialtyInfo, 'nicheType' | 'specialtyLabel' | 'searchedTerm' | 'clientTerm' | 'serviceTerm' | 'actionTerm'> = {
  isHealth: false,
  isPelvicOrPhysio: false,
  isDental: false,
  isFood: false,
  isIceCream: false,
  isAuto: false,
  isRealEstate: false,
  isBarber: false,
  isBeautyOrSpa: false,
  isHairSalon: false,
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
  isPsychology: false,
  isNutrition: false,
  isArchitecture: false,
  isEvents: false,
  isUpholsteryCleaning: false,
  isConstruction: false,
  isPrintSign: false,
  isSecurity: false,
  isEducation: false,
  isBeverage: false,
  isFlorist: false,
  isLaundry: false,
}

/**
 * Identifica com precisão cirúrgica o nicho do lead analisando:
 * 1) O que o usuário pesquisou na barra de busca (searchQuery / searchedNiche)
 * 2) O nome real do estabelecimento (lead.name)
 * 3) A categoria extraída do Google Maps (lead.category)
 *
 * E mantém o termo pesquisado de forma limpa e natural no texto!
 */
export function extractSpecialtyInfo(lead: Lead, searchQuery?: string): SpecialtyInfo {
  const effectiveQuery = searchQuery || lead.searchQuery || lead.searchedNiche || ''
  const cleanSearchedNiche = extractNicheFromQuery(effectiveQuery).toLowerCase()

  const rawCat = restorePortugueseAccents((lead.category || '').trim()).toLowerCase()
  const validCat = GENERIC_CATEGORIES.has(rawCat) ? '' : rawCat

  const combined = restorePortugueseAccents(
    `${cleanSearchedNiche} ${lead.name || ''} ${validCat} ${lead.address || ''}`,
  ).toLowerCase()

  // Helper para escolher o rótulo que fica mais natural no texto:
  // Se o usuário pesquisou algo específico daquele nicho (ex: "estética automotiva", "sorveteria"),
  // usa o próprio termo pesquisado (com acentuação corrigida) para ficar 100% fiel ao que ele digitou!
  const pickLabel = (defaultLabel: string, matchRegex?: RegExp): string => {
    if (cleanSearchedNiche && cleanSearchedNiche.length >= 3) {
      if (!matchRegex || matchRegex.test(cleanSearchedNiche)) {
        return cleanSearchedNiche
      }
    }
    return defaultLabel
  }

  // 1. SORVETERIA, GELATERIA, AÇAITERIA & PICOLÉS
  const iceCreamRegex = /sorvet|gelat|gellat|a[cç]a[ií]|picol[eé]|palet|milk\s*shake|chiquinho|eskimo|eskim[oó]/i
  if (iceCreamRegex.test(combined)) {
    const isAcaiFocus = /a[cç]a[ií]/i.test(lead.name) && !/sorvet/i.test(lead.name) && !/sorvet/i.test(cleanSearchedNiche)
    const defaultLbl = isAcaiFocus ? 'açaí e sorveteria' : 'sorveteria'
    return {
      ...BASE_SPECIALTY,
      isFood: true,
      isIceCream: true,
      nicheType: 'ice_cream',
      specialtyLabel: pickLabel(defaultLbl, iceCreamRegex),
      searchedTerm: cleanSearchedNiche || defaultLbl,
      clientTerm: 'cliente',
      serviceTerm: 'sabores de sorvetes, taças, açaí e potes',
      actionTerm: 'pedir ou consultar opções no WhatsApp',
    }
  }

  // 2. HIGIENIZAÇÃO DE ESTOFADOS, SOFÁS, TAPETES E COLCHÕES
  const upholsteryRegex = /higieniza[cç][aã]o\s*(?:de\s*)?(?:estofad|sof[aá]|colch[aã]o|tapete)|limpeza\s*de\s*(?:estofad|sof[aá]|colch[aã]o|tapete)|impermeabiliza[cç][aã]o|lava\s*sof[aá]/i
  if (upholsteryRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isUpholsteryCleaning: true,
      nicheType: 'upholstery_cleaning',
      specialtyLabel: pickLabel('higienização de estofados', upholsteryRegex),
      searchedTerm: cleanSearchedNiche || 'higienização de estofados',
      clientTerm: 'cliente',
      serviceTerm: 'higienização de sofás, colchões e impermeabilização',
      actionTerm: 'pedir orçamento pelo WhatsApp',
    }
  }

  // 3. ESTÉTICA AUTOMOTIVA, POLIMENTO, DETAILING & LAVA-JATO
  const autoDetailRegex = /est[eé]tica\s*(?:automotiv|veicular|de ve[ií]culos|auto\b)|detailer|detailing|polimento|vitrifica|cristaliza|lava\s*car|lavacar|lava\s*jato|lava[- ]r[aá]pido|lava[cç][aã]o|higieniza[cç][aã]o automotiva|martelinho\s*de\s*ouro|insulfilm|envelopamento|auto\s*spa/i
  if (autoDetailRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isAuto: true,
      nicheType: 'auto_detail',
      specialtyLabel: pickLabel('estética automotiva', autoDetailRegex),
      searchedTerm: cleanSearchedNiche || 'estética automotiva',
      clientTerm: 'cliente',
      serviceTerm: 'polimento, vitrificação, higienização interna e cuidados com o veículo',
      actionTerm: 'pedir orçamento rápido no WhatsApp',
    }
  }

  // 4. CONCESSIONÁRIA, REVENDA DE VEÍCULOS, GARAGEM & SEMINOVOS
  const dealershipRegex = /concession[aá]ria|revenda\s*de\s*(?:carros|ve[ií]culos|motos)|seminovos|multimarcas|loja\s*de\s*(?:carros|ve[ií]culos|autom[oó]veis)|garagem\s*de\s*(?:carros|ve[ií]culos)|compra\s*e\s*venda\s*de\s*ve[ií]culos/i
  if (dealershipRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isAuto: true,
      nicheType: 'car_dealership',
      specialtyLabel: pickLabel('loja de veículos e seminovos', dealershipRegex),
      searchedTerm: cleanSearchedNiche || 'revenda de veículos',
      clientTerm: 'comprador',
      serviceTerm: 'estoque de veículos atualizado, fotos detalhadas e simulação de financiamento',
      actionTerm: 'negociar ou simular troca no WhatsApp',
    }
  }

  // 5. OFICINA MECÂNICA, AUTO CENTER, BORRACHARIA, AUTO ELÉTRICA & FUNILARIA
  const mechanicRegex = /mec[aâ]nic|auto\s*center|centro\s*automotivo|oficina\b|funilaria|chapea[cç][aã]o|pintura\s*automotiva|auto\s*el[eé]trica|troca\s*de\s*[oó]leo|alinhamento|balanceamento|freios|inje[cç][aã]o|suspens[aã]o|borracharia|ret[ií]fica|autope[cç]as|auto\s*pe[cç]as|escapamento|radiador|c[aâ]mbio/i
  if (mechanicRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isAuto: true,
      nicheType: 'auto_mechanic',
      specialtyLabel: pickLabel('oficina mecânica e serviços automotivos', mechanicRegex),
      searchedTerm: cleanSearchedNiche || 'oficina mecânica',
      clientTerm: 'cliente',
      serviceTerm: 'manutenção, revisão preventiva e diagnóstico automotivo',
      actionTerm: 'solicitar orçamento no WhatsApp',
    }
  }

  // 6. GUINCHO, REBOQUE, SOCORRO 24H, FRETES & MUDANÇAS
  const towingRegex = /guincho|reboque|socorro\s*24|auto\s*socorro|transportadora|mudan[cç]as|frete/i
  if (towingRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isAuto: true,
      nicheType: 'towing_transport',
      specialtyLabel: pickLabel('guincho e transporte', towingRegex),
      searchedTerm: cleanSearchedNiche || 'guincho e transporte',
      clientTerm: 'cliente',
      serviceTerm: 'atendimento rápido de socorro, reboque e transporte',
      actionTerm: 'acionar atendimento imediato no WhatsApp',
    }
  }

  // 7. PET SHOP, CLÍNICAS VETERINÁRIAS, BANHO E TOSA & AGROPECUÁRIA
  const petRegex = /pet\s*shop|petshop|veterin[aá]r|banho\s*e\s*tosa|banho\s*&\s*tosa|est[eé]tica\s*(?:animal|canina|pet)|cl[ií]nica\s*vet|pet\s*care|hospital\s*veterin[aá]r|agropecu[aá]ria|casa\s*de\s*ra[cç][aã]o/i
  if (petRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isPet: true,
      nicheType: 'pet',
      specialtyLabel: pickLabel('pet shop e clínica veterinária', petRegex),
      searchedTerm: cleanSearchedNiche || 'pet shop',
      clientTerm: 'tutor',
      serviceTerm: 'banho e tosa, consultas veterinárias e produtos pet',
      actionTerm: 'agendar horário no WhatsApp',
    }
  }

  // 8. ODONTOLOGIA & DENTISTAS
  const dentalRegex = /odont|dentist|sorriso|ortodont|implante\s*dent|clareamento\s*dent|pr[oó]tese\s*dent|invisalign|harmoniza[cç][aã]o\s*orofacial|est[eé]tica\s*dental|cirurgi[aã]o[- ]dentista|endodontia|periodontia/i
  if (dentalRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      isDental: true,
      nicheType: 'dental',
      specialtyLabel: pickLabel('odontologia e consultórios odontológicos', dentalRegex),
      searchedTerm: cleanSearchedNiche || 'odontologia',
      clientTerm: 'paciente',
      serviceTerm: 'tratamentos odontológicos, implantes e clareamento',
      actionTerm: 'agendar avaliação no WhatsApp',
    }
  }

  // 9. FISIOTERAPIA PÉLVICA & SAÚDE DA MULHER
  const pelvicRegex = /p[eé]lvic|uroginecolog|sa[uú]de\s*da\s*mulher|sa[uú]de\s*[ií]ntima/i
  if (pelvicRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      isPelvicOrPhysio: true,
      nicheType: 'pelvic',
      specialtyLabel: pickLabel('fisioterapia pélvica', pelvicRegex),
      searchedTerm: cleanSearchedNiche || 'fisioterapia pélvica',
      clientTerm: 'paciente',
      serviceTerm: 'tratamentos especializados e reabilitação pélvica',
      actionTerm: 'agendar avaliação no WhatsApp',
    }
  }

  // 10. FISIOTERAPIA GERAL, QUIROPRAXIA, OSTEOPATIA & PODOLOGIA
  const physioRegex = /fisioter|quiropra|osteopat|reabilita[cç][aã]o\s*f[ií]sica|coluna|traumato|rpg\b|podolog/i
  if (physioRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      isPelvicOrPhysio: true,
      nicheType: 'physio',
      specialtyLabel: pickLabel('fisioterapia e reabilitação', physioRegex),
      searchedTerm: cleanSearchedNiche || 'fisioterapia',
      clientTerm: 'paciente',
      serviceTerm: 'tratamentos de reabilitação e alívio de dores',
      actionTerm: 'marcar avaliação no WhatsApp',
    }
  }

  // 11. PSICOLOGIA, TERAPIA & SAÚDE MENTAL
  const psychRegex = /psic[oó]l|terap(?:euta|ia)\b|psican[aá]l|sa[uú]de\s*mental|psiquiatr|hipnoterap/i
  if (psychRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      isPsychology: true,
      nicheType: 'psychology',
      specialtyLabel: pickLabel('psicologia e terapia', psychRegex),
      searchedTerm: cleanSearchedNiche || 'psicologia',
      clientTerm: 'paciente',
      serviceTerm: 'sessões de terapia e acompanhamento emocional',
      actionTerm: 'agendar sessão no WhatsApp',
    }
  }

  // 12. NUTRIÇÃO & EMAGRECIMENTO
  const nutritionRegex = /nutri[cç][aã]o|nutricionista|emagrecimento|reeduca[cç][aã]o\s*alimentar|bioimped[aâ]ncia|nutr[oó]log/i
  if (nutritionRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      isNutrition: true,
      nicheType: 'nutrition',
      specialtyLabel: pickLabel('nutrição e acompanhamento nutricional', nutritionRegex),
      searchedTerm: cleanSearchedNiche || 'nutrição',
      clientTerm: 'paciente',
      serviceTerm: 'consultas e planos nutricionais personalizados',
      actionTerm: 'marcar consulta no WhatsApp',
    }
  }

  // 13. FARMÁCIA, DROGARIA & MANIPULAÇÃO
  const pharmacyRegex = /farm[aá]cia|drogaria|manipula[cç][aã]o|medicamento|homeopatia/i
  if (pharmacyRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      nicheType: 'pharmacy',
      specialtyLabel: pickLabel('farmácia e manipulação', pharmacyRegex),
      searchedTerm: cleanSearchedNiche || 'farmácia',
      clientTerm: 'cliente',
      serviceTerm: 'envio de receitas, orçamentos de manipulados e entrega rápida',
      actionTerm: 'enviar receita ou pedir entrega no WhatsApp',
    }
  }

  // 14. ÓTICA, ÓCULOS & LENTES
  const opticalRegex = /\b[oó]tica\b|\b[oó]ptica\b|[oó]culos\b|lentes\s*de\s*contato|relojoaria\s*e\s*[oó]tica/i
  if (opticalRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      nicheType: 'optical',
      specialtyLabel: pickLabel('ótica', opticalRegex),
      searchedTerm: cleanSearchedNiche || 'ótica',
      clientTerm: 'cliente',
      serviceTerm: 'catálogo de armações, lentes de grau/sol e orçamento de receitas',
      actionTerm: 'enviar receita ou ver armações no WhatsApp',
    }
  }

  // 15. AUTOESCOLA, CFC & DESPACHANTE
  const autoSchoolRegex = /auto\s*escola|autoescola|cfc\b|primeira\s*habilita[cç][aã]o|cnh\b|despachante/i
  if (autoSchoolRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      nicheType: 'auto_school',
      specialtyLabel: pickLabel('autoescola e formação de condutores', autoSchoolRegex),
      searchedTerm: cleanSearchedNiche || 'autoescola',
      clientTerm: 'aluno',
      serviceTerm: 'primeira habilitação (CNH), adição de categoria e parcelamento',
      actionTerm: 'consultar matrícula e valores no WhatsApp',
    }
  }

  // 16. BARBEARIA & BARBEIROS
  const barberRegex = /barbearia|barbeir|barber|corte\s*masculin|fade|degrad[eê]|navalha|corte\s*e\s*barba/i
  if (barberRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isBarber: true,
      nicheType: 'barber',
      specialtyLabel: pickLabel('barbearia', barberRegex),
      searchedTerm: cleanSearchedNiche || 'barbearia',
      clientTerm: 'cliente',
      serviceTerm: 'cortes, barba e agendamento prático sem fila',
      actionTerm: 'agendar horário no WhatsApp',
    }
  }

  // 17. UNHAS, CÍLIOS & SOBRANCELHAS (Nails & Lash)
  const nailsRegex = /nail|manicure|pedicure|esmalteria|alongamento\s*de\s*unhas|fibra\s*de\s*vidro|lash|c[ií]lios|extens[aã]o\s*de\s*c[ií]lios|designer\s*de\s*sobrancelhas|micropigmenta|microblading|sobrancelha/i
  if (nailsRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isBeautyOrSpa: true,
      isNailOrLash: true,
      nicheType: 'nails_lash',
      specialtyLabel: pickLabel('studio de unhas, cílios e sobrancelhas', nailsRegex),
      searchedTerm: cleanSearchedNiche || 'unhas e cílios',
      clientTerm: 'cliente',
      serviceTerm: 'procedimentos, catálogo de resultados e manutenções',
      actionTerm: 'agendar horário no WhatsApp',
    }
  }

  // 18. SALÃO DE BELEZA & CABELEIREIROS
  const hairSalonRegex = /sal[aã]o\s*de\s*beleza|cabeleireir|hair|cabelo|mechas|escova|loiro|alisamento|mega\s*hair|terapia\s*capilar|studi[o]\s*de\s*beleza/i
  if (hairSalonRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isBeautyOrSpa: true,
      isHairSalon: true,
      nicheType: 'hair_salon',
      specialtyLabel: pickLabel('salão de beleza', hairSalonRegex),
      searchedTerm: cleanSearchedNiche || 'salão de beleza',
      clientTerm: 'cliente',
      serviceTerm: 'procedimentos capilares, mechas e produção',
      actionTerm: 'agendar horário no WhatsApp',
    }
  }

  // 19. ESTÉTICA FACIAL, CORPORAL, BIOMÉDICA, DEPILAÇÃO & SPA (Humana)
  const aestheticsRegex = /est[eé]tica|harmoniza|biom[eé]d|botox|preenchimento|limpeza\s*de\s*pele|esteta|(?:^|[^a-zá-ú])spa(?:$|[^a-zá-ú])|massoterapia|drenagem|depila[cç][aã]o|laser|bronzeamento/i
  if (aestheticsRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      isBeautyOrSpa: true,
      nicheType: 'aesthetics',
      specialtyLabel: pickLabel('clínica de estética', aestheticsRegex),
      searchedTerm: cleanSearchedNiche || 'clínica de estética',
      clientTerm: 'paciente',
      serviceTerm: 'procedimentos faciais, corporais e protocolos estéticos',
      actionTerm: 'agendar avaliação no WhatsApp',
    }
  }

  // 20. STUDIO DE PILATES & YOGA
  const pilatesRegex = /pilates|studio\s*de\s*pilates|m[eé]todo\s*pilates|\byoga\b/i
  if (pilatesRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      isPilates: true,
      nicheType: 'pilates',
      specialtyLabel: pickLabel('studio de pilates', pilatesRegex),
      searchedTerm: cleanSearchedNiche || 'pilates',
      clientTerm: 'aluno',
      serviceTerm: 'aulas personalizadas, postura e horários flexíveis',
      actionTerm: 'agendar aula experimental no WhatsApp',
    }
  }

  // 21. ACADEMIAS, CROSSFIT, ARTES MARCIAIS, NATAÇÃO & DANÇA
  const gymRegex = /academia|crossfit|fitness|muscula|personal\s*trainer|artes\s*marciais|jiu[- ]jitsu|muay\s*thai|boxe|karat[eê]|jud[oô]|taekwondo|funcional|dan[cç]a|nata[cç][aã]o|hidrogin[aá]stica|beach\s*tennis|quadra/i
  if (gymRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isGym: true,
      nicheType: 'gym',
      specialtyLabel: pickLabel('academia e treinamento físico', gymRegex),
      searchedTerm: cleanSearchedNiche || 'academia',
      clientTerm: 'aluno',
      serviceTerm: 'modalidades, horários de treinos e planos',
      actionTerm: 'agendar aula experimental no WhatsApp',
    }
  }

  // 22. TATUAGEM & BODY PIERCING
  const tattooRegex = /tatuag|tattoo|piercing|piercer|tatuador/i
  if (tattooRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isTattoo: true,
      nicheType: 'tattoo',
      specialtyLabel: pickLabel('studio de tatuagem e piercing', tattooRegex),
      searchedTerm: cleanSearchedNiche || 'studio de tatuagem',
      clientTerm: 'cliente',
      serviceTerm: 'portfólio de artes autorais e piercings',
      actionTerm: 'pedir orçamento no WhatsApp',
    }
  }

  // 23. FOTOGRAFIA, FILMAGEM & PRODUTORA
  const photoRegex = /fot[oó]gra|fotografia|est[uú]dio\s*fotogr[aá]fico|ensaio\s*fotogr[aá]fico|filmagem|produtora\s*de\s*v[ií]deo/i
  if (photoRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isPhoto: true,
      nicheType: 'photo',
      specialtyLabel: pickLabel('fotografia e ensaios fotográficos', photoRegex),
      searchedTerm: cleanSearchedNiche || 'fotografia',
      clientTerm: 'cliente',
      serviceTerm: 'portfólio de ensaios, pacotes e coberturas',
      actionTerm: 'consultar pacotes e datas no WhatsApp',
    }
  }

  // 24. ARQUITETURA, ENGENHARIA & DESIGN DE INTERIORES
  const archRegex = /arquitet|design\s*de\s*interiores|projetos\s*arquitet[oô]nicos|interiores\b|engenharia\s*civil|engenheir[ao]|topografia/i
  if (archRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isArchitecture: true,
      nicheType: 'architecture',
      specialtyLabel: pickLabel('arquitetura e engenharia', archRegex),
      searchedTerm: cleanSearchedNiche || 'arquitetura',
      clientTerm: 'cliente',
      serviceTerm: 'portfólio de projetos, obras e interiores',
      actionTerm: 'agendar reunião de briefing no WhatsApp',
    }
  }

  // 25. HOTELARIA, POUSADAS, CABANAS, CHALÉS, CHÁCARAS & HOSPEDAGEM
  const hospitalityRegex = /cabana|chal[eé]|pousada|hotel|hostel|glamping|resort|ref[uú]gio|rancho|temporada|airbnb|bangal[oô]|hospedag|hospedaria|camping|lodge|eco\s*lodge|turismo|ag[eê]ncia\s*de\s*viagens/i
  if (hospitalityRegex.test(combined)) {
    const isCabanaOrChale = /cabana|chal[eé]|glamping|ref[uú]gio|bangal[oô]|lodge/i.test(combined)
    const defaultLbl = isCabanaOrChale ? 'cabanas e chalés' : 'pousadas e hospedagens'
    return {
      ...BASE_SPECIALTY,
      isHospitality: true,
      nicheType: isCabanaOrChale ? 'cabins' : 'hospitality',
      specialtyLabel: pickLabel(defaultLbl, hospitalityRegex),
      searchedTerm: cleanSearchedNiche || defaultLbl,
      clientTerm: 'hóspede',
      serviceTerm: 'fotos das acomodações, comodidades e diárias',
      actionTerm: 'consultar datas e reservar direto no WhatsApp',
    }
  }

  // 26. FESTAS, EVENTOS, SALÃO DE FESTAS, DECORAÇÃO & BUFFET
  const eventsRegex = /buffet|sal[aã]o\s*de\s*festas|espa[cç]o\s*para\s*eventos|cerimonial|casamentos|festas\s*infantis|loca[cç][aã]o\s*para\s*eventos|decora[cç][aã]o\s*de\s*festas|aluguel\s*de\s*brinquedos|ch[aá]cara\s*para\s*eventos/i
  if (eventsRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isEvents: true,
      nicheType: 'events',
      specialtyLabel: pickLabel('eventos, festas e buffet', eventsRegex),
      searchedTerm: cleanSearchedNiche || 'eventos e festas',
      clientTerm: 'cliente',
      serviceTerm: 'fotos da estrutura, pacotes e disponibilidade de datas',
      actionTerm: 'consultar datas e orçamento no WhatsApp',
    }
  }

  // 27. PIZZARIA & FORNERIA
  const pizzaRegex = /pizz|forneria|forno\s*a\s*lenha/i
  if (pizzaRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isFood: true,
      nicheType: 'pizzaria',
      specialtyLabel: pickLabel('pizzaria', pizzaRegex),
      searchedTerm: cleanSearchedNiche || 'pizzaria',
      clientTerm: 'cliente',
      serviceTerm: 'cardápio digital de pizzas, combos e pedido rápido',
      actionTerm: 'fazer pedido direto no WhatsApp',
    }
  }

  // 28. HAMBURGUERIA & LANCHES
  const burgerRegex = /hamburg|burger|smash|lanchonete|lanche|cachorro[- ]quente|hot\s*dog|xis\b|pastelaria|pastel\b|creperia|tapioca|espetinho|espetaria|shawarma|kebab/i
  if (burgerRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isFood: true,
      nicheType: 'burger',
      specialtyLabel: pickLabel('hamburgueria e lanches', burgerRegex),
      searchedTerm: cleanSearchedNiche || 'hamburgueria',
      clientTerm: 'cliente',
      serviceTerm: 'cardápio digital com fotos dos lanches, combos e adicionais',
      actionTerm: 'pedir direto no WhatsApp',
    }
  }

  // 29. PADARIA, CONFEITARIA, DOCERIA, BOLOS & CAFETERIA
  const bakeryRegex = /padaria|panificadora|confeitaria|doceria|brigaderia|bolo|bolos|tortas|salgados|cafeteria|coffee\s*shop|caf[eé]\s*colonial|\bcaf[eé]\b(?!\s*da\s*manh[aã])|biscoit|chocolate/i
  if (bakeryRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isFood: true,
      nicheType: 'bakery',
      specialtyLabel: pickLabel('padaria e confeitaria', bakeryRegex),
      searchedTerm: cleanSearchedNiche || 'padaria e confeitaria',
      clientTerm: 'cliente',
      serviceTerm: 'vitrine de bolos, doces, salgados e encomendas para festas',
      actionTerm: 'fazer encomenda ou pedido no WhatsApp',
    }
  }

  // 30. RESTAURANTES, CHURRASCARIAS, SUSHI & GASTRONOMIA GERAL
  const foodRegex = /restaur|sushi|temaki|comida\s*(?:japonesa|oriental|caseira|[aá]rabe|italiana|mexicana|chinesa)|churrascaria|marmita|marmitaria|bistr[oô]|choperia|cervejaria|petiscaria|galeteria|costelaria|peixaria|frutos\s*do\s*mar|buffet\s*a\s*quilo|gastronomia|card[aá]pio|delivery/i
  if (foodRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isFood: true,
      nicheType: 'food',
      specialtyLabel: pickLabel('restaurante e gastronomia', foodRegex),
      searchedTerm: cleanSearchedNiche || 'restaurante',
      clientTerm: 'cliente',
      serviceTerm: 'cardápio digital atualizado, pratos do dia e reservas/delivery',
      actionTerm: 'pedir ou reservar mesa no WhatsApp',
    }
  }

  // 31. SUPERMERCADO, MERCADO, AÇOUGUE, HORTIFRUTI, EMPÓRIO & SUPLEMENTOS
  const groceryRegex = /supermercado|mercado|minimercado|mercearia|hortifruti|sacol[aã]o|frutaria|quitanda|a[cç]ougue|casa\s*de\s*carnes|emp[oó]rio|produtos\s*naturais|suplemento|queijaria|fiambreria/i
  if (groceryRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isFood: true,
      nicheType: 'grocery',
      specialtyLabel: pickLabel('mercado e comércio alimentício', groceryRegex),
      searchedTerm: cleanSearchedNiche || 'mercado',
      clientTerm: 'cliente',
      serviceTerm: 'ofertas da semana, cortes selecionados e entregas rápidas',
      actionTerm: 'fazer pedido ou consultar ofertas no WhatsApp',
    }
  }

  // 32. DISTRIBUIDORA DE BEBIDAS, ADEGA & CONVENIÊNCIA
  const beverageRegex = /distribuidora\s*de\s*bebidas|adega|dep[oó]sito\s*de\s*bebidas|chopp|disk\s*cerveja|conveni[eê]ncia|bebidas|g[aá]s\b|[aá]gua\s*mineral|tabacaria/i
  if (beverageRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isBeverage: true,
      nicheType: 'beverage',
      specialtyLabel: pickLabel('distribuidora de bebidas e adega', beverageRegex),
      searchedTerm: cleanSearchedNiche || 'distribuidora de bebidas',
      clientTerm: 'cliente',
      serviceTerm: 'catálogo de bebidas geladas, barris de chopp e entrega expressa',
      actionTerm: 'pedir entrega rápida no WhatsApp',
    }
  }

  // 33. LOJA DE ROUPAS, MODA, BOUTIQUE, CALÇADOS, JOALHERIA & ACESSÓRIOS
  const fashionRegex = /loja\s*de\s*roupas|roupas|moda\s*(?:feminina|masculina|infantil|[ií]ntima|fitness|praia)|boutique|vestu[aá]rio|confec[cç][oõ]es|cal[cç]ados|sapataria|t[eê]nis|enxovais|cama\s*mesa\s*e\s*banho|lingerie|joalheria|semijoias|bijuterias|relojoaria|acess[oó]rios|bolsas|noivas|aluguel\s*de\s*trajes|brech[oó]|ateli[eê]|costur/i
  if (fashionRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      nicheType: 'fashion_retail',
      specialtyLabel: pickLabel('loja de moda e vestuário', fashionRegex),
      searchedTerm: cleanSearchedNiche || 'loja de roupas',
      clientTerm: 'cliente',
      serviceTerm: 'vitrine com novidades da coleção, tamanhos e atendimento personalizado',
      actionTerm: 'chamar as vendedoras e reservar peças no WhatsApp',
    }
  }

  // 34. MARMORARIA, GRANITOS & PEDRAS DECORATIVAS
  const marbleRegex = /marmoraria|m[aá]rmore|granito|quartzo|pedras\s*decorativas/i
  if (marbleRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isConstruction: true,
      nicheType: 'marble',
      specialtyLabel: pickLabel('marmoraria', marbleRegex),
      searchedTerm: cleanSearchedNiche || 'marmoraria',
      clientTerm: 'cliente',
      serviceTerm: 'bancadas de cozinha, banheiros, escadas e projetos em mármore e granito',
      actionTerm: 'enviar medidas e pedir orçamento no WhatsApp',
    }
  }

  // 35. SERRALHERIA, ESTRUTURAS METÁLICAS & PORTÕES
  const metalworkRegex = /serralheria|serralheiro|estrutura\s*met[aá]lica|port[oõ]es\s*basculantes|grades|corrim[aã]o|calhas|funilaria\s*industrial|inox|solda/i
  if (metalworkRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isConstruction: true,
      nicheType: 'metalwork',
      specialtyLabel: pickLabel('serralheria e estruturas metálicas', metalworkRegex),
      searchedTerm: cleanSearchedNiche || 'serralheria',
      clientTerm: 'cliente',
      serviceTerm: 'portões sob medida, grades, corrimãos e estruturas metálicas',
      actionTerm: 'solicitar orçamento e visita técnica no WhatsApp',
    }
  }

  // 36. MÓVEIS PLANEJADOS, MARCENARIA, LOJA DE MÓVEIS & COLCHÕES
  const furnitureRegex = /m[oó]veis\s*planej|marcenaria|m[oó]veis\s*sob\s*medida|marceneiro|loja\s*de\s*m[oó]veis|colch[oõ]es|colch[aã]o|estofados|tape[cç]aria|estofaria|cortinas|persianas/i
  if (furnitureRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isFurniture: true,
      nicheType: 'furniture',
      specialtyLabel: pickLabel('marcenaria e móveis planejados', furnitureRegex),
      searchedTerm: cleanSearchedNiche || 'móveis planejados',
      clientTerm: 'cliente',
      serviceTerm: 'projetos sob medida, ambientes entregues e catálogo de móveis',
      actionTerm: 'solicitar projeto e orçamento no WhatsApp',
    }
  }

  // 37. VIDRAÇARIA, BOX DE VIDRO & ESQUADRIAS
  const glazingRegex = /vidra[cç]|box\s*de\s*vidro|esquadria|vidro\s*temperado|espelho\s*bisot|fechamento\s*de\s*sacada/i
  if (glazingRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isGlazing: true,
      nicheType: 'glazing',
      specialtyLabel: pickLabel('vidraçaria e esquadrias', glazingRegex),
      searchedTerm: cleanSearchedNiche || 'vidraçaria',
      clientTerm: 'cliente',
      serviceTerm: 'box de banheiro, espelhos, sacadas e esquadrias sob medida',
      actionTerm: 'pedir orçamento rápido no WhatsApp',
    }
  }

  // 38. CLIMATIZAÇÃO, AR-CONDICIONADO, REFRIGERAÇÃO & ENERGIA SOLAR
  const hvacRegex = /climatiza|refrigera|ar[- ]condicionado|split|aquecedor|energia\s*solar|painel\s*solar|fotovoltaic/i
  if (hvacRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHvac: true,
      nicheType: 'hvac',
      specialtyLabel: pickLabel('climatização e energia solar', hvacRegex),
      searchedTerm: cleanSearchedNiche || 'climatização e refrigeração',
      clientTerm: 'cliente',
      serviceTerm: 'instalação, higienização de ar-condicionado e projetos de energia solar',
      actionTerm: 'solicitar orçamento técnico no WhatsApp',
    }
  }

  // 39. ASSISTÊNCIA TÉCNICA, CELULARES, INFORMÁTICA & ELETRODOMÉSTICOS
  const techRepairRegex = /assist[eê]ncia\s*t[eé]cnica|conserto\s*de\s*(?:celular|tv|geladeira|m[aá]quina)|smartphones|inform[aá]tica|computador|notebook|reparo\s*de\s*placas|troca\s*de\s*tela|iphone|eletr[oô]nica|impressora/i
  if (techRepairRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isTechRepair: true,
      nicheType: 'tech_repair',
      specialtyLabel: pickLabel('assistência técnica', techRepairRegex),
      searchedTerm: cleanSearchedNiche || 'assistência técnica',
      clientTerm: 'cliente',
      serviceTerm: 'diagnóstico rápido, troca de peças com garantia e reparos',
      actionTerm: 'solicitar orçamento imediato no WhatsApp',
    }
  }

  // 40. IMOBILIÁRIA & CORRETORES DE IMÓVEIS
  const realEstateRegex = /imob|corret(?:or|ora)?\s*de\s*im[oó]v|im[oó]veis\b|loteamento|incorporadora/i
  if (realEstateRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isRealEstate: true,
      nicheType: 'real_estate',
      specialtyLabel: pickLabel('imobiliária e corretagem de imóveis', realEstateRegex),
      searchedTerm: cleanSearchedNiche || 'imobiliária',
      clientTerm: 'cliente',
      serviceTerm: 'imóveis disponíveis para venda e locação com busca fácil',
      actionTerm: 'falar com um corretor no WhatsApp',
    }
  }

  // 41. ADVOCACIA & ESCRITÓRIOS JURÍDICOS
  const lawRegex = /advog|advocacia|jur[ií]dic|direito\b|escrit[oó]rio\s*de\s*advocacia|tabelionato|cart[oó]rio/i
  if (lawRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isLaw: true,
      nicheType: 'law',
      specialtyLabel: pickLabel('advocacia e assessoria jurídica', lawRegex),
      searchedTerm: cleanSearchedNiche || 'escritório de advocacia',
      clientTerm: 'cliente',
      serviceTerm: 'áreas de atuação jurídica e orientação especializada',
      actionTerm: 'agendar atendimento confidencial no WhatsApp',
    }
  }

  // 42. CONTABILIDADE, GESTÃO FISCAL & CORRETORA DE SEGUROS
  const accountingRegex = /cont[aá]bil|contabilidade|contador|assessoria\s*fiscal|abertura\s*de\s*empresas|corretora\s*de\s*seguros|seguros\b|consultoria\s*financeira|certificado\s*digital/i
  if (accountingRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isAccounting: true,
      nicheType: 'accounting',
      specialtyLabel: pickLabel('contabilidade e consultoria empresarial', accountingRegex),
      searchedTerm: cleanSearchedNiche || 'contabilidade',
      clientTerm: 'cliente',
      serviceTerm: 'abertura de empresas, gestão fiscal, contábil e cotações',
      actionTerm: 'falar com um especialista no WhatsApp',
    }
  }

  // 43. CONSTRUÇÃO CIVIL, REFORMAS, MATERIAL DE CONSTRUÇÃO, TINTAS & ELÉTRICA
  const constructionRegex = /constru[cç][aã]o\s*civil|material\s*de\s*constru[cç][aã]o|materiais\s*de\s*constru[cç][aã]o|construtora|empreiteira|reforma|pintura\s*residencial|casa\s*de\s*tintas|tintas\b|gesso|drywall|pedreiro|acabamento|pisos|revestimentos|el[eé]trica\s*e\s*hidr[aá]ulica|ferragens|madeireira|terraplanagem|loca[cç][aã]o\s*de\s*equipamentos|andaimes/i
  if (constructionRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isConstruction: true,
      nicheType: 'construction',
      specialtyLabel: pickLabel('construção e reformas', constructionRegex),
      searchedTerm: cleanSearchedNiche || 'construção e reformas',
      clientTerm: 'cliente',
      serviceTerm: 'materiais, obras, reformas e acabamentos',
      actionTerm: 'solicitar orçamento rápido no WhatsApp',
    }
  }

  // 44. DEDETIZADORA, CONTROLE DE PRAGAS, JARDINAGEM, PAISAGISMO & PISCINAS
  const homeServicesRegex = /dedetiza|controle\s*de\s*pragas|desentupidor|limpeza\s*de\s*fossa|caixa\s*d['’]?[aá]gua|jardinagem|paisagismo|piscina|limpeza\s*p[oó]s[- ]obra/i
  if (homeServicesRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      nicheType: 'home_services',
      specialtyLabel: pickLabel('serviços residenciais e empresariais', homeServicesRegex),
      searchedTerm: cleanSearchedNiche || 'serviços especializados',
      clientTerm: 'cliente',
      serviceTerm: 'atendimento ágil com garantia, manutenção e laudos técnicos',
      actionTerm: 'solicitar orçamento imediato no WhatsApp',
    }
  }

  // 45. GRÁFICA RÁPIDA, COMUNICAÇÃO VISUAL & FACHADAS
  const printRegex = /gr[aá]fica|comunica[cç][aã]o\s*visual|fachada\s*em\s*acm|placas|letreiro|luminoso|banner|adesivo|brinde|estamparia|serigrafia|personalizados|papelaria|copiadora/i
  if (printRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isPrintSign: true,
      nicheType: 'print_sign',
      specialtyLabel: pickLabel('gráfica e comunicação visual', printRegex),
      searchedTerm: cleanSearchedNiche || 'gráfica e comunicação visual',
      clientTerm: 'cliente',
      serviceTerm: 'impressos, fachadas, adesivos e materiais personalizados',
      actionTerm: 'enviar arquivos e pedir orçamento no WhatsApp',
    }
  }

  // 46. SEGURANÇA ELETRÔNICA, PORTÕES AUTOMÁTICOS, CFTV & CHAVEIRO
  const securityRegex = /seguran[cç]a\s*eletr[oô]nica|c[aâ]meras\s*de\s*seguran[cç]a|cftv|port[aã]o\s*eletr[oô]nico|alarme|interfonia|cerca\s*el[eé]trica|monitoramento|chaveiro|fechadura\s*digital/i
  if (securityRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isSecurity: true,
      nicheType: 'security',
      specialtyLabel: pickLabel('segurança eletrônica e automação', securityRegex),
      searchedTerm: cleanSearchedNiche || 'segurança eletrônica',
      clientTerm: 'cliente',
      serviceTerm: 'câmeras, alarmes, fechaduras digitais e automação',
      actionTerm: 'solicitar orçamento ou atendimento no WhatsApp',
    }
  }

  // 47. ESCOLAS, CURSOS, IDIOMAS, MÚSICA & EDUCAÇÃO INFANTIL
  const educationRegex = /escola\s*infantil|creche|ber[cç][aá]rio|escola\s*de\s*(?:idiomas|m[uú]sica|inform[aá]tica)|curso\s*de\s*ingl[eê]s|cursos\s*profissionalizantes|refor[cç]o\s*escolar|col[eé]gio|ensino/i
  if (educationRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isEducation: true,
      nicheType: 'education',
      specialtyLabel: pickLabel('escola e ensino', educationRegex),
      searchedTerm: cleanSearchedNiche || 'escola e cursos',
      clientTerm: 'aluno',
      serviceTerm: 'metodologia de ensino, cursos, turmas e matrículas',
      actionTerm: 'agendar visita e consultar matrículas no WhatsApp',
    }
  }

  // 48. FLORICULTURA, ARRANJOS FLORAIS, CESTAS & PRESENTES
  const floristRegex = /floricultura|flores\b|buqu[eê]|arranjos\s*florais|cestas\s*de\s*caf[eé]|presentes|brinquedos/i
  if (floristRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isFlorist: true,
      nicheType: 'florist',
      specialtyLabel: pickLabel('floricultura e presentes', floristRegex),
      searchedTerm: cleanSearchedNiche || 'floricultura',
      clientTerm: 'cliente',
      serviceTerm: 'buquês, arranjos florais, cestas e entregas no mesmo dia',
      actionTerm: 'encomendar entrega rápida no WhatsApp',
    }
  }

  // 49. LAVANDERIA & TINTURARIA
  const laundryRegex = /lavanderia|tinturaria|lavagem\s*a\s*seco|higieniza[cç][aã]o\s*de\s*roupas/i
  if (laundryRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isLaundry: true,
      nicheType: 'laundry',
      specialtyLabel: pickLabel('lavanderia', laundryRegex),
      searchedTerm: cleanSearchedNiche || 'lavanderia',
      clientTerm: 'cliente',
      serviceTerm: 'lavagem de roupas, edredons, ternos e coleta delivery',
      actionTerm: 'agendar coleta pelo WhatsApp',
    }
  }

  // 50. SAÚDE GERAL (Médicos, Clínicas Médicas, Laboratórios, Fonoaudiologia, Acupuntura)
  const healthRegex = /m[eé]dic|cl[ií]nic|sa[uú]de|fonoaudi[oó]l|acupuntur|laborat[oó]rio|exames|ultrassom|diagn[oó]stic|oftalmolog|dermatolog|pediatr|ginecolog|ortoped|cardiolog|otorrino|urolog|endocrinolog/i
  if (healthRegex.test(combined)) {
    return {
      ...BASE_SPECIALTY,
      isHealth: true,
      nicheType: 'health',
      specialtyLabel: pickLabel('clínicas médicas e saúde', healthRegex),
      searchedTerm: cleanSearchedNiche || 'clínica médica',
      clientTerm: 'paciente',
      serviceTerm: 'consultas especializadas, exames e atendimentos',
      actionTerm: 'agendar consulta ou exame no WhatsApp',
    }
  }

  // 51. ADAPTAÇÃO DINÂMICA UNIVERSAL (Usa diretamente o termo pesquisado pelo usuário ou a categoria real!)
  // JAMAIS retorna "estabelecimentos de comércio e serviços"!
  const cleanedCat = validCat
    .replace(/^(?:loja de|serviço de|comércio de|comercio de|serviços de|empresa de)\s+/i, '')
    .trim()

  const dynamicTerm = cleanSearchedNiche || cleanedCat || ''
  const finalLabel = dynamicTerm && dynamicTerm.length >= 2 ? dynamicTerm : 'empresas e negócios da região'

  return {
    ...BASE_SPECIALTY,
    nicheType: 'custom',
    specialtyLabel: finalLabel,
    searchedTerm: dynamicTerm || finalLabel,
    clientTerm: 'cliente',
    serviceTerm: dynamicTerm ? `atendimentos e opções de ${dynamicTerm}` : 'serviços, produtos e atendimento',
    actionTerm: 'pedir orçamento ou atendimento direto no WhatsApp',
  }
}

/**
 * Constrói a apresentação da persona com concordância gramatical 100% natural,
 * inserindo diretamente o nicho pesquisado/detectado (ex: "para estética automotiva", "para sorveteria").
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
  senderRole?: string,
): string {
  let activePersona = persona || 'ryan'
  if (activePersona === 'auto') {
    activePersona = (senderName || '').trim().toLowerCase() === 'ryan' ? 'ryan' : 'dev'
  }

  const name = (senderName || '').trim() || (activePersona === 'ryan' ? 'Ryan' : '')
  const hasName = name.length > 0
  const city = (senderCity || '').trim()
  const customRole = (senderRole || '').trim()

  // 1. Caso seja da MESMA CIDADE (fala que mora/é dali)
  if (isSameCity && city) {
    if (activePersona === 'rvll') {
      const rvllLocalVariants = [
        `Somos uma equipe de desenvolvimento web aqui em ${city}, criamos sites modernos e práticos com foco em pedidos e agendamentos no WhatsApp para ${specialtyLabel}.`,
        `Aqui é da equipe de desenvolvimento web em ${city}, desenvolvemos sites modernos e rápidos com foco em clientes no WhatsApp para ${specialtyLabel} aqui da cidade.`,
      ]
      return rvllLocalVariants[variationIndex % rvllLocalVariants.length]
    }

    const rolePart = customRole || 'desenvolvedor web'
    const cleanRole = rolePart.startsWith('sou ') ? rolePart.slice(4).trim() : rolePart.trim()
    const hasSitesMention = /\b(?:crio|criando|fa[cç]o|fazendo|desenvolvo|desenvolvendo)\b/i.test(cleanRole)

    const devLocalVariants = [
      hasName
        ? (hasSitesMention
            ? `Meu nome é ${name}, sou ${cleanRole} para ${specialtyLabel} aqui em ${city}.`
            : `Meu nome é ${name}, sou ${cleanRole} aqui em ${city} e crio sites modernos e práticos para ${specialtyLabel} da nossa região.`)
        : (hasSitesMention
            ? `Sou ${cleanRole} para ${specialtyLabel} aqui em ${city}.`
            : `Sou ${cleanRole} aqui em ${city} e crio sites modernos e práticos para ${specialtyLabel} da nossa região.`),
      hasName
        ? `Sou o ${name}, trabalho como desenvolvedor web aqui em ${city} criando sites focados em atrair clientes e contatos no WhatsApp para ${specialtyLabel}.`
        : `Trabalho como desenvolvedor web aqui em ${city} criando sites focados em atrair clientes e contatos no WhatsApp para ${specialtyLabel}.`,
      hasName
        ? `Meu nome é ${name}, atuo aqui de ${city} e desenvolvo sites profissionais e rápidos para ${specialtyLabel}.`
        : `Sou desenvolvedor web aqui na região e desenvolvo sites profissionais e rápidos para ${specialtyLabel}.`,
    ]
    return devLocalVariants[variationIndex % devLocalVariants.length]
  }

  // 2. Caso NÃO SEJA DA CIDADE DELE
  if (activePersona === 'rvll') {
    const rvllRemoteVariants = [
      `Somos uma equipe de desenvolvimento web especializada em criar sites modernos e rápidos para ${specialtyLabel}, focados em converter visitas do Google em clientes no WhatsApp.`,
      `Trabalhamos desenvolvendo sites modernos e práticos com foco em clientes e orçamentos diretos no WhatsApp para ${specialtyLabel}.`,
    ]
    return rvllRemoteVariants[variationIndex % rvllRemoteVariants.length]
  }

  const rolePart = customRole || 'desenvolvedor web'
  const cleanRole = rolePart.startsWith('sou ') ? rolePart.slice(4).trim() : rolePart.trim()
  const hasSitesMention = /\b(?:crio|criando|fa[cç]o|fazendo|desenvolvo|desenvolvendo)\b/i.test(cleanRole)

  const devRemoteVariants = [
    hasName
      ? (hasSitesMention
          ? `Meu nome é ${name}, sou ${cleanRole} para ${specialtyLabel}.`
          : `Meu nome é ${name}, sou ${cleanRole} e crio sites modernos e práticos para ${specialtyLabel}.`)
      : (hasSitesMention
          ? `Sou ${cleanRole} para ${specialtyLabel}.`
          : `Sou ${cleanRole} e trabalho criando sites modernos e de alto padrão para ${specialtyLabel}.`),
    hasName
      ? `Sou o ${name}, trabalho como desenvolvedor web fazendo sites focados em transformar quem busca no Google em clientes no WhatsApp para ${specialtyLabel}.`
      : `Sou desenvolvedor web e crio sites profissionais focados em transformar buscas no Google em clientes no WhatsApp para ${specialtyLabel}.`,
    hasName
      ? `Meu nome é ${name}, atuo como desenvolvedor web criando sites rápidos e otimizados para celular para ${specialtyLabel}.`
      : `Trabalho como desenvolvedor web desenvolvendo sites modernos, rápidos e adaptados para celular para ${specialtyLabel}.`,
  ]
  return devRemoteVariants[variationIndex % devRemoteVariants.length]
}

/**
 * Gera o diagnóstico e argumento de valor sob medida para o nicho real do lead e da pesquisa
 * nos 3 cenários operacionais (Instagram / Sem Site / Com Site).
 */
function buildNicheDiagnosis(
  specialty: SpecialtyInfo,
  scenario: 'instagram' | 'none' | 'website',
  location: string,
  cleanLeadName: string,
): string {
  const { nicheType, clientTerm, specialtyLabel, searchedTerm } = specialty
  const term = searchedTerm || specialtyLabel

  // ----------------------------------------------------
  // CENÁRIO A: POSSUI INSTAGRAM
  // ----------------------------------------------------
  if (scenario === 'instagram') {
    switch (nicheType) {
      case 'ice_cream':
        return `Vi o perfil de vocês no Instagram e os sorvetes, taças e açaí dão água na boca! Só que quem pesquisa por ${term} no Google ou clica no link da bio muitas vezes quer ver rapidinho o cardápio de sabores, potes, horários e um botão direto para pedir ou tirar dúvidas no WhatsApp.`
      case 'upholstery_cleaning':
        return `Vi os vídeos de higienização no Instagram de vocês, a diferença do antes e depois é impressionante! Mas quem está com o sofá ou colchão manchado e pesquisa por ${term} no Google quer saber o tempo de secagem, garantia e pedir orçamento rápido pelo WhatsApp enviando a foto do estofado.`
      case 'auto_detail':
        return `Acompanhei o perfil de vocês no Instagram e o resultado nos veículos é impecável! Só que quem procura por ${term} no Google na região quer ver uma página prática com fotos de antes e depois (polimento, vitrificação, higienização) e botão direto pro WhatsApp sem ter que esperar retorno no direct.`
      case 'car_dealership':
        return `Acompanhei as novidades do estoque no Instagram de vocês! Porém, no feed os carros vendidos e disponíveis acabam se misturando, e quem pesquisa por ${term} no Google valoriza uma página própria rápida para filtrar os veículos disponíveis, ver fotos e simular financiamento ou troca direto no WhatsApp.`
      case 'auto_mechanic':
        return `Acompanhei a oficina de vocês no Instagram e a seriedade dos serviços. Mas quem está com o carro precisando de revisão ou reparo na região e pesquisa por ${term} no Google procura uma página ágil para ver os serviços atendidos (freios, suspensão, troca de óleo, injeção) e pedir orçamento direto no WhatsApp.`
      case 'towing_transport':
        return `Vi o perfil de vocês no Instagram! Como quem precisa de ${term} geralmente está com urgência na rua ou organizando uma mudança, quem pesquisa no Google precisa de uma página que abra em 1 segundo no celular com botão direto para chamar e mandar a localização no WhatsApp.`
      case 'barber':
        return `Acompanhei a barbearia no Instagram e o padrão dos cortes tá muito diferenciado! Só que quem pesquisa por ${term} no Google muitas vezes não encontra uma página rápida com os serviços, valores e o botão direto pra agendar horário no WhatsApp sem fila.`
      case 'nails_lash':
        return `Acompanhei os trabalhos de vocês no Instagram e a qualidade das unhas, cílios e sobrancelhas é impecável! Ter uma página própria na bio e no Google para quem busca por ${term} facilita para as clientes verem os procedimentos, cuidados e já agendarem horário no WhatsApp com 1 toque.`
      case 'hair_salon':
        return `Vi o perfil de vocês no Instagram e as fotos das transformações e mechas ficaram incríveis! Só que quem busca por ${term} no Google muitas vezes quer ver a lista de procedimentos capilares e agendar horário em um clique rápido pro WhatsApp.`
      case 'aesthetics':
        return `Acompanhei o perfil de vocês no Instagram e os resultados dos procedimentos são impecáveis! Porém, como estética envolve muita confiança, quem pesquisa por ${term} no Google ou clica na bio sente falta de uma página elegante explicando cada tratamento antes de agendar a avaliação no WhatsApp.`
      case 'pilates':
        return `Acompanhei a rotina das aulas no Instagram de vocês e o cuidado com os alunos! Só que quem busca por ${term} no Google valoriza uma página clara explicando os benefícios dos aparelhos, horários das turmas e com botão para agendar uma aula experimental no WhatsApp.`
      case 'tattoo':
        return `Vi os trabalhos e artes de vocês no Instagram, muito estilo! Só que quem procura por ${term} na região pelo Google muitas vezes não encontra uma página própria com o portfólio por estilos, cuidados e botão para orçar a tattoo direto no WhatsApp.`
      case 'photo':
        return `Acompanhei os ensaios no Instagram de vocês e a qualidade das fotos é incrível! Só que no feed os trabalhos se misturam, e quem pesquisa por ${term} no Google procura uma página limpa com o portfólio separado por categorias, pacotes e botão direto pra consultar datas no WhatsApp.`
      case 'architecture':
        return `Acompanhei os projetos de vocês no Instagram e a harmonia dos ambientes é espetacular! Mas quem busca por ${term} na região pelo Google quer ver uma página institucional elegante com as obras e projetos concluídos e botão para agendar reunião no WhatsApp.`
      case 'pelvic':
        return `Acompanhei o perfil no Instagram e vi o ótimo trabalho divulgando a ${term}. Porém, como é uma área que envolve intimidade e dúvidas prévias, quem pesquisa no Google ou clica na bio sente falta de uma página acolhedora explicando os casos indicados e permitindo agendar avaliação no WhatsApp com 1 toque.`
      case 'physio':
        return `Acompanhei o perfil de vocês no Instagram e o cuidado nos tratamentos. Mas quem está com dor ou lesão e busca por ${term} no Google procura uma página rápida para ver as especialidades atendidas e marcar avaliação direta no WhatsApp.`
      case 'psychology':
        return `Acompanhei os conteúdos de vocês no Instagram e a sensibilidade dos temas abordados. Porém, quem busca por ${term} no Google ou clica na bio valoriza uma página acolhedora explicando como funcionam as sessões (presencial ou online) com botão para agendar no WhatsApp com total sigilo.`
      case 'nutrition':
        return `Acompanhei as dicas no perfil de vocês no Instagram, muito conteúdo bom! Mas quem pesquisa por ${term} no Google quer entender rapidamente como funciona a consulta e o plano alimentar em uma página prática com botão para agendar no WhatsApp.`
      case 'dental':
        return `Acompanhei a presença de vocês no Instagram e o cuidado com o sorriso dos pacientes. Mas quem pesquisa por ${term} no Google muitas vezes quer ver uma página oficial que passe segurança imediata, mostre os tratamentos (clareamento, implantes, aparelhos) e facilite agendar avaliação no WhatsApp.`
      case 'pharmacy':
        return `Vi o perfil de vocês no Instagram! Porém, quem precisa de medicamentos ou fórmulas manipuladas e pesquisa por ${term} no Google quer uma página rápida para enviar a foto da receita e pedir entrega direto pelo WhatsApp sem demora.`
      case 'optical':
        return `Acompanhei as armações e novidades no Instagram de vocês! Mas quem fez exame de vista e pesquisa por ${term} no Google procura uma página prática para ver estilos de óculos, enviar a foto da receita oftalmológica e cotar lentes direto no WhatsApp.`
      case 'health':
        return `Acompanhei a presença de vocês no Instagram. No entanto, no feed as informações se perdem rápido, e quem busca por ${term} no Google muitas vezes não encontra uma página oficial que reúna todas as especialidades, convênios/atendimentos e facilite o agendamento no WhatsApp.`
      case 'gym':
        return `Acompanhei o dia a dia dos treinos no Instagram e a energia dos alunos é ótima! Quem pesquisa por ${term} no Google valoriza muito uma página prática com as modalidades, horários e botão pra agendar aula experimental no WhatsApp.`
      case 'pet':
        return `Vi o carinho com os pets que vocês compartilham no Instagram! Porém, o tutor que pesquisa por ${term} no Google precisando de banho e tosa, vacina ou atendimento quer uma página rápida para ver os serviços e chamar direto no WhatsApp em poucos segundos.`
      case 'cabins':
        return `Acompanhei as fotos de vocês no Instagram e o lugar é um verdadeiro refúgio! Porém, quem pesquisa por ${term} no Google muitas vezes não encontra uma página oficial com a galeria das acomodações (hidro, lareira, comodidades) e o botão para consultar datas e reservar direto no WhatsApp sem taxas de plataformas.`
      case 'hospitality':
        return `Acompanhei a presença de vocês no Instagram e a estrutura transmite muito aconchego! Porém, no feed as fotos de quartos e informações se perdem rápido, e quem busca por ${term} no Google valoriza uma página oficial para ver as acomodações e reservar direto no WhatsApp.`
      case 'pizzaria':
        return `Vi o Instagram de vocês e as pizzas dão água na boca! Porém, quem procura por ${term} no Google ou clica na bio muitas vezes quer abrir um cardápio digital rápido para escolher os sabores e pedir direto no WhatsApp, sem vocês precisarem pagar taxas pesadas para apps de entrega.`
      case 'burger':
        return `Vi o Instagram de vocês e os lanches dão água na boca! Só que quem bate a fome e pesquisa por ${term} no Google ou clica na bio quer um cardápio digital rápido para ver os burgers, combos e mandar o pedido pronto no WhatsApp em segundos.`
      case 'bakery':
        return `Vi o Instagram de vocês e os bolos, doces e salgados dão água na boca! Só que quem pesquisa por ${term} no Google quer ver uma página prática com as opções de encomendas para festas, tortas, cestas e botão direto para encomendar no WhatsApp.`
      case 'food':
        return `Vi o Instagram de vocês e os pratos dão água na boca! Porém, quem procura por ${term} no Google ou clica na bio muitas vezes quer ver o cardápio atualizado e fazer o pedido ou reserva direto pelo WhatsApp de forma rápida e sem taxas de aplicativos.`
      case 'grocery':
        return `Acompanhei as ofertas e produtos fresquinhos no Instagram de vocês! Mas quem pesquisa por ${term} na região pelo Google procura uma página rápida com os destaques, encarte da semana e botão para pedir entrega direto pelo WhatsApp.`
      case 'fashion_retail':
        return `Acompanhei os looks e novidades no Instagram de vocês, peças de muito bom gosto! Porém, no feed os lançamentos somem rápido, e quem pesquisa por ${term} no Google ou clica na bio adora uma vitrine digital organizada por categorias para chamar as vendedoras no WhatsApp.`
      case 'events':
        return `Acompanhei as produções e eventos no Instagram de vocês, trabalho impecável! Só que quem está organizando uma comemoração e pesquisa por ${term} no Google quer ver fotos da estrutura, pacotes e consultar disponibilidade de datas direto pelo WhatsApp.`
      case 'marble':
        return `Vi os projetos de bancadas e acabamentos no Instagram de vocês, serviço de altíssimo padrão! Só que quem está construindo ou reformando e pesquisa por ${term} no Google procura uma página com catálogo de pedras (mármores, granitos, quartzo), obras entregues e botão para enviar medidas no WhatsApp.`
      case 'metalwork':
        return `Vi os portões e estruturas no Instagram de vocês, serviço muito bem feito! Mas quem está em obra e pesquisa por ${term} no Google quer ver fotos de serviços entregues e um botão direto para pedir orçamento e visita técnica no WhatsApp.`
      case 'furniture':
        return `Acompanhei os projetos e móveis no Instagram de vocês, acabamento de altíssimo padrão! Só que quem está mobiliando a casa e busca por ${term} no Google quer ver uma página organizada com ambientes prontos e botão para solicitar orçamento no WhatsApp.`
      case 'glazing':
        return `Vi as instalações no Instagram de vocês, muito capricho nos vidros e esquadrias! Quem está reformando e pesquisa por ${term} no Google procura uma página prática para ver fotos de boxes, espelhos e sacadas e pedir orçamento rápido com medidas no WhatsApp.`
      case 'hvac':
        return `Acompanhei as instalações no Instagram de vocês, serviço muito caprichado! Porém, quem pesquisa por ${term} no Google procura uma página rápida para ver os serviços atendidos e pedir orçamento técnico no WhatsApp sem enrolação.`
      case 'tech_repair':
        return `Acompanhei os reparos no Instagram de vocês! Só que quem está com o aparelho precisando de conserto tem pressa: pesquisa por ${term} no Google querendo ver os serviços atendidos, garantia e pedir orçamento na hora pelo WhatsApp.`
      case 'auto_school':
        return `Acompanhei a rotina das aulas e aprovações no Instagram de vocês! Porém, quem vai tirar a CNH e pesquisa por ${term} no Google busca ver as categorias, condições de parcelamento e botão direto para matrícula no WhatsApp.`
      case 'real_estate':
        return `Acompanhei os imóveis no Instagram de vocês, excelente captação! Só que quem pesquisa por ${term} na região pelo Google quer uma página ágil para filtrar imóveis de compra ou aluguel, ver fotos nítidas e chamar o corretor direto no WhatsApp.`
      case 'law':
        return `Acompanhei o conteúdo jurídico de vocês no Instagram, muito esclarecedor! No entanto, quem precisa de orientação legal e busca por ${term} no Google procura uma página institucional séria que detalhe as áreas de atuação e tenha botão de atendimento confidencial no WhatsApp.`
      case 'accounting':
        return `Acompanhei as orientações empresariais no Instagram de vocês! Mas o empresário que pesquisa por ${term} no Google busca uma página institucional clara mostrando os serviços de abertura de empresa, assessoria fiscal e botão para falar direto no WhatsApp.`
      case 'construction':
        return `Acompanhei os serviços e obras no Instagram de vocês! Quem vai construir ou reformar na região e pesquisa por ${term} no Google procura uma página sólida para ver os produtos/serviços e pedir orçamento rápido no WhatsApp.`
      case 'home_services':
        return `Vi os serviços de vocês no Instagram! Como quem procura por ${term} no Google geralmente precisa de atendimento rápido e confiável, ter uma página própria destacando a garantia do serviço e botão de orçamento imediato no WhatsApp fecha muito mais chamados.`
      case 'print_sign':
        return `Acompanhei as fachadas e materiais gráficos no Instagram de vocês, muita qualidade! Mas as empresas que pesquisam por ${term} no Google querem uma página prática com o portfólio de produtos e botão para enviar arquivos e cotar direto no WhatsApp.`
      case 'security':
        return `Acompanhei as instalações no Instagram de vocês, padrão muito profissional! Mas quem pesquisa por ${term} no Google quer ver uma página direta com as soluções atendidas e botão para chamar no WhatsApp na hora.`
      case 'education':
        return `Acompanhei o dia a dia das aulas no Instagram de vocês! Porém, quem pesquisa por ${term} no Google procura uma página clara com a metodologia, cursos oferecidos, estrutura e botão para agendar visita e matrícula no WhatsApp.`
      case 'beverage':
        return `Vi as novidades no Instagram de vocês! Só que quem pesquisa por ${term} no Google quer ver rápido as opções de bebidas, chopp ou entregas e fazer o pedido em 1 clique direto no WhatsApp.`
      case 'florist':
        return `Vi as fotos dos arranjos e cestas no Instagram de vocês, muito bom gosto! Só que quem quer presentear alguém hoje mesmo e pesquisa por ${term} no Google procura uma página prática com catálogo de opções e botão para entrega rápida no WhatsApp.`
      case 'laundry':
        return `Acompanhei o cuidado com as peças no Instagram de vocês! Mas quem pesquisa por ${term} no Google quer ver rapidamente os serviços (edredons, ternos, roupas do dia a dia) e agendar a coleta direto pelo WhatsApp.`
      default:
        return `Vi o trabalho bacana que vocês compartilham no Instagram. Mas quem pesquisa por ${term} no Google ou clica no link da bio muitas vezes não encontra uma página oficial da ${cleanLeadName} que organize todos os serviços e passe credibilidade imediata. Uma página própria limpa serve como vitrine para converter esses visitantes em ${clientTerm}s direto no WhatsApp.`
    }
  }

  // ----------------------------------------------------
  // CENÁRIO B: NÃO TEM SITE NO GOOGLE (OPORTUNIDADE DE VITRINE)
  // ----------------------------------------------------
  if (scenario === 'none') {
    switch (nicheType) {
      case 'ice_cream':
        return `Vi o espaço de vocês ${location} e a qualidade dos produtos. Como muita gente pesquisa por ${term} pelo celular no Google (principalmente nos dias quentes e finais de semana), ter uma página própria com fotos das taças, açaí, sabores e botão direto pro WhatsApp destaca muito vocês e aumenta os pedidos.`
      case 'upholstery_cleaning':
        return `Vi os serviços de vocês ${location}. Para quem pesquisa por ${term} no Google, ter uma página web direta com fotos de antes e depois de sofás, colchões e impermeabilização, além de botão para enviar foto do estofado no WhatsApp, passa total confiança e fecha orçamentos no mesmo dia.`
      case 'auto_detail':
        return `Vi o espaço de vocês ${location} e o padrão em ${term}. Ter uma página web direta no Google com fotos de antes e depois dos veículos (polimento, vitrificação, higienização) e botão de orçamento rápido no WhatsApp passa total credibilidade pra quem quer cuidar do carro na região.`
      case 'car_dealership':
        return `Vi a loja de vocês ${location}. Como quem procura por ${term} pesquisa antes pelo celular no Google, ter uma página moderna mostrando o estoque atualizado com fotos dos veículos e botão para simular financiamento ou avaliação de troca no WhatsApp gera muito mais negócios.`
      case 'auto_mechanic':
        return `Vi a oficina de vocês ${location} e a estrutura dos atendimentos. Quem pesquisa por ${term} no Google pelo celular geralmente precisa de confiança e rapidez: ter uma página direta listando os serviços mecânicos e botão de orçamento no WhatsApp traz o motorista direto para vocês.`
      case 'towing_transport':
        return `Vi o serviço de vocês ${location}. Quem pesquisa por ${term} no Google precisa de resposta imediata: ter uma página web rápida no topo da busca com botão de 1 clique para chamar e enviar localização no WhatsApp garante que o cliente feche com vocês na hora.`
      case 'barber':
        return `Vi a barbearia de vocês ${location} e o estilo dos atendimentos. Como hoje quase todo mundo procura por ${term} pelo celular no Google Maps, ter uma página simples mostrando os cortes, valores e botão de agendamento no WhatsApp evita que novos clientes da região vão para a concorrência.`
      case 'nails_lash':
        return `Vi o espaço de vocês ${location} e o capricho nos atendimentos. Para quem pesquisa por ${term} no Google, ter uma página apresentando fotos reais dos procedimentos e botão direto pro WhatsApp valoriza demais o studio e facilita novos agendamentos.`
      case 'hair_salon':
        return `Vi o salão de vocês ${location} e o padrão dos cuidados capilares. Quando novas clientes pesquisam por ${term} no Google, encontrar uma página bonita com fotos de antes e depois e botão direto pro WhatsApp facilita muito a decisão de agendar.`
      case 'aesthetics':
        return `Vi o espaço de vocês ${location} e os procedimentos que realizam. Como quem busca por ${term} no Google pesquisa bastante antes de escolher, ter uma página acolhedora explicando cada tratamento tira as dúvidas da ${clientTerm} e multiplica os agendamentos de avaliação no WhatsApp.`
      case 'pilates':
        return `Vi o studio de vocês ${location} e a proposta de bem-estar. Ter uma página acolhedora no Google para quem pesquisa por ${term}, destacando os benefícios para a saúde e botão para agendar aula experimental no WhatsApp, atrai muitos alunos novos da região.`
      case 'tattoo':
        return `Vi o studio de vocês ${location} e o estilo dos trabalhos. Ter uma página web prática para quem busca por ${term} no Google, apresentando o portfólio de tattoos/piercings e botão de orçamento no WhatsApp, atrai clientes decididos a tatuar.`
      case 'photo':
        return `Vi o trabalho de vocês ${location}. Para quem pesquisa por ${term} no Google, ter uma página dedicada organizada por estilo de ensaio com fotos em alta definição e botão para consultar pacotes no WhatsApp valoriza demais o trabalho e fecha mais datas.`
      case 'architecture':
        return `Vi a atuação de vocês ${location} e a qualidade dos projetos. Ter uma página web elegante no Google para quem busca por ${term}, reunindo o portfólio de obras e botão de contato no WhatsApp, passa total autoridade para clientes que vão construir ou reformar.`
      case 'pelvic':
        return `Vi o seu consultório ${location} e notei a atuação em ${term}. Por ser uma área que exige muita confiança, ter uma página acolhedora explicando para quais casos o tratamento é indicado tira as principais dúvidas da ${clientTerm} e facilita o agendamento no WhatsApp.`
      case 'physio':
        return `Vi o consultório de vocês ${location} e a dedicação na recuperação dos pacientes. Ter uma página clara no Google para quem busca por ${term}, apresentando as especialidades e botão de avaliação no WhatsApp, passa total segurança para quem precisa aliviar dores.`
      case 'psychology':
        return `Vi o seu atendimento em ${term} ${location}. Para quem está buscando apoio emocional no Google, encontrar uma página acolhedora apresentando sua forma de trabalho e garantindo sigilo ético facilita muito o primeiro passo para chamar no WhatsApp.`
      case 'nutrition':
        return `Vi o seu atendimento em ${term} ${location}. Ter uma página própria no Google explicando como funciona a consulta, bioimpedância e acompanhamento nutricional passa total credibilidade e atrai pacientes prontos para agendar pelo WhatsApp.`
      case 'dental':
        return `Vi o consultório de vocês ${location} e o padrão dos atendimentos. Para quem pesquisa por ${term} no Google, ter uma página oficial valoriza o nome da clínica, esclarece dúvidas sobre tratamentos e facilita o agendamento de avaliações no WhatsApp.`
      case 'pharmacy':
        return `Vi a farmácia de vocês ${location}. Hoje muita gente pesquisa por ${term} no Google querendo mandar foto de receita ou pedir entrega rápida em casa: uma página simples com botão de atendimento imediato no WhatsApp fideliza muitos clientes da região.`
      case 'optical':
        return `Vi a ótica de vocês ${location}. Quem sai do oftalmologista e pesquisa por ${term} no Google procura uma página prática para conhecer os modelos de armações, lentes e enviar foto da receita para orçamento rápido no WhatsApp.`
      case 'health':
        return `Vi o espaço de vocês ${location} e notei que quem pesquisa por ${term} no Google não encontra uma página oficial que reúna todas as especialidades e cuidados oferecidos. Um site limpo transmite confiança imediata e direciona novos ${clientTerm}s para o seu WhatsApp.`
      case 'gym':
        return `Vi o espaço de treino de vocês ${location} e a estrutura das atividades. Ter uma página web no Google para quem pesquisa por ${term}, apresentando as modalidades, horários e botão para agendar aula experimental no WhatsApp, conquista novos alunos todos os meses.`
      case 'pet':
        return `Vi o atendimento de vocês com os pets ${location}. Quando os tutores pesquisam por ${term} no Google, encontrar uma página simpática apresentando banho e tosa, cuidados veterinários e botão direto pro WhatsApp passa muita segurança.`
      case 'cabins':
        return `Vi o espaço de vocês ${location} e o charme das acomodações. Como quem pesquisa por ${term} no Google compra pela experiência visual, ter uma página dedicada com fotos reais, comodidades (lareira, hidro, vista) e botão de reserva direta no WhatsApp atrai hóspedes sem comissões de plataformas.`
      case 'hospitality':
        return `Vi o espaço de vocês ${location} e a estrutura das acomodações. Ter uma página direta no Google para quem pesquisa por ${term}, com fotos dos quartos, comodidades e botão de reserva rápida no WhatsApp, aumenta muito as reservas diretas.`
      case 'pizzaria':
        return `Vi a pizzaria de vocês ${location} e as ótimas avaliações! Quando o cliente pesquisa por ${term} no Google à noite, ter uma página própria rápida com o cardápio de sabores, combos e botão que já envia o pedido pronto no WhatsApp vende muito mais e sem taxas de aplicativos.`
      case 'burger':
        return `Vi o espaço de vocês ${location} e o sucesso dos lanches! Quem pesquisa por ${term} no Google pelo celular quer praticidade: ter uma página rápida com fotos dos burgers e botão de pedido direto no WhatsApp agiliza o atendimento e economiza taxas de apps.`
      case 'bakery':
        return `Vi o espaço de vocês ${location} e a qualidade dos produtos. Para quem pesquisa por ${term} no Google procurando bolos de festa, doces, salgados ou pães fresquinhos, uma página própria com fotos das delícias e botão de encomenda no WhatsApp vende todos os dias.`
      case 'food':
        return `Vi o espaço de vocês ${location} e a qualidade da gastronomia. Para quem pesquisa por ${term} no Google, ter uma página própria rápida com o cardápio, fotos reais e botão direto pro WhatsApp economiza tempo no atendimento e fideliza clientes.`
      case 'grocery':
        return `Vi o estabelecimento de vocês ${location}. Ter uma página simples no Google para quem busca por ${term} na região, destacando as ofertas da semana, produtos selecionados e botão de entregas pelo WhatsApp, facilita muito as compras dos clientes.`
      case 'fashion_retail':
        return `Vi a loja de vocês ${location}. Quando clientes pesquisam por ${term} no Google, encontrar uma página moderna funcionando como vitrine da coleção com botão direto para chamar as vendedoras no WhatsApp gera muitas vendas presenciais e por entrega.`
      case 'events':
        return `Vi o trabalho de vocês ${location}. Para quem pesquisa por ${term} no Google planejando uma festa ou comemoração, ter uma página reunindo fotos da estrutura, pacotes e botão para consultar datas no WhatsApp transmite total segurança.`
      case 'marble':
        return `Vi a marmoraria de vocês ${location}. Como obras em mármore, granito e quartzo têm alto valor agregado, quem pesquisa por ${term} no Google valoriza uma página com fotos de bancadas entregues, tipos de pedras e botão para orçamento rápido no WhatsApp.`
      case 'metalwork':
        return `Vi a serralheria de vocês ${location}. Quem está construindo e pesquisa por ${term} no Google procura ver fotos de portões, grades e estruturas já executadas com um botão prático para solicitar orçamento no WhatsApp.`
      case 'furniture':
        return `Vi o padrão dos móveis de vocês ${location}. Para quem pesquisa por ${term} no Google, ter uma página reunindo fotos de ambientes entregues, projetos sob medida e botão de orçamento no WhatsApp transmite total credibilidade para fechar negócio.`
      case 'glazing':
        return `Vi a vidraçaria de vocês ${location} e a qualidade dos serviços. Quem está reformando e pesquisa por ${term} no Google procura uma página com fotos de box, espelhos, esquadrias e botão de orçamento rápido no WhatsApp.`
      case 'hvac':
        return `Vi a empresa de vocês ${location}. Quando o cliente pesquisa por ${term} no Google, ter uma página apresentando os serviços de instalação, manutenção ou energia solar com botão de orçamento no WhatsApp capta o cliente no momento exato da decisão.`
      case 'tech_repair':
        return `Vi a assistência de vocês ${location} e a qualidade nos reparos. Quem pesquisa por ${term} no Google geralmente está com urgência: ter uma página direta mostrando os consertos atendidos, garantia e botão de orçamento rápido no WhatsApp traz o cliente na hora.`
      case 'auto_school':
        return `Vi a autoescola de vocês ${location}. Para quem pesquisa por ${term} no Google querendo tirar a CNH, ter uma página oficial destacando as categorias, facilidades de pagamento e botão de matrícula no WhatsApp evita perder alunos para concorrentes.`
      case 'real_estate':
        return `Vi a atuação de vocês ${location}. Para quem pesquisa por ${term} no Google, uma página moderna apresentando os imóveis em destaque e botão de contato direto com os corretores no WhatsApp transmite total confiança para compradores e locatários.`
      case 'law':
        return `Vi o escritório de vocês ${location} e a seriedade da atuação. Para quem pesquisa por ${term} no Google precisando de suporte jurídico, ter uma página institucional apresentando as áreas de atuação e botão de consulta no WhatsApp transmite total autoridade.`
      case 'accounting':
        return `Vi o escritório de vocês ${location}. Empresários e profissionais que pesquisam por ${term} no Google valorizam uma página moderna detalhando assessoria contábil, abertura de empresas e botão para falar direto com a equipe no WhatsApp.`
      case 'construction':
        return `Vi o trabalho de vocês ${location}. Para quem está em obra e pesquisa por ${term} no Google, ter uma página apresentando os produtos/serviços, obras realizadas e botão de orçamento rápido no WhatsApp passa a confiança necessária para fechar negócio.`
      case 'home_services':
        return `Vi a empresa de vocês ${location}. Quem pesquisa por ${term} no Google quer resolver o problema rápido com uma empresa de confiança: uma página própria com botão de orçamento imediato no WhatsApp converte visitantes em clientes todos os dias.`
      case 'print_sign':
        return `Vi o trabalho de vocês ${location}. Empresas e clientes que pesquisam por ${term} no Google procuram uma página prática mostrando fachadas, impressos e materiais personalizados com botão para enviar arquivos e orçar no WhatsApp.`
      case 'security':
        return `Vi a empresa de vocês ${location}. Quem pesquisa por ${term} no Google busca proteger seu patrimônio ou resolver uma urgência: ter uma página objetiva com botão de orçamento rápido no WhatsApp gera contatos qualificados na hora.`
      case 'education':
        return `Vi a instituição de vocês ${location}. Para quem pesquisa por ${term} no Google, ter uma página acolhedora apresentando os cursos, diferenciais de ensino e botão para agendar visita ou matrícula no WhatsApp passa total tranquilidade.`
      case 'beverage':
        return `Vi o estabelecimento de vocês ${location}. Quem pesquisa por ${term} no Google pelo celular quer agilidade: uma página simples destacando bebidas geladas, barris de chopp e combos com botão de pedido no WhatsApp vende muito mais.`
      case 'florist':
        return `Vi as criações de vocês ${location}. Quem pesquisa por ${term} no Google querendo surpreender alguém valoriza muito uma página exibindo fotos de buquês, arranjos e cestas com botão de entrega expressa no WhatsApp.`
      case 'laundry':
        return `Vi a lavanderia de vocês ${location}. Para quem pesquisa por ${term} no Google, uma página simples mostrando os serviços de lavagem e botão para agendar coleta pelo WhatsApp oferece a praticidade que o cliente procura.`
      default:
        return `Vi a ${cleanLeadName} ${location} e notei que quem pesquisa por ${term} no Google pelo celular ainda não encontra uma página oficial apresentando o trabalho de vocês. Ter uma página própria moderna passa credibilidade imediata, destaca seus diferenciais e direciona novos ${clientTerm}s direto para o seu WhatsApp.`
    }
  }

  // ----------------------------------------------------
  // CENÁRIO C: JÁ TEM SITE (OTIMIZAÇÃO MOBILE & CONVERSÃO)
  // ----------------------------------------------------
  switch (nicheType) {
    case 'ice_cream':
      return `Dei uma olhada na presença online de vocês ${location}. Para quem busca por ${term} pelo celular no Google, ter uma página leve e interativa mostrando os sabores, taças, açaí e botão de pedido rápido no WhatsApp aumenta muito o movimento e os pedidos diretos.`
    case 'cabins':
    case 'hospitality':
      return `Dei uma olhada na presença online de vocês ${location}. Como mais de 80% das pesquisas por ${term} é feita pelo celular, ter uma página moderna, ultrarrápida e com botão direto de consulta de datas no WhatsApp evita que o hóspede desista e aumenta as reservas diretas sem comissões.`
    case 'pizzaria':
    case 'burger':
    case 'bakery':
    case 'food':
      return `Dei uma olhada na presença online de vocês ${location}. Para quem pesquisa por ${term} pelo celular, páginas lentas ou cardápios em PDF pesados fazem o cliente desistir: uma vitrine interativa rápida que envia o pedido pronto no WhatsApp em segundos aumenta muito as vendas diretas.`
    case 'real_estate':
    case 'car_dealership':
      return `Dei uma olhada no site de vocês ${location}. Quando o cliente busca por ${term} no celular, se o carregamento das fotos for lento ele acaba voltando para o Google; uma página ultrarrápida com botão de WhatsApp integrado em cada item retém o comprador imediatamente.`
    case 'auto_detail':
    case 'auto_mechanic':
    case 'towing_transport':
      return `Dei uma olhada na presença online de vocês ${location}. Quem procura por ${term} pesquisa com pressa pelo celular: uma página ultrarrápida com fotos reais dos serviços e botão de orçamento no WhatsApp em destaque converte muito mais motoristas da região.`
    case 'dental':
    case 'aesthetics':
    case 'pelvic':
    case 'physio':
    case 'psychology':
    case 'nutrition':
    case 'health':
      return `Dei uma olhada na presença online de vocês ${location}. Para quem busca por ${term} pelo celular, a página precisa abrir na hora e transmitir acolhimento e confiança imediatos, com os tratamentos bem explicados e botão direto de agendamento no WhatsApp.`
    case 'furniture':
    case 'marble':
    case 'metalwork':
    case 'glazing':
    case 'architecture':
    case 'construction':
      return `Dei uma olhada na presença online de vocês ${location}. Para quem pesquisa por ${term}, o cliente compra pelos olhos: uma página leve e moderna no celular destacando o portfólio de serviços entregues e botão direto de orçamento no WhatsApp gera muito mais pedidos.`
    case 'law':
    case 'accounting':
      return `Dei uma olhada no site de vocês ${location}. Para quem busca por ${term} no celular, uma página institucional veloz com as áreas de atuação claras e botão de atendimento rápido no WhatsApp reforça a autoridade e multiplica os contatos qualificados.`
    default:
      return `Dei uma olhada na presença online de vocês ${location}. Hoje mais de 80% das pessoas que buscam por ${term} pesquisam pelo celular, e ter uma página moderna, ultrarrápida e focada em direcionar o visitante em 1 clique para o WhatsApp costuma dobrar a quantidade de novos ${clientTerm}s.`
  }
}

/**
 * Gera a mensagem adaptada completa para o lead, analisando:
 * - O termo exato pesquisado na barra de busca (searchQuery) + categoria e nome do lead
 * - O nome limpo e humanizado do estabelecimento ou profissional
 * - Presença digital do lead (Instagram / Sem Site / Já possui site)
 * - Cidade do lead vs cidade base
 * - Idioma, Persona e Tom
 */
export function generatePitch(
  lead: Lead,
  customSettings?: Partial<PitchSettings>,
  variationIndex = 0,
  searchQuery?: string,
): string {
  const settings: PitchSettings = {
    ...DEFAULT_PITCH_SETTINGS,
    ...(typeof window !== 'undefined' ? getStoredPitchSettings() : {}),
    ...customSettings,
  }

  const { senderName, senderCity, senderRole, persona, tone } = settings
  const recipient = extractRecipient(lead.name, lead.address)
  const isSameCity = isLeadInSameCity(lead.address, senderCity)
  const leadCity = extractCityFromAddress(lead.address)
  const location = extractLocationHook(lead.address, isSameCity, leadCity)
  const specialty = extractSpecialtyInfo(lead, searchQuery)
  const presence = lead.presence
  const hasInstagram = presence === 'social' || (lead.website && /instagram\.com/i.test(lead.website))

  // Resolve idioma final
  const lang = (settings.language && settings.language !== 'auto')
    ? settings.language
    : detectLeadLanguage(lead.address, lead.name)

  let activePersona = persona || 'ryan'
  if (activePersona === 'auto') {
    activePersona = (senderName || '').trim().toLowerCase() === 'ryan' ? 'ryan' : 'dev'
  }

  const effectiveSenderName = (senderName || '').trim() || (activePersona === 'ryan' ? 'Ryan' : '')

  // 1. JAPONÊS (日本語)
  if (lang === 'ja') {
    const greeting = `${recipient.cleanName}様、初めまして。突然のご連絡失礼いたします。`
    const presentation = activePersona === 'rvll'
      ? `Web制作・LP制作を行っておりますRvllチームと申します。地域店舗様向けに、スマートフォンで見やすく問い合わせ・予約につながる公式ページの制作を行っております。`
      : `フリーランスでWebサイト制作をしております${effectiveSenderName}と申します。スマートフォンに最適化された清潔感のあるホームページ制作を専門にしております。`
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
    const greeting = `مرحباً ${recipient.cleanName}، أتمنى أن تكونوا بخير!`
    const presentation = activePersona === 'rvll'
      ? `نحن من فريق Rvll، متخصصون في تطوير صفحات ومواقع إلكترونية سريعة تركز على تحويل الزوار إلى حجوزات واستفسارات مباشرة عبر واتساب.`
      : `اسمي ${effectiveSenderName}، مطور مواقع ويب ومصمم صفحات هبوط متقدمة تركز على نمو الأعمال والخدمات المحلية.`
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
      : `Mi nombre es ${effectiveSenderName}, soy desarrollador web y me dedico a crear páginas rápidas y prácticas para ${specialty.specialtyLabel}.`
    const diagnosisAndValue = hasInstagram
      ? `Vi su perfil en Instagram y el excelente trabajo que comparten. Sin embargo, quienes buscan en Google o entran al enlace de la bio muchas veces necesitan una página oficial donde ver todos los servicios y contactar directo por WhatsApp con 1 toque.`
      : presence === 'none'
        ? `Noté su negocio en Google y vi que aún no cuentan con un sitio web oficial. Tener una página propia brinda confianza inmediata, resuelve dudas frecuentes e impulsa que nuevos ${specialty.clientTerm}s contacten directo por WhatsApp.`
        : `Estuve viendo su presencia online. Hoy más del 80% de los clientes busca por celular, y una página moderna ultra rápida suele duplicar la cantidad de contactos recibidos.`
    const cta = '¿Tendrías interés en ver un modelo sencillo sin compromiso de cómo quedaría esta estructura para su negocio?'
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // 4. INGLÊS (English)
  if (lang === 'en') {
    const greeting = `Hi ${recipient.cleanName} team, hope you're doing well!`
    const presentation = activePersona === 'rvll'
      ? `We're from the Rvll team, specializing in clean, modern, and high-converting websites designed to turn Google visitors into booked clients.`
      : `My name is ${effectiveSenderName}, I'm a web developer creating clean, high-performance websites for ${specialty.isHealth ? 'healthcare practices' : specialty.isFood ? 'restaurants and food businesses' : 'local businesses'}.`
    const diagnosisAndValue = hasInstagram
      ? `I came across your Instagram profile and loved your work! However, customers finding you on Google or clicking your bio link often look for an official mobile page with your full services, making it easy to book or contact you directly in one tap.`
      : presence === 'none'
        ? `I noticed ${recipient.cleanName} on Google and saw that customers searching for your services don't find an official dedicated website. Having a clean, dedicated page builds immediate credibility and directs customers straight to your WhatsApp or phone.`
        : `I checked your online presence. Today, over 80% of local searches happen on mobile phones, and having an ultra-fast page optimized for instant inquiries often doubles the conversion rate.`
    const cta = 'Would you be open to checking out a quick, no-obligation preview of what this structure could look like for your business?'
    return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
  }

  // ==========================================
  // PORTUGUÊS (BRASIL) — ALTA CONVERSÃO & ZERO SPAM
  // ==========================================

  // 1. Saudação humana e calorosa com o nome identificado e limpo
  const greeting = `Olá, ${recipient.display}, tudo bem por aí?`

  // 2. Apresentação sob medida usando o nicho pesquisado/detectado diretamente no texto
  const presentation = buildPresentation(
    persona,
    senderName,
    senderCity,
    isSameCity,
    specialty.specialtyLabel,
    specialty.isHealth,
    recipient.type === 'business',
    variationIndex,
    senderRole,
  )

  // 3. Diagnóstico e Necessidade Real Específica de cada Estabelecimento
  const scenarioKey: 'instagram' | 'none' | 'website' = hasInstagram
    ? 'instagram'
    : presence === 'none'
      ? 'none'
      : 'website'

  const diagnosisAndValue = buildNicheDiagnosis(specialty, scenarioKey, location, recipient.cleanName)

  // 4. Pergunta de fechamento suave (Soft CTA)
  const ctaTarget = recipient.type === 'person' ? 'você' : `a ${recipient.cleanName}`
  const ctaTargetPronoun = recipient.type === 'person' ? 'você' : 'vocês'
  let cta = ''

  if (tone === 'preview') {
    const previewVariants = [
      `Faz sentido eu te mandar uma prévia rápida de como ficaria essa estrutura para ${ctaTargetPronoun}?`,
      `Consigo te mandar um exemplo visual de como ficaria essa página para ${ctaTargetPronoun}, tem interesse em ver?`,
    ]
    cta = previewVariants[variationIndex % previewVariants.length]
  } else if (tone === 'direct') {
    const directVariants = [
      `Teria interesse em ver um modelo simples sem compromisso nenhum?`,
      `Posso te enviar um esboço rápido de como ficaria essa página no celular para ${ctaTargetPronoun} darem uma olhada?`,
    ]
    cta = directVariants[variationIndex % directVariants.length]
  } else {
    const ctaVariants = [
      `Faz sentido eu te mandar uma prévia simples sem compromisso de como ficaria essa estrutura para ${ctaTargetPronoun}?`,
      `Se fizer sentido, posso gravar um vídeo rápido de 1 minuto mostrando como ficaria essa vitrine na prática para ${ctaTargetPronoun}.`,
      `Teria interesse em dar uma olhada em um modelo simples e sem compromisso pensado para ${ctaTarget}?`,
    ]
    cta = ctaVariants[variationIndex % ctaVariants.length]
  }

  return `${greeting}\n\n${presentation}\n\n${diagnosisAndValue}\n\n${cta}`
}
