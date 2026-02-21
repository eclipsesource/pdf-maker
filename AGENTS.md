# AGENTS.md

## Overview

**pdf-maker** (`pdfmkr` on npm) is a TypeScript library for generating PDF
documents from plain JavaScript/TypeScript objects. Users describe a document
as a definition object (page size, margins, headers/footers, content blocks)
and the library produces a `Uint8Array` containing a valid PDF.

The only runtime dependency is `@ralfstx/pdf-core`, which provides low-level
PDF primitives (fonts, images, pages, content streams). Everything else --
layout, text shaping, graphics, SVG paths -- is implemented in this library.

## Project Setup

- **Language:** TypeScript (strict mode), ES modules
- **Target:** ES2022, browser-compatible (no Node-specific APIs except behind
  a dynamic import guard)
- **Build:** `tsc` for declarations, `esbuild` for the single-file ESM bundle
  in `dist/`
- **Test:** `vitest` -- tests live next to source files as `*.test.ts`
- **Lint:** ESLint (flat config) + Prettier
- **Run tests:** `npm test`
- **Run lint:** `npm run lint`
- **Format code:** `npm run format`

## Architecture

The library follows a three-phase pipeline, orchestrated by `PdfMaker.makePdf()`:

```
DocumentDefinition (user input)
        |
   1. READ   -- validate & normalize      src/read/
        |
   Internal types (Block, TextSpan, Shape, ...)
        |
   2. LAYOUT -- measure & position        src/layout/
        |
   Frame tree with RenderObjects
        |
   3. RENDER -- emit PDF operators         src/render/
        |
   Uint8Array (PDF bytes)
```

### Source Directory Structure

- `src/api/` -- Public API: types and factory functions exported to users.
  This includes `PdfMaker` (the main class),
  `DocumentDefinition`, block types (`TextBlock`,
  `ImageBlock`, `ColumnsBlock`, `RowsBlock`), text/graphics
  types, and convenience helpers like `text()`, `bold()`,
  `rect()`.
- `src/read/` -- Phase 1: input validation and normalization.
- `src/layout/` -- Phase 2: layout engine.
- `src/render/` -- Phase 3: PDF generation.
- `src/util/` -- Small helpers (type validation, base64, etc.).
- `src/*.ts` -- Shared internal types and modules used across phases
  (Frame, Page, Box, FontStore, text processing, colors,
  image loading, SVG path parsing).

### Phase 1: Read

The read phase validates every field of the user-supplied
`DocumentDefinition` and transforms it into strict internal types. Key
behaviors:

- **Type validation** uses a custom combinator system in `src/util/types.ts`
  (`optional()`, `required()`, `dynamic()`, `types.string()`, etc.). Every
  invalid value produces a `TypeError` with a path-based message like
  `Invalid value for "content/0/fontSize": ...`.
- **Text normalization**: Nested text spans are flattened into a flat
  `TextSpan[]` array. Each span carries its own resolved `TextAttrs` (font
  family, size, color, etc.).
- **Inheritable text attributes**: Properties like `fontFamily`, `fontSize`,
  `color` set on a parent block or `defaultStyle` cascade down to child
  blocks and text spans during reading.
- **Dynamic values**: Properties that accept either a static value or a
  function (e.g. `margin`, `header`, `footer`) are wrapped so they are
  always functions internally, simplifying downstream code.
- **Lengths** are parsed into points (`pt`). User-facing APIs accept numbers
  (interpreted as pt) or strings with units (`'2cm'`, `'1in'`, `'10mm'`).

### Phase 2: Layout

The layout phase is the most complex part of the library. It transforms
validated blocks into a tree of positioned **Frames**.

**Core concepts:**

- A **Frame** (`src/frame.ts`) is a positioned rectangle (`x`, `y`, `width`,
  `height`) that can contain **RenderObjects** (text rows, images, graphics,
  links, anchors) and child frames.
- A **Block** is the internal representation of a content element (text,
  image, rows, columns, or empty). Blocks are the input to layout; frames
  are the output.
- A **Box** is a rectangle (`x`, `y`, `width`, `height`) representing the
  available space for layout.

**How `layoutPages()` works:**

