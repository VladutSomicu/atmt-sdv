# Threat identification rules based on STRIDE methodology,
# CAPEC attack patterns, UNECE R155/R156, and LINDDUN.

STRIDE_RULES = [
    # ─── SPOOFING ───
    {
        'id': 'R001', 'trigger_type': 'edge', 'stride': 'Spoofing', 'threat_title': 'CAN Bus Injection',
        'condition': lambda e, vp: e.get('protocol') == 'CAN'
    },
    {
        'id': 'R002', 'trigger_type': 'edge', 'stride': 'Spoofing', 'threat_title': 'CAN-FD Bus Injection',
        'condition': lambda e, vp: e.get('protocol') == 'CAN-FD'
    },
    {
        'id': 'R003', 'trigger_type': 'edge', 'stride': 'Spoofing', 'threat_title': 'LIN Bus Message Spoofing',
        'condition': lambda e, vp: e.get('protocol') == 'LIN'
    },
    {
        'id': 'R004', 'trigger_type': 'edge', 'stride': 'Spoofing', 'threat_title': 'FlexRay Message Spoofing',
        'condition': lambda e, vp: e.get('protocol') == 'FlexRay'
    },
    {
        'id': 'R005', 'trigger_type': 'edge', 'stride': 'Spoofing', 'threat_title': 'Ethernet Packet Spoofing',
        'condition': lambda e, vp: e.get('protocol') in ['Ethernet', 'SOME/IP']
    },
    {
        'id': 'R006', 'trigger_type': 'node', 'stride': 'Spoofing', 'threat_title': 'Sensor Spoofing (GPS/Radar)',
        'condition': lambda n, vp: n.get('category') == 'Perception' and 'Camera' not in n.get('name', '')
    },
    {
        'id': 'R007', 'trigger_type': 'node', 'stride': 'Spoofing', 'threat_title': 'Camera Blinding/Spoofing',
        'condition': lambda n, vp: 'Camera' in n.get('name', '')
    },
    {
        'id': 'R008', 'trigger_type': 'node', 'stride': 'Spoofing', 'threat_title': 'V2X Infrastructure Spoofing',
        'condition': lambda n, vp: 'V2I' in n.get('name', '') or 'V2X' in n.get('name', '')
    },
    {
        'id': 'R009', 'trigger_type': 'edge', 'stride': 'Spoofing', 'threat_title': 'V2V Vehicle Identity Spoofing',
        'condition': lambda e, vp: e.get('protocol') == 'V2X'
    },
    {
        'id': 'R010', 'trigger_type': 'node', 'stride': 'Spoofing', 'threat_title': 'Keyless Entry Relay Attack',
        'condition': lambda n, vp: 'Keyless' in n.get('name', '')
    },
    {
        'id': 'R011', 'trigger_type': 'edge', 'stride': 'Spoofing', 'threat_title': 'Bluetooth MAC Spoofing',
        'condition': lambda e, vp: e.get('protocol') == 'Bluetooth'
    },
    {
        'id': 'R012', 'trigger_type': 'node', 'stride': 'Spoofing', 'threat_title': 'EVSE Identity Spoofing',
        'condition': lambda n, vp: 'EVSE' in n.get('name', '')
    },
    {
        'id': 'R013', 'trigger_type': 'node', 'stride': 'Spoofing', 'threat_title': 'Cloud API Token Spoofing',
        'condition': lambda n, vp: n.get('category') == 'Cloud'
    },

    # ─── TAMPERING ───
    {
        'id': 'R014', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'OTA Update Hijacking',
        'condition': lambda n, vp: 'ota_capable' in n.get('flags', [])
    },
    {
        'id': 'R015', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Unsigned Firmware Flashing',
        'condition': lambda n, vp: n.get('physical_accessibility') in ['OBD-II', 'Internal']
    },
    {
        'id': 'R016', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Diagnostic Parameter Tampering',
        'condition': lambda n, vp: n.get('category') in ['Gateway', 'Powertrain']
    },
    {
        'id': 'R017', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'SDV Container Image Tampering',
        'condition': lambda n, vp: vp.get('architecture') == 'SDV' and 'is_virtualized' in n.get('flags', [])
    },
    {
        'id': 'R018', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'BMS Battery Limit Tampering',
        'condition': lambda n, vp: 'Battery' in n.get('name', '')
    },
    {
        'id': 'R019', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Odometer Rollback',
        'condition': lambda n, vp: n.get('category') == 'Body'
    },
    {
        'id': 'R020', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Infotainment Rooting / Jailbreaking',
        'condition': lambda n, vp: n.get('category') == 'Infotainment'
    },
    {
        'id': 'R021', 'trigger_type': 'edge', 'stride': 'Tampering', 'threat_title': 'V2X Message Tampering',
        'condition': lambda e, vp: e.get('protocol') == 'V2X'
    },
    {
        'id': 'R022', 'trigger_type': 'edge', 'stride': 'Tampering', 'threat_title': 'EV Charging Parameter Tampering',
        'condition': lambda e, vp: e.get('protocol') == 'ISO-15118'
    },
    {
        'id': 'R023', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Hardware Implant / Modchip',
        'condition': lambda n, vp: n.get('physical_accessibility') == 'Internal'
    },

    # ─── REPUDIATION ───
    {
        'id': 'R024', 'trigger_type': 'node', 'stride': 'Repudiation', 'threat_title': 'Audit Log Deletion',
        'condition': lambda n, vp: n.get('category') in ['Gateway', 'Compute']
    },
    {
        'id': 'R025', 'trigger_type': 'edge', 'stride': 'Repudiation', 'threat_title': 'Cloud Telemetry Spoofing',
        'condition': lambda e, vp: e.get('protocol') == 'Cellular'
    },
    {
        'id': 'R026', 'trigger_type': 'edge', 'stride': 'Repudiation', 'threat_title': 'V2X Non-Repudiation Bypass',
        'condition': lambda e, vp: e.get('protocol') == 'V2X'
    },
    {
        'id': 'R027', 'trigger_type': 'edge', 'stride': 'Repudiation', 'threat_title': 'EV Billing Repudiation',
        'condition': lambda e, vp: e.get('protocol') == 'ISO-15118'
    },

    # ─── INFORMATION DISCLOSURE ───
    {
        'id': 'R028', 'trigger_type': 'edge', 'stride': 'Information Disclosure', 'threat_title': 'CAN/LIN Bus Traffic Sniffing',
        'condition': lambda e, vp: e.get('protocol') in ['CAN', 'CAN-FD', 'LIN']
    },
    {
        'id': 'R029', 'trigger_type': 'edge', 'stride': 'Information Disclosure', 'threat_title': 'Automotive Ethernet Sniffing',
        'condition': lambda e, vp: e.get('protocol') in ['Ethernet', 'SOME/IP']
    },
    {
        'id': 'R030', 'trigger_type': 'node', 'stride': 'Information Disclosure', 'threat_title': 'Credential Theft via Infotainment',
        'condition': lambda n, vp: n.get('category') == 'Infotainment'
    },
    {
        'id': 'R031', 'trigger_type': 'edge', 'stride': 'Information Disclosure', 'threat_title': 'Location Tracking (LINDDUN Linkability)',
        'condition': lambda e, vp: e.get('protocol') in ['Cellular', 'Wi-Fi']
    },
    {
        'id': 'R032', 'trigger_type': 'node', 'stride': 'Information Disclosure', 'threat_title': 'Microphone/Camera Eavesdropping',
        'condition': lambda n, vp: n.get('category') == 'Infotainment' or 'Camera' in n.get('name', '')
    },
    {
        'id': 'R033', 'trigger_type': 'node', 'stride': 'Information Disclosure', 'threat_title': 'Cloud Backend Data Breach',
        'condition': lambda n, vp: n.get('category') == 'Cloud'
    },
    {
        'id': 'R034', 'trigger_type': 'node', 'stride': 'Information Disclosure', 'threat_title': 'Companion App Local Storage Leak',
        'condition': lambda n, vp: 'App' in n.get('name', '')
    },
    {
        'id': 'R035', 'trigger_type': 'node', 'stride': 'Information Disclosure', 'threat_title': 'UDS Memory Read Dump',
        'condition': lambda n, vp: n.get('category') in ['Powertrain', 'Safety-Critical']
    },
    {
        'id': 'R036', 'trigger_type': 'edge', 'stride': 'Information Disclosure', 'threat_title': 'EVSE Payment Info Disclosure',
        'condition': lambda e, vp: e.get('protocol') == 'ISO-15118'
    },

    # ─── DENIAL OF SERVICE ───
    {
        'id': 'R037', 'trigger_type': 'edge', 'stride': 'Denial of Service', 'threat_title': 'CAN Bus Flooding (DoS)',
        'condition': lambda e, vp: e.get('protocol') in ['CAN', 'CAN-FD']
    },
    {
        'id': 'R038', 'trigger_type': 'edge', 'stride': 'Denial of Service', 'threat_title': 'Ethernet Network Storm',
        'condition': lambda e, vp: e.get('protocol') in ['Ethernet', 'SOME/IP']
    },
    {
        'id': 'R039', 'trigger_type': 'node', 'stride': 'Denial of Service', 'threat_title': 'Ransomware on IVI/HPC',
        'condition': lambda n, vp: n.get('category') in ['Infotainment', 'Compute']
    },
    {
        'id': 'R040', 'trigger_type': 'node', 'stride': 'Denial of Service', 'threat_title': 'Cloud API DDoS',
        'condition': lambda n, vp: n.get('category') == 'Cloud'
    },
    {
        'id': 'R041', 'trigger_type': 'edge', 'stride': 'Denial of Service', 'threat_title': 'EV Charging DoS',
        'condition': lambda e, vp: e.get('protocol') in ['ISO-15118', 'Wi-Fi']
    },
    {
        'id': 'R042', 'trigger_type': 'node', 'stride': 'Denial of Service', 'threat_title': 'Sensor Blinding (Laser/Jamming)',
        'condition': lambda n, vp: n.get('category') == 'Perception'
    },
    {
        'id': 'R043', 'trigger_type': 'edge', 'stride': 'Denial of Service', 'threat_title': 'V2X Channel Jamming',
        'condition': lambda e, vp: e.get('protocol') == 'V2X'
    },

    # ─── ELEVATION OF PRIVILEGE ───
    {
        'id': 'R044', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'Diagnostic Interface Access',
        'condition': lambda n, vp: n.get('physical_accessibility') == 'OBD-II'
    },
    {
        'id': 'R045', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'Hypervisor Escape',
        'condition': lambda n, vp: vp.get('architecture') == 'SDV' and 'is_virtualized' in n.get('flags', [])
    },
    {
        'id': 'R046', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'Container Breakout',
        'condition': lambda n, vp: vp.get('architecture') == 'SDV' and n.get('category') == 'Gateway'
    },
    {
        'id': 'R047', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'JTAG/UART Hardware Debug Access',
        'condition': lambda n, vp: n.get('physical_accessibility') == 'Internal'
    },
    {
        'id': 'R048', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'Diagnostic Session Hijacking',
        'condition': lambda n, vp: n.get('category') in ['Gateway', 'Compute']
    },
    {
        'id': 'R049', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'Companion App Token Escalation',
        'condition': lambda n, vp: 'App' in n.get('name', '')
    },
    {
        'id': 'R050', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'Lateral Movement via Gateway',
        'condition': lambda n, vp: n.get('category') == 'Gateway'
    },

    # ─── EXTENDED E/E SENSORS & ACTUATORS ───
    {
        'id': 'R051', 'trigger_type': 'node', 'stride': 'Spoofing', 'threat_title': 'Physical Signal Spoofing / Short-to-Ground',
        'condition': lambda n, vp: 'Sensor' in n.get('name', '') and n.get('category') in ['Perception', 'Chassis']
    },
    {
        'id': 'R052', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Anti-Pinch Safety Bypass',
        'condition': lambda n, vp: 'Window Lift' in n.get('name', '') or 'Sunroof' in n.get('name', '')
    },
    {
        'id': 'R053', 'trigger_type': 'node', 'stride': 'Elevation of Privilege', 'threat_title': 'Forced Physical Actuation',
        'condition': lambda n, vp: 'Door Lock' in n.get('name', '') or 'Tailgate' in n.get('name', '')
    },

    # ─── MOTORCYCLES (CAT. L) ───
    {
        'id': 'R054', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Electronic Suspension Manipulation',
        'condition': lambda n, vp: 'Suspension' in n.get('name', '')
    },
    {
        'id': 'R055', 'trigger_type': 'node', 'stride': 'Information Disclosure', 'threat_title': 'Helmet HUD Eavesdropping',
        'condition': lambda n, vp: 'Helmet' in n.get('name', '') or 'HUD' in n.get('name', '')
    },
    {
        'id': 'R056', 'trigger_type': 'node', 'stride': 'Denial of Service', 'threat_title': 'eCall / Telematics Disable',
        'condition': lambda n, vp: 'eCall' in n.get('name', '') or 'Telematics' in n.get('name', '')
    },

    # ─── AGRICULTURAL (CAT. T) ───
    {
        'id': 'R057', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Crop Yield Data Falsification',
        'condition': lambda n, vp: 'Yield' in n.get('name', '') or 'Grain' in n.get('name', '')
    },
    {
        'id': 'R058', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Agricultural Application Manipulation (Spray/Seed)',
        'condition': lambda n, vp: 'Seed' in n.get('name', '') or 'Spray' in n.get('name', '')
    },
    {
        'id': 'R059', 'trigger_type': 'node', 'stride': 'Denial of Service', 'threat_title': 'ISOBUS Network Flooding',
        'condition': lambda n, vp: 'ISOBUS' in n.get('name', '')
    },

    # ─── TRAILERS & COMMERCIAL TRUCKS (CAT. O / N) ───
    {
        'id': 'R060', 'trigger_type': 'node', 'stride': 'Denial of Service', 'threat_title': 'Refrigeration Shutdown / Spoilage Attack',
        'condition': lambda n, vp: 'Reefer' in n.get('name', '') or 'Refrigeration' in n.get('name', '')
    },
    {
        'id': 'R061', 'trigger_type': 'node', 'stride': 'Tampering', 'threat_title': 'Trailer Braking System (EBS/TEBS) Manipulation',
        'condition': lambda n, vp: 'EBS' in n.get('name', '') or 'Braking' in n.get('name', '')
    },
    {
        'id': 'R062', 'trigger_type': 'node', 'stride': 'Repudiation', 'threat_title': 'Tachograph Record Forgery',
        'condition': lambda n, vp: 'Tachograph' in n.get('name', '')
    }
]


