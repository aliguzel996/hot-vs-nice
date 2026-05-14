# hot-vs-nice for humans and machines

This project is a free open-source creative tool for exploring SVG color variations without fake automation layers.

## What this tool is

hot-vs-nice is a small graphics utility inside the YCSWU creative tools set. It loads SVG artwork, finds the colors used in it, shows nearby Pantone approximations, previews altered color directions, and exports the active SVG result.

It runs as:

- a Windows desktop app
- a static web app build

## Who it is for

- Designers testing alternate color directions on vector posters or logos
- People preparing SVG artwork for print-adjacent review
- Anyone who wants a direct color inspection tool without a large design suite

## What problem it solves

SVG color changes are easy to do badly and annoying to compare. This tool keeps the task narrow:

- inspect the palette
- compare variations
- pin versions
- preview printable shifts
- export the active SVG

## What it can do

- Import SVG files
- Detect and list unique colors with HEX values
- Estimate the nearest embedded Pantone approximation for each detected color
- Apply Pantone approximations per color or across the whole palette
- Toggle a CMYK-oriented printable preview mode
- Pin versions into a comparison history
- Generate randomized sample posters for testing
- Add, move, and remove text overlays
- Select and delete individual SVG elements in preview
- Export the active SVG variation

## What it cannot do

- It does not edit raster images
- It does not guarantee exact print certification or exact Pantone matching
- It does not replace a full vector editor
- It does not currently ship packaged macOS or Linux desktop builds
- It does not support arbitrary vector formats beyond SVG

## Relation to YCSWU Tools

This project is one of the YCSWU creative tools by Ali Güzel / YCSWU. The metadata files in this repository are intended to make the tool easier to index, document, package, and eventually plug into a broader YCSWU Tools Hub without adding visible clutter to the interface.

## License and cost

This project is free and open source.

The repository currently describes it as open source, but if a formal license file is added later, that license should become the canonical source.

## Releases and updates

Expected update and release points:

- GitHub repository: https://github.com/aliguzel996/hot-vs-nice
- Latest releases page: https://github.com/aliguzel996/hot-vs-nice/releases/latest
- Latest release API: https://api.github.com/repos/aliguzel996/hot-vs-nice/releases/latest

If direct download URLs change per release, update `app.manifest.json` and `metadata/manifest/tool.manifest.json` rather than adding extra UI text.
