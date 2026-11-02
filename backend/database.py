import os
import re
import sqlite3
import logging
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger("SondarDB")

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "outreach.db")


def sanitize_phone_e164(raw_phone: Optional[str]) -> Optional[str]:
    """
    Higieniza telefone para formato numérico único (apenas dígitos).
    Para Brasil: garante DDI 55 + DDD (2 dígitos) + número (8 ou 9 dígitos).
    Ex: '(49) 99999-8888' -> '5549999998888'
        '+55 11 98888-7777' -> '5511988887777'
        '049999998888' -> '5549999998888'
    """
    if not raw_phone:
        return None
    digits = re.sub(r"\D", "", str(raw_phone))
    if not digits:
        return None

    # Remove zero inicial (Ex: 049999998888 -> 49999998888)
    if digits.startswith("0") and len(digits) in (11, 12):
        digits = digits[1:]

    # Já possui DDI 55 com DDD e 8 ou 9 dígitos (12 ou 13 dígitos)
    if digits.startswith("55") and len(digits) in (12, 13):
        return digits

    # Número brasileiro sem DDI (10 dígitos fixo ou 11 dígitos celular)
    if len(digits) in (10, 11):
        return f"55{digits}"

    # Números internacionais já formatados com DDI (Ex: 11 a 15 dígitos)
    if len(digits) >= 10:
        return digits

    return None


