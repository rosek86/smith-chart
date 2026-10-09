# Difficult trace workloads and marker-selection cost

## Scope and reproduction

These diagnostics complement [the smooth-trace benchmark](performance.md). They do
not change library behavior or add a spatial index. Run browsers sequentially on
an otherwise idle machine; timings are diagnostic rather than CI thresholds.

```sh
npm run benchmark:workloads -- /tmp/smith-workloads-chromium.json
BENCH_BROWSER=webkit BENCH_PHASES=selection,rendering npm run benchmark:workloads -- /tmp/smith-workloads-webkit.json
# Restrict a run; each completed case is saved immediately:
BENCH_RUNS=1 BENCH_SIZES=1000000 BENCH_SHAPES=noisy BENCH_MULTIPLE=0 BENCH_PHASES=rendering npm run benchmark:workloads
# Bounded-data arithmetic experiment; never enabled in the library:
BENCH_SEARCH=bounded-squared BENCH_SIZES=1000000 BENCH_MULTIPLE=0 BENCH_TOLERANCES=0.5 BENCH_PHASES=rendering npm run benchmark:workloads -- /tmp/smith-workloads-experiment.json
```

Controls: `BENCH_RUNS` (default 3 fresh pages), `BENCH_STEPS` (20 measured marker
moves), `BENCH_SIZES` (100000,1000000), `BENCH_SHAPES` (smooth,noisy),
`BENCH_TOLERANCES` (0,0.5), `BENCH_MULTIPLE=0` (omit four-trace cases),
`BENCH_PHASES` (selection,rendering,memory), and `BENCH_BROWSER` (chromium or webkit).
Memory diagnostics use Chromium CDP and always use one million samples per trace,
a 0.5 px tolerance and ten updates. `BENCH_MEMORY_CYCLES` controls create/update/destroy
cycles (default 10); use 100 for a longer retention check. The full matrix takes
several minutes, especially for noisy SVG paths.

The data is a deterministic 1–3 GHz spiral inside the unit circle, packed into a
`Float64Array`. Noisy data adds independent uniform noise in [-0.01, 0.01) to each
coordinate. Four-trace cases use independent seeds and 250,000 samples per trace
(one million total). All rendering measurements use lines in a 500 × 500 CSS px
chart with one marker on the first trace. Input generation is excluded from add and
update timing. Traces retain every measurement regardless of display tolerance.

Marker diagnostics instrument the actual `TraceBuffer.nearestPoint()` call made by
synthetic drag events. Five moves warm the interaction, then twenty different
positions are measured. Each move is followed by two animation frames, so this is
a paced interaction workload, **not** a simulation of high-rate pointer traffic or
a claim about maximum FPS. The harness verifies search calls and changed readings.
Zoom alternates small zoom-in/out gestures; two warmups precede six measured moves.
Frame timings include scheduling and are not GPU completion measurements.

Standalone selection uses twenty warmups and sixty measured queries. It also checks
a squared-distance experiment against the existing selection results for these
bounded datasets. That experiment lacks the numerical-range and tie-rounding
handling required for a production replacement; it is not a proposed API.

Memory snapshots force garbage collection through CDP. `usedSize` measures JavaScript
heap; `backingStorageSize` includes ArrayBuffers and external strings, essential for
packed trace buffers. Embedder heap and DOM counters are captured separately. A
warm create/destroy precedes the baseline, and caller-owned arrays are released
before snapshots. On macOS/Linux the script also sums RSS for the browser's CDP-listed
processes; shared pages can be counted more than once, so this is an approximate
process-residency diagnostic, not unique application memory. Allocator and raster
caches may remain resident after objects are released. Transient peaks between
snapshots and separately allocated GPU memory are not measured. Returning near
baseline is evidence for these lifecycles, not proof that all interactions are leak-free.

## Measurements — 2026-10-09

Local Apple M5 Pro, 48 GiB RAM, macOS arm64, Node 24.21.0; Chromium 153.0.8010.12
and WebKit 26.6. The harness bundled source from library commit `89061e4` without
minification. Browsers ran sequentially. Each table cell is the median of three
fresh-page results; p95 cells are the median of each run's p95, not a pooled percentile.
Times are milliseconds. WebKit's timer reports integer milliseconds here; zero in
raw timing output means below timer resolution, not free work.

### Marker search inside actual dragging

