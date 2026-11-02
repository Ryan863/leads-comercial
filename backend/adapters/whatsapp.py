import abc
import asyncio
import logging
import os
import sys
import urllib.parse
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("WhatsAppAdapter")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
SESSION_DIR = os.path.join(BACKEND_DIR, "whatsapp_session")


class BaseWhatsAppAdapter(abc.ABC):
    """Interface abstrata para adaptadores de disparo no WhatsApp."""

    @abc.abstractmethod
    async def send_message(self, phone: str, message: str) -> Tuple[bool, Optional[str]]:
        """Envia uma mensagem para o número informado. Retorna (sucesso, mensagem_erro)."""
        pass

    @abc.abstractmethod
    async def check_status(self) -> Dict[str, Any]:
        """Verifica o status da conexão ou sessão ativa."""
        pass

    @abc.abstractmethod
    async def close(self) -> None:
        """Encerra a sessão ou fecha recursos abertos."""
        pass


class PlaywrightWhatsAppAdapter(BaseWhatsAppAdapter):
    """
    Driver de envio via Playwright utilizando o WhatsApp Web oficial.
    Utiliza diretório persistente (backend/whatsapp_session) para salvar cookies
    e manter o usuário conectado mesmo após fechar ou reiniciar o computador.
    """

    def __init__(self, headless: Optional[bool] = None):
        # No Windows, default é headful para permitir visualização e escaneamento do QR Code se necessário
        if headless is not None:
            self.headless = headless
        else:
            self.headless = os.getenv("WHATSAPP_HEADLESS", "false").lower() == "true"

        self.user_data_dir = os.path.abspath(SESSION_DIR)
        os.makedirs(self.user_data_dir, exist_ok=True)

        self._playwright = None
        self._context = None
        self._page = None
        self._lock = asyncio.Lock()

    async def _ensure_browser(self):
        """Garante que a instância do navegador e o contexto persistente estejam abertos."""
        if self._context is not None and self._page is not None and not self._page.is_closed():
            return

        from playwright.async_api import async_playwright

        if self._playwright is None:
            self._playwright = await async_playwright().start()

        launch_args = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--window-size=1280,850",
        ]

        logger.info(f"🌐 [WHATSAPP DRIVER] Inicializando navegador Playwright (headless={self.headless})")
        logger.info(f"📁 [WHATSAPP DRIVER] Diretório de sessão persistente: {self.user_data_dir}")

        self._context = await self._playwright.chromium.launch_persistent_context(
            user_data_dir=self.user_data_dir,
            headless=self.headless,
            args=launch_args,
            viewport={"width": 1280, "height": 850},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        )

        if len(self._context.pages) > 0:
            self._page = self._context.pages[0]
        else:
            self._page = await self._context.new_page()

        # Injeta evasão stealth básica
        await self._page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        """)

    async def send_message(self, phone: str, message: str) -> Tuple[bool, Optional[str]]:
        """
        Navega para a URL de envio do WhatsApp Web, detecta elementos com timeout
        seguro e realiza o disparo sem quebrar a execução se o número não tiver WhatsApp.
        """
        async with self._lock:
            try:
                await self._ensure_browser()
                page = self._page

                encoded_text = urllib.parse.quote(message)
                send_url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_text}"

                logger.info(f"🚀 [WHATSAPP] Carregando conversa para o número: {phone}")
                await page.goto(send_url, timeout=45000, wait_until="domcontentloaded")

                # Aguarda detecção de múltiplos estados possíveis
                # 1. Caixa de diálogo de número inválido ou sem WhatsApp
                # 2. QR code de login pendente
                # 3. Botão de envio pronto para clique
                start_time = asyncio.get_event_loop().time()
                timeout_limit = 45.0  # segundos

                while asyncio.get_event_loop().time() - start_time < timeout_limit:
                    await asyncio.sleep(1.0)

                    # A. Verifica se apareceu popup de erro/número inválido
                    invalid_dialog = await page.query_selector(
                        'div[data-animate-modal-popup="true"], div[role="dialog"]'
                    )
                    if invalid_dialog:
                        text_content = (await invalid_dialog.inner_text()).lower()
                        if any(term in text_content for term in ["inválido", "invalid", "não está no whatsapp", "isn't on whatsapp", "url é inválido"]):
                            logger.warning(f"❌ [WHATSAPP] O número {phone} não possui WhatsApp ativo.")
                            # Clica no botão 'OK' do popup para fechar
                            ok_btn = await invalid_dialog.query_selector('button, div[role="button"]')
                            if ok_btn:
                                try:
                                    await ok_btn.click()
                                except Exception:
                                    pass
                            return False, "Número não possui WhatsApp cadastrado"

                    # B. Verifica se caiu na tela de QR code (deslogado)
                    qr_canvas = await page.query_selector('canvas[aria-label="Scan me!"], div[data-ref]')
                    if qr_canvas:
                        logger.warning("⚠️ [WHATSAPP] Sessão não autenticada! Escaneie o QR Code no WhatsApp Web.")
                        return False, "WhatsApp Web desconectado. É necessário escanear o QR Code no navegador."

                    # C. Verifica se o botão de enviar já está visível e clicável
                    send_btn_selectors = [
                        'button[aria-label="Enviar"]',
                        'button[aria-label="Send"]',
                        'span[data-icon="send"]',
                        'span[data-icon="wds-ic-send-filled"]',
                        'button[data-tab="11"]',
                    ]

                    for selector in send_btn_selectors:
                        send_btn = await page.query_selector(selector)
                        if send_btn and await send_btn.is_visible():
                            logger.info(f"👉 [WHATSAPP] Botão de envio localizado ({selector}). Disparando...")
                            await send_btn.click()
                            # Aguarda 3 segundos para confirmação de saída do pacote
                            await asyncio.sleep(3.5)
                            return True, None

                    # D. Alternativa: focar no campo editável e apertar Enter
                    input_selectors = [
                        'footer div[contenteditable="true"]',
                        'div[contenteditable="true"][data-tab="10"]',
                        'div[contenteditable="true"]',
                    ]
                    for in_selector in input_selectors:
                        input_el = await page.query_selector(in_selector)
                        if input_el and await input_el.is_visible():
                            # Se tem texto na caixa, envia com Enter
                            val = await input_el.inner_text()
                            if len(val.strip()) > 3:
                                logger.info("👉 [WHATSAPP] Pressionando Enter no campo de texto...")
                                await input_el.press("Enter")
                                await asyncio.sleep(3.5)
                                return True, None

                # Se esgotou o timeout sem conseguir enviar
                return False, "Timeout ao carregar conversa ou aguardar confirmação de envio no WhatsApp Web"

            except Exception as exc:
                logger.error(f"⚠️ [WHATSAPP EXC] Falha não tratada ao enviar para {phone}: {exc}", exc_info=True)
                return False, f"Erro no driver WhatsApp: {str(exc)}"

    async def check_status(self) -> Dict[str, Any]:
        """Checa se o navegador está ativo e se a sessão está autenticada."""
        try:
            if self._page is None or self._page.is_closed():
                return {"connected": False, "status": "browser_closed"}
            
            # Testa se a lista de conversas está visível
            side = await self._page.query_selector('div[id="side"]')
            if side:
                return {"connected": True, "status": "authenticated"}

            qr = await self._page.query_selector('canvas[aria-label="Scan me!"]')
            if qr:
                return {"connected": False, "status": "waiting_qr_code"}

            return {"connected": False, "status": "connecting"}
        except Exception as e:
            return {"connected": False, "status": f"error: {str(e)}"}

    async def close(self) -> None:
        """Encerra o contexto e o Playwright com segurança."""
        async with self._lock:
            try:
                if self._context:
                    await self._context.close()
                    self._context = None
                    self._page = None
                if self._playwright:
                    await self._playwright.stop()
                    self._playwright = None
                logger.info("🔒 [WHATSAPP DRIVER] Navegador encerrado.")
            except Exception as exc:
                logger.warning(f"⚠️ [WHATSAPP DRIVER] Erro ao fechar navegador: {exc}")


class SimulationWhatsAppAdapter(BaseWhatsAppAdapter):
    """
    Driver de simulação para testes e ambientes locais de desenvolvimento.
    Permite validar todo o fluxo da fila sem necessidade de escanear o WhatsApp Web.
    """

    def __init__(self, failure_rate: float = 0.05):
        self.failure_rate = failure_rate

    async def send_message(self, phone: str, message: str) -> Tuple[bool, Optional[str]]:
        logger.info(f"🧪 [SIMULATION DRIVER] Simulando envio para: {phone}")
        logger.debug(f"🧪 [SIMULATION DRIVER] Mensagem: {message[:120]}...")
        # Simula latência de rede/digitação
        await asyncio.sleep(2.5)

        # 5% de chance simulada de número sem WhatsApp para testar a resiliência
        import random
        if random.random() < self.failure_rate:
            logger.warning(f"🧪 [SIMULATION DRIVER] Simulação: número {phone} sem WhatsApp.")
            return False, "Número não possui WhatsApp cadastrado (Simulação)"

        logger.info(f"✅ [SIMULATION DRIVER] Mensagem entregue com sucesso para {phone}.")
        return True, None

    async def check_status(self) -> Dict[str, Any]:
        return {"connected": True, "status": "simulation_active"}

    async def close(self) -> None:
        pass


def get_whatsapp_adapter() -> BaseWhatsAppAdapter:
    """
    Factory que instancia o driver adequado conforme configuração de ambiente.
    Padrão: PlaywrightWhatsAppAdapter (com sessão persistente).
    Fallback/dev: SimulationWhatsAppAdapter via WHATSAPP_DRIVER=simulation.
    """
    driver_name = os.getenv("WHATSAPP_DRIVER", "playwright").lower().strip()
    if driver_name == "simulation":
        logger.info("🧪 [ADAPTER FACTORY] Usando driver de simulação (SimulationWhatsAppAdapter).")
        return SimulationWhatsAppAdapter()

    return PlaywrightWhatsAppAdapter()

