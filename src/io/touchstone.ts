import type { S1P } from '../SnP.js';

export interface TouchstoneData {
  values: S1P;
  referenceImpedance: number;
}

/** Read one-port Touchstone 1.x data; frequencies in the result are always Hz. */
export function parseTouchstone(text: string): TouchstoneData {
  const units: Record<string, number> = { HZ: 1, KHZ: 1e3, MHZ: 1e6, GHZ: 1e9 };
  let frequencyScale = 1e9;
  let format = 'MA';
  let referenceImpedance = 50;
  let optionsSeen = false;
  const values: S1P = [];

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
      if (optionsSeen || values.length) {
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
      referenceImpedance = Number(impedance);
      if (!Number.isFinite(referenceImpedance) || referenceImpedance <= 0) {
        fail('Reference impedance must be positive.');
      }
      continue;
    }
    const fields = line.split(/\s+/).map(Number);
    if (fields.length !== 3 || !fields.every(Number.isFinite)) {
      fail('Expected frequency and two finite S11 values.');
    }
    const [frequency, a, b] = fields;
    const freq = frequency * frequencyScale;
    if (freq < 0 || !Number.isFinite(freq)) {
      fail('Frequency must be finite and non-negative.');
    }
    if (format === 'MA' && a < 0) {
      fail('Magnitude must be non-negative.');
    }
    const magnitude = format === 'DB' ? 10 ** (a / 20) : a;
    const radians = (b * Math.PI) / 180;
    const point: [number, number] =
      format === 'RI' ? [a, b] : [magnitude * Math.cos(radians), magnitude * Math.sin(radians)];
    if (!point.every(Number.isFinite)) {
      fail('S11 is outside the supported numeric range.');
    }
    values.push({ freq, point });
  }
  if (!values.length) {
    throw new Error('The file contains no S11 samples.');
  }
  return { values, referenceImpedance };
}
