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
    match: /mec[aâ]n|auto|oficina/i,
    category: ['Oficina Mecânica', 'Auto Center', 'Centro Automotivo'],
    prefixes: ['Turbo', 'Pit Stop', 'Motor Forte', 'Garage', 'Rota', 'Precision', 'Box 10', 'Torque', 'Roda Viva', 'Speed'],
    suffixes: ['Auto Center', 'Mecânica', 'Car Service', 'Oficina', 'Centro Automotivo'],
  },
]

const GENERIC: NichePreset = {
  match: /.*/,
  category: ['Comércio Local', 'Serviços', 'Empresa Local'],
  prefixes: ['Central', 'Nova Era', 'Estrela', 'Ponto Certo', 'Primavera', 'União', 'Real', 'Atlântico', 'Bom Jesus', 'Avenida'],
  suffixes: ['& Cia', 'Comércio', 'Serviços', 'Store', 'Express'],
}

const DDD: Record<string, string> = {
  sc: '49', sp: '11', floripa: '48', 'florianópolis': '48', curitiba: '41', pr: '41', rj: '21', bh: '31', mg: '31', rs: '51', 'porto alegre': '51',
}

const STREETS = ['Rua XV de Novembro', 'Av. Brasil', 'Rua das Flores', 'Av. Santos Dumont', 'Rua Sete de Setembro', 'Rua Marechal Deodoro', 'Av. Getúlio Vargas']

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
  const parts = query.split(/\sem\s/i)
  return (parts[1] ?? 'Sua Cidade').trim()
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
  const used = new Set<string>()
  const leads: Lead[] = []

  for (let i = 0; i < count; i++) {
    let name = ''
    for (let tries = 0; tries < 20; tries++) {
      const p = preset.prefixes[Math.floor(rand() * preset.prefixes.length)]
      const s = preset.suffixes[Math.floor(rand() * preset.suffixes.length)]
      name = `${p} ${s}`
      if (!used.has(name)) break
    }
    used.add(name)

    const roll = rand()
    const presence: WebPresence = roll < 0.4 ? 'none' : roll < 0.75 ? 'social' : 'site'
    const handle = slug(name)
    const phone = `(${ddd}) 9${Math.floor(1000 + rand() * 8999)}-${Math.floor(1000 + rand() * 8999)}`
    const closeHour = 18 + Math.floor(rand() * 6)

    leads.push({
      id: `${handle}-${i}`,
      name,
      category: preset.category[Math.floor(rand() * preset.category.length)],
      phone,
      whatsapp: rand() > 0.12,
      email: presence === 'none' && rand() > 0.5 ? null : `contato@${handle.slice(0, 18)}.com.br`,
      rating: Math.round((3.9 + rand() * 1.1) * 10) / 10,
      reviews: Math.floor(20 + rand() * 600),
      open: rand() > 0.25,
      closesAt: `${closeHour}:${rand() > 0.5 ? '30' : '00'}`,
      presence,
      website:
        presence === 'site'
          ? `https://www.${handle.slice(0, 18)}.com.br`
          : presence === 'social'
            ? `https://instagram.com/${handle.slice(0, 22)}`
            : null,
      address: `${STREETS[Math.floor(rand() * STREETS.length)]}, ${Math.floor(10 + rand() * 1900)} — ${city}`,
    })
  }

  return leads
}

export function whatsappLink(lead: Lead) {
  const digits = lead.phone.replace(/\D/g, '')
  const text = encodeURIComponent(
    `Olá, tudo bem? Encontrei a ${lead.name} no Google Maps e gostaria de apresentar uma proposta rápida para vocês.`,
  )
  return `https://wa.me/55${digits}?text=${text}`
}

export function mapsLink(lead: Lead) {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${lead.name} ${lead.address}`)}`
}

export function initials(name: string) {
  return name.replace(/[^A-Za-zÀ-ú ]/g, '').slice(0, 2).toUpperCase()
}
