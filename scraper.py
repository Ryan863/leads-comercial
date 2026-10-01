import re
import sys
import time
import random
import subprocess
import urllib.parse
from playwright.sync_api import sync_playwright

def ensure_playwright_installed():
    """Garante que o navegador Chromium está instalado para o Playwright."""
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            b.close()
            return True
    except Exception:
        try:
            subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
        except Exception:
            try:
                subprocess.run(["playwright", "install", "chromium"], check=True)
            except Exception:
                pass
        return True


def classify_lead_status(website: str) -> str:
    """Classifica o lead com base na presença e no tipo de website."""
    if not website or not str(website).strip() or str(website).strip().lower() in ["n/a", "não informado", "none", "nan", "-", ""]:
        return "Sem Site - Alta Prioridade"
    
    url_lower = str(website).strip().lower()
    social_domains = [
        "instagram.com", "instagr.am",
        "facebook.com", "fb.com", "fb.me",
        "wa.me", "whatsapp.com", "api.whatsapp.com",
        "linktr.ee", "linktree",
        "tiktok.com",
        "twitter.com", "x.com",
        "linkedin.com",
        "beacons.ai", "heylink.me", "bio.link", "campsite.bio",
        "mandarpedido.com", "cardapiodigital", "pedir.delivery", "ola.click"
    ]
    
    for domain in social_domains:
        if domain in url_lower:
            return "Usa Rede Social"
            
    return "Tem Site"


def clean_clean_url(raw_url: str) -> str:
    """Extrai URLs limpas caso venham em redirecionadores do Google."""
    if not raw_url:
        return ""
    if "/url?q=" in raw_url:
        try:
            parsed = urllib.parse.urlparse(raw_url)
            qs = urllib.parse.parse_qs(parsed.query)
            if "q" in qs:
                return qs["q"][0]
        except Exception:
            pass
    return raw_url


def clean_phone_number(raw_phone: str) -> str:
    """Limpa e formata o telefone removendo textos e caracteres de botões."""
    if not raw_phone:
        return "Não informado"
    cleaned = raw_phone.replace("Telefone:", "").replace("Copiar número de telefone", "").replace("Ligar para número de telefone", "").replace("Ligar", "").strip()
    cleaned = re.sub(r'[\r\n\t]+', ' ', cleaned).strip()
    return cleaned if cleaned else "Não informado"


def clean_hours_text(raw_hours: str) -> str:
    """Limpa e simplifica o texto do horário de funcionamento."""
    if not raw_hours:
        return "Não informado"
    cleaned = raw_hours.replace("Horário de funcionamento:", "").replace("⋅ Mais horários", "").replace("⋅ Outros horários", "").replace("Mais horários", "").strip()
    cleaned = re.sub(r'[\r\n\t]+', ' ', cleaned).strip()
    return cleaned if cleaned else "Não informado"


