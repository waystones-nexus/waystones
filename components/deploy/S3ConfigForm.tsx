import React from 'react';
import type { Translations } from '../../i18n/index';
import { Field } from './ConnectionForm';
import { S3StorageConfig, S3Provider } from '../../types';

// Provider presets: endpoint URL and default region
const S3_PROVIDER_PRESETS: Record<S3Provider, { endpoint: string; region: string }> = {
  r2:     { endpoint: 'https://<account-id>.r2.cloudflarestorage.com', region: 'auto' },
  tigris: { endpoint: 'https://fly.storage.tigris.dev',               region: 'auto' },
  aws:    { endpoint: '',                                               region: 'us-east-1' },
  custom: { endpoint: '',                                               region: 'us-east-1' },
};

interface S3ConfigFormProps {
  s3Config: S3StorageConfig;
  onS3Change: (config: S3StorageConfig) => void;
  isGpkg: boolean;
  gpkgFilename?: string;
  t: Translations;
}

const S3ConfigForm: React.FC<S3ConfigFormProps> = ({
  s3Config, onS3Change, isGpkg, gpkgFilename, t
}) => {
  const d = t.deploy;

  const updateS3 = (updates: Partial<S3StorageConfig>) => {
    onS3Change({ ...s3Config, ...updates });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Provider selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{d.s3Provider}</label>
        <select
          value={s3Config.provider}
          onChange={e => {
            const p = e.target.value as S3Provider;
            const preset = S3_PROVIDER_PRESETS[p];
            updateS3({ provider: p, endpointUrl: preset.endpoint, region: preset.region });
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
        >
          <option value="r2">{d.s3ProviderR2}</option>
          <option value="tigris">{d.s3ProviderTigris}</option>
          <option value="aws">{d.s3ProviderAws}</option>
          <option value="custom">{d.s3ProviderCustom}</option>
        </select>
        {s3Config.provider === 'tigris' && (
          <p className="text-[10px] text-indigo-600 font-medium px-1 leading-relaxed">{d.s3TigrisNote}</p>
        )}
      </div>

      <Field
        label={d.s3Endpoint}
        value={s3Config.endpointUrl || ''}
        onChange={v => updateS3({ endpointUrl: v, provider: 'custom' })}
        placeholder="https://..."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={d.s3BucketName}
          value={s3Config.bucketName || ''}
          onChange={v => updateS3({ bucketName: v })}
          placeholder="my-geodata"
        />
        <Field
          label={d.s3Region}
          value={s3Config.region || ''}
          onChange={v => updateS3({ region: v })}
          placeholder="auto"
        />
      </div>

      <Field
        label={d.s3ObjectKey}
        value={s3Config.objectKey || ''}
        onChange={v => updateS3({ objectKey: v })}
        placeholder={isGpkg ? (gpkgFilename || 'datasets/mydata.gpkg') : 'outputs/mymodel/'}
        hint={d.s3ObjectKeyHint}
      />

      <p className="text-[10px] text-amber-700 font-medium bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 leading-relaxed">
        {d.s3CredentialsNote}
      </p>
    </div>
  );
};

export default S3ConfigForm;
