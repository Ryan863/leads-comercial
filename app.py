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
# Importação dos Utilitários e Scraper
# ---------------------------------------------------------
from scraper import (
    classify_lead_status,
    clean_clean_url,
    clean_phone_number,
    clean_hours_text,
    scrape_google_maps_leads,
    get_demo_leads
)


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
