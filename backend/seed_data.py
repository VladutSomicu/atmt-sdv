from app import create_app
from app.extensions import db
from app.models.ref_asset import RefAsset
from app.models.ref_threat import RefThreat
from app.models.control import Control
import uuid

def seed_automotive_data():
    app = create_app()
    with app.app_context():
        print("--- Seeding automotive reference data...")
        
        # 2. Assets (using 'name' and 'category')
        assets = [
            RefAsset(name="Central Gateway (CGW)", category="Gateway", vehicle_types=["BEV", "PHEV", "ICE"], asil_level="D", interface_types=["CAN", "Ethernet"], data_types=["Control"]),
            RefAsset(name="Telematics Unit (TCU)", category="Connectivity", vehicle_types=["ALL"], asil_level="B", interface_types=["Cellular", "Wi-Fi"], data_types=["PII", "Cloud"]),
            RefAsset(name="ADAS Controller", category="ECU", vehicle_types=["BEV", "PHEV"], asil_level="D", interface_types=["Ethernet", "LVDS"], data_types=["Sensor Data"]),
            RefAsset(name="BMS", category="ECU", vehicle_types=["BEV", "PHEV"], asil_level="D", interface_types=["CAN"], data_types=["Battery Status"]),
            RefAsset(name="Infotainment (IVI)", category="User Interface", vehicle_types=["ALL"], asil_level="Q", interface_types=["Ethernet", "Bluetooth"], data_types=["PII"]),
            RefAsset(name="Smart Key", category="ECU", vehicle_types=["ALL"], asil_level="B", interface_types=["NFC", "BLE"], data_types=["Auth"]),
        ]
        
        # 3. Threats (using 'title')
        threats = [
            RefThreat(title="CAN Bus Injection", stride_category="Tampering", default_impact=5, default_feasibility=4, source="ISO 21434 Annex C", description="Injecting malicious frames into the internal vehicle network."),
            RefThreat(title="OTA Update Hijacking", stride_category="Spoofing", default_impact=5, default_feasibility=2, source="R156", description="MITM attack on the software update channel."),
            RefThreat(title="Diagnostic Interface Access", stride_category="Elevation of Privilege", default_impact=4, default_feasibility=5, source="NIST", description="Unauthorized use of the OBD-II port."),
            RefThreat(title="Credential Theft via Infotainment", stride_category="Information Disclosure", default_impact=3, default_feasibility=3, source="CAPEC-633", description="Extracting user credentials from IVI storage."),
            RefThreat(title="Sensor Spoofing (GPS/Radar)", stride_category="Tampering", default_impact=4, default_feasibility=2, source="Academic", description="Using radio emitters to spoof sensor readings."),
        ]
        
        # 4. Controls (using 'title')
        controls = [
            Control(title="SecOC", applies_to_stride=["Spoofing", "Tampering"], feasibility_reduction=3, source_ref="AUTOSAR", description="Message authentication for internal bus communication."),
            Control(title="Secure Boot (HSM)", applies_to_stride=["Tampering", "Elevation of Privilege"], feasibility_reduction=4, source_ref="NIST", description="Verification of software integrity during startup."),
            Control(title="TLS 1.3 Encryption", applies_to_stride=["Information Disclosure", "Tampering"], feasibility_reduction=3, source_ref="RFC 8446", description="Encryption for external communication."),
            Control(title="UDS Security Access", applies_to_stride=["Elevation of Privilege"], feasibility_reduction=2, source_ref="ISO 14229", description="Security levels for diagnostic services."),
            Control(title="AES-256 Storage Encryption", applies_to_stride=["Information Disclosure"], feasibility_reduction=4, source_ref="FIPS 197", description="Encrypting user data at rest."),
        ]

        # Add to session
        for a in assets: db.session.add(a)
        for t in threats: db.session.add(t)
        for c in controls: db.session.add(c)
        
        try:
            db.session.commit()
            print("[SUCCESS] Successfully seeded:")
            print(f"   - {len(assets)} Assets")
            print(f"   - {len(threats)} Threats")
            print(f"   - {len(controls)} Controls")
        except Exception as e:
            db.session.rollback()
            print(f"[ERROR] Error seeding data: {e}")

if __name__ == "__main__":
    seed_automotive_data()
