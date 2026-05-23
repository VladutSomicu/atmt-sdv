from app import create_app
from app.models.ref_threat import RefThreat

app = create_app()
with app.app_context():
    threats = RefThreat.query.all()
    print(f"Total RefThreats: {len(threats)}")
    for t in threats:
        print(f"[{t.stride_category}] {t.title}: {t.default_impact_safety}, {t.default_impact_financial}, {t.default_impact_operational}, {t.default_impact_privacy}")