def scrape_google_maps_leads(
    query: str,
    max_results: int = 20,
    headless: bool = True,
    pause_min: float = 1.2,
    pause_max: float = 2.0,
    progress_callback=None
) -> list:
    """
    Executa extração profunda e precisa no Google Maps.
    Fase 1: Coleta das URLs diretas das empresas.
    Fase 2: Visita individual para isolamento completo dos dados.
    """
    leads = []
    encoded_query = urllib.parse.quote(query)
    search_url = f"https://www.google.com/maps/search/{encoded_query}?hl=pt-BR"

    browser_args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--lang=pt-BR",
    ]

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=headless, args=browser_args)
        except Exception as launch_err:
            if "Executable doesn't exist" in str(launch_err) or "playwright install" in str(launch_err):
                if progress_callback:
                    progress_callback("status", "Instalando Chromium no servidor...")
                subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
                browser = p.chromium.launch(headless=headless, args=browser_args)
            else:
                raise launch_err

        context = browser.new_context(
            viewport={"width": 1366, "height": 850},
            locale="pt-BR",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            timezone_id="America/Sao_Paulo"
        )
        page = context.new_page()

        try:
            if progress_callback:
                progress_callback("status", f"Conectando ao Google Maps para '{query}'...")

            page.goto(search_url, wait_until="domcontentloaded", timeout=40000)
            time.sleep(random.uniform(2.0, 3.0))

            # Tratar modal de consentimento do Google
            try:
                for sel in ['button:has-text("Aceitar tudo")', 'button:has-text("Concordo")', 'button:has-text("Aceito")', 'form[action*="consent"] button']:
                    btn = page.locator(sel).first
                    if btn.is_visible(timeout=1500):
                        btn.click()
                        time.sleep(1.0)
                        break
            except Exception:
                pass

            # FASE 1: Coleta das URLs das Empresas
            feed = page.locator('div[role="feed"]').first
            is_feed = False
            try:
                feed.wait_for(state="attached", timeout=6000)
                is_feed = True
            except Exception:
                is_feed = False

            place_entries = []

            if not is_feed:
                h1_single = page.locator('h1.fontHeadlineLarge, div.fontHeadlineLarge, div[role="main"] h1').first
                if h1_single.count() > 0 and h1_single.is_visible(timeout=2000):
                    single_title = h1_single.inner_text().strip()
                    place_entries.append((single_title, page.url))
            else:
                if progress_callback:
                    progress_callback("status", f"Localizando empresas no mapa...")

                consecutive_same = 0
                last_len = 0
                max_scrolls = max(8, int(max_results * 1.5))

                for _ in range(max_scrolls):
                    cards = page.locator('div[role="feed"] a[href*="/maps/place/"]').all()
                    current_len = len(cards)
                    if current_len >= max_results:
                        break

                    feed.evaluate("el => el.scrollBy(0, 1500)")
                    time.sleep(random.uniform(pause_min, pause_max))

                    if current_len == last_len:
                        consecutive_same += 1
                        feed.hover()
                        page.mouse.wheel(0, 2000)
                        time.sleep(1.0)
                        if consecutive_same >= 3:
                            break
                    else:
                        consecutive_same = 0

                    last_len = current_len
                    if progress_callback:
                        progress_callback("status", f"Mapeando empresas ({min(current_len, max_results)}/{max_results} encontradas)...")

                # Extrai os links coletados
                all_links = page.locator('div[role="feed"] a[href*="/maps/place/"]').all()
                seen_urls = set()
                for l in all_links:
                    href = l.get_attribute("href")
                    name = l.get_attribute("aria-label") or ""
                    clean_name = re.sub(r'\(?[^\)]*atualizar resultados[^\)]*\)?', '', name, flags=re.IGNORECASE).strip()
                    if href and href not in seen_urls:
                        seen_urls.add(href)
                        place_entries.append((clean_name, href))
                        if len(place_entries) >= max_results:
                            break

            total_to_process = len(place_entries)
            if total_to_process == 0:
                if progress_callback:
                    progress_callback("status", "Nenhuma empresa localizada para a busca informada.")
                browser.close()
                return leads

            if progress_callback:
                progress_callback("status", f"Iniciando extração profunda de {total_to_process} empresas...")

            # FASE 2: Visita individual a cada link
            for idx, (p_name, p_url) in enumerate(place_entries):
                try:
                    if progress_callback:
                        progress_callback("status", f"Extraindo dados ({idx+1}/{total_to_process}): {p_name}...")

                    page.goto(p_url, wait_until="domcontentloaded", timeout=25000)
                    time.sleep(random.uniform(pause_min, pause_max))

                    # 1. Nome da Empresa
                    h1_el = page.locator('h1.fontHeadlineLarge, div.fontHeadlineLarge, h1').first
                    nome = ""
                    if h1_el.count() > 0:
                        try:
                            txt = h1_el.inner_text().strip()
                            if txt and txt.lower() != "resultados":
                                nome = txt
                        except Exception:
                            pass
                    if not nome:
                        nome = p_name or f"Empresa #{idx+1}"
                    nome = re.sub(r'[\r\n\t]+', ' ', nome)
                    nome = re.sub(r'\(?[^\)]*atualizar resultados[^\)]*\)?', '', nome, flags=re.IGNORECASE).strip()

                    # 2. Categoria
                    categoria = "Comércio / Serviços"
                    try:
                        cat_el = page.locator('button[jsaction*="category"], button.DkEaL').first
                        if cat_el.count() > 0:
                            cat_text = cat_el.inner_text().strip()
                            if cat_text and cat_text.lower() != "saiba mais":
                                categoria = cat_text
                    except Exception:
                        pass

                    # 3. Telefone / WhatsApp
                    telefone = "Não informado"
                    try:
                        phone_el = page.locator('button[data-tooltip*="telefone" i], button[data-item-id*="phone:"], button[aria-label*="Telefone:" i], a[href^="tel:"]').first
                        if phone_el.count() > 0:
                            aria = phone_el.get_attribute("aria-label") or ""
                            txt = phone_el.inner_text().strip()
                            telefone = clean_phone_number(aria or txt)
                    except Exception:
                        pass

                    # 4. Horário de Funcionamento
                    horario = "Não informado"
                    try:
                        hours_el = page.locator('button[data-item-id="oh"], div[aria-label*="horas" i], div[aria-label*="Aberto" i], div[aria-label*="Fechado" i]').first
                        if hours_el.count() > 0:
                            h_aria = hours_el.get_attribute("aria-label") or ""
                            h_txt = hours_el.inner_text().strip()
                            horario = clean_hours_text(h_aria or h_txt)
                    except Exception:
                        pass

                    # 5. Avaliações
                    nota_avaliacoes = "Sem avaliações"
                    try:
                        rating_el = page.locator('div.F7nice').first
                        if rating_el.count() > 0:
                            raw_r = rating_el.inner_text().replace('\n', ' ').strip()
                            if raw_r:
                                nota_avaliacoes = raw_r
                        else:
                            star_el = page.locator('span[role="img"][aria-label*="estrelas"]').first
                            if star_el.count() > 0:
                                nota_avaliacoes = star_el.get_attribute("aria-label") or "Sem avaliações"
                    except Exception:
                        pass

                    # 6. Website Oficial
                    website = ""
                    try:
                        auth_el = page.locator('a[data-item-id="authority"]').first
                        if auth_el.count() > 0:
                            raw_site = auth_el.get_attribute("href") or ""
                            website = clean_clean_url(raw_site)
                    except Exception:
                        pass

                    # 7. Status do Lead
                    status_lead = classify_lead_status(website)

                    lead_record = {
                        "id": idx + 1,
                        "Nome da Empresa": nome,
                        "Categoria": categoria,
                        "Telefone / WhatsApp": telefone,
                        "Horário de Funcionamento": horario,
                        "Nota e Total de Avaliações": nota_avaliacoes,
                        "Website": website if website else "-",
                        "MapsUrl": p_url,
                        "Status do Lead": status_lead
                    }
                    leads.append(lead_record)

                    if progress_callback:
                        progress_callback("lead", lead_record, len(leads), total_to_process)

                except Exception:
                    continue

        except Exception as global_err:
            if progress_callback:
                progress_callback("error", f"Ocorreu uma instabilidade na captura: {global_err}")
        finally:
            browser.close()

    return leads


