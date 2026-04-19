import {
  DataModel, SourceConnection, DeployTarget
} from '../../types';
import { i18n } from '../../i18n';
import { getGpkgFilename, hasS3Config } from './_helpers';
import { generateEnvFile } from './infra';

// ============================================================
// Generate README for the deploy kit
// ============================================================
export const generateReadme = (model: DataModel, source: SourceConnection, lang: string = 'en'): string => {
  const s = (i18n[lang as keyof typeof i18n] ?? i18n.no).readme;
  const isPg = source.type === 'postgis' || source.type === 'supabase';
  const isGpkg = source.type === 'geopackage';
  const hasWms = model.layers.some(l => l.geometryType !== 'None');
  const useS3 = hasS3Config(source);

  let md = `# \${model.name} — \${s.deployKit}\n\n`;
  md = md.replace('\${model.name}', model.name).replace('\${s.deployKit}', s.deployKit);
  md += s.generatedBy + '\n\n';
  md += '## ' + s.dataSource + ': ' + source.type + '\n\n';
  md += '## ' + s.services + '\n\n';
  md += '| ' + s.service + ' | ' + s.port + ' | ' + s.url + ' |\n';
  md += '|----------|------|-----|\n';
  md += '| OGC API - Features (pygeoapi) | 5000 | http://localhost:5000 |\n';
  if (hasWms) {
    md += '| ' + s.wmsService + ' | 5000 | http://localhost:5000/ows/?SERVICE=WMS&REQUEST=GetCapabilities |\n';
  }
  md += '| ' + s.workerService + ' | - | *(' + s.internal + ')* |\n\n';

  md += '## ' + s.snapshotArchTitle + '\n\n';
  md += s.snapshotArchDesc + '\n\n';

  md += '```mermaid\n';
  md += 'graph TD\n';
  md += '    subgraph P1[Phase 1: Conversion]\n';
  md += '        Source[(Input Data)] --> Peasant[Peasant: Binder]\n';
  md += '        Peasant --> Peon[Peon: Transformer]\n';
  md += '        Peon --> Parquet[(GeoParquet)]\n';
  md += '        Peon --> FGB[(FlatGeobuf)]\n';
  md += '    end\n\n';
  md += '    subgraph P2[Phase 2 & 3: Serving & Gateway]\n';
  md += '        Parquet --> pygeoapi[pygeoapi Engine]\n';
  md += '        FGB --> QGIS[QGIS Engine]\n';
  md += '        pygeoapi --> Acolyte[Acolyte: Caddy Gateway]\n';
  md += '        QGIS -.-> Acolyte\n';
  md += '    end\n\n';
  md += '    Acolyte --> API[OGC API / WMS]\n';
  md += '    API --> User((Architect))\n';
  md += '```\n\n';

  md += '- ' + s.snapshotArchStep1 + '\n';
  md += '- ' + s.snapshotArchStep2 + '\n';
  md += '- ' + s.snapshotArchStep3 + '\n\n';

  md += '### ' + s.workingUnits + '\n\n';
  md += '| ' + s.service + ' | ' + s.role + ' | ' + s.lore + ' |\n';
  md += '|----------|------|------|\n';
  md += '| `worker` | ' + s.workerPeon + ' | ' + s.workerDesc + ' |\n';
  md += '| `pygeoapi` | ' + s.workerAcolyte + ' | ' + s.pygeoapiConfigFile + ' |\n';
  if (!isGpkg) {
    md += '| `delta-worker` | ' + s.workerShade + ' | ' + s.deltaScriptFile + ' |\n';
  }
  md += '\n';

  md += '## ' + s.gettingStarted + '\n\n';
  md += '```bash\n';
  md += s.step1CopyEnv + '\n';
  md += 'cp .env.template .env\n';
  md += 'nano .env\n\n';

  if (isGpkg) {
    const gpkgName = getGpkgFilename(model, source);
    if (useS3 && source.s3) {
      const endpointFlag = source.s3.endpointUrl ? ' \\\n  --endpoint-url ' + source.s3.endpointUrl : '';
      md += s.step2UploadToS3 + '\n';
      md += 'aws s3 cp ./' + gpkgName + ' s3://' + source.s3.bucketName + '/' + source.s3.objectKey + endpointFlag + '\n\n';
      md += s.step3SetS3Creds + '\n\n';
      md += s.step4Start + '\n';
    } else {
      md += s.step2AddData + '\n';
      md += s.addDataHint.replace('{filename}', gpkgName) + '\n\n';
      md += s.step3Start + '\n';
    }
  } else if (source.type === 'databricks') {
    md += s.step2Databricks + '\n';
    md += 'pip install databricks-sql-connector geopandas\n';
    md += 'docker compose --profile setup run --rm initial-export\n\n';
    md += s.step3Start + '\n';
  } else {
    md += s.step2Start + '\n';
  }

  md += 'docker compose up -d\n\n';
  md += s.stepWaitingForWorker + '\n';
  md += 'docker compose logs -f worker\n';
  md += '```\n\n';

  if (!isGpkg) {
    md += '## ' + s.deltaExport + '\n\n';
    md += s.deltaDesc + '\n';
    md += s.deltaInterval + '\n\n';
    md += s.deltaDownloadHint + '\n\n';
    md += s.stacAvailable + '\n\n';

    md += '### ' + s.deltaContents + '\n\n';
    md += '| ' + s.changeType + ' | ' + s.description + ' |\n';
    md += '|---------------|-------------|\n';
    md += '| `insert` | ' + s.insertDesc + ' |\n';
    md += '| `update` | ' + s.updateDesc + ' |\n';
    md += '| `delete` | ' + s.deleteDesc + ' |\n\n';
    md += s.deletesStoredHint + '\n\n';

    md += '### ' + s.deltaHowItWorksTitle + '\n\n';
    md += s.deltaHowItWorks1 + '\n\n';
    md += s.deltaHowItWorks2 + '\n\n';
    md += '> **Note:** ' + s.deltaTimestampNote + '\n\n';
    md += s.deltaManualTrigger + '\n';
    md += '```bash\n';
    md += s.deltaManualFull + '\n';
    md += s.deltaManualDelta + '\n';
    md += s.deltaManualDate + '\n';
    md += '```\n\n';
  }

  md += '## ' + s.files + '\n\n';
  md += '| ' + s.file + ' | ' + s.description + ' |\n';
  md += '|-----|-------------|\n';
  md += '| `docker-compose.yml` | ' + s.dockerComposeFile + ' |\n';
  md += '| `pygeoapi-config.yml` | ' + (isPg ? s.pygeoapiPgFile : s.pygeoapiGpkgFile) + ' |\n';
  if (hasWms) {
    md += '| `project.qgs` | ' + s.qgisProjectFile + ' |\n';
  }
  if (!isGpkg) {
    md += '| `delta_export.py` | ' + s.deltaScriptFile + ' |\n';
  }
  md += '| `worker` | ' + s.workerDesc + ' |\n';
  md += '| `.env.template` | ' + s.envTemplateFile + ' |\n';

  return md;
};

