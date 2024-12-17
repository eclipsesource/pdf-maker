# PDF Maker

PDF Maker is a library for generating PDF documents in JavaScript.

## Usage

```sh
npm install pdf-maker
```

A `PdfMaker` instance creates PDF data from a given _document
definition_.

```ts
// Define the contents of the document
const doc = {
  content: [text('Hello World!')],
};

// create an instance of PdfMaker and register fonts
const pdfMaker = new PdfMaker();
pdfMaker.registerFont(await readFile('path/to/Roboto-Regular.ttf'));

// create a PDF from the document
const pdfData = await pdfMaker.makePdf(doc);
await writeFile(`hello.pdf`, pdfData);
```

## Fonts

Fonts need to be registered before they can be used in a document. The
`registerFont()` method accepts font data in `TTF` or `OTF` format.
Fonts will be selected based on their font family, font style, and font
weight. This information is extracted from the font by `registerFont()`,
it but can also be provided as a second parameter if needed.

```ts
pdfMaker.registerFont(await readFile('path/to/Roboto-Regular.ttf'));
pdfMaker.registerFont(await readFile('path/to/Roboto-Italic.ttf'));
...

const doc = {
  // Define the default font
  defaultStyle: { fontFamily: 'Roboto', fontSize: 12 },
  content: [
    // This block will use the Roboto-Regular font
    text('Hello World!')
    // This block will use the Roboto-Italic font
    text('Hello World!', { fontStyle: 'italic' })
  ],
};
```

If no font family is specified in the document, the first
matching font will be used.

## Content

The content of a document is composed of _blocks_. There are different
types of blocks, such as text blocks, image blocks, column and row
layout blocks. The `content` property of the document definition accepts
a list of blocks.

### Text

