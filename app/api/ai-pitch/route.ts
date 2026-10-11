import { NextResponse } from 'next/server'
import { generatePitch, type PitchSettings } from '@/lib/pitch-generator'
import type { Lead } from '@/lib/leads'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      lead,
      settings,
      customInstructions,
      variationIndex = 0,
    }: {
      lead: Lead
      settings?: Partial<PitchSettings>
      customInstructions?: string
      variationIndex?: number
    } = body

    if (!lead || !lead.name) {
      return NextResponse.json({ error: 'Lead inválido' }, { status: 400 })
    }

    const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY

    // Se temos chave Gemini, tenta a geração via IA Generativa oficial (Google AI Studio)
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const isSameCity = lead.address?.toLowerCase().includes((settings?.senderCity || 'Videira').toLowerCase())
        const persona = settings?.persona || 'auto'
        const hasInstagram = lead.presence === 'social' || (lead.website && /instagram\.com/i.test(lead.website))

        const targetLang = (settings?.language && settings.language !== 'auto')
          ? settings.language
          : (/[\u0600-\u06ff]/.test((lead.address || '') + (lead.name || '')))
            ? 'ar'
            : (lead.address?.toLowerCase().includes('japan') || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/i.test((lead.address || '') + (lead.name || '')))
              ? 'ja'
              : (lead.address?.toLowerCase().match(/usa|united states|australia|uk|england|canada|dubai|emirados|uae|london|sydney|miami|new york|california|dublin/i))
                ? 'en'
                : (lead.address?.toLowerCase().match(/spain|espanha|españa|mexico|argentina|colombia|madrid|barcelona/i))
                  ? 'es'
                  : (lead.address?.toLowerCase().match(/italy|itália|italia|roma|milano/i))
                    ? 'it'
                    : (lead.address?.toLowerCase().match(/germany|alemanha|austria|áustria|berlin|munich|vienna/i))
                      ? 'de'
                      : (lead.address?.toLowerCase().match(/france|frança|paris|geneva/i))
                        ? 'fr'
                        : 'pt'

        const languageInstructions: Record<string, string> = {
          ar: 'MANDATORY LANGUAGE: Write the entire message strictly in modern standard ARABIC (العربية), polite, respectful, and suitable for commercial WhatsApp outreach in UAE/Dubai.',
          ja: 'IDIOMA E TONALIDADE OBRIGATÓRIOS: Escreva a mensagem INTEIRAMENTE em JAPONÊS (日本語) com Keigo polido empresarial (丁寧語/尊敬語). Dirija-se ao lead com "様" (ex: [Nome]様、初めまして。突然のご連絡失礼いたします。). Retorne todo o conteúdo 100% em japonês nativo sem misturar português.',
          en: 'MANDATORY LANGUAGE: Write the entire message strictly in ENGLISH. Natural, professional, warm outreach tone suitable for US/UK/Australia businesses.',
          es: 'IDIOMA OBLIGATORIO: Escribe todo el mensaje estrictamente en ESPAÑOL. Tono profesional, cálido y enfocado en negocios hispanohablantes.',
          it: 'LINGUA OBBLIGATORIA: Scrivi l\'intero messaggio rigorosamente in ITALIANO. Tono professionale, cortese e moderno.',
          de: 'PFLICHTSPRACHE: Schreiben Sie die gesamte Nachricht ausschließlich auf DEUTSCH. Professioneller und höflicher Ton.',
          fr: 'LANGUE OBLIGATOIRE: Rédigez l\'intégralité du message strictement en FRANÇAIS. Ton professionnel, courtois et engageant.',
          pt: 'IDIOMA: Escreva a mensagem em PORTUGUÊS (Brasil), natural, fluida e humanizada.',
        }

        const langPrompt = languageInstructions[targetLang] || languageInstructions.pt

        const systemPrompt = `Você é um estrategista de prospecção comercial especializado em abordagem humanizada e consultiva para WhatsApp e mensagens diretas.
Seu objetivo é escrever uma mensagem de abordagem sob medida para o lead fornecido, sem parecer cópia pronta ou mensagem de spam.

${langPrompt}

DIRETRIZES FUNDAMENTAIS:
1. SAUDAÇÃO:
   - Se for pessoa física / profissional da saúde (ex: "Marisangela da Silva - Fisioterapeuta Pélvica", "Dra. Jayne"): use o primeiro nome ou título de respeito no idioma alvo.
   - Se for empresa / clínica / espaço (ex: "Espaço Una Vita"): use a equipe ou nome da empresa.

2. IDENTIDADE DO REMETENTE:
   - Persona: ${persona === 'rvll' ? 'Apresente-se como a Equipe Rvll' : persona === 'dev' ? 'Apresente-se como Desenvolvedor Web' : 'Apresente-se como Ryan'}
   - LOCALIZAÇÃO REGIONAL CRÍTICA:
     ${
       isSameCity && targetLang === 'pt'
         ? `O lead é da mesma cidade do remetente (${settings?.senderCity || 'Videira'}). Você pode mencionar naturalmente que mora/é daqui da cidade e citar a rua/bairro local.`
         : `ATENÇÃO: O lead NÃO É da cidade do remetente! NÃO DIGA ONDE VOCÊ MORA, NÃO DIGA QUE É DA CIDADE DELE. Apenas apresente seu trabalho com o nicho dele e cite o espaço/consultório dele.`
     }

3. DIAGNÓSTICO E NECESSIDADE REAL DA EMPRESA:
   ${
     hasInstagram
       ? `O lead JÁ TEM INSTAGRAM: Reconheça o bom trabalho no Instagram, mas aponte a necessidade real: quem pesquisa pelo serviço no Google ou clica na bio muitas vezes não encontra uma página oficial para tirar dúvidas imediatas e agendar sem se perder nos posts. Ter um site próprio estruturado valoriza o trabalho do Instagram e converte seguidores e pacientes direto para contato.`
       : lead.presence === 'none'
         ? `O lead NÃO TEM SITE OFICIAL: Mostre que quem pesquisa pela clínica/empresa no Google não encontra uma página própria oficial reunindo todas as especialidades e horários. Um site limpo funciona como vitrine acolhedora, tira as dúvidas mais comuns e permite agendamento direto.`
         : `O lead JÁ TEM SITE: Foque na necessidade de velocidade e conversão móvel, já que mais de 80% dos clientes acessam via celular.`
   }

4. ENCERRAMENTO (SOFT CTA):
   - Termine SEMPRE com uma pergunta suave de fechamento sem pressão comercial (ex: oferecendo ver uma prévia ou modelo simples de como ficaria a vitrine).

5. FORMATO:
   - Retorne EXCLUSIVAMENTE o texto final da mensagem no idioma alvo, formatado em parágrafos limpos com quebras de linha para envio direto. Sem aspas no início/fim e sem explicações.`

        const userPrompt = `DADOS DO LEAD:
Nome: ${lead.name}
Categoria: ${lead.category}
Endereço: ${lead.address}
Presença Digital: ${hasInstagram ? 'Usa Instagram' : lead.presence === 'none' ? 'Sem site oficial no Google' : 'Tem site'}
Avaliações: ${lead.rating ? `${lead.rating} estrelas (${lead.reviews} avaliações)` : 'Sem avaliações'}
Telefone: ${lead.phone}

INSTRUÇÃO EXTRA DO USUÁRIO: ${customInstructions || 'Escreva de forma empática, respeitosa e adaptada à necessidade específica do negócio.'}`

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`

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
              maxOutputTokens: 500,
            },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (text) {
            return NextResponse.json({
              pitch: text,
              provider: 'gemini',
              isAi: true,
            })
          }
        }
      } catch (geminiError) {
        console.warn('Erro na chamada Gemini, caindo no gerador local:', geminiError)
      }
    }

    // Fallback inteligente determinístico (100% de precisão e zero falhas)
    const localPitch = generatePitch(lead, settings, variationIndex)
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
