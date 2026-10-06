import asyncio
import hashlib
import logging
import random
import re
import sys
import unicodedata
import urllib.parse
from typing import AsyncGenerator, Dict, List, Optional, Set, Tuple

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import httpx
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeoutError

from stealth import (
    STEALTH_JS,
    classify_web_presence,
    clean_phone,
    get_random_user_agent,
    get_random_viewport,
)

logger = logging.getLogger("SondarScraper")

BRAZILIAN_STATES = {
    "ac": "AC", "acre": "AC",
    "al": "AL", "alagoas": "AL",
    "ap": "AP", "amapa": "AP",
    "am": "AM", "amazonas": "AM",
    "ba": "BA", "bahia": "BA",
    "ce": "CE", "ceara": "CE",
    "df": "DF", "distrito federal": "DF", "brasilia": "DF",
    "es": "ES", "espirito santo": "ES",
    "go": "GO", "goias": "GO",
    "ma": "MA", "maranhao": "MA",
    "mt": "MT", "mato grosso": "MT",
    "ms": "MS", "mato grosso do sul": "MS",
    "mg": "MG", "minas gerais": "MG", "minas": "MG",
    "pa": "PA", "para": "PA",
    "pb": "PB", "paraiba": "PB",
    "pr": "PR", "parana": "PR",
    "pe": "PE", "pernambuco": "PE",
    "pi": "PI", "piaui": "PI",
    "rj": "RJ", "rio de janeiro": "RJ",
    "rn": "RN", "rio grande do norte": "RN",
    "rs": "RS", "rio grande do sul": "RS",
    "ro": "RO", "rondonia": "RO",
    "rr": "RR", "roraima": "RR",
    "sc": "SC", "santa catarina": "SC",
    "sp": "SP", "sao paulo": "SP",
    "se": "SE", "sergipe": "SE",
    "to": "TO", "tocantins": "TO"
}

BAHIA_CITIES = {
    "salvador", "feira de santana", "vitoria da conquista", "camacari", "camaçari",
    "itabuna", "juazeiro", "lauro de freitas", "ilheus", "ilhéus", "jequie", "jequié",
    "teixeira de freitas", "alagoinhas", "barreiras", "porto seguro", "simoes filho",
    "simões filho", "paulo afonso", "santo antonio de jesus", "canavieiras", "valenca",
    "candeias", "dias d'avila", "jacobina", "guanambi", "senhor do bonfim", "itapetinga"
}

