import { generatePitch } from './pitch-generator'

export type WebPresence = 'none' | 'social' | 'site'

export type Lead = {
  id: string
  name: string
  category: string
  phone: string
  whatsapp: boolean
  email: string | null
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
    match: /pizz/i,
    category: ['Pizzaria', 'Restaurante & Delivery', 'Pizzaria Delivery'],
    prefixes: ['Bella Napoli', 'Ponto Central', 'Forno di Casa', 'Don Corleone', 'Mamma Mia', 'La Piazza', 'Vulcano', 'Sabor da Serra', 'Bom Gosto', 'Dom Pepe', 'Toscana', 'Lenha Viva'],
    suffixes: ['Pizzaria', 'Pizzaria & Forneria', 'Pizza Express', 'Hamburgueria & Pizza', 'Pizzas Artesanais'],
  },
  {
    match: /cl[ií]nic|odont|dent|m[eé]dic/i,
    category: ['Clínica Odontológica', 'Clínica Médica', 'Consultório'],
    prefixes: ['Sorriso', 'Vida Plena', 'OdontoPrime', 'Bem Estar', 'Santa Clara', 'Dental Center', 'Saúde Total', 'Clinimed', 'Orthos', 'Viva Mais'],
    suffixes: ['Clínica', 'Odontologia', 'Centro Médico', 'Saúde Integrada', 'Consultórios'],
  },
  {
    match: /imobil/i,
    category: ['Imobiliária', 'Corretora de Imóveis'],
    prefixes: ['Lar Ideal', 'Casa Nova', 'Ilha', 'Mar Azul', 'Morada', 'Prime', 'Horizonte', 'Litoral', 'Chave de Ouro', 'Vista Mar'],
    suffixes: ['Imóveis', 'Imobiliária', 'Negócios Imobiliários', 'Corretora'],
  },
  {
    match: /mec[aâ]n|auto|oficina|est[eé]tica|lava/i,
    category: ['Estética Automotiva', 'Auto Spa & Detailing', 'Centro Automotivo', 'Oficina Mecânica'],
    prefixes: ['Studio Auto', 'Prime Detail', 'Elite Garage', 'Concept Car', 'Precision', 'Turbo', 'Rota', 'Speed', 'Diamond', 'Maxx Detail'],
    suffixes: ['Estética Automotiva', 'Car Detail', 'Auto Spa', 'Centro Automotivo', 'Detailing'],
  },
]

const GENERIC: NichePreset = {
  match: /.*/,
  category: ['Comércio Local', 'Serviços', 'Empresa Local'],
  prefixes: ['Central', 'Nova Era', 'Estrela', 'Ponto Certo', 'Primavera', 'União', 'Real', 'Atlântico', 'Bom Jesus', 'Avenida'],
  suffixes: ['& Cia', 'Comércio', 'Serviços', 'Store', 'Express'],
}

const DDD: Record<string, string> = {
  // Bahia
  'salvador': '71', 'lauro de freitas': '71', 'camaçari': '71', 'camacari': '71', 'simões filho': '71', 'simoes filho': '71',
  'feira de santana': '75', 'alagoinhas': '75', 'santo antônio de jesus': '75',
  'ilhéus': '73', 'ilheus': '73', 'itabuna': '73', 'porto seguro': '73', 'jequié': '73', 'jequie': '73', 'canavieiras': '73',
  'vitória da conquista': '77', 'vitoria da conquista': '77', 'barreiras': '77',
  'juazeiro': '74', 'jacobina': '74',
  'ba': '71', 'bahia': '71',
  // Santa Catarina
  'sc': '49', 'videira': '49', 'caçador': '49', 'cacador': '49', 'chapecó': '49', 'chapeco': '49',
  'florianópolis': '48', 'florianopolis': '48', 'floripa': '48', 'joinville': '47', 'blumenau': '47',
  // São Paulo
  'sp': '11', 'são paulo': '11', 'sao paulo': '11', 'moema': '11', 'campinas': '19', 'santos': '13',
  // Rio de Janeiro
  'rj': '21', 'rio de janeiro': '21',
  // Paraná
  'pr': '41', 'curitiba': '41', 'londrina': '43', 'maringá': '44',
  // Rio Grande do Sul
  'rs': '51', 'porto alegre': '51', 'caxias do sul': '54',
  // Minas Gerais
  'mg': '31', 'bh': '31', 'belo horizonte': '31', 'uberlândia': '34',
}

