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

def clean_phone(raw: str) -> Tuple[str, bool]:
    """
    Normaliza o número de telefone e determina se possui WhatsApp (celular brasileiro).
    Retorna (telefone_formatado, is_whatsapp).
    """
    if not raw:
        return ("", False)
    
    digits = re.sub(r"\D", "", raw)
    
    # Remove código 55 do início se presente
    if digits.startswith("55") and len(digits) >= 12:
        digits = digits[2:]
        
    is_mobile = False
    
    # Formatação para números brasileiros (DDD + 9 dígitos celular ou 8 fixo)
    if len(digits) == 11:
        ddd = digits[:2]
        first_digit = digits[2]
        is_mobile = (first_digit == "9")
        formatted = f"({ddd}) {digits[2:7]}-{digits[7:]}"
    elif len(digits) == 10:
        ddd = digits[:2]
        formatted = f"({ddd}) {digits[2:6]}-{digits[6:]}"
        is_mobile = False
    elif len(digits) >= 8:
        formatted = raw.strip()
        is_mobile = "9" in digits[:4]
    else:
        formatted = raw.strip()
        
    return (formatted, is_mobile)

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
