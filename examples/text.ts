import type { Block, DocumentDefinition, TextBlock, TextSpan } from '../src/index.ts';
import { columns, italic, line, rect, rows, span, text } from '../src/index.ts';
import {
  bodyStyle,
  caption,
  colors,
  columnHeader,
  createPdfMaker,
  heading,
  label,
  pageFooter,
  pageHeader,
  pageMargin,
  title,
  writePdf,
} from './common/style.ts';

const paragraph = (content: string | (string | TextSpan)[]) => text(content, { margin: { y: 6 } });

// A labeled box with a thin border that makes the available line width visible
const sampleBox = (title: string, content: Block[]) =>
  rows(
    [
      caption(title, { margin: { bottom: 3 } }),
      rows(content, {
        padding: 5,
        graphics: ({ width, height }) => [rect(0, 0, width, height, { lineColor: colors.rule })],
      }),
    ],
    { margin: { x: 4 } },
  );

// A row that explains a line break rule next to a narrow box that demonstrates it
const breakRow = (title: string, explanation: string, sample: string) =>
  columns(
    [
      rows([caption(title), text(explanation, { fontSize: 11 })], { margin: { right: 20 } }),
      text(sample, {
        width: 110,
        padding: 5,
        fontSize: 11,
        verticalAlign: 'middle',
        graphics: ({ width, height }) => [rect(0, 0, width, height, { lineColor: colors.rule })],
      }),
    ],
    { margin: { y: 6 } },
  );

// A table row that shows the same sample with a font feature turned off and on
const featureRow = (title: string, off: TextBlock, on: TextBlock) =>
  columns(
    [label(title, { width: 110, margin: { top: 3 } }), { ...off, margin: { right: 10 } }, on],
    {
      padding: { y: 3 },
      graphics: ({ width }) => [line(0, 0, width, 0, { lineColor: colors.rule, lineWidth: 0.5 })],
    },
  );

const tableHeader = (left: string, right: string) =>
  columns([text('', { width: 110 }), columnHeader(left), columnHeader(right)], {
    margin: { bottom: 2 },
  });

