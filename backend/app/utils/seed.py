from ..extensions import db
from ..models.ref_asset import RefAsset
from ..models.ref_threat import RefThreat
from ..models.control import Control


def seed_ref_assets():
    """Populate the ref_assets table with standard automotive components."""

    if RefAsset.query.first():
        print("ref_assets already seeded, skipping.")
        return

    assets = [
        RefAsset(
            name="Brake ECU",
            category="Safety-Critical",
            interface_types=["CAN", "CAN-FD"],
            data_types=["Control Commands"],
            physical_accessibility="Internal",
            asil_level="D",
            default_safety=4,
            default_privacy=1,
            flags=[],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
        RefAsset(
            name="Steering ECU",
            category="Safety-Critical",
            interface_types=["CAN-FD", "Flexray"],
            data_types=["Control Commands"],
            physical_accessibility="Internal",
            asil_level="D",
            default_safety=4,
            default_privacy=1,
            flags=[],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
        RefAsset(
            name="Central Gateway",
            category="Connectivity",
            interface_types=["CAN", "Ethernet", "LIN"],
            data_types=["Control Commands", "Sensor Data"],
            physical_accessibility="Internal",
            asil_level="B",
            default_safety=3,
            default_privacy=2,
            flags=[],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
        RefAsset(
            name="TCU (Telematics)",
            category="Connectivity",
            interface_types=["Cellular", "Bluetooth"],
            data_types=["PII", "Sensor Data"],
            physical_accessibility="External-Facing",
            asil_level=None,
            default_safety=2,
            default_privacy=3,
            flags=["is_connected_to_cloud"],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
        RefAsset(
            name="IVI / Infotainment",
            category="Infotainment",
            interface_types=["USB", "Wi-Fi", "Bluetooth"],
            data_types=["PII", "Sensor Data"],
            physical_accessibility="External-Facing",
            asil_level=None,
            default_safety=1,
            default_privacy=3,
            flags=[],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
        RefAsset(
            name="OBD-II Port",
            category="Diagnostic",
            interface_types=["CAN", "K-Line"],
            data_types=["Diagnostic Data"],
            physical_accessibility="OBD-II",
            asil_level=None,
            default_safety=3,
            default_privacy=2,
            flags=[],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
        RefAsset(
            name="BMS (Battery Management System)",
            category="Powertrain",
            interface_types=["CAN", "ISO-15118"],
            data_types=["Control Commands", "Sensor Data"],
            physical_accessibility="Internal",
            asil_level="D",
            default_safety=4,
            default_privacy=1,
            flags=[],
            vehicle_types=["EV", "Hybrid"]
        ),
        RefAsset(
            name="OTA Client / Gateway",
            category="Connectivity",
            interface_types=["Cellular", "Wi-Fi"],
            data_types=["Firmware"],
            physical_accessibility="Internal",
            asil_level=None,
            default_safety=3,
            default_privacy=1,
            flags=["ota_capable", "is_connected_to_cloud"],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
        RefAsset(
            name="LiDAR Sensor",
            category="Perception",
            interface_types=["Ethernet"],
            data_types=["Sensor Data"],
            physical_accessibility="External-Facing",
            asil_level="C",
            default_safety=3,
            default_privacy=1,
            flags=[],
            vehicle_types=["SDV"]
        ),
        RefAsset(
            name="Cloud Backend",
            category="Cloud",
            interface_types=["Cellular", "Wi-Fi"],
            data_types=["PII", "Firmware", "Sensor Data"],
            physical_accessibility="External-Facing",
            asil_level=None,
            default_safety=2,
            default_privacy=4,
            flags=["is_connected_to_cloud"],
            vehicle_types=["ICE", "EV", "Hybrid", "SDV"]
        ),
    ]

    db.session.add_all(assets)
    db.session.commit()
    print(f"Seeded {len(assets)} ref_assets.")


def seed_ref_threats():
    """Populate the ref_threats table with CAPEC, UNECE R155, and LINDDUN threats."""

    if RefThreat.query.first():
        print("ref_threats already seeded, skipping.")
        return

    threats = [
        RefThreat(
            stride_category="Spoofing",
            title="CAN Bus Message Injection",
            description="Attacker injects malicious messages on the CAN bus to manipulate vehicle behavior.",
            source="CAPEC",
            source_ref="CAPEC-19",
            trigger_protocols=["CAN", "CAN-FD"],
            trigger_categories=["Safety-Critical", "Connectivity"],
            trigger_flags=[],
            default_impact=4,
            default_feasibility=2
        ),
        RefThreat(
            stride_category="Information Disclosure",
            title="CAN Bus Traffic Sniffing",
            description="Attacker passively monitors CAN bus traffic to extract sensitive vehicle data.",
            source="CAPEC",
            source_ref="CAPEC-167",
            trigger_protocols=["CAN", "CAN-FD", "LIN"],
            trigger_categories=[],
            trigger_flags=[],
            default_impact=3,
            default_feasibility=2
        ),
        RefThreat(
            stride_category="Information Disclosure",
            title="Cellular Traffic Interception",
            description="Attacker intercepts cellular communications between the vehicle and cloud backend.",
            source="CAPEC",
            source_ref="CAPEC-158",
            trigger_protocols=["Cellular"],
            trigger_categories=["Connectivity"],
            trigger_flags=["is_connected_to_cloud"],
            default_impact=3,
            default_feasibility=4
        ),
        RefThreat(
            stride_category="Tampering",
            title="OTA Update Man-in-the-Middle",
            description="Attacker intercepts and replaces a legitimate OTA update package with malware.",
            source="UNECE_R156",
            source_ref="UNECE_R156_T01",
            trigger_protocols=["Cellular", "Wi-Fi"],
            trigger_categories=[],
            trigger_flags=["ota_capable"],
            default_impact=4,
            default_feasibility=4
        ),
        RefThreat(
            stride_category="Tampering",
            title="OTA Rollback Attack",
            description="Attacker forces the vehicle to revert to a vulnerable software version.",
            source="UNECE_R156",
            source_ref="UNECE_R156_T02",
            trigger_protocols=[],
            trigger_categories=[],
            trigger_flags=["ota_capable"],
            default_impact=3,
            default_feasibility=3
        ),
        RefThreat(
            stride_category="Denial of Service",
            title="OTA Update DoS - Vehicle Bricked",
            description="Attacker disrupts the OTA update process, leaving the vehicle in a non-functional state.",
            source="UNECE_R156",
            source_ref="UNECE_R156_T03",
            trigger_protocols=[],
            trigger_categories=[],
            trigger_flags=["ota_capable"],
            default_impact=3,
            default_feasibility=3
        ),
        RefThreat(
            stride_category="Spoofing",
            title="V2X Message Replay Attack",
            description="Attacker replays legitimate V2X messages to cause incorrect vehicle behavior.",
            source="CAPEC",
            source_ref="CAPEC-570",
            trigger_protocols=["V2X"],
            trigger_categories=[],
            trigger_flags=[],
            default_impact=2,
            default_feasibility=4
        ),
        RefThreat(
            stride_category="Tampering",
            title="Physical Tampering via OBD-II",
            description="Attacker connects malicious device to OBD-II port to reprogram ECUs.",
            source="UNECE_R155",
            source_ref="UNECE_R155_A5_T14",
            trigger_protocols=["CAN", "K-Line"],
            trigger_categories=["Diagnostic"],
            trigger_flags=[],
            default_impact=4,
            default_feasibility=2
        ),
        RefThreat(
            stride_category="Information Disclosure",
            title="LINDDUN - Vehicle Tracking via Cellular",
            description="Vehicle can be tracked through cellular signals without driver consent.",
            source="LINDDUN",
            source_ref="LINDDUN-DETECTABILITY",
            trigger_protocols=["Cellular", "V2X"],
            trigger_categories=[],
            trigger_flags=["is_connected_to_cloud"],
            default_impact=2,
            default_feasibility=4
        ),
        RefThreat(
            stride_category="Elevation of Privilege",
            title="Cloud Backend Compromise",
            description="Attacker gains unauthorized access to OEM cloud backend infrastructure.",
            source="UNECE_R155",
            source_ref="UNECE_R155_A5_T24",
            trigger_protocols=["Cellular"],
            trigger_categories=["Cloud"],
            trigger_flags=["is_connected_to_cloud"],
            default_impact=4,
            default_feasibility=5
        ),
    ]

    db.session.add_all(threats)
    db.session.commit()
    print(f"Seeded {len(threats)} ref_threats.")


def seed_controls():
    """Populate the controls_library with standard security mitigations."""

    if Control.query.first():
        print("controls_library already seeded, skipping.")
        return

    controls = [
        Control(
            title="SecOC - Secure Onboard Communication",
            description="Authenticates CAN messages using Message Authentication Codes (MAC). Prevents injection and spoofing on the CAN bus.",
            applies_to_stride=["Spoofing", "Tampering"],
            applies_to_protocols=["CAN", "CAN-FD"],
            feasibility_reduction=3,
            source_ref="ISO_21434_AnnexC"
        ),
        Control(
            title="HSM - Hardware Security Module",
            description="Stores cryptographic keys in dedicated tamper-resistant hardware. Prevents key extraction even with physical access.",
            applies_to_stride=["Spoofing", "Tampering", "Elevation of Privilege"],
            applies_to_protocols=[],
            feasibility_reduction=2,
            source_ref="ISO_21434_AnnexC"
        ),
        Control(
            title="TLS Mutual Authentication",
            description="Encrypts and authenticates all cloud and OTA communications bidirectionally.",
            applies_to_stride=["Information Disclosure", "Tampering"],
            applies_to_protocols=["Cellular", "Wi-Fi", "Cloud"],
            feasibility_reduction=3,
            source_ref="NIST_SP800-53_SC-8"
        ),
        Control(
            title="OTA Package Digital Signature Verification",
            description="Verifies cryptographic signature of update packages before installation. Prevents MitM and rollback attacks.",
            applies_to_stride=["Tampering"],
            applies_to_protocols=["Cellular", "Wi-Fi"],
            feasibility_reduction=4,
            source_ref="UNECE_R156"
        ),
        Control(
            title="Network Segmentation / Domain Isolation",
            description="Isolates vehicle domains (Infotainment vs Powertrain) through a gateway with firewall rules.",
            applies_to_stride=["Spoofing", "Information Disclosure", "Elevation of Privilege"],
            applies_to_protocols=["Ethernet"],
            feasibility_reduction=2,
            source_ref="NIST_SP800-53_SC-7"
        ),
        Control(
            title="IDS / Intrusion Detection System",
            description="Monitors vehicle network traffic for anomalous patterns. Detects and alerts on potential attacks in real-time.",
            applies_to_stride=["Spoofing", "Tampering", "Denial of Service"],
            applies_to_protocols=["CAN", "CAN-FD", "Ethernet"],
            feasibility_reduction=2,
            source_ref="UNECE_R155"
        ),
        Control(
            title="OBD-II Port Physical Security",
            description="Physical seal or access control on OBD-II port. Prevents unauthorized diagnostic device connection.",
            applies_to_stride=["Tampering", "Spoofing"],
            applies_to_protocols=["CAN", "K-Line"],
            feasibility_reduction=2,
            source_ref="ISO_21434_AnnexC"
        ),
    ]

    db.session.add_all(controls)
    db.session.commit()
    print(f"Seeded {len(controls)} controls.")


def run_all_seeds():
    """Run all seed functions."""
    seed_ref_assets()
    seed_ref_threats()
    seed_controls()
    print("All seeds completed.")