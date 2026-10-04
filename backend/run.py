import os
import sys
import subprocess
from dotenv import load_dotenv

def main():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(backend_dir, ".env"))

    host = os.getenv("HOST", "127.0.0.1")
    port = os.getenv("PORT", "8000")

    # Detecta interpretador do ambiente virtual se existir
    venv_python_win = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    venv_python_unix = os.path.join(backend_dir, ".venv", "bin", "python")
    
    if os.path.exists(venv_python_win):
        python_cmd = venv_python_win
    elif os.path.exists(venv_python_unix):
        python_cmd = venv_python_unix
    else:
        python_cmd = sys.executable

    print("=" * 60)
    print("  🚀 SONDAR SCRAPER & RADAR ENGINE BACKEND")
    print("=" * 60)
    print(f"  • Interpretador Python : {python_cmd}")
    print(f"  • Servidor API         : http://{host}:{port}")
    print(f"  • Health Check         : http://{host}:{port}/api/health")
    print(f"  • Documentação Swagger : http://{host}:{port}/docs")
    print("=" * 60)
    print("  Pressione Ctrl+C para encerrar o servidor a qualquer momento.\n")

    cmd = [python_cmd, "-m", "uvicorn", "main:app", "--host", host, "--port", port, "--loop", "asyncio"]
    try:
        subprocess.run(cmd, cwd=backend_dir)
    except KeyboardInterrupt:
        print("\n[*] Servidor encerrado com sucesso pelo usuário.")

if __name__ == "__main__":
    main()
