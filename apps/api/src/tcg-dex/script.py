import json
import pymysql

# 🔹 Charger les données JSON
json_path = "./JSON/SV04.json"
with open(json_path, "r", encoding="utf-8") as file:
    data = json.load(file)

# 🔹 Connexion à MySQL
conn = pymysql.connect(
    host="localhost",
    user="root",
    password="root",
    database="TCGNexus",
    port=8889,  # ✅ Mettre 8889 au lieu de 3306
    unix_socket="/Applications/MAMP/tmp/mysql/mysql.sock",  # ✅ Spécifier le socket MySQL de MAMP
    charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor
)
cursor = conn.cursor()

# 🔹 Création des tables (si elles n'existent pas)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS Series (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS Sets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        series_id INT,
        set_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        total_cards INT NOT NULL,
        logo_url TEXT,
        symbol_url TEXT,
        FOREIGN KEY (series_id) REFERENCES Series(id) ON DELETE CASCADE
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS Cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        set_id INT,
        card_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        rarity VARCHAR(50),
        hp INT,
        types TEXT,
        image_url TEXT,
        stage VARCHAR(50),
        FOREIGN KEY (set_id) REFERENCES Sets(id) ON DELETE CASCADE
    )
""")

# 🔹 Insérer la Série "Scarlet & Violet" si elle n'existe pas
series_name = "Scarlet & Violet"
cursor.execute("SELECT id FROM Series WHERE name = %s", (series_name,))
series = cursor.fetchone()
if series is None:
    cursor.execute("INSERT INTO Series (name) VALUES (%s)", (series_name,))
    conn.commit()
    series_id = cursor.lastrowid
else:
    series_id = series["id"]

# 🔹 Insérer le Set "Forces Temporelles"
set_data = data["cards"][0]["set"]
set_id = set_data["id"]
set_name = set_data["name"]
total_cards = set_data["cardCount"]["official"]
logo_url = set_data["logo"]
symbol_url = set_data["symbol"]

cursor.execute(
    "INSERT INTO Sets (series_id, set_id, name, total_cards, logo_url, symbol_url) "
    "VALUES (%s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE name=name",
    (series_id, set_id, set_name, total_cards, logo_url, symbol_url)
)

conn.commit()
cursor.execute("SELECT id FROM Sets WHERE set_id = %s", (set_id,))
set_db_id = cursor.fetchone()["id"]

# 🔹 Insérer les Cartes
for card in data["cards"]:
    card_id = card["id"]
    name = card["name"]
    rarity = card.get("rarity", None)
    hp = card.get("hp", None)
    types = ",".join(card.get("types", []))  # Convertir liste en chaîne
    image_url = card["image"]
    stage = card.get("stage", None)

    cursor.execute(
        "INSERT INTO Cards (set_id, card_id, name, rarity, hp, types, image_url, stage) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE name=name",
        (set_db_id, card_id, name, rarity, hp, types, image_url, stage)
    )

# 🔹 Valider et fermer la connexion
conn.commit()
cursor.close()
conn.close()

print("✅ Importation terminée avec succès !")
