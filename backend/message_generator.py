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


def clean_company_name(name: str) -> str:
    """Limpa e formata o nome da empresa para soar natural no WhatsApp."""
    if not name:
        return "pessoal"
    # Remove sufixos como '- Matriz', '- Filial', '| Oficial', etc.
    cleaned = re.split(r"[-–—|/:]", name)[0].strip()
    return cleaned if cleaned else name.strip()


def extract_recipient_display(company_name: str) -> str:
    """
    Gera a forma de tratamento ideal (ex: 'pessoal da Barbearia Silva', 'Dra. Ana', etc.)
    seguindo o mesmo padrão do pitch manual.
    """
    name = clean_company_name(company_name)
    lower = name.lower()

    # Títulos e profissões individuais
    if any(lower.startswith(p) for p in ["dr.", "dra.", "dr ", "dra ", "doutor", "doutora", "prof.", "adv.", "eng."]):
        return name

    # Se já tem "pessoal" ou "equipe"
    if "pessoal" in lower or "equipe" in lower:
        return name

    # Se começa com artigo feminino ou masculino
    if lower.startswith("a ") or lower.startswith("o "):
        return f"pessoal d{name.strip()}"

    return f"pessoal da {name}" if not any(w in lower for w in ["auto", "centro", "posto", "hotel", "instituto", "restaurante", "bar", "studio", "espaço"]) else f"pessoal do {name}"


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

    city = (lead.get("city") or "").strip()
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