def normalize_text(text: Optional[str]) -> str:
    """Normaliza texto para comparações insensíveis a acentos e maiúsculas."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ASCII", "ignore").decode("ASCII").lower()
    return re.sub(r"\s+", " ", ascii_text).strip()

def parse_location_query(query: str) -> Tuple[str, str, Optional[str]]:
    """
    Analisa a query e extrai com precisão:
    - nicho (termo da atividade comercial)
    - cidade alvo (nome da cidade limpo)
    - estado alvo (UF de 2 letras)
    """
    raw = (query or "").strip()
    if not raw:
        return ("", "Região Metropolitana", None)

    niche = ""
    location_raw = ""

    parts = re.split(r"\s+em\s+", raw, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) > 1:
        niche = parts[0].strip()
        location_raw = parts[1].strip()
    elif "-" in raw:
        sub = raw.split("-")
        niche = sub[0].strip()
        location_raw = "-".join(sub[1:]).strip()
    else:
        tokens = raw.split()
        if len(tokens) >= 3 and normalize_text(tokens[-1]) in BRAZILIAN_STATES:
            target_state = BRAZILIAN_STATES[normalize_text(tokens[-1])]
            return (" ".join(tokens[:-2]), tokens[-2], target_state)
        niche = raw
        location_raw = ""

    if not location_raw:
        norm_niche = normalize_text(niche)
        for b_city in BAHIA_CITIES:
            if b_city in norm_niche:
                return (niche, b_city, "BA")
        return (niche or "Empresas e Serviços", "Região Metropolitana", None)

    target_state: Optional[str] = None
    loc_norm = normalize_text(location_raw)

    sub_parts = [p.strip() for p in re.split(r"[-,\s]+", loc_norm) if p.strip()]
    if sub_parts and sub_parts[-1] in BRAZILIAN_STATES:
        target_state = BRAZILIAN_STATES[sub_parts[-1]]
        loc_clean = re.sub(rf"[-,\s]+\b{re.escape(sub_parts[-1])}\b\s*$", "", location_raw, flags=re.IGNORECASE).strip()
        if loc_clean:
            location_raw = loc_clean
    elif len(sub_parts) >= 2 and f"{sub_parts[-2]} {sub_parts[-1]}" in BRAZILIAN_STATES:
        state_key = f"{sub_parts[-2]} {sub_parts[-1]}"
        target_state = BRAZILIAN_STATES[state_key]
        loc_clean = re.sub(rf"[-,\s]+\b{re.escape(state_key)}\b\s*$", "", location_raw, flags=re.IGNORECASE).strip()
        if loc_clean:
            location_raw = loc_clean

    clean_city = location_raw.strip(" -,")
    if not clean_city:
        clean_city = "Região Metropolitana"

    # Se o estado não foi explicitamente fornecido mas a cidade é uma cidade baiana reconhecida
    if not target_state and normalize_text(clean_city) in BAHIA_CITIES:
        target_state = "BA"

    return (niche or "Empresas e Serviços", clean_city, target_state)

def is_location_match(address: str, target_city: str, target_state: Optional[str]) -> bool:
    """
    Valida rigorosamente se o endereço capturado pertence à cidade e estado solicitados,
    eliminando qualquer transbordo ou vazamento para municípios vizinhos.
    """
    if not target_city or normalize_text(target_city) in ("regiao metropolitana", "geral", "brasil", ""):
        return True

    norm_addr = normalize_text(address)
    norm_city = normalize_text(target_city)

    if not norm_addr:
        return True

    # 1. Correspondência direta do nome da cidade no endereço
    if norm_city in norm_addr:
        if target_state:
            norm_state = target_state.lower()
            state_match = re.search(r"[-,\s]\s*([a-z]{2})\s*,\s*\d{5}", norm_addr)
            if state_match:
                addr_uf = state_match.group(1).lower()
                if addr_uf != norm_state:
                    return False
        return True

    # 2. Se a cidade alvo não está no endereço, busca padrão de cidade diferente (ex: "Itabuna - BA", "Salvador, BA")
    city_uf_match = re.search(r"[-,\s]\s*([a-z\s]+?)\s*[,-]\s*([a-z]{2})\b", norm_addr)
    if city_uf_match:
        found_city = city_uf_match.group(1).strip()
        found_uf = city_uf_match.group(2).strip().upper()
        if found_city and found_city != norm_city:
            return False
        if target_state and found_uf != target_state.upper():
            return False

    return False


class LeadScraper:
    def __init__(self):
        self.browser: Optional[Browser] = None

    async def scrape(
        self,
        query: str,
        max_results: int = 10,
        source: str = "auto"
    ) -> AsyncGenerator[Dict, None]:
        """
        Executa a varredura com streaming em tempo real.
        Garante restrição estrita à cidade alvo e desduplicação rigorosa de telefones.
        """
        clean_query = (query or "").strip()
        logger.info(f"[RADAR-SCRAPER] Nova solicitação | Termo: '{clean_query}' | Limite: {max_results} | Origem: {source}")

        if not clean_query or len(clean_query) < 2:
            logger.warning("[RADAR-SCRAPER] Termo de busca vazio ou curto. Abortando.")
            return

        niche, target_city, target_state = parse_location_query(clean_query)
        logger.info(f"[RADAR-SCRAPER] Localização identificada -> Nicho: '{niche}' | Cidade: '{target_city}' | UF: '{target_state or 'Auto'}'")

        leads_found = 0
        collected_names: Set[str] = set()
        collected_phones: Set[str] = set()
        gmaps_error = False

        # 1. Tentativa Principal via Google Maps com Playwright Stealth
        if source in ("auto", "gmaps"):
            try:
                logger.info(f"[RADAR-SCRAPER] Iniciando motor Google Maps Playwright para: '{clean_query}'")
                async for lead in self._scrape_google_maps(
                    clean_query,
                    max_results,
                    target_city,
                    target_state,
                    collected_names,
                    collected_phones
                ):
                    leads_found += 1
                    logger.info(f"[RADAR-SCRAPER] [LEAD #{leads_found}/{max_results}] '{lead['name']}' | Tel: {lead['phone']} | Endereço: {lead['address']}")
                    yield lead
                    if leads_found >= max_results:
                        logger.info(f"[RADAR-SCRAPER] Meta atingida com Google Maps ({leads_found}/{max_results}).")
                        return
            except PlaywrightTimeoutError as te:
                gmaps_error = True
                logger.warning(f"[RADAR-SCRAPER] [TIMEOUT GMAPS] Timeout: {te}. Acionando fallback se necessário.")
            except Exception as e:
                gmaps_error = True
                logger.warning(f"[RADAR-SCRAPER] [FALHA GMAPS] Erro no motor Google Maps: {type(e).__name__}: {e}. Acionando fallback se necessário.")

        # 2. Motor de Fallback Resiliente (acionado apenas se a busca principal falhar criticamente sem retornar nenhum lead)
        if (source == "osm" or (gmaps_error and leads_found == 0)) and leads_found < max_results:
            remaining = max_results - leads_found
            logger.info(f"[RADAR-SCRAPER] Acionando motor de fallback para coletar até {remaining} leads...")
            try:
                async for lead in self._scrape_fallback_sources(
                    clean_query,
                    remaining,
                    target_city,
                    target_state,
                    collected_names,
                    collected_phones
                ):
                    leads_found += 1
                    logger.info(f"[RADAR-SCRAPER] [FALLBACK LEAD #{leads_found}/{max_results}] '{lead['name']}' | Tel: {lead['phone']}")
                    yield lead
                    if leads_found >= max_results:
                        logger.info(f"[RADAR-SCRAPER] Meta finalizada via Fallback ({leads_found}/{max_results}).")
                        return
            except Exception as e:
                logger.error(f"[RADAR-SCRAPER] [ERRO FALLBACK] Falha no motor de fallback: {type(e).__name__}: {e}", exc_info=True)

        logger.info(f"[RADAR-SCRAPER] Varredura finalizada. Total de leads entregues: {leads_found}/{max_results}")

    async def _scrape_google_maps(
        self,
        query: str,
        max_results: int,
        target_city: str,
        target_state: Optional[str],
        collected_names: Set[str],
        collected_phones: Set[str]
    ) -> AsyncGenerator[Dict, None]:
        """
        Navegação automatizada no Google Maps com múltiplos seletores,
        detecção de página única, desduplicação rigorosa de telefones e
        validação estrita da cidade solicitada.
        """
        async with async_playwright() as p:
            browser = None
            channels_to_try = ["chrome", "msedge", None]
            launch_args = [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-infobars",
                "--lang=pt-BR,pt",
            ]

            for channel in channels_to_try:
                try:
                    if channel:
                        browser = await p.chromium.launch(
                            headless=True,
                            channel=channel,
                            args=launch_args,
                        )
                    else:
                        browser = await p.chromium.launch(
                            headless=True,
                            args=launch_args,
                        )
                    logger.info(f"[GMAPS] Navegador Playwright lançado com sucesso (channel={channel or 'chromium_default'})")
                    break
                except Exception as launch_err:
                    logger.debug(f"[GMAPS] Falha ao lançar com channel={channel}: {launch_err}")

            if not browser:
                raise RuntimeError("Não foi possível inicializar nenhum binário de navegador (Chrome, Edge ou Chromium).")

            context: Optional[BrowserContext] = None
            page: Optional[Page] = None

            try:
                viewport = get_random_viewport()
                user_agent = get_random_user_agent()
                context = await browser.new_context(
                    viewport=viewport,
                    user_agent=user_agent,
                    locale="pt-BR",
                    timezone_id="America/Sao_Paulo",
                )
                await context.add_init_script(STEALTH_JS)

                page = await context.new_page()
                encoded_query = urllib.parse.quote_plus(query)
                target_url = f"https://www.google.com/maps/search/{encoded_query}?hl=pt-BR"

                logger.info(f"[GMAPS] Acessando URL: {target_url}")
                response = await page.goto(target_url, timeout=25000, wait_until="domcontentloaded")
                await asyncio.sleep(random.uniform(1.2, 1.8))

                # Trata modais de consentimento de cookies da Google
                try:
                    consent_btn = page.locator("button:has-text('Aceitar tudo'), button:has-text('Concordo'), form[action*='consent'] button").first
                    if await consent_btn.is_visible(timeout=1500):
                        await consent_btn.click()
                        await asyncio.sleep(0.8)
                except Exception:
                    pass

                # Caso 1: Redirecionamento direto para a página de um único estabelecimento
                current_url = page.url
                h1_candidate = page.locator("h1.DUwDvf, h1").first
                is_direct_place = ("/maps/place/" in current_url) or (await h1_candidate.is_visible(timeout=1200))
                card_count_initial = len(await page.locator('div.Nv2PK, a[href*="/maps/place/"]').all())

                if is_direct_place and card_count_initial == 0:
                    logger.info("[GMAPS] Busca resultou em correspondência direta única (Local único).")
                    name = query
                    try:
                        if await h1_candidate.is_visible(timeout=1500):
                            name = (await h1_candidate.inner_text()).strip()
                    except Exception:
                        pass

                    lead_data = await self._extract_place_details(page, name, query, target_city)
                    if lead_data:
                        # Validação de localidade e telefone
                        if not is_location_match(lead_data.get("address", ""), target_city, target_state):
                            logger.info(f"[GMAPS] Descartando local único fora da cidade alvo: '{name}' ({lead_data.get('address')})")
                            return

                        phone_digits = re.sub(r"\D", "", lead_data.get("phone") or "")
                        if phone_digits and phone_digits in collected_phones:
                            logger.info(f"[GMAPS] Telefone duplicado ({lead_data.get('phone')}). Descartando.")
                            return

                        if phone_digits:
                            collected_phones.add(phone_digits)
                        collected_names.add(normalize_text(name))

                        lead_data["source"] = "google_maps_direct"
                        yield lead_data
                    return

                # Caso 2: Lista com múltiplos resultados (feed)
                feed_selector = 'div[role="feed"], div[aria-label*="Resultados para"]'
                try:
                    await page.wait_for_selector(feed_selector, timeout=7000)
                except Exception:
                    pass

                extracted_count = 0
                scroll_attempts = 0
                max_scrolls = max(6, (max_results // 2) + 4)

                while extracted_count < max_results and scroll_attempts < max_scrolls:
                    card_blocks = await page.locator('div.Nv2PK').all()
                    if not card_blocks:
                        card_blocks = await page.locator('a[href*="/maps/place/"]').all()

                    logger.debug(f"[GMAPS] Scroll {scroll_attempts + 1}/{max_scrolls} | Cards no DOM: {len(card_blocks)}")

                    if not card_blocks and scroll_attempts >= 2:
                        logger.warning("[GMAPS] Nenhum card localizado após múltiplas tentativas.")
                        break

                    for index, card in enumerate(card_blocks):
                        if extracted_count >= max_results:
                            break

                        try:
                            link_el = card.locator('a.hfpxzc, a[href*="/maps/place/"]').first
                            if not await link_el.is_visible(timeout=400):
                                continue

                            aria_label = await link_el.get_attribute("aria-label")
                            name = aria_label if aria_label else await link_el.inner_text()
                            name = name.split("\n")[0].strip()

                            if not name or len(name) < 2 or name.lower() in ("resultados", "rotas", "salvar", "menu"):
                                continue

                            norm_name = normalize_text(name)
                            if norm_name in collected_names:
                                continue

                            # Captura snippet do card
                            snippet_data = {}
                            card_text = ""
                            try:
                                card_text = await card.inner_text(timeout=300)
                            except Exception:
                                pass

                            if card_text:
                                r_match = re.search(r"(\d+[\.,]\d+)", card_text)
                                if r_match:
                                    snippet_data["rating"] = float(r_match.group(1).replace(",", "."))

                                rev_match = re.search(r"\((\d+[\.,]?\d*)\)", card_text)
                                if rev_match:
                                    clean_rev = rev_match.group(1).replace(".", "").replace(",", "")
                                    if clean_rev.isdigit():
                                        snippet_data["reviews"] = int(clean_rev)

                                h_match = re.search(r"(Aberto[^\n·]*·?[^\n]*|Fechado[^\n·]*·?[^\n]*)", card_text)
                                if h_match:
                                    snippet_data["hours_text"] = h_match.group(1).strip()

                            # Clica no card para abrir o painel lateral com sincronização segura
                            try:
                                await link_el.scroll_into_view_if_needed(timeout=800)
                                await link_el.click(timeout=1200)

                                # Sincroniza o painel: aguarda que o título do painel corresponda ao estabelecimento clicado
                                for _ in range(6):
                                    panel_title = page.locator("h1.DUwDvf").first
                                    if await panel_title.is_visible(timeout=300):
                                        t_text = normalize_text(await panel_title.inner_text(timeout=300))
                                        if any(part in t_text for part in norm_name.split()[:2]):
                                            break
                                    await asyncio.sleep(0.15)

                                await asyncio.sleep(0.3)
                            except Exception as click_err:
                                logger.debug(f"[GMAPS] Aviso ao abrir detalhes do card {index} ({name}): {click_err}")

                            lead_data = await self._extract_place_details(page, name, query, target_city, snippet_data)
                            if not lead_data:
                                continue

                            # 1. VALIDAÇÃO ESTRITA DE CIDADE (Impede transbordo para outras cidades)
                            lead_address = lead_data.get("address", "")
                            if not is_location_match(lead_address, target_city, target_state):
                                logger.info(
                                    f"[GMAPS] Descartando lead fora da cidade alvo: '{name}' "
                                    f"(Endereço: '{lead_address}' não pertence a '{target_city}')"
                                )
                                continue

                            # 2. DESDUPLICAÇÃO ESTRITA DE TELEFONE (Elimina números repetidos)
                            phone = lead_data.get("phone") or ""
                            phone_digits = re.sub(r"\D", "", phone)
                            if phone_digits:
                                if phone_digits in collected_phones:
                                    logger.info(
                                        f"[GMAPS] Telefone duplicado ({phone}) para '{name}'. "
                                        f"Já registrado anteriormente. Ignorando."
                                    )
                                    continue
                                collected_phones.add(phone_digits)

                            # Registra nome e marca lead válido
                            collected_names.add(norm_name)
                            lead_data["source"] = "google_maps"
                            extracted_count += 1
                            yield lead_data

                        except Exception as card_err:
                            logger.debug(f"[GMAPS] Erro ao processar card {index}: {card_err}")
                            continue

                    # Rolagem no feed
                    feed_elem = page.locator('div[role="feed"]').first
                    try:
                        if await feed_elem.is_visible(timeout=800):
                            await feed_elem.evaluate("el => el.scrollBy(0, 1000)")
                        else:
                            await page.mouse.wheel(0, 800)
                    except Exception:
                        await page.mouse.wheel(0, 800)

                    await asyncio.sleep(random.uniform(1.0, 1.5))
                    scroll_attempts += 1

            finally:
                if page:
                    try:
                        await page.close()
                    except Exception:
                        pass
                if context:
                    try:
                        await context.close()
                    except Exception:
                        pass
                if browser:
                    try:
                        await browser.close()
                        logger.debug("[GMAPS] Navegador Playwright encerrado.")
                    except Exception:
                        pass

    async def _extract_place_details(
        self,
        page: Page,
        name: str,
        original_query: str,
        target_city: str,
        snippet: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Extrai campos ricos do painel do estabelecimento no Google Maps
        com timeouts estritos e sem capturas fantasmas de outros cards.
        """
        snip = snippet or {}
        try:
            # 1. Categoria
            category = "Comércio e Serviços"
            cat_elem = page.locator('button[jsaction*="category"], span.fontBodyMedium, button.DkEaL').first
            try:
                if await cat_elem.is_visible(timeout=500):
                    txt = await cat_elem.inner_text(timeout=500)
                    if txt and len(txt) < 50 and not any(c in txt for c in "0123456789"):
                        category = txt.strip()
            except Exception:
                pass

            # 2. Avaliação e Reviews legítimos
            rating: Optional[float] = snip.get("rating")
            reviews: int = snip.get("reviews", 0)
            try:
                rating_elem = page.locator('div.F7nice span[aria-hidden="true"], span.ceNzKf[aria-hidden="true"]').first
                if await rating_elem.is_visible(timeout=400):
                    r_txt = await rating_elem.inner_text(timeout=400)
                    match = re.search(r"(\d+[\.,]\d+)", r_txt)
                    if match:
                        rating = float(match.group(1).replace(",", "."))

                rev_elem = page.locator('div.F7nice span[aria-label*="avalia"], span[aria-label*="avaliaç"], span[aria-label*="review"]').first
                if await rev_elem.is_visible(timeout=400):
                    rev_aria = await rev_elem.get_attribute("aria-label") or await rev_elem.inner_text(timeout=400)
                    match = re.search(r"([\d\.\,]+)", rev_aria)
                    if match:
                        clean_num = match.group(1).replace(".", "").replace(",", "")
                        if clean_num.isdigit():
                            reviews = int(clean_num)
            except Exception:
                pass

            # 3. Telefone: Extraído ESTRITAMENTE do botão de ação do próprio estabelecimento
            # NUNCA executamos busca por regex no div[role="main"] global para evitar números repetidos de outros cards
            phone_raw = ""
            try:
                phone_elem = page.locator('button[data-tooltip*="Copiar número de telefone"], button[data-item-id*="phone"], button[aria-label*="Telefone:"]').first
                if await phone_elem.is_visible(timeout=600):
                    phone_raw = await phone_elem.get_attribute("aria-label") or await phone_elem.inner_text(timeout=400)
            except Exception:
                pass

            phone, is_whatsapp = clean_phone(phone_raw)

            # 4. Website Oficial e Presença Web
            website = None
            try:
                site_elem = page.locator('a[data-tooltip*="Abrir site"], a[data-item-id="authority"], a[data-value="Site"]').first
                if await site_elem.is_visible(timeout=500):
                    website = await site_elem.get_attribute("href")
            except Exception:
                pass

            presence, website_url = classify_web_presence(website)

            # 5. Endereço
            address = ""
            try:
                addr_elem = page.locator('button[data-tooltip*="Copiar endereço"], button[data-item-id*="address"]').first
                if await addr_elem.is_visible(timeout=500):
                    address = await addr_elem.get_attribute("aria-label") or await addr_elem.inner_text(timeout=500)
                    address = address.replace("Endereço: ", "").replace("Endereço:\n", "").strip()
            except Exception:
                pass

            if not address:
                address = f"Região Central — {target_city.title()}"

            # 6. Quadro de Horários da Semana
            weekly_hours: Dict[str, str] = {}
            hours_text = snip.get("hours_text") or "Não informado"
            is_open = True
            closes_at = "Não informado"

            if hours_text and hours_text != "Não informado":
                if "fechado" in hours_text.lower():
                    is_open = False
                    closes_at = "Fechado"
                else:
                    is_open = True
                    match_close = re.search(r"fecha[^\d]*(\d{1,2}:\d{2})", hours_text, re.IGNORECASE)
                    if match_close:
                        closes_at = match_close.group(1)
                    elif "24 horas" in hours_text.lower():
                        closes_at = "24h"

            try:
                oh_container = page.locator('div[data-item-id*="oh"], button[data-item-id*="oh"], div[aria-label*="horário"], div[aria-label*="Horário"]').first
                if await oh_container.is_visible(timeout=400):
                    raw_summary = await oh_container.get_attribute("aria-label") or await oh_container.inner_text(timeout=300)
                    raw_summary = raw_summary.replace("\n", " ").strip()
                    if raw_summary:
                        if "fechado" in raw_summary.lower():
                            is_open = False
                            closes_at = "Fechado"
                        else:
                            is_open = True
                            match_close = re.search(r"fecha[^\d]*(\d{1,2}:\d{2})", raw_summary, re.IGNORECASE)
                            if match_close:
                                closes_at = match_close.group(1)
                            elif "24 horas" in raw_summary.lower():
                                closes_at = "24h"

                    table_elem = page.locator('table.eKjhGd, table.wgFkxc, div[data-item-id*="oh"] table').first
                    if not await table_elem.is_visible(timeout=150):
                        try:
                            await oh_container.click(timeout=500)
                            await asyncio.sleep(0.2)
                        except Exception:
                            pass

                    rows = await page.locator('table.eKjhGd tr, table.wgFkxc tr, div[data-item-id*="oh"] table tr').all()
                    for r in rows:
                        try:
                            day_el = r.locator('td.ylH6lf, th, td:first-child').first
                            time_el = r.locator('td.mxowUb, td.h39tFd, ul.cLHqxd, td:last-child').first
                            if await day_el.is_visible(timeout=100):
                                day_str = (await day_el.inner_text(timeout=100)).strip().capitalize()
                                time_str = (await time_el.inner_text(timeout=100)).strip().replace("\n", " ")
                                if day_str and time_str:
                                    weekly_hours[day_str] = time_str
                        except Exception:
                            continue

                    if weekly_hours:
                        order = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"]
                        parts = []
                        for d in order:
                            if d in weekly_hours:
                                parts.append(f"{d[:3]}: {weekly_hours[d]}")
                        hours_text = " | ".join(parts)
                    elif raw_summary:
                        hours_text = raw_summary
            except Exception:
                pass

            slug_base = f"{name}-{address}".lower()
            slug_hash = hashlib.md5(slug_base.encode("utf-8")).hexdigest()[:8]
            clean_name_slug = re.sub(r"[^a-zA-Z0-9]", "", name.lower())[:12]
            slug_id = f"{clean_name_slug}-{slug_hash}"

            return {
                "id": slug_id,
                "name": name,
                "category": category,
                "phone": phone,
                "whatsapp": is_whatsapp,
                "email": None,
                "rating": rating,
                "reviews": reviews,
                "open": is_open,
                "closesAt": closes_at,
                "weekly_hours": weekly_hours,
                "hours_text": hours_text,
                "presence": presence,
                "website": website_url,
                "address": address,
            }
        except Exception as e:
            logger.debug(f"[GMAPS] Erro ao extrair detalhes de '{name}': {e}")
            return None

    async def _scrape_fallback_sources(
        self,
        query: str,
        count: int,
        target_city: str,
        target_state: Optional[str],
        collected_names: Set[str],
        collected_phones: Set[str]
    ) -> AsyncGenerator[Dict, None]:
        """
        Motor secundário resiliente com validação estrita da cidade solicitada.
        """
        niche = self._extract_niche(query)
        logger.info(f"[FALLBACK] Busca secundária -> Nicho: '{niche}' | Cidade: '{target_city}' | Qtd: {count}")

        yielded = 0
        try:
            overpass_leads = await self._query_overpass_osm(niche, target_city, count)
            for lead in overpass_leads:
                norm_name = normalize_text(lead.get("name"))
                if norm_name in collected_names:
                    continue

                phone = lead.get("phone") or ""
                phone_digits = re.sub(r"\D", "", phone)
                if phone_digits and phone_digits in collected_phones:
                    continue

                if not is_location_match(lead.get("address", ""), target_city, target_state):
                    continue

                if phone_digits:
                    collected_phones.add(phone_digits)
                collected_names.add(norm_name)

                yielded += 1
                yield lead
                if yielded >= count:
                    return
        except Exception as osm_err:
            logger.debug(f"[FALLBACK] Overpass OSM retornou indisponível: {osm_err}")

        return

    async def _query_overpass_osm(self, niche: str, city: str, count: int) -> List[Dict]:
        """Executa consulta na API Overpass (OpenStreetMap) filtrando nós comerciais por cidade."""
        leads = []
        overpass_url = "https://overpass-api.de/api/interpreter"

        osm_filter = '["amenity"]'
        n_lower = niche.lower()
        if any(w in n_lower for w in ["pizza", "restaurante", "bar", "lanche", "café", "hamburguer"]):
            osm_filter = '["amenity"~"restaurant|fast_food|cafe|bar"]'
        elif any(w in n_lower for w in ["estetica", "beleza", "salao", "barbearia", "cabelo"]):
            osm_filter = '["shop"~"beauty|hairdresser"]'
        elif any(w in n_lower for w in ["mecanica", "oficina", "auto", "car"]):
            osm_filter = '["shop"~"car_repair|car"]'
        elif any(w in n_lower for w in ["clinica", "dentista", "odontologia", "medico"]):
            osm_filter = '["amenity"~"dentist|doctors|clinic"]'
        else:
            osm_filter = '["shop"]'

        clean_city_name = city.split("-")[0].strip()
        query_ql = f"""
        [out:json][timeout:8];
        area["name"="{clean_city_name}"]->.searchArea;
        (
          node{osm_filter}(area.searchArea);
        );
        out body {count * 2};
        """

        headers = {"User-Agent": "Sondar-B2B-Radar/2.0 (contato@sondar.local)"}

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(overpass_url, data={"data": query_ql}, headers=headers)
            if resp.status_code != 200:
                return []

            data = resp.json()
            elements = data.get("elements", [])

            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name")
                if not name or len(name) < 2:
                    continue

                phone_raw = tags.get("phone") or tags.get("contact:phone") or tags.get("contact:whatsapp") or ""
                phone, is_whatsapp = clean_phone(phone_raw)

                website = tags.get("website") or tags.get("contact:website")
                presence, website_url = classify_web_presence(website)

                street = tags.get("addr:street") or "Avenida Central"
                number = tags.get("addr:housenumber") or ""
                address = f"{street}, {number} — {city}" if number else f"{street} — {city}"

                slug_id = f"osm-{re.sub(r'[^a-zA-Z0-9]', '', name.lower())[:10]}-{random.randint(100, 999)}"
                raw_hours = tags.get("opening_hours") or "Não informado"

                leads.append({
                    "id": slug_id,
                    "name": name,
                    "category": niche.title(),
                    "phone": phone,
                    "whatsapp": is_whatsapp,
                    "email": tags.get("email") or tags.get("contact:email"),
                    "rating": None,
                    "reviews": 0,
                    "open": True,
                    "closesAt": "Não informado",
                    "weekly_hours": {},
                    "hours_text": raw_hours,
                    "presence": presence,
                    "website": website_url,
                    "address": address,
                    "source": "osm_overpass"
                })

                if len(leads) >= count:
                    break

        return leads

    def _extract_city(self, query: str) -> str:
        """Extrai o nome da cidade a partir da query do usuário."""
        _, city, _ = parse_location_query(query)
        return city

    def _extract_niche(self, query: str) -> str:
        """Extrai a categoria/nicho a partir da query do usuário."""
        niche, _, _ = parse_location_query(query)
        return niche

    def _infer_ddd(self, location_text: str) -> str:
        """Infere o DDD aproximado pelo estado ou cidade presente na busca, com suporte completo à Bahia."""
        txt = normalize_text(location_text)

        # Cidades da Bahia
        if any(c in txt for c in ["salvador", "lauro de freitas", "camacari", "simoes filho", "candeias"]):
            return "71"
        if any(c in txt for c in ["feira de santana", "alagoinhas", "santo antonio de jesus"]):
            return "75"
        if any(c in txt for c in ["ilheus", "itabuna", "porto seguro", "jequie", "teixeira de freitas", "canavieiras"]):
            return "73"
        if any(c in txt for c in ["vitoria da conquista", "barreiras", "guanambi"]):
            return "77"
        if any(c in txt for c in ["juazeiro", "jacobina", "senhor do bonfim"]):
            return "74"
        if "ba" in txt.split() or "bahia" in txt:
            return "71"

        # Santa Catarina
        if "sc" in txt.split() or "santa catarina" in txt:
            if any(c in txt for c in ["videira", "cacador", "chapeco", "joacaba"]):
                return "49"
            if any(c in txt for c in ["florianopolis", "floripa", "sao jose", "palhoca"]):
                return "48"
            return "47"

        # São Paulo
        if "sp" in txt.split() or "sao paulo" in txt:
            if any(c in txt for c in ["campinas", "americana"]):
                return "19"
            if any(c in txt for c in ["santos", "guaruja"]):
                return "13"
            return "11"

        # Paraná
        if "pr" in txt.split() or "parana" in txt:
            if any(c in txt for c in ["londrina"]):
                return "43"
            if any(c in txt for c in ["maringa"]):
                return "44"
            return "41"

        # Rio Grande do Sul
        if "rs" in txt.split() or "rio grande do sul" in txt:
            return "54" if "caxias" in txt else "51"

        # Rio de Janeiro
        if "rj" in txt.split() or "rio de janeiro" in txt:
            return "21"

        # Minas Gerais
        if "mg" in txt.split() or "minas" in txt:
            return "34" if "uberlandia" in txt else "31"

        return "11"
