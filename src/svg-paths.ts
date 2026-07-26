import type { ContentStream } from '@ralfstx/pdf-core';

import { arcToSegments, segmentToBezier } from './arcs.ts';

const svgOpsParams = {
  M: 2,
  m: 2,
  L: 2,
  l: 2,
  H: 1,
  h: 1,
  V: 1,
  v: 1,
  C: 6,
  c: 6,
  S: 4,
  s: 4,
  Q: 4,
  q: 4,
  T: 2,
  t: 2,
  A: 7,
  a: 7,
  Z: 0,
  z: 0,
};

type Op = keyof typeof svgOpsParams;

export type PathCommand = {
  op: Op;
  params?: number[];
};

type Token = { start: number; op?: Op; value?: number };

export function tokenizeSvgPath(path: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < path.length) {
    const start = pos;
    const c = path[pos++];
    if (c === ',' || c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      // ignore commas and whitespace
    } else if (c in svgOpsParams) {
      tokens.push({ start, op: c as Op });
    } else if (c === '-' || c === '+' || c === '.' || (c >= '0' && c <= '9')) {
      let s = c;
      while (
        pos < path.length &&
        ((path[pos] >= '0' && path[pos] <= '9') || (path[pos] === '.' && !s.includes('.')))
      ) {
        s += path[pos++];
      }
      const value = parseFloat(s);
      tokens.push({ start, value });
    } else {
      throw new Error(`Unexpected character: '${c}' at position ${pos - 1}`);
    }
  }
  return tokens;
}

export function parseSvgPath(path: string) {
  const tokens = tokenizeSvgPath(path);
  const commands: PathCommand[] = [];

  let pos = 0;

  const hasParam = () => {
    return tokens[pos]?.value !== undefined;
  };

  const readParam = () => {
    if (!hasParam())
      throw new Error(
        'Expected parameter at ' + (tokens[pos] ? 'position ' + tokens[pos]?.start : 'end'),
      );
    return tokens[pos++].value as number;
  };

  const readParams = (count: number) => {
    if (!count) return undefined;
    return Array.from(new Array(count)).map(() => readParam());
  };

  const readCommand = () => {
    const token = tokens[pos++];
    if (!token?.op) return;
    const op = token.op;
    const params = svgOpsParams[op];
    commands.push({ op, params: readParams(params) });
    if (op !== 'Z' && op !== 'z') {
      while (hasParam()) {
        const nextOp = op === 'M' ? 'L' : op === 'm' ? 'l' : op;
        commands.push({ op: nextOp, params: readParams(params) });
      }
    }
    return true;
  };

  while (readCommand());

  return commands;
}

/**
 * Receives the drawing operations of a path in absolute coordinates.
 * Relative commands are resolved, the control points of smooth curve
 * commands are mirrored, and arcs are converted to bezier segments, so
 * that implementations only have to handle these five operations.
 *
 * Operations that continue from the current point do not repeat it.
 * Implementations that need the start point of a segment have to
 * remember the end point of the preceding operation.
 */
export type PathVisitor = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
  quadraticCurveTo(x1: number, y1: number, x: number, y: number): void;
  /**
   * Closes the current subpath with a line to its start point. That
   * point is passed in, since it becomes the new current point.
   */
  closePath(sx: number, sy: number): void;
};

/**
 * Traverses the given path commands and reports each drawing operation
 * to the given visitor in absolute coordinates.
 */
