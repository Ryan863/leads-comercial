import asyncio
import json
import logging
import os
import sys
import uuid

# Garante ProactorEventLoop no Windows para suporte ao Playwright (subprocess_exec)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from typing import Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field, field_validator

# Carrega variáveis de ambiente
load_dotenv()

# Configuração avançada de logs no terminal
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("SondarAPI")

from scraper import LeadScraper
from exporter import export_to_csv, export_to_excel_html, generate_export_filename

app = FastAPI(
    title="Sondar Scraper Engine API",
    description="Motor de busca e raspagem B2B headless sob demanda do Sondar",
    version="2.0.0",
)

# Habilita CORS amplo para desenvolvimento local e integração com Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchJob:
    def __init__(self, job_id: str, query: str, quantity: int, source: str):
        self.job_id = job_id
        self.query = query
        self.quantity = quantity
        self.source = source
        self.status = "queued"  # queued, processing, completed, error
        self.leads: List[Dict] = []
        self.error: Optional[str] = None
        self.queue: asyncio.Queue = asyncio.Queue()
        self.emitted_ids = set()


jobs: Dict[str, SearchJob] = {}
scraper_instance = LeadScraper()


class SearchRequest(BaseModel):
    query: str = Field(..., description="Termo de pesquisa (Ex: 'Pizzarias em Videira - SC')")
    quantity: int = Field(10, ge=1, le=100, description="Quantidade desejada de leads (1 a 100)")
    source: str = Field("auto", description="'auto', 'gmaps' ou 'osm'")

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("O termo de pesquisa 'query' não pode ser vazio ou conter apenas espaços.")
        clean_v = v.strip()
        if len(clean_v) < 2:
            raise ValueError("O termo de pesquisa deve conter pelo menos 2 caracteres.")
        return clean_v


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware de diagnóstico para logar todas as requisições HTTP."""
    client_host = request.client.host if request.client else "unknown"
    logger.debug(f"[HTTP IN] {request.method} {request.url.path} de {client_host}")
    try:
        response = await call_next(request)
        logger.debug(f"[HTTP OUT] {request.method} {request.url.path} -> Status {response.status_code}")
        return response
    except Exception as exc:
        logger.error(f"[HTTP EXC] Falha não tratada em {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Erro interno no servidor de varredura", "detail": str(exc)}
        )


@app.get("/api/health")
async def health_check():
    """Endpoint de checagem de integridade e diagnósticos."""
    payload = {
        "status": "online",
        "service": "Sondar Scraper Engine",
        "version": "2.0.0",
        "active_jobs": len(jobs),
        "environment": {
            "python_version": sys.version.split()[0],
            "os": sys.platform,
            "log_level": LOG_LEVEL
        }
    }
    logger.info(f"[HEALTH CHECK] Status: online | Jobs ativos: {len(jobs)}")
    return payload


async def _run_scraper_task(job: SearchJob):
    """Executa a raspagem em segundo plano e despacha eventos no canal SSE."""
    job.status = "processing"
    logger.info(f"[JOB {job.job_id}] INICIADO | Query: '{job.query}' | Desejado: {job.quantity} | Fonte: '{job.source}'")

    try:
        async for lead in scraper_instance.scrape(
            query=job.query,
            max_results=job.quantity,
            source=job.source
        ):
            lead_id = lead.get("id") or str(uuid.uuid4())
            if lead_id not in job.emitted_ids:
                job.emitted_ids.add(lead_id)
                job.leads.append(lead)

                event = {
                    "type": "lead",
                    "data": lead,
                    "current": len(job.leads),
                    "total": job.quantity
                }
                await job.queue.put(event)
                logger.info(f"[JOB {job.job_id}] Lead capturado [{len(job.leads)}/{job.quantity}]: '{lead.get('name')}'")

        job.status = "completed"
        done_event = {
            "type": "done",
            "current": len(job.leads),
            "total": job.quantity,
            "message": "Varredura concluída com sucesso."
        }
        await job.queue.put(done_event)
        logger.info(f"[JOB {job.job_id}] FINALIZADO COM SUCESSO | Total de leads entregues: {len(job.leads)}")

    except Exception as e:
        job.status = "error"
        job.error = str(e)
        logger.error(f"[JOB {job.job_id}] ERRO NA VARREDURA: {type(e).__name__}: {e}", exc_info=True)
        error_event = {
            "type": "error",
            "message": f"Falha na varredura: {str(e)}",
            "current": len(job.leads),
            "total": job.quantity
        }
        await job.queue.put(error_event)


@app.post("/api/search")
async def start_search(req: SearchRequest, background_tasks: BackgroundTasks, request: Request):
    """Inicia uma nova tarefa de varredura assíncrona."""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[PAYLOAD ENTRADA /api/search] Cliente: {client_ip} | query='{req.query}' | quantity={req.quantity} | source='{req.source}'")

    job_id = str(uuid.uuid4())
    job = SearchJob(
        job_id=job_id,
        query=req.query,
        quantity=req.quantity,
        source=req.source
    )
    jobs[job_id] = job

    # Dispara a tarefa no background do FastAPI
    background_tasks.add_task(_run_scraper_task, job)

    response_payload = {
        "id": job_id,
        "status": "processing",
        "query": job.query,
        "quantity": job.quantity,
        "source": job.source,
        "stream_url": f"/api/search/{job_id}/stream",
        "status_url": f"/api/search/{job_id}/status"
    }

    logger.info(f"[PAYLOAD SAÍDA /api/search] Job Criado: {job_id} | Status: processing")
    return response_payload


@app.get("/api/search/{job_id}/status")
async def get_search_status(job_id: str):
    """Consulta o status síncrono e leads acumulados de uma varredura."""
    if job_id not in jobs:
        logger.warning(f"[STATUS] Tentativa de consulta para Job inexistente: {job_id}")
        raise HTTPException(status_code=404, detail="Job de busca não encontrado.")

    job = jobs[job_id]
    return {
        "id": job.job_id,
        "status": job.status,
        "query": job.query,
        "quantity": job.quantity,
        "count": len(job.leads),
        "leads": job.leads,
        "error": job.error
    }


@app.get("/api/search/{job_id}/stream")
async def stream_search_results(job_id: str, request: Request):
    """Transmite os leads em tempo real via Server-Sent Events (SSE)."""
    if job_id not in jobs:
        logger.warning(f"[STREAM] Conexão SSE rejeitada. Job inexistente: {job_id}")
        raise HTTPException(status_code=404, detail="Busca não encontrada.")

    job = jobs[job_id]
    logger.info(f"[STREAM SSE INICIADO] Conexão aberta para o Job: {job_id}")

    async def event_generator():
        sent_lead_ids = set()

        # 1. Envia leads que já foram processados antes da conexão conectar
        for lead in list(job.leads):
            lead_id = lead.get("id")
            if lead_id and lead_id not in sent_lead_ids:
                sent_lead_ids.add(lead_id)
                data = json.dumps({
                    "type": "lead",
                    "data": lead,
                    "current": len(sent_lead_ids),
                    "total": job.quantity
                })
                yield f"data: {data}\n\n"

        # Se o job já estiver finalizado
        if job.status == "completed":
            done_data = json.dumps({
                "type": "done",
                "current": len(job.leads),
                "total": job.quantity
            })
            yield f"data: {done_data}\n\n"
            logger.info(f"[STREAM SSE] Job {job_id} já concluído. Stream encerrado.")
            return

        if job.status == "error":
            err_data = json.dumps({
                "type": "error",
                "message": job.error or "Erro durante o processamento."
            })
            yield f"data: {err_data}\n\n"
            return

        # 2. Aguarda novos eventos em tempo real
        while True:
            if await request.is_disconnected():
                logger.info(f"[STREAM SSE] Cliente desconectou voluntariamente da conexão do Job {job_id}")
                break

            try:
                # Heartbeat de 15 segundos para manter a conexão ativa contra timeouts de proxies/browsers
                event = await asyncio.wait_for(job.queue.get(), timeout=15.0)

                # Evita duplicar leads já enviados no handshake inicial
                if event.get("type") == "lead":
                    l_id = event.get("data", {}).get("id")
                    if l_id in sent_lead_ids:
                        continue
                    if l_id:
                        sent_lead_ids.add(l_id)

                data = json.dumps(event)
                yield f"data: {data}\n\n"

                if event.get("type") in ("done", "error"):
                    logger.info(f"[STREAM SSE] Evento terminal '{event.get('type')}' enviado para Job {job_id}. Encerrando stream.")
                    break

            except asyncio.TimeoutError:
                # Ping SSE keep-alive
                yield f": ping\n\n"
            except asyncio.CancelledError:
                logger.info(f"[STREAM SSE] Conexão cancelada para Job {job_id}")
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.get("/api/leads/export")
async def export_leads(
    job_id: Optional[str] = Query(None, description="ID do job para exportar"),
    format: str = Query("csv", pattern="^(csv|excel)$"),
    query: Optional[str] = Query(None, description="Termo de pesquisa para contextualizar o nome do arquivo exportado")
):
    """Exporta os leads capturados em formato CSV ou Excel com nomenclatura contextual sanitizada."""
    logger.info(f"[EXPORT] Solicitação de exportação: job_id={job_id} | format={format}")
    search_query = query or ""
    if job_id:
        if job_id not in jobs:
            raise HTTPException(status_code=404, detail="Job de busca não encontrado.")
        leads = jobs[job_id].leads
        if not search_query and jobs[job_id].query:
            search_query = jobs[job_id].query
    else:
        leads = []
        for j in jobs.values():
            leads.extend(j.leads)
            if not search_query and j.query:
                search_query = j.query

    if not leads:
        logger.warning("[EXPORT] Falha: nenhum lead disponível para exportação.")
        raise HTTPException(status_code=400, detail="Nenhum lead disponível para exportação.")

    ext = "csv" if format == "csv" else "xls"
    filename = generate_export_filename(search_query, extension=ext)

    if format == "csv":
        content = export_to_csv(leads)
        return Response(
            content=content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:
        content = export_to_excel_html(leads)
        return Response(
            content=content,
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"[*] Iniciando servidor local na porta {port} ({host})...")
    uvicorn.run("main:app", host=host, port=port, reload=True)
