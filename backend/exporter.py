import csv
import io
from typing import List, Dict

HEADERS = [
    "Nome",
    "Categoria",
    "Telefone",
    "WhatsApp",
    "E-mail",
    "Avaliação",
    "Avaliações",
    "Presença Web",
    "Website",
    "Endereço"
]

PRESENCE_LABEL = {
    "none": "Sem site (Alta Prioridade)",
    "social": "Rede social (Instagram/Facebook)",
    "site": "Site próprio"
}

def export_to_csv(leads: List[Dict]) -> str:
    """
    Gera conteúdo CSV formatado com delimitador ';' e compatível com Excel brasileiro.
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow(HEADERS)

    for lead in leads:
        presence = PRESENCE_LABEL.get(lead.get("presence", "none"), "Sem site")
        writer.writerow([
            lead.get("name", ""),
            lead.get("category", ""),
            lead.get("phone", ""),
            "Sim" if lead.get("whatsapp") else "Não",
            lead.get("email") or "",
            str(lead.get("rating", "")).replace(".", ","),
            str(lead.get("reviews", "")),
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
        row = (
            f"<tr>"
            f"<td>{l.get('name', '')}</td>"
            f"<td>{l.get('category', '')}</td>"
            f"<td>{l.get('phone', '')}</td>"
            f"<td>{'Sim' if l.get('whatsapp') else 'Não'}</td>"
            f"<td>{l.get('email') or ''}</td>"
            f"<td>{str(l.get('rating', '')).replace('.', ',')}</td>"
            f"<td>{l.get('reviews', '')}</td>"
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
