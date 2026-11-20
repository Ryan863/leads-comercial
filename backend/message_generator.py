import re
import random
from typing import Dict, Any, Optional


def resolve_spintax(text: str) -> str:
    """
    Resolve sintaxe Spintax no padrão {opcao1|opcao2|opcao3} de forma recursiva.
    """
    pattern = re.compile(r"\{([^{}]+)\}")
    while True:
        match = pattern.search(text)
        if not match:
            break
        choices = match.group(1).split("|")
        chosen = random.choice(choices)
        text = text[:match.start()] + chosen + text[match.end():]
    return text


NOT_PERSON_WORDS = {
    "civil", "eletrico", "elétrico", "eletricista", "mecanico", "mecânico", "ambiental",
    "florestal", "quimico", "químico", "seguranca", "segurança", "trabalho", "imoveis",
    "imóveis", "imobiliario", "imobiliário", "imobiliaria", "imobiliária", "clinico",
    "clínico", "clinica", "clínica", "infantil", "esportivo", "esportiva", "trabalhista",
    "engenharia", "arquitetura", "consultoria", "escritorio", "escritório", "studio",
    "centro", "instituto", "grupo", "equipe", "pessoal", "obras", "projetos", "servicos",
    "serviços", "de", "da", "do", "das", "dos", "e", "em", "para", "com",
}

PROFESSION_ONLY_RE = re.compile(
    r"^(?:dra?\.?|doutor(?:a)?|eng(?:enheir[ao])?\.?|arquitet[ao]|corretor(?:a)?|advogad[ao]|psic[oó]log[ao]|nutri(?:cionista)?|fisioterapeuta|dentista|m[eé]dic[ao]|veterin[aá]ri[ao]|contad[oa]r(?:a)?|fot[oó]graf[ao]|personal|prof(?:essor[ao])?\.?)"
    r"(?:\s+(?:civil|el[eé]tric[ao]|eletricista|mec[aâ]nic[ao]|ambiental|florestal|qu[ií]mic[ao]|urbanista|cl[ií]nic[ao]|infantil|esportiv[ao]|trabalhista|imobili[aá]ri[ao]|geral|de|da|do|e|em|im[oó]veis|seguran[cç]a|trabalho|obras|projetos))*$",
    re.IGNORECASE,
)

TRAILING_PREP_RE = re.compile(r"\s+(?:de|da|do|das|dos|e|&|em|para|com|por|no|na|[-–—/])$", re.IGNORECASE)


def clean_company_name(name: str) -> str:
    """Limpa e formata o nome da empresa para soar natural no WhatsApp."""
    if not name:
        return "pessoal"
    raw = re.sub(r"\b(?:ltda\.?|me\b|epp\b|eireli\b|s/a\b|s\.a\.?)\b", "", name, flags=re.IGNORECASE).strip()
    parts = [p.strip() for p in re.split(r"[-–—|•:]", raw) if p.strip()]
    if len(parts) > 1 and PROFESSION_ONLY_RE.match(parts[0]) and len(parts[1]) >= 3:
        cleaned = f"{parts[0]} {parts[1]}"
    elif parts:
        cleaned = parts[0]
    else:
        cleaned = raw
    words = cleaned.split()
    if len(words) > 4:
        cleaned = " ".join(words[:4])
    while TRAILING_PREP_RE.search(cleaned) and len(cleaned.split()) > 1:
        cleaned = TRAILING_PREP_RE.sub("", cleaned).strip()
    return cleaned if cleaned else name.strip()