1. It loops over content blocks, creating pages as needed.
2. For each page, it first lays out the optional header and footer to
   determine the available content area.
3. The remaining content blocks are wrapped in a virtual rows block and
   laid out in the available area. If blocks don't fit, a remainder is
   returned and used to start the next page.
4. After all pages are created, headers and footers are re-laid out with
   the final `pageCount` available (needed for "page X of Y" footers).

**How `layoutBlock()` works:**

1. Subtracts padding from the available box to get the content box.
2. Dispatches to the appropriate content layout function based on block
   type (`text`, `image`, `columns`, `rows`, or empty).
3. Adds padding back to the frame size (unless width/height are fixed).
4. Attaches anchors, graphics, and debug guides to the frame.

**Width resolution:** When a block has a fixed `width`, the frame takes
exactly that width and padding is included in it. When `width` is `'auto'`,
the frame takes the width needed by its content. Otherwise the frame fills
the available width. The `autoWidth` flag propagates to children.

**Text layout** (`src/layout/layout-text.ts`):
Text goes through several processing steps before layout:

1. Text spans are converted to **TextSegments** -- each segment is a
   word, whitespace, or newline chunk with pre-shaped glyphs (via
   `font.shapeText()` from pdf-core) and measured width/height.
2. Segments are broken into lines that fit the available width. Line
   breaking looks for whitespace/newline opportunities.
3. Adjacent segments with identical properties are flattened into single
   segments to reduce the number of PDF text operations.
4. Text alignment (left/center/right) shifts row x-positions.

**Row layout** (`src/layout/layout-rows.ts`):

- Stacks child blocks vertically.
- Vertical margins between adjacent rows are **collapsed** (the larger
  margin wins), matching CSS behavior.
- Tracks page break opportunities and can split the block across pages.
  Supports `breakBefore`, `breakAfter`, `breakInside` (auto/always/avoid),
  and `insertAfterBreak` (for repeated table headers, etc.).

**Column layout** (`src/layout/layout-columns.ts`):

- Arranges child blocks horizontally.
- Layout order: fixed-width columns first, then auto-width columns, then
  remaining columns share the leftover space equally.
- Supports vertical alignment (`top`/`middle`/`bottom`) within columns.

**Image layout** (`src/layout/layout-image.ts`):

- Loads the image (with caching), scales it to fit the available area
  while preserving the aspect ratio, and handles alignment.

### Phase 3: Render

Walks the frame tree and emits PDF content-stream operators via
`@ralfstx/pdf-core`. The render phase is relatively straightforward:

- `renderFrame()` recursively visits each frame and dispatches its
  `RenderObject` entries by type (text, graphics, image, link, anchor).
- **Coordinate flip**: Layout uses a top-left origin; PDF uses bottom-left.
  The render phase translates `y` coordinates accordingly.
- **Text rendering** tracks current text state (font, size, color, rise,
  letter spacing) and only emits operators when the state changes, to keep
  the output compact.
- **Graphics rendering** supports fill, stroke, opacity, transforms
  (translate, scale, rotate, skew, matrix), and SVG path commands.

### Font Handling

`FontStore` (`src/font-store.ts`) is the central font registry:

- Fonts are registered as raw OTF/TTF `Uint8Array` data. Family name,
  style, and weight are extracted from the font or overridden via config.
- Font selection uses a CSS-like algorithm: match family, then style (with
  italic/oblique fallback), then weight (with the standard CSS weight
  fallback rules from MDN).
- Selected fonts are cached by `(family, style, weight)` key.

## Conventions

- **Tests** are co-located with source files (`foo.test.ts` next to `foo.ts`).
- **Imports** use explicit `.ts` extensions (`import { Foo } from './foo.ts'`).
- **Type-only imports** use `import type` (enforced by ESLint).
- **No default exports** (enforced by ESLint).
- **No `console.log`** in library code (enforced by ESLint).
- **Strict null checks** and all strict TypeScript options are enabled.
- The public API types in `src/api/` are separate from the internal types
  used by the read/layout/render phases. The read phase bridges between them.
- Coordinates use a top-left origin during layout; the render phase flips to
  PDF's bottom-left origin.
