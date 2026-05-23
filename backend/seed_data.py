from app import create_app
from app.extensions import db, bcrypt
from app.models.ref_asset import RefAsset
from app.models.ref_threat import RefThreat
from app.models.control import Control
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.diagram import Diagram
import uuid

def seed_automotive_data():
    app = create_app()
    with app.app_context():
        print("--- Seeding users...")
        # Check if users already exist
        admin = User.query.filter_by(email="admin@example.com").first()
        if not admin:
            admin_pw_hash = bcrypt.generate_password_hash("admin123").decode('utf-8')
            admin = User(
                email="admin@example.com",
                password_hash=admin_pw_hash,
                full_name="System Administrator",
                is_admin=True,
                is_active=True
            )
            db.session.add(admin)
            
        demo = User.query.filter_by(email="demo@example.com").first()
        if not demo:
            demo_pw_hash = bcrypt.generate_password_hash("demo123").decode('utf-8')
            demo = User(
                email="demo@example.com",
                password_hash=demo_pw_hash,
                full_name="Demo User",
                is_admin=False,
                is_demo=True,
                is_active=True
            )
            db.session.add(demo)
            
        db.session.commit() # Commit users so we have their IDs

        # Seed a default project
        project = Project.query.filter_by(name="Autonomous EV Platform").first()
        if not project:
            project = Project(
                name="Autonomous EV Platform",
                description="Threat modeling and security analysis of a level 3 autonomous battery-electric passenger vehicle.",
                vehicle_profile={
                    "propulsion": "BEV",
                    "architecture": "SDV",
                    "sae_level": 3
                },
                business_objectives=[
                    "Protect vehicle control command integrity",
                    "Ensure user safety and functional safety under critical faults",
                    "Comply with UNECE R155 and R156 requirements"
                ],
                status="draft",
                created_by=admin.id
            )
            db.session.add(project)
            db.session.commit()
            
            # Add demo user and admin user to project members
            member_admin = ProjectMember(
                project_id=project.id,
                user_id=admin.id,
                role="engineer"
            )
            member_demo = ProjectMember(
                project_id=project.id,
                user_id=demo.id,
                role="engineer"
            )
            db.session.add(member_admin)
            db.session.add(member_demo)
            
            # Seed an empty diagram for the project
            diagram = Diagram(
                project_id=project.id,
                graph_json={"nodes": [], "edges": []},
                dfd_level=1,
                version=1,
                saved_by=admin.id
            )
            db.session.add(diagram)
            db.session.commit()
        
        print("--- Seeding automotive reference data...")
        # 2. Assets (using 'name' and 'category')
        if RefAsset.query.count() == 0:
            assets = [
                RefAsset(name="Central Gateway (CGW)", category="Gateway", vehicle_types=["BEV", "PHEV", "ICE"], asil_level="D", interface_types=["CAN", "Ethernet"], data_types=["Control"], default_safety=4, default_financial=3, default_operational=4, default_privacy=2),
                RefAsset(name="Telematics Unit (TCU)", category="Connectivity", vehicle_types=["ALL"], asil_level="B", interface_types=["Cellular", "Wi-Fi"], data_types=["PII", "Cloud"], default_safety=3, default_financial=3, default_operational=3, default_privacy=5),
                RefAsset(name="ADAS Controller", category="ECU", vehicle_types=["BEV", "PHEV"], asil_level="D", interface_types=["Ethernet", "LVDS"], data_types=["Sensor Data"], default_safety=5, default_financial=4, default_operational=4, default_privacy=3),
                RefAsset(name="BMS", category="ECU", vehicle_types=["BEV", "PHEV"], asil_level="D", interface_types=["CAN"], data_types=["Battery Status"], default_safety=4, default_financial=4, default_operational=4, default_privacy=2),
                RefAsset(name="Infotainment (IVI)", category="User Interface", vehicle_types=["ALL"], asil_level="Q", interface_types=["Ethernet", "Bluetooth"], data_types=["PII"], default_safety=2, default_financial=3, default_operational=2, default_privacy=5),
                RefAsset(name="Smart Key", category="ECU", vehicle_types=["ALL"], asil_level="B", interface_types=["NFC", "BLE"], data_types=["Auth"], default_safety=3, default_financial=4, default_operational=4, default_privacy=3),
            ]
            for a in assets: db.session.add(a)
        
        # 3. Threats (using 'title')
        if RefThreat.query.count() == 0:
            threats = [
                RefThreat(title="CAN Bus Injection", stride_category="Tampering", default_impact_safety=4, default_impact_financial=3, default_impact_operational=4, default_impact_privacy=1, default_feasibility=4, source="ISO 21434 Annex C", description="Injecting malicious frames into the internal vehicle network."),
                RefThreat(title="OTA Update Hijacking", stride_category="Spoofing", default_impact_safety=4, default_impact_financial=4, default_impact_operational=4, default_impact_privacy=4, default_feasibility=2, source="R156", description="MITM attack on the software update channel."),
                RefThreat(title="Diagnostic Interface Access", stride_category="Elevation of Privilege", default_impact_safety=4, default_impact_financial=3, default_impact_operational=4, default_impact_privacy=2, default_feasibility=4, source="NIST", description="Unauthorized use of the OBD-II port."),
                RefThreat(title="Credential Theft via Infotainment", stride_category="Information Disclosure", default_impact_safety=1, default_impact_financial=4, default_impact_operational=2, default_impact_privacy=4, default_feasibility=3, source="CAPEC-633", description="Extracting user credentials from IVI storage."),
                RefThreat(title="Sensor Spoofing (GPS/Radar)", stride_category="Tampering", default_impact_safety=4, default_impact_financial=2, default_impact_operational=3, default_impact_privacy=1, default_feasibility=2, source="Academic", description="Using radio emitters to spoof sensor readings."),
            ]
            for t in threats: db.session.add(t)
        
        # 4. Controls (using 'title')
        if Control.query.count() == 0:
            controls = [
                Control(title="SecOC", applies_to_stride=["Spoofing", "Tampering"], reduction_value=3, reduction_target="Feasibility", source_ref="AUTOSAR", description="Message authentication for internal bus communication."),
                Control(title="Secure Boot (HSM)", applies_to_stride=["Tampering", "Elevation of Privilege"], reduction_value=4, reduction_target="Feasibility", source_ref="NIST", description="Verification of software integrity during startup."),
                Control(title="TLS 1.3 Encryption", applies_to_stride=["Information Disclosure", "Tampering"], reduction_value=3, reduction_target="Impact - Privacy", source_ref="RFC 8446", description="Encryption for external communication."),
                Control(title="UDS Security Access", applies_to_stride=["Elevation of Privilege"], reduction_value=2, reduction_target="Feasibility", source_ref="ISO 14229", description="Security levels for diagnostic services."),
                Control(title="AES-256 Storage Encryption", applies_to_stride=["Information Disclosure"], reduction_value=4, reduction_target="Impact - Privacy", source_ref="FIPS 197", description="Encrypting user data at rest."),
            ]
            for c in controls: db.session.add(c)
        
        try:
            db.session.commit()
            print("[SUCCESS] Seeding completed.")
        except Exception as e:
            db.session.rollback()
            print(f"[ERROR] Error seeding data: {e}")

if __name__ == "__main__":
    seed_automotive_data()
