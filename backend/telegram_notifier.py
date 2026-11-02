import logging
from typing import Optional
import httpx

logger = logging.getLogger("TelegramNotifier")


class TelegramNotifier:
    """
    Envia alertas em tempo real para o usuário via bot do Telegram.
    Se as credenciais não estiverem configuradas, opera silenciosamente.
    """

    def __init__(self, bot_token: Optional[str] = None, chat_id: Optional[str] = None):
        self.bot_token = (bot_token or "").strip()
        self.chat_id = (chat_id or "").strip()

    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    async def send_message(self, text: str) -> bool:
        """Envia mensagem de texto formatada para o chat do Telegram."""
        if not self.is_configured():
            return False

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    logger.debug("[TELEGRAM] Notificação enviada com sucesso.")
                    return True
                else:
                    logger.warning(f"[TELEGRAM] Erro na API do Telegram (HTTP {res.status_code}): {res.text}")
                    return False
        except Exception as exc:
            logger.warning(f"[TELEGRAM] Falha de conexão ao enviar notificação: {exc}")
            return False

    async def notify_queue_started(
        self,
        total_leads: int,
        min_delay: int,
        max_delay: int,
        daily_limit: int,
    ) -> bool:
        text = (
            "🚀 <b>Fila de Disparo Autônomo Iniciada (Sondar)</b>\n\n"
            f"📋 <b>Empresas na fila:</b> {total_leads}\n"
            f"⏱️ <b>Intervalo seguro:</b> {min_delay}s a {max_delay}s (Jitter humano)\n"
            f"🛑 <b>Limite diário:</b> {daily_limit} mensagens/dia\n"
            "💻 <b>Status do PC:</b> Protegido contra suspensão pelo Windows Keep-Awake\n\n"
            "<i>Você já pode sair de casa tranquilamente. O sistema cuidará dos envios.</i>"
        )
        return await self.send_message(text)

    async def notify_progress(
        self,
        sent_today: int,
        daily_limit: int,
        pending: int,
        last_company: str,
        last_phone: str,
    ) -> bool:
        text = (
            "📊 <b>Progresso do Disparo Sondar</b>\n\n"
            f"✅ <b>Enviados hoje:</b> {sent_today}/{daily_limit}\n"
            f"⏳ <b>Restantes na fila:</b> {pending}\n"
            f"🏢 <b>Último contato:</b> {last_company} (<code>{last_phone}</code>)"
        )
        return await self.send_message(text)

    async def notify_daily_limit_reached(self, sent_today: int, daily_limit: int) -> bool:
        text = (
            "🛑 <b>Limite Diário Atingido (Sondar)</b>\n\n"
            f"O limite de <b>{daily_limit} mensagens</b> para hoje foi atingido com sucesso.\n"
            f"Total de disparos efetuados hoje: <b>{sent_today}</b>.\n\n"
            "🔒 <i>A fila foi pausada automaticamente para proteger seu WhatsApp contra bloqueios.</i>"
        )
        return await self.send_message(text)

    async def notify_queue_completed(self, sent_today: int) -> bool:
        text = (
            "🏁 <b>Fila de Disparo Concluída!</b>\n\n"
            "Todos os leads pendentes na fila foram processados com sucesso.\n"
            f"📊 <b>Total de mensagens enviadas hoje:</b> {sent_today}"
        )
        return await self.send_message(text)

    async def notify_critical_error(self, company: str, error_msg: str) -> bool:
        text = (
            "⚠️ <b>Alerta no Disparo Sondar</b>\n\n"
            f"Houve uma falha ao tentar contato com <b>{company}</b>.\n"
            f"<b>Detalhes do erro:</b> <code>{error_msg}</code>\n\n"
            "<i>O worker continuará os próximos envios de forma resiliente.</i>"
        )
        return await self.send_message(text)