def get_demo_leads(query: str = "Pizzarias em Videira - SC") -> list:
    """Retorna leads demonstrativos de alta fidelidade para visualização e testes instantâneos."""
    niche = query.split(" em ")[0] if " em " in query else query
    city = query.split(" em ")[1] if " em " in query else "Centro"

    return [
        {
            "id": 1,
            "Nome da Empresa": f"Bella Napoli - {niche.title()}",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 99824-1188",
            "Horário de Funcionamento": "Aberto ⋅ Fecha às 23:30",
            "Nota e Total de Avaliações": "4.8 (342 avaliações)",
            "Website": "-",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Sem Site - Alta Prioridade"
        },
        {
            "id": 2,
            "Nome da Empresa": f"Ponto Central Gourmet",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 99112-4455",
            "Horário de Funcionamento": "Aberto ⋅ Fecha às 22:00",
            "Nota e Total de Avaliações": "4.6 (189 avaliações)",
            "Website": "https://instagram.com/pontocentral.oficial",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Usa Rede Social"
        },
        {
            "id": 3,
            "Nome da Empresa": f"Empório & Sabor Tradicional",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 3566-2210",
            "Horário de Funcionamento": "Aberto ⋅ Fecha às 23:00",
            "Nota e Total de Avaliações": "4.9 (512 avaliações)",
            "Website": "https://emporiosabor.com.br",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Tem Site"
        },
        {
            "id": 4,
            "Nome da Empresa": f"Forneria & Delivery {city.title()}",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 99933-7711",
            "Horário de Funcionamento": "Fechado ⋅ Abre às 18:30",
            "Nota e Total de Avaliações": "4.7 (215 avaliações)",
            "Website": "-",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Sem Site - Alta Prioridade"
        },
        {
            "id": 5,
            "Nome da Empresa": f"Cantina Família Donatello",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 98844-3322",
            "Horário de Funcionamento": "Aberto ⋅ Fecha às 00:00",
            "Nota e Total de Avaliações": "4.5 (98 avaliações)",
            "Website": "https://facebook.com/cantinadonatello",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Usa Rede Social"
        },
        {
            "id": 6,
            "Nome da Empresa": f"Prime Master {niche.title()}",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 99188-5544",
            "Horário de Funcionamento": "Aberto ⋅ Fecha às 23:00",
            "Nota e Total de Avaliações": "4.4 (76 avaliações)",
            "Website": "-",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Sem Site - Alta Prioridade"
        },
        {
            "id": 7,
            "Nome da Empresa": f"Ouro Nobre Artesanal",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 3566-8800",
            "Horário de Funcionamento": "Fechado ⋅ Abre amanhã às 11:00",
            "Nota e Total de Avaliações": "4.9 (420 avaliações)",
            "Website": "https://ouronobre.com.br",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Tem Site"
        },
        {
            "id": 8,
            "Nome da Empresa": f"Express & Sabor Rápido",
            "Categoria": niche.title(),
            "Telefone / WhatsApp": "(49) 99877-2299",
            "Horário de Funcionamento": "Aberto 24 horas",
            "Nota e Total de Avaliações": "4.3 (164 avaliações)",
            "Website": "https://wa.me/5549998772299",
            "MapsUrl": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}",
            "Status do Lead": "Usa Rede Social"
        }
    ]
