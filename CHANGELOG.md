# Changelog

## [0.5.7] - Unreleased

## [0.5.6] - 2025-01-19

### Added

- Support for embedded files via the `embeddedFiles` property in the
  document definition.

### Fixed

- A bug that caused errors when reusing fonts or images across multiple
  documents.

## [0.5.5] - 2024-12-18

The minimum EcmaScript version has been raised to ES2022.
Minimum build requirements have been raised to Node 20 and npm 10.

### Added

- The functions `line()`, `rect()`, `circle()`, and `path()` to create
  graphics shapes with less code and better tool support.

- The functions `text()`, `image()`, `rows()`, and `columns()` to create
  blocks with less code and better tool support.

- The function `span()` to create text spans with less code and better
  tool support.

- The functions `bold()` and `italic()` to conveniently create text
  spans with bold or italic styles.

- The `PdfMaker` class to render multiple documents with the same
  font configuration.

  ```ts
  const pdfMaker = new PdfMaker(config);
  pdfMaker.registerFont(await readFile('path/to/MyFont.ttf'));
  pdfMaker.registerFont(await readFile('path/to/MyFont-Bold.ttf'));
  const pdf1 = await pdfMaker.makePdf(doc1);
  const pdf2 = await pdfMaker.makePdf(doc2);
  ```

### Changed

- Fonts should now be registered with the `registerFont()` method on the
  `PdfMaker` class.

- The `image` property of an image block now supports `data:`, `file:`,
  and `http(s):` URLs. File names are relative to a resource root that
  must be set by the `setResourceRoot()` method on the `PdfMaker` class.

### Deprecated

- `TextAttrs` in favor of `TextProps`.
- `BlockAttrs` in favor of `BlockProps`.
- `InfoAttrs` in favor of `InfoProps`.
- `CustomInfoAttrs` in favor of `CustomInfoProps`.
- `Text` in favor of `TextSpan`.
- `LineOpts` in favor of `StrokeProps`.
- `RectOpts` in favor of `RectProps`.
- `CircleOpts` in favor of `CircleProps`.
- `PathOpts` in favor of `PathProps`.
- The `fonts` property in a document definition.
- The `images` property in a document definition.
- The `makePdf` function in favor of the `makePdf` method on the
  `PdfMaker` class.
- Using file paths as image sources in favor of `file:` URLs.

## [0.5.4] - 2024-02-25

### Added

- Text properties `fontStyle` and `fontWeight`.

### Changed

- The `image` property of an image block now supports a file name.
  When file names are used, the images don't need to be registered with
  the global `images` property anymore.

### Deprecated

- Text properties `bold` and `italic` in favor of `fontStyle: 'italic'`
  and `fontWeight: 'bold'`.

### Removed

- The optional `format` property of an image definition. The format is
  now auto-detected from the file content.

### Fixed

- Text in a text block will no longer break before the first row, which
  would result in an empty frame.

## [0.5.3] - 2023-09-28

### Fixed

- An edge case that could lead to a duplicated row after a page break
  has been fixed.

## [0.5.2] - 2023-07-06

### Added

- The `width` property of a `Block` now supports the value `auto` on
  all block types. When set to `auto`, the block will shrink to the
  width of its contents.

## [0.5.1] - 2023-06-30

### Added

- The property `margin` in a document definition now supports a
  function that returns the margin for a given page.

- Support for PNG images. A new, optional property `format` is added to
  image definitions. For PNG images, it must be set to `png` (defaults
  to `jpeg`).

### Fixed

- In the PDF metadata, the fields "Creator" and "Producer" are no longer
  set to default values.

- Consecutive newlines in texts are no longer collapsed. Blank lines are
  now rendered as expected.

- Images registered in the document definition are now only included in
  the PDF when they are used in the document.

## [0.5.0] - 2023-05-18

### Breaking changes

- When a graphics element has neither `lineColor` nor `fillColor` set,
  it is stroked by default. If a `lineWidth` but no `lineColor` is set
  on an element that also has a `fillColor`, the element is now stroked
  with a black line.

