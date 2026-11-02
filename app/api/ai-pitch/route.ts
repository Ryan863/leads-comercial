import { NextResponse } from 'next/server'
import {
  generatePitch,
  extractSpecialtyInfo,
  extractRecipient,
  type PitchSettings,
} from '@/lib/pitch-generator'
import type { Lead } from '@/lib/leads'

export const dynamic = 'force-dynamic'

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

export async function GET() {
  const serverKey = process.env.GEMINI_API_KEY
  return NextResponse.json({
    hasServerKey: Boolean(serverKey && serverKey.trim().length > 10),
    models: GEMINI_MODELS,
    status: 'ready',
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      lead,
      settings,
      customInstructions,
      variationIndex = 0,
      searchQuery,
    }: {
      lead: Lead
      settings?: Partial<PitchSettings>
      customInstructions?: string
      variationIndex?: number
      searchQuery?: string
    } = body

    if (!lead || !lead.name) {
      return NextResponse.json({ error: 'Lead inválido' }, { status: 400 })
    }

    const effectiveQuery = searchQuery || lead.searchQuery || lead.searchedNiche || ''

    const apiKey =
      settings?.geminiApiKey && settings.geminiApiKey.trim().length > 10
        ? settings.geminiApiKey.trim()
        : process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10
          ? process.env.GEMINI_API_KEY.trim()
          : null

    const specialty = extractSpecialtyInfo(lead, effectiveQuery)
    const recipient = extractRecipient(lead.name, lead.address)

    if (apiKey) {
      const senderCityName = (settings?.senderCity || '').trim()
      const isSameCity = Boolean(
        senderCityName && lead.address?.toLowerCase().includes(senderCityName.toLowerCase()),
      )
      const persona = settings?.persona || 'ryan'
      const senderName = (settings?.senderName || '').trim() || (persona === 'ryan' ? 'Ryan' : '')
      const senderRole = (settings?.senderRole || '').trim() || 'desenvolvedor web'
      const hasInstagram =
        lead.presence === 'social' || (lead.website && /instagram\.com/i.test(lead.website))

      const targetLang =
        settings?.language && settings.language !== 'auto'
          ? settings.language
          : /[\u0600-\u06ff]/.test((lead.address || '') + (lead.name || ''))
            ? 'ar'
            : lead.address?.toLowerCase().includes('japan') ||
                /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/i.test((lead.address || '') + (lead.name || ''))
              ? 'ja'
              : lead.address
                    ?.toLowerCase()
                    .match(
                      /usa|united states|australia|uk|england|canada|dubai|emirados|uae|london|sydney|miami|new york|california|dublin/i,
                    )
                ? 'en'
                : lead.address
                      ?.toLowerCase()
                      .match(/spain|espanha|españa|mexico|argentina|colombia|madrid|barcelona/i)
                  ? 'es'
                  : lead.address?.toLowerCase().match(/italy|itália|italia|roma|milano/i)
                    ? 'it'
                    : lead.address
                          ?.toLowerCase()
                          .match(/germany|alemanha|austria|áustria|berlin|munich|vienna/i)
                      ? 'de'
                      : lead.address?.toLowerCase().match(/france|frança|paris|geneva/i)
                        ? 'fr'
                        : 'pt'

      const languageInstructions: Record<string, string> = {
        ar: 'MANDATORY LANGUAGE: Write strictly in modern standard ARABIC (العربية), polite, respectful, and suitable for commercial WhatsApp outreach in UAE/Dubai.',
        ja: 'IDIOMA E TONALIDADE OBRIGATÓRIOS: Escreva INTEIRAMENTE em JAPONÊS (日本語) com Keigo polido empresarial (丁寧語/尊敬語). Dirija-se ao lead com "様".',
        en: 'MANDATORY LANGUAGE: Write strictly in ENGLISH. Natural, professional, warm outreach tone suitable for US/UK/Australia businesses.',
        es: 'IDIOMA OBLIGATORIO: Escribe todo el mensaje estrictamente en ESPAÑOL. Tono profesional, cálido y enfocado en negocios hispanohablantes.',
        it: "LINGUA OBBLIGATORIA: Scrivi l'intero messaggio rigorosamente in ITALIANO. Tono professionale, cortese e moderno.",
        de: 'PFLICHTSPRACHE: Schreiben Sie die gesamte Nachricht ausschließlich auf DEUTSCH. Professioneller und höflicher Ton.',
        fr: "LANGUE OBLIGATOIRE: Rédigez l'intégralité du message strictement en FRANÇAIS. Ton professionnel, courtois et engageant.",
        pt: 'IDIOMA: Escreva a mensagem em PORTUGUÊS (Brasil), natural, fluida, humana e acolhedora.',
      }

      const langPrompt = languageInstructions[targetLang] || languageInstructions.pt

      const systemPrompt = `Você é um estrategista comercial humano especialista em prospecção ativa de alto nível via WhatsApp para negócios locais.
Seu objetivo é escrever uma mensagem curta, empática, ultra-personalizada e consultiva para o responsável pelo estabelecimento, com altíssima taxa de resposta.

${langPrompt}

🚨 REGRAS CRÍTICAS ANTI-SPAM E DE ADAPTAÇÃO TOTAL AO NICHO:
1. NUNCA use frases robóticas ou termos genéricos:
   ❌ PROIBIDO: "estabelecimentos de comércio e serviços"
   ❌ PROIBIDO: "Espero que este contato o encontre bem" ou "Prezado(a)"
   ❌ PROIBIDO: "Trabalhamos para sites institucionais de empresas e atendimentos"
2. INCLUA NATURALMENTE NO TEXTO O NICHO PESQUISADO/DETECTADO ("${specialty.specialtyLabel}") E O NOME DO ESTABELECIMENTO ("${recipient.display}"):
   - Na saudação, dirija-se como: "Olá, ${recipient.display}, tudo bem por aí?"
   - Na apresentação e diagnóstico, mencione diretamente o ramo "${specialty.specialtyLabel}" e os serviços reais desse nicho (${specialty.serviceTerm}) e a ação que o cliente busca (${specialty.actionTerm}).
   - Se for sorveteria / açaí / gelateria: cite sabores, taças, potes, açaí e facilidade de pedir ou ver o cardápio pelo WhatsApp.
   - Se for estética automotiva / polimento / lava-jato: cite estética automotiva, polimento, vitrificação, higienização, fotos de antes e depois dos veículos e orçamento rápido no WhatsApp.
   - Se for oficina mecânica / auto center: cite revisão, manutenção rápida e orçamento no WhatsApp.
   - Se for barbearia / salão / estética / saúde / gastronomia / construção / loja / qualquer outro ramo: use os termos reais da rotina daquele negócio!

3. ESTRUTURA IDEAL (3 BLOCOS CURTOS - FÁCIL DE LER NO CELULAR):
   - Bloco 1 (Saudação e apresentação): "Olá, ${recipient.display}, tudo bem por aí?" + apresentação breve e humana dizendo que cria sites modernos e práticos para ${specialty.specialtyLabel}.
   - Bloco 2 (Diagnóstico consultivo sincero sobre ${specialty.specialtyLabel}):
     ${
       hasInstagram
         ? 'Elogie o trabalho no Instagram, mas mostre que quem pesquisa por ' + specialty.specialtyLabel + ' no Google ou clica na bio precisa de uma página rápida para ver ' + specialty.serviceTerm + ' e chamar direto no WhatsApp em 1 clique.'
         : lead.presence === 'none'
           ? 'Mostre que quem pesquisa por ' + specialty.specialtyLabel + ' no Google pelo celular não encontra uma página oficial da ' + recipient.cleanName + ' mostrando ' + specialty.serviceTerm + ', e que ter essa vitrine direciona contatos quentes para o WhatsApp.'
           : 'Mostre que mais de 80% das buscas por ' + specialty.specialtyLabel + ' acontecem pelo celular e uma página moderna, leve e integrada ao WhatsApp dobra os contatos.'
     }
   - Bloco 3 (Fechamento suave - Soft CTA): Uma pergunta curta e sem pressão oferecendo enviar uma prévia simples sem compromisso de como ficaria essa página para eles.

4. IDENTIDADE DO REMETENTE:
   - Apresentação: ${
     persona === 'rvll'
       ? `Apresente-se como equipe de desenvolvimento web ("Somos uma equipe de desenvolvimento web...").`
       : persona === 'ryan' || senderName
         ? `Apresente-se na primeira pessoa usando o nome "${senderName}" ("Meu nome é ${senderName}, sou ${senderRole}...").`
         : `Apresente-se diretamente como ${senderRole} ("Sou desenvolvedor web e crio sites...").`
   }
   - LOCALIZAÇÃO REGIONAL:
     ${
       isSameCity && targetLang === 'pt' && senderCityName
         ? `O lead é da mesma cidade do remetente (${senderCityName}). Mencione naturalmente que atua aqui em ${senderCityName}.`
         : `Não invente onde você mora. Apenas apresente seu trabalho para ${specialty.specialtyLabel}.`
     }
5. FORMATO FINAL:
   - Retorne EXCLUSIVAMENTE o texto final pronto para enviar no WhatsApp, sem aspas e sem markdown.`

      const userPrompt = `DADOS REAIS DO ESTABELECIMENTO:
Nome Limpo: ${recipient.cleanName} (Saudar como: ${recipient.display})
Termo Pesquisado / Nicho: ${specialty.specialtyLabel}
Serviços do Ramo: ${specialty.serviceTerm}
Público Atendido: ${specialty.clientTerm}s
Endereço: ${lead.address}
Presença Digital: ${hasInstagram ? 'Possui Instagram ativo' : lead.presence === 'none' ? 'Sem site oficial no Google (Alta oportunidade)' : 'Possui site'}
Avaliação no Google: ${lead.rating ? `${lead.rating} estrelas (${lead.reviews} avaliações)` : 'Sem avaliações'}

INSTRUÇÃO EXTRA: ${customInstructions || settings?.customInstructions || `Escreva de forma natural, calorosa e mencione "${specialty.specialtyLabel}" diretamente no texto.`}`

      for (const model of GEMINI_MODELS) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600,
              },
            }),
          })

          if (response.ok) {
            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (text && text.length > 30) {
              return NextResponse.json({
                pitch: text,
                provider: 'gemini',
                model,
                isAi: true,
              })
            }
          } else {
            const errBody = await response.text()
            console.warn(`[GEMINI API] Falha no modelo ${model} (${response.status}):`, errBody.slice(0, 150))
          }
        } catch (modelErr) {
          console.warn(`[GEMINI API] Erro ao tentar modelo ${model}:`, modelErr)
        }
      }
    }

    // Fallback determinístico ultra-adaptado por nicho e query pesquisada
    const localPitch = generatePitch(lead, settings, variationIndex, effectiveQuery)
    return NextResponse.json({
      pitch: localPitch,
      provider: 'engine-local',
      isAi: false,
    })
  } catch (error) {
    console.error('Erro na rota /api/ai-pitch:', error)
    return NextResponse.json({ error: 'Erro interno ao gerar pitch' }, { status: 500 })
  }
}
