import asyncio
import json
import uuid
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from scraper import LeadScraper
from exporter import export_to_csv, export_to_excel_html

app = FastAPI(
    title="LeadRadar Scraper Engine API",
    description="Motor de busca e raspagem B2B headless sob demanda sem custos de API externa",
    version="1.0.0",
)

# Habilita CORS para o front-end Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Armazenamento em memória das tarefas de raspagem
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

jobs: Dict[str, SearchJob] = {}
scraper_instance = LeadScraper()


class SearchRequest(BaseModel):
    query: str = Field(..., description="Termo de pesquisa (Ex: 'Pizzarias em Videira - SC')")
    quantity: int = Field(10, ge=1, le=100, description="Quantidade desejada de leads")
    source: str = Field("auto", description="'auto', 'gmaps' ou 'osm'")


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "engine": "Playwright Headless + Stealth & OSM Fallback",
        "zero_cost_mode": True,
        "active_jobs": len(jobs)
    }


async def _run_scraper_task(job: SearchJob):
    job.status = "processing"
    try:
        async for lead in scraper_instance.scrape(
            query=job.query,
            max_results=job.quantity,
            source=job.source
        ):
            job.leads.append(lead)
            # Envia evento para a fila do SSE
            await job.queue.put({
                "type": "lead",
                "data": lead,
                "current": len(job.leads),
                "total": job.quantity
            })

        job.status = "completed"
        await job.queue.put({
            "type": "done",
            "current": len(job.leads),
            "total": job.quantity
        })
    except Exception as e:
        job.status = "error"
        job.error = str(e)
        await job.queue.put({"type": "error", "message": str(e)})


@app.post("/api/search")
async def start_search(req: SearchRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    job = SearchJob(
        job_id=job_id,
        query=req.query.strip(),
        quantity=req.quantity,
        source=req.source
    )
    jobs[job_id] = job

    # Dispara a raspagem de forma assíncrona em background
    background_tasks.add_task(_run_scraper_task, job)

    return {
        "id": job_id,
        "status": "processing",
        "query": job.query,
        "quantity": job.quantity,
        "stream_url": f"/api/search/{job_id}/stream",
        "status_url": f"/api/search/{job_id}/status"
    }


@app.get("/api/search/{job_id}/status")
async def get_search_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Busca não encontrada.")
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
async def stream_search_results(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Busca não encontrada.")

    job = jobs[job_id]

    async def event_generator():
        # Primeiro, envia os leads já capturados até o momento
        for lead in job.leads:
            data = json.dumps({"type": "lead", "data": lead})
            yield f"data: {data}\n\n"

        if job.status == "completed":
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        # Aguarda novos leads em tempo real
        while True:
            try:
                event = await asyncio.wait_for(job.queue.get(), timeout=35.0)
                data = json.dumps(event)
                yield f"data: {data}\n\n"

                if event.get("type") in ("done", "error"):
                    break
            except asyncio.TimeoutError:
                # Envia ping de heartbeat para manter a conexão SSE viva
                yield f": ping\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/leads/export")
async def export_leads(
    job_id: Optional[str] = Query(None, description="ID do job para exportar"),
    format: str = Query("csv", pattern="^(csv|excel)$")
):
    if job_id:
        if job_id not in jobs:
            raise HTTPException(status_code=404, detail="Job de busca não encontrado.")
        leads = jobs[job_id].leads
    else:
        # Se não passar job_id, junta todos os leads da sessão
        leads = []
        for j in jobs.values():
            leads.extend(j.leads)

    if not leads:
        raise HTTPException(status_code=400, detail="Nenhum lead disponível para exportação.")

    if format == "csv":
        content = export_to_csv(leads)
        return Response(
            content=content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=leads-radar.csv"}
        )
    else:
        content = export_to_excel_html(leads)
        return Response(
            content=content,
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": "attachment; filename=leads-radar.xls"}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
