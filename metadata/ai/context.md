# Internal context

## Identity

- Tool name: hot-vs-nice
- Project type: hybrid SVG utility
- Creator: Ali Güzel
- Publisher: YCSWU
- Version: 0.1.0

## Functional summary

This tool analyzes SVG artwork and helps compare alternate color directions. It extracts unique colors, estimates nearby Pantone values from an embedded palette, previews CMYK-oriented printable shifts, supports pinned history comparisons, and exports the active SVG.

## Supported surfaces

- Windows desktop package
- Static web deployment

## Inputs

- `.svg`
- user-entered text overlay content

## Outputs

- modified `.svg`
- release artifacts for Windows and static web deployment

## Boundaries

- No raster editing
- No exact Pantone guarantee
- No claim of full vector editor coverage
- macOS and Linux packaged builds are currently unknown or unavailable

## YCSWU Tools Hub notes

The root `app.manifest.json` is the primary machine-readable source.

Suggested hub ingestion order:

1. `app.manifest.json`
2. `metadata/manifest/tool.manifest.json`
3. `metadata/schema/software-application.schema.json`
4. `AI.md`
5. `llms.txt`
