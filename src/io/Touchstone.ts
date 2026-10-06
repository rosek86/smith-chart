import type { TraceSample, TraceSamples } from '../samples.js';

export interface TouchstoneData {
  samples: TraceSamples;
  referenceImpedanceOhms: number;
}

export class Touchstone {
  private constructor() {}

  /** Read one-port Touchstone 1.x data; frequencies in the result are always Hz. */
  public static parse(text: string): TouchstoneData {
    const units: Record<string, number> = { HZ: 1, KHZ: 1e3, MHZ: 1e6, GHZ: 1e9 };
    let frequencyScale = 1e9;
    let format = 'MA';
    let referenceImpedanceOhms = 50;
    let optionsSeen = false;
    const samples: TraceSample[] = [];

    for (const [index, raw] of text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .entries()) {
      const line = raw.split('!')[0].trim();
      if (!line) {
        continue;
      }
      const fail = (message: string): never => {
        throw new Error(`Line ${index + 1}: ${message}`);
      };
      if (line.startsWith('[')) {
        fail('Only Touchstone 1.x one-port files (.s1p) are supported.');
      }
      if (line.startsWith('#')) {
        if (optionsSeen || samples.length) {
          fail('The option line must appear once, before the data.');
        }
        optionsSeen = true;
        const options = line.slice(1).trim().toUpperCase().split(/\s+/).filter(Boolean);
        if (!options.length) {
          continue;
        }
        const [unit = 'GHZ', parameter = 'S', representation = 'MA', r = 'R', impedance = '50'] =
          options;
        if (
          !(unit in units) ||
          parameter !== 'S' ||
          !['RI', 'MA', 'DB'].includes(representation) ||
          r !== 'R' ||
          options.length > 5
        ) {
          fail('Expected: # Hz|kHz|MHz|GHz S RI|MA|DB R impedance.');
        }
        frequencyScale = units[unit];
        format = representation;
        referenceImpedanceOhms = Number(impedance);
        if (!Number.isFinite(referenceImpedanceOhms) || referenceImpedanceOhms <= 0) {
          fail('Reference impedance must be positive.');
        }
        continue;
      }
      const fields = line.split(/\s+/).map(Number);
      if (fields.length !== 3 || !fields.every(Number.isFinite)) {
        fail('Expected frequency and two finite S11 components.');
      }
      const [frequency, a, b] = fields;
      const frequencyHz = frequency * frequencyScale;
      if (frequencyHz < 0 || !Number.isFinite(frequencyHz)) {
        fail('Frequency must be finite and non-negative.');
      }
      if (format === 'MA' && a < 0) {
        fail('Magnitude must be non-negative.');
      }
      const magnitude = format === 'DB' ? 10 ** (a / 20) : a;
      const radians = (b * Math.PI) / 180;
      const reflectionCoefficient: [number, number] =
        format === 'RI' ? [a, b] : [magnitude * Math.cos(radians), magnitude * Math.sin(radians)];
      if (!reflectionCoefficient.every(Number.isFinite)) {
        fail('S11 is outside the supported numeric range.');
      }
      samples.push({ frequencyHz, reflectionCoefficient });
    }
    if (!samples.length) {
      throw new Error('The file contains no S11 samples.');
    }
    return { samples, referenceImpedanceOhms };
  }
}
