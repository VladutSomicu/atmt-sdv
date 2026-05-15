const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/EditorPage.jsx');
const outDir = path.join(__dirname, 'src/components/editor');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(filePath, 'utf8');

const parts = content.split(/\/\* ══════════════════════════════════════════════════════\s*\n\s*.*?\s*\n══════════════════════════════════════════════════════ \*\//g);

const mainEditorPage = parts[0];
const diagramTab = parts[1];
const analysisTab = parts[2];
const threatDetailPanel = parts[3];
const complianceTab = parts[4];
const reportTab = parts[5];

const diagramContent = `import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { dia, shapes } from '@joint/core';
import Modal from '../shared/Modal';

export default ` + diagramTab.trim().replace(/^function DiagramTab/, 'function DiagramTab');

const threatContent = `import React, { useState } from 'react';
import api from '../../services/api';

export default ` + threatDetailPanel.trim();

const analysisContent = `import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ThreatDetailPanel from './ThreatDetailPanel';

export default ` + analysisTab.trim();

const complianceContent = `import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default ` + complianceTab.trim();

const reportContent = `import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default ` + reportTab.trim();

fs.writeFileSync(path.join(outDir, 'DiagramTab.jsx'), diagramContent);
fs.writeFileSync(path.join(outDir, 'ThreatDetailPanel.jsx'), threatContent);
fs.writeFileSync(path.join(outDir, 'AnalysisTab.jsx'), analysisContent);
fs.writeFileSync(path.join(outDir, 'ComplianceTab.jsx'), complianceContent);
fs.writeFileSync(path.join(outDir, 'ReportTab.jsx'), reportContent);

const newEditorContent = `import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import DiagramTab from '../components/editor/DiagramTab';
import AnalysisTab from '../components/editor/AnalysisTab';
import ComplianceTab from '../components/editor/ComplianceTab';
import ReportTab from '../components/editor/ReportTab';

` + mainEditorPage.replace(/import .*?;\n/g, '').trim();

fs.writeFileSync(filePath, newEditorContent);

console.log("Split successful!");
