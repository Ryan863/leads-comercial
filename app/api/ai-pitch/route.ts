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

        const systemPrompt = `Você é um estrategista de prospecção comercial especializado em abordagem humanizada e consultiva para WhatsApp.
Seu objetivo é escrever uma mensagem de abordagem sob medida para o lead fornecido, sem parecer cópia pronta ou mensagem de spam.

DIRETRIZES FUNDAMENTAIS:
1. SAUDAÇÃO:
   - Se for pessoa física / profissional da saúde (ex: "Marisangela da Silva - Fisioterapeuta Pélvica", "Dra. Jayne"): use o primeiro nome ("Olá, Marisangela, tudo bem?" ou "Olá, Jayne, tudo bem?").
   - Se for empresa / clínica / espaço (ex: "Espaço Una Vita"): use a equipe ("Olá, equipe do Una Vita, tudo bem?").

2. IDENTIDADE DO REMETENTE:
   - Persona: ${persona === 'rvll' ? 'Apresente-se como a Equipe Rvll ("Somos da equipe Rvll...")' : persona === 'dev' ? 'Apresente-se como Desenvolvedor Web ("Sou desenvolvedor web focado em...")' : 'Apresente-se como Ryan ("Sou o Ryan / Meu nome é Ryan...")'}
   - LOCALIZAÇÃO REGIONAL CRÍTICA:
     ${
       isSameCity
         ? `O lead é da mesma cidade do remetente (${settings?.senderCity || 'Videira'}). Você pode mencionar naturalmente que mora/é daqui da cidade e citar a rua/bairro local.`
         : `ATENÇÃO: O lead NÃO É da cidade do remetente! NÃO DIGA ONDE VOCÊ MORA, NÃO DIGA QUE É DA CIDADE DELE. Apenas apresente seu trabalho com o nicho dele e cite o espaço/consultório dele.`
     }

3. DIAGNÓSTICO E NECESSIDADE REAL DA EMPRESA:
   ${
     hasInstagram
       ? `O lead JÁ TEM INSTAGRAM: Reconheça o bom trabalho e conteúdo no Instagram, mas aponte a dor/necessidade real: quem pesquisa pelo serviço no Google ou clica na bio muitas vezes não encontra uma página oficial para tirar dúvidas imediatas e agendar sem se perder nos posts do feed. Ter um site próprio estruturado valoriza o trabalho do Instagram e converte seguidores e pacientes direto no WhatsApp.`
       : lead.presence === 'none'
         ? `O lead NÃO TEM SITE OFICIAL NO GOOGLE: Mostre que quem pesquisa pela clínica/empresa no Google não encontra uma página própria oficial reunindo todas as especialidades e horários. Um site limpo funciona como vitrine acolhedora, tira as dúvidas mais comuns e permite agendamento com 1 toque no WhatsApp.`
         : `O lead JÁ TEM SITE: Foque na necessidade de velocidade e conversão móvel para WhatsApp, já que mais de 80% dos pacientes e clientes acessam via celular.`
   }

4. ENCERRAMENTO (SOFT CTA):
   - Termine SEMPRE com uma pergunta suave de fechamento sem pressão comercial (ex: "Faz sentido eu mostrar uma prévia de como ficaria essa estrutura?", "Teria interesse em avaliar a criação de um site próprio?", "Teria interesse em ver um modelo simples sem compromisso?").

5. FORMATO:
   - Retorne EXCLUSIVAMENTE o texto final da mensagem, formatado em parágrafos limpos com quebras de linha para envio direto no WhatsApp. Sem aspas no início/fim e sem explicações.`

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
