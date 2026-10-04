import asyncio
import hashlib
import logging
import random
import re
import sys
import urllib.parse

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from typing import AsyncGenerator, Dict, List, Optional, Tuple
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
        Tenta via Google Maps Headless Playwright; em caso de bloqueio, erro ou timeout,
        aciona o motor de fallback resiliente.
        """
        clean_query = (query or "").strip()
        logger.info(f"[RADAR-SCRAPER] Nova solicitação recebida | Termo: '{clean_query}' | Limite: {max_results} | Origem: {source}")

        if not clean_query or len(clean_query) < 2:
            logger.warning("[RADAR-SCRAPER] Termo de busca vazio ou muito curto. Abortando varredura.")
            return

        leads_found = 0
        collected_names = set()
        gmaps_error = False

        # 1. Tentativa Principal via Google Maps com Playwright Stealth
        if source in ("auto", "gmaps"):
            try:
                logger.info(f"[RADAR-SCRAPER] Iniciando motor Google Maps Playwright para: '{clean_query}'")
                async for lead in self._scrape_google_maps(clean_query, max_results):
                    lead_key = lead["name"].strip().lower()
                    if lead_key not in collected_names:
                        collected_names.add(lead_key)
                        leads_found += 1
                        logger.info(f"[RADAR-SCRAPER] [GMAPS LEAD #{leads_found}/{max_results}] '{lead['name']}' | Tel: {lead['phone']} | Presença: {lead['presence']}")
                        yield lead
                        if leads_found >= max_results:
                            logger.info(f"[RADAR-SCRAPER] Meta atingida com Google Maps ({leads_found}/{max_results}).")
                            return
            except PlaywrightTimeoutError as te:
                gmaps_error = True
                logger.warning(f"[RADAR-SCRAPER] [TIMEOUT GMAPS] Timeout na navegação ou carregamento: {te}. Acionando fallback.")
            except Exception as e:
                gmaps_error = True
                logger.warning(f"[RADAR-SCRAPER] [FALHA GMAPS] Erro no motor Google Maps: {type(e).__name__}: {e}. Acionando fallback.")

        # 2. Motor de Fallback Resiliente (APENAS acionado se a busca principal falhar criticamente sem retornar nenhum lead)
        # NUNCA acionado para complementar estabelecimentos legítimos com mocks ou padding artificial
        if (source == "osm" or (gmaps_error and leads_found == 0)) and leads_found < max_results:
            remaining = max_results - leads_found
            logger.info(f"[RADAR-SCRAPER] Acionando motor de fallback (apenas registros reais) para coletar até {remaining} leads...")
            try:
                async for lead in self._scrape_fallback_sources(clean_query, remaining):
                    lead_key = lead["name"].strip().lower()
                    if lead_key not in collected_names:
                        collected_names.add(lead_key)
                        leads_found += 1
                        logger.info(f"[RADAR-SCRAPER] [FALLBACK LEAD #{leads_found}/{max_results}] '{lead['name']}' | Tel: {lead['phone']} | Fonte: {lead.get('source', 'fallback')}")
                        yield lead
                        if leads_found >= max_results:
                            logger.info(f"[RADAR-SCRAPER] Meta finalizada via Fallback ({leads_found}/{max_results}).")
                            return
            except Exception as e:
                logger.error(f"[RADAR-SCRAPER] [ERRO FALLBACK] Falha no motor de fallback: {type(e).__name__}: {e}", exc_info=True)

        logger.info(f"[RADAR-SCRAPER] Varredura finalizada. Total de leads legítimos emitidos: {leads_found}/{max_results}")

    async def _scrape_google_maps(
        self, query: str, max_results: int
    ) -> AsyncGenerator[Dict, None]:
        """
        Navegação automatizada no Google Maps com múltiplos seletores,
        detecção de página única e evasão anti-bot.
        """
        async with async_playwright() as p:
            browser = None
            # Tenta canais instalados na máquina: chrome -> msedge -> chromium empacotado
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
                    logger.debug(f"[GMAPS] Tentando lançar navegador (channel={channel})...")
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
                    logger.info(f"[GMAPS] Navegador Playwright inicializado com sucesso (channel={channel or 'chromium_default'})")
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
                logger.debug(f"[GMAPS] Configurando contexto: Viewport={viewport} | UA={user_agent[:45]}...")

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
                status_code = response.status if response else 0
                logger.info(f"[GMAPS] Resposta inicial recebida | Status HTTP: {status_code} | URL: {page.url}")

                await asyncio.sleep(random.uniform(1.0, 1.8))

                # Trata modais de consentimento de cookies da Google
                try:
                    consent_btn = page.locator("button:has-text('Aceitar tudo'), button:has-text('Concordo'), form[action*='consent'] button").first
                    if await consent_btn.is_visible(timeout=1500):
                        logger.info("[GMAPS] Modal de consentimento detectado. Clicando em 'Aceitar tudo'...")
                        await consent_btn.click()
                        await asyncio.sleep(0.8)
                except Exception:
                    pass

                # Caso 1: Redirecionamento direto para a página de um único local
                current_url = page.url
                if "/maps/place/" in current_url:
                    logger.info("[GMAPS] Busca resultou em correspondência direta única (Local único).")
                    name = query
                    try:
                        title_elem = page.locator("h1.DUwDvf, h1").first
                        if await title_elem.is_visible(timeout=2000):
                            name = (await title_elem.inner_text()).strip()
                    except Exception:
                        pass

                    lead_data = await self._extract_place_details(page, name, query)
                    if lead_data:
                        lead_data["source"] = "google_maps_direct"
                        yield lead_data
                    return

                # Caso 2: Lista com múltiplos resultados
                feed_selector = 'div[role="feed"], div[aria-label*="Resultados para"]'
                try:
                    await page.wait_for_selector(feed_selector, timeout=7000)
                    logger.info("[GMAPS] Feed de resultados localizado na página.")
                except Exception:
                    logger.debug("[GMAPS] Seletor de feed direto não encontrado no tempo limite; buscando cards diretamente...")

                extracted_count = 0
                scroll_attempts = 0
                max_scrolls = max(4, (max_results // 3) + 2)

                while extracted_count < max_results and scroll_attempts < max_scrolls:
                    # Busca os blocos completos dos cards de estabelecimentos no feed
                    card_blocks = await page.locator('div.Nv2PK').all()
                    if not card_blocks:
                        card_blocks = await page.locator('a[href*="/maps/place/"]').all()

                    logger.debug(f"[GMAPS] Scroll {scroll_attempts + 1}/{max_scrolls} | Cards encontrados no DOM: {len(card_blocks)}")

                    if not card_blocks and scroll_attempts >= 2:
                        logger.warning("[GMAPS] Nenhum card localizado após múltiplas tentativas de scroll.")
                        break

                    for index, card in enumerate(card_blocks):
                        if extracted_count >= max_results:
                            break

                        try:
                            # 1. Extrai link e nome do estabelecimento
                            link_el = card.locator('a.hfpxzc, a[href*="/maps/place/"]').first
                            if not await link_el.is_visible(timeout=500):
                                continue

                            aria_label = await link_el.get_attribute("aria-label")
                            name = aria_label if aria_label else await link_el.inner_text()
                            name = name.split("\n")[0].strip()

                            if not name or len(name) < 2 or name.lower() in ("resultados", "rotas", "salvar", "menu"):
                                continue

                            # 2. Captura dados já pré-renderizados no próprio card do feed (rating, horário, reviews)
                            card_text = ""
                            try:
                                card_text = await card.inner_text(timeout=500)
                            except Exception:
                                pass

                            snippet_data = {}
                            if card_text:
                                # Rating no card (ex: "4,6")
                                r_match = re.search(r"(\d+[\.,]\d+)", card_text)
                                if r_match:
                                    snippet_data["rating"] = float(r_match.group(1).replace(",", "."))

                                # Reviews no card (ex: "(142)")
                                rev_match = re.search(r"\((\d+[\.,]?\d*)\)", card_text)
                                if rev_match:
                                    clean_rev = rev_match.group(1).replace(".", "").replace(",", "")
                                    if clean_rev.isdigit():
                                        snippet_data["reviews"] = int(clean_rev)

                                # Horário / Status no card (ex: "Aberto · Fecha 22:00" ou "Fechado · Abre às 18:30")
                                h_match = re.search(r"(Aberto[^\n·]*·?[^\n]*|Fechado[^\n·]*·?[^\n]*)", card_text)
                                if h_match:
                                    snippet_data["hours_text"] = h_match.group(1).strip()

                            # 3. Clica no card para abrir o painel lateral com telefone, site e endereço
                            try:
                                await link_el.scroll_into_view_if_needed(timeout=1000)
                                await link_el.click(timeout=1500)
                                # Aguarda o painel abrir aguardando o cabeçalho ou botões de detalhes
                                await page.locator("h1.DUwDvf, button[data-item-id*='address'], button[data-item-id*='phone']").first.wait_for(timeout=2500)
                                await asyncio.sleep(0.4)
                            except Exception as click_err:
                                logger.debug(f"[GMAPS] Aviso ao abrir detalhes do card {index} ({name}): {click_err}")

                            lead_data = await self._extract_place_details(page, name, query, snippet_data)
                            if lead_data:
                                lead_data["source"] = "google_maps"
                                extracted_count += 1
                                yield lead_data

                        except Exception as card_err:
                            logger.debug(f"[GMAPS] Erro ao processar card {index}: {card_err}")
                            continue

                    # Rola a lista de resultados para forçar carregamento incremental
                    feed_elem = page.locator('div[role="feed"]').first
                    try:
                        if await feed_elem.is_visible(timeout=1000):
                            await feed_elem.evaluate("el => el.scrollBy(0, 900)")
                        else:
                            await page.mouse.wheel(0, 750)
                    except Exception:
                        await page.mouse.wheel(0, 750)

                    await asyncio.sleep(random.uniform(1.0, 1.6))
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
                        logger.debug("[GMAPS] Navegador Playwright encerrado com sucesso.")
                    except Exception:
                        pass

    async def _extract_place_details(
        self, page: Page, name: str, original_query: str, snippet: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Extrai campos ricos do painel do estabelecimento no Google Maps
        com timeouts estritos e sem bloquear o loop.
        """
        snip = snippet or {}
        try:
            # 1. Categoria
            category = "Comércio e Serviços"
            cat_elem = page.locator('button[jsaction*="category"], span.fontBodyMedium, button.DkEaL').first
            try:
                if await cat_elem.is_visible(timeout=800):
                    txt = await cat_elem.inner_text(timeout=800)
                    if txt and len(txt) < 50 and not any(c in txt for c in "0123456789"):
                        category = txt.strip()
            except Exception:
                pass

            # 2. Avaliação e Quantidade de Reviews (Apenas dados reais legítimos)
            rating: Optional[float] = snip.get("rating")
            reviews: int = snip.get("reviews", 0)
            try:
                # 1. Nota média (rating)
                rating_elem = page.locator('div.F7nice span[aria-hidden="true"], span.ceNzKf[aria-hidden="true"]').first
                if await rating_elem.is_visible(timeout=500):
                    r_txt = await rating_elem.inner_text(timeout=500)
                    match = re.search(r"(\d+[\.,]\d+)", r_txt)
                    if match:
                        rating = float(match.group(1).replace(",", "."))
                elif rating is None:
                    star_elem = page.locator('span[role="img"][aria-label*="estrela"], span[aria-label*="estrela"]').first
                    if await star_elem.is_visible(timeout=300):
                        aria_star = await star_elem.get_attribute("aria-label") or ""
                        match = re.search(r"(\d+[\.,]\d+)", aria_star)
                        if match:
                            rating = float(match.group(1).replace(",", "."))

                # 2. Quantidade total de avaliações (reviews)
                rev_elem = page.locator('div.F7nice span[aria-label*="avalia"], span[aria-label*="avaliaç"], span[aria-label*="review"]').first
                if await rev_elem.is_visible(timeout=500):
                    rev_aria = await rev_elem.get_attribute("aria-label") or await rev_elem.inner_text(timeout=500)
                    match = re.search(r"([\d\.\,]+)", rev_aria)
                    if match:
                        clean_num = match.group(1).replace(".", "").replace(",", "")
                        if clean_num.isdigit():
                            reviews = int(clean_num)
            except Exception:
                pass

            # 3. Telefone (Apenas número real cadastrado)
            phone_raw = ""
            try:
                phone_elem = page.locator('button[data-tooltip*="Copiar número de telefone"], button[data-item-id*="phone"], button[aria-label*="Telefone"]').first
                if await phone_elem.is_visible(timeout=800):
                    phone_raw = await phone_elem.get_attribute("aria-label") or await phone_elem.inner_text(timeout=600)
                else:
                    main_elem = page.locator('div[role="main"]').first
                    if await main_elem.is_visible(timeout=600):
                        all_text = await main_elem.inner_text(timeout=1000)
                        tel_match = re.search(r"(\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4})", all_text)
                        if tel_match:
                            phone_raw = tel_match.group(1)
            except Exception:
                pass

            phone, is_whatsapp = clean_phone(phone_raw)

            # 4. Website Oficial e Presença Web
            website = None
            try:
                site_elem = page.locator('a[data-tooltip*="Abrir site"], a[data-item-id="authority"], a[data-value="Site"]').first
                if await site_elem.is_visible(timeout=600):
                    website = await site_elem.get_attribute("href")
            except Exception:
                pass

            presence, website_url = classify_web_presence(website)

            # 5. Endereço
            address = ""
            try:
                addr_elem = page.locator('button[data-tooltip*="Copiar endereço"], button[data-item-id*="address"]').first
                if await addr_elem.is_visible(timeout=600):
                    address = await addr_elem.get_attribute("aria-label") or await addr_elem.inner_text(timeout=600)
                    address = address.replace("Endereço: ", "").replace("Endereço:\n", "").strip()
            except Exception:
                pass

            if not address:
                city = self._extract_city(original_query)
                address = f"Região Central — {city}"

            # 6. Quadro de Horários da Semana (Segunda a Domingo)
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
                if await oh_container.is_visible(timeout=500):
                    raw_summary = await oh_container.get_attribute("aria-label") or await oh_container.inner_text(timeout=400)
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

                    # Se a tabela semanal não estiver aberta, clica no seletor para expandir o painel
                    table_elem = page.locator('table.eKjhGd, table.wgFkxc, div[data-item-id*="oh"] table').first
                    if not await table_elem.is_visible(timeout=200):
                        try:
                            await oh_container.click(timeout=800)
                            await asyncio.sleep(0.3)
                        except Exception:
                            pass

                    # Captura linhas da tabela detalhada de horários (dia e horário)
                    rows = await page.locator('table.eKjhGd tr, table.wgFkxc tr, div[data-item-id*="oh"] table tr').all()
                    for r in rows:
                        try:
                            day_el = r.locator('td.ylH6lf, th, td:first-child').first
                            time_el = r.locator('td.mxowUb, td.h39tFd, ul.cLHqxd, td:last-child').first
                            if await day_el.is_visible(timeout=150):
                                day_str = (await day_el.inner_text(timeout=150)).strip().capitalize()
                                time_str = (await time_el.inner_text(timeout=150)).strip().replace("\n", " ")
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
                        for d, h in weekly_hours.items():
                            if not any(p.startswith(d[:3]) for p in parts):
                                parts.append(f"{d[:3]}: {h}")
                        hours_text = " | ".join(parts)
                    elif raw_summary:
                        hours_text = raw_summary
            except Exception as h_err:
                logger.debug(f"[GMAPS] Aviso ao coletar horários de '{name}': {h_err}")

            # Gera ID estável usando hash do nome + cidade
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
        self, query: str, count: int
    ) -> AsyncGenerator[Dict, None]:
        """
        Motor secundário resiliente:
        1. Consulta Overpass API (OpenStreetMap) buscando POIs comerciais com limite e timeout.
        2. Caso indisponível, gera registros de catálogo comercial da cidade para que o usuário
           possa prospectar imediatamente sem tela travada ou erro 500.
        """
        city = self._extract_city(query)
        niche = self._extract_niche(query)
        logger.info(f"[FALLBACK] Iniciando busca secundária para Nicho: '{niche}' | Cidade: '{city}' | Quantidade: {count}")

        yielded = 0

        # Tentativa via Overpass API do OpenStreetMap
        try:
            overpass_leads = await self._query_overpass_osm(niche, city, count)
            for lead in overpass_leads:
                if yielded >= count:
                    return
                yielded += 1
                yield lead
        except Exception as osm_err:
            logger.debug(f"[FALLBACK] Overpass OSM retornou indisponível: {osm_err}")

        # Retorna estritamente os nós legítimos encontrados no OSM, sem catálogo sintético
        return

    async def _query_overpass_osm(self, niche: str, city: str, count: int) -> List[Dict]:
        """
        Executa consulta na API Overpass (OpenStreetMap) filtrando nós comerciais por cidade.
        """
        leads = []
        overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Mapeia termos comuns para tags do OSM
        osm_filter = '["amenity"]'
        n_lower = niche.lower()
        if any(w in n_lower for w in ["pizza", "restaurante", "bar", "lanche", "café", "hamburguer"]):
            osm_filter = '["amenity"~"restaurant|fast_food|cafe|bar"]'
        elif any(w in n_lower for w in ["estetica", "beleza", "salao", "barbearia", "cabelo"]):
            osm_filter = '["shop"~"beauty|hairdresser"]'
        elif any(w in n_lower for w in ["mecanica", "oficina", "auto"]):
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
            logger.info(f"[FALLBACK-OSM] Overpass API Status Code: {resp.status_code}")
            if resp.status_code != 200:
                return []

            data = resp.json()
            elements = data.get("elements", [])
            logger.info(f"[FALLBACK-OSM] Elementos brutos encontrados: {len(elements)}")

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

    def _generate_regional_catalog(self, niche: str, city: str, count: int) -> List[Dict]:
        """
        Gera registros comerciais consistentes e estruturados com base no nicho e cidade
        para garantir que a interface do radar nunca trave em caso de bloqueio total de rede.
        """
        results = []
        ddd = self._infer_ddd(city)

        suffixes = [
            "Express", "Prime", "Premium", "Central", "Master", "Brasil",
            "Sul", "Original", "São José", "da Vila", "Center", "Elite"
        ]
        streets = [
            "Av. Brasil", "Rua XV de Novembro", "Rua Santos Dumont",
            "Av. Dom Pedro II", "Rua Marechal Deodoro", "Av. Castelo Branco"
        ]

        for i in range(count):
            suf = suffixes[i % len(suffixes)]
            name = f"{niche.title()} {suf}"
            if i > len(suffixes):
                name = f"{name} {i + 1}"

            has_site = (i % 3 == 0)
            has_social = (i % 3 == 1)
            presence = "site" if has_site else ("social" if has_social else "none")

            slug = re.sub(r"[^a-zA-Z0-9]", "", name.lower())
            website = f"https://www.{slug}.com.br" if presence == "site" else (
                f"https://instagram.com/{slug}" if presence == "social" else None
            )

            phone_num = f"9{random.randint(8100, 9999)}-{random.randint(1000, 9999)}"
            address = f"{streets[i % len(streets)]}, {random.randint(30, 1500)} — {city}"

            results.append({
                "id": f"catalog-{slug[:10]}-{random.randint(100, 999)}",
                "name": name,
                "category": niche.title(),
                "phone": f"({ddd}) {phone_num}",
                "whatsapp": True,
                "email": f"contato@{slug[:8]}.com.br" if presence == "site" else None,
                "rating": round(random.uniform(4.2, 4.9), 1),
                "reviews": random.randint(15, 95),
                "open": True,
                "closesAt": "18:30",
                "presence": presence,
                "website": website,
                "address": address,
                "source": "radar_catalog"
            })

        return results

    def _extract_city(self, query: str) -> str:
        """Extrai o nome da cidade a partir da query do usuário."""
        parts = re.split(r"\sem\s", query, flags=re.IGNORECASE)
        if len(parts) > 1:
            return parts[1].strip()
        # Procura por hífen (ex: Pizzarias - Videira SC)
        if "-" in query:
            return query.split("-")[-1].strip()
        return "Região Metropolitana"

    def _extract_niche(self, query: str) -> str:
        """Extrai a categoria/nicho a partir da query do usuário."""
        parts = re.split(r"\sem\s", query, flags=re.IGNORECASE)
        niche = parts[0].strip()
        if not niche:
            return "Empresas e Serviços"
        return niche

    def _infer_ddd(self, location_text: str) -> str:
        """Infere o DDD aproximado pelo estado presente na query ou padrão nacional."""
        txt = location_text.upper()
        if "SC" in txt or "SANTA CATARINA" in txt:
            return "49" if any(c in txt for c in ["VIDEIRA", "CAÇADOR", "CHAPECÓ", "JOAÇABA"]) else "48"
        if "SP" in txt or "SÃO PAULO" in txt:
            return "11"
        if "PR" in txt or "PARANÁ" in txt:
            return "41"
        if "RS" in txt or "RIO GRANDE DO SUL" in txt:
            return "51"
        if "RJ" in txt or "RIO DE JANEIRO" in txt:
            return "21"
        if "MG" in txt or "MINAS" in txt:
            return "31"
        return "11"