const STREETS = ['Rua XV de Novembro', 'Av. Brasil', 'Rua das Flores', 'Av. Santos Dumont', 'Rua Sete de Setembro', 'Rua Marechal Deodoro', 'Av. Getúlio Vargas', 'Av. Central']

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
  let raw = (parts[1] ?? (query.includes('-') ? query.split('-')[1] : (query.includes(',') ? query.split(',')[1] : 'Sua Cidade'))).trim()
  raw = raw.replace(/[-,\s]+\b(ba|bahia|sc|sp|rj|pr|rs|mg|ce|pe|df|fl|ca|ny|tx|nsw|vic|qld)\b.*$/i, '').trim()
  return raw || 'Sua Cidade'
}

function pickDDD(city: string) {
  const lower = city.toLowerCase()
  for (const key of Object.keys(DDD)) {
    if (lower.includes(key)) return DDD[key]
  }
  return String(11 + (hash(lower) % 80)).padStart(2, '0')
}

export function generateLeads(query: string, count: number): Lead[] {
  const preset = NICHES.find((n) => n.match.test(query)) ?? GENERIC
  const city = parseCity(query)
  const ddd = pickDDD(city)
  const rand = rng(hash(query.toLowerCase() + count))
  const usedNames = new Set<string>()
  const usedPhones = new Set<string>()
  const leads: Lead[] = []

  const isUS = /miami|new york|orlando|florida|california|texas|usa|eua|fl|ca|ny|tx/i.test(query)
  const isAU = /sydney|melbourne|brisbane|australia|austrália|nsw|vic|qld/i.test(query)
  const isUK = /london|manchester|uk|united kingdom|england/i.test(query)

  for (let i = 0; i < count; i++) {
    let name = ''
    for (let tries = 0; tries < 25; tries++) {
      const p = preset.prefixes[Math.floor(rand() * preset.prefixes.length)]
      const s = preset.suffixes[Math.floor(rand() * preset.suffixes.length)]
      name = `${p} ${s}`
      if (!usedNames.has(name)) break
    }
    usedNames.add(name)

    const roll = rand()
    const presence: WebPresence = roll < 0.4 ? 'none' : roll < 0.75 ? 'social' : 'site'
    const handle = slug(name)

    // Formatação de telefone conforme a região
    let phone = ''
    for (let tries = 0; tries < 25; tries++) {
      if (isUS) {
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
      } else {
        const p1 = Math.floor(8100 + rand() * 1890)
        const p2 = Math.floor(1000 + rand() * 8990)
        phone = `(${ddd}) 9${p1}-${p2}`
      }
      if (!usedPhones.has(phone)) break
    }
    usedPhones.add(phone)

    const closeHour = 18 + Math.floor(rand() * 4)

    const address = isUS
      ? `${Math.floor(100 + rand() * 8900)} Biscayne Blvd, ${city}, FL, Estados Unidos`
      : isAU
        ? `${Math.floor(10 + rand() * 890)} George St, ${city} NSW, Austrália`
        : isUK
          ? `${Math.floor(10 + rand() * 490)} Oxford St, ${city}, United Kingdom`
          : `${STREETS[Math.floor(rand() * STREETS.length)]}, ${Math.floor(10 + rand() * 1900)} — ${city}`

    leads.push({
      id: `${handle}-${i}`,
      name,
      category: preset.category[Math.floor(rand() * preset.category.length)],
      phone,
      whatsapp: Boolean(phone),
      email: presence === 'none' && rand() > 0.5 ? null : `contact@${handle.slice(0, 18)}.com`,
      rating: Math.round((4.2 + rand() * 0.8) * 10) / 10,
      reviews: Math.floor(20 + rand() * 400),
      open: rand() > 0.25,
      closesAt: `${closeHour}:${rand() > 0.5 ? '30' : '00'}`,
      presence,
      website:
        presence === 'site'
          ? `https://www.${handle.slice(0, 18)}.com`
          : presence === 'social'
            ? `https://instagram.com/${handle.slice(0, 22)}`
            : null,
      address,
    })
  }

  return leads
}

export function whatsappLink(lead: Lead, customMessage?: string) {
  let digits = lead.phone.replace(/\D/g, '')
  // Para telefones brasileiros sem o DDI 55 explícito (10 ou 11 dígitos)
  if (!lead.phone.startsWith('+') && !digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`
  }
  const message = customMessage ?? generatePitch(lead)
  const text = encodeURIComponent(message)
  return `https://wa.me/${digits}?text=${text}`
}

export function mapsLink(lead: Lead) {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${lead.name} ${lead.address}`)}`
}

export function initials(name: string) {
  return name.replace(/[^A-Za-zÀ-ú ]/g, '').slice(0, 2).toUpperCase()
}
