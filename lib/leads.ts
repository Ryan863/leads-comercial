import { generatePitch, extractNicheFromQuery, restorePortugueseAccents } from './pitch-generator'

export type WebPresence = 'none' | 'social' | 'site'

export type Lead = {
  id: string
  name: string
  category: string
  searchQuery?: string
  searchedNiche?: string
  phone: string
  whatsapp: boolean
  email: string | null
  instagram?: string | null
  rating: number | null
  reviews: number
  open: boolean
  closesAt: string
  weekly_hours?: Record<string, string>
  hours_text?: string
  presence: WebPresence
  website: string | null
  address: string
}

type NichePreset = {
  match: RegExp
  category: string[]
  prefixes: string[]
  suffixes: string[]
}

const NICHES: NichePreset[] = [
  {
    match: /sorvet|gelat|a[cç]a[ií]|picol[eé]|palet|milk\s*shake/i,
    category: ['Sorveteria', 'Sorveteria & Açaí', 'Gelateria Artesanal'],
    prefixes: ['Gelato D\'Oro', 'Chiquinho', 'Dolce Vita', 'Sabor da Serra', 'Polar', 'Delícia Gelada', 'Santo Gelato', 'Vila do Açaí', 'Moresco', 'Chantilly'],
    suffixes: ['Sorvetes', 'Sorveteria', 'Gelateria', 'Sorvetes & Açaí', 'Açaí & Sorvetes'],
  },
  {
    match: /est[eé]tica\s*(?:automotiv|veicular|auto)|detail|polimento|vitrifica|lava\s*jato|lava\s*car|lavacar|lava[- ]r[aá]pido|martelinho/i,
    category: ['Estética Automotiva', 'Auto Detailing & Polimento', 'Estética Veicular'],
    prefixes: ['Studio Auto', 'Prime Detail', 'Elite Garage', 'Concept Car', 'Precision', 'Diamond', 'Maxx Detail', 'Pro Auto', 'Brilho Car', 'Apex'],
    suffixes: ['Estética Automotiva', 'Car Detail', 'Auto Spa', 'Detailing', 'Polimento & Estética'],
  },
  {
    match: /mec[aâ]nic|oficina|auto\s*center|centro\s*automotivo|auto\s*el[eé]trica|borracharia|funilaria|freios|suspens[aã]o/i,
    category: ['Oficina Mecânica', 'Centro Automotivo', 'Auto Center'],
    prefixes: ['Auto Center', 'Oficina', 'Mecânica', 'Rota', 'Torque', 'Motor Prime', 'Aliança', 'Precisão', 'Brasil Auto', ' Líder'],
    suffixes: ['Mecânica Automotiva', 'Auto Center', 'Serviços Automotivos', 'Centro Automotivo', 'Oficina Especializada'],
  },
  {
    match: /pizz|forneria/i,
    category: ['Pizzaria', 'Pizzaria & Forneria', 'Pizzaria Delivery'],
    prefixes: ['Bella Napoli', 'Ponto Central', 'Forno di Casa', 'Don Corleone', 'Mamma Mia', 'La Piazza', 'Vulcano', 'Sabor da Serra', 'Dom Pepe', 'Toscana'],
    suffixes: ['Pizzaria', 'Pizzaria & Forneria', 'Pizza Express', 'Pizzas Artesanais'],
  },
  {
    match: /hamburg|burger|lanche|dog/i,
    category: ['Hamburgueria', 'Hamburgueria Artesanal', 'Lanchonete & Delivery'],
    prefixes: ['Brutus', 'Texas', 'Smash', 'Urban', 'Garage', 'Brazuca', 'Dom', 'Viking', 'old School', 'Chef'],
    suffixes: ['Burger', 'Hamburgueria', 'Burger & Grill', 'Burgers Artesanais'],
  },
  {
    match: /padaria|confeitaria|doceria|bolo|panificadora|caf[eé]/i,
    category: ['Padaria & Confeitaria', 'Confeitaria Artesanal', 'Cafeteria & Doceria'],
    prefixes: ['Pão Dourado', 'Doce Sabor', 'Trigo Real', 'Villa do Pão', 'Delícias da Serra', 'Santa Clara', 'Aroma', 'Grão Nobre', 'Casa do Pão', 'Doce Arte'],
    suffixes: ['Padaria & Confeitaria', 'Panificadora', 'Confeitaria', 'Cafeteria & Doces'],
  },
  {
    match: /restaur|churrasc|sushi|gastronomia|bistr[oô]|marmit/i,
    category: ['Restaurante', 'Restaurante & Gastronomia', 'Churrascaria & Grill'],
    prefixes: ['Sabor & Arte', 'Cantina', 'Recanto', 'Reserva', 'Fogão da Serra', 'Vila Gastronômica', 'Tempero Nobre', 'Casa Nova', 'Bela Vista', 'Imperial'],
    suffixes: ['Restaurante', 'Gastronomia', 'Grill & Restaurante', 'Cozinha Artesanal'],
  },
  {
    match: /barbearia|barber|barbeiro/i,
    category: ['Barbearia', 'Barber Shop'],
    prefixes: ['Navalha', 'Dom', 'Old Jack', 'Lenhador', 'Clube da Barba', 'Gentlemen', 'Imperador', 'Sr. Bigode', 'Viking', 'Studio'],
    suffixes: ['Barbearia', 'Barber Shop', 'Barber Club', 'Cortes & Barba'],
  },
  {
    match: /sal[aã]o|cabeleir|hair|beleza|unha|manicure|lash|c[ií]lios|sobrancelha/i,
    category: ['Salão de Beleza', 'Studio de Beleza'],
    prefixes: ['Studio Bellas', 'Espaço Charm', 'La Belle', 'Glamour', 'Essence', 'Divas', 'Lumière', 'Bela Face', 'Aurea', 'Sublime'],
    suffixes: ['Salão de Beleza', 'Beauty Studio', 'Hair & Nails', 'Estética & Beleza'],
  },
  {
    match: /est[eé]tica|harmoniza|spa|depila|massoterap|limpeza de pele/i,
    category: ['Clínica de Estética', 'Estética Avançada & Spa'],
    prefixes: ['Renova', 'Pele & Corpo', 'Plenitude', 'DermaPrime', 'Essencial', 'Aura', 'Lumus', 'Bella Pelle', 'Vita', 'Harmonia'],
    suffixes: ['Clínica de Estética', 'Estética Avançada', 'Spa & Estética', 'Harmonização'],
  },
  {
    match: /odont|dent|sorriso|ortodont/i,
    category: ['Clínica Odontológica', 'Consultório Odontológico'],
    prefixes: ['Sorriso', 'OdontoPrime', 'Dental Center', 'Orthos', 'Oral Mais', 'Sorrir Bem', 'Implante Care', 'Brilho Dental', 'Vita Odonto', 'Unique'],
    suffixes: ['Odontologia', 'Clínica Odontológica', 'Centro Odontológico', 'Odontologia Integrada'],
  },
  {
    match: /cl[ií]nic|m[eé]dic|fisioter|psic[oó]l|nutri|sa[uú]de/i,
    category: ['Clínica de Saúde', 'Consultório Especializado'],
    prefixes: ['Vida Plena', 'Bem Estar', 'Santa Clara', 'Saúde Total', 'Clinimed', 'Viva Mais', 'Integrar', 'Equilíbrio', 'Vitalis', 'Aliança'],
    suffixes: ['Clínica', 'Saúde Integrada', 'Consultórios', 'Centro de Saúde'],
  },
  {
    match: /pet|veterin[aá]r|banho e tosa/i,
    category: ['Pet Shop & Veterinária', 'Clínica Veterinária'],
    prefixes: ['Amigo Fiel', 'Mundo Pet', 'Patas & Pelos', 'Bicho Mimado', 'VetCare', 'Alegria Pet', 'Reino Animal', 'Cão & Gato', 'Vida Pet', ' Villa Pet'],
    suffixes: ['Pet Shop', 'Clínica Veterinária', 'Pet Center', 'Banho & Tosa'],
  },
  {
    match: /imobil|corretor|im[oó]veis/i,
    category: ['Imobiliária', 'Corretora de Imóveis'],
    prefixes: ['Lar Ideal', 'Casa Nova', 'Morada', 'Prime', 'Horizonte', 'Chave de Ouro', 'Patrimônio', 'Aliança', 'Conquista', 'Realize'],
    suffixes: ['Imóveis', 'Imobiliária', 'Negócios Imobiliários', 'Corretora'],
  },
  {
    match: /cabana|chal[eé]|pousada|hotel|hostel|glamping|resort|ref[uú]gio|hospedag/i,
    category: ['Cabana & Chalé', 'Pousada', 'Hospedagem'],
    prefixes: ['Cabana', 'Chalés', 'Refúgio', 'Recanto', 'Pousada', 'Morada', 'Vale', 'Mirante', 'Bela Vista', 'Serra Viva'],
    suffixes: ['da Serra', 'do Vale', 'das Araucárias', 'do Lago', 'Encantado', 'Monte Belo', 'Panorama', 'da Mata'],
  },
]

