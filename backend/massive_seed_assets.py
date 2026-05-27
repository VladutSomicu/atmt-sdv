from app import create_app
from app.extensions import db
from app.models.project import Project
from app.models.diagram import Diagram
from app.models.threat import Threat
from app.models.ref_asset import RefAsset
from app.models.ref_threat import RefThreat
from app.models.control import Control
from app.models.audit_log import AuditLog
from app.models.project_member import ProjectMember

app = create_app()

def clear_db():
    print("Clearing database...")
    db.session.query(Threat).delete()
    db.session.query(Diagram).delete()
    db.session.query(ProjectMember).delete()
    db.session.query(AuditLog).delete()
    db.session.query(Project).delete()
    db.session.query(RefAsset).delete()
    db.session.query(RefThreat).delete()
    db.session.query(Control).delete()
    db.session.commit()
    print("Database cleared.")

def seed_assets():
    print("Seeding RefAssets...")
    assets = [
        # ─── POWERTRAIN (ICE, EV, Hybrid) ───
        RefAsset(name="Engine Control Unit (ECU)", category="Powertrain", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Battery Management System (BMS)", category="Powertrain", interface_types=["CAN", "ISO-15118"], data_types=["Sensor Data", "Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Inverter Control Unit", category="Powertrain", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Transmission Control Unit (TCU)", category="Powertrain", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="On-Board Charger (OBC)", category="Powertrain", interface_types=["CAN", "ISO-15118"], data_types=["Control Commands"], physical_accessibility="External-Facing", asil_level="C", default_safety=3, default_privacy=1, vehicle_types=["EV", "Hybrid"], architectures=["Classic", "SDV"]),
        
        # ─── SAFETY-CRITICAL (Brakes, Steering) ───
        RefAsset(name="Electronic Stability Control (ESC)", category="Safety-Critical", interface_types=["CAN", "FlexRay"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Electric Power Steering (EPS)", category="Safety-Critical", interface_types=["CAN", "FlexRay"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Airbag Control Unit (ACU)", category="Safety-Critical", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Advanced Driver Assistance System (ADAS)", category="Safety-Critical", interface_types=["CAN", "Ethernet"], data_types=["Sensor Data", "Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Autonomous Driving Compute Platform", category="Safety-Critical", interface_types=["Ethernet", "PCIe"], data_types=["Sensor Data", "Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        
        # ─── PERCEPTION (Sensors) ───
        RefAsset(name="Camera Module", category="Perception", interface_types=["Ethernet", "LVDS"], data_types=["Sensor Data", "PII"], physical_accessibility="External-Facing", asil_level="B", default_safety=3, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Radar Sensor", category="Perception", interface_types=["CAN", "Ethernet"], data_types=["Sensor Data"], physical_accessibility="External-Facing", asil_level="B", default_safety=3, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="LiDAR Module", category="Perception", interface_types=["Ethernet"], data_types=["Sensor Data"], physical_accessibility="External-Facing", asil_level="B", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Ultrasonic Sensor", category="Perception", interface_types=["LIN"], data_types=["Sensor Data"], physical_accessibility="External-Facing", asil_level="A", default_safety=2, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="GPS / GNSS Receiver", category="Perception", interface_types=["UART", "Ethernet"], data_types=["Location Data"], physical_accessibility="External-Facing", asil_level="B", default_safety=3, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        
        # ─── INFOTAINMENT & CONNECTIVITY ───
        RefAsset(name="In-Vehicle Infotainment (IVI)", category="Infotainment", interface_types=["Ethernet", "Wi-Fi", "Bluetooth", "USB"], data_types=["PII", "Media"], physical_accessibility="Internal", asil_level="A", default_safety=1, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic"]),
        RefAsset(name="Android Automotive OS (AAOS) Head Unit", category="Infotainment", interface_types=["Ethernet", "Wi-Fi", "Bluetooth", "USB"], data_types=["PII", "Media", "Telemetry"], physical_accessibility="Internal", asil_level="B", default_safety=2, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Telematics Control Unit (TCU)", category="Connectivity", interface_types=["Cellular", "Ethernet", "CAN"], data_types=["Telemetry", "Location Data", "PII"], physical_accessibility="External-Facing", asil_level="B", default_safety=2, default_privacy=4, flags=["is_connected_to_cloud", "ota_capable"], vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="V2X On-Board Unit (OBU)", category="Connectivity", interface_types=["V2X", "Ethernet"], data_types=["Telemetry", "Location Data"], physical_accessibility="External-Facing", asil_level="B", default_safety=3, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Smart Antenna / Shark Fin", category="Connectivity", interface_types=["Cellular", "Wi-Fi", "V2X"], data_types=["Telemetry"], physical_accessibility="External-Facing", asil_level="A", default_safety=1, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        
        # ─── GATEWAY & ZONAL (Architecture Specific) ───
        RefAsset(name="Central Gateway (CGW)", category="Gateway", interface_types=["CAN", "LIN", "Ethernet", "FlexRay"], data_types=["Control Commands", "Diagnostic Data"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="OBD-II Diagnostic Port", category="Diagnostic", interface_types=["CAN", "SOME/IP"], data_types=["Diagnostic Data"], physical_accessibility="OBD-II", asil_level=None, default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Zonal Controller (Front Left)", category="Gateway", interface_types=["Ethernet", "CAN", "LIN"], data_types=["Control Commands", "Sensor Data"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Zonal Controller (Front Right)", category="Gateway", interface_types=["Ethernet", "CAN", "LIN"], data_types=["Control Commands", "Sensor Data"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Zonal Controller (Rear)", category="Gateway", interface_types=["Ethernet", "CAN", "LIN"], data_types=["Control Commands", "Sensor Data"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="High-Performance Computer (HPC)", category="Compute", interface_types=["Ethernet", "PCIe"], data_types=["All"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=4, flags=["is_virtualized", "ota_capable"], vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        
        # ─── EXTERNAL ENTITIES ───
        RefAsset(name="OEM Cloud Backend", category="Cloud", interface_types=["Cellular"], data_types=["Telemetry", "PII", "Firmware"], physical_accessibility="Remote", asil_level=None, default_safety=2, default_privacy=4, flags=["is_connected_to_cloud"], vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Over-The-Air (OTA) Server", category="Cloud", interface_types=["Cellular"], data_types=["Firmware"], physical_accessibility="Remote", asil_level=None, default_safety=4, default_privacy=1, flags=["is_connected_to_cloud"], vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Third-Party Service Provider", category="Cloud", interface_types=["Cellular"], data_types=["Telemetry", "PII"], physical_accessibility="Remote", asil_level=None, default_safety=1, default_privacy=4, flags=["is_connected_to_cloud"], vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="EV Charging Station (EVSE)", category="External", interface_types=["ISO-15118", "Wi-Fi"], data_types=["Financial", "Control Commands"], physical_accessibility="External-Facing", asil_level=None, default_safety=3, default_privacy=3, vehicle_types=["EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="User Mobile App (Companion App)", category="External", interface_types=["Cellular", "Bluetooth"], data_types=["PII", "Control Commands"], physical_accessibility="Remote", asil_level=None, default_safety=2, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Mechanic Diagnostic Tool", category="External", interface_types=["CAN", "USB", "Wi-Fi"], data_types=["Diagnostic Data"], physical_accessibility="OBD-II", asil_level=None, default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Other Vehicles (V2V)", category="External", interface_types=["V2X"], data_types=["Telemetry", "Location Data"], physical_accessibility="Remote", asil_level=None, default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Roadside Infrastructure (V2I)", category="External", interface_types=["V2X"], data_types=["Telemetry", "Location Data"], physical_accessibility="Remote", asil_level=None, default_safety=2, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        
        # ─── BODY & COMFORT ───
        RefAsset(name="Body Control Module (BCM)", category="Body", interface_types=["CAN", "LIN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="A", default_safety=2, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="HVAC Controller", category="Body", interface_types=["LIN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="A", default_safety=1, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Keyless Entry System", category="Body", interface_types=["LF", "RF", "Bluetooth", "UWB"], data_types=["Auth Tokens"], physical_accessibility="External-Facing", asil_level="A", default_safety=2, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),

        # ─── EXTENDED POWERTRAIN / CHASSIS ───
        RefAsset(name="Powertrain Control Module (PCM)", category="Powertrain", interface_types=["CAN", "Ethernet"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Engine Control Module (ECM)", category="Powertrain", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Transmission Control Module (TCM)", category="Powertrain", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Electronic Brake Control Module (EBCM)", category="Safety-Critical", interface_types=["CAN", "FlexRay"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Suspension Control Module (SCM)", category="Chassis", interface_types=["CAN", "FlexRay"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="C", default_safety=3, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),

        # ─── EXTENDED BODY / CLASSIC ───
        RefAsset(name="Tire Pressure Monitoring System (TPMS) Receiver", category="Body", interface_types=["RF", "CAN"], data_types=["Sensor Data"], physical_accessibility="External-Facing", asil_level="A", default_safety=2, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Passive Entry Passive Start (PEPS) Module", category="Body", interface_types=["LF", "RF", "UWB", "CAN"], data_types=["Auth Tokens"], physical_accessibility="External-Facing", asil_level="B", default_safety=2, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Anti-lock Braking System (ABS) ECU", category="Safety-Critical", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Door Control Unit (DCU)", category="Body", interface_types=["LIN", "CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="A", default_safety=1, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Lighting Control Module (LCM)", category="Body", interface_types=["LIN", "CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="A", default_safety=2, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Electric Parking Brake (EPB) Module", category="Safety-Critical", interface_types=["CAN"], data_types=["Control Commands"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Immobilizer / PATS Control Unit", category="Body", interface_types=["LF", "CAN"], data_types=["Auth Tokens"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Instrument Cluster Panel (IPC)", category="Infotainment", interface_types=["CAN", "Ethernet", "LVDS"], data_types=["Telemetry", "Control Commands"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),

        # ─── EXTENDED INFOTAINMENT & CONNECTIVITY ───
        RefAsset(name="Rear Seat Entertainment System (RSE)", category="Infotainment", interface_types=["Ethernet", "Wi-Fi", "USB"], data_types=["Media", "PII"], physical_accessibility="Internal", asil_level=None, default_safety=1, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Augmented Reality Head-Up Display (AR-HUD)", category="Infotainment", interface_types=["Ethernet", "LVDS", "CAN"], data_types=["Telemetry", "Sensor Data"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=1, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Voice Recognition / Audio DSP Module", category="Infotainment", interface_types=["Ethernet", "USB", "A2B"], data_types=["Media", "PII"], physical_accessibility="Internal", asil_level=None, default_safety=1, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Infotainment Connectivity Box (eCall/Wi-Fi/BT)", category="Connectivity", interface_types=["Cellular", "Wi-Fi", "Bluetooth", "Ethernet"], data_types=["Telemetry", "PII", "Location Data"], physical_accessibility="External-Facing", asil_level="B", default_safety=3, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),

        # ─── EXTENDED SDV-SPECIFIC ───
        RefAsset(name="Software-Defined Network Switch", category="Gateway", interface_types=["Ethernet", "PCIe"], data_types=["All"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Vehicle Data Broker (MQTT / SOME/IP)", category="Compute", interface_types=["Ethernet"], data_types=["Telemetry", "Control Commands"], physical_accessibility="Internal", asil_level="C", default_safety=3, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Service-Oriented Architecture (SOA) Registry", category="Compute", interface_types=["Ethernet"], data_types=["System Metadata"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Container Orchestrator (Runtime Engine)", category="Compute", interface_types=["Internal API"], data_types=["System Metadata"], physical_accessibility="Internal", asil_level="C", default_safety=3, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Edge AI Accelerator / ML Compute", category="Compute", interface_types=["PCIe", "Ethernet"], data_types=["Sensor Data"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=2, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Hardware Security Module (HSM) Virtualization (vHSM)", category="Compute", interface_types=["Internal API"], data_types=["Keys / Credentials"], physical_accessibility="Internal", asil_level="D", default_safety=4, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),
        RefAsset(name="Digital Twin Telemetry Sync Agent", category="Compute", interface_types=["Ethernet", "Cellular"], data_types=["Telemetry"], physical_accessibility="Internal", asil_level=None, default_safety=1, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["SDV"]),

        # ─── AAOS-SPECIFIC ───
        RefAsset(name="AAOS Vehicle HAL (VHAL)", category="AAOS-Specific", interface_types=["Internal API", "Binder"], data_types=["Control Commands", "Telemetry"], physical_accessibility="Internal", asil_level="B", default_safety=3, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Android App Framework (Binder IPC)", category="AAOS-Specific", interface_types=["Internal API", "Binder"], data_types=["All"], physical_accessibility="Internal", asil_level=None, default_safety=2, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Third-Party Android Applications", category="AAOS-Specific", interface_types=["Internal API", "Wi-Fi"], data_types=["PII", "Media"], physical_accessibility="Remote", asil_level=None, default_safety=1, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="Google Automotive Services (GAS)", category="AAOS-Specific", interface_types=["Internal API", "Cellular"], data_types=["Location Data", "PII"], physical_accessibility="Remote", asil_level=None, default_safety=1, default_privacy=4, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
        RefAsset(name="AAOS Bluetooth/Wi-Fi Stack", category="AAOS-Specific", interface_types=["Bluetooth", "Wi-Fi"], data_types=["Media", "PII"], physical_accessibility="External-Facing", asil_level=None, default_safety=1, default_privacy=3, vehicle_types=["ICE", "EV", "Hybrid"], architectures=["Classic", "SDV"]),
    ]
    db.session.add_all(assets)
    db.session.commit()
    print(f"Seeded {len(assets)} RefAssets.")

if __name__ == "__main__":
    with app.app_context():
        seed_assets()