export function walkSvgPath(commands: PathCommand[], visitor: PathVisitor): void {
  // Current point, subpath start, and previous control point (for
  // mirroring in smooth curve commands)
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let px = 0;
  let py = 0;
  let lastCurve: 'b' | 'q' | undefined = undefined;

  const opMoveTo = (x: number, y: number) => {
    visitor.moveTo(x, y);
    cx = x;
    cy = y;
    sx = x;
    sy = y;
    lastCurve = undefined;
  };
  const opLineTo = (x: number, y: number) => {
    visitor.lineTo(x, y);
    cx = x;
    cy = y;
    lastCurve = undefined;
  };
  const opBezierCurve = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    visitor.curveTo(x1, y1, x2, y2, x, y);
    cx = x;
    cy = y;
    px = x2;
    py = y2;
    lastCurve = 'b';
  };
  const opQuadraticCurve = (x1: number, y1: number, x: number, y: number) => {
    visitor.quadraticCurveTo(x1, y1, x, y);
    cx = x;
    cy = y;
    px = x1;
    py = y1;
    lastCurve = 'q';
  };
  const opArc = (rx: number, ry: number, a: number, l: number, s: number, x: number, y: number) => {
    const segments = arcToSegments(cx, cy, rx, ry, a, l, s, x, y);
    segments.forEach((seg) => visitor.curveTo(...segmentToBezier(seg)));
    cx = x;
    cy = y;
    lastCurve = undefined;
  };
  const opClosePath = () => {
    visitor.closePath(sx, sy);
    // The current point returns to the start of the subpath
    cx = sx;
    cy = sy;
    lastCurve = undefined;
  };
  const mirrorCx = (type: 'b' | 'q') => (lastCurve === type ? 2 * cx - px : cx);
  const mirrorCy = (type: 'b' | 'q') => (lastCurve === type ? 2 * cy - py : cy);

  for (const { op, params = [] } of commands) {
    const [p0, p1, p2, p3, p4, p5, p6] = params;
    switch (op) {
      case 'M':
        opMoveTo(p0, p1);
        break;
      case 'm':
        opMoveTo(cx + p0, cy + p1);
        break;
      case 'L':
        opLineTo(p0, p1);
        break;
      case 'l':
        opLineTo(cx + p0, cy + p1);
        break;
      case 'H':
        opLineTo(p0, cy);
        break;
      case 'h':
        opLineTo(cx + p0, cy);
        break;
      case 'V':
        opLineTo(cx, p0);
        break;
      case 'v':
        opLineTo(cx, cy + p0);
        break;
      case 'C':
        opBezierCurve(p0, p1, p2, p3, p4, p5);
        break;
      case 'c':
        opBezierCurve(cx + p0, cy + p1, cx + p2, cy + p3, cx + p4, cy + p5);
        break;
      case 'S':
        opBezierCurve(mirrorCx('b'), mirrorCy('b'), p0, p1, p2, p3);
        break;
      case 's':
        opBezierCurve(mirrorCx('b'), mirrorCy('b'), cx + p0, cy + p1, cx + p2, cy + p3);
        break;
      case 'Q':
        opQuadraticCurve(p0, p1, p2, p3);
        break;
      case 'q':
        opQuadraticCurve(cx + p0, cy + p1, cx + p2, cy + p3);
        break;
      case 'T':
        opQuadraticCurve(mirrorCx('q'), mirrorCy('q'), p0, p1);
        break;
      case 't':
        opQuadraticCurve(mirrorCx('q'), mirrorCy('q'), cx + p0, cy + p1);
        break;
      case 'A':
        opArc(p0, p1, p2, p3, p4, p5, p6);
        break;
      case 'a':
        opArc(p0, p1, p2, p3, p4, cx + p5, cy + p6);
        break;
      case 'Z':
      case 'z':
        opClosePath();
        break;
    }
  }
}

/**
 * Draws the given path commands into the given content stream.
 */
export function drawSvgPath(cs: ContentStream, commands: PathCommand[]): void {
  walkSvgPath(commands, {
    moveTo: (x, y) => {
      cs.moveTo(x, y);
    },
    lineTo: (x, y) => {
      cs.lineTo(x, y);
    },
    curveTo: (x1, y1, x2, y2, x, y) => {
      cs.curveTo(x1, y1, x2, y2, x, y);
    },
    quadraticCurveTo: (x1, y1, x, y) => {
      cs.smoothCurveToFinal(x1, y1, x, y);
    },
    closePath: () => {
      cs.closePath();
    },
  });
}