- Rows in a `RowsBlock` will now break and continue on the next page
  when they do not fit. To prevent this, set `breakInside` to `avoid`.

- Lines in a `TextBlock` will now break and continue on the next page
  when they do not fit. To prevent this, set `breakInside` to `avoid`.

- The `lineJoin` property is no longer supported by the graphics type
  `Circle`.

### Added

- Property `breakInside` to control page breaks inside a block on
  `TextBlock` and `RowsBlock`. The default is `auto`.

- Property `insertAfterBreak` on `RowsBlock` to insert an extra block
  after a page break.

- Properties `translate`, `scale`, `rotate`, `skew` and `matrix` on all
  graphics elements to apply transformations.

## [0.4.2] - 2023-04-29

### Added

- Text property `letterSpacing`.
- Support for SVG paths in `graphics` using `Path` elements.

## [0.4.1] - 2023-04-15 (not available)

Note: This npm package `pdfmkr@0.4.1` had to be unpublished because of
a build error. Do to npm's policy, the version number cannot be reused.

### Fixed

- Text rise is now reset properly and does not affect subsequent text
  elements anymore.

## [0.4.0] - 2023-03-27

### Breaking changes

- Page margins are now relative to the header and footer to let the
  contents adjust to a dynamic header and footer height.

### Added

- Text property `rise` for superscripts and subscripts.
- Block property `verticalAlign` for vertical alignment of columns.
- Property `lineDash` for graphics shapes.

## [0.3.3] - 2023-03-03

### Fixed

- An error was thrown when rendering a document definition that includes
  a `header` but no `footer`.

## [0.3.2] - 2022-10-12

### Added

- Property `customData` to include custom data in the PDF _document catalog_.

## [0.3.1] - 2022-08-25

### Fixed

- PDF now has a trailing newline
- Link annotations are now compatible with PDF/A
- The PDF trailer now has an ID (needed for PDF/A compatibility)

## [0.3.0] - 2022-07-28

### Breaking changes

- Renamed block types `Paragraph` to `TextBlock`, `Image` to `ImageBlock`,
  `Columns` to `ColumnsBlock`, and `Rows` to `RowsBlock`. Added `EmptyBlock` for blocks
  that don't have any content.

### Added

- Graphics shape type `circle`.
- Properties `lineOpacity` and `fillOpacity` on graphics shapes.
- Property `padding` on _all_ block types.
- Properties `breakBefore` and `breakAfter` on top-level blocks.
- Margins and paddings are highlighted when guides are enabled.

### Fixed

- Property `imageAlign` marked optional in type definition
- Copied text from a PDF document now includes headers and footers in correct order

## [0.2.0] - 2022-06-08

### Breaking changes

- Properties `strokeWidth`, `strokeColor` have been renamed to `lineWidth`, `lineColor`.
- Images are horizontally centered by default.
- Text is now vertically aligned in text rows.

### Added

- Properties `lineCap` and `lineJoin`.
- Support for functions in the `graphics` property.
- Property `imageAlign` for horizontal alignment.
- Property `pageSize` and `pageOrientation`.

### Fixed

- Position of anchors in PDF does not include the padding or paragraphs anymore.

## [0.1.0] - 2022-04-25

First public version.

[Unreleased]: https://github.com/eclipsesource/pdf-maker
[0.1.0]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.1.0
[0.2.0]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.2.0
[0.3.0]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.3.0
[0.3.0]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.3.0
[0.3.1]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.3.1
[0.3.2]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.3.2
[0.3.3]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.3.3
[0.4.0]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.4.0
[0.4.1]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.4.1
[0.4.2]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.4.2
[0.5.0]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.5.0
[0.5.1]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.5.1
[0.5.2]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.5.2
[0.5.3]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.5.3
[0.5.4]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.5.4
[0.5.5]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.5.5
[0.5.6]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.5.6
