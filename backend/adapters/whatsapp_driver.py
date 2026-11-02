import asyncio
import base64
import logging
import os
import re
import shutil
import sys
import urllib.parse
from typing import Any, Dict, Optional

logger = logging.getLogger("WhatsAppDriver")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
SESSION_DIR = os.path.join(BACKEND_DIR, ".wpp_session")
AUTH_MARKER = os.path.join(SESSION_DIR, ".authenticated")


class WhatsAppDriver:
    """
    Gerenciador de automação assíncrona do WhatsApp Web via Playwright.
    Utiliza sessão persistente salva em disco (backend/.wpp_session) e captura
    o QR Code diretamente para renderização instantânea no modal do frontend.
    """

    def __init__(self, session_dir: Optional[str] = None):
        self.session_dir = session_dir or SESSION_DIR
        os.makedirs(self.session_dir, exist_ok=True)

        self._playwright = None
        self._context = None
        self._page = None
        self._lock = asyncio.Lock()

        self._is_connecting = False
        self._current_qr_code: Optional[str] = None
        self._last_connected_check: Optional[bool] = None

    @property
    def is_connecting(self) -> bool:
        return self._is_connecting

    @property
    def current_qr_code(self) -> Optional[str]:
        return self._current_qr_code

    def sanitize_phone(self, phone: str) -> str:
        """
        Sanitiza o telefone garantindo formato internacional padrão do Brasil:
        DDI 55 + DDD (2 dígitos) + 8 ou 9 dígitos.
        """
        digits = re.sub(r"\D", "", phone or "").lstrip("0")
        if not digits:
            return ""

        # Caso já venha com 55 no início
        if digits.startswith("55"):
            if 12 <= len(digits) <= 13:
                return digits
            if len(digits) >= 10:
                return digits

        # Se vier sem DDI (ex: 11988887777 ou 1188887777)
        if 10 <= len(digits) <= 11:
            return f"55{digits}"

        # Se for um número internacional ou outro padrão com mais de 8 dígitos
        if len(digits) >= 8:
            return f"55{digits}" if not digits.startswith("55") else digits

        return ""

    async def is_logged_in(self, force_check: bool = False) -> bool:
        """
        Verifica se há sessão autenticada no WhatsApp Web.
        Verificação instantânea baseada no marcador persistente e estado em memória.
        """
        if self._is_connecting:
            return False

        auth_marker_path = os.path.join(self.session_dir, ".authenticated")
        if os.path.exists(auth_marker_path):
            self._last_connected_check = True
            return True

        if self._page is not None and not self._page.is_closed():
            try:
                side = await self._page.query_selector('div[id="side"], div[contenteditable="true"]')
                is_auth = bool(side)
                self._last_connected_check = is_auth
                return is_auth
            except Exception:
                pass

        self._last_connected_check = False
        return False

    async def open_for_qr_code(self) -> bool:
        """
        Inicia a sessão do WhatsApp Web, captura o QR Code como imagem Base64
        para exibição direta na tela do usuário e aguarda o escaneamento pelo celular.
        Quando logar, salva a sessão em disco e encerra o navegador.
        """
        if self._is_connecting:
            logger.info("⚠️ [WhatsAppDriver] Processo de QR Code já em andamento.")
            return False

        self._is_connecting = True
        self._current_qr_code = None
        logger.info("📱 [WhatsAppDriver] Iniciando captura e autenticação do QR Code...")

        async with self._lock:
            await self._cleanup_browser()

            try:
                from playwright.async_api import async_playwright

                self._playwright = await async_playwright().start()

                launch_args = [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                ]

                # Tenta abrir com channel chrome ou fallback para chromium
                try:
                    self._context = await self._playwright.chromium.launch_persistent_context(
                        user_data_dir=self.session_dir,
                        channel="chrome",
                        headless=False,
                        args=launch_args,
                    )
                except Exception:
                    self._context = await self._playwright.chromium.launch_persistent_context(
                        user_data_dir=self.session_dir,
                        headless=False,
                        args=launch_args,
                    )

                self._page = self._context.pages[0] if self._context.pages else await self._context.new_page()

                logger.info("🌐 [WhatsAppDriver] Carregando web.whatsapp.com...")
                await self._page.goto("https://web.whatsapp.com", wait_until="domcontentloaded", timeout=45000)

                # Monitora por até 3 minutos
                start_t = asyncio.get_event_loop().time()
                timeout = 180.0
                logged_in = False

                while asyncio.get_event_loop().time() - start_t < timeout:
                    if self._page.is_closed():
                        logger.warning("⚠️ [WhatsAppDriver] Janela foi fechada.")
                        break

                    # 1. Checa se o usuário já está logado
                    side = await self._page.query_selector('div[id="side"], div[contenteditable="true"], div[data-testid="chat-list"]')
                    if side:
                        logged_in = True
                        logger.info("✅ [WhatsAppDriver] QR Code autenticado com sucesso no WhatsApp Web!")
                        auth_marker = os.path.join(self.session_dir, ".authenticated")
                        with open(auth_marker, "w", encoding="utf-8") as f:
                            f.write("authenticated")
                        self._current_qr_code = None
                        await asyncio.sleep(4.0)
                        break

                    # 2. Captura o QR Code para exibição no frontend
                    canvas = await self._page.query_selector('canvas')
                    if canvas and await canvas.is_visible():
                        try:
                            img_bytes = await canvas.screenshot()
                            if img_bytes and len(img_bytes) > 500:
                                b64 = base64.b64encode(img_bytes).decode("utf-8")
                                self._current_qr_code = f"data:image/png;base64,{b64}"
                        except Exception:
                            pass

                    # 3. Detecta botão de recarregar QR code caso expire
                    reload_btn = await self._page.query_selector('span[role="button"]:has(span[data-icon="refresh"]), button:has-text("Recarregar"), button:has-text("Clique")')
                    if reload_btn and await reload_btn.is_visible():
                        try:
                            logger.info("🔄 [WhatsAppDriver] Recarregando QR Code expirado...")
                            await reload_btn.click()
                        except Exception:
                            pass

                    await asyncio.sleep(1.2)

                await self._cleanup_browser()
                self._last_connected_check = logged_in
                self._current_qr_code = None
                return logged_in

            except Exception as exc:
                logger.error(f"❌ [WhatsAppDriver] Erro no fluxo do QR Code: {exc}", exc_info=True)
                await self._cleanup_browser()
                self._current_qr_code = None
                return False
            finally:
                self._is_connecting = False
                self._current_qr_code = None

    async def _ensure_browser(self, headless: bool = True):
        """Garante que o navegador esteja ativo para envio de mensagens."""
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

        logger.info(f"🌐 [WhatsAppDriver] Inicializando navegador (headless={headless}) para disparo")
        try:
            self._context = await self._playwright.chromium.launch_persistent_context(
                user_data_dir=self.session_dir,
                channel="chrome",
                headless=headless,
                args=launch_args,
                viewport={"width": 1280, "height": 850},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            )
        except Exception as e:
            logger.warning(f"⚠️ [WhatsAppDriver] Fallback para Chromium padrão: {e}")
            self._context = await self._playwright.chromium.launch_persistent_context(
                user_data_dir=self.session_dir,
                headless=headless,
                args=launch_args,
                viewport={"width": 1280, "height": 850},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            )

        self._page = self._context.pages[0] if self._context.pages else await self._context.new_page()

    async def send_direct_message(self, phone: str, message: str) -> Dict[str, Any]:
        """
        Envia mensagem direta para o telefone especificado.
        Trata números inválidos/sem WhatsApp e confirmação de envio.
        Retorna dicionário no padrão:
        - {"success": True}
        - {"success": False, "error": "not_whatsapp"}
        - {"success": False, "error": ...}
        """
        clean_phone = self.sanitize_phone(phone)
        if not clean_phone:
            logger.warning(f"❌ [WhatsAppDriver] Telefone inválido: {phone}")
            return {"success": False, "error": "invalid_phone"}

        async with self._lock:
            try:
                await self._ensure_browser(headless=True)
                page = self._page

                encoded_text = urllib.parse.quote(message)
                send_url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"

                logger.info(f"🚀 [WhatsAppDriver] Carregando conversa para: {clean_phone}")
                await page.goto(send_url, timeout=35000, wait_until="domcontentloaded")

                # Timeout defensivo de 15s a 25s
                start_time = asyncio.get_event_loop().time()
                timeout_limit = 25.0

                while asyncio.get_event_loop().time() - start_time < timeout_limit:
                    await asyncio.sleep(1.0)

                    # Caso A: Modal de número inválido ou sem WhatsApp
                    invalid_dialog = await page.query_selector(
                        'div[data-animate-modal-popup="true"], div[role="dialog"], div[data-testid="popup-contents"]'
                    )
                    if invalid_dialog:
                        text_content = (await invalid_dialog.inner_text()).lower()
                        if any(term in text_content for term in [
                            "inválido", "invalid", "não está no whatsapp", "isn't on whatsapp",
                            "não está cadastrado", "url é inválido", "url is invalid"
                        ]):
                            logger.warning(f"❌ [WhatsAppDriver] O número {clean_phone} não possui WhatsApp ativo.")
                            ok_btn = await invalid_dialog.query_selector('button, div[role="button"]')
                            if ok_btn:
                                try:
                                    await ok_btn.click()
                                except Exception:
                                    pass
                            await asyncio.sleep(0.5)
                            return {"success": False, "error": "not_whatsapp"}

                    # Caso B: Botão de envio pronto
                    send_btn_selectors = [
                        'button[aria-label="Enviar"]',
                        'button[aria-label="Send"]',
                        'span[data-icon="send"]',
                        'span[data-icon="wds-ic-send-filled"]',
                        'button[data-tab="11"]',
                        'footer button:has(span[data-icon="send"])',
                    ]
                    for selector in send_btn_selectors:
                        send_btn = await page.query_selector(selector)
                        if send_btn and await send_btn.is_visible():
                            logger.info(f"👉 [WhatsAppDriver] Botão Enviar localizado ({selector}). Disparando...")
                            await send_btn.click()
                            # Intervalo de segurança de 3 a 5 segundos
                            await asyncio.sleep(4.0)
                            return {"success": True}

                    # Caso alternativo: Enter no campo de texto preenchido
                    input_selectors = [
                        'footer div[contenteditable="true"]',
                        'div[contenteditable="true"][data-tab="10"]',
                        'div[contenteditable="true"]',
                    ]
                    for in_sel in input_selectors:
                        input_el = await page.query_selector(in_sel)
                        if input_el and await input_el.is_visible():
                            val = await input_el.inner_text()
                            if len(val.strip()) > 0:
                                logger.info("👉 [WhatsAppDriver] Pressionando Enter no campo de mensagem...")
                                await input_el.press("Enter")
                                await asyncio.sleep(4.0)
                                return {"success": True}

                    # Caso C: Sessão expirada / caiu no QR code
                    qr_canvas = await page.query_selector('canvas[aria-label="Scan me!"], div[data-ref]')
                    if qr_canvas:
                        logger.warning("⚠️ [WhatsAppDriver] Sessão desconectada durante envio.")
                        auth_marker = os.path.join(self.session_dir, ".authenticated")
                        if os.path.exists(auth_marker):
                            try:
                                os.remove(auth_marker)
                            except Exception:
                                pass
                        self._last_connected_check = False
                        return {"success": False, "error": "session_expired"}

                return {"success": False, "error": "timeout"}

            except Exception as exc:
                logger.error(f"⚠️ [WhatsAppDriver] Falha no envio para {clean_phone}: {exc}", exc_info=True)
                return {"success": False, "error": str(exc)}

    async def disconnect(self) -> Dict[str, Any]:
        """
        Encerra qualquer sessão ativa e limpa o diretório de dados .wpp_session.
        """
        async with self._lock:
            await self._cleanup_browser()
            await asyncio.sleep(0.5)

            if os.path.exists(self.session_dir):
                try:
                    shutil.rmtree(self.session_dir, ignore_errors=True)
                    logger.info("🗑️ [WhatsAppDriver] Diretório .wpp_session removido com sucesso.")
                except Exception as e:
                    logger.warning(f"⚠️ [WhatsAppDriver] Falha ao remover diretório de sessão: {e}")

            os.makedirs(self.session_dir, exist_ok=True)
            self._last_connected_check = False
            self._is_connecting = False
            self._current_qr_code = None

            return {"success": True, "message": "WhatsApp desconectado e sessão limpa com sucesso."}

    async def _cleanup_browser(self):
        """Fecha instâncias do navegador com segurança."""
        try:
            if self._context:
                await self._context.close()
        except Exception:
            pass
        try:
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass
        finally:
            self._context = None
            self._page = None
            self._playwright = None

    async def close(self):
        """Encerra o driver."""
        async with self._lock:
            await self._cleanup_browser()


# Instância global singleton do driver
whatsapp_driver = WhatsAppDriver()
