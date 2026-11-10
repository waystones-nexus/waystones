# Changelog

What changed in the Waystones designer ([waystones.app](https://waystones.app)) and its deployment kits each month, newest first. Changes are grouped by area. Anything that changes how an existing model or deployment kit behaves is listed under **Heads up** at the top of the month.

Changes to the managed service are in the [Waystones Cloud changelog](https://github.com/waystones-nexus/waystones-cloud/blob/main/CHANGELOG.md). Both are combined at [waystones.cloud/changelog](https://waystones.cloud/changelog). Documentation: [waystones.cloud/docs/designer](https://waystones.cloud/docs/designer/overview).

## 2026-10 — October 2026

**Designer**

- The landing page offers managed hosting — "No Docker or servers? Deploy free on Waystones Cloud" — and Quick Publish lists Waystones Cloud first. The default deploy target is unchanged.
- The header and the help guide link to the documentation.
- **Try the sample** on the landing page loads Natural Earth countries and cities, for trying Quick Publish without your own data.
- Open a model or dataset from a link: `waystones.app/?model=<url>`.
- The AI assistant uses Claude Haiku 5.5 and Gemini 3.8 Flash.

**Export**

- GeoPackage export writes codelist labels and no longer repeats shared codelists.

**Deployment kits**

- Codespaces kits pin their base image to Ubuntu 24.04.
- Generated READMEs mention Waystones Cloud as a managed alternative.

**Worker**

- Vector tile generation is more robust; automatic zoom never goes below z12; worker logs no longer show credentials.
- Tasks accepted just before a worker shuts down are no longer cut off.

**Fixes**

- Security hardening for the AI trial.
- waystones.app serves its `robots.txt` and sitemap correctly, and unknown paths return 404.

## 2026-09 — September 2026

**Deployment kits**

- The Codespaces quickstart notebook shows the docker-compose equivalent of each step, and explains how to update a running Codespace after publishing again.
- Fixes for Codespaces setup: no Python build from source, a working Jupyter kernel, and no race between the STAC sync and the STAC worker.

## 2026-08 — August 2026

**Deployment kits**

- New **GitHub Codespaces** target: publish to a repository and open a ready-to-run Codespace with the OGC API, vector tiles, STAC and a map viewer with a basemap and your model's styling.
- Clearer docker-compose kit documentation and a correct PostGIS setup. The kit's MinIO runs on host ports 19000/19001.

**GitHub**

- Publishing to a brand-new, empty repository works.
- Publishing errors show GitHub's explanation, including when the token lacks the `workflow` scope.

**Worker**

- Fixes for S3-compatible endpoints over plain HTTP and for files at the bucket root.

## 2026-06 — June 2026

> [!WARNING]
> **Heads up**
> - Deployment kits run OGC API – Features on [oapif-go](https://github.com/waystones-nexus/oapif-go) instead of pygeoapi.
> - Private services take the API key as `Authorization: ApiKey <key>` instead of `X-API-Key`.
> - The NLOD 2.0 license option was removed.

**Designer**

- The ER diagram shows shared codelists and shortens long field names; the codelist editor is translated.

**Worker**

- Worker logs stream live to Waystones Cloud, with sensitive output filtered out.

## 2026-05 — May 2026

**Vector tiles and STAC**

- Deployment kits generate vector tiles (PMTiles), with automatic zoom range and simplification, and STAC catalogs.

**Styling**

- Point opacity, line opacity and an outline toggle in the style editor, with warnings for styles vector tiles can't show.

**Waystones Cloud**

- **Open in Waystones Cloud** sends the model securely by POST instead of in the URL.

**Docs**

- The README lists live public and private demo services.

## 2026-04 — April 2026

> [!WARNING]
> **Heads up**
> - The interface is English only; the language toggle was removed.

**Designer**

- Quests and companion characters guide you through modelling, metadata and publishing.
- The AI assistant writes metadata in the language you choose.
- Export to the Open Data Contract Standard (ODCS).
- Map-based bounding-box editing with automatic reprojection.
- Stored database, GitHub and AI credentials are encrypted in the browser, and exported models are scrubbed of secrets.

**PostGIS and Supabase**

- Better geometry-type detection, feature counts in the publish wizard and extents read from the data. Supabase uses a connection string like PostGIS.

**Deployment kits**

- One set of Docker images for every target, with faster cold starts.
- OGC API with CQL2 filtering, queryables, a filter builder and bounding-box selection in the items browser.
- Private deployments with multiple API keys.
- Railway kits include the configuration, templates and data they need.

## 2026-03 — March 2026

First release of Waystones, under the AGPL-3.0.

- A visual data-model editor: layers, fields, codelists, inheritance, shared types, validation and an ER diagram.
- Import models from JSON or YAML, from PostGIS and Supabase schemas, and from GeoPackage, GeoParquet and FlatGeobuf files.
- Export JSON-FG and JSON schemas, YAML, TypeScript and HTML documentation.
- **Quick Publish**: from a GeoPackage to a deployment kit for OGC API and WMS, with styling and metadata steps.
- Push models and kits to GitHub.
- An AI assistant for descriptions and keywords.
- OGC API – Features Part 2 coordinate-system support, S3-compatible storage, and mobile-friendly service pages.
