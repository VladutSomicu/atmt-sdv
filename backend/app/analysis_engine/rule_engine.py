# Threat identification rules based on STRIDE methodology,
# CAPEC attack patterns, UNECE R155/R156, and LINDDUN.

STRIDE_RULES = [

    # ═══════════════════════════════════════════════
    # NODE RULES (attribute-based)
    # ═══════════════════════════════════════════════

    {
        'id': 'R001',
        'trigger_type': 'node',
        'condition': lambda node, vp: 'is_connected_to_cloud' in node.get('flags', []),
        'threat_title': 'Cloud Channel Information Disclosure',
        'stride': 'Information Disclosure',
    },
    {
        'id': 'R002',
        'trigger_type': 'node',
        'condition': lambda node, vp: node.get('category') == 'Safety-Critical',
        'threat_title': 'Safety-Critical System Tampering',
        'stride': 'Tampering',
    },
    {
        'id': 'R003',
        'trigger_type': 'node',
        'condition': lambda node, vp: 'PII' in node.get('data_types', []),
        'threat_title': 'PII Exposure (LINDDUN Detectability)',
        'stride': 'Information Disclosure',
    },
    {
        'id': 'R004',
        'trigger_type': 'node',
        'condition': lambda node, vp: node.get('physical_accessibility') == 'OBD-II',
        'threat_title': 'Physical Tampering via OBD-II Port',
        'stride': 'Tampering',
    },
    {
        'id': 'R005',
        'trigger_type': 'node',
        'condition': lambda node, vp: (
            vp.get('ota_support') and
            'ota_capable' in node.get('flags', [])
        ),
        'threat_title': 'OTA Update Man-in-the-Middle',
        'stride': 'Tampering',
    },
    {
        'id': 'R006',
        'trigger_type': 'node',
        'condition': lambda node, vp: (
            node.get('category') == 'Perception' and
            vp.get('sae_level', 0) >= 3
        ),
        'threat_title': 'Autonomous Sensor Spoofing (SAE L3+)',
        'stride': 'Spoofing',
    },
    {
        'id': 'R007',
        'trigger_type': 'node',
        'condition': lambda node, vp: node.get('category') == 'Infotainment',
        'threat_title': 'Unauthorized Infotainment Data Access',
        'stride': 'Information Disclosure',
    },
    {
        'id': 'R008',
        'trigger_type': 'node',
        'condition': lambda node, vp: (
            vp.get('architecture') == 'SDV' and
            'is_virtualized' in node.get('flags', [])
        ),
        'threat_title': 'Container Escape / Privilege Escalation (SDV)',
        'stride': 'Elevation of Privilege',
    },
    {
        'id': 'R009',
        'trigger_type': 'node',
        'condition': lambda node, vp: node.get('category') == 'Cloud',
        'threat_title': 'Cloud API Abuse / Unauthorized Access',
        'stride': 'Elevation of Privilege',
    },
    {
        'id': 'R010_node',
        'trigger_type': 'node',
        'condition': lambda node, vp: (
            'is_connected_to_cloud' in node.get('flags', []) and
            'PII' in node.get('data_types', [])
        ),
        'threat_title': 'LINDDUN - Vehicle Tracking via Cloud Telemetry',
        'stride': 'Information Disclosure',
    },

    # ═══════════════════════════════════════════════
    # EDGE RULES (protocol-based)
    # ═══════════════════════════════════════════════

    {
        'id': 'R010',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') in ['CAN', 'CAN-FD'],
        'threat_title': 'CAN Bus Message Injection (CAPEC-19)',
        'stride': 'Spoofing',
    },
    {
        'id': 'R011',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') in ['CAN', 'CAN-FD', 'LIN'],
        'threat_title': 'CAN/LIN Bus Traffic Sniffing (CAPEC-167)',
        'stride': 'Information Disclosure',
    },
    {
        'id': 'R012',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') in ['Bluetooth', 'Wi-Fi'],
        'threat_title': 'Wireless Traffic Interception (CAPEC-158)',
        'stride': 'Information Disclosure',
    },
    {
        'id': 'R013',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') == 'V2X',
        'threat_title': 'V2X Message Replay Attack (CAPEC-570)',
        'stride': 'Spoofing',
    },
    {
        'id': 'R014',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') == 'Cellular',
        'threat_title': 'Rogue Base Station / IMSI Catcher Attack',
        'stride': 'Information Disclosure',
    },
    {
        'id': 'R015',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') == 'Ethernet',
        'threat_title': 'VLAN Hopping / Lateral Movement (ATT&CK ICS)',
        'stride': 'Elevation of Privilege',
    },
    {
        'id': 'R016',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') == 'USB',
        'threat_title': 'Malicious USB Device Injection',
        'stride': 'Tampering',
    },
    {
        'id': 'R017',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: edge.get('protocol') == 'ISO-15118',
        'threat_title': 'EV Charging Station Attack (ISO 15118)',
        'stride': 'Tampering',
    },

    # ═══════════════════════════════════════════════
    # TRUST BOUNDARY RULES
    # ═══════════════════════════════════════════════

    {
        'id': 'R020',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: (
            edge.get('crosses_trust_boundary') and
            not edge.get('has_security_control')
        ),
        'threat_title': 'Unsecured Trust Boundary Crossing',
        'stride': 'Spoofing',
    },

    # ═══════════════════════════════════════════════
    # CONTEXTUAL RULES (vehicle profile)
    # ═══════════════════════════════════════════════

    {
        'id': 'R021',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: (
            edge.get('protocol') == 'V2X' and
            'V2X' in vp.get('external_interfaces', [])
        ),
        'threat_title': 'V2X Infrastructure Spoofing (UNECE R155)',
        'stride': 'Spoofing',
    },
    {
        'id': 'R022',
        'trigger_type': 'edge',
        'condition': lambda edge, vp: (
            vp.get('ota_support') and
            edge.get('protocol') in ['Cellular', 'Wi-Fi'] and
            not edge.get('has_security_control')
        ),
        'threat_title': 'Unsigned OTA Update Acceptance (UNECE R156)',
        'stride': 'Tampering',
    },
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

    def _apply_edge_rule(self, rule, edges, nodes, vehicle_profile, threats):
        """Apply a single rule against all edges. Threat is on the target node."""
        for edge in edges:
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