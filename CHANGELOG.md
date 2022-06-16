# Changelog

## [Unreleased]

### Added

* Attributes `lineOpacity` and `fillOpacity` on graphics shapes.

### Fixed

* Attribute `imageAlign` marked optional in type definition

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
