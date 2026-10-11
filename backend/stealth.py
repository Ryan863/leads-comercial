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
    Limpa e formata números de telefone nacionais e internacionais (EUA, Austrália, UK, Brasil, etc.).
    Preserva DDI internacional (ex: +1 para EUA, +61 para Austrália) ou aplica o país alvo.
    Garante que qualquer contato comercial válido globalmente possua WhatsApp habilitado.
    """
    if not raw:
        return ("", False)
    
    digits = re.sub(r"\D", "", raw)
    if not digits or len(digits) < 7 or len(digits) > 16:
        return ("", False)
        
    has_plus = raw.strip().startswith("+") or ("+" in raw[:4])

    # 1. Caso com '+' explícito (padrão internacional E.164 no Google Maps)
    if has_plus:
        # Estados Unidos / Canadá (+1)
        if digits.startswith("1") and len(digits) == 11:
            return (f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}", True)
            
        # Austrália (+61)
        if digits.startswith("61") and len(digits) in (10, 11, 12):
            if digits.startswith("614"):  # Mobile (ex: +61 412 345 678)
                return (f"+61 4{digits[3:5]} {digits[5:8]} {digits[8:]}", True)
            return (f"+61 {digits[2]} {digits[3:7]} {digits[7:]}", True)
            
        # Reino Unido (+44)
        if digits.startswith("44") and len(digits) in (11, 12, 13):
            return (f"+44 {digits[2:6]} {digits[6:]}", True)
            
        # Brasil (+55)
        if digits.startswith("55") and len(digits) in (12, 13):
            sub = digits[2:]
            if sub[:2] in VALID_DDDS:
                if len(sub) == 11:
                    return (f"({sub[:2]}) {sub[2:7]}-{sub[7:]}", True)
                return (f"({sub[:2]}) {sub[2:6]}-{sub[6:]}", True)
            return (f"+55 {sub}", True)
            
        return (f"+{digits}", True)

    # 2. Formatação conforme o país alvo detectado na busca
    c = (default_country or "").upper()
    if c in ("US", "CA", "EUA", "USA"):
        if len(digits) == 10:
            return (f"+1 ({digits[:3]}) {digits[3:6]}-{digits[6:]}", True)
        if len(digits) == 11 and digits.startswith("1"):
            return (f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}", True)
            
    if c in ("AU", "AUSTRALIA"):
        if digits.startswith("0") and len(digits) == 10:
            if digits.startswith("04"):
                return (f"+61 4{digits[2:4]} {digits[4:7]} {digits[7:]}", True)
            return (f"+61 {digits[1]} {digits[2:6]} {digits[6:]}", True)
        if len(digits) == 9:
            return (f"+61 {digits[0]} {digits[1:5]} {digits[5:]}", True)

    if c in ("GB", "UK", "ENGLAND"):
        if digits.startswith("0") and len(digits) in (10, 11):
            return (f"+44 {digits[1:5]} {digits[5:]}", True)

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
