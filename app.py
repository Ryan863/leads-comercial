import io
import os
import re
import sys
import time
import random
import subprocess
import urllib.parse
import pandas as pd
import streamlit as st
from playwright.sync_api import sync_playwright

# ---------------------------------------------------------
# Auto-instalação do Chromium para Ambientes Cloud (Streamlit Cloud / Linux)
# ---------------------------------------------------------
@st.cache_resource(show_spinner="Preparando navegador no servidor...")
def ensure_playwright_installed():
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

ensure_playwright_installed()

# ---------------------------------------------------------
# Configuração da Página Streamlit
# ---------------------------------------------------------
st.set_page_config(
    page_title="Leads Radar | Google Maps Extractor",
    page_icon="📍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilização visual moderna e profissional (compatível com tema Claro e Escuro)
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        font-size: 1.05rem;
        opacity: 0.8;
        margin-bottom: 1.5rem;
    }
    .metric-box {
        background-color: rgba(128, 128, 128, 0.08);
        border: 1px solid rgba(128, 128, 128, 0.2);
        border-radius: 10px;
        padding: 14px 18px;
        text-align: center;
        margin-bottom: 15px;
    }
    .metric-value {
        font-size: 1.8rem;
        font-weight: bold;
    }
    .metric-label {
        font-size: 0.85rem;
        opacity: 0.8;
        margin-top: 4px;
    }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------
# Funções Utilitárias de Classificação e Limpeza
# ---------------------------------------------------------
def classify_lead_status(website: str) -> str:
    """Classifica o lead com base na presença e no tipo de website."""
    if not website or not str(website).strip() or str(website).strip().lower() in ["n/a", "não informado", "none", "nan", "-"]:
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