// ============================================================
// Generate GitHub Actions workflow for CI/CD deployment
// ============================================================
export const generateGithubActionsWorkflow = (
  model: DataModel,
  _source: SourceConnection
): string => {
  const slug = model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  let workflow = 'name: Deploy ' + model.name + '\n\n';
  workflow += 'on:\n  push:\n    branches: [main]\n    paths:\n      - \'docker-compose.yml\'\n      - \'pygeoapi-config.yml\'\n      - \'project.qgs\'\n      - \'model.json\'\n      - \'.github/workflows/deploy.yml\'\n\n';
  workflow += 'env:\n  SERVICE_NAME: ' + slug + '\n\n';
  workflow += 'jobs:\n  validate:\n    name: Validate configuration\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n';
  workflow += '      - name: Validate pygeoapi config\n        run: |\n          python3 -c "\n          import yaml, sys\n          with open(\'pygeoapi-config.yml\') as f:\n              config = yaml.safe_load(f)\n          if not config.get(\'resources\'):\n              sys.exit(1)\n          "\n';
  workflow += '  deploy:\n    name: Deploy services\n    needs: validate\n    runs-on: ubuntu-latest\n    environment: production\n    steps:\n      - uses: actions/checkout@v4\n      - name: Deploy via SSH\n        uses: appleboy/ssh-action@v1\n        with:\n          host: ${{ secrets.DEPLOY_HOST }}\n          username: ${{ secrets.DEPLOY_USER }}\n          key: ${{ secrets.DEPLOY_SSH_KEY }}\n          script: |\n            cd /opt/services/' + slug + '\n            git pull origin main\n            docker compose pull\n            docker compose up -d --remove-orphans\n';

  return workflow;
};

// ============================================================
// Generate GitHub Actions workflow — target-aware
// ============================================================
export const generateWorkflowForTarget = (
  model: DataModel,
  source: SourceConnection,
  target: DeployTarget
): string => {
  if (target === 'railway') {
    return 'name: Validate ' + model.name + '\non:\n  push:\n    branches: [main]\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Validate\n        run: echo "Validating..."\n';
  }
  return generateGithubActionsWorkflow(model, source);
};

