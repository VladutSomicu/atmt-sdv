import json
from app import create_app
from app.models.project import Project
from app.models.diagram import Diagram

app = create_app()
with app.app_context():
    project = Project.query.first()
    diagram = Diagram.query.filter_by(project_id=project.id).order_by(Diagram.version.desc()).first()
    if not diagram:
        print("No diagram found!")
    else:
        print(f"Diagram version: {diagram.version}")
        gj = diagram.graph_json
        nodes = gj.get("nodes", [])
        edges = gj.get("edges", [])
        tbs = gj.get("trust_boundaries", [])
        print(f"Nodes: {len(nodes)}, Edges: {len(edges)}, TBs: {len(tbs)}")
        joint_raw = gj.get("_joint_raw")
        if not joint_raw:
            print("_joint_raw is missing or empty!")
        else:
            print(f"_joint_raw has {len(joint_raw.get('cells', []))} cells")
