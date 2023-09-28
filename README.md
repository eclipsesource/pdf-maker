# PDF Maker

PDF Maker is a library for generating PDF documents in JavaScript.

- Easy to use: document contents are defined in plain objects.
- Works anywhere: Browser, Node.js, Deno.
- TypeScript support: types included in the npm package.

This project is heavily inspired by [pdfmake] and builds on [pdf-lib] and [fontkit].
It would not exist without the great work and the profound knowledge contributed by the authors of
these projects.

## Usage

The function `makePdf()` creates PDF data from a given [document definition](src/content.ts).

### Basic Example

```js
const fontData = await readFile('Roboto-Regular.ttf');
const fontDataBold = await readFile('Roboto-Medium.ttf');
const pdfData = await makePdf({
  // Fonts must be registered (see below)
  fonts: {
    Roboto: [{ data: fontData }, { data: fontDataBold, bold: true }],
  },
  // Page margins (`x` is a shorthand for left and right)
  margin: { x: '2.5cm', top: '2cm', bottom: '1.5cm' },
  // Content as an array of blocks
  content: [
    // Blocks can contain text and text attributes
    { text: 'Lorem ipsum', bold: true, textAlign: 'center', fontSize: 24 },
    // Text can also be an array of text ranges with different attributes
    {
      text: [
        'dolor sit amet, consectetur adipiscing elit ',
        { text: 'sed do eiusmod', italic: true },
        ' tempor, incididunt ut labore et dolore magna aliqua.',
      ],
    },
  ],
});
await writeFile(`hello.pdf`, pdfData);
```

### Fonts

All fonts are embedded in the PDF and need to be registered with the `fonts` attribute.
Font data is accepted in `.ttf` or `.otf` format, as ArrayBuffer, Uint8Array, or base64-encoded
string.
Each font family can include different variants that are selected based on the attributes `bold` and
`italic`.

```js
const documentDefinition = {
  fonts: {
    // The `fontFamily` name of the font
    'DejaVu-Sans': [
      // TTF / OTF font data as Uin8Array or base64 encoded string
      { data: fontDataDejaVuSansNormal },
      { data: fontDataDejaVuSansBold, bold: true },
      { data: fontDataDejaVuSansItalic, italic: true },
      { data: fontDataDejaVuSansBoldItalic, bold: true, italic: true },
    ],
    Roboto: [{ data: fontDataRobotoNormal }, { data: fontDataRobotoMedium, bold: true }],
  },
  content: [
    { text: 'lorem ipsum', fontFamily: 'Roboto', bold: true }, // will use Roboto Medium
    { text: 'dolor sit amet' }, // will use DejaVu-Sans (the font registered first), normal
  ],
};
```

### Images

JPG images are supported. All images need to be registered with the `images` attribute.
Images can be used more than once in the document without multiplying the image's footprint in the
created PDF.
The size of an image can be confined using the `width` and `height` attributes.

```js
const documentDefinition = {
  images: {
    'logo': { data: imageData }
    …
  },
  content: [
    { image: 'logo', width: 200, height: 100 },
    …
  ]
};
```

### Content

The `content` attribute of the document definition accepts an array of top-level _blocks_ that can
be text blocks, image blocks, column or row layout blocks.
Page breaks will only occur between top-level blocks.

### Columns

To arrange blocks horizontally, they can be included in a block with a `columns` attribute.
When columns have a `width` attribute, it will be respected.
The remaining space will be distributed evenly across all columns.

```js
{
  columns: [
    {text: 'Column 1', width: 100}, // 100 pt wide
    {text: 'Column 2'}, // gets half of the remaining width
    {text: 'Column 3'}, // gets half of the remaining width
  ],
}
```

### Rows

A rows layout can be used to group multiple rows in a single block, e.g. to apply common attributes
to them or to include them in a surrounding columns layout.

```js
{
  rows: [
    {text: 'Row 1'},
    {text: 'Row 2'},
    {text: 'Row 3'},
  ],
  textAlign: 'right',
}
```

## Documentation

There is no generated documentation yet, please refer to [content.ts](src/content.ts) for an
overview and specification of all supported attributes in a document definition.

## Example

A more extensive example is included in the [examples/](examples/) folder.

Run `npm start` to generate a PDF in the `out/` folder on every change of this file.

## License

[MIT](LICENSE.txt)

[pdfmake]: https://github.com/bpampuch/pdfmake
[pdf-lib]: https://github.com/Hopding/pdf-lib
[fontkit]: https://github.com/Hopding/fontkit
