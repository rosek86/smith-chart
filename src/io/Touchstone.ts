import type { TraceInput, TraceSample, TraceSamples } from '../samples.js';
import { TraceBuffer } from '../traces/TraceBuffer.js';
import type { TouchstoneData, TouchstoneParseOptions, TouchstoneWriteOptions } from './types.js';

/** DOM-independent Touchstone 1.x reflection-trace import and one-port export. */
export class Touchstone {
  private constructor() {}

  public static parse(
    text: string,
    options: TouchstoneParseOptions & { output: 'packed' },
  ): TouchstoneData<Float64Array>;
  public static parse(
    text: string,
    options?: TouchstoneParseOptions & { output?: 'objects' },
  ): TouchstoneData;
  public static parse(
    text: string,
    options: TouchstoneParseOptions,
  ): TouchstoneData<TraceSamples | Float64Array>;
  /** Frequencies are returned in Hz. Two-port input must be explicitly selected. */
  public static parse(
    text: string,
    options: TouchstoneParseOptions = {},
  ): TouchstoneData<TraceSamples | Float64Array> {
    const { ports = 1, parameter = 'S11', output = 'objects' } = options;
    if (
      ![1, 2].includes(ports) ||
      !['S11', 'S22'].includes(parameter) ||
      !['objects', 'packed'].includes(output) ||
      (ports === 1 && parameter !== 'S11')
    ) {
      throw new TypeError(
        'Expected ports 1 or 2, S11 (or S22 for two ports), and objects or packed output.',
      );
    }
    const units: Record<string, number> = { HZ: 1, KHZ: 1e3, MHZ: 1e6, GHZ: 1e9 };
    let frequencyScale = 1e9;
    let format = 'MA';
    let referenceImpedanceOhms = 50;
    let optionsSeen = false;
    let count = 0;
    let lineNumber = 0;
    let recordLine = 0;
    let fields = 0;
    let previousFrequency = -1;
    const width = ports === 1 ? 3 : 9;
    const record = new Float64Array(width);
    const samples: TraceSample[] = [];
    let packed = new Float64Array(output === 'packed' ? 3072 : 0);
    const fail = (message: string): never => {
      throw new Error(`Line ${lineNumber}: ${message}`);
    };

    // Scan lines lazily: do not retain a line array or allocate sample objects for packed output.
    for (const match of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
      lineNumber++;
      const line = match[0].split('!', 1)[0].trim();
      if (!line) {
        continue;
      }
      if (line.startsWith('[')) {
        fail('Touchstone 2.x keywords are not supported; use a 1.x .s1p or .s2p file.');
      }
      if (line.startsWith('#')) {
        if (optionsSeen || count || fields) {
          fail('The option line must appear once, before the data.');
        }
        optionsSeen = true;
        const tokens = line.slice(1).trim().toUpperCase().split(/\s+/).filter(Boolean);
        const seen = new Set<string>();
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          const kind = Object.hasOwn(units, token)
            ? 'unit'
            : ['RI', 'MA', 'DB'].includes(token)
              ? 'format'
              : token;
          if (!['unit', 'format', 'S', 'R'].includes(kind) || seen.has(kind)) {
            fail('Expected Hz|kHz|MHz|GHz, S, RI|MA|DB and one R impedance.');
          }
          seen.add(kind);
          if (kind === 'unit') {
            frequencyScale = units[token];
          } else if (kind === 'format') {
            format = token;
          } else if (kind === 'R') {
            const value = tokens[++i];
            if (!value || !Touchstone.isNumber(value)) {
              fail('Reference impedance must be a positive finite number.');
            }
            referenceImpedanceOhms = Number(value);
            if (!Number.isFinite(referenceImpedanceOhms) || referenceImpedanceOhms <= 0) {
              fail('Reference impedance must be a positive finite number.');
            }
          }
        }
        continue;
      }
      for (const token of line.matchAll(/\S+/g)) {
        if (fields === width) {
          fail('Each frequency record must begin on a new line.');
        }
        if (!Touchstone.isNumber(token[0])) {
          fail('Expected finite decimal numbers.');
        }
        const value = Number(token[0]);
        if (!Number.isFinite(value)) {
          fail('Expected finite decimal numbers.');
        }
        if (fields === 0) {
          recordLine = lineNumber;
          const frequencyHz = value * frequencyScale;
          if (frequencyHz < 0 || !Number.isFinite(frequencyHz)) {
            fail('Frequency must be finite and non-negative.');
          }
          // Legacy noise blocks restart the frequency sweep. Never interpret them as S data.
          if (ports === 2 && frequencyHz <= previousFrequency) {
            fail('Two-port frequencies must increase strictly; noise data is not supported.');
          }
          record[fields++] = frequencyHz;
        } else {
          record[fields++] = value;
        }
      }
      if (fields !== width) {
        continue;
      }
      let real = 0;
      let imaginary = 0;
      for (let offset = 1; offset < width; offset += 2) {
        const a = record[offset];
        const b = record[offset + 1];
        if (format === 'MA' && a < 0) {
          fail('Magnitude must be non-negative.');
        }
        const magnitude = format === 'DB' ? 10 ** (a / 20) : a;
        const radians = ((b % 360) * Math.PI) / 180;
        const re = format === 'RI' ? a : magnitude * Math.cos(radians);
        const im = format === 'RI' ? b : magnitude * Math.sin(radians);
        if (!Number.isFinite(re) || !Number.isFinite(im)) {
          fail('An S-parameter is outside the supported numeric range.');
        }
        if (offset === (parameter === 'S11' ? 1 : 7)) {
          real = re;
          imaginary = im;
        }
      }
      if (output === 'packed') {
        if (count * 3 === packed.length) {
          const grown = new Float64Array(packed.length * 2);
          grown.set(packed);
          packed = grown;
        }
        packed[count * 3] = record[0];
        packed[count * 3 + 1] = real;
        packed[count * 3 + 2] = imaginary;
      } else {
        samples.push({ frequencyHz: record[0], reflectionCoefficient: [real, imaginary] });
      }
      previousFrequency = record[0];
      count++;
      fields = 0;
    }
    if (fields) {
      throw new Error(
        `Line ${recordLine}: Incomplete ${ports}-port record; expected ${width} values. Noise data is not supported.`,
      );
    }
    if (!count) {
      throw new Error(`The file contains no ${parameter} samples.`);
    }
    return {
      samples: output === 'packed' ? packed.slice(0, count * 3) : samples,
      referenceImpedanceOhms,
    };
  }

  /** Serialize a reflection trace as one-port Touchstone, in Hz/RI without rounding or renormalization. */
  public static stringify(samples: TraceInput, options: TouchstoneWriteOptions = {}): string {
    const { referenceImpedanceOhms = 50 } = options;
    if (!Number.isFinite(referenceImpedanceOhms) || referenceImpedanceOhms <= 0) {
      throw new RangeError('Reference impedance must be positive and finite.');
    }
    const data = TraceBuffer.from(samples);
    const lines = [`# Hz S RI R ${referenceImpedanceOhms}`];
    for (let i = 0; i < data.length; i++) {
      if (i > 0 && data.frequency(i) <= data.frequency(i - 1)) {
        throw new RangeError('Touchstone export requires strictly increasing frequencies.');
      }
      lines.push(`${data.frequency(i)} ${data.real(i)} ${data.imaginary(i)}`);
    }
    return lines.join('\n') + '\n';
  }

  private static isNumber(token: string): boolean {
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token);
  }
}