def extract_recipient_display(company_name: str) -> str:
    """
    Gera a forma de tratamento ideal (ex: 'pessoal da Barbearia Silva', 'Dra. Ana', 'Saionara', etc.)
    seguindo o mesmo padrão do pitch manual.
    """
    raw = re.sub(r"\b(?:ltda\.?|me\b|epp\b|eireli\b|s/a\b|s\.a\.?)\b", "", company_name or "", flags=re.IGNORECASE).strip()
    parts = [p.strip() for p in re.split(r"[-–—|•:]", raw) if p.strip()]
    if len(parts) > 1:
        if PROFESSION_ONLY_RE.match(parts[0]) and len(parts[1]) >= 3:
            raw = f"{parts[0]} {parts[1]}"
        elif PROFESSION_ONLY_RE.match(parts[1]):
            first_word = parts[0].split()[0] if parts[0].split() else ""
            if len(first_word) >= 3 and first_word.lower() not in NOT_PERSON_WORDS:
                return first_word.capitalize()

    # Títulos seguidos opcionalmente de especialidade (ex: "Engenheira Civil ... Saionara Vargas")
    m = re.match(
        r"^(dra?\.?|doutor(?:a)?|eng(?:enheir[ao])?\.?|arquitet[ao]|corretor(?:a)?|advogad[ao]|psic[oó]log[ao]|nutri(?:cionista)?|fisioterapeuta|dentista|m[eé]dic[ao]|veterin[aá]ri[ao]|prof(?:essor[ao])?\.?)\b\s*(.*)$",
        raw,
        re.IGNORECASE,
    )
    if m and m.group(2):
        prefix = m.group(1).lower()
        rem = re.sub(
            r"^(?:(?:civil|el[eé]tric[ao]|eletricista|mec[aâ]nic[ao]|ambiental|florestal|qu[ií]mic[ao]|urbanista|cl[ií]nic[ao]|infantil|esportiv[ao]|trabalhista|imobili[aá]ri[ao]|geral|seguran[cç]a|trabalho|produ[cç][aã]o|im[oó]veis|e|de|da|do|das|dos|em|para|[-–—/|])\s+)+",
            "",
            m.group(2).strip(),
            flags=re.IGNORECASE,
        ).strip()
        cand = re.match(r"^([A-Za-zÀ-ú]{3,})\b", rem)
        if cand and cand.group(1).lower() not in NOT_PERSON_WORDS:
            first = cand.group(1).capitalize()
            if prefix in ("dra", "dra.", "doutora"):
                return f"Dra. {first}"
            if prefix in ("dr", "dr.", "doutor"):
                return f"Dr. {first}"
            return first

    # Nome próprio seguido de profissão (ex: "Gabriel Herkert Corretor de Imóveis")
    pm = re.match(
        r"^([A-Za-zÀ-ú]{3,})(?:\s+[A-Za-zÀ-ú]{2,}){0,2}\s+(?:corretor(?:a)?(?:\s+de\s+im[oó]veis)?|engenheir[ao]|arquitet[ao]|advogad[ao]|psic[oó]log[ao]|fisioterapia|nutri[cç][aã]o)\b",
        raw,
        re.IGNORECASE,
    )
    if pm and pm.group(1).lower() not in NOT_PERSON_WORDS:
        return pm.group(1).capitalize()

    name = clean_company_name(company_name)
    lower = name.lower()

    if "pessoal" in lower or "equipe" in lower:
        return name

    if lower.startswith("a ") or lower.startswith("o "):
        return f"pessoal d{name.strip()}"

    fem_re = re.compile(
        r"\b(?:cl[íi]nica|sorveteria|gelateria|pizzaria|hamburgueria|padaria|confeitaria|doceria|lanchonete|cafeteria|barbearia|est[ée]tica|oficina|mec[âa]nica|imobili[áa]ria|im[oó]veis|vidra[çc]aria|marmoraria|serralheria|marcenaria|farm[áa]cia|drogaria|[óo]tica|floricultura|lavanderia|gr[áa]fica|academia|escola|autoescola|pousada|cabana|engenharia|arquitetura|construtora|constru[cç][oõ]es|consultoria|assessoria|contabilidade|advocacia|corretora|transportadora|solu[cç][oõ]es|incorporadora|empreiteira)\b",
        re.IGNORECASE,
    )
    masc_start_re = re.compile(
        r"^(?:studio|est[uú]dio|espa[cç]o|centro|instituto|grupo|imp[eé]rio|ponto|recanto|ref[uú]gio|posto|sal[aã]o|consult[oó]rio|escrit[oó]rio|hospital|laborat[oó]rio|hotel|supermercado|mercado|a[cç]ougue|dep[oó]sito|shopping|restaurante|bar|auto)\b",
        re.IGNORECASE,
    )
    is_fem = bool(fem_re.search(name)) and not bool(masc_start_re.search(name))
    return f"pessoal da {name}" if is_fem else f"pessoal do {name}"


def _clean_city(raw_city: str) -> str:
    c = (raw_city or "").strip()
    if not c or re.search(r"\d", c) or re.match(r"^[A-Za-z]{2}(?:,\s*.*)?$", c):
        return ""
    return c


