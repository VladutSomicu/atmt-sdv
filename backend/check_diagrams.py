import json
from app import create_app
from app.models.project import Project
from app.models.diagram import Diagram

app = create_app()
with app.app_context():
    projects = Project.query.all()
    for p in projects:
        diagrams = Diagram.query.filter_by(project_id=p.id).order_by(Diagram.version.desc()).all()
        print(f"Project: {p.name} ({p.id}) has {len(diagrams)} diagrams")
        if diagrams:
            latest = diagrams[0]
            print(f"  Latest version: {latest.version}")
            gj = latest.graph_json
            nodes = gj.get("nodes", [])
            edges = gj.get("edges", [])
            print(f"  Nodes: {len(nodes)}, Edges: {len(edges)}")
            joint_raw = gj.get("_joint_raw", {})
            print(f"  _joint_raw cells: {len(joint_raw.get('cells', []))}")
