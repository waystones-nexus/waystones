import { DataModel, Layer, Field } from '../types';
import yaml from 'js-yaml';
import { scrubModelForExport } from './modelUtils';
import { getSqlType } from './typeMapUtils';

/**
 * Maps a Waystones DataModel to the Open Data Contract Standard (ODCS) v3.0.0
 */
export const generateODC = (model: DataModel): any => {
  const scrubbed = scrubModelForExport(model);
  const metadata = scrubbed.metadata;
  const qualityRules: any[] = [];

  // 1. Fundamentals (apiVersion, kind, metadata)
  const odc: any = {
    apiVersion: 'v3.0.0',
    kind: 'DataContract',
    metadata: {
      name: scrubbed.name,
      version: scrubbed.version,
      description: {
        abstract: scrubbed.description || '',
        purpose: metadata?.purpose || '',
      },
      status: 'active',
      domain: metadata?.theme?.[0] || 'General',
    },
  };

  // 2. Stakeholders (Teams/Roles)
  if (metadata?.contactName) {
    odc.stakeholders = [
      {
        name: metadata.contactName,
        role: 'owner',
        contact: metadata.contactEmail || '',
        organization: metadata.contactOrganization || '',
      }
    ];
  }

  // 3. Schema (Objects & Properties)
  odc.schema = scrubbed.layers.map((layer: Layer) => ({
    name: layer.name,
    description: layer.description || '',
    physicalType: 'table',
    properties: layer.properties.map((field: Field) => {
      let description = field.description || '';
      
      const prop: any = {
        name: field.name,
        description: description,
      };

      // Map Types (Logical vs Physical)
      let enumValues: string[] = [];

      if (field.fieldType.kind === 'primitive') {
        prop.logicalType = field.fieldType.baseType; // string, integer, number, boolean, date, date-time
        prop.physicalType = getSqlType(field.fieldType);
      } else if (field.fieldType.kind === 'geometry') {
        prop.logicalType = 'string'; // ODC doesn't have a native 'geometry' logical type in core, using string with metadata
        prop.physicalType = 'geometry';
        prop.format = 'wkt'; // assumption for ODC interoperability
        prop.geometryType = field.fieldType.geometryType;
      } else if (field.fieldType.kind === 'codelist') {
        prop.logicalType = 'string';
        prop.physicalType = 'varchar';
        
        if (field.fieldType.mode === 'inline') {
          enumValues = field.fieldType.values.map(v => v.code);
        } else if (field.fieldType.mode === 'shared') {
          const shared = scrubbed.sharedEnums?.find(e => e.id === (field.fieldType as any).enumRef);
          if (shared) {
            enumValues = shared.values.map(v => v.code);
          }
        }
      } else if (field.fieldType.kind === 'datatype-ref' || field.fieldType.kind === 'datatype-inline') {
        prop.logicalType = 'object';
        prop.physicalType = 'json';
      } else {
        prop.logicalType = 'string';
      }

      // Merge values from property constraints if present
      if (field.constraints?.enumeration && field.constraints.enumeration.length > 0) {
        enumValues = Array.from(new Set([...enumValues, ...field.constraints.enumeration]));
      }

      // Apply enumerations to schema and quality
      if (enumValues.length > 0) {
        prop.enum = enumValues;
        prop.description = `${description}${description ? ' ' : ''}(Allowed values: ${enumValues.join(', ')})`.trim();
        qualityRules.push({
          table: layer.name,
          column: field.name,
          rule: 'validValues',
          validValues: enumValues,
          description: `Must be one of: ${enumValues.join(', ')}`,
        });
      } else if (field.fieldType.kind === 'codelist' && field.fieldType.mode === 'external') {
        prop.description = `${description}${description ? ' ' : ''}(Values from: ${field.fieldType.url})`.trim();
      }

      // Constraints (Logical Options in ODCS v3)
      if (field.multiplicity?.startsWith('1')) {
        prop.required = true;
      }
      if (field.constraints?.isPrimaryKey) {
        prop.primaryKey = true;
      }
      
      if (field.constraints?.isUnique) {
        prop.unique = true;
        qualityRules.push({
          table: layer.name,
          column: field.name,
          rule: 'unique',
          description: `Values in ${field.name} must be unique.`,
        });
      }

      if (field.constraints?.min !== undefined) {
        prop.minimum = field.constraints.min;
        qualityRules.push({ table: layer.name, column: field.name, rule: 'minimum', value: field.constraints.min });
      }
      if (field.constraints?.max !== undefined) {
        prop.maximum = field.constraints.max;
        qualityRules.push({ table: layer.name, column: field.name, rule: 'maximum', value: field.constraints.max });
      }
      if (field.constraints?.minLength !== undefined) {
        prop.minLength = field.constraints.minLength;
        qualityRules.push({ table: layer.name, column: field.name, rule: 'minLength', value: field.constraints.minLength });
      }
      if (field.constraints?.maxLength !== undefined) {
        prop.maxLength = field.constraints.maxLength;
        qualityRules.push({ table: layer.name, column: field.name, rule: 'maxLength', value: field.constraints.maxLength });
      }
      if (field.constraints?.pattern) {
        prop.pattern = field.constraints.pattern;
        qualityRules.push({ table: layer.name, column: field.name, rule: 'pattern', value: field.constraints.pattern });
      }

      return prop;
    }),
  }));

  // 4. Infrastructure (Servers)
  if (scrubbed.sourceConnection) {
    odc.servers = [
      {
        type: scrubbed.sourceConnection.type,
        ...(scrubbed.sourceConnection.config as any),
      }
    ];
  }

  // 5. Terms / Governance
  if (metadata?.license || metadata?.termsOfService) {
    odc.terms = {
      usage: metadata.termsOfService || '',
      license: metadata.license || '',
    };
  }

  // 6. Data Quality (Layer Constraints + Generated Rules)
  scrubbed.layers.forEach(layer => {
    if (layer.layerConstraints && layer.layerConstraints.length > 0) {
      layer.layerConstraints.forEach(constraint => {
        qualityRules.push({
          table: layer.name,
          rule: 'custom',
          definition: `${constraint.fieldA} ${constraint.operator} ${constraint.fieldB}`,
          description: constraint.errorMessage || 'Cross-field validation rule',
        });
      });
    }
  });

  if (qualityRules.length > 0) {
    odc.quality = qualityRules;
  }

  return odc;
};

/**
 * Triggers a browser download of the ODC YAML file
 */
export const exportODC = (model: DataModel, filename: string) => {
  const odcData = generateODC(model);
  const yamlContent = `# Open Data Contract (ODCS v3.0.0)
# Generated by Waystones on ${new Date().toISOString()}

${yaml.dump(odcData, { indent: 2, lineWidth: -1, noRefs: true })}`;

  const blob = new Blob([yamlContent], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.odc.yaml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