def generate_outreach_message(lead: Dict[str, Any], custom_template: Optional[str] = None) -> str:
    """
    Gera mensagem de abordagem comercial de alta conversão,
    idêntica à estrutura adaptada do manual:
    1. Saudação humana com nome higienizado
    2. Apresentação contextualizada com nicho e região
    3. Diagnóstico real de oportunidade comercial (Sem site / Com site)
    4. Pergunta de fechamento suave (Soft CTA)
    """
    raw_name = lead.get("company_name") or lead.get("name") or ""
    clean_name = clean_company_name(raw_name)
    display = extract_recipient_display(clean_name)

    city = _clean_city(lead.get("city") or "")
    city_suffix = f" aqui de {city}" if city else " aqui da região"

    niche = (lead.get("niche") or lead.get("category") or "").strip()
    niche_label = niche.lower() if niche else "seu segmento"
    has_website = bool(lead.get("has_website"))

    if custom_template and custom_template.strip():
        rendered = custom_template.format(
            company=clean_name,
            company_name=clean_name,
            city=city or "sua região",
            niche=niche_label,
            recipient=display,
        )
        return resolve_spintax(rendered).strip()

    # 1. Saudação humana e calorosa com nome limpo
    greetings = [
        f"Olá, {display}, tudo bem por aí?",
        f"Opa, {display}, como estão as coisas?",
        f"Olá, {display}, tudo ótimo por aí?",
    ]
    greeting = random.choice(greetings)

    # 2. Apresentação profissional sob medida
    presentations = [
        f"Me chamo Ryan, sou desenvolvedor web e crio páginas e cardápios rápidos focados em agendamentos e pedidos pelo WhatsApp para {niche_label}{city_suffix}.",
        f"Meu nome é Ryan, atuo com desenvolvimento web especializado em páginas modernas e de alta conversão para empresas de {niche_label}{city_suffix}.",
        f"Sou o Ryan, desenvolvedor web, e ajudo negócios de {niche_label}{city_suffix} a transformarem buscas no Google em contatos imediatos no WhatsApp.",
    ]
    presentation = random.choice(presentations)

    # 3. Diagnóstico e Necessidade Real
    presence = (lead.get("presence") or "").strip()
    is_social = presence == "social"

    if is_social:
        diagnoses = [
            f"Vi o perfil de vocês no Instagram e achei excelente o trabalho que compartilham por lá! Só que quem pesquisa por {niche_label} no Google ou clica no link da bio muitas vezes busca uma página oficial onde consiga ver os serviços detalhados e agendar direto no WhatsApp com 1 toque.",
            f"Acompanhei a presença de vocês nas redes sociais e a qualidade do trabalho é impecável! No entanto, clientes que buscam no Google valorizam muito uma página própria rápida para tirar dúvidas e fechar pedidos direto no WhatsApp sem ter que esperar retorno no direct.",
            f"Vi as fotos e divulgações de vocês no Instagram! Ter uma página própria rápida no celular além das redes sociais passa muito mais credibilidade e costuma dobrar a taxa de conversão em clientes diários no WhatsApp.",
        ]
    elif not has_website:
        diagnoses = [
            f"Vi o perfil de vocês no Google e notei que quem pesquisa pelos serviços da {clean_name} ainda não encontra um site ou catálogo oficial com botão direto para o WhatsApp. Ter uma página própria passa muito mais autoridade e garante que novos clientes não vão para a concorrência.",
            f"Estava pesquisando sobre {niche_label} e percebi que vocês ainda não possuem um site institucional indexado no Google. Hoje mais de 80% dos clientes buscam pelo celular, e ter uma página rápida passa credibilidade imediata e facilita o fechamento.",
            f"Encontrei a {clean_name} no Google e reparei que vocês não têm uma página web própria para apresentação dos serviços e contato em 1 toque. Uma estrutura simples e moderna no celular costuma dobrar os chamados diários no WhatsApp.",
        ]
    else:
        diagnoses = [
            f"Estive dando uma olhada no site de vocês e notei oportunidades excelentes para acelerar o carregamento no celular e direcionar ainda mais visitas para o WhatsApp.",
            f"Vi a página de vocês na internet e notei que com alguns ajustes de estrutura mobile e botões de chamada rápida é possível aumentar bastante as conversões no WhatsApp.",
        ]
    diagnosis = random.choice(diagnoses)

    # 4. Pergunta de fechamento suave (Soft CTA)
    ctas = [
        "Faz sentido eu te mandar uma prévia simples sem compromisso de como ficaria essa estrutura para vocês?",
        "Consigo te mandar um rascunho visual rápido sem custo nenhum de como ficaria essa página para darem uma olhada. O que acha?",
        "Teria interesse em ver um modelo simples e sem compromisso pensado especialmente para vocês?",
    ]
    cta = random.choice(ctas)

    # Junta as 4 partes com quebra dupla de parágrafo (padrão WhatsApp)
    message = f"{greeting}\n\n{presentation}\n\n{diagnosis}\n\n{cta}"
    return resolve_spintax(message).strip()
