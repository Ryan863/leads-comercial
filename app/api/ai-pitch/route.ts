import { NextResponse } from 'next/server'
import { generatePitch, extractSpecialtyInfo, type PitchSettings } from '@/lib/pitch-generator'
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
    }: {
      lead: Lead
      settings?: Partial<PitchSettings>
      customInstructions?: string
      variationIndex?: number
    } = body

    if (!lead || !lead.name) {
      return NextResponse.json({ error: 'Lead inválido' }, { status: 400 })
    }

    const apiKey = (settings?.geminiApiKey && settings.geminiApiKey.trim().length > 10)
      ? settings.geminiApiKey.trim()
      : (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10)
        ? process.env.GEMINI_API_KEY.trim()
        : null

    const specialty = extractSpecialtyInfo(lead)

    // Se temos chave Gemini, tenta a geração via IA Generativa oficial (Google AI Studio)
    if (apiKey) {
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
        ar: 'MANDATORY LANGUAGE: Write strictly in modern standard ARABIC (العربية), polite, respectful, and suitable for commercial WhatsApp outreach in UAE/Dubai.',
        ja: 'IDIOMA E TONALIDADE OBRIGATÓRIOS: Escreva INTEIRAMENTE em JAPONÊS (日本語) com Keigo polido empresarial (丁寧語/尊敬語). Dirija-se ao lead com "様".',
        en: 'MANDATORY LANGUAGE: Write strictly in ENGLISH. Natural, professional, warm outreach tone suitable for US/UK/Australia businesses.',
        es: 'IDIOMA OBLIGATORIO: Escribe todo el mensaje estrictamente en ESPAÑOL. Tono profesional, cálido y enfocado en negocios hispanohablantes.',
        it: 'LINGUA OBBLIGATORIA: Scrivi l\'intero messaggio rigorosamente in ITALIANO. Tono professionale, cortese e moderno.',
        de: 'PFLICHTSPRACHE: Schreiben Sie die gesamte Nachricht ausschließlich auf DEUTSCH. Professioneller und höflicher Ton.',
        fr: 'LANGUE OBLIGATOIRE: Rédigez l\'intégralité du message strictement en FRANÇAIS. Ton professionnel, courtois et engageant.',
        pt: 'IDIOMA: Escreva a mensagem em PORTUGUÊS (Brasil), natural, fluida, humana e acolhedora.',
      }

      const langPrompt = languageInstructions[targetLang] || languageInstructions.pt

      const systemPrompt = `Você é um estrategista comercial humano especialista em prospecção ativa de alto nível via WhatsApp para negócios locais.
Seu objetivo é escrever uma mensagem curta, empática, ultra-personalizada e consultiva para o responsável pelo estabelecimento, com altíssima taxa de resposta.

${langPrompt}

🚨 REGRAS CRÍTICAS ANTI-SPAM E ANTI-IA (VIOLAÇÃO É INACEITÁVEL):
1. NUNCA, SOB HIPÓTESE ALGUMA, use frases robóticas ou clichês de telemarketing/spam:
   ❌ PROIBIDO: "Espero que este contato o encontre bem"
   ❌ PROIBIDO: "Prezado(a)"
   ❌ PROIBIDO: "Trabalhamos para sites institucionais de empresas e atendimentos" (MUITO GENÉRICO E ULTRAPASSADO!)
   ❌ PROIBIDO: "Somos líderes em desenvolvimento web..."
   ❌ PROIBIDO: "Gostaria de agendar uma reunião de 15 minutos para falar de soluções inovadoras..."
2. ADAPTE 100% AO NICHO ESPECÍFICO DO ESTABELECIMENTO (${specialty.specialtyLabel}):
   - Use os termos reais do dia a dia do setor:
     • Se for barbearia: cite os cortes, barba, estilo do espaço e agendamento de horários sem fila no WhatsApp.
     • Se for clínica de estética / harmonização / spa: cite os procedimentos faciais/corporais, transmitir segurança às ${specialty.clientTerm}s e tirar dúvidas prévias de avaliação.
     • Se for salão de beleza / unhas / sobrancelhas / lash: cite catálogo de serviços, fotos reais e agendamento prático no WhatsApp.
     • Se for tatuagem / piercing: cite portfólio visual de artes, orientações de cuidados e facilidade de pedir orçamento no WhatsApp.
     • Se for odontologia / consultório: cite tratamentos odontológicos, autoridade e agendamento de consultas com facilidade.
     • Se for fisioterapia / saúde: cite o acolhimento, explicar para quais casos o tratamento é indicado e facilitar agendamentos.
     • Se for pilates / academia: cite aulas experimentais, turmas e facilitar novas matrículas pelo WhatsApp.
     • Se for pet shop / clínica veterinária: cite o carinho com os pets, banho & tosa, vacinas e agendamento rápido pros tutores.
     • Se for oficina mecânica / estética automotiva: cite a confiança nos serviços, manutenção rápida e facilidade de pedir orçamento no WhatsApp.
     • Se for restaurante / lanchonete / delivery: cite o cardápio digital próprio, praticidade no pedido via WhatsApp e economia em taxas de apps de entrega.
     • Se for vidraçaria / marcenaria / reformas / refrigeração: cite fotos de projetos entregues e rapidez no envio de orçamentos.
     • Se for outro comércio ou serviço: cite exatamente os produtos/serviços reais daquele negócio!

3. ESTRUTURA IDEAL (MÁXIMO 3 BLOCOS CURTOS - FÁCIL DE LER NO CELULAR):
   - Bloco 1 (Saudação e conexão): "Olá, tudo bem?" ou "Olá [Nome/Doutor(a)], tudo bem por aí?" + apresentação breve e humana com a persona pedida.
   - Bloco 2 (Diagnóstico consultivo sincero):
     ${
       hasInstagram
         ? 'Elogie o trabalho no Instagram, mas mostre que no feed as informações se perdem rápido e quem busca no Google precisa de uma página limpa para ver todos os serviços e chamar direto no WhatsApp em 1 clique.'
         : lead.presence === 'none'
           ? 'Mostre que quem pesquisa pela empresa/clínica no Google pelo celular não encontra uma página oficial com os serviços e horários, perdendo contatos quentes para concorrentes.'
           : 'Aponte que muitos sites antigos são lentos no celular ou não direcionam com clareza para o WhatsApp, e uma página moderna e rápida costuma dobrar os agendamentos.'
     }
   - Bloco 3 (Fechamento suave - Soft CTA): Uma pergunta curta, educada e sem pressão (ex: perguntando se faz sentido enviar uma prévia simples ou vídeo de 1 minuto sem compromisso mostrando como ficaria a vitrine digital para o estabelecimento dele).

4. IDENTIDADE DO REMETENTE:
   - Persona: ${persona === 'rvll' ? 'Apresente-se como a Equipe Rvll' : persona === 'dev' ? 'Apresente-se como Desenvolvedor Web' : `Apresente-se como ${settings?.senderName || 'Ryan'}`}
   - LOCALIZAÇÃO REGIONAL:
     ${
       isSameCity && targetLang === 'pt'
         ? `O lead é da mesma cidade do remetente (${settings?.senderCity || 'Videira'}). Você pode mencionar naturalmente que mora/é daqui da cidade e citar a rua/bairro local.`
         : `ATENÇÃO: O lead NÃO É da cidade do remetente! NÃO DIGA ONDE VOCÊ MORA, NÃO DIGA QUE É DA CIDADE DELE. Apenas apresente seu trabalho adaptado para ${specialty.specialtyLabel}.`
     }

5. FORMATO FINAL:
   - Retorne EXCLUSIVAMENTE o texto final pronto para enviar no WhatsApp, com quebras de linha entre os blocos. Sem aspas no início/fim, sem markdown em negrito excessivo e sem explicações anexas.`

      const userPrompt = `DADOS REAIS DO ESTABELECIMENTO:
Nome: ${lead.name}
Categoria: ${lead.category}
Especialidade Detectada: ${specialty.specialtyLabel}
Público Atendido: ${specialty.clientTerm}s
Endereço: ${lead.address}
Presença Digital: ${hasInstagram ? 'Possui Instagram ativo' : lead.presence === 'none' ? 'Sem site oficial no Google (Alta oportunidade)' : 'Possui site'}
Avaliação no Google: ${lead.rating ? `${lead.rating} estrelas (${lead.reviews} avaliações)` : 'Sem avaliações'}
Telefone: ${lead.phone}

INSTRUÇÃO EXTRA: ${customInstructions || 'Escreva de forma natural, calorosa e 100% adaptada ao ramo dele sem parecer cópia ou spam.'}`

      // Tenta os modelos Gemini em ordem de disponibilidade (2.5 -> 2.0 -> 1.5)
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
                temperature: 0.75,
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

    // Fallback inteligente determinístico ultra-adaptado por nicho (zero falhas e instantâneo)
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
