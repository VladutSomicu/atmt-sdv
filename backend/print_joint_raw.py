import json
from app import create_app
from app.models.project import Project
from app.models.diagram import Diagram

app = create_app()
with app.app_context():
    # Fetch the Autonomous EV Platform project
    diagram = Diagram.query.filter_by(project_id="cde911e3-ec92-4c6d-baee-29543f5e51c2").order_by(Diagram.version.desc()).first()
    if diagram:
        print("Version:", diagram.version)
        joint_raw = diagram.graph_json.get("_joint_raw", {})
        print(json.dumps(joint_raw, indent=2))