const DDD: Record<string, string> = {
  // Bahia
  'salvador': '71', 'lauro de freitas': '71', 'camaçari': '71', 'camacari': '71', 'simões filho': '71', 'simoes filho': '71',
  'feira de santana': '75', 'alagoinhas': '75', 'santo antônio de jesus': '75',
  'ilhéus': '73', 'ilheus': '73', 'itabuna': '73', 'porto seguro': '73', 'jequié': '73', 'jequie': '73', 'canavieiras': '73',
  'vitória da conquista': '77', 'vitoria da conquista': '77', 'barreiras': '77',
  'juazeiro': '74', 'jacobina': '74',
  'ba': '71', 'bahia': '71',
  // Santa Catarina
  'sc': '49', 'videira': '49', 'caçador': '49', 'cacador': '49', 'chapecó': '49', 'chapeco': '49', 'fraiburgo': '49', 'joaçaba': '49', 'joacaba': '49', 'curitibanos': '49', 'lages': '49',
  'florianópolis': '48', 'florianopolis': '48', 'floripa': '48', 'criciúma': '48', 'tubarão': '48', 'joinville': '47', 'blumenau': '47', 'itajaí': '47', 'balneário camboriú': '47',
  // São Paulo
  'sp': '11', 'são paulo': '11', 'sao paulo': '11', 'moema': '11', 'campinas': '19', 'santos': '13', 'ribeirão preto': '16', 'sorocaba': '15',
  // Rio de Janeiro
  'rj': '21', 'rio de janeiro': '21', 'niterói': '21',
  // Paraná
  'pr': '41', 'curitiba': '41', 'londrina': '43', 'maringá': '44', 'cascavel': '45', 'foz do iguaçu': '45',
  // Rio Grande do Sul
  'rs': '51', 'porto alegre': '51', 'caxias do sul': '54', 'gramado': '54', 'passo fundo': '54',
  // Minas Gerais
  'mg': '31', 'bh': '31', 'belo horizonte': '31', 'uberlândia': '34', 'juiz de fora': '32',
}

