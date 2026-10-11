import random
import re
from typing import Optional, Tuple

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
]

VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1536, "height": 864},
    {"width": 1440, "height": 900},
    {"width": 1366, "height": 768},
]

STEALTH_JS = """
// Sobrescreve detecção de automação (navigator.webdriver)
Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
});

// Emula plugins do Chrome
Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
});

// Emula idiomas comuns em navegadores brasileiros
Object.defineProperty(navigator, 'languages', {
    get: () => ['pt-BR', 'pt', 'en-US', 'en'],
});

// Mock da propriedade chrome.runtime
window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
    app: {}
};

// Evita detecção de headless pelo WebGL
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) {
        return 'Google Inc. (NVIDIA)';
    }
    if (parameter === 37446) {
        return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
    }
    return getParameter.apply(this, [parameter]);
};
"""

def get_random_user_agent() -> str:
    return random.choice(USER_AGENTS)

def get_random_viewport() -> dict:
    return random.choice(VIEWPORTS)

VALID_DDDS = {
    "11", "12", "13", "14", "15", "16", "17", "18", "19",
    "21", "22", "24", "27", "28",
    "31", "32", "33", "34", "35", "37", "38",
    "41", "42", "43", "44", "45", "46", "47", "48", "49",
    "51", "53", "54", "55",
    "61", "62", "63", "64", "65", "66", "67", "68", "69",
    "71", "73", "74", "75", "77", "79",
    "81", "82", "83", "84", "85", "86", "87", "88", "89",
    "91", "92", "93", "94", "95", "96", "97", "98", "99"
}

