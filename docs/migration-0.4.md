# Migration to 0.4.0

These changes are unreleased and scheduled for the next minor version.

## Constructor options

Replace positional arguments with one optional `SmithOptions` object:

```ts
// 0.3.x
const chart = new Smith(75, { theme: 'dark' });

// 0.4.x
const chart = new Smith({
  referenceImpedanceOhms: 75,
  appearance: { theme: 'dark' },
  grid: { detail: 'basic', labelsVisible: true },
  zoomEnabled: false,
  peripheralScalesVisible: false,
});
```

`new Smith()` now starts with a standard impedance grid and labels, hidden
peripheral scales, and zoom/cursor tracking disabled. To retain the 0.3.x
interactive defaults explicitly:

```ts
const chart = new Smith({
  grid: { detail: 'detailed' },
  peripheralScalesVisible: true,
  zoomEnabled: true,
  cursorEnabled: true,
});
```

`setCursorEnabled()` changes tracking at runtime; disabling clears the readout
and cancels queued cursor events, without affecting markers or zoom.
Initial configuration can
replace sequences of layer setter calls. Shared `grid` settings are applied first,
then per-layer options under `layers`. Styles merge by property. Runtime setters
remain available, including `chart.setGridDetail(detail)` for all four grids and
`chart.layers.q.setValues(values)` / `chart.layers.vswr.setValues(values)` for
replacing circle values. `setGridDetail()` preserves visibility, styling, and view.

## Explicit markers

`addTrace()` now adds only a trace. Add as many markers as needed explicitly:

```ts
const traceId = chart.addTrace(samples, { name: 'Antenna' });
const firstMarker = chart.addMarker(traceId)!; // Sample 0.
const secondMarker = chart.addMarker(traceId, 2)!; // Sample 2.
```

Code that reads `getTraces()[0].markers[0]` immediately after `addTrace()` must
create that marker first. Prefer retaining the ID returned by `addMarker()`.
Static charts need no marker-removal loop. Updating a trace retains its existing
markers and does not add new ones. Marker numbering still starts at 1 per trace.

## Running examples before publication

The examples target 0.4.0. Until it is published, use `npm pack` from this checkout
and install the resulting archive in the example directory, as described in the
[examples guide](../examples/README.md). The packed checkout is currently versioned
0.3.0; the manifest version is advanced during release preparation.
