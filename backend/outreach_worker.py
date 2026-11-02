import asyncio
import datetime
import logging
import random
from collections import deque
from typing import Any, Deque, Dict, List, Optional

import database as db
from adapters.whatsapp_driver import WhatsAppDriver, whatsapp_driver
from keep_awake import keep_awake
from message_generator import generate_outreach_message
from telegram_notifier import TelegramNotifier

logger = logging.getLogger("OutreachWorker")


class OutreachWorker:
    """
    Worker assíncrono para execução autônoma em segundo plano (Unattended Outreach Engine).
    Regras estritas:
      - Governança rígida de volume diário (limite anti-ban).
      - Intervalo com jitter aleatório (sem intervalos fixos).
      - Prevenção de suspensão do Windows via SetThreadExecutionState (keep_awake).
      - Variação dinâmica de texto com Spintax.
      - Alertas via Telegram opcionais.
      - Resiliência total contra falhas em números individuais.
    """

    def __init__(self, driver: Optional[WhatsAppDriver] = None):
        self.driver = driver or whatsapp_driver
        self.is_running = False
        self._stop_requested = False
        self._task: Optional[asyncio.Task] = None

        self.current_lead: Optional[Dict[str, Any]] = None
        self.countdown_seconds: Optional[int] = None
        self.batch_sent_count = 0
        self.started_at: Optional[str] = None

        # Histórico de logs em memória para acompanhamento em tempo real no frontend
        self.logs: Deque[Dict[str, Any]] = deque(maxlen=100)

    def log(self, level: str, message: str, meta: Optional[Dict[str, Any]] = None):
        """Registra um log com timestamp para visualização no frontend."""
        entry = {
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
            "level": level,  # 'info', 'success', 'warning', 'error'
            "message": message,
            "meta": meta or {},
        }
        self.logs.appendleft(entry)
        log_fn = getattr(logger, level if hasattr(logger, level) else "info")
        log_fn(f"[{level.upper()}] {message}")

    def get_notifier(self, config: Dict[str, Any]) -> TelegramNotifier:
        """Instancia o notificador Telegram com os dados atuais do banco."""
        return TelegramNotifier(
            bot_token=config.get("telegram_bot_token"),
            chat_id=config.get("telegram_chat_id"),
        )

    async def start(self) -> Dict[str, Any]:
        """Inicia o worker de disparo em segundo plano."""
        if self.is_running:
            return {"status": "already_running", "message": "O worker já está em execução."}

        config = db.get_config()
        daily_limit = config.get("daily_limit", 25)
        sent_today = db.get_daily_sent_count()

        if sent_today >= daily_limit:
            msg = f"Limite diário de {daily_limit} mensagens já foi atingido hoje ({sent_today} enviadas)."
            self.log("warning", msg)
            return {"status": "limit_reached", "message": msg}

        pending = db.get_next_pending_lead()
        if not pending:
            msg = "Não há leads pendentes na fila para disparo. Sincronize novos leads primeiro."
            self.log("warning", msg)
            return {"status": "queue_empty", "message": msg}

        self.is_running = True
        self._stop_requested = False
        self.batch_sent_count = 0
        self.started_at = datetime.datetime.now().isoformat()
        db.set_running_state(True)

        # 1. Ativa a proteção do Windows contra suspensão/hibernação
        keep_awake.enable()
        self.log("info", "Prevenção de suspensão do Windows ativada (Modo Autônomo).")

        # 2. Notificação remota no Telegram (se configurado)
        stats = db.get_stats()
        notifier = self.get_notifier(config)
        asyncio.create_task(
            notifier.notify_queue_started(
                total_leads=stats.get("pending_count", 0),
                min_delay=config.get("min_delay_seconds", 70),
                max_delay=config.get("max_delay_seconds", 190),
                daily_limit=daily_limit,
            )
        )

        self.log("info", f"Fila de disparo iniciada! Limite diário: {daily_limit} | Enviados hoje: {sent_today}")

        # 3. Cria a tarefa assíncrona principal
        self._task = asyncio.create_task(self._run_loop())
        return {"status": "started", "message": "Fila de disparo iniciada com sucesso em segundo plano."}

    async def stop(self) -> Dict[str, Any]:
        """Sinaliza ao worker para encerrar as operações com segurança."""
        if not self.is_running:
            return {"status": "not_running", "message": "O worker não está rodando."}

        self._stop_requested = True
        self.log("info", "Solicitação de parada recebida. O worker será encerrado com segurança...")

        # Aguarda o cancelamento do timer de countdown se houver
        if self.countdown_seconds is not None:
            self.countdown_seconds = None

        return {"status": "stopping", "message": "Parando fila de disparo..."}

    async def _run_loop(self):
        """Loop principal do worker com governança e resiliência a falhas."""
        try:
            while not self._stop_requested:
                config = db.get_config()
                daily_limit = config.get("daily_limit", 25)
                min_delay = config.get("min_delay_seconds", 70)
                max_delay = config.get("max_delay_seconds", 190)

                # Regra 1: Governança rígida de volume diário
                sent_today = db.get_daily_sent_count()
                if sent_today >= daily_limit:
                    self.log(
                        "warning",
                        f"🛑 Limite diário alcançado ({sent_today}/{daily_limit}). Encerrando fila por segurança.",
                    )
                    notifier = self.get_notifier(config)
                    await notifier.notify_daily_limit_reached(sent_today=sent_today, daily_limit=daily_limit)
                    break

                # Regra 2: Busca o próximo lead pendente
                lead = db.get_next_pending_lead()
                if not lead:
                    self.log("info", "🏁 Todos os leads da fila foram processados!")
                    notifier = self.get_notifier(config)
                    await notifier.notify_queue_completed(sent_today=sent_today)
                    break

                self.current_lead = lead
                lead_id = lead["id"]
                phone = lead["phone"]
                company = lead.get("company_name") or "Empresa"
                city = lead.get("city") or ""

                # Marca como em processamento (queued)
                db.update_lead_status(lead_id, "queued")
                self.log("info", f"Preparando envio para: {company} ({phone}) em {city}...")

                # Regra 3: Geração dinâmica de texto com Spintax e preferência para texto adaptado
                custom_msg = (lead.get("custom_message") or "").strip()
                if custom_msg:
                    from message_generator import resolve_spintax
                    message = resolve_spintax(custom_msg) if ("{" in custom_msg and "|" in custom_msg) else custom_msg
                else:
                    message = generate_outreach_message(lead)

                # Regra 4: Disparo via WhatsAppDriver.send_direct_message() com isolamento de erros
                try:
                    result = await self.driver.send_direct_message(phone=phone, message=message)
                    success = bool(result.get("success"))
                    error_reason = result.get("error")
                except Exception as exc:
                    success = False
                    error_reason = f"Exceção no driver: {str(exc)}"

                if self._stop_requested:
                    # Se foi pedido stop durante o envio, atualiza status e sai
                    if success:
                        db.update_lead_status(lead_id, "sent")
                        self.log("success", f"Enviado para {company} antes de parar.")
                    else:
                        db.update_lead_status(lead_id, "failed", error_message=error_reason or "Interrompido")
                    break

                if success:
                    db.update_lead_status(lead_id, "sent")
                    self.batch_sent_count += 1
                    sent_today += 1
                    self.log(
                        "success",
                        f"✅ Mensagem enviada com sucesso para {company} ({phone})!",
                        meta={"lead_id": lead_id, "phone": phone, "company": company},
                    )

                    # Alerta periódico no Telegram a cada 5 envios
                    if self.batch_sent_count % 5 == 0:
                        stats = db.get_stats()
                        notifier = self.get_notifier(config)
                        await notifier.notify_progress(
                            sent_today=sent_today,
                            daily_limit=daily_limit,
                            pending=stats.get("pending_count", 0),
                            last_company=company,
                            last_phone=phone,
                        )
                else:
                    db.update_lead_status(lead_id, "failed", error_message=error_reason)
                    if error_reason == "not_whatsapp":
                        self.log(
                            "warning",
                            f"⚠️ Número {phone} ({company}) não possui WhatsApp ativo (not_whatsapp). Continuando fila normalmente...",
                            meta={"lead_id": lead_id, "phone": phone, "company": company, "error": "not_whatsapp"},
                        )
                    else:
                        self.log(
                            "error",
                            f"❌ Falha ao contatar {company} ({phone}): {error_reason}",
                            meta={"lead_id": lead_id, "phone": phone, "company": company, "error": error_reason},
                        )

                self.current_lead = None

                # Checa se ainda há leads e se o limite diário não foi atingido
                remaining_pending = db.get_next_pending_lead()
                if not remaining_pending or sent_today >= daily_limit or self._stop_requested:
                    continue

                # Regra 5: Intervalo aleatório com Jitter (PROIBIDO INTERVALO FIXO)
                delay = random.randint(min_delay, max_delay)
                self.log(
                    "info",
                    f"⏱️ Aguardando intervalo de segurança anti-banimento: {delay} segundos antes do próximo envio...",
                )

                # Loop de contagem regressiva em segundos para atualizar o painel do frontend
                for remaining in range(delay, 0, -1):
                    if self._stop_requested:
                        break
                    self.countdown_seconds = remaining
                    await asyncio.sleep(1.0)

                self.countdown_seconds = None

        except asyncio.CancelledError:
            self.log("info", "Worker de disparo cancelado externamente.")
        except Exception as exc:
            logger.error(f"[WORKER CRITICAL] Erro inesperado no loop principal: {exc}", exc_info=True)
            self.log("error", f"Erro crítico no loop de disparo: {str(exc)}")
        finally:
            self.is_running = False
            self._stop_requested = False
            self.current_lead = None
            self.countdown_seconds = None
            db.set_running_state(False)

            # Restaura o gerenciamento de energia normal do Windows
            keep_awake.disable()
            try:
                await self.driver.close()
            except Exception:
                pass
            self.log("info", "Fila de disparo finalizada. Estado do PC restaurado.")

    def get_status(self) -> Dict[str, Any]:
        """Retorna o estado detalhado do worker e métricas atuais."""
        stats = db.get_stats()
        config = db.get_config()

        return {
            "is_running": self.is_running,
            "stop_requested": self._stop_requested,
            "started_at": self.started_at,
            "keep_awake_active": keep_awake.is_active,
            "countdown_seconds": self.countdown_seconds,
            "batch_sent_count": self.batch_sent_count,
            "current_lead": self.current_lead,
            "stats": stats,
            "config": {
                "min_delay_seconds": config.get("min_delay_seconds", 70),
                "max_delay_seconds": config.get("max_delay_seconds", 190),
                "daily_limit": config.get("daily_limit", 25),
                "telegram_configured": bool(config.get("telegram_bot_token") and config.get("telegram_chat_id")),
            },
            "logs": list(self.logs)[:30],  # 30 logs mais recentes
        }


# Instância singleton do worker de disparo
outreach_worker = OutreachWorker()

