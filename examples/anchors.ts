import type { DocumentDefinition } from '../src/index.ts';
import { rows, text } from '../src/index.ts';
import {
  bodyStyle,
  createPdfMaker,
  heading,
  pageFooter,
  pageHeader,
  pageMargin,
  title,
  writePdf,
} from './common/style.ts';

const loremIpsum =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
  ' incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud' +
  ' exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure' +
  ' dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' +
  ' Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt ' +
  'mollit anim id est laborum.';

const def: DocumentDefinition = {
  margin: pageMargin,
  defaultStyle: bodyStyle,
  header: pageHeader('Anchors'),
  footer: pageFooter,
  content: [
    rows(
      [
        title('Contents'),
        ...range(9).map((n) =>
          text(`Paragraph ${n + 1}`, {
            // Link to the paragraph with given id
            link: `#par:${n + 1}`,
          }),
        ),
      ],
      { margin: { bottom: 10 } },
    ),
    ...range(9).map((n) =>
      rows([heading(`Paragraph ${n + 1}`), text(loremIpsum)], {
        // Create an anchor with given id
        id: `par:${n + 1}`,
      }),
    ),
  ],
};

function range(n: number) {
  return [...Array(n).keys()];
}

const pdfMaker = await createPdfMaker();
await writePdf('anchors', await pdfMaker.makePdf(def));
