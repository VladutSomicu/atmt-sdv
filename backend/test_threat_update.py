from app import create_app
from app.models.user import User
from flask_jwt_extended import create_access_token

app = create_app()
with app.app_context():
    user = User.query.filter_by(email="admin@example.com").first()
    token = create_access_token(identity=str(user.id))
    
    with app.test_client() as client:
        # Get threats
        resp = client.get("/api/threats/cde911e3-ec92-4c6d-baee-29543f5e51c2", headers={"Authorization": f"Bearer {token}"})
        threats = resp.get_json()["threats"]
        if threats:
            t_id = threats[0]["id"]
            print(f"Updating threat {t_id}")
            
            put_resp = client.put(f"/api/threats/detail/{t_id}", headers={"Authorization": f"Bearer {token}"}, json={
                "impact_safety": 3,
                "impact_financial": 2,
                "impact_operational": 3,
                "impact_privacy": 1,
                "feasibility": 4,
                "status": "open",
                "treatment": None,
                "justification": None,
                "control_ids": []
            })
            
            print(put_resp.status_code)
            print(put_resp.get_json())
