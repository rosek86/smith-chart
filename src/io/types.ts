import type { TraceSamples } from '../samples.js';

export interface TouchstoneData<T extends TraceSamples | Float64Array = TraceSamples> {
  samples: T;
  referenceImpedanceOhms: number;
}

export interface TouchstoneParseOptions {
  /** Source port count, normally taken from the filename extension. Default: 1. */
  ports?: 1 | 2;
  /** Reflection parameter to extract. S22 requires ports: 2. Default: S11. */
  parameter?: 'S11' | 'S22';
  /** Packed output contains f/re/im triples in Hz, without intermediate sample objects. */
  output?: 'objects' | 'packed';
}

export interface TouchstoneWriteOptions {
  /** Reference of the supplied data, in ohms. Does not renormalize it. Default: 50. */
  referenceImpedanceOhms?: number;
}
