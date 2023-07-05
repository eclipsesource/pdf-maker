# Changelog

## [0.5.2] - Unreleased

### Added

* The `width` attribute of a `Block` now supports the value `auto` on
  all block types. When set to `auto`, the block will shrink to the
  width of its contents.

## [0.5.1] - 2023-06-29

### Added

* The attribute `margin` in a document definition now supports a
  function that returns the margin for a given page.

* Support for PNG images. A new, optional property `format` is added to
  image definitions. For PNG images, it must be set to `png` (defaults
  to `jpeg`).

### Fixed

* In the PDF metadata, the fields "Creator" and "Producer" are no longer
  set to default values.

* Consecutive newlines in texts are no longer collapsed. Blank lines are
  now rendered as expected.

* Images registered in the document definition are now only included in
  the PDF when they are used in the document.

## [0.5.0] - 2023-05-18

### Breaking changes

* When a graphics element has neither `lineColor` nor `fillColor` set,
  it is stroked by default. If a `lineWidth` but no `lineColor` is set
  on an element that also has a `fillColor`, the element is now stroked
  with a black line.

* Rows in a `RowsBlock` will now break and continue on the next page
  when they do not fit. To prevent this, set `breakInside` to `avoid`.

* Lines in a `TextBlock` will now break and continue on the next page
  when they do not fit. To prevent this, set `breakInside` to `avoid`.

* The `lineJoin` attribute is no longer supported by the graphics type
  `Circle`.

### Added

* Attribute `breakInside` to control page breaks inside a block on
  `TextBlock` and `RowsBlock`. The default is `auto`.

* Attribute `insertAfterBreak` on `RowsBlock` to insert an extra block
  after a page break.

* Attributes `translate`, `scale`, `rotate`, `skew` and `matrix` on all
  graphics elements to apply transformations.

## [0.4.2] - 2023-04-29

### Added

* Text attribute `letterSpacing`.
* Support for SVG paths in `graphics` using `Path` elements.

## [0.4.1] - 2023-04-15 (not available)

Note: This npm package `pdfmkr@0.4.1` had to be unpublished because of
a build error. Do to npm's policy, the version number cannot be reused.

### Fixed

* Text rise is now reset properly and does not affect subsequent text
  elements anymore.

## [0.4.0] - 2023-03-27

### Breaking changes

* Page margins are now relative to the header and footer to let the
  contents adjust to a dynamic header and footer height.

### Added

* Text attribute `rise` for superscripts and subscripts.
* Block attribute `verticalAlign` for vertical alignment of columns.
* Attribute `lineDash` for graphics shapes.

## [0.3.3] - 2023-03-03

### Fixed

* An error was thrown when rendering a document definition that includes
  a `header` but no `footer`.

## [0.3.2] - 2022-10-12

### Added

* Attribute `customData` to include custom data in the PDF *document catalog*.

## [0.3.1] - 2022-08-25

### Fixed

* PDF now has a trailing newline
* Link annotations are now compatible with PDF/A
* The PDF trailer now has an ID (needed for PDF/A compatibility)

## [0.3.0] - 2022-07-28

### Breaking changes

* Renamed block types `Paragraph` to `TextBlock`, `Image` to `ImageBlock`,
  `Columns` to `ColumnsBlock`, and `Rows` to `RowsBlock`. Added `EmptyBlock` for blocks
  that don't have any content.

### Added

* Graphics shape type `circle`.
* Attributes `lineOpacity` and `fillOpacity` on graphics shapes.
* Attribute `padding` on *all* block types.
* Attributes `breakBefore` and `breakAfter` on top-level blocks.
* Margins and paddings are highlighted when guides are enabled.

### Fixed

* Attribute `imageAlign` marked optional in type definition
* Copied text from a PDF document now includes headers and footers in correct order

## [0.2.0] - 2022-06-08

### Breaking changes

* Attributes `strokeWidth`, `strokeColor` have been renamed to `lineWidth`, `lineColor`.
* Images are horizontally centered by default.
* Text is now vertically aligned in text rows.

### Added

* Attributes `lineCap` and `lineJoin`.
* Support for functions in the `graphics` attribute.
* Attribute `imageAlign` for horizontal alignment.
* Attribute `pageSize` and `pageOrientation`.

### Fixed

* Position of anchors in PDF does not include the padding or paragraphs anymore.

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
[0.4.2]: https://github.com/eclipsesource/pdf-maker/releases/tag/v0.4.0