Text blocks can be created using the `text()` function. Besides the
text to display, this function accepts [block](#block-properties) and
[text](#text-properties) properties.

```ts
const block = text('Lorem ipsum', { fontStyle: 'italic', fontSize: 12 });
```

#### Text spans

The text property can be a single string or an array of strings or text
spans. A text span is an inline stretch of text with a specific style,
such as an emphasized word or a link. Text spans can be created using
the `span()` function. Text spans support [text
properties](#text-properties).

```ts
const block = text([
  'This is some text with an ',
  span('emphasized text span', { fontStyle: 'italic' }),
  ' in the middle.',
]);
```

This block will result in the following text:

> This is some text with an _emphasized text span_ in the middle.

Text spans can also be nested:

```ts
span(['This is ', span('super', { fontWeight: 'bold' }), ' important'], { fontStyle: 'italic' });
```

> _This is **super** important._

For convenience, the functions `bold()` and `italic()` can be used to
create bold and italic text spans:

```ts
italic(['This is ', bold('super'), ' important']);
```

#### Line breaks

Line breaks are inserted automatically at word boundaries. Explicit
line breaks can be inserted as line feed characters (`\n`):

```ts
text('Explicit line\nbreaks are\nsupported.');
```

#### Subscripts and superscripts

Subscripts and superscripts can be created using the `span()` function
with the `rise` property. This property does not affect the line height.

```ts
text(['H', span('₂', { rise: -3 }), 'O']);
text(['10', span('⁻³', { rise: 3 }), '.']);
```

#### Links

Text spans can also be used to create links to external URLs or to
[anchors](#anchors) in the document.

```ts
span('example.com', { link: 'https://example.com', color: 'blue' });
```

#### Text alignment

Text alignment can be set using the `textAlign` property. The value can
be `left`, `center`, or `right`. The default is `left`.

```ts
text('Centered text', { textAlign: 'center' });
```

The text alignment can be defined for an entire block and is propagated
to all children in the block. Children can override the alignment.

```ts
rows(
  [
    text("I'm centered."),
    text("I'm centered."),
    text("I'm not!", { textAlign: 'left' }),
  ],
  { textAlign: 'center' },
),
```

#### Text properties

Text properties can be set for an entire text block or for individual
text spans. The following text properties are supported:

- `fontFamily`: The font family to use.
- `fontStyle`: The font style. Can be `normal`, `italic`, or `bold`.
- `fontWeight`: The font weight. Can be a number between `100` and
  `900`. The literal values `normal` and `bold` are also supported.
- `fontSize`: The font size in pt.
- `lineHeight`: The line height as a multiple of the font size (default:
  `1.2`).
- `color`: The text [color](#colors).
- `link`: Renders the text as a link to the given target. Can be a URL
  or an [anchor](#anchors) reference.
- `rise`: Vertical offset in pt for baseline shifts. Positive values
  shift the baseline up, negative values shift it down.
- `letterSpacing`: The character spacing in pt. Positive values increase
  the space between characters, negative values decrease it.

### Images

Images can be included in image blocks, which can be created using the
`image()` function. This function accepts the image URL and an optional
object containing [image](#image-properties) and
[block](#block-properties) properties. Images are supported in JPG and
PNG format. URLs can be `data:`, `http:`, `https:`, or `file:` URLs. The
size of an image can be confined using the `width` and `height`
properties.

```ts
const block = image('file:/images/logo.png', { width: 200, height: 100 });
```

When the same image URL is used multiple times in the document, the
image data is embedded in the PDF only once.

#### Image properties

- `imageAlign`: Aligns the image within the block. The alignment of the
  image within the block. Supported values are `left`, `center`, and
  `right`. The default is `center`.

### Graphics

Each block can have a `graphics` property that accepts a list of
_shapes_ to draw into that block. Alternatively, this property accepts a
function that returns a list of shapes. The function will be called with
the block's width and height. This can be used to draw shapes that
depend on the block's size. The coordinate system for graphics shapes
starts at the top left corner of the block.

Shapes can be lines, rectangles, circles, or SVG paths. They can be
created using the `line()`, `rect()`, `circle()`, and `path()`
functions.

In the following example, the `graphics` property is used to draw a
yellow background behind the text and a blue border at the left edge.

```ts
text('Lorem ipsum', {
  graphics: ({ width, height }) => [
    rect(0, 0, width, height, { fillColor: 'yellow' }),
    line(0, 0, 0, height, { lineColor: 'blue', lineWidth: 2 }),
  ],
  padding: { left: 5 },
});
```

#### Lines

Lines are defined by the coordinates of the start and end points of the
line. They support [stroke](#stroke-properties) and
[transform](#transform-properties) properties.

```ts
line(10, 20, 90, 20, { lineColor: 'blue', lineWidth: 2 });
```

#### Rectangles

Rectangles are defined by the coordinates of the top-left corner, the
width, and height of the rectangle. They support
[stroke](#stroke-properties), [fill](#fill-properties), and
[transform](#transform-properties) properties.

```ts
rect(10, 20, 50, 25, { lineColor: '#4488cc', lineJoin: 'round' });
```

#### Circles

Circles are defined by the coordinates of the center and the radius of
the circle. They support [stroke](#stroke-properties),
[fill](#fill-properties), and [transform](#transform-properties)
properties.

```ts
circle(cx, cy, 20, { fillColor: 'red' });
```

#### Paths

Paths allow to create arbitrary shapes using a series of drawing
commands. These commands are accepted in the format of an SVG path data
string (see
[MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d) for
details). Paths support [stroke](#stroke-properties),
[fill](#fill-properties), and [transform](#transform-properties)
properties.

```ts
path('M45,0 L15,94 L90,34 L0,34 L75,94 Z', {
  fillColor: '#4488cc',
  translate: { x: 100 },
});
```

#### Stroke properties

Stroke properties define the appearance of stroked lines. The following
stroke properties are supported:

- `lineWidth`: The width of stroked lines in pt.
- `lineColor`: The [color](#colors) of stroked lines.
- `lineOpacity`: The opacity of stroked lines as a number between `0`
  and `1`.
- `lineCap`: The shape at the end of open paths when they are
  stroked.
  - `butt`: indicates that the stroke for each subpath does not extend
    beyond its two endpoints. On a zero length subpath, the path will
    not be rendered at all.
  - `round`: indicates that at the end of each subpath the stroke will
    be extended by a half circle with a diameter equal to the stroke
    width. On a zero length subpath, the stroke consists of a full
    circle centered at the subpath's point.
  - `square`: indicates that at the end of each subpath the stroke will
    be extended by a rectangle with a width equal to half the width of
    the stroke and a height equal to the width of the stroke. On a zero
    length subpath, the stroke consists of a square with its width equal
    to the stroke width, centered at the subpath's point.
- `lineJoin`: The shape to be used at the corners of paths or
  basic shapes when they are stroked.
  - `miter`: indicates that the outer edges of the strokes for the two
    segments should be extended until they meet at an angle, as in a
    picture frame.
  - `round`: indicates that the outer edges of the strokes for the two
    segments should be rounded off by a circular arc with a radius equal
    to half the line width.
  - `bevel`: indicates that the two segments should be finished with
    butt caps and the resulting notch should be filled with a triangle.
- `lineDash` (`number[]`): The dash pattern to use for drawing paths. Each
  element defines the length of a dash or a gap, in pt, starting with
  the first dash. If the array contains an odd number of elements, then
  the elements are repeated to yield an even number of elements. An
  empty array stands for no dash pattern, i.e. a continuous line.

#### Fill properties

Fill properties define the appearance of the areas enclosed by paths or
basic shapes. The following fill properties are supported:

- `fillColor`: The [color](#colors) to use for filling the shape.
- `fillOpacity`: The opacity to use for filling the shape as number
  between `0` and `1`.

#### Transform properties

Transform properties can be used to move, resize, rotate, or transform
shapes in other ways. The following transform properties are supported:

- `translate` (`{ x: number, y: number }`): Moves the shape by `x` and
  `y` pt.
- `scale` (`{ x: number, y: number }`): Stretches the shape by `x` and
  `y` pt.
- `rotate` (`{ angle: number, cx?: number, cy?: number }`): Rotates the
  shape by `angle` degrees clockwise about the point `[cx,cy]`. If `cx`
  and `cy` are omitted, the rotation is about the origin of the
  coordinate system.
- `skew` (`{ x: number, y: number }`): Skews the shape by `x` degrees
  along the x axis and by `y` degrees along the y axis.
- `matrix` (`number[]`): Applies a custom transformation matrix to the
  shape. The matrix is given as an array of six values `[a, b, c, d, e,
f]` that represent the transformation matrix:
  ```
  | a c e |
  | b d f |
  | 0 0 1 |
  ```

### Colors

Colors can be specified in the format `#rrggbb` where `rr`, `gg`, and
`bb` are the red, green, and blue components respectively, in
hexadecimal notation.

In addition, the named colors `black`, `gray`, `white`, `red`, `blue`,
`green`, `cyan`, `magenta`, `yellow`, `lightgray`, `darkgray` are
supported.

## Layout

### Columns

To arrange blocks horizontally, they can be included in a _columns_
block. The width of each column can be set using the `width` property.
When the width is set to `auto`, the column will shrink to the width of
its content. The remaining space is distributed evenly across all
columns that don't have a fixed width.

Column blocks can be created using the `columns()` function, which takes
an array of blocks and an optional object with
[block](#block-properties) and [text](#text-properties) properties. Text
properties will be inherited by included text blocks.

```ts
const block = columns([
  text('Column 1', { width: 100 }), // 100 pt wide
  text('Column 2'), // gets half of the remaining width
  text('Column 3'), // gets half of the remaining width
]);
```

### Rows

To arrange blocks vertically, they can be included in a _rows_ block.
This can be useful to group multiple rows into a single block, e.g. to
apply common properties or to enclose rows in a surrounding columns
layout.

Row blocks can be created using the `rows()` function, which takes an
array of blocks and an optional object with
[block](#block-properties) and [text](#text-properties) properties. Text
properties will be inherited by included text blocks.

```ts
const block = rows(
  [text('Row 1'), text('Row 2'), text('Row 3')],
  { margin: 10, fontSize: 18 }, // fontSize is applied to all rows
);
```

### Margin

The `margin` property can be used to add space around blocks. It
accepts either a single value (applies to all four edges) an object with
any of the properties `top`, `right`, `bottom`, `left`, `x`, and `y`.
The properties `x` and `y` can be used as shorthands to set both `left`
and `right`, or `top` and `bottom`, respectively. Values can be given
as numbers (in pt) or as strings with a unit. If a string is given, it
must contain one of the units `pt`, `in`, `mm`, or `cm`;

```ts
text('Lorem ipsum', { margin: 5 }); // 5 pt margin on all sides
```

```ts
text('Lorem ipsum', { margin: { y: '5cm' } }); // 5 cm top and bottom margin
```

The `top` and `bottom` margins of adjacent blocks
are collapsed into a single margin whose size is the maximum of the two
margins. Column margins don't collapse.

```ts
rows([
  text('Lorem ipsum', { margin: { y: 5 } }),
  // only 5 pt margin between the two blocks
  text('dolor sit amet', { margin: { y: 5 } }),
]);
```

### Padding

The `padding` property can be used to add space between the content and
the edges of blocks. It accepts the same values as the `margin`
property.

```ts
text('Lorem ipsum', { padding: { x: '5pt', y: '2pt' });
```

#### Block properties

The following properties can be set for all types of blocks:

- `padding`: Space to leave between the content and the edges of the
  block.
- `margin`: Space to surround the block.
- `width`: The width of the block. If this property is set to `auto`,
  the block will use the width of the widest element in the block.
- `height`: The height of the block. If this property is not set, the
  height of the block is defined by its content.
- `verticalAlign`: Aligns the block vertically within a columns block.
  Supported values are `top`, `middle`, and `bottom`. By default, blocks
  are top-aligned.
- `id`: An optional _unique_ id for the element that can be used as an
  [anchor](#anchors).
- `graphics`: A list of [graphic](#graphics) elements to draw in the
  area covered by the block. A function can be passed to take the final
  size of the block into account.
- `breakBefore`: Controls whether a page break may occur before the
  block.
  - `auto` (default): Insert a page break when needed.
  - `always`: Always insert a page break before this block.
  - `avoid`: Do not insert a page break before this block if it can be
    avoided.
- `breakAfter`: Controls whether a page break may occur after the block.
  - `auto` (default): Insert a page break when needed.
  - `always`: Always insert a page break after this block.
  - `avoid`: Do not insert a page break after this block if it can be avoided.

## Page layout

### Page size

The top-level `pageSize` property can be used to set the page size.
Various standard sizes are supported, such as `A4`, `Letter`, and
`Legal`. The default is A4. A custom page size can be specified as an
object with the properties `width` and `height`. Values can be given as
numbers (in pt) or as strings with a unit.

```ts
const document = {
  pageSize: { width: '20cm', height: '20cm' }
  content: [text('Lorem ipsum')],
};
```

### Page orientation

The `pageOrientation` property can be used to set the page orientation.
The value can be either `portrait` or `landscape`. The default is
portrait.

```ts
const document = {
  pageSize: 'A5',
  pageOrientation: 'landscape',
  content: [text('Lorem ipsum')],
};
```

### Headers and footers

Headers and footers that repeat on each page can be defined using the
optional `header` and `footer` properties. Both accept either a single
block or a function that returns a block. The function will be called
with the page number and the total number of pages. The page number
starts at 1.

```ts
const document = {
  footer: ({ pageNumber, pageCount }) =>
    text(`Page ${pageNumber} of ${pageCount}`, {
      textAlign: 'right',
      margin: { x: '20mm', bottom: '7mm' },
    }),
  content: [text('Lorem ipsum'), text('dolor sit amet')],
};
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

```ts
const document = {
  content: [
    text('Lorem ipsum'),
    text('This text will go on a new page', { breakBefore: 'always' }),
  ],
};
```

## Anchors

Anchors can be used to create links to other locations in the document.
An anchor is created by setting a unique `id` property to the block that
should be the target of the link:

```ts
text('Section Two', { id: 'section2' });
```

An internal reference to this anchor can be created by setting the
`link` property of a text span to a hash sign (`#`), followed by the
`id` of the target block:

```ts
text([
  'See ',
  span('Section Two', { link: '#section2' }), // Link to a section
  ' for more information.'
]);
...
```

## Metadata

PDF documents can include metadata such as the title, author, subject,
and keywords. This information can be set using the `info` property of
the document.

```ts
const document = {
  info: {
    title: 'Invoice Dec 2024',
    author: 'John Doe',
  },
  content: [text('Hello World!')],
};
```

The following properties are supported:

- `title`: The document’s title.
- `author`: The name of the person who created the document.
- `subject`: The subject of the document.
- `keywords`: Keywords associated with the document.
- `creationDate`: The date and time the document was created. If not
  set, the current time is used.
- `modificationDate`: The date and time the document was last modified.
  If not set, the current time is used.
- `creator`: The name of the application that created the original
  content.
- `producer`: The name of the application that converted the original
  content into a PDF.

## Dev tools

### Visual Debugging

This feature can be used to visually inspect the structure and layout of
blocks in the PDF document during development. When enabled, it includes
some visual guides in the generated PDF:

- Each block is rendered with a gray border to indicate its bounds.
- Page headers and footers are separated from the page content by a
  horizontal line.
- Each line of text is surrounded by a thin green border. Another thin
  green line indicates the text baseline.
- Margins and paddings get a semi-transparent overlay. Margins are shown
  in yellow, paddings in purple. Overlapping margins will
  result in a darker shade of yellow.

To enable visual debugging, set the `dev.guides` property in the
document to `true`:

```ts
const document = {
  dev: { guides: true }, // Enable visual debugging
  content: [
    text('Hello World!'),
  ],
  ...
};
```

## License

[MIT](LICENSE.txt)

## Thanks

This project is inspired by [pdfmake] and builds on [pdf-lib] and
[fontkit]. It would not exist without the great work and the profound
knowledge contributed by the authors of those projects.

[pdfmake]: https://github.com/bpampuch/pdfmake
[pdf-lib]: https://github.com/Hopding/pdf-lib
[fontkit]: https://github.com/Hopding/fontkit
