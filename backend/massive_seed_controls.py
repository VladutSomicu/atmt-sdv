from app import create_app
from app.extensions import db
from app.models.control import Control

app = create_app()

CONTROLS_DATA = [
    # ─── SECURE COMMUNICATION & CRYPTOGRAPHY ───
    ("TLS 1.3 / IPsec Encryption", "Encrypts network traffic to prevent sniffing and tampering.", ["Information Disclosure", "Tampering"], ["Ethernet", "Wi-Fi", "Cellular", "V2X"], 3, "Feasibility", "ISO_21434"),
    ("CAN MAC (SecOC)", "Adds MACs to CAN frames to ensure authenticity and freshness.", ["Spoofing", "Tampering"], ["CAN", "CAN-FD", "LIN"], 3, "Feasibility", "AUTOSAR_SecOC"),
    ("Message Authentication (SOME/IP-Sec)", "Provides payload authentication for SOME/IP.", ["Spoofing", "Tampering"], ["SOME/IP", "Ethernet"], 3, "Feasibility", "AUTOSAR"),
    ("ISO-15118 Plug & Charge TLS", "Secures EV charging sessions with mutually authenticated TLS.", ["Spoofing", "Information Disclosure", "Repudiation"], ["ISO-15118"], 4, "Feasibility", "ISO_15118_20"),
    ("V2X Message Signing (ECDSA)", "Uses PKI to sign ITS-G5 or C-V2X broadcast messages.", ["Spoofing", "Tampering", "Repudiation"], ["V2X"], 3, "Feasibility", "IEEE_1609.2"),

    # ─── ACCESS CONTROL & ISOLATION ───
    ("Network Segmentation / VLANs", "Isolates critical subnets (Powertrain) from non-critical (Infotainment).", ["Elevation of Privilege", "Information Disclosure"], ["Ethernet", "CAN", "FlexRay"], 3, "Feasibility", "UNECE_R155"),
    ("Firewall / IDPS", "Filters malicious traffic at the Central Gateway or HPC.", ["Denial of Service", "Elevation of Privilege"], ["Ethernet", "CAN", "Cellular"], 2, "Feasibility", "UNECE_R155"),
    ("Hardware Security Module (HSM)", "Stores cryptographic keys securely and executes crypto operations.", ["Information Disclosure", "Elevation of Privilege"], ["ALL"], 4, "Feasibility", "EVITA"),
    ("Hypervisor VM Isolation", "Strict hardware-assisted isolation between virtual machines.", ["Elevation of Privilege", "Tampering"], ["ALL"], 4, "Feasibility", "SDV_Arch"),
    ("Container Sandboxing (SELinux/AppArmor)", "Restricts container privileges on SDV architectures.", ["Elevation of Privilege", "Tampering"], ["ALL"], 3, "Feasibility", "SDV_Arch"),
    ("Role-Based Access Control (RBAC)", "Enforces strict permissions for API and diagnostic access.", ["Elevation of Privilege", "Information Disclosure"], ["Ethernet", "Cellular", "USB"], 3, "Feasibility", "NIST_SP800-53"),

    # ─── SECURE BOOT & FIRMWARE ───
    ("Secure Boot", "Verifies the cryptographic signature of the bootloader and OS.", ["Tampering", "Elevation of Privilege"], ["ALL"], 4, "Feasibility", "ISO_21434"),
    ("Authenticated OTA Updates", "Validates the digital signature of incoming OTA firmware before applying.", ["Tampering", "Spoofing"], ["Cellular", "Wi-Fi"], 4, "Feasibility", "UNECE_R156"),
    ("A/B Partitioning (Rollback)", "Allows safe rollback if an OTA update is corrupted or malicious.", ["Denial of Service"], ["ALL"], 2, "Impact - Operational", "UNECE_R156"),

    # ─── PHYSICAL & HARDWARE SECURITY ───
    ("Anti-Tamper Seals / Enclosures", "Physical protection against unauthorized ECU disassembly.", ["Tampering", "Elevation of Privilege"], ["ALL"], 2, "Feasibility", "ISO_21434"),
    ("Debug Port Deactivation (JTAG/UART)", "Disables or fuses hardware debug interfaces in production.", ["Elevation of Privilege", "Information Disclosure"], ["ALL"], 4, "Feasibility", "Best_Practice"),
    ("OBD-II Gateway Authentication", "Requires UDS SecurityAccess or Certificate authentication to unlock OBD-II.", ["Elevation of Privilege", "Tampering"], ["CAN", "SOME/IP", "FlexRay"], 3, "Feasibility", "UNECE_R155"),

    # ─── RATE LIMITING & DOS PROTECTION ───
    ("CAN Message Rate Limiting", "Drops CAN frames that exceed expected frequency to stop floods.", ["Denial of Service"], ["CAN", "CAN-FD"], 3, "Feasibility", "AUTOSAR"),
    ("API Rate Limiting & Throttling", "Protects OEM cloud and backend APIs from volumetric attacks.", ["Denial of Service"], ["Cellular", "Wi-Fi"], 3, "Feasibility", "OWASP"),
    ("Sensor Anti-Spoofing / Plausibility Checks", "Cross-checks Radar/Camera/LiDAR data for anomalies.", ["Spoofing", "Denial of Service"], ["Ethernet", "CAN"], 2, "Impact - Safety", "ISO_26262"),

    # ─── PRIVACY & DATA PROTECTION ───
    ("Data Anonymization / Pseudonymization", "Removes PII before transmitting telemetry to the cloud.", ["Information Disclosure"], ["Cellular"], 3, "Impact - Privacy", "GDPR"),
    ("MAC Address Randomization", "Periodically rotates V2X and Wi-Fi MAC addresses to prevent tracking.", ["Information Disclosure"], ["V2X", "Wi-Fi"], 4, "Feasibility", "LINDDUN"),
    ("Local Storage Encryption (FDE)", "Encrypts user data on the IVI/HPC storage using HSM keys.", ["Information Disclosure"], ["USB", "Ethernet"], 4, "Feasibility", "OWASP-Mobile"),
    ("Secure Audit Logging", "Ships logs to a write-only partition or cloud backend.", ["Repudiation"], ["Ethernet", "Cellular"], 4, "Feasibility", "UNECE_R155"),

    # ─── ADVANCED SDV CONTROLS ───
    ("Zero Trust Architecture (ZTA)", "Mutual authentication and continuous authorization between all microservices.", ["Elevation of Privilege", "Spoofing"], ["Ethernet", "Cellular"], 3, "Feasibility", "NIST_SP800-207"),
    ("Runtime Integrity Monitoring", "Monitors OS processes and memory for malicious injection.", ["Tampering", "Elevation of Privilege"], ["ALL"], 2, "Feasibility", "SDV_Arch"),

    # ─── EXTENDED CONTROLS ───
    ("TPMS Cryptographic Authentication", "Authenticates tire sensors to prevent spoofing.", ["Spoofing"], ["RF", "CAN"], 4, "Feasibility", "ISO_21434"),
    ("UWB Secure Ranging (Time-of-Flight)", "Uses Ultra-Wideband to prevent relay attacks.", ["Spoofing"], ["UWB"], 4, "Feasibility", "CCC"),
    ("Immobilizer Cryptographic Challenge-Response", "Uses strong AES/RSA for transponder auth.", ["Spoofing"], ["LF", "CAN"], 4, "Feasibility", "ISO_14229"),
    ("Broker TLS Mutual Authentication & Rate Limiting", "Enforces mTLS and limits connections.", ["Denial of Service"], ["Ethernet"], 3, "Feasibility", "NIST_SP800-52"),
    ("Container Image Signature Verification", "Ensures only cryptographically signed images run.", ["Tampering"], ["Internal API"], 4, "Feasibility", "NIST_SP800-190"),
    ("SOA Service Authentication & Authorization", "Validates services registering on the SOA bus.", ["Tampering"], ["Ethernet"], 3, "Feasibility", "AUTOSAR_Adaptive"),
    ("Hardware TEE for ML Models", "Protects AI models in a Trusted Execution Environment.", ["Tampering"], ["PCIe", "Ethernet"], 4, "Feasibility", "GlobalPlatform"),
    ("SELinux Enforcing Mode & MAC Policies", "Strict Mandatory Access Control for AAOS daemons.", ["Elevation of Privilege"], ["Internal API"], 3, "Feasibility", "Android_Security"),
    ("Binder IPC Mutual Authentication", "Enforces app identity at the IPC level.", ["Spoofing"], ["Binder"], 3, "Feasibility", "Android_Security"),
    ("Android APK Code Signing Verification", "Validates app developer certificates.", ["Tampering"], ["Internal API"], 4, "Feasibility", "OWASP-Mobile"),
    ("Display Framebuffer Integrity Check", "Validates HUD display signals against physical sensors.", ["Tampering"], ["LVDS", "Ethernet"], 2, "Impact - Safety", "ISO_26262"),
    ("USB Device Whitelisting & Sandboxing", "Prevents malware execution from media ports.", ["Tampering"], ["USB"], 3, "Feasibility", "Android_Security"),
    ("eCall Cellular Cryptographic Authentication", "Secures the emergency dialer channel.", ["Spoofing"], ["Cellular"], 3, "Feasibility", "3GPP_Sec"),

    # ─── E/E SENSORS & ACTUATORS ───
    ("Analog Sensor Redundancy & Plausibility", "Uses redundant sensors and cross-checks values (e.g. Speed vs GPS) to detect physical spoofing.", ["Spoofing"], ["LIN", "Analog"], 3, "Feasibility", "ISO_26262"),
    ("Actuator Current Signature Analysis", "Monitors electrical current draw to detect mechanical tampering (e.g., Anti-Pinch defeat).", ["Tampering", "Elevation of Privilege"], ["LIN", "CAN"], 3, "Feasibility", "Best_Practice"),
    ("Physical Anti-Theft Enclosures", "Hardened physical casings for Door/Tailgate actuators to prevent forced physical actuation.", ["Elevation of Privilege"], ["Physical"], 2, "Feasibility", "Thatcham"),

    # ─── MOTORCYCLES ───
    ("Suspension Parameter Whitelisting", "Rejects out-of-bounds suspension adjustment commands on the CAN bus.", ["Tampering"], ["CAN"], 4, "Feasibility", "UNECE_R155"),
    ("BLE Secure Connections (BLE-SC)", "Enforces ECDH pairing and AES-CCM encryption for Helmet HUDs to prevent eavesdropping.", ["Information Disclosure"], ["Bluetooth"], 4, "Feasibility", "Bluetooth_SIG"),
    ("eCall Fallback Antenna & Dual-SIM", "Hardware redundancy to prevent DoS attacks on the emergency dialer.", ["Denial of Service"], ["Cellular"], 3, "Impact - Operational", "eCall_Standard"),

    # ─── AGRICULTURAL ───
    ("Cryptographic Signing of Yield Data", "Applies SecOC to yield monitor telemetry to prevent financial fraud.", ["Tampering"], ["CAN", "ISOBUS"], 4, "Feasibility", "ISO_11783"),
    ("Implement Control Integrity Checks", "Validates seed/spray rate commands against operator limits and safety boundaries.", ["Tampering"], ["ISOBUS", "CAN"], 3, "Feasibility", "ISO_25119"),
    ("ISOBUS Gateway Traffic Filtering (IDPS)", "Filters anomalous traffic on the ISOBUS network to prevent flooding.", ["Denial of Service"], ["ISOBUS"], 3, "Feasibility", "UNECE_R155"),

    # ─── TRAILERS & COMMERCIAL TRUCKS ───
    ("Reefer Telematics Backup Battery", "Independent power and alerting system if the main refrigeration unit is shut down.", ["Denial of Service"], ["Cellular"], 4, "Impact - Operational", "Cold_Chain_Logistics"),
    ("EBS Message Authentication (MAC)", "Cryptographic authentication for Trailer Braking System messages.", ["Tampering"], ["CAN", "PLC"], 4, "Feasibility", "UNECE_R155"),
    ("Tachograph Hardware Security Module (HSM)", "Uses PKI and physical smart cards to sign and seal driver records immutably.", ["Repudiation", "Tampering"], ["CAN", "Cellular"], 4, "Feasibility", "EU_Digital_Tachograph")
]

def seed_controls():
    print("Seeding Controls...")
    objects = []
    for (title, desc, stride, protocols, reduc, target, ref) in CONTROLS_DATA:
        objects.append(Control(
            title=title,
            description=desc,
            applies_to_stride=stride,
            applies_to_protocols=protocols,
            reduction_value=reduc,
            reduction_target=target,
            source_ref=ref
        ))
    db.session.add_all(objects)
    db.session.commit()
    print(f"Seeded {len(objects)} Controls.")

if __name__ == "__main__":
    with app.app_context():
        seed_controls()