All rows below use 0.5 px tolerance. Search always reads full data, including when
noisy lines cannot be simplified. Each move searches only the selected marker's trace.

| Shape  | Traces × samples | Chromium search p50 / p95 | Chromium handler p50 | WebKit search p50 / p95 | WebKit handler p50 |
| ------ | ---------------: | ------------------------: | -------------------: | ----------------------: | -----------------: |
| smooth |      1 × 100,000 |                 1.7 / 2.2 |                  2.1 |               1.0 / 1.0 |                1.0 |
| smooth |    1 × 1,000,000 |                 9.3 / 9.5 |                  9.3 |               8.0 / 8.0 |                8.0 |
| smooth |      4 × 250,000 |                 3.8 / 4.2 |                  3.9 |               2.0 / 2.0 |                2.0 |
| noisy  |      1 × 100,000 |                 1.8 / 2.8 |                  2.1 |               1.0 / 1.0 |                1.0 |
| noisy  |    1 × 1,000,000 |                 9.2 / 9.6 |                  9.2 |               7.0 / 7.0 |                7.0 |
| noisy  |      4 × 250,000 |                 3.1 / 3.6 |                  3.2 |               2.0 / 2.0 |                2.0 |

Standalone hot-loop selection took about 6.3–6.4 ms per million samples in Chromium
and 7 ms in WebKit. The real gesture measurements above are the better basis for
interaction decisions: they include the actual call context and interaction warmup.

### Rendering and update costs

Each paired value is **full geometry → 0.5 px tolerance**. Vertex counts are totals
across traces: smooth 1 × 1M drops from 1,000,000 to 8,302; smooth 4 × 250k drops to
33,208. Every noisy case in the following table still has 1,000,000 vertices at this tolerance.

| Engine   | Shape  | Traces × samples |           Add | Update all traces | Zoom + two frames | Drag + two frames |
| -------- | ------ | ---------------: | ------------: | ----------------: | ----------------: | ----------------: |
| Chromium | smooth |    1 × 1,000,000 |  209.2 → 24.9 |      164.3 → 21.1 |      250.3 → 33.4 |       33.3 → 33.3 |
| Chromium | smooth |      4 × 250,000 |  187.5 → 36.0 |      154.9 → 22.7 |      159.7 → 33.3 |       33.3 → 33.3 |
| Chromium | noisy  |    1 × 1,000,000 | 215.2 → 247.9 |     169.5 → 208.3 |   1022.9 → 1046.4 |       33.3 → 33.3 |
| Chromium | noisy  |      4 × 250,000 | 194.6 → 231.6 |     157.2 → 186.2 |     586.8 → 601.2 |       33.3 → 33.3 |
| WebKit   | smooth |    1 × 1,000,000 |  502.0 → 35.0 |      148.0 → 24.0 |      217.0 → 33.0 |      366.0 → 33.0 |
| WebKit   | smooth |      4 × 250,000 |  489.0 → 56.0 |      169.0 → 21.0 |      200.0 → 33.0 |      336.0 → 33.0 |
| WebKit   | noisy  |    1 × 1,000,000 | 537.0 → 414.0 |     166.0 → 234.0 |     217.0 → 217.0 |     367.0 → 366.0 |
| WebKit   | noisy  |      4 × 250,000 | 488.0 → 579.0 |     198.0 → 199.0 |     200.0 → 200.0 |     333.0 → 333.0 |

The 33 ms floor mostly reflects two animation frames at the test cadence. The timings
suggest Chromium avoids much of the heavy trace repaint work during marker moves,
while WebKit's full paths produce much longer frame waits. This is an inference from
CPU/frame timings; the harness does not collect a paint profiler trace. A faster nearest-point query cannot remove
that separate rendering cost. Simplification helps smooth geometry but is not a
solution for arbitrary noise; in Chromium the noisy million-point zoom still took
about a second, and cache preparation added work without reducing the path.

### Cheaper arithmetic experiment

For the bounded benchmark data only, replacing `Math.hypot(dx, dy)` comparisons with
squared-distance comparisons produced the same answers on 60 independent checked
queries after 20 warmups. Hot-loop lookup was about 1 ms per million samples in both
engines. The separate gesture experiment gives a more conservative practical result:

