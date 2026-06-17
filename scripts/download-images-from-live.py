import os
import urllib.request
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGE_MAP_PATH = os.path.join(ROOT, "client", "src", "lib", "imageMap.ts")
DEST_DIR = os.path.join(ROOT, "client", "public", "images", "pizzas")
BASE_URL = "https://lafratelli-fu6gkgyy.manus.space/manus-storage"

os.makedirs(DEST_DIR, exist_ok=True)

opener = urllib.request.build_opener()
opener.addheaders = [
    ("User-Agent", "Mozilla/5.0"),
    ("Referer", "https://lafratelli-fu6gkgyy.manus.space/"),
]

# List of pizza images from the live site
pizzas = [
    "pizza_alho_2a622e0e.webp",
    "pizza_atum_431fb760.webp",
    "pizza_bacon_bb66d14d.webp",
    "pizza_baiana_2667d91c.webp",
    "pizza_bauru_09ee9b41.webp",
    "pizza_caipira_5653ff8a.webp",
    "pizza_calabresa_6459bbcb.webp",
    "pizza_portuguesa_bfedc480.webp",
    "pizza_la_fratellis_9f4b0ead.webp",
    "pizza_calabresa_especial_03b39d74.webp",
    "pizza_calamussa_6c8ce601.webp",
    "pizza_brocolis_f47812bc.webp",
    "pizza_frango_batata_palha_00e2295f.webp",
    "pizza_frango_catupiry_4097c9b1.webp",
    "pizza_frango_cheddar_93c9b62a.webp",
    "pizza_milho_df344383.webp",
    "pizza_mussarela_3bfbf082.webp",
    "pizza_palmito_f7d1e04c.webp",
    "pizza_peito_peru_0cab38cb.webp",
    "pizza_pepperoni_812e273f.webp",
    "pizza_rucula_7044cb1b.webp",
    "pizza_dois_queijos_6c17506e.webp",
    "pizza_marguerita_2cd5c73d.webp",
    "pizza_quatro_queijos_43d0afd1.webp",
    "pizza_siciliana_c936cda7.webp",
    "pizza_toscana_4913b1ba.webp",
    "pizza_vegetariana_b0efffac.webp",
    "pizza_chocolate_b422f27c.webp",
    "pizza_nutella_morango_284296bd.webp",
    "pizza_nevada_8daff78e.webp",
    "pizza_prestigio_c53fe5b4.webp",
    "pizza_sensacao_51855498.webp",
]

# Download all images
for pizza_file in pizzas:
    remote_url = f"{BASE_URL}/{pizza_file}"
    local_path = os.path.join(DEST_DIR, pizza_file)
    
    if not os.path.exists(local_path):
        print(f"Downloading {pizza_file}...")
        try:
            with opener.open(remote_url) as response, open(local_path, "wb") as f:
                f.write(response.read())
            print(f"  OK Saved to {local_path}")
        except Exception as e:
            print(f"  ERROR {e}")
    else:
        print(f"Already exists: {pizza_file}")

# Now update imageMap.ts
print("\nReading imageMap.ts...")
with open(IMAGE_MAP_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Replace /manus-storage/ paths with images/pizzas/ paths
# Match pattern: '/manus-storage/pizza_*.webp'
pattern = r"'/manus-storage/(pizza_[^']+\.webp)'"
replacement = r"'images/pizzas/\1'"
new_content = re.sub(pattern, replacement, content)

# Write back
if new_content != content:
    with open(IMAGE_MAP_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("OK Updated imageMap.ts with local paths")
else:
    print("imageMap.ts already has local paths or no matches found")

print("\nDone! All images downloaded and imageMap.ts updated.")
