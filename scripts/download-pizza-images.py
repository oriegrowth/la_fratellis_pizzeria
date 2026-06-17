import os
import re
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGE_MAP_PATH = os.path.join(ROOT, "client", "src", "lib", "imageMap.ts")
DEST_DIR = os.path.join(ROOT, "client", "public", "images", "pizzas")
BASE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663720809420/FU6gKGYYRQTn2wanmvuX3c"

os.makedirs(DEST_DIR, exist_ok=True)

with open(IMAGE_MAP_PATH, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r"['\"](/manus-storage/([^'\"]+))['\"]")
matches = pattern.findall(content)
if not matches:
    raise SystemExit("Nenhuma entrada de /manus-storage/ encontrada em imageMap.ts")

replacements = {}
for full_path, filename in matches:
    seed = os.path.splitext(os.path.basename(filename))[0]
    remote_url = f"{BASE_URL}/{seed}-Z7uAhZSNPZRncYc4vzBV8k.png"
    local_filename = f"{seed}.png"
    local_path = os.path.join(DEST_DIR, local_filename)
    rel_path = f"images/pizzas/{local_filename}"

    if not os.path.exists(local_path):
        print(f"Downloading {remote_url} -> {local_path}")
        try:
            urllib.request.urlretrieve(remote_url, local_path)
        except urllib.error.HTTPError as exc:
            print(f"Falha ao baixar {remote_url}: {exc}")
            continue

    replacements[full_path] = rel_path

if not replacements:
    raise SystemExit("Nenhuma imagem baixada com sucesso")

new_content = content
for orig, new in replacements.items():
    escaped = re.escape(orig)
    new_content = re.sub(rf"(['\"])" + escaped + r"(['\"])", rf"\1{new}\3", new_content)

with open(IMAGE_MAP_PATH, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Atualizacao de imageMap.ts concluida.")