| Engine   | Shape, 1M samples | Original search p50 / p95 | Experimental search p50 / p95 |
| -------- | ----------------- | ------------------------: | ----------------------------: |
| Chromium | smooth            |                 9.3 / 9.5 |                     3.2 / 4.1 |
| Chromium | noisy             |                 9.2 / 9.6 |                     2.6 / 4.0 |
| WebKit   | smooth            |                 8.0 / 8.0 |                     1.0 / 1.0 |

This experiment changes the benchmark's method temporarily and restores it afterward;
no production lookup or public API has changed. It is not safe to simply ship this
formula for every finite input: squared magnitudes can overflow/underflow and
rounding can change tied results. A production fast path needs numerical-range,
exact-duplicate and first-input tie tests, including extreme coordinates.

### Lifecycle memory

Corrected memory-only follow-ups used one fresh page per shape: ten replacements
of a mounted million-sample trace, then 100 create/update/destroy cycles for smooth
data and ten for noisy data. DOM counts are read without Playwright locator injection
before the baseline; otherwise the automation helper itself appears as new heap and
listeners. Numbers below are MiB after forced GC; RSS sums browser-reported processes.

| Shape  | Stage         | JS heap | Buffer/external storage | Process RSS sum | DOM nodes | Listeners |
| ------ | ------------- | ------: | ----------------------: | --------------: | --------: | --------: |
| smooth | warm-baseline |    1.82 |                    0.28 |           299.9 |         8 |        14 |
| smooth | mounted       |    2.14 |                   27.46 |           333.1 |      2258 |        28 |
| smooth | update-10     |    2.25 |                   27.46 |           347.0 |      2258 |        28 |
| smooth | destroyed     |    1.98 |                    0.28 |           320.2 |         8 |        14 |
| smooth | cycle-10      |    2.23 |                    0.28 |           329.4 |         8 |        14 |
| smooth | cycle-100     |    2.29 |                    0.28 |           335.5 |         8 |        14 |
| noisy  | warm-baseline |    1.82 |                    0.28 |           328.5 |         8 |        14 |
| noisy  | mounted       |    2.11 |                   25.73 |           453.5 |      2258 |        28 |
| noisy  | update-10     |    2.23 |                   25.73 |           495.6 |      2258 |        28 |
| noisy  | destroyed     |    1.98 |                    0.28 |           349.8 |         8 |        14 |
| noisy  | cycle-10      |    2.24 |                    0.28 |           358.4 |         8 |        14 |

Buffers, DOM nodes and listeners return to their baseline after destruction. Repeated
updates retain one dataset rather than accumulating old buffers. In the longer smooth
run, post-destroy JS heap was 2.23 MiB at cycle 10 and 2.29 MiB at cycle 100; buffer
storage stayed at 0.28 MiB, with 8 DOM nodes and 14 listeners throughout. This does
not indicate accumulating trace data or detached chart DOM in the tested lifecycles.

Process RSS does not return immediately to the initial baseline. For the smooth run
it rose from about 300 MiB at baseline to 329 MiB after ten cycles and 336 MiB after 100. RSS alone cannot distinguish allocator/raster caches from retained objects;
these runs are not proof of zero native/GPU leaks or measurements of peak allocation.

## Decision

**Optimize the existing linear lookup before introducing a spatial index.**

- At 100k samples, selection is already about 1–3 ms. Four 250k traces do not turn
  one marker move into a search over all one million samples.
- A single million-sample trace costs about 7–10 ms per marker query. This is a
  meaningful part of a 16.7 ms frame budget, even though the paced benchmark does
  not demonstrate sustained 60/120 Hz responsiveness.
- The bounded arithmetic experiment reduces real gesture search to roughly 2–3 ms
  in Chromium and 1 ms in WebKit without constructing another data structure.
  Implementing a numerically safe fast path and validating tie behavior is the
  smaller next step. Keep it separate from this measurement-only change.
- A spatial index would need build/update cost, memory, and exact tie-selection
  measurements of its own. Revisit it if a validated faster scan remains too slow
  on supported hardware or workloads require several million samples per trace.
- Heavy noisy SVG painting is a separate bottleneck. Neither a faster scan nor an
  index fixes the full-path zoom and WebKit repaint costs shown above. Keep line
  simplification opt-in and document cases where its preparation adds work without
  reducing geometry.

The [recorded summary](benchmarks/workloads-2026-10-09.json) retains the numeric
results behind these tables. The commands above write full per-query timings as JSON.
