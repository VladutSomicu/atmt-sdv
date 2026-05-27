from app import create_app
from app.extensions import db
from app.models.ref_threat import RefThreat

app = create_app()

THREATS_DATA = [
    # ─── SPOOFING ───
    ("Spoofing", "CAN Bus Injection", "Attacker injects forged CAN frames to control vehicle functions.", "CAPEC-19", 4, 3, 4, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "CAN-FD Bus Injection", "Attacker injects forged CAN-FD frames with larger payloads.", "CAPEC-19", 4, 3, 4, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "LIN Bus Message Spoofing", "Attacker injects forged LIN messages (e.g. to open windows/doors).", "CAPEC-19", 2, 2, 2, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "FlexRay Message Spoofing", "Attacker injects messages on FlexRay bus affecting safety functions.", "CAPEC-19", 4, 3, 4, 1, 1, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Ethernet Packet Spoofing", "Attacker spoofs Automotive Ethernet packets to manipulate ADAS.", "CAPEC-19", 4, 3, 4, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Sensor Spoofing (GPS/Radar)", "Attacker feeds fake signals to GPS or radar to deceive ADAS.", "CAPEC-573", 4, 2, 3, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Camera Blinding/Spoofing", "Attacker uses lasers or images to deceive camera sensors.", "CAPEC-601", 4, 2, 3, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "V2X Infrastructure Spoofing", "Attacker broadcasts fake V2I messages (e.g., fake traffic lights).", "UNECE_R155", 3, 2, 3, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "V2V Vehicle Identity Spoofing", "Attacker broadcasts fake V2V messages mimicking another vehicle.", "UNECE_R155", 3, 2, 3, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Keyless Entry Relay Attack", "Attacker relays the key fob signal to unlock and start the car.", "CAPEC-112", 1, 4, 2, 2, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Bluetooth MAC Spoofing", "Attacker spoofs a paired device to gain unauthorized IVI access.", "CAPEC-61", 1, 2, 2, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "EVSE Identity Spoofing", "Attacker spoofs the charging station to steal payment info or grid access.", "ISO-15118", 2, 4, 3, 3, 2, ["EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Cloud API Token Spoofing", "Attacker uses a stolen token to act as the vehicle in the OEM cloud.", "OWASP", 1, 3, 2, 4, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    
    # ─── TAMPERING ───
    ("Tampering", "OTA Update Hijacking", "Attacker intercepts and modifies OTA firmware payloads.", "UNECE_R156", 4, 4, 4, 2, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "Unsigned Firmware Flashing", "Attacker flashes unauthorized firmware via OBD-II or USB.", "CAPEC-68", 4, 4, 4, 2, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "Diagnostic Parameter Tampering", "Attacker changes critical ECU calibrations via UDS services.", "CAPEC-68", 4, 3, 4, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "SDV Container Image Tampering", "Attacker modifies virtualized container images on the HPC.", "SDV_Threat", 4, 4, 4, 4, 2, ["ICE", "EV", "Hybrid"], ["SDV"]),
    ("Tampering", "BMS Battery Limit Tampering", "Attacker alters battery limits, causing overheating or degradation.", "UNECE_R155", 4, 4, 4, 1, 2, ["EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "Odometer Rollback", "Attacker modifies odometer mileage data in the instrument cluster.", "CAPEC-68", 1, 4, 2, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "Infotainment Rooting / Jailbreaking", "Attacker roots the IVI or AAOS to install unapproved apps.", "CAPEC-185", 1, 2, 3, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "V2X Message Tampering", "Attacker alters in-transit V2X messages.", "UNECE_R155", 3, 2, 3, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "EV Charging Parameter Tampering", "Attacker modifies ISO-15118 parameters, risking battery damage.", "ISO-15118", 4, 3, 4, 1, 2, ["EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "Hardware Implant / Modchip", "Attacker physically installs a malicious chip on the PCB.", "CAPEC-531", 4, 3, 4, 4, 1, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),

    # ─── REPUDIATION ───
    ("Repudiation", "Audit Log Deletion", "Attacker deletes local ECU event logs to hide their tracks.", "CAPEC-93", 1, 2, 3, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Repudiation", "Cloud Telemetry Spoofing", "Attacker sends fake crash data to cloud, repudiating real events.", "OWASP", 2, 3, 3, 2, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Repudiation", "V2X Non-Repudiation Bypass", "Attacker drops digital signatures, denying a V2X broadcast.", "UNECE_R155", 2, 2, 2, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Repudiation", "EV Billing Repudiation", "Attacker charges EV but denies the transaction via network manipulation.", "ISO-15118", 1, 4, 2, 2, 2, ["EV", "Hybrid"], ["Classic", "SDV"]),

    # ─── INFORMATION DISCLOSURE ───
    ("Information Disclosure", "CAN/LIN Bus Traffic Sniffing", "Attacker sniffs cleartext CAN/LIN traffic to map vehicle architecture.", "CAPEC-167", 1, 2, 2, 1, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "Automotive Ethernet Sniffing", "Attacker captures unencrypted Ethernet/SOME/IP payloads.", "CAPEC-167", 1, 2, 2, 3, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "Credential Theft via Infotainment", "Attacker extracts user credentials, tokens, or private keys from IVI.", "CAPEC-37", 1, 4, 2, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "Location Tracking (LINDDUN Linkability)", "Attacker tracks vehicle location via persistent cellular/Wi-Fi MACs.", "LINDDUN", 1, 2, 1, 4, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "Microphone/Camera Eavesdropping", "Attacker accesses in-cabin mics/cameras to spy on passengers.", "CAPEC-112", 1, 3, 1, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "Cloud Backend Data Breach", "Attacker compromises OEM cloud to leak millions of vehicle records.", "OWASP", 1, 4, 3, 4, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "Companion App Local Storage Leak", "Attacker extracts vehicle PINs or tokens from the mobile app.", "OWASP-Mobile", 1, 3, 2, 4, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "UDS Memory Read Dump", "Attacker uses UDS ReadMemoryByAddress to dump firmware or keys.", "CAPEC-37", 1, 3, 2, 2, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "EVSE Payment Info Disclosure", "Attacker sniffs ISO-15118 Plug&Charge certificates.", "ISO-15118", 1, 4, 1, 3, 2, ["EV", "Hybrid"], ["Classic", "SDV"]),

    # ─── DENIAL OF SERVICE ───
    ("Denial of Service", "CAN Bus Flooding (DoS)", "Attacker floods CAN bus with high-priority messages, disabling ECUs.", "CAPEC-125", 4, 3, 4, 1, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Denial of Service", "Ethernet Network Storm", "Attacker causes a broadcast storm on the automotive Ethernet switch.", "CAPEC-125", 4, 3, 4, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Denial of Service", "Ransomware on IVI/HPC", "Attacker locks the infotainment screen or HPC, demanding ransom.", "CAPEC-114", 2, 4, 4, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Denial of Service", "Cloud API DDoS", "Attacker floods OEM servers, preventing remote start/unlock services.", "CAPEC-125", 1, 3, 4, 1, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Denial of Service", "EV Charging DoS", "Attacker interrupts EVSE charging session via Wi-Fi/PLC jamming.", "ISO-15118", 1, 3, 3, 1, 3, ["EV", "Hybrid"], ["Classic", "SDV"]),
    ("Denial of Service", "Sensor Blinding (Laser/Jamming)", "Attacker physically jams radar or blinds cameras.", "CAPEC-601", 4, 2, 4, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Denial of Service", "V2X Channel Jamming", "Attacker jams the ITS-G5 or C-V2X frequency bands.", "UNECE_R155", 3, 2, 3, 1, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),

    # ─── ELEVATION OF PRIVILEGE ───
    ("Elevation of Privilege", "Diagnostic Interface Access", "Attacker accesses physical OBD-II to gain administrative diagnostic rights.", "CAPEC-68", 4, 3, 4, 2, 5, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Elevation of Privilege", "Hypervisor Escape", "Attacker escapes Android/Linux guest VM to compromise the hypervisor.", "SDV_Threat", 4, 4, 4, 4, 2, ["ICE", "EV", "Hybrid"], ["SDV"]),
    ("Elevation of Privilege", "Container Breakout", "Attacker escapes a localized Docker/LXC container on the Zonal Controller.", "SDV_Threat", 4, 4, 4, 4, 2, ["ICE", "EV", "Hybrid"], ["SDV"]),
    ("Elevation of Privilege", "JTAG/UART Hardware Debug Access", "Attacker solders wires to exposed debug ports to gain root.", "CAPEC-531", 4, 3, 4, 4, 1, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Elevation of Privilege", "Diagnostic Session Hijacking", "Attacker bypasses UDS SecurityAccess (Seed/Key) algorithm.", "CAPEC-68", 4, 3, 4, 2, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Elevation of Privilege", "Companion App Token Escalation", "Attacker modifies JWT token to access another user's vehicle.", "OWASP", 3, 4, 3, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Elevation of Privilege", "Lateral Movement via Gateway", "Attacker moves from Infotainment (low safety) to Powertrain (high safety) via CGW.", "UNECE_R155", 4, 4, 4, 3, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),

    # ─── EXTENDED THREATS ───
    ("Spoofing", "TPMS Sensor Spoofing / False Deflation Alerts", "Attacker transmits forged RF signals to simulate tire pressure anomalies.", "CAPEC-19", 2, 2, 2, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "PEPS Relay Attack / Signal Amplification", "Attacker uses a relay to amplify the LF/RF signal from the owner's fob.", "CAPEC-112", 1, 4, 2, 2, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Immobilizer Transponder Cloning", "Attacker sniffs and clones the low-frequency immobilizer challenge-response.", "CAPEC-19", 1, 4, 2, 2, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Denial of Service", "Vehicle Data Broker (MQTT) Connection Exhaustion", "Attacker floods the SOME/IP or MQTT broker with connections.", "CAPEC-125", 2, 3, 4, 1, 3, ["ICE", "EV", "Hybrid"], ["SDV"]),
    ("Tampering", "Malicious Container Image Deployment", "Attacker pushes a poisoned container to the SDV runtime engine.", "NIST-SP800-190", 4, 4, 4, 4, 2, ["ICE", "EV", "Hybrid"], ["SDV"]),
    ("Tampering", "SOA Registry Poisoning / Service Hijacking", "Attacker registers a fake service on the SOA bus to intercept traffic.", "SDV_Threat", 4, 3, 4, 4, 2, ["ICE", "EV", "Hybrid"], ["SDV"]),
    ("Tampering", "ML Model Poisoning / Evasion Attack", "Attacker alters training data or uses adversarial inputs to trick the Edge AI.", "MITRE-ATLAS", 4, 2, 4, 1, 2, ["ICE", "EV", "Hybrid"], ["SDV"]),
    ("Elevation of Privilege", "AAOS VHAL Privilege Escalation via Malicious App", "Attacker uses a vulnerable Android app to gain unauthorized VHAL write access.", "CAPEC-233", 4, 3, 4, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "Android Binder IPC Spoofing", "Attacker spoofs the caller UID/PID over Android Binder to invoke privileged APIs.", "CAPEC-19", 2, 3, 3, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Information Disclosure", "Android App Sandbox Bypass Leaking PII", "Attacker escapes the Android application sandbox to read local storage or contacts.", "CAPEC-37", 1, 4, 2, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "Sideloading of Unsigned Android Apps", "Attacker enables developer mode or exploits ADB to install unapproved APKs.", "CAPEC-185", 1, 3, 2, 4, 4, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "AR-HUD Display Tampering / Falsified Road Warnings", "Attacker manipulates HUD overlays to trick the driver with fake obstacles.", "CAPEC-68", 4, 2, 4, 1, 2, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Tampering", "Rear Seat Entertainment USB Malware Infection", "Attacker inserts a malicious USB into RSE to pivot into the main network.", "CAPEC-68", 2, 3, 3, 4, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"]),
    ("Spoofing", "eCall Emergency Call Spoofing", "Attacker spoofs the TCU cellular connection to trigger fake emergency calls.", "UNECE_R155", 3, 4, 3, 1, 3, ["ICE", "EV", "Hybrid"], ["Classic", "SDV"])
]

def seed_threats():
    print("Seeding RefThreats...")
    objects = []
    for (stride, title, desc, source, s, f, o, p, feas, v_types, archs) in THREATS_DATA:
        objects.append(RefThreat(
            stride_category=stride,
            title=title,
            description=desc,
            source=source,
            source_ref=f"{source}_Ref",
            default_impact_safety=s,
            default_impact_financial=f,
            default_impact_operational=o,
            default_impact_privacy=p,
            default_feasibility=feas,
            vehicle_types=v_types,
            architectures=archs
        ))
    db.session.add_all(objects)
    db.session.commit()
    print(f"Seeded {len(objects)} RefThreats.")

if __name__ == "__main__":
    with app.app_context():
        seed_threats()
