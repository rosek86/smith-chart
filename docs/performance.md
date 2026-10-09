# Large trace performance

See [difficult workloads and marker-selection measurements](performance-workloads.md)
for noisy data, multiple traces, repeated lifecycle memory checks, and the decision
on further marker optimization.

## Reproducing the measurements

```sh
npm run benchmark:traces -- /tmp/smithkit-traces.json
# Restrict the workload or use the second browser:
BENCH_FORMATS=packed BENCH_SIZES=100000 BENCH_BROWSER=webkit npm run benchmark:traces
```

The script builds the current source and runs three fresh browser pages per size,
format, and rendering mode. It measures synchronous add/update calls, nearest-frequency
selection, one synthetic marker drag, and one wheel zoom. `zoomFrameMs` also waits
for two animation frames; it is not a GPU-completion measurement. Input generation
and initial chart/grid construction are outside the timers. No timing threshold is
enforced in CI.

The workload is a smooth circular sweep with ascending frequencies, a 500 × 500 CSS
pixel chart, and the default 2 px point radius. Many points overlap: the million-sample
sweep produces about 584 visible circles after zoom. Scattered data, multiple traces,
other viewport sizes, and real pointer-event streams may cost substantially more.

## Local comparison — 2026-10-09

Measured on macOS arm64 with Chromium 153.0.8010.12. Baseline is
`v0.4.0` (`db017e9`), compared with the packed-storage implementation. Values are
medians in milliseconds. Treat them as a local comparison, not a performance guarantee.

|   Samples | Storage/input                | Mode   |   Add | Update | Frequency | Drag | Zoom handler | Zoom + frames |
| --------: | ---------------------------- | ------ | ----: | -----: | --------: | ---: | -----------: | ------------: |
|    10,000 | 0.4.0 objects                | points |   2.7 |    1.9 |       0.1 |  1.8 |          2.6 |          23.9 |
|    10,000 | 0.4.0 objects                | line   |   2.9 |    2.5 |       0.1 |  1.6 |          0.9 |          24.9 |
|    10,000 | Packed storage, objects      | points |   2.7 |    1.0 |       0.0 |  1.9 |          2.3 |          24.3 |
|    10,000 | Packed storage, objects      | line   |   3.1 |    1.9 |       0.1 |  1.6 |          0.9 |          24.4 |
|    10,000 | Packed storage, Float64Array | points |   2.2 |    1.1 |       0.1 |  1.7 |          1.8 |          24.4 |
|    10,000 | Packed storage, Float64Array | line   |   2.8 |    2.2 |       0.1 |  1.6 |          0.9 |          24.3 |
|   100,000 | 0.4.0 objects                | points |  22.4 |    8.8 |       0.2 |  3.3 |          6.1 |          23.8 |
|   100,000 | 0.4.0 objects                | line   |  32.4 |   18.7 |       0.5 |  3.3 |          1.1 |          17.1 |
|   100,000 | Packed storage, objects      | points |  15.5 |    3.8 |       0.0 |  2.6 |          4.6 |          19.4 |
|   100,000 | Packed storage, objects      | line   |  28.5 |   16.6 |       0.1 |  5.0 |          1.1 |          23.7 |
|   100,000 | Packed storage, Float64Array | points |   5.5 |    3.2 |       0.1 |  2.7 |          3.7 |          16.9 |
|   100,000 | Packed storage, Float64Array | line   |  20.6 |   15.5 |       0.1 |  4.8 |          1.1 |          19.9 |
| 1,000,000 | 0.4.0 objects                | points |  74.6 |   62.6 |       1.5 | 15.4 |         42.2 |          52.1 |
| 1,000,000 | 0.4.0 objects                | line   | 205.6 |  178.4 |       1.5 | 21.0 |          1.1 |         267.3 |
| 1,000,000 | Packed storage, objects      | points |  42.4 |   29.2 |       0.1 |  8.7 |         22.7 |          35.8 |
| 1,000,000 | Packed storage, objects      | line   | 199.3 |  162.8 |       0.1 | 16.8 |          1.0 |         268.4 |
| 1,000,000 | Packed storage, Float64Array | points |  26.2 |   23.8 |       0.1 |  8.6 |         22.4 |          39.2 |
| 1,000,000 | Packed storage, Float64Array | line   | 214.3 |  160.8 |       0.1 | 12.7 |          1.3 |         270.5 |

The same run also accepted tuple input at all three sizes. For one million samples
in point mode, tuple medians were 33.1 ms to add, 36.5 ms to update, and 22.3 ms for
the zoom handler. Input shape alone is not a reliable predictor of rendering cost.

## What changed

- All inputs become an owned `Float64Array`: 24 bytes of numeric payload per sample,
  excluding the caller’s input, SVG geometry, and other bookkeeping. No sample objects
  are retained for each point. Typed arrays are copied rather than borrowed.
- Markers keep indices, avoiding `indexOf` over the series for readings and events.
- Ascending frequency sweeps use binary search; unsorted sweeps preserve input-order
  linear search. Both preserve first-input tie selection, including duplicates.
- Reflection selection remains a linear scan, but computes each distance once.
- Point rendering binds sample indices and uses numeric screen-cell keys instead of
  allocating a string for each candidate. Culling still scans the full data on zoom.

## Optional line simplification — 2026-10-09

`lineTolerancePx` defaults to 0 (full geometry). With a positive tolerance, nested
radial-distance levels cache ordered sample indices. Each level accounts for the
accumulated error of earlier levels; selection uses the chart's CSS scale and zoom.
Panning and zooming within a level do not rewrite the path. Crossing a level rewrites
only the selected geometry, without scanning all samples to simplify again.

```sh
BENCH_FORMATS=packed BENCH_SIZES=100000,1000000 BENCH_MODES=line npm run benchmark:traces
BENCH_FORMATS=packed BENCH_SIZES=100000,1000000 BENCH_MODES=line BENCH_LINE_TOLERANCE_PX=0.5 npm run benchmark:traces
```

Same local platform and smooth workload as above; medians of three fresh pages.
The full-data case uses this implementation with simplification disabled.

|   Samples | Tolerance | Vertices after zoom | Add (ms) | Update (ms) | Zoom handler (ms) | Zoom + frames (ms) |
| --------: | --------: | ------------------: | -------: | ----------: | ----------------: | -----------------: |
|   100,000 |         0 |             100,000 |     20.2 |        14.8 |               1.2 |               21.8 |
|   100,000 |    0.5 px |               4,168 |      7.9 |         4.9 |               0.9 |               31.1 |
| 1,000,000 |         0 |           1,000,000 |    207.0 |       154.1 |               1.3 |              279.9 |
| 1,000,000 |    0.5 px |               3,908 |     21.1 |        17.2 |               1.3 |               20.3 |

The million-sample case benefits substantially from the smaller SVG path. At 100k,
frame scheduling dominates this measurement and there is no demonstrated zoom win.
These are not guarantees for noisy data, multiple traces, or continuous gestures.

Level preparation is synchronous on first use and after data changes, with at most
21 passes; high-frequency noise may retain every sample and add overhead without
reducing rendering cost. Stored levels must shrink by at least 20%, bounding their
index payload to about 16 bytes per original sample in the worst case, plus a temporary
4-byte-per-sample scratch buffer. Full measurement storage is unchanged. Large zoom
factors can return to the full path, so this does not guarantee fast deep zoom.

Full-detail export remains the default and can still create a large SVG or expensive
PNG rasterization. `lineDetail: 'view'` reuses displayed geometry, whose error scales
with the output size. Point mode still scans the full data for culling on zoom.
