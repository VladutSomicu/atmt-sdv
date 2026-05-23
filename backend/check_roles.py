import json
from app import create_app
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User

app = create_app()
with app.app_context():
    projects = Project.query.all()
    for p in projects:
        print(f"Project: {p.name}")
        members = ProjectMember.query.filter_by(project_id=p.id).all()
        for m in members:
            user = User.query.get(m.user_id)
            print(f"  User: {user.email}, Admin: {user.is_admin}, Role: {m.role}")
