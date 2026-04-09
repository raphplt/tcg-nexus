"""
Script d'import des données TCGdex
Importe séries, sets et cartes depuis le microservice fetch
"""
import os
import requests
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Series, Set, Card



FETCH_API_URL = os.getenv("FETCH_API_URL")

def create_tables():
    """Crée toutes les tables en base de données"""
    print("📦 Création des tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées")


def import_series(db: Session) -> dict:
    """
    Importe toutes les séries depuis le microservice
    Retourne un dict {series_id: Series}
    """
    print("\n📥 Import des séries...")
    try:
        response = requests.get(f"{FETCH_API_URL}/seriesDetails", timeout=30)
        response.raise_for_status()
        series_data = response.json()
        
        series_dict = {}
        for item in series_data:
            series = db.query(Series).filter(Series.id == item["id"]).first()
            
            if series:
                # Mise à jour
                series.name = item["name"]
                series.logo = item.get("logo")
                series.updated_at = datetime.now()
                print(f"  🔄 Série mise à jour : {series.name}")
            else:
                # Création
                series = Series(
                    id=item["id"],
                    name=item["name"],
                    logo=item.get("logo")
                )
                db.add(series)
                print(f"  ✅ Série ajoutée : {series.name}")
            
            series_dict[item["id"]] = series
        
        db.commit()
        print(f"✅ {len(series_dict)} séries importées")
        return series_dict
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de l'import des séries : {e}")
        raise


def import_sets(db: Session) -> dict:
    """
    Importe tous les sets depuis le microservice
    Retourne un dict {set_id: Set}
    """
    print("\n📥 Import des sets...")
    try:
        response = requests.get(f"{FETCH_API_URL}/setsDetails", timeout=60)
        response.raise_for_status()
        sets_data = response.json()
        
        sets_dict = {}
        for item in sets_data:
            set_obj = db.query(Set).filter(Set.id == item["id"]).first()
            
            # Parser la date de sortie
            release_date = None
            if item.get("releaseDate"):
                try:
                    release_date = datetime.strptime(item["releaseDate"], "%Y/%m/%d").date()
                except:
                    pass
            
            if set_obj:
                # Mise à jour
                set_obj.name = item["name"]
                set_obj.logo = item.get("logo")
                set_obj.symbol = item.get("symbol")
                set_obj.card_count_official = item.get("cardCount", {}).get("official")
                set_obj.card_count_total = item.get("cardCount", {}).get("total")
                set_obj.release_date = release_date
                set_obj.series_id = item["serieId"]
                set_obj.updated_at = datetime.now()
                print(f"  🔄 Set mis à jour : {set_obj.name}")
            else:
                # Création
                set_obj = Set(
                    id=item["id"],
                    name=item["name"],
                    logo=item.get("logo"),
                    symbol=item.get("symbol"),
                    card_count_official=item.get("cardCount", {}).get("official"),
                    card_count_total=item.get("cardCount", {}).get("total"),
                    release_date=release_date,
                    series_id=item["serieId"]
                )
                db.add(set_obj)
                print(f"  ✅ Set ajouté : {set_obj.name}")
            
            sets_dict[item["id"]] = set_obj
        
        db.commit()
        print(f"✅ {len(sets_dict)} sets importés")
        return sets_dict
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de l'import des sets : {e}")
        raise


def import_cards_for_set(db: Session, set_id: str) -> int:
    """
    Importe toutes les cartes d'un set spécifique avec détails complets
    Retourne le nombre de cartes importées
    """
    try:
        # Récupérer la liste des cartes du set
        response = requests.get(f"{FETCH_API_URL}/sets/{set_id}", timeout=30)
        response.raise_for_status()
        set_data = response.json()
        
        cards = set_data.get("cards", [])
        imported = 0
        
        for card_item in cards:
            card_id = card_item["id"]
            
            # Récupérer les détails complets de la carte
            try:
                card_response = requests.get(f"{FETCH_API_URL}/cards/{card_id}", timeout=10)
                card_response.raise_for_status()
                card_full = card_response.json()
            except:
                # Si échec, utiliser les données basiques du set
                card_full = card_item
            
            card = db.query(Card).filter(Card.id == card_id).first()
            
            # Extraire les informations importantes
            hp = card_full.get("hp")
            types = card_full.get("types", [])
            stage = card_full.get("stage")
            evolves_from = card_full.get("evolveFrom")
            rarity = card_full.get("rarity")
            category = card_full.get("category")
            illustrator = card_full.get("illustrator")
            
            # Images
            image = None
            if card_full.get("image"):
                image = card_full["image"]
            
            # Variantes
            variants = card_full.get("variants")
            
            if card:
                # Mise à jour
                card.name = card_full["name"]
                card.local_id = card_full["localId"]
                card.image = image
                card.hp = hp
                card.types = types
                card.stage = stage
                card.evolves_from = evolves_from
                card.rarity = rarity
                card.category = category
                card.illustrator = illustrator
                card.variants = variants
                card.updated_at = datetime.now()
            else:
                # Création
                card = Card(
                    id=card_id,
                    local_id=card_full["localId"],
                    name=card_full["name"],
                    image=image,
                    hp=hp,
                    types=types,
                    stage=stage,
                    evolves_from=evolves_from,
                    rarity=rarity,
                    category=category,
                    illustrator=illustrator,
                    variants=variants,
                    set_id=set_id
                )
                db.add(card)
            
            imported += 1
        
        db.commit()
        return imported
        
    except Exception as e:
        db.rollback()
        print(f"  ❌ Erreur pour le set {set_id} : {e}")
        return 0


def import_all_cards(db: Session, sets_dict: dict):
    """Importe toutes les cartes de tous les sets"""
    print("\n📥 Import des cartes...")
    total_cards = 0
    
    for i, (set_id, set_obj) in enumerate(sets_dict.items(), 1):
        print(f"  [{i}/{len(sets_dict)}] Import des cartes de : {set_obj.name}")
        count = import_cards_for_set(db, set_id)
        total_cards += count
        print(f"    ✅ {count} cartes importées")
    
    print(f"✅ {total_cards} cartes importées au total")


def main():
    """Point d'entrée du script d'import"""
    print("🚀 Démarrage de l'import TCGdex\n")
    print("⚠️  Assurez-vous que le microservice fetch tourne sur http://localhost:3005")
    
    # Test de connexion au microservice
    try:
        response = requests.get(f"{FETCH_API_URL}/series", timeout=5)
        response.raise_for_status()
    except Exception as e:
        print(f"❌ Impossible de se connecter au microservice fetch : {e}")
        print("   Lancez-le avec : cd fetch && npm start")
        sys.exit(1)
    
    db = SessionLocal()
    
    try:
        # Créer les tables
        create_tables()
        
        # Import séries
        series_dict = import_series(db)
        
        # Import sets
        sets_dict = import_sets(db)
        
        # Import cartes
        import_all_cards(db, sets_dict)
        
        print("\n✨ Import terminé avec succès !")
        
    except KeyboardInterrupt:
        print("\n⚠️  Import interrompu par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur fatale : {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
