import { expect, it } from 'vitest';
import { Touchstone } from '../src/io/Touchstone';

it('reads RI, frequency units, tabs, CRLF, BOM and inline comments', () => {
  expect(Touchstone.parse('\uFEFF! S11\r\n# MHz S RI R 75\r\n100\t0.5\t-0.25 ! sample')).toEqual({
    referenceImpedanceOhms: 75,
    samples: [{ frequencyHz: 1e8, reflectionCoefficient: [0.5, -0.25] }],
  });
});
it('uses Touchstone defaults (GHz, S, MA, 50 Ω)', () => {
  const data = Touchstone.parse('1 0.5 90');
  expect(data.referenceImpedanceOhms).toBe(50);
  expect(data.samples[0].frequencyHz).toBe(1e9);
  expect(data.samples[0].reflectionCoefficient[0]).toBeCloseTo(0);
  expect(data.samples[0].reflectionCoefficient[1]).toBeCloseTo(0.5);
});
it('converts decibel magnitudes and degree phases', () => {
  const data = Touchstone.parse('# kHz S DB R 50\n1000 -6.020599913279624 -90');
  expect(data.samples[0].frequencyHz).toBe(1e6);
  expect(data.samples[0].reflectionCoefficient[0]).toBeCloseTo(0);
  expect(data.samples[0].reflectionCoefficient[1]).toBeCloseTo(-0.5);
});
it.each([
  '',
  '1 NaN 0',
  '-1 0 0',
  '# Hz Z RI R 50\n1 0 0',
  '# Hz S RI R 0\n1 0 0',
  '[Version] 2.0',
  '1 0 0 0 0',
  '# Hz S MA R 50\n1 -1 0',
  '1 0 0\n# Hz S RI R 50',
])('rejects unsupported or invalid data: %s', (text) => {
  expect(() => Touchstone.parse(text)).toThrow();
});

it('extracts S11 and S22 in two-port column-major order, across continuation lines', () => {
  const source =
    '! two ports\r# Hz S RI R 75\r1 .1 -.2 2 -3 ! forward\r\r! reverse\r4 -5 .6 -.7\r2 .2 -.3 3 -4 5 -6 .7 -.8';
  const s11 = Touchstone.parse(source, { ports: 2 });
  const s22 = Touchstone.parse(source, { ports: 2, parameter: 'S22', output: 'packed' });
  expect(s11.samples).toEqual([
    { frequencyHz: 1, reflectionCoefficient: [0.1, -0.2] },
    { frequencyHz: 2, reflectionCoefficient: [0.2, -0.3] },
  ]);
  expect(s22.referenceImpedanceOhms).toBe(75);
  expect(s22.samples).toEqual(new Float64Array([1, 0.6, -0.7, 2, 0.7, -0.8]));
  expect(() => Touchstone.parse(source)).toThrow();
});

it.each(['RI', 'MA', 'DB'])(
  'matches object and packed output for both ports in %s format',
  (format) => {
    const source = `# MHz S ${format} R 50\n1 0.5 90 0.8 -45 0.1 180 0.25 -90`;
    for (const parameter of ['S11', 'S22'] as const) {
      const objects = Touchstone.parse(source, { ports: 2, parameter }).samples;
      const packed = Touchstone.parse(source, { ports: 2, parameter, output: 'packed' }).samples;
      expect([...packed]).toEqual(
        objects.flatMap((s) => [s.frequencyHz, ...s.reflectionCoefficient]),
      );
      if (format === 'MA') {
        expect(packed[2]).toBeCloseTo(parameter === 'S11' ? 0.5 : -0.25);
      }
    }
  },
);

it('grows packed storage without exposing unused capacity or losing sample order', () => {
  const source =
    '# Hz S RI R 50\n' + Array.from({ length: 5000 }, (_, i) => `${i} .125 -.25`).join('\n');
  const result = Touchstone.parse(source, { output: 'packed' }).samples;
  expect(result).toHaveLength(15000);
  expect(result.byteLength).toBe(15000 * 8);
  expect(result.buffer.byteLength).toBe(result.byteLength);
  for (let i = 0; i < 5000; i++) {
    expect([...result.subarray(i * 3, i * 3 + 3)]).toEqual([i, 0.125, -0.25]);
  }
});

