"""
Scheduler pour la synchronisation périodique des données TCGdex
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
from scripts.import_tcgdex import import_series, import_sets, import_all_cards
from app.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def sync_tcgdex_data():
    """
    Fonction appelée périodiquement pour synchroniser les données
    """
    logger.info("🔄 Début de la synchronisation TCGdex")
    db = SessionLocal()
    
    try:
        # Import/mise à jour séries
        series_dict = import_series(db)
        
        # Import/mise à jour sets
        sets_dict = import_sets(db)
        
        # Import/mise à jour cartes (uniquement les nouveaux sets)
        import_all_cards(db, sets_dict)
        
        logger.info("✅ Synchronisation terminée")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la synchronisation : {e}")
    finally:
        db.close()


def start_scheduler():
    """
    Démarre le scheduler de synchronisation
    Par défaut : tous les jours à 3h du matin
    """
    scheduler = BackgroundScheduler()
    
    # Cron : tous les jours à 3h00 du matin
    scheduler.add_job(
        sync_tcgdex_data,
        trigger=CronTrigger(hour=3, minute=0),
        id="sync_tcgdex",
        name="Synchronisation TCGdex",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("⏰ Scheduler démarré - Synchronisation quotidienne à 3h00")
    
    return scheduler
