import {
  DataModel, SourceConnection, DeployTarget
} from '../../types';
import { generatePygeoapiConfig } from './pygeoapi';
import { generateQgisProject, generateRailwayQgisJson } from './qgis';
import { generateEnvFile, generateDockerCompose, generateRailwayJson } from './infra';
import { generateReadmeForTarget, generateWorkflowForTarget } from './readme';
import { scrubModelForExport } from '../modelUtils';
import * as railwayTemplates from './railway-templates';
import {
  generatePygeoapiTheme,
  generateIndexHtml,
  generateCollectionsHtml,
  generateCollectionHtml,
  generateItemsHtml,
  generateItemHtml,
} from './pygeoapi-theme';
import { hasS3Config, getGpkgFilename } from './_helpers';


// ============================================================
// Generate deploy file map — target-aware
// Returns a flat Record<filename, content> for pushing to GitHub
// ============================================================
export const generateDeployFiles = async (
  model: DataModel,
  source: SourceConnection,
  lang: string = 'en',
  target: DeployTarget = 'docker-compose'
): Promise<Record<string, string>> => {
  const hasWms = model.layers.some(l => l.geometryType !== 'None');

  const scrubbedModel = scrubModelForExport(model);
  const pygeoapiYaml = await generatePygeoapiConfig(model, source, lang);

  const files: Record<string, string> = {
    'model.json': JSON.stringify(scrubbedModel, null, 2),
    'pygeoapi-config.yml': pygeoapiYaml,
    '.env.template': generateEnvFile(source),
    '.gitignore': '.env\n__pycache__/\n',
    'README.md': generateReadmeForTarget(model, source, target, lang),
    '.github/workflows/deploy.yml': generateWorkflowForTarget(model, source, target),
  };

  if (hasWms) {
    files['project.qgs'] = generateQgisProject(model, source);
  }

  if (target === 'docker-compose') {
    files['docker-compose.yml'] = generateDockerCompose(model, source);
  }

  if (target === 'railway') {
    files['railway.json'] = generateRailwayJson(model, source);
    if (hasWms) {
      files['railway.qgis.json'] = generateRailwayQgisJson(model, source);
    }

    // Branded HTML templates baked into the deploy kit
    files['docker/pygeoapi/local-templates/_base.html'] = generatePygeoapiTheme(model);
    files['docker/pygeoapi/local-templates/landing_page.html'] = generateIndexHtml(model);
    files['docker/pygeoapi/local-templates/collections/index.html'] = generateCollectionsHtml(model);
    files['docker/pygeoapi/local-templates/collections/collection.html'] = generateCollectionHtml(model);
    files['docker/pygeoapi/local-templates/collections/items/index.html'] = generateItemsHtml(model);
    files['docker/pygeoapi/local-templates/collections/items/item.html'] = generateItemHtml(model);

    // Include Docker/Railway infra for a self-contained kit
    const isLocalGpkg = source.type === 'geopackage' && !hasS3Config(source);
    const gpkgFilename = isLocalGpkg ? getGpkgFilename(model, source) : undefined;
    files['docker/railway/Dockerfile'] = railwayTemplates.generateDockerfile(isLocalGpkg, gpkgFilename);
    files['docker/railway/railway-boot.sh'] = railwayTemplates.railwayBoot;

    if (hasWms) {
      files['docker/railway/Dockerfile.qgis'] = railwayTemplates.dockerfileQgis;
      files['docker/railway/qgis-boot.sh'] = railwayTemplates.qgisBoot;
    }

    // Include worker scripts needed by the Dockerfiles
    files['docker/worker/main.py'] = railwayTemplates.workerMain;
    files['docker/worker/gpkg-converter.py'] = railwayTemplates.workerGpkgConverter;
    files['docker/worker/postgis-snapshot.py'] = railwayTemplates.workerPostgisSnapshot;
  }

  return files;
};

// ============================================================
// Legacy: generate deploy kit as downloadable zip (kept as fallback)
// ============================================================
export const exportDeployKit = async (
  model: DataModel,
  source: SourceConnection,
  lang: string = 'en',
  target: DeployTarget = 'docker-compose',
  binaryFiles?: Record<string, Blob>
) => {
  const files = await generateDeployFiles(model, source, lang, target);

  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folderName = `${model.name.replace(/\s/g, '_')}_deploy`;

    Object.entries(files).forEach(([name, content]) => {
      zip.file(`${folderName}/${name}`, content);
    });

    if (binaryFiles) {
      for (const [name, blob] of Object.entries(binaryFiles)) {
        zip.file(`${folderName}/${name}`, blob);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    Object.entries(files).forEach(([name, content]) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
};
