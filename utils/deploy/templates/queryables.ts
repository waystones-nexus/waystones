import { DataModel } from '../../../types';

export function generateQueryablesHtml(_model: DataModel): string {
  return `{% extends "_base.html" %}
{% block title %}{{ super() }} - Queryables - {{ data.title | default(data.id) }}{% endblock %}
{% block crumbs %}
  {{ super() }} / 
  <a href="{{ config.server.url }}/collections">Collections</a> / 
  <a href="{{ config.server.url }}/collections/{{ data.id }}">{{ data.title | default(data.id) }}</a> / 
  <span>Queryables</span>
{% endblock %}

{% block body %}
<style>
  .query-hero { margin-bottom: 2rem; }
  .query-title { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; color: var(--brand); margin-bottom: 0.5rem; }
  .query-desc { color: #475569; font-size: 1rem; line-height: 1.6; max-width: 800px; }
  
  .prop-card { background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; margin-bottom: 1rem; transition: transform 0.15s, box-shadow 0.15s; }
  .prop-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: #cbd5e1; }
  .prop-header { padding: 1rem 1.25rem; background: #f8fafc; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
  .prop-name { font-family: monospace; font-weight: 700; color: var(--brand); font-size: 1rem; }
  .prop-type { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; background: #fff; border: 1px solid #e2e8f0; padding: 0.2rem 0.6rem; border-radius: 999px; }
  .prop-body { padding: 1rem 1.25rem; }
  .prop-title { font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; font-size: 0.95rem; }
  .prop-description { color: #64748b; font-size: 0.875rem; line-height: 1.5; }
  
  .info-alert { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius); padding: 1rem 1.25rem; color: #1e40af; font-size: 0.9rem; margin-bottom: 2rem; display: flex; gap: 0.75rem; align-items: flex-start; }
  .info-alert svg { flex-shrink: 0; margin-top: 0.1rem; }
</style>

<div class="query-hero">
  <div class="query-title">Queryables</div>
  <div class="query-desc">
    The following properties can be used for filtering data in this collection via the <code>filter</code> or <code>cql_text</code> parameters.
  </div>
</div>

<div class="info-alert">
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  <div>
    <strong>Usage Tip:</strong> You can use these property names in OGC API queries. For example: <code>?filter=population > 10000</code> or <code>?propertyname=city&value=Oslo</code>.
  </div>
</div>

<div class="row g-3">
  {% for name, prop in data.properties.items() %}
  <div class="col-md-6 col-lg-4">
    <div class="prop-card">
      <div class="prop-header">
        <span class="prop-name">{{ name }}</span>
        <span class="prop-type">{{ prop.type | default('string') }}</span>
      </div>
      <div class="prop-body">
        {% if prop.title %}
          <div class="prop-title">{{ prop.title }}</div>
        {% endif %}
        <div class="prop-description">
          {{ prop.description | default('No description available.') }}
        </div>
        {% if prop.enum %}
          <div style="margin-top: 0.75rem;">
            <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 0.35rem;">Allowed Values</div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
              {% for val in prop.enum %}
                <span style="font-size: 0.7rem; background: #f1f5f9; color: #475569; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid #e2e8f0;">{{ val }}</span>
              {% endfor %}
            </div>
          </div>
        {% endif %}
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0;">
  <a href="{{ config.server.url }}/collections/{{ data.id }}/items" class="btn" style="background: var(--brand); color: #fff; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: var(--radius); text-decoration: none;">
    Explore Items &rarr;
  </a>
</div>
{% endblock %}
`;
}
