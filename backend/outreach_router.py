import asyncio
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

import database as db
from adapters.whatsapp_driver import whatsapp_driver
from outreach_worker import outreach_worker

logger = logging.getLogger("OutreachRouter")
router = APIRouter(tags=["Unattended Outreach"])


class SyncLeadsRequest(BaseModel):
    leads: List[Dict[str, Any]] = Field(..., description="Lista de leads minerados para sincronização com o banco")


class UpdateConfigRequest(BaseModel):
    min_delay_seconds: Optional[int] = Field(None, ge=15, le=600, description="Tempo mínimo em segundos entre envios")
    max_delay_seconds: Optional[int] = Field(None, ge=20, le=900, description="Tempo máximo em segundos entre envios")
    daily_limit: Optional[int] = Field(None, ge=1, le=100, description="Limite diário máximo de mensagens disparadas")
    telegram_bot_token: Optional[str] = Field(None, description="Token do bot do Telegram")
    telegram_chat_id: Optional[str] = Field(None, description="Chat ID de destino para alertas")


@router.post("/sync-leads")
async def sync_leads_endpoint(payload: SyncLeadsRequest):
    """
    Recebe leads minerados pelo Radar atual e salva no SQLite local (outreach.db).
    Ignora automaticamente números já existentes na base para evitar duplicidade.
    """
    if not payload.leads:
        raise HTTPException(status_code=400, detail="Nenhum lead fornecido para sincronização.")

    inserted, ignored = db.sync_leads(payload.leads)
    stats = db.get_stats()

    outreach_worker.log(
        "info",
        f"Sincronizados {inserted} novos leads para a fila ({ignored} duplicados/ignorados).",
    )

    return {
        "success": True,
        "synced": inserted,
        "duplicates_ignored": ignored,
        "total_pending": stats["pending_count"],
        "total_leads": stats["total_leads"],
    }


@router.get("/status")
async def get_outreach_status():
    """
    Retorna o status em tempo real da fila de disparo:
    se o worker está rodando, leads enviados hoje, pendentes, contagem regressiva e logs recentes.
    """
    return outreach_worker.get_status()


@router.post("/start")
async def start_outreach():
    """
    Inicia o worker de disparo autônomo em segundo plano com regras estritas de segurança,
    prevenção de suspensão do Windows (keep_awake) e intervalos variáveis.
    """
    result = await outreach_worker.start()
    if result.get("status") in ("limit_reached", "queue_empty"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.post("/stop")
async def stop_outreach():
    """
    Pausa a fila com segurança após o envio do lead atual ser concluído.
    """
    return await outreach_worker.stop()


@router.put("/config")
async def update_outreach_config(cfg: UpdateConfigRequest):
    """
    Atualiza limites de cadência, limites diários e credenciais de alerta via Telegram.
    """
    updated = db.update_config(
        min_delay_seconds=cfg.min_delay_seconds,
        max_delay_seconds=cfg.max_delay_seconds,
        daily_limit=cfg.daily_limit,
        telegram_bot_token=cfg.telegram_bot_token,
        telegram_chat_id=cfg.telegram_chat_id,
    )
    outreach_worker.log("info", "Configurações de disparo atualizadas.")
    return {"success": True, "config": updated}


@router.get("/leads")
async def list_outreach_leads(
    status: Optional[str] = Query(None, description="Filtro de status: 'pending', 'sent', 'failed' ou 'all'"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Lista os leads cadastrados na fila local do SQLite com paginação e status.
    """
    leads = db.get_leads(status=status, limit=limit, offset=offset)
    stats = db.get_stats()
    return {
        "leads": leads,
        "stats": stats,
        "limit": limit,
        "offset": offset,
    }


@router.post("/reset-failed")
async def reset_failed_leads():
    """
    Reseta os leads marcados como 'failed' de volta para 'pending' para que possam ser reprocessados.
    """
    count = db.reset_failed_leads()
    outreach_worker.log("info", f"{count} leads com falha foram redefinidos para 'pending'.")
    return {"success": True, "reset_count": count}


@router.delete("/clear")
async def clear_outreach_queue(only_pending: bool = Query(True)):
    """
    Limpa a fila de leads pendentes no banco SQLite.
    """
    if outreach_worker.is_running:
        raise HTTPException(status_code=400, detail="Não é possível limpar a fila enquanto o worker estiver rodando.")

    count = db.clear_queue(only_pending=only_pending)
    outreach_worker.log("info", f"Fila limpa: {count} registros removidos.")
    return {"success": True, "deleted_count": count}


@router.get("/whatsapp/status")
async def get_whatsapp_status():
    """
    Retorna {"connected": true/false} verificando rapidamente a existência e a validade da sessão salva.
    Inclui qr_code em base64 para exibição direta no frontend durante a conexão.
    """
    connected = await whatsapp_driver.is_logged_in()
    return {
        "connected": connected,
        "is_connecting": whatsapp_driver.is_connecting,
        "qr_code": whatsapp_driver.current_qr_code if not connected else None,
        "status": "connected" if connected else ("connecting" if whatsapp_driver.is_connecting else "disconnected")
    }


@router.post("/whatsapp/connect")
async def connect_whatsapp():
    """
    Dispara a abertura da janela com open_for_qr_code() em segundo plano para o usuário autenticar.
    """
    if whatsapp_driver.is_connecting:
        return {
            "success": True,
            "status": "already_connecting",
            "message": "Uma janela do navegador já está aberta aguardando leitura do QR Code."
        }

    asyncio.create_task(whatsapp_driver.open_for_qr_code())
    return {
        "success": True,
        "status": "connecting",
        "message": "Janela do navegador aberta. Aponte a câmera do celular no WhatsApp > Aparelhos Conectados e leia o QR Code."
    }


@router.post("/whatsapp/disconnect")
async def disconnect_whatsapp():
    """
    Limpa a pasta .wpp_session, permitindo trocar de número ou reiniciar a conexão.
    """
    return await whatsapp_driver.disconnect()


