import {
  appendBezierCurve,
  appendQuadraticCurve,
  closePath,
  lineTo,
  moveTo,
  PDFOperator,
} from 'pdf-lib';

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
    const params = svgOpsParams[op as Op];
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

export function svgPathToPdfOps(commands: PathCommand[]): PDFOperator[] {
  let cx = 0;
  let cy = 0;
  let px = 0;
  let py = 0;
  let lastCurve: 'b' | 'q' | undefined = undefined;

  const opMoveTo = (x: number, y: number) => {
    cx = x;
    cy = y;
    lastCurve = undefined;
    return [moveTo(cx, cy)];
  };
  const opLineTo = (x: number, y: number) => {
    cx = x;
    cy = y;
    lastCurve = undefined;
    return [lineTo(cx, cy)];
  };
  const opBezierCurve = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    cx = x;
    cy = y;
    px = x2;
    py = y2;
    lastCurve = 'b';
    return [appendBezierCurve(x1, y1, x2, y2, cx, cy)];
  };
  const opQuadraticCurve = (x1: number, y1: number, x: number, y: number) => {
    cx = x;
    cy = y;
    px = x1;
    py = y1;
    lastCurve = 'q';
    return [appendQuadraticCurve(x1, y1, cx, cy)];
  };
  const opArc = (rx: number, ry: number, a: number, l: number, s: number, x: number, y: number) => {
    const segments = arcToSegments(cx, cy, rx, ry, a, l, s, x, y);
    cx = x;
    cy = y;
    lastCurve = undefined;
    return segments.flatMap((seg) => appendBezierCurve(...segmentToBezier(seg)));
  };
  const opClosePath = () => {
    lastCurve = undefined;
    return [closePath()];
  };
  const mirrorCx = (type: 'b' | 'q') => (lastCurve === type ? 2 * cx - px : cx);
  const mirrorCy = (type: 'b' | 'q') => (lastCurve === type ? 2 * cy - py : cy);

  const ops: Record<Op, (params?: number[]) => PDFOperator[]> = {
    M: ([x, y]: number[]) => {
      return opMoveTo(x, y);
    },
    m: ([dx, dy]: number[]) => {
      return opMoveTo(cx + dx, cy + dy);
    },
    L: ([x, y]: number[]) => {
      return opLineTo(x, y);
    },
    l: ([dx, dy]: number[]) => {
      return opLineTo(cx + dx, cy + dy);
    },
    H: ([x]: number[]) => {
      return opLineTo(x, cy);
    },
    h: ([dx]: number[]) => {
      return opLineTo(cx + dx, cy);
    },
    V: ([y]: number[]) => {
      return opLineTo(cx, y);
    },
    v: ([dy]: number[]) => {
      return opLineTo(cx, cy + dy);
    },
    C: ([x1, y1, x2, y2, x, y]: number[]) => {
      return opBezierCurve(x1, y1, x2, y2, x, y);
    },
    c: ([dx1, dy1, dx2, dy2, dx, dy]: number[]) => {
      return opBezierCurve(cx + dx1, cy + dy1, cx + dx2, cy + dy2, cx + dx, cy + dy);
    },
    S: ([x2, y2, x, y]: number[]) => {
      return opBezierCurve(mirrorCx('b'), mirrorCy('b'), x2, y2, x, y);
    },
    s: ([dx2, dy2, dx, dy]: number[]) => {
      return opBezierCurve(mirrorCx('b'), mirrorCy('b'), cx + dx2, cy + dy2, cx + dx, cy + dy);
    },
    Q: ([x1, y1, x, y]: number[]) => {
      return opQuadraticCurve(x1, y1, x, y);
    },
    q: ([dx1, dy1, dx, dy]: number[]) => {
      return opQuadraticCurve(cx + dx1, cy + dy1, cx + dx, cy + dy);
    },
    T: ([x, y]: number[]) => {
      return opQuadraticCurve(mirrorCx('q'), mirrorCy('q'), x, y);
    },
    t: ([dx, dy]: number[]) => {
      return opQuadraticCurve(mirrorCx('q'), mirrorCy('q'), cx + dx, cy + dy);
    },
    A: ([rx, ry, angle, largeArc, sweep, x, y]: number[]) => {
      return opArc(rx, ry, angle, largeArc, sweep, x, y);
    },
    a: ([rx, ry, angle, largeArc, sweep, dx, dy]: number[]) => {
      return opArc(rx, ry, angle, largeArc, sweep, cx + dx, cy + dy);
    },
    Z: () => {
      return opClosePath();
    },
    z: () => {
      return opClosePath();
    },
  } as Record<Op, (params?: number[]) => PDFOperator[]>;

  return commands.flatMap(({ op, params }) => ops[op](params));
}
