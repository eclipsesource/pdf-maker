# Changelog

## [Unreleased]

## [0.3.0]

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