const document: DocumentDefinition = {
  margin: pageMargin,
  defaultStyle: bodyStyle,
  header: pageHeader('Text and Typography'),
  footer: pageFooter,
  content: [
    title('Text and Typography'),
    paragraph([
      'A text block contains a plain string or a list of ',
      italic('spans'),
      '. Each span can carry its own style, so a paragraph can mix different sizes, weights, ' +
        'and colors. Text is shaped with the OpenType features of the font and broken into ' +
        'lines that fit the available width.',
    ]),

    heading('Inline styles'),
    paragraph([
      'A span can change the ',
      // A smaller line height keeps the larger text from pushing the line down, so the
      // spacing to the heading above stays the same
      span('font size', { fontSize: 15, lineHeight: 0.68 }),
      ', the ',
      span('weight', { fontWeight: 'bold' }),
      ' or the ',
      span('style', { fontStyle: 'italic' }),
      ' of a few words. It can give them a ',
      span('color', { color: colors.accent }),
      ',',
      span(' space out', { letterSpacing: 1.2 }),
      ' their letters, or move them ',
      span('up', { rise: 3 }),
      ' and ',
      span('down', { rise: -3 }),
      ' from the baseline. A span can also be a link, such as this one to ',
      span('example.com', { link: 'https://example.com', color: colors.link }),
      '.',
    ]),

    rows(
      [
        heading('Line height'),
        paragraph(
          'The line height is a factor of the natural line height of the font, which is defined ' +
            'by its vertical metrics. Unlike in CSS, the factor does not refer to the font size, ' +
            'so 1 is a good default for any font. This document uses 1.05.',
        ),
        columns(
          ['0.9', '1.0', '1.2'].map((lineHeight) =>
            sampleBox(lineHeight, [
              text(
                'The quick brown fox jumps over the lazy dog. ' +
                  'Pack my box with five dozen liquor jugs.',
                { lineHeight: parseFloat(lineHeight) },
              ),
            ]),
          ),
          { fontSize: 11, margin: { x: -4, y: 6 } },
        ),
      ],
      { breakInside: 'avoid' },
    ),

    heading('Line breaking'),
    paragraph(
      'Lines break between words and after hyphens. Special characters give control over ' +
        'line breaks where these rules are not enough. The boxes on the right show the ' +
        'available width.',
    ),
    breakRow(
      'Hyphens',
      'A line can break after the hyphen in a compound word.',
      'A well-known, state-of-the-art approach.',
    ),
    breakRow(
      'Soft hyphens',
      'A soft hyphen (U+00AD) marks where a word may be hyphenated. ' +
        'It is only visible when the line breaks there.',
      'Donau\u00addampf\u00adschiff\u00adfahrts\u00adgesellschaft',
    ),
    breakRow(
      'Zero-width spaces',
      'A zero-width space (U+200B) allows a line break without adding visible space, ' +
        'for example in a long URL.',
      'example.com/\u200bvery/\u200blong/\u200bpath',
    ),
    breakRow(
      'No-break spaces',
      'A no-break space (U+00A0) prevents a line break, for example between a number ' +
        'and its unit.',
      'Delivered within 10\u00a0days',
    ),
    breakRow(
      'Line feeds',
      'A line feed (U+000A) forces a line break.',
      'First line,\nsecond line.',
    ),

    heading('Alignment'),
    paragraph('Text can be aligned to the left, centered, or aligned to the right.'),
    columns(
      (
        [
          ['Left', 'left'],
          ['Centered', 'center'],
          ['Right', 'right'],
        ] as const
      ).map(([title, textAlign]) =>
        sampleBox(title, [text('The quick brown fox jumps over the lazy dog.', { textAlign })]),
      ),
      { fontSize: 11, margin: { x: -4, y: 6 } },
    ),

    // Keep the section together so that the table is not separated from its heading
    rows(
      [
        heading('OpenType features'),
        paragraph(
          'Kerning and standard ligatures are applied by default. Other features of the font ' +
            'can be enabled where they are needed.',
        ),
        rows(
          [
            tableHeader('Off', 'On'),
            featureRow(
              'Kerning',
              text('AVATAR, Today, Yes', { fontKerning: 'none' }),
              text('AVATAR, Today, Yes'),
            ),
            featureRow(
              'Ligatures',
              text('fit, flow, office', { fontVariantLigatures: 'none' }),
              text('fit, flow, office'),
            ),
            featureRow(
              'Old-style figures',
              text('In 1984, 2,736 people'),
              text('In 1984, 2,736 people', { fontFeatureSettings: { onum: true } }),
            ),
            featureRow(
              'Small capitals',
              text('Small Capitals'),
              text('Small Capitals', { fontFeatureSettings: { smcp: true } }),
            ),
            featureRow(
              'Fractions',
              text('1/2, 3/4, 7/8'),
              text('1/2, 3/4, 7/8', { fontFeatureSettings: { frac: true } }),
            ),
            // Features can also be applied to single characters
            featureRow(
              'Superscripts',
              text('E = mc2, the 3rd'),
              text([
                'E = mc',
                span('2', { fontFeatureSettings: { sups: true } }),
                ', the 3',
                span('rd', { fontFeatureSettings: { sups: true } }),
              ]),
            ),
          ],
          { margin: { y: 12 } },
        ),
        paragraph(
          'Superscript glyphs are designed to match the weight of the surrounding text. ' +
            'Text moved with rise, as shown above, keeps its full size. ' +
            'Neither changes the line height.',
        ),
      ],
      { breakInside: 'avoid' },
    ),

    rows(
      [
        heading('Language'),
        paragraph(
          'The language of a text can be set on the document, a block, or a span. It is ' +
            'written to the PDF for accessibility and selects language-specific letter forms ' +
            'if the font provides them.',
        ),
        rows(
          [
            tableHeader('Off', 'On'),
            featureRow('Serbian', text('бгдпт'), text('бгдпт', { language: 'sr' })),
            // In Turkish, "fi" is not joined, and the small capital i keeps its dot
            featureRow(
              'Turkish',
              text('fikir, iki', { fontFeatureSettings: { smcp: true } }),
              text('fikir, iki', { fontFeatureSettings: { smcp: true }, language: 'tr' }),
            ),
          ],
          { margin: { y: 6 } },
        ),
      ],
      { breakInside: 'avoid' },
    ),

    rows(
      [
        heading('Fonts'),
        paragraph(
          'Fonts are registered with their family, style, and weight, which are read from the ' +
            'font data. Text selects a font by these properties. When there is no exact match, ' +
            'the closest font is used, following the same rules as CSS.',
        ),
        paragraph([
          'This document registers EB Garamond in regular and bold, and Source Sans 3 in ' +
            'regular and semibold. Therefore, ',
          span('weight 500 falls back to regular', { fontWeight: 500 }),
          ', while ',
          span('weight 600 falls back to bold', { fontWeight: 600 }),
          '.',
        ]),
      ],
      { breakInside: 'avoid' },
    ),
  ],
};

const pdfMaker = await createPdfMaker();
await writePdf('text', await pdfMaker.makePdf(document));