it('accepts reordered/omitted option tokens and decimal scientific notation', () => {
  const result = Touchstone.parse('# R 7.5e1 RI kHz S\n.1e+2 +.5 -5.E-1', { output: 'packed' });
  expect(result.samples).toEqual(new Float64Array([10000, 0.5, -0.5]));
  expect(result.referenceImpedanceOhms).toBe(75);
  expect(Touchstone.parse('# RI\n1 0.5 -0.5').samples[0].reflectionCoefficient).toEqual([
    0.5, -0.5,
  ]);
});

it.each([
  '# Hz S RI R 50\n1 0 0 0 0 0 0 0',
  '# Hz S RI R 50\n1 0 0 0 0 0 0 0 0 2',
  '# Hz S RI R 50\n1 0 0 0 0 0 0 0 0\n.5 1 .5 90 .1',
  '# Hz S RI R 50\n1 0 0 0 0 0 0 0 0\n1 0 0 0 0 0 0 0 0',
  '# Hz S MA R 50\n1 0 0 -1 0 0 0 0 0',
  '# Hz S DB R 50\n1 0 0 99999 0 0 0 0 0',
  '# Hz S RI R 50\n1 0 0 NaN 0 0 0 0 0',
  '# Hz S RI R 50\n1 0 0\n# Hz S RI R 50\n0 0 0 0 0 0',
  '[Version] 2.0\n[Number of Ports] 2',
])('rejects malformed, unsupported or invalid unselected two-port data: %s', (text) => {
  expect(() => Touchstone.parse(text, { ports: 2 })).toThrow(/Line/);
});

it.each([
  '# Hz Hz S RI R 50\n1 0 0',
  '# Hz S RI R\n1 0 0',
  '# Hz S RI R Infinity\n1 0 0',
  '# Hz S RI R 50 75\n1 0 0',
  '# Hz S RI R 50\n0x10 0 0',
  '# Hz S RI R 50\n1 0xF 0',
  '# GHz S RI R 50\n1e308 0 0',
])('rejects ambiguous headers and non-decimal/out-of-range numbers: %s', (text) => {
  expect(() => Touchstone.parse(text)).toThrow(/Line/);
});

it('validates runtime parse options', () => {
  for (const options of [
    { ports: 3 },
    { parameter: 'S21' },
    { parameter: 'S22' },
    { output: 'array' },
  ]) {
    expect(() => Touchstone.parse('1 0 0', options as never)).toThrow(TypeError);
  }
});

it('reports the starting line of an incomplete record', () => {
  expect(() =>
    Touchstone.parse('# Hz S RI R 50\n! comment\n1 .2 .3\n .4 .5', { ports: 2 }),
  ).toThrow('Line 3: Incomplete 2-port record');
});

it('writes all public trace input formats to equivalent RI/Hz one-port data', () => {
  const objects = [
    { frequencyHz: 0, reflectionCoefficient: [0.125, -0.5] as const },
    { frequencyHz: 1e9, reflectionCoefficient: [0.25, 0.5] as const },
  ];
  const tuples = [
    [0, 0.125, -0.5],
    [1e9, 0.25, 0.5],
  ] as const;
  const packed = new Float64Array(tuples.flat());
  for (const input of [objects, tuples, packed]) {
    const text = Touchstone.stringify(input, { referenceImpedanceOhms: 75 });
    expect(text).toBe('# Hz S RI R 75\n0 0.125 -0.5\n1000000000 0.25 0.5\n');
    expect(Touchstone.parse(text)).toEqual({ samples: objects, referenceImpedanceOhms: 75 });
  }
});

it('preserves representable values through RI text without precision truncation', () => {
  const values = new Float64Array([1, Number.MIN_VALUE, Number.MAX_VALUE, 2, Math.PI, -1e-300]);
  expect(Touchstone.parse(Touchstone.stringify(values), { output: 'packed' }).samples).toEqual(
    values,
  );
});

it.each(
  [[], [1, 0], [1, 0, NaN], [-1, 0, 0], [2, 0, 0, 1, 0, 0], [1, 0, 0, 1, 1, 0]].map((input) => ({
    input,
  })),
)('rejects invalid or unordered export samples: $input', ({ input }) => {
  expect(() => Touchstone.stringify(new Float64Array(input))).toThrow(RangeError);
});

it.each([0, -50, NaN, Infinity])(
  'rejects invalid export reference %s',
  (referenceImpedanceOhms) => {
    expect(() => Touchstone.stringify([[1, 0, 0]], { referenceImpedanceOhms })).toThrow(RangeError);
  },
);