def clean_phone(raw: str, default_ddd: str = "", default_country: str = "") -> Tuple[str, bool]:
    """
    Limpa e formata números de telefone nacionais e internacionais (EUA, Dubai/EAU, Japão, Austrália, Europa, Brasil, etc.).
    Preserva DDI internacional (ex: +971 para Dubai, +1 para EUA, +81 para Japão) ou aplica o país alvo.
    Garante que qualquer contato comercial válido globalmente possua WhatsApp habilitado.
    """
    if not raw:
        return ("", False)
    
    clean_raw = raw.strip()
    
    # 1. Caso com '+' explícito em qualquer parte da string (Ex: "Phone: +1 305-598-6070", "tel:+97141234567")
    plus_match = re.search(r"\+\s*([0-9\s().-]{7,25})", clean_raw)
    if plus_match:
        digits = re.sub(r"\D", "", plus_match.group(1))
        if len(digits) >= 7 and len(digits) <= 16:
            # Estados Unidos / Canadá (+1)
            if digits.startswith("1") and len(digits) == 11:
                return (f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}", True)
                
            # Emirados Árabes Unidos / Dubai (+971)
            if digits.startswith("971") and len(digits) in (11, 12):
                sub = digits[3:]
                if len(sub) == 8: # Fixo Dubai/Abu Dhabi: +971 4 123 4567
                    return (f"+971 {sub[0]} {sub[1:4]} {sub[4:]}", True)
                return (f"+971 {sub[:2]} {sub[2:5]} {sub[5:]}", True)

            # Japão (+81)
            if digits.startswith("81") and len(digits) in (10, 11, 12):
                sub = digits[2:]
                if len(sub) == 9: # Tokyo/Osaka: +81 3 1234-5678
                    return (f"+81 {sub[:1]} {sub[1:5]}-{sub[5:]}", True)
                if len(sub) == 10: # Celular ou outras províncias: +81 90 1234-5678
                    return (f"+81 {sub[:2]} {sub[2:6]}-{sub[6:]}", True)
                return (f"+81 {sub}", True)

            # Austrália (+61)
            if digits.startswith("61") and len(digits) in (10, 11, 12):
                sub = digits[2:]
                if sub.startswith("4") and len(sub) == 9:
                    return (f"+61 4{sub[1:3]} {sub[3:6]} {sub[6:]}", True)
                return (f"+61 {sub[0]} {sub[1:5]} {sub[5:]}", True)

            # Reino Unido (+44)
            if digits.startswith("44") and len(digits) in (11, 12, 13):
                sub = digits[2:]
                return (f"+44 {sub[:4]} {sub[4:]}", True)

            # Espanha (+34)
            if digits.startswith("34") and len(digits) in (11, 12):
                sub = digits[2:]
                return (f"+34 {sub[:3]} {sub[3:6]} {sub[6:]}", True)

            # Itália (+39)
            if digits.startswith("39") and len(digits) in (11, 12, 13):
                sub = digits[2:]
                return (f"+39 {sub[:3]} {sub[3:6]} {sub[6:]}", True)

            # Alemanha (+49)
            if digits.startswith("49") and len(digits) in (11, 12, 13, 14):
                sub = digits[2:]
                return (f"+49 {sub[:4]} {sub[4:]}", True)

            # França (+33)
            if digits.startswith("33") and len(digits) == 11:
                sub = digits[2:]
                return (f"+33 {sub[0]} {sub[1:3]} {sub[3:5]} {sub[5:7]} {sub[7:]}", True)

            # Suíça (+41)
            if digits.startswith("41") and len(digits) in (11, 12):
                sub = digits[2:]
                return (f"+41 {sub[:2]} {sub[2:5]} {sub[5:7]} {sub[7:]}", True)

            # Holanda (+31)
            if digits.startswith("31") and len(digits) in (11, 12):
                sub = digits[2:]
                return (f"+31 {sub[:2]} {sub[2:5]} {sub[5:]}", True)

            # Irlanda (+353)
            if digits.startswith("353") and len(digits) in (11, 12):
                sub = digits[3:]
                return (f"+353 {sub[:2]} {sub[2:5]} {sub[5:]}", True)

            # Bélgica (+32)
            if digits.startswith("32") and len(digits) in (10, 11):
                sub = digits[2:]
                return (f"+32 {sub[:2]} {sub[2:5]} {sub[5:]}", True)

            # Suécia (+46)
            if digits.startswith("46") and len(digits) in (11, 12):
                sub = digits[2:]
                return (f"+46 {sub[:2]} {sub[2:5]} {sub[5:]}", True)

            # Noruega (+47)
            if digits.startswith("47") and len(digits) == 10:
                sub = digits[2:]
                return (f"+47 {sub[:2]} {sub[2:5]} {sub[5:]}", True)

            # Polônia (+48)
            if digits.startswith("48") and len(digits) == 11:
                sub = digits[2:]
                return (f"+48 {sub[:3]} {sub[3:6]} {sub[6:]}", True)

            # Áustria (+43)
            if digits.startswith("43") and len(digits) in (11, 12, 13):
                sub = digits[2:]
                return (f"+43 {sub[:3]} {sub[3:6]} {sub[6:]}", True)

            # Brasil (+55)
            if digits.startswith("55") and len(digits) in (12, 13):
                sub = digits[2:]
                if sub[:2] in VALID_DDDS:
                    if len(sub) == 11:
                        return (f"({sub[:2]}) {sub[2:7]}-{sub[7:]}", True)
                    return (f"({sub[:2]}) {sub[2:6]}-{sub[6:]}", True)
                return (f"+55 {sub}", True)

            return (f"+{digits}", True)

    digits = re.sub(r"\D", "", clean_raw)
    if not digits or len(digits) < 7 or len(digits) > 16:
        return ("", False)

    # 2. Formatação conforme o país alvo detectado na busca ou selecionado
    c = (default_country or "").upper()

    if c in ("AE", "DUBAI", "EMIRADOS", "UAE"):
        if digits.startswith("971"):
            digits = digits[3:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 8:
            return (f"+971 {digits[0]} {digits[1:4]} {digits[4:]}", True)
        if len(digits) >= 9:
            return (f"+971 {digits[:2]} {digits[2:5]} {digits[5:]}", True)
        return (f"+971 {digits}", True)

    if c in ("US", "CA", "EUA", "USA"):
        if digits.startswith("1") and len(digits) == 11:
            digits = digits[1:]
        if len(digits) == 10:
            return (f"+1 ({digits[:3]}) {digits[3:6]}-{digits[6:]}", True)
        if len(digits) >= 10:
            return (f"+1 {digits}", True)

    if c in ("JP", "JAPAN", "JAPAO"):
        if digits.startswith("81"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 9:
            return (f"+81 {digits[0]} {digits[1:5]}-{digits[5:]}", True)
        if len(digits) in (10, 11):
            return (f"+81 {digits[:2]} {digits[2:6]}-{digits[6:]}", True)
        return (f"+81 {digits}", True)

    if c in ("AU", "AUSTRALIA"):
        if digits.startswith("61"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if digits.startswith("4") and len(digits) == 9:
            return (f"+61 4{digits[1:3]} {digits[3:6]} {digits[6:]}", True)
        if len(digits) == 9:
            return (f"+61 {digits[0]} {digits[1:5]} {digits[5:]}", True)
        return (f"+61 {digits}", True)

    if c in ("GB", "UK", "ENGLAND", "REINO UNIDO"):
        if digits.startswith("44"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) >= 9:
            return (f"+44 {digits[:4]} {digits[4:]}", True)

    if c in ("ES", "ESPANHA", "SPAIN"):
        if digits.startswith("34"):
            digits = digits[2:]
        if len(digits) == 9:
            return (f"+34 {digits[:3]} {digits[3:6]} {digits[6:]}", True)

    if c in ("IT", "ITALIA", "ITALY"):
        if digits.startswith("39"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) >= 9:
            return (f"+39 {digits[:3]} {digits[3:6]} {digits[6:]}", True)

    if c in ("DE", "ALEMANHA", "GERMANY"):
        if digits.startswith("49"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) >= 9:
            return (f"+49 {digits[:4]} {digits[4:]}", True)

    if c in ("FR", "FRANCA", "FRANCE"):
        if digits.startswith("33"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 9:
            return (f"+33 {digits[0]} {digits[1:3]} {digits[3:5]} {digits[5:7]} {digits[7:]}", True)

    if c in ("CH", "SUICA", "SWITZERLAND"):
        if digits.startswith("41"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 9:
            return (f"+41 {digits[:2]} {digits[2:5]} {digits[5:7]} {digits[7:]}", True)

    if c in ("NL", "HOLANDA", "NETHERLANDS"):
        if digits.startswith("31"):
            digits = digits[2:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) == 9:
            return (f"+31 {digits[:2]} {digits[2:5]} {digits[5:]}", True)

    if c in ("IE", "IRLANDA", "IRELAND"):
        if digits.startswith("353"):
            digits = digits[3:]
        if digits.startswith("0"):
            digits = digits[1:]
        if len(digits) >= 8:
            return (f"+353 {digits[:2]} {digits[2:5]} {digits[5:]}", True)

    # 3. Brasil (Padrão quando DDD é informado ou número casa com DDD brasileiro)
    clean_def_ddd = re.sub(r"\D", "", default_ddd or "")
    b_digits = digits
    if b_digits.startswith("55") and len(b_digits) in (12, 13):
        b_digits = b_digits[2:]
    if b_digits.startswith("0") and len(b_digits) in (11, 12):
        b_digits = b_digits[1:]
    if len(b_digits) in (8, 9) and clean_def_ddd in VALID_DDDS:
        b_digits = f"{clean_def_ddd}{b_digits}"

    if len(b_digits) in (10, 11) and b_digits[:2] in VALID_DDDS:
        ddd = b_digits[:2]
        if len(b_digits) == 11:
            return (f"({ddd}) {b_digits[2:7]}-{b_digits[7:]}", True)
        return (f"({ddd}) {b_digits[2:6]}-{b_digits[6:]}", True)

    # 4. Fallback Internacional Geral
    if len(digits) == 10:
        return (f"+1 ({digits[:3]}) {digits[3:6]}-{digits[6:]}", True)
    return (f"+{digits}", True)

def classify_web_presence(website: Optional[str]) -> Tuple[str, Optional[str]]:
    """
    Classifica a presença online em:
    - 'none': Sem site (Alta prioridade comercial)
    - 'social': Usa link de Instagram/Facebook como site
    - 'site': Possui site institucional / domínio próprio
    """
    if not website or not website.strip():
        return ("none", None)
        
    url = website.strip().lower()
    
    social_domains = [
        "instagram.com", "facebook.com", "fb.com", "linktr.ee", 
        "bio.link", "wa.me", "api.whatsapp.com", "tiktok.com"
    ]
    
    for s in social_domains:
        if s in url:
            return ("social", website.strip())
            
    return ("site", website.strip())
