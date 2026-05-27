from app import create_app
from app.extensions import db
from app.models.ref_asset import RefAsset
from app.models.ref_threat import RefThreat
from app.models.control import Control

app = create_app()

def deduplicate():
    with app.app_context():
        # Deduplicate RefAsset (by name)
        print("Deduplicating RefAsset...")
        assets = RefAsset.query.all()
        seen = set()
        duplicates = []
        for a in assets:
            if a.name in seen:
                duplicates.append(a)
            else:
                seen.add(a.name)
        for d in duplicates:
            db.session.delete(d)
        print(f"Deleted {len(duplicates)} duplicate RefAssets.")

        # Deduplicate RefThreat (by title)
        print("Deduplicating RefThreat...")
        threats = RefThreat.query.all()
        seen = set()
        duplicates = []
        for t in threats:
            if t.title in seen:
                duplicates.append(t)
            else:
                seen.add(t.title)
        for d in duplicates:
            db.session.delete(d)
        print(f"Deleted {len(duplicates)} duplicate RefThreats.")

        # Deduplicate Control (by title)
        print("Deduplicating Control...")
        controls = Control.query.all()
        seen = set()
        duplicates = []
        for c in controls:
            if c.title in seen:
                duplicates.append(c)
            else:
                seen.add(c.title)
        for d in duplicates:
            db.session.delete(d)
        print(f"Deleted {len(duplicates)} duplicate Controls.")

        db.session.commit()
        print("Deduplication complete.")

if __name__ == "__main__":
    deduplicate()