def get_connection() -> sqlite3.Connection:
    """Cria conexão SQLite com suporte a dicionário e timeout de concorrência."""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def init_db() -> None:
    """Inicializa as tabelas do banco de dados SQLite local caso não existam."""
    os.makedirs(DB_DIR, exist_ok=True)
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Tabela de leads minerados para disparo
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leads_outreach (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                company_name TEXT,
                city TEXT,
                niche TEXT,
                has_website BOOLEAN DEFAULT 0,
                custom_message TEXT NULL,
                status TEXT DEFAULT 'pending',
                sent_at DATETIME NULL,
                error_message TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Migração segura para bases já existentes
        try:
            cursor.execute("ALTER TABLE leads_outreach ADD COLUMN custom_message TEXT NULL;")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE leads_outreach ADD COLUMN presence TEXT NULL;")
        except sqlite3.OperationalError:
            pass

        # Índices para performance em buscas e ordenação
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads_outreach (status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_sent_at ON leads_outreach (sent_at);")

        # 2. Tabela de configurações de disparo
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dispatch_config (
                id INTEGER PRIMARY KEY,
                min_delay_seconds INTEGER DEFAULT 70,
                max_delay_seconds INTEGER DEFAULT 190,
                daily_limit INTEGER DEFAULT 25,
                is_running BOOLEAN DEFAULT 0,
                telegram_bot_token TEXT NULL,
                telegram_chat_id TEXT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Garante linha padrão de configuração (ID = 1)
        cursor.execute("""
            INSERT OR IGNORE INTO dispatch_config (
                id, min_delay_seconds, max_delay_seconds, daily_limit, is_running
            ) VALUES (1, 70, 190, 25, 0);
        """)

        conn.commit()
    logger.info(f"[DB] Banco de dados SQLite local inicializado com sucesso em: {DB_PATH}")


def get_config() -> Dict[str, Any]:
    """Retorna a configuração atual de disparo."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dispatch_config WHERE id = 1;")
        row = cursor.fetchone()
        if not row:
            init_db()
            cursor.execute("SELECT * FROM dispatch_config WHERE id = 1;")
            row = cursor.fetchone()
        return dict(row)


def update_config(
    min_delay_seconds: Optional[int] = None,
    max_delay_seconds: Optional[int] = None,
    daily_limit: Optional[int] = None,
    telegram_bot_token: Optional[str] = None,
    telegram_chat_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Atualiza as configurações de disparo."""
    current = get_config()
    min_delay = min_delay_seconds if min_delay_seconds is not None else current["min_delay_seconds"]
    max_delay = max_delay_seconds if max_delay_seconds is not None else current["max_delay_seconds"]
    limit = daily_limit if daily_limit is not None else current["daily_limit"]
    tg_token = telegram_bot_token if telegram_bot_token is not None else current.get("telegram_bot_token")
    tg_chat = telegram_chat_id if telegram_chat_id is not None else current.get("telegram_chat_id")

    # Validação de intervalos
    if min_delay < 15:
        min_delay = 15
    if max_delay <= min_delay:
        max_delay = min_delay + 10

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dispatch_config
            SET min_delay_seconds = ?,
                max_delay_seconds = ?,
                daily_limit = ?,
                telegram_bot_token = ?,
                telegram_chat_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1;
        """, (min_delay, max_delay, limit, tg_token, tg_chat))
        conn.commit()

    return get_config()


def set_running_state(is_running: bool) -> None:
    """Atualiza a flag is_running no banco de dados."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dispatch_config
            SET is_running = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1;
        """, (1 if is_running else 0,))
        conn.commit()


def sync_leads(raw_leads: List[Dict[str, Any]]) -> Tuple[int, int]:
    """
    Sincroniza uma lista de leads minerados para a fila do SQLite.
    Ignora automaticamente telefones duplicados já cadastrados.
    Retorna (quantidade_inserida, quantidade_ignorada).
    """
    inserted = 0
    ignored = 0

    with get_connection() as conn:
        cursor = conn.cursor()
        for item in raw_leads:
            raw_phone = item.get("phone")
            clean_phone = sanitize_phone_e164(raw_phone)
            if not clean_phone:
                ignored += 1
                continue

            company_name = (item.get("name") or item.get("company_name") or "").strip()
            city = (item.get("city") or "").strip()
            if not city and item.get("address"):
                # Tenta extrair cidade do endereço
                parts = [p.strip() for p in item["address"].split("-") if p.strip()]
                if len(parts) >= 2:
                    city = parts[-2]

            niche = (item.get("searchedNiche") or item.get("category") or item.get("niche") or "").strip()
            
            # Identificação de presença de website vs redes sociais
            presence = (item.get("presence") or "").strip()
            website = (item.get("website") or "").strip()
            is_social_url = bool(re.search(r"instagram\.com|facebook\.com|wa\.me|linktr\.ee", website, re.IGNORECASE))
            if is_social_url and not presence:
                presence = "social"
            elif not presence:
                presence = "site" if website else "none"

            has_site = presence == "site" or (bool(website) and not is_social_url and presence != "social")

            custom_msg = (item.get("custom_message") or item.get("message") or item.get("pitch") or "").strip()

            try:
                cursor.execute("""
                    INSERT INTO leads_outreach (
                        phone, company_name, city, niche, has_website, custom_message, presence, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending');
                """, (clean_phone, company_name, city, niche, 1 if has_site else 0, custom_msg or None, presence))
                inserted += 1
            except sqlite3.IntegrityError:
                # Se o lead já existia e ainda está pendente, atualiza o custom_message caso tenha sido fornecido
                if custom_msg:
                    cursor.execute("""
                        UPDATE leads_outreach
                        SET custom_message = ?,
                            company_name = COALESCE(NULLIF(?, ''), company_name),
                            city = COALESCE(NULLIF(?, ''), city),
                            niche = COALESCE(NULLIF(?, ''), niche),
                            presence = COALESCE(NULLIF(?, ''), presence)
                        WHERE phone = ? AND status IN ('pending', 'queued');
                    """, (custom_msg, company_name, city, niche, presence, clean_phone))
                ignored += 1

        conn.commit()

    logger.info(f"[DB SYNC] Inseridos: {inserted} | Ignorados/Duplicados: {ignored}")
    return inserted, ignored


def get_daily_sent_count() -> int:
    """Retorna o total de mensagens enviadas hoje (horário local)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) AS count
            FROM leads_outreach
            WHERE status = 'sent'
              AND date(sent_at) = date('now', 'localtime');
        """)
        row = cursor.fetchone()
        return row["count"] if row else 0


def get_next_pending_lead() -> Optional[Dict[str, Any]]:
    """Obtém o próximo lead pendente na fila."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM leads_outreach
            WHERE status IN ('pending', 'queued')
            ORDER BY id ASC
            LIMIT 1;
        """)
        row = cursor.fetchone()
        return dict(row) if row else None


def update_lead_status(lead_id: int, status: str, error_message: Optional[str] = None) -> None:
    """Atualiza o status de envio de um lead."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if status == "sent":
            cursor.execute("""
                UPDATE leads_outreach
                SET status = 'sent',
                    sent_at = datetime('now', 'localtime'),
                    error_message = NULL
                WHERE id = ?;
            """, (lead_id,))
        else:
            cursor.execute("""
                UPDATE leads_outreach
                SET status = ?,
                    error_message = ?
                WHERE id = ?;
            """, (status, error_message, lead_id))
        conn.commit()


def get_stats() -> Dict[str, Any]:
    """Retorna estatísticas completas da fila de disparo."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total FROM leads_outreach;")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS pending FROM leads_outreach WHERE status IN ('pending', 'queued');")
        pending = cursor.fetchone()["pending"]

        cursor.execute("SELECT COUNT(*) AS failed FROM leads_outreach WHERE status = 'failed';")
        failed = cursor.fetchone()["failed"]

        cursor.execute("SELECT COUNT(*) AS sent_total FROM leads_outreach WHERE status = 'sent';")
        sent_total = cursor.fetchone()["sent_total"]

        cursor.execute("SELECT COUNT(*) AS no_website FROM leads_outreach WHERE has_website = 0;")
        no_website = cursor.fetchone()["no_website"]

        sent_today = get_daily_sent_count()
        config = get_config()

        return {
            "total_leads": total,
            "pending_count": pending,
            "failed_count": failed,
            "sent_total": sent_total,
            "sent_today": sent_today,
            "no_website_count": no_website,
            "is_running": bool(config.get("is_running", 0)),
            "daily_limit": config.get("daily_limit", 25),
            "min_delay_seconds": config.get("min_delay_seconds", 70),
            "max_delay_seconds": config.get("max_delay_seconds", 190),
            "telegram_configured": bool(config.get("telegram_bot_token") and config.get("telegram_chat_id")),
        }


def get_leads(status: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Lista os leads com paginação e filtro opcional por status."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if status and status != "all":
            cursor.execute("""
                SELECT * FROM leads_outreach
                WHERE status = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?;
            """, (status, limit, offset))
        else:
            cursor.execute("""
                SELECT * FROM leads_outreach
                ORDER BY id DESC
                LIMIT ? OFFSET ?;
            """, (limit, offset))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def reset_failed_leads() -> int:
    """Reseta todos os leads com status 'failed' para 'pending'."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE leads_outreach
            SET status = 'pending', error_message = NULL
            WHERE status = 'failed';
        """)
        count = cursor.rowcount
        conn.commit()
        return count


def clear_queue(only_pending: bool = True) -> int:
    """Limpa a fila de leads pendentes ou total."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if only_pending:
            cursor.execute("DELETE FROM leads_outreach WHERE status IN ('pending', 'queued');")
        else:
            cursor.execute("DELETE FROM leads_outreach;")
        count = cursor.rowcount
        conn.commit()
        return count

