import asyncio
import datetime
import logging
import random
import subprocess
import sys
from collections import deque
from typing import Any, Deque, Dict, List, Optional

import database as db
from adapters.whatsapp_driver import WhatsAppDriver, whatsapp_driver, whatsapp_driver_2
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
        self.driver_2 = whatsapp_driver_2
        self.active_account: int = 1
        self.is_running = False
        self._stop_requested = False
        self._task: Optional[asyncio.Task] = None

        self.current_lead: Optional[Dict[str, Any]] = None
        self.countdown_seconds: Optional[int] = None
        self.batch_sent_count = 0
        self.started_at: Optional[str] = None
        self.scheduled_for: Optional[str] = None
        self.waiting_for_schedule: bool = False
        self._scheduled_target_dt: Optional[datetime.datetime] = None
        self.shutdown_on_complete: bool = False

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

    async def start(self, scheduled_time: Optional[str] = None, shutdown_on_complete: bool = False) -> Dict[str, Any]:
        """Inicia o worker de disparo em segundo plano (imediatamente ou agendado para HH:MM, com desligamento opcional)."""
        if self.is_running:
            return {"status": "already_running", "message": "O worker já está em execução."}

        config = db.get_config()
        limit_per_account = config.get("daily_limit", 25)
        acc1_ready = await self.driver.is_logged_in()
        acc2_ready = await self.driver_2.is_logged_in()
        connected_accounts = (1 if acc1_ready else 0) + (1 if acc2_ready else 0)
        effective_daily_limit = limit_per_account * max(1, connected_accounts)
        sent_today = db.get_daily_sent_count()

        target_dt: Optional[datetime.datetime] = None
        clean_sched = (scheduled_time or "").strip()
        if clean_sched:
            try:
                parts = clean_sched.split(":")
                hour, minute = int(parts[0]), int(parts[1])
                now = datetime.datetime.now()
                candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if candidate <= now:
                    candidate += datetime.timedelta(days=1)
                target_dt = candidate
            except Exception:
                return {"status": "invalid_schedule", "message": "Horário de agendamento inválido. Use o formato HH:MM."}

        # Se for iniciar agora (ou agendado para hoje mesmo), valida limite diário total das contas conectadas
        is_for_tomorrow = bool(target_dt and target_dt.date() > datetime.datetime.now().date())
        if not is_for_tomorrow and sent_today >= effective_daily_limit:
            msg = f"Limite diário de {effective_daily_limit} mensagens já foi atingido hoje ({sent_today} enviadas). Dica: você pode agendar para amanhã de manhã ou de tarde!"
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
        self._scheduled_target_dt = target_dt
        self.scheduled_for = target_dt.strftime("%H:%M") if target_dt else None
        self.waiting_for_schedule = bool(target_dt)
        self.shutdown_on_complete = bool(shutdown_on_complete)
        self.active_account = 1 if acc1_ready else 2
        db.set_running_state(True)

        # 1. Ativa a proteção do Windows contra suspensão/hibernação
        keep_awake.enable()
        self.log("info", "Prevenção de suspensão do Windows ativada (Modo Autônomo).")
        if self.shutdown_on_complete:
            self.log("info", "🔌 Desligamento automático do PC ativado: o Windows será desligado quando a fila terminar.")
        if acc1_ready and acc2_ready:
            self.log("info", f"📱📱 Modo 2 Contas ativo! Enviará {limit_per_account} na Conta 1 + {limit_per_account} na Conta 2 (Total: {effective_daily_limit}/dia).")

        if target_dt:
            day_label = "amanhã" if is_for_tomorrow else "hoje"
            self.log(
                "info",
                f"⏰ Disparo agendado para {day_label} às {self.scheduled_for}! O PC ficará acordado e iniciará automaticamente no horário.",
            )
        else:
            # 2. Notificação remota no Telegram (se configurado)
            stats = db.get_stats()
            notifier = self.get_notifier(config)
            asyncio.create_task(
                notifier.notify_queue_started(
                    total_leads=stats.get("pending_count", 0),
                    min_delay=config.get("min_delay_seconds", 70),
                    max_delay=config.get("max_delay_seconds", 190),
                    daily_limit=effective_daily_limit,
                )
            )
            self.log("info", f"Fila de disparo iniciada! Limite diário: {effective_daily_limit} | Enviados hoje: {sent_today}")

        # 3. Cria a tarefa assíncrona principal
        self._task = asyncio.create_task(self._run_loop())
        return {
            "status": "scheduled" if target_dt else "started",
            "scheduled_for": self.scheduled_for,
            "shutdown_on_complete": self.shutdown_on_complete,
            "message": (
                f"Disparo agendado com sucesso para às {self.scheduled_for}."
                if target_dt
                else "Fila de disparo iniciada com sucesso em segundo plano."
            ),
        }

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
        """Loop principal do worker com governança, agendamento e resiliência a falhas."""
        try:
            # Se houver agendamento futuro (ex: agendou à noite para disparar às 09:00 ou 13:30), aguarda o horário
            if self._scheduled_target_dt:
                while not self._stop_requested:
                    now = datetime.datetime.now()
                    diff = int((self._scheduled_target_dt - now).total_seconds())
                    if diff <= 0:
                        break
                    self.waiting_for_schedule = True
                    self.countdown_seconds = diff
                    await asyncio.sleep(1.0)

                self.waiting_for_schedule = False
                self.countdown_seconds = None
                if self._stop_requested:
                    return

                self.log("info", f"⏰ Horário agendado ({self.scheduled_for}) chegou! Iniciando disparos automaticamente...")
                self.scheduled_for = None
                self._scheduled_target_dt = None

                # Avisa no Telegram que o disparo agendado começou
                cfg_now = db.get_config()
                stats_now = db.get_stats()
                asyncio.create_task(
                    self.get_notifier(cfg_now).notify_queue_started(
                        total_leads=stats_now.get("pending_count", 0),
                        min_delay=cfg_now.get("min_delay_seconds", 70),
                        max_delay=cfg_now.get("max_delay_seconds", 190),
                        daily_limit=cfg_now.get("daily_limit", 25),
                    )
                )

            completed_naturally = False

            while not self._stop_requested:
                config = db.get_config()
                limit_per_account = config.get("daily_limit", 25)
                min_delay = config.get("min_delay_seconds", 70)
                max_delay = config.get("max_delay_seconds", 190)

                acc1_ready = await self.driver.is_logged_in()
                acc2_ready = await self.driver_2.is_logged_in()
                connected_accounts = (1 if acc1_ready else 0) + (1 if acc2_ready else 0)
                effective_daily_limit = limit_per_account * max(1, connected_accounts)

                # Regra 1: Governança rígida de volume diário (suporta 25 na Conta 1 + 25 na Conta 2)
                sent_today = db.get_daily_sent_count()
                if sent_today >= effective_daily_limit:
                    self.log(
                        "warning",
                        f"🛑 Limite diário alcançado ({sent_today}/{effective_daily_limit}). Encerrando fila por segurança.",
                    )
                    notifier = self.get_notifier(config)
                    await notifier.notify_daily_limit_reached(sent_today=sent_today, daily_limit=effective_daily_limit)
                    completed_naturally = True
                    break

                # Seleção automática da conta ativa (Conta 1 até limit_per_account, depois troca para Conta 2)
                if acc1_ready and acc2_ready:
                    desired_account = 1 if sent_today < limit_per_account else 2
                    if desired_account != self.active_account:
                        self.log(
                            "info",
                            f"🔄 Meta de {limit_per_account} mensagens na Conta 1 atingida! Trocando automaticamente para a Conta 2 (Empresa)...",
                        )
                        try:
                            await self.driver.close()
                        except Exception:
                            pass
                        self.active_account = desired_account
                elif acc2_ready and not acc1_ready:
                    self.active_account = 2
                else:
                    self.active_account = 1

                active_driver = self.driver_2 if self.active_account == 2 else self.driver

                # Regra 2: Busca o próximo lead pendente
                lead = db.get_next_pending_lead()
                if not lead:
                    self.log("info", "🏁 Todos os leads da fila foram processados!")
                    notifier = self.get_notifier(config)
                    await notifier.notify_queue_completed(sent_today=sent_today)
                    completed_naturally = True
                    break

                self.current_lead = lead
                lead_id = lead["id"]
                phone = lead["phone"]
                company = lead.get("company_name") or "Empresa"
                city = lead.get("city") or ""

                # Marca como em processamento (queued)
                db.update_lead_status(lead_id, "queued")
                acc_label = "Conta 2 (Empresa)" if self.active_account == 2 else "Conta 1"
                self.log("info", f"[{acc_label}] Preparando envio para: {company} ({phone}) em {city}...")

                # Regra 3: Geração dinâmica de texto com Spintax e preferência para texto adaptado
                custom_msg = (lead.get("custom_message") or "").strip()
                if custom_msg:
                    from message_generator import resolve_spintax
                    message = resolve_spintax(custom_msg) if ("{" in custom_msg and "|" in custom_msg) else custom_msg
                else:
                    message = generate_outreach_message(lead)

                # Regra 4: Disparo via WhatsAppDriver ativo com isolamento de erros
                try:
                    result = await active_driver.send_direct_message(phone=phone, message=message)
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
                        f"✅ [{acc_label}] Mensagem enviada com sucesso para {company} ({phone})!",
                        meta={"lead_id": lead_id, "phone": phone, "company": company, "account": self.active_account},
                    )

                    # Alerta periódico no Telegram a cada 5 envios
                    if self.batch_sent_count % 5 == 0:
                        stats = db.get_stats()
                        notifier = self.get_notifier(config)
                        await notifier.notify_progress(
                            sent_today=sent_today,
                            daily_limit=effective_daily_limit,
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
                if not remaining_pending or sent_today >= effective_daily_limit or self._stop_requested:
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
            should_shutdown = self.shutdown_on_complete and completed_naturally and not self._stop_requested
            self.is_running = False
            self._stop_requested = False
            self.current_lead = None
            self.countdown_seconds = None
            self.scheduled_for = None
            self.waiting_for_schedule = False
            self._scheduled_target_dt = None
            self.shutdown_on_complete = False
            db.set_running_state(False)

            keep_awake.disable()
            for drv in (self.driver, self.driver_2):
                try:
                    await drv.close()
                except Exception:
                    pass
            self.log("info", "Fila de disparo finalizada. Estado do PC restaurado.")

            if should_shutdown and sys.platform == "win32":
                self.log("warning", "🔌 Todos os disparos foram concluídos! Desligando o PC automaticamente em 60 segundos...")
                try:
                    subprocess.Popen(
                        [
                            "shutdown",
                            "/s",
                            "/t",
                            "60",
                            "/c",
                            "Sondar: Todos os disparos foram concluídos! Desligando o PC em 60 segundos.",
                        ]
                    )
                except Exception as exc:
                    logger.error(f"[SHUTDOWN] Falha ao agendar desligamento do Windows: {exc}")

    def get_status(self) -> Dict[str, Any]:
        """Retorna o estado detalhado do worker e métricas atuais."""
        stats = db.get_stats()
        config = db.get_config()

        return {
            "is_running": self.is_running,
            "stop_requested": self._stop_requested,
            "started_at": self.started_at,
            "scheduled_for": self.scheduled_for,
            "waiting_for_schedule": self.waiting_for_schedule,
            "shutdown_on_complete": self.shutdown_on_complete,
            "active_account": self.active_account,
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

