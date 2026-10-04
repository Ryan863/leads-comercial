import csv
import io
import re
import unicodedata
from datetime import datetime
from typing import List, Dict, Tuple

HEADERS = [
    "Nome",
    "Categoria",
    "Telefone",
    "WhatsApp",
    "E-mail",
    "Avaliação",
    "Avaliações",
    "Horários da Semana",
    "Presença Web",
    "Website",
    "Endereço"
]

PRESENCE_LABEL = {
    "none": "Sem site (Alta Prioridade)",
    "social": "Rede social (Instagram/Facebook)",
    "site": "Site próprio"
}

def sanitize_slug(text: str) -> str:
    """
    Sanitiza strings removendo acentos, caracteres especiais e espaços,
    convertendo para snake_case limpo para nomes seguros de arquivo.
    """
    if not text:
        return "geral"
    # Normalização NFKD para decompor caracteres acentuados
    normalized = unicodedata.normalize("NFKD", text)
    # Remove marcas diacríticas (acentos)
    ascii_str = normalized.encode("ASCII", "ignore").decode("ASCII").lower()
    # Substitui qualquer caractere não alfanumérico por underscore
    clean = re.sub(r"[^a-z0-9]+", "_", ascii_str)
    # Remove underscores duplicados e das extremidades
    clean = re.sub(r"_+", "_", clean).strip("_")
    return clean or "geral"

def extract_niche_and_city(query: str) -> Tuple[str, str]:
    """
    Extrai o nicho/área e a cidade/região a partir da query de busca.
    Exemplo: 'Padarias em Centro' -> ('padarias', 'centro')
    """
    if not query:
        return ("leads", "geral")

    parts = re.split(r"\sem\s", query, flags=re.IGNORECASE)
    if len(parts) > 1:
        return (parts[0].strip(), parts[1].strip())

    if "-" in query:
        sub = query.split("-")
        return (sub[0].strip(), "-".join(sub[1:]).strip())

    return (query.strip(), "geral")

def generate_export_filename(query: str = "", extension: str = "csv") -> str:
    """
    Gera o nome dinâmico único padronizado:
    leads_{nicho_ou_area}_{cidade_ou_regiao}_{YYYYMMDD_HHmmss}.{extension}
    Exemplo: leads_padarias_centro_20261004_141000.csv
    """
    niche, city = extract_niche_and_city(query)
    s_niche = sanitize_slug(niche)
    s_city = sanitize_slug(city)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"leads_{s_niche}_{s_city}_{timestamp}.{extension}"

def export_to_csv(leads: List[Dict]) -> str:
    """
    Gera conteúdo CSV formatado com delimitador ';' e compatível com Excel brasileiro.
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow(HEADERS)

    for lead in leads:
        presence = PRESENCE_LABEL.get(lead.get("presence", "none"), "Sem site")
        rating_val = lead.get("rating")
        rating_str = str(rating_val).replace(".", ",") if rating_val is not None else ""
        reviews_val = lead.get("reviews")
        reviews_str = str(reviews_val) if reviews_val is not None else "0"
        hours_str = lead.get("hours_text") or "Não informado"

        writer.writerow([
            lead.get("name", ""),
            lead.get("category", ""),
            lead.get("phone", ""),
            "Sim" if lead.get("whatsapp") else "Não",
            lead.get("email") or "",
            rating_str,
            reviews_str,
            hours_str,
            presence,
            lead.get("website") or "",
            lead.get("address", "")
        ])

    return "\ufeff" + output.getvalue()

def export_to_excel_html(leads: List[Dict]) -> str:
    """
    Gera tabela HTML com MIME Type application/vnd.ms-excel para abertura direta no Microsoft Excel.
    """
    rows = []
    for l in leads:
        presence = PRESENCE_LABEL.get(l.get("presence", "none"), "Sem site")
        rating_val = l.get("rating")
        rating_str = str(rating_val).replace(".", ",") if rating_val is not None else ""
        reviews_val = l.get("reviews")
        reviews_str = str(reviews_val) if reviews_val is not None else "0"
        hours_str = l.get("hours_text") or "Não informado"

        row = (
            f"<tr>"
            f"<td>{l.get('name', '')}</td>"
            f"<td>{l.get('category', '')}</td>"
            f"<td>{l.get('phone', '')}</td>"
            f"<td>{'Sim' if l.get('whatsapp') else 'Não'}</td>"
            f"<td>{l.get('email') or ''}</td>"
            f"<td>{rating_str}</td>"
            f"<td>{reviews_str}</td>"
            f"<td>{hours_str}</td>"
            f"<td>{presence}</td>"
            f"<td>{l.get('website') or ''}</td>"
            f"<td>{l.get('address', '')}</td>"
            f"</tr>"
        )
        rows.append(row)

    table_headers = "".join([f"<th>{h}</th>" for h in HEADERS])
    html = f"""<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Leads</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>
        <table border="1">
            <thead><tr>{table_headers}</tr></thead>
            <tbody>{"".join(rows)}</tbody>
        </table>
    </body>
    </html>"""
    return html