// ============================================================
// Generate README — target-aware
// ============================================================
export const generateReadmeForTarget = (
  model: DataModel,
  source: SourceConnection,
  target: DeployTarget,
  lang: string = 'en'
): string => {
  const s = (i18n[lang as keyof typeof i18n] ?? i18n.no).readme;
  const isGpkg = source.type === 'geopackage';
  const hasWms = model.layers.some(l => l.geometryType !== 'None');

  let md = `# ${model.name} — ${s.deployKit}\n\n`;
  md += s.generatedByTarget + ' **' + target + '**\n\n';

  // --- Snapshot Architecture Section (Unified) ---
  md += '## ' + s.snapshotArchTitle + '\n\n';
  md += s.snapshotArchDesc + '\n\n';

  md += '```mermaid\n';
  md += 'graph TD\n';
  md += '    subgraph P1[Phase 1: Conversion]\n';
  md += '        Source[(Input Data)] --> Peasant[Peasant: Binder]\n';
  md += '        Peasant --> Peon[Peon: Transformer]\n';
  md += '        Peon --> Parquet[(GeoParquet)]\n';
  md += '        Peon --> FGB[(FlatGeobuf)]\n';
  md += '    end\n\n';
  md += '    subgraph P2[Phase 2 & 3: Serving & Gateway]\n';
  md += '        Parquet --> pygeoapi[pygeoapi Engine]\n';
  md += '        FGB --> QGIS[QGIS Engine]\n';
  md += '        pygeoapi --> Acolyte[Acolyte: Caddy Gateway]\n';
  md += '        QGIS -.-> Acolyte\n';
  md += '    end\n\n';
  md += '    Acolyte --> API[OGC API / WMS]\n';
  md += '    API --> User((Architect))\n';
  md += '```\n\n';

  md += '- ' + s.snapshotArchStep1 + '\n';
  md += '- ' + s.snapshotArchStep2 + '\n';
  md += '- ' + s.snapshotArchStep3 + '\n\n';

  md += '### ' + s.workingUnits + '\n\n';
  md += '| ' + s.service + ' | ' + s.role + ' | ' + s.lore + ' |\n';
  md += '|----------|------|------|\n';
  md += '| `worker` | ' + s.workerPeon + ' | ' + s.workerDesc + ' |\n';
  md += '| `pygeoapi` | ' + s.workerAcolyte + ' | ' + s.pygeoapiConfigFile + ' |\n';
  if (hasWms) {
    md += '| `qgis-server` | ' + s.workerPeon + ' | ' + s.qgisProjectFile + ' |\n';
  }
  md += '\n';

  // --- Services Table ---
  md += '## ' + s.services + '\n\n';
  md += '| ' + s.service + ' | ' + s.description + ' | ' + s.url + ' |\n';
  md += '|----------|-------------|-----|\n';
  md += '| pygeoapi | OGC API – Features | ' + (target === 'docker-compose' ? 'http://localhost:5000' : 'https://<your-deployment>') + ' |\n';
  if (hasWms) {
    md += '| QGIS Server | ' + s.wmsLayers + ' | ' + (target === 'docker-compose' ? 'http://localhost:5000/ows/' : 'https://<your-deployment>/ows/') + ' |\n';
  }
  md += '\n';

  // --- Target-Specific Getting Started ---
  if (target === 'docker-compose') {
    const readmeFull = generateReadme(model, source, lang);
    const anchor = '## ' + s.gettingStarted;
    const idx = readmeFull.indexOf(anchor);
    if (idx !== -1) md += readmeFull.substring(idx);
    return md;
  }

  if (target === 'railway') {
    md += '## ' + s.gettingStartedRailway + '\n\n';
    md += s.railwayStep1 + '\n';
    md += s.railwayStep2 + '\n';
    md += s.railwayStep3 + '\n';
    if (hasWms) {
      md += s.railwayStep4 + '\n';
    }
    md += '\n';

    md += '### ' + s.envVars + '\n\n';
    md += s.railwayEnvDesc + '\n\n';
    md += '| ' + s.variable + ' | ' + s.description + ' | ' + s.value + ' |\n';
    md += '|----------|-------------|-------|\n';
    md += '| `PYGEOAPI_SERVER_URL` | ' + s.railwayPygeoapiDesc + ' | ' + s.yourValue + ' |\n';
    if (hasWms) {
      md += '| `QGIS_SERVER_PUBLIC_URL` | ' + s.railwayQgisPublicDesc + ' | ' + s.yourValue + ' |\n';
      md += '| `QGIS_WAKEUP_URL` | ' + s.railwayWakeupDesc + ' | ' + s.yourValue + ' |\n';
    }
    md += '\n' + s.railwayNote + '\n\n';

    if (hasWms) {
      md += '### ' + s.qgisServerSection + '\n\n';
      md += s.railwayQgisDesc + '\n\n';
    }

    md += '### ' + s.dataSection + '\n\n';
    md += s.gpkgDataDesc + ' ' + s.gpkgUpdateHint + '\n\n';
    md += s.autoDeployRailway + '\n\n';

    md += '## ' + s.files + '\n\n';
    md += '| ' + s.file + ' | ' + s.description + ' |\n';
    md += '|-----|-------------|\n';
    md += '| `railway.json` | ' + s.railwayJsonFile + ' |\n';
    if (hasWms) {
      md += '| `railway.qgis.json` | ' + s.railwayQgisJsonFile + ' |\n';
    }
    md += '| `pygeoapi-config.yml` | ' + (source.type === 'postgis' ? s.pygeoapiPgFile : s.pygeoapiGpkgFile) + ' |\n';
    md += '| `model.json` | ' + s.modelJsonFile + ' |\n';
    md += '| `README.md` | ' + s.instructionsFile + ' |\n';

    return md;
  }

  // Fallback
  return md + '## ' + s.gettingStarted + '\nRefer to the Waystones documentation for deployment instructions.';
};