# ---------------------------------------------------------
# Robô Playwright de Extração Direta e Precisa
# ---------------------------------------------------------
def scrape_google_maps_leads(
    query: str,
    max_results: int = 20,
    headless: bool = True,
    pause_min: float = 1.2,
    pause_max: float = 2.0,
    progress_callback=None
) -> list:
    """
    Executa extração em duas fases de altíssima precisão:
    Fase 1: Varre o feed de pesquisa e coleta os links diretos das empresas.
    Fase 2: Visita cada link individualmente, garantindo isolamento total dos dados de cada empresa.
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
                    progress_callback("status", "Baixando Chromium no servidor...")
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

            # Tratar modal de consentimento do Google se existir
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

            # Se não houver feed, verifica se foi direto para a página de um único estabelecimento
            if not is_feed:
                h1_single = page.locator('h1.fontHeadlineLarge, div.fontHeadlineLarge, div[role="main"] h1').first
                if h1_single.count() > 0 and h1_single.is_visible(timeout=2000):
                    single_title = h1_single.inner_text().strip()
                    place_entries.append((single_title, page.url))
            else:
                if progress_callback:
                    progress_callback("status", f"Localizando empresas no mapa para atingir {max_results} leads...")

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
                        progress_callback("status", f"Mapeando lista de empresas ({min(current_len, max_results)}/{max_results} encontradas)...")

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
                progress_callback("status", f"Iniciando extração profunda e isolada de {total_to_process} empresas...")

            # FASE 2: Visita individual a cada link para garantir dados 100% reais e isolados
            for idx, (p_name, p_url) in enumerate(place_entries):
                try:
                    if progress_callback:
                        progress_callback("status", f"Extraindo lead ({idx+1}/{total_to_process}): {p_name}...")

                    # Acessa diretamente a página do estabelecimento
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

                    # 2. Categoria Real (Ex.: Pizzaria, Agência Imobiliária, etc.)
                    categoria = "Não informada"
                    try:
                        cat_el = page.locator('button[jsaction*="category"], button.DkEaL').first
                        if cat_el.count() > 0:
                            cat_text = cat_el.inner_text().strip()
                            if cat_text and cat_text.lower() != "saiba mais":
                                categoria = cat_text
                    except Exception:
                        pass

                    # 3. Telefone / WhatsApp Real
                    telefone = "Não informado"
                    try:
                        phone_el = page.locator('button[data-tooltip*="telefone" i], button[data-item-id*="phone:"], button[aria-label*="Telefone:" i], a[href^="tel:"]').first
                        if phone_el.count() > 0:
                            aria = phone_el.get_attribute("aria-label") or ""
                            txt = phone_el.inner_text().strip()
                            telefone = clean_phone_number(aria or txt)
                    except Exception:
                        pass

                    # 4. Horário de Funcionamento em Tempo Real
                    horario = "Não informado"
                    try:
                        hours_el = page.locator('button[data-item-id="oh"], div[aria-label*="horas" i], div[aria-label*="Aberto" i], div[aria-label*="Fechado" i]').first
                        if hours_el.count() > 0:
                            h_aria = hours_el.get_attribute("aria-label") or ""
                            h_txt = hours_el.inner_text().strip()
                            horario = clean_hours_text(h_aria or h_txt)
                    except Exception:
                        pass

                    # 5. Avaliações e Estrelas
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

                    # 6. Website Oficial (exclusivo desta empresa)
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
                        "Nome da Empresa": nome,
                        "Categoria": categoria,
                        "Telefone / WhatsApp": telefone,
                        "Horário de Funcionamento": horario,
                        "Nota e Total de Avaliações": nota_avaliacoes,
                        "Website": website if website else "-",
                        "Status do Lead": status_lead
                    }
                    leads.append(lead_record)

                    if progress_callback:
                        progress_callback("lead", lead_record, len(leads), total_to_process)

                except Exception as item_err:
                    continue

        except Exception as global_err:
            if progress_callback:
                progress_callback("error", f"Ocorreu uma instabilidade na captura: {global_err}")
        finally:
            browser.close()

    return leads


# ---------------------------------------------------------
# Interface do Usuário com Streamlit
# ---------------------------------------------------------
def main():
    if "leads_data" not in st.session_state:
        st.session_state.leads_data = []
    if "is_scraping" not in st.session_state:
        st.session_state.is_scraping = False

    # Barra Lateral
    with st.sidebar:
        st.title("📍 Parâmetros da Busca")
        st.markdown("Configure a varredura comercial de leads no Google Maps.")

        search_input = st.text_input(
            "Termo de Pesquisa:",
            value="Pizzarias em Videira - SC",
            help="Exemplo: 'Clínicas Odontológicas em Videira - SC', 'Imobiliárias em Florianópolis', etc."
        )

        max_results_input = st.number_input(
            "Quantidade Máxima de Leads:",
            min_value=3,
            max_value=150,
            value=10,
            step=5,
            help="Define o limite de empresas a serem extraídas."
        )

        with st.expander("⚙️ Configurações Avançadas", expanded=False):
            headless_mode = st.checkbox("Modo Headless (em segundo plano)", value=True, help="Executa o navegador sem abrir janela visual.")
            pause_time = st.slider("Velocidade da Varredura (segundos de pausa):", min_value=1.0, max_value=3.0, value=1.5, step=0.25, help="Pausas realistas evitam bloqueios temporários do Google.")

        st.markdown("---")
        btn_iniciar = st.button("🚀 Iniciar Varredura", type="primary", use_container_width=True, disabled=st.session_state.is_scraping)

        st.markdown("---")
        st.subheader("💡 Legenda do Status do Lead")
        st.markdown("""
        - 🚨 **Sem Site - Alta Prioridade**: Empresa não tem website listado. Oportunidade ouro para venda de landing pages e sites institucionais.
        - 📱 **Usa Rede Social**: Depende de Instagram ou WhatsApp como página principal. Público ideal para modernização e autoridade digital.
        - 🌐 **Tem Site**: Já possui presença na web com domínio próprio. Potencial para SEO, tráfego pago ou reformulação.
        """)

    # Área Principal
    st.markdown('<div class="main-header">📍 Radar de Leads Comerciais - Google Maps</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Extraia telefones reais, categorias, websites e horários de funcionamento de empresas locais em tempo real.</div>', unsafe_allow_html=True)

    # Execução da Varredura
    if btn_iniciar:
        if not search_input.strip():
            st.warning("Por favor, digite um termo de pesquisa válido antes de iniciar.")
            return

        st.session_state.is_scraping = True
        progress_bar = st.progress(0.0)
        status_box = st.empty()
        live_preview = st.empty()

        temp_leads = []

        def handle_progress(evt_type, msg_or_data, current=0, total=0):
            if evt_type == "status":
                status_box.info(f"⏳ {msg_or_data}")
            elif evt_type == "lead":
                temp_leads.append(msg_or_data)
                pct = min(1.0, current / max(1, total))
                progress_bar.progress(pct)
                status_box.success(
                    f"✅ **[{current}/{total}]** Coletado: **{msg_or_data['Nome da Empresa']}** "
                    f"({msg_or_data['Categoria']}) — `{msg_or_data['Status do Lead']}`"
                )
                preview_df = pd.DataFrame(temp_leads)
                preview_cols = [c for c in ["Nome da Empresa", "Categoria", "Telefone / WhatsApp", "Horário de Funcionamento", "Website", "Status do Lead"] if c in preview_df.columns]
                live_preview.dataframe(
                    preview_df[preview_cols].tail(5),
                    use_container_width=True,
                    hide_index=True
                )
            elif evt_type == "error":
                status_box.error(f"⚠️ {msg_or_data}")

        try:
            with st.spinner("Varredura profunda em andamento no Google Maps..."):
                extracted_leads = scrape_google_maps_leads(
                    query=search_input.strip(),
                    max_results=int(max_results_input),
                    headless=headless_mode,
                    pause_min=pause_time,
                    pause_max=pause_time + 0.6,
                    progress_callback=handle_progress
                )

            if extracted_leads:
                st.session_state.leads_data = extracted_leads
                progress_bar.progress(1.0)
                status_box.success(f"🎉 Varredura concluída! **{len(extracted_leads)} leads reais** capturados com sucesso.")
                time.sleep(1.0)
                st.rerun()
            else:
                st.warning("Nenhum lead foi localizado para os termos informados. Tente refinar a busca.")

        except Exception as err:
            st.error(f"Erro inesperado durante a varredura: {err}")
        finally:
            st.session_state.is_scraping = False

    # Exibição dos Dados e Exportação
    if st.session_state.leads_data:
        df = pd.DataFrame(st.session_state.leads_data)

        # Painel de Métricas Consolidado
        total_leads = len(df)
        sem_site = len(df[df["Status do Lead"] == "Sem Site - Alta Prioridade"])
        rede_social = len(df[df["Status do Lead"] == "Usa Rede Social"])
        tem_site = len(df[df["Status do Lead"] == "Tem Site"])

        st.markdown("### 📊 Visão Geral dos Leads")
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total de Empresas", total_leads)
        m2.metric("Sem Site (Alta Prioridade)", f"{sem_site} ({sem_site/max(1, total_leads)*100:.1f}%)")
        m3.metric("Usa Rede Social", f"{rede_social} ({rede_social/max(1, total_leads)*100:.1f}%)")
        m4.metric("Tem Site Próprio", f"{tem_site} ({tem_site/max(1, total_leads)*100:.1f}%)")

        st.markdown("---")

        # Filtros Interativos na Tabela
        col_filtro_status, col_busca_texto = st.columns([1, 2])
        with col_filtro_status:
            filtro_status = st.selectbox(
                "Filtrar por Status do Lead:",
                options=["Todos", "Sem Site - Alta Prioridade", "Usa Rede Social", "Tem Site"],
                index=0
            )

        with col_busca_texto:
            busca_texto = st.text_input(
                "Pesquisar na lista (Nome, Categoria, Telefone, Horário):",
                placeholder="Digite algo para filtrar..."
            )

        # Aplicação dos Filtros
        df_filtrado = df.copy()
        if filtro_status != "Todos":
            df_filtrado = df_filtrado[df_filtrado["Status do Lead"] == filtro_status]
        
        if busca_texto.strip():
            termo = busca_texto.strip().lower()
            df_filtrado = df_filtrado[
                df_filtrado["Nome da Empresa"].str.lower().str.contains(termo, na=False) |
                df_filtrado["Categoria"].str.lower().str.contains(termo, na=False) |
                df_filtrado["Telefone / WhatsApp"].str.lower().str.contains(termo, na=False) |
                df_filtrado["Horário de Funcionamento"].str.lower().str.contains(termo, na=False)
            ]

        # Tabela Interativa
        st.markdown(f"#### 📋 Resultados Encontrados ({len(df_filtrado)} de {len(df)})")
        st.dataframe(
            df_filtrado,
            use_container_width=True,
            hide_index=True,
            height=450,
            column_config={
                "Nome da Empresa": st.column_config.TextColumn("Nome da Empresa", width="medium"),
                "Categoria": st.column_config.TextColumn("Categoria", width="small"),
                "Telefone / WhatsApp": st.column_config.TextColumn("Telefone / WhatsApp", width="small"),
                "Horário de Funcionamento": st.column_config.TextColumn("Horário de Funcionamento", width="medium"),
                "Nota e Total de Avaliações": st.column_config.TextColumn("Avaliações", width="small"),
                "Website": st.column_config.LinkColumn("Website", width="medium"),
                "Status do Lead": st.column_config.TextColumn("Status do Lead", width="medium")
            }
        )

        # Área de Download
        st.markdown("### 📥 Exportar Resultados")
        d1, d2 = st.columns(2)

        # 1. Exportação para CSV (UTF-8 com BOM para Excel no Windows)
        csv_buffer = df.to_csv(index=False, sep=";").encode("utf-8-sig")
        d1.download_button(
            label="📄 Baixar Lista em CSV (Ponto e Vírgula)",
            data=csv_buffer,
            file_name=f"leads_google_maps_{int(time.time())}.csv",
            mime="text/csv",
            use_container_width=True
        )

        # 2. Exportação para Excel (.xlsx)
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Leads Google Maps")
            worksheet = writer.sheets["Leads Google Maps"]
            for col in worksheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = col[0].column_letter
                worksheet.column_dimensions[col_letter].width = max(max_len + 3, 14)

        excel_data = excel_buffer.getvalue()
        d2.download_button(
            label="📊 Baixar Lista em Excel (.xlsx)",
            data=excel_data,
            file_name=f"leads_google_maps_{int(time.time())}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True
        )

    else:
        if not st.session_state.is_scraping:
            st.info("👋 Pronto para começar! Digite o nicho e local desejados na barra lateral e clique em **'Iniciar Varredura'**.")


if __name__ == "__main__":
    main()