class RuleEngine:
    """
    Applies STRIDE rules against parsed graph nodes and edges.
    Returns a list of raw threat dicts (before scoring).
    """

    def apply(self, nodes: dict, edges: list, trust_boundaries: list,
              vehicle_profile: dict) -> list:
        threats = []

        for rule in STRIDE_RULES:
            if rule['trigger_type'] == 'node':
                self._apply_node_rule(rule, nodes, vehicle_profile, threats)
            elif rule['trigger_type'] == 'edge':
                self._apply_edge_rule(rule, edges, nodes, vehicle_profile, threats)

        return threats

    def _apply_node_rule(self, rule, nodes, vehicle_profile, threats):
        """Apply a single rule against all nodes."""
        for node_id, node in nodes.items():
            try:
                if rule['condition'](node, vehicle_profile):
                    threats.append({
                        'rule_id': rule['id'],
                        'asset_id': node_id,
                        'asset_label': node.get('label', ''),
                        'asset_category': node.get('category', ''),
                        'flow_id': None,
                        'threat_title': rule['threat_title'],
                        'stride': rule['stride'],
                    })
            except Exception:
                pass

    def _apply_edge_rule(self, rule, edges, nodes, vehicle_profile, threats):
        """Apply a single rule against all edges. Threat is on the target node."""
        for edge in edges:
            try:
                if rule['condition'](edge, vehicle_profile):
                    target_node = nodes.get(edge.get('target'), {})
                    threats.append({
                        'rule_id': rule['id'],
                        'asset_id': edge.get('target', ''),
                        'asset_label': target_node.get('label', ''),
                        'asset_category': target_node.get('category', ''),
                        'flow_id': edge.get('id'),
                        'threat_title': rule['threat_title'],
                        'stride': rule['stride'],
                    })
            except Exception:
                pass