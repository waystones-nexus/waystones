import {
  DataModel, SourceConnection, ModelMetadata
} from '../../types';
import { reprojectCoordinates } from '../gdalService';
import { toTableName } from '../nameSanitizer';

// ============================================================
// Generate pygeoapi config
//
// The worker has already converted all data to per-layer Parquet files
// at /data/{collectionId}.parquet. pygeoapi always uses
// GeoParquetDuckDBProvider — no live database or GeoPackage reads.
// ============================================================
export const generatePygeoapiConfig = async (
  model: DataModel,
  source?: SourceConnection,
  lang: string = 'en'
): Promise<string> => {
  let yaml = `# pygeoapi configuration for ${model.name}\n`;
  yaml += `# Generated: ${new Date().toISOString()}\n`;
  yaml += `# Provider: GeoParquetDuckDBProvider (reads /data/{layer}.parquet)\n\n`;

  yaml += `server:\n  bind:\n    host: 0.0.0.0\n    port: \${PORT:-80}\n`;
  yaml += `  url: \${PYGEOAPI_SERVER_URL}\n`;
  yaml += `  mimetype: application/json; charset=UTF-8\n  encoding: utf-8\n  languages:\n    - ${lang === 'no' ? 'nb-NO' : 'en-US'}\n`;
  yaml += `  map:\n`;
  yaml += `    url: https://tile.openstreetmap.org/{z}/{x}/{y}.png\n`;
  yaml += `    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'\n`;
  yaml += `  limits:\n`;
  yaml += `    default_items: 10\n`;
  yaml += `    max_items: 10000\n`;
  yaml += `  templates:\n`;
  yaml += `    path: /pygeoapi/local-templates\n\n`;
  yaml += `logging:\n  level: INFO\n\n`;

  const meta = model.metadata || ({} as Partial<ModelMetadata>);
  const keywords = meta?.keywords?.length ? meta.keywords : ['geospatial', model.namespace || 'data'];
  const licenseName = meta?.license || 'CC-BY-4.0';
  const licenseUrls: Record<string, string> = {
    'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'NLOD-2.0': 'https://data.norge.no/nlod/no/2.0',
  };

  yaml += `metadata:\n`;
  yaml += `  identification:\n`;
  yaml += `    title: ${model.name}\n`;
  yaml += `    description: ${model.description || 'Spatial data'}\n`;
  yaml += `    url: ${meta.url || 'https://example.com/dataset'}\n`;
  yaml += `    terms_of_service: ${meta.termsOfService || 'https://example.com/terms'}\n`;
  yaml += `    keywords:\n`;
  keywords.forEach(kw => { yaml += `      - ${kw}\n`; });

  if (meta?.purpose) {
    yaml += `    abstract: ${meta.purpose}\n`;
  }

  yaml += `  license:\n`;
  yaml += `    name: ${licenseName}\n`;
  yaml += `    url: ${licenseUrls[licenseName] || ''}\n`;

  if (meta?.contactName || meta?.contactEmail || meta?.contactOrganization) {
    yaml += `  contact:\n`;
    yaml += `    name: ${meta.contactName || 'Contact'}\n`;
    yaml += `    email: ${meta.contactEmail || 'contact@example.com'}\n`;
    yaml += `  provider:\n`;
    yaml += `    name: ${meta.contactName || 'Contact'}\n`;
    if (meta?.contactOrganization) yaml += `    organization: ${meta.contactOrganization}\n`;
    yaml += `    email: ${meta.contactEmail || 'contact@example.com'}\n`;
  }
  yaml += `\n`;
  yaml += `resources:\n`;

  for (const layer of model.layers) {
    const collectionId = toTableName(layer.name);
    const mapping = source?.layerMappings?.[layer.id];

    const layerKeywords = layer.keywords?.length
      ? [...layer.keywords, `geometry:${layer.geometryType}`]
      : [model.namespace || 'data', (layer.name || 'layer').toLowerCase().replace(/[^a-z0-9]/g, '-'), `geometry:${layer.geometryType}`];

    const nativeCrsUri = toCrsUri(model.crs);

    const crsList = [
      'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
      ...(nativeCrsUri ? [nativeCrsUri] : []),
      ...COMMON_CRS_URIS,
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    yaml += `  ${collectionId}:\n`;
    yaml += `    type: collection\n`;
    yaml += `    title: ${layer.title || layer.name}\n`;
    yaml += `    description: ${layer.description || layer.name}\n`;
    yaml += `    keywords:\n`;
    layerKeywords.forEach(kw => { yaml += `      - ${kw}\n`; });
    yaml += `    links: []\n`;
    yaml += `    crs:\n`;
    crsList.forEach(uri => { yaml += `      - ${uri}\n`; });

    if (layer.geometryType !== 'None') {
      const ext = model.metadata?.spatialExtent;
      const hasBbox = ext?.westBoundLongitude && ext?.southBoundLatitude && ext?.eastBoundLongitude && ext?.northBoundLatitude;

      let bbox = '[-180, -90, 180, 90]';

      if (hasBbox && model.crs) {
        const coords: [number, number][] = [
          [Number(ext!.westBoundLongitude), Number(ext!.southBoundLatitude)],
          [Number(ext!.eastBoundLongitude), Number(ext!.northBoundLatitude)]
        ];

        try {
          const transformed = await reprojectCoordinates(coords, model.crs, 'EPSG:4326');
          bbox = `[${transformed[0][0]}, ${transformed[0][1]}, ${transformed[1][0]}, ${transformed[1][1]}]`;
        } catch (error) {
          console.warn('Failed to transform bbox to WGS84, using original coordinates:', error);
          bbox = `[${ext!.westBoundLongitude}, ${ext!.southBoundLatitude}, ${ext!.eastBoundLongitude}, ${ext!.northBoundLatitude}]`;
        }
      } else if (hasBbox) {
        bbox = `[${ext!.westBoundLongitude}, ${ext!.southBoundLatitude}, ${ext!.eastBoundLongitude}, ${ext!.northBoundLatitude}]`;
      }

      yaml += `    extents:\n`;
      yaml += `      spatial:\n`;
      yaml += `        bbox: ${bbox}\n`;
      yaml += `        crs: http://www.opengis.net/def/crs/OGC/1.3/CRS84\n`;
    }

    // GeoParquetDuckDBProvider — always. The worker outputs /data/{collectionId}.parquet.
    yaml += `    providers:\n`;
    yaml += `      - type: feature\n`;
    yaml += `        name: waystones.providers.geoparquet.GeoParquetDuckDBProvider\n`;
    yaml += `        data: /data/${collectionId}.parquet\n`;
    yaml += `        id_field: ${mapping?.primaryKeyColumn || 'fid'}\n`;
    yaml += getCQL2Extensions();

    const allProperties = resolveLayerProperties(layer, model.layers);

    yaml += `    schema:\n`;
    yaml += `      # Resolved properties for ${layer.name} (Local: ${layer.properties.length}, Total: ${allProperties.length})\n`;
    yaml += `      # Generator Version: 1.0.2\n`;
    yaml += `      title: "${layer.name}"\n`;
    yaml += `      type: object\n`;
    yaml += `      properties:\n`;
    yaml += `        "waystones_ping":\n`;
    yaml += `          title: "Waystones Connection Check"\n`;
    yaml += `          type: string\n`;
    allProperties.forEach(prop => {
      const typeInfo = mapFieldToSchemaType(prop);
      const pName = prop.name || 'untitled_property';
      yaml += `        "${pName}":\n`;
      yaml += `          title: "${prop.title || pName}"\n`;
      yaml += `          type: ${typeInfo.type}\n`;
      if (typeInfo.format) yaml += `          format: ${typeInfo.format}\n`;
      if (typeInfo.enum) {
        yaml += `          enum:\n`;
        typeInfo.enum.forEach((e: string) => { yaml += `            - "${e}"\n`; });
      }
    });
    yaml += `\n`;
  }

  return yaml;
};

const COMMON_CRS_URIS = [
  'http://www.opengis.net/def/crs/EPSG/0/4326',
  'http://www.opengis.net/def/crs/EPSG/0/4258',
  'http://www.opengis.net/def/crs/EPSG/0/3857',
  'http://www.opengis.net/def/crs/EPSG/0/4269',
];

function getCQL2Extensions(): string {
  let s = `        extensions:\n`;
  s += `          filters:\n`;
  s += `            - cql2-text\n`;
  s += `            - cql2-json\n`;
  s += `            - cql-text\n\n`;
  return s;
}

function toCrsUri(crs: string | null | undefined): string | null {
  if (!crs) return null;
  if (crs.startsWith('http')) return crs;
  return `http://www.opengis.net/def/crs/EPSG/0/${crs.split(':')[1]}`;
}

function resolveLayerProperties(layer: any, allLayers: any[]): any[] {
  const propertyMap = new Map<string, any>();
  const visitedIds = new Set<string>();
  let current = layer;

  const layersToProcess: any[] = [];
  while (current) {
    layersToProcess.unshift(current);
    const parentRef = current.extends;
    if (!parentRef || visitedIds.has(parentRef)) break;
    visitedIds.add(parentRef);
    current = allLayers.find(l => l.id === parentRef || l.name === parentRef);
  }

  layersToProcess.forEach(l => {
    if (l.properties && Array.isArray(l.properties)) {
      l.properties.forEach((p: any) => { propertyMap.set(p.name, p); });
    }
  });

  return Array.from(propertyMap.values());
}

function mapFieldToSchemaType(field: any): { type: string; format?: string; enum?: string[] } {
  const ft = field.fieldType;
  if (!ft) return { type: 'string' };

  if (ft.kind === 'primitive') {
    const bt = String(ft.baseType).toLowerCase();
    switch (bt) {
      case 'integer':
      case 'int':
      case 'int4':
      case 'int8':
      case 'integer32':
      case 'integer64':
      case 'bigint':
      case 'long':
      case 'short':
      case 'smallint':
      case 'tinyint':
        return { type: 'number' };
      case 'number':
      case 'float':
      case 'float4':
      case 'float8':
      case 'double':
      case 'decimal':
      case 'numeric':
      case 'real':
        return { type: 'number' };
      case 'boolean':
      case 'bool':
        return { type: 'boolean' };
      case 'date': return { type: 'string', format: 'date' };
      case 'date-time':
      case 'timestamp':
      case 'timestamptz':
        return { type: 'string', format: 'date-time' };
      default: return { type: 'string' };
    }
  }

  if (ft.kind === 'codelist' && ft.mode === 'inline') {
    return {
      type: 'string',
      enum: ft.values.map((v: any) => v.code || v.id)
    };
  }

  return { type: 'string' };
}
