# PDF Maker

PDF Maker is a library for generating PDF documents in JavaScript.

- Easy to use: contents are defined in plain objects.
- Works anywhere: in the browser, in Node.js, Deno, and Bun.
- TypeScript support: types are included in the npm package.

This project is inspired by [pdfmake] and builds on [pdf-lib] and
[fontkit]. It would not exist without the great work and the profound
knowledge contributed by the authors of those projects.

## Usage

The `makePdf()` function creates PDF data from a given _document
definition_. This definition is a plain object.

### Content

The most important property in the definition is named `content`. This
property accepts a list of _blocks_. There are different types of
blocks, such as text blocks, image blocks, column and row layout blocks.

### Basic Example

```js
const fontData = await readFile('Roboto-Regular.ttf');
const fontDataItalic = await readFile('Roboto-Italic.ttf');

const pdfData = await makePdf({
  // Fonts must be registered (see below)
  fonts: {
    Roboto: [{ data: fontData }, { data: fontDataItalic, italic: true }],
  },
  // Content as an array of blocks
  content: [
    // Blocks can contain text and text properties
    { text: 'Lorem ipsum', fontStyle: 'italic', textAlign: 'center', fontSize: 24 },
    // Text can also be an array of text spans with different properties
    {
      text: [
        'dolor sit amet, consectetur adipiscing elit ',
        { text: 'sed do eiusmod', fontStyle: 'italic' },
        ' tempor, incididunt ut labore et dolore magna aliqua.',
      ],
    },
  ],
});
await writeFile(`hello.pdf`, pdfData);
```

There are more examples in the [examples/](examples/) folder.

### Fonts

All fonts are embedded in the PDF and must be registered with the
`fonts` property. Font data is accepted in `.ttf` or `.otf` format, as
ArrayBuffer or Uint8Array. Each font family can contain different
variants which are selected based on the properties `bold` and `italic`.
The font family that is registered first becomes the default.

```js
const documentDefinition = {
  fonts: {
    'DejaVu-Sans': [
      // Different font versions for fontFamily "DejaVu-Sans"
      // TTF / OTF font data as ArrayBuffer or Uin8Array
      { data: fontDataDejaVuSansNormal },
      { data: fontDataDejaVuSansBold, bold: true },
      { data: fontDataDejaVuSansItalic, italic: true },
      { data: fontDataDejaVuSansBoldItalic, bold: true, italic: true },
    ],
    Roboto: [
      // Different font versions for fontFamily "Roboto"
      { data: fontDataRobotoNormal },
      { data: fontDataRobotoMedium, bold: true },
    ],
  },
  content: [
    { text: 'lorem ipsum', fontFamily: 'Roboto', fontWeight: 'bold' }, // will use Roboto Medium
    { text: 'dolor sit amet' }, // will use DejaVu-Sans (the font registered first), normal
  ],
};
```

### Images

JPG and PNG images are supported. When the same image is used more than
once, the image data is only included once in the PDF. The size of an
image can be confined using the `width` and `height` properties.

```js
// An image block
{ image: 'images/logo.png', width: 200, height: 100 },
```

### Columns

To arrange blocks horizontally, they can be included in a block with a
`columns` property. When columns have a `width` property, it is
respected. The remaining space id distributed evenly across all columns.

```js
{
  columns: [
    { text: 'Column 1', width: 100 }, // 100 pt wide
    { text: 'Column 2' }, // gets half of the remaining width
    { text: 'Column 3' }, // gets half of the remaining width
  ],
}
```

### Rows

A row layout can be used to group multiple rows into a single block,
e.g. to apply common properties or to enclose rows in a surrounding
columns layout.

```js
{
  rows: [
    { text: 'Row 1' },
    { text: 'Row 2' },
    { text: 'Row 3' },
  ],
  textAlign: 'right',
}
```

### Graphics

Each block can have a `graphics` property that accepts a list of shapes
to draw into that block or a function that returns a list of shapes. The
function will be called with the block's width and height. This can be
used to draw shapes that depend on the block's size.

Shapes can be lines, rectangles, circles, or SVG paths. In the following
example, a graphics property is used to draw a yellow background behind
the text and a blue border at the left edge.

```js
{
  text: 'Lorem ipsum',
  graphics: ({ width, height }) => [
    { type: 'rect', x: 0, y: 0, width, height, fillColor: 'yellow' },
    { type: 'line', x1: 0, y1: 0, x2: 0, y2: height, lineColor: 'blue', lineWidth: 2 },
  ],
  padding: { left: 5 },
}
```

Also see the [graphics example](examples/src/graphics.js).

### Margin and padding

The `margin` property can be used to add space around blocks. It
accepts either a single value (applies to all four edges) an object with
any of the properties `top`, `right`, `bottom`, `left`, `x`, and `y`.
The properties `x` and `y` can be used as shorthands to set both `left`
and `right` or `top` and `bottom` at the same time. Values can be given
as numbers (in pt) or as strings with a unit. If a string is given, it
must contain one of the units `pt`, `in`, `mm`, or `cm`;

```js
{
  margin: { x: 5, top: 10 },
  content: [
    { text: 'Lorem ipsum' },
    { text: 'dolor sit amet' },
  ],
}
```

The `top` and `bottom` margins of adjacent blocks
are collapsed into a single margin whose size is the maximum of the two
margins. Column margins don't collapse.

The `padding` property can be used to add space between the content and
the edges of blocks.

### Page layout

The top-level `pageSize` property can be used to set the page size.
Various standard sizes are supported, such as `A4`, `Letter`, and
`Legal`. The default is A4. A custom page size can be specified as an
object with the properties `width` and `height`. Values can be given as
numbers (in pt) or as strings with a unit.

```js
{
  pageSize: { width: '20cm', height: '20cm' }
}
```

The `pageOrientation` property can be used to set the page orientation.
The value can be either `portrait` or `landscape`. The default is
portrait.

```js
{
  pageSize: 'A5',
  pageOrientation: 'landscape',
  content: [
    { text: 'Lorem ipsum' },
    { text: 'dolor sit amet' },
  ],
}
```

### Headers and footers

Headers and footers that repeat on each page can be defined using the
optional `header` and `footer` properties. Both accept either a single
block or a function that returns a block. The function will be called
with the page number and the total number of pages. The page number
starts at 1.

```js
{
  footer: ({ pageNumber, pageCount }) => ({
    text: `Page ${pageNumber} of ${pageCount}`,
    textAlign: 'right',
    margin: { x: '20mm', bottom: '1cm' },
  }),
  content: [
    { text: 'Lorem ipsum' },
    { text: 'dolor sit amet' },
  ],
}
```

### Page breaks

Page breaks are included automatically. When a block does not fit on the
current page, a new page is added to the document. To insert a page
break before or after a block, set the `breakBefore` or `breakAfter`
property of a block to `always`. To prevent a page break, set this
property to `avoid`.

Page breaks are also automatically inserted between the lines of a text
block. To prevent a page break within a text block, set the
`breakInside` property to `avoid`.

```js
{
  content: [
    { text: 'Lorem ipsum' },
    { text: 'This text will go on a new page', breakBefore: 'always' },
  ],
}
```

## Documentation

While there is no generated documentation yet, you can refer to the
[api](src/api) folder for a specification of all supported properties in
a document definition.

Also check out the examples in the [examples/](examples/) folder.

## License

[MIT](LICENSE.txt)

[pdfmake]: https://github.com/bpampuch/pdfmake
[pdf-lib]: https://github.com/Hopding/pdf-lib
[fontkit]: https://github.com/Hopding/fontkit