const STREETS = ['Rua XV de Novembro', 'Av. Dom Pedro II', 'Av. Brasil', 'Rua das Flores', 'Av. Santos Dumont', 'Rua Sete de Setembro', 'Rua Marechal Deodoro', 'Av. Getúlio Vargas']

function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let s = seed || 1
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function slug(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function parseCity(query: string) {
  const parts = query.split(/\s+(?:em|in|en|at)\s+/i)
  let raw = (parts[1] ?? (query.includes('-') ? query.split('-')[1] : (query.includes(',') ? query.split(',')[1] : 'Videira'))).trim()
  raw = raw.replace(/[-,\s]+\b(ba|bahia|sc|sp|rj|pr|rs|mg|ce|pe|df|fl|ca|ny|tx|nsw|vic|qld)\b.*$/i, '').trim()
  return raw || 'Videira'
}

function pickDDD(city: string) {
  const lower = city.toLowerCase()
  for (const key of Object.keys(DDD)) {
    if (lower.includes(key)) return DDD[key]
  }
  return String(11 + (hash(lower) % 80)).padStart(2, '0')
}

function capitalizeWords(text: string): string {
  const smallWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'a', 'o'])
  return text
    .split(/\s+/)
    .map((w, idx) => {
      const lower = w.toLowerCase()
      if (idx > 0 && smallWords.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function generateLeads(query: string, count: number, countryCode?: string): Lead[] {
  const rawNiche = extractNicheFromQuery(query) || 'Comércio Local'
  const formattedNiche = capitalizeWords(restorePortugueseAccents(rawNiche))

  const matchedPreset = NICHES.find((n) => n.match.test(rawNiche) || n.match.test(query))
  const preset: NichePreset = matchedPreset ?? {
    match: /.*/,
    category: [formattedNiche],
    prefixes: ['Prime', 'Central', 'Nova Era', 'Estrela', 'Ponto Certo', 'Real', ' Destaque', 'Império', 'Elite', 'Aliança'],
    suffixes: [formattedNiche],
  }

  const city = parseCity(query)
  const ddd = pickDDD(city)
  const rand = rng(hash(query.toLowerCase() + count))
  const usedNames = new Set<string>()
  const usedPhones = new Set<string>()
  const leads: Lead[] = []

  const c = (countryCode || '').toUpperCase()
  const isBR = c === 'BR'
  const isAE = !isBR && (c === 'AE' || /\b(dubai|emirados|uae|abu dhabi|sharjah)\b/i.test(query))
  const isJP = !isBR && (c === 'JP' || /\b(japan|japão|tokyo|osaka|kyoto|yokohama|shibuya)\b/i.test(query))
  const isUS = !isBR && (c === 'US' || /\b(miami|new york|orlando|florida|california|texas|usa|eua|fl|ca|ny|tx)\b/i.test(query))
  const isAU = !isBR && (c === 'AU' || /\b(sydney|melbourne|brisbane|australia|austrália|nsw|vic|qld)\b/i.test(query))
  const isUK = !isBR && (c === 'GB' || c === 'UK' || /\b(london|manchester|uk|united kingdom|england)\b/i.test(query))
  const isES = !isBR && (c === 'ES' || /\b(madrid|barcelona|valencia|espanha|spain)\b/i.test(query))
  const isIT = !isBR && (c === 'IT' || /\b(italia|itália|italy|roma|milano)\b/i.test(query))
  const isDE = !isBR && (c === 'DE' || /\b(alemanha|germany|berlin|munich)\b/i.test(query))
  const isFR = !isBR && (c === 'FR' || /\b(franca|frança|france|paris|lyon)\b/i.test(query))
  const isCH = !isBR && (c === 'CH' || /\b(suica|suíça|switzerland|zurich|geneva)\b/i.test(query))

  const jpPrefixes = ['Sakura', 'Tokyo Craft', 'Komorebi', 'Fuji', 'Kyoto', 'Ginza', 'Shibuya', 'Hikari', 'Zenith', 'Asahi']
  const jpSuffixes = ['Studio', 'Clinic', 'Cafe & Bar', 'Dental', 'Salon', 'Kitchen', 'Design', 'Consulting']

  const uaePrefixes = ['Emirates', 'Dubai Prime', 'Al Noor', 'Gulf Horizon', 'Crescent', 'Burj', 'Palm', 'Oasis', 'Falcon', 'Marina']
  const uaeSuffixes = ['Dental Clinic', 'Luxury Spa', 'Business Solutions', 'Restaurant & Cafe', 'Auto Care', 'Wellness Center']

  for (let i = 0; i < count; i++) {
    let name = ''
    for (let tries = 0; tries < 25; tries++) {
      if (isJP) {
        const p = jpPrefixes[Math.floor(rand() * jpPrefixes.length)]
        const s = jpSuffixes[Math.floor(rand() * jpSuffixes.length)]
        name = `${p} ${s}`
      } else if (isAE) {
        const p = uaePrefixes[Math.floor(rand() * uaePrefixes.length)]
        const s = uaeSuffixes[Math.floor(rand() * uaeSuffixes.length)]
        name = `${p} ${s}`
      } else {
        const p = preset.prefixes[Math.floor(rand() * preset.prefixes.length)].trim()
        const s = preset.suffixes[Math.floor(rand() * preset.suffixes.length)].trim()
        name = p.toLowerCase().includes(s.toLowerCase()) ? p : `${p} ${s}`
      }
      if (!usedNames.has(name)) break
    }
    usedNames.add(name)

    const roll = rand()
    const presence: WebPresence = roll < 0.4 ? 'none' : roll < 0.75 ? 'social' : 'site'
    const handle = slug(name)

    let phone = ''
    for (let tries = 0; tries < 25; tries++) {
      if (isAE) {
        const p1 = Math.floor(100 + rand() * 890)
        const p2 = Math.floor(1000 + rand() * 8990)
        phone = rand() > 0.5 ? `+971 4 ${p1} ${p2}` : `+971 50 ${p1} ${p2}`
      } else if (isJP) {
        const p1 = Math.floor(1000 + rand() * 8990)
        const p2 = Math.floor(1000 + rand() * 8990)
        phone = `+81 3 ${p1}-${p2}`
      } else if (isUS) {
        const p1 = Math.floor(200 + rand() * 790)
        const p2 = Math.floor(100 + rand() * 890)
        const p3 = Math.floor(1000 + rand() * 8990)
        phone = `+1 (${p1}) ${p2}-${p3}`
      } else if (isAU) {
        const p1 = Math.floor(1000 + rand() * 8990)
        const p2 = Math.floor(1000 + rand() * 8990)
        phone = `+61 2 ${p1} ${p2}`
      } else if (isUK) {
        const p1 = Math.floor(1000 + rand() * 8990)
        const p2 = Math.floor(1000 + rand() * 8990)
        phone = `+44 20 ${p1} ${p2}`
      } else if (isES) {
        const p1 = Math.floor(100 + rand() * 890)
        const p2 = Math.floor(100 + rand() * 890)
        phone = `+34 91${p1} ${p2}`
      } else if (isIT) {
        const p1 = Math.floor(1000 + rand() * 8990)
        const p2 = Math.floor(100 + rand() * 890)
        phone = `+39 06 ${p1} ${p2}`
      } else if (isDE) {
        const p1 = Math.floor(1000 + rand() * 8990)
        const p2 = Math.floor(100 + rand() * 890)
        phone = `+49 30 ${p1} ${p2}`
      } else if (isFR) {
        const p1 = Math.floor(10 + rand() * 89)
        const p2 = Math.floor(10 + rand() * 89)
        phone = `+33 1 ${p1} ${p2} 40 50`
      } else if (isCH) {
        const p1 = Math.floor(100 + rand() * 890)
        const p2 = Math.floor(10 + rand() * 89)
        phone = `+41 44 ${p1} ${p2} 70`
      } else {
        const p1 = Math.floor(8100 + rand() * 1890)
        const p2 = Math.floor(1000 + rand() * 8990)
        phone = `(${ddd}) 9${p1}-${p2}`
      }
      if (!usedPhones.has(phone)) break
    }
    usedPhones.add(phone)

    const closeHour = 18 + Math.floor(rand() * 4)

    const address = isAE
      ? `Sheikh Zayed Road, Trade Centre, Dubai, Emirados Árabes Unidos`
      : isJP
        ? `${Math.floor(1 + rand() * 5)}-chome, Shibuya, Tokyo 150-0002, Japan`
        : isUS
          ? `${Math.floor(100 + rand() * 8900)} Biscayne Blvd, ${city}, FL, Estados Unidos`
          : isAU
            ? `${Math.floor(10 + rand() * 890)} George St, ${city} NSW, Austrália`
            : isUK
              ? `${Math.floor(10 + rand() * 490)} Oxford St, ${city}, United Kingdom`
              : isES
                ? `Calle Gran Vía, ${Math.floor(10 + rand() * 80)}, 28013 Madrid, España`
                : isIT
                  ? `Via del Corso, ${Math.floor(10 + rand() * 80)}, 00186 Roma, Italia`
                  : isDE
                    ? `Friedrichstraße ${Math.floor(10 + rand() * 80)}, 10117 Berlin, Deutschland`
                    : isFR
                      ? `Avenue des Champs-Élysées, ${Math.floor(10 + rand() * 80)}, 75008 Paris, France`
                      : isCH
                        ? `Bahnhofstrasse ${Math.floor(10 + rand() * 80)}, 8001 Zürich, Switzerland`
                        : `${STREETS[Math.floor(rand() * STREETS.length)]}, ${Math.floor(10 + rand() * 1900)} — ${city}`

    leads.push({
      id: `${handle}-${i}`,
      name,
      category: isJP ? 'Local Business & Studio' : preset.category[Math.floor(rand() * preset.category.length)],
      searchQuery: query,
      searchedNiche: formattedNiche,
      phone,
      whatsapp: Boolean(phone),
      email: presence === 'none' && rand() > 0.5 ? null : `contato@${handle.slice(0, 18)}.com.br`,
      rating: Math.round((4.2 + rand() * 0.8) * 10) / 10,
      reviews: Math.floor(20 + rand() * 400),
      open: rand() > 0.25,
      closesAt: `${closeHour}:${rand() > 0.5 ? '30' : '00'}`,
      presence,
      website:
        presence === 'site'
          ? `https://www.${handle.slice(0, 18)}.com.br`
          : presence === 'social'
            ? `https://instagram.com/${handle.slice(0, 22)}`
            : null,
      instagram:
        presence === 'social'
          ? `https://instagram.com/${handle.slice(0, 22)}`
          : rand() > 0.4
            ? `https://instagram.com/${handle.slice(0, 20)}`
            : null,
      address,
    })
  }

  return leads
}

export function whatsappLink(lead: Lead, customMessage?: string) {
  let digits = lead.phone.replace(/\D/g, '')
  if (!lead.phone.startsWith('+') && !digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`
  }
  const message = customMessage ?? generatePitch(lead, undefined, 0, lead.searchQuery)
  const text = encodeURIComponent(message)
  return `https://wa.me/${digits}?text=${text}`
}

export function emailLink(lead: Lead, customMessage?: string) {
  if (!lead.email) return null
  const subject = `Oportunidade e Presença Digital — ${lead.name}`
  const body = customMessage ?? generatePitch(lead, undefined, 0, lead.searchQuery)
  return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function instagramLink(lead: Lead): string | null {
  if (lead.instagram) return lead.instagram
  if (lead.website && /instagram\.com/i.test(lead.website)) return lead.website
  if (lead.presence === 'social' && lead.website) return lead.website
  return null
}

export function googleContactSearchLink(lead: Lead): string {
  const query = `${lead.name} ${lead.address} contato telefone whatsapp instagram`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export function mapsLink(lead: Lead) {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${lead.name} ${lead.address}`)}`
}

export function initials(name: string) {
  return name.replace(/[^A-Za-zÀ-ú ]/g, '').slice(0, 2).toUpperCase()
}
