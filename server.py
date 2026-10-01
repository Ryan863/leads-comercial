import io
import os
import time
import urllib.parse
from typing import Optional, List
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
import pandas as pd

from scraper import (
    scrape_google_maps_leads,
    get_demo_leads,
    classify_lead_status,
    ensure_playwright_installed
)

app = FastAPI(
    title="Leads Radar API",
    description="API de Extração Comercial e Diagnóstico de Leads do Google Maps",
    version="3.0.0"
)

# Garantir pasta static
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

class SearchRequest(BaseModel):
    query: str
    max_results: int = 15
    headless: bool = True
    pause_time: float = 1.5
    is_demo: bool = False

class ExportRequest(BaseModel):
    leads: List[dict]
    filename: Optional[str] = "leads_google_maps"


@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": time.time(), "version": "3.0.0"}


@app.get("/api/leads/demo")
def get_demo(query: str = Query(default="Pizzarias em Videira - SC")):
    """Retorna leads demonstrativos de alta fidelidade para navegação e testes instantâneos."""
    leads = get_demo_leads(query)
    return {
        "status": "success",
        "total": len(leads),
        "query": query,
        "leads": leads,
        "is_demo": True
    }


@app.post("/api/leads/search")
def search_leads(req: SearchRequest):
    """Executa a varredura real via Playwright ou retorna demo se solicitado."""
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="O termo de pesquisa é obrigatório.")

    if req.is_demo:
        leads = get_demo_leads(query)
        return {
            "status": "success",
            "total": len(leads),
            "query": query,
            "leads": leads,
            "is_demo": True
        }

    try:
        # Executa a extração real pelo Playwright
        ensure_playwright_installed()
        extracted = scrape_google_maps_leads(
            query=query,
            max_results=min(max(req.max_results, 3), 100),
            headless=req.headless,
            pause_min=req.pause_time,
            pause_max=req.pause_time + 0.6
        )

        # Se a busca real não retornou itens (bloqueio ou local sem dados), mescla com sugestões inteligentes
        if not extracted:
            return {
                "status": "empty",
                "total": 0,
                "query": query,
                "leads": [],
                "message": "Nenhum estabelecimento encontrado para a busca informada. Tente refinar o local ou categoria."
            }

        return {
            "status": "success",
            "total": len(extracted),
            "query": query,
            "leads": extracted,
            "is_demo": False
        }

    except Exception as err:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Erro durante a extração: {str(err)}",
                "query": query
            }
        )


@app.post("/api/leads/export/csv")
def export_csv(req: ExportRequest):
    """Gera e retorna um arquivo CSV (UTF-8 com BOM para Excel no Windows)."""
    if not req.leads:
        raise HTTPException(status_code=400, detail="Nenhum lead fornecido para exportação.")

    df = pd.DataFrame(req.leads)
    # Remove colunas internas
    cols_to_drop = [c for c in ["id", "MapsUrl"] if c in df.columns]
    export_df = df.drop(columns=cols_to_drop)

    csv_data = export_df.to_csv(index=False, sep=";").encode("utf-8-sig")
    filename = f"{req.filename}_{int(time.time())}.csv"

    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.post("/api/leads/export/excel")
def export_excel(req: ExportRequest):
    """Gera e retorna um arquivo Excel (.xlsx)."""
    if not req.leads:
        raise HTTPException(status_code=400, detail="Nenhum lead fornecido para exportação.")

    df = pd.DataFrame(req.leads)
    cols_to_drop = [c for c in ["id", "MapsUrl"] if c in df.columns]
    export_df = df.drop(columns=cols_to_drop)

    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
        export_df.to_excel(writer, index=False, sheet_name="Leads Extraídos")
        worksheet = writer.sheets["Leads Extraídos"]
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            worksheet.column_dimensions[col_letter].width = max(max_len + 3, 14)

    excel_data = excel_buffer.getvalue()
    filename = f"{req.filename}_{int(time.time())}.xlsx"

    return StreamingResponse(
        io.BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Rota principal e assets para a Single Page Application
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/")
def serve_index():
    index_file = os.path.join(ROOT_DIR, "index.html")
    if not os.path.exists(index_file):
        index_file = os.path.join(STATIC_DIR, "index.html")
    return FileResponse(index_file)


@app.get("/style.css")
def serve_root_css():
    css_file = os.path.join(ROOT_DIR, "style.css")
    if not os.path.exists(css_file):
        css_file = os.path.join(STATIC_DIR, "style.css")
    return FileResponse(css_file, media_type="text/css")


@app.get("/app.js")
def serve_root_js():
    js_file = os.path.join(ROOT_DIR, "app.js")
    if not os.path.exists(js_file):
        js_file = os.path.join(STATIC_DIR, "app.js")
    return FileResponse(js_file, media_type="application/javascript")


# Montar arquivos estáticos (CSS, JS, imagens)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Iniciando Servidor Leads Radar em http://localhost:8000 ...")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
