"""Regenerate independent finite-value fixtures with Python's standard cmath module.

Run from any directory, then format the JSON with the project's Prettier command.
Python is only needed for regeneration, not for running the TypeScript tests.
Branch convention: https://docs.python.org/3/library/cmath.html
"""
import cmath
import json
import math
from pathlib import Path

def reciprocal(z):
    # Python complex division can erase signed zeros; retain the side of the cut.
    value = 1 / z
    return complex(math.copysign(0.0, z.real) if z.real == 0 else value.real,
                   math.copysign(0.0, -z.imag) if z.imag == 0 else value.imag)


functions = {
    "sinh": cmath.sinh,
    "cosh": cmath.cosh,
    "tanh": cmath.tanh,
    "asinh": cmath.asinh,
    "acosh": cmath.acosh,
    "atanh": cmath.atanh,
    "coth": lambda z: 1 / cmath.tanh(z),
    "acoth": lambda z: cmath.atanh(reciprocal(z)),
    "sec": lambda z: 1 / cmath.cos(z),
    "sech": lambda z: 1 / cmath.cosh(z),
    "asech": lambda z: cmath.acosh(reciprocal(z)),
    "csc": lambda z: 1 / cmath.sin(z),
    "csch": lambda z: 1 / cmath.sinh(z),
    "acsch": lambda z: cmath.asinh(reciprocal(z)),
}
common = [complex(1, 2), complex(-1, 2), complex(-1, -2), complex(1, -2),
          complex(.25, .5), complex(-2.5, .125), complex(2, 0), complex(0, 2)]
extra = {
    name: [complex(1e-300, 1e-300), complex(1e300, 1e300),
           complex(-1e300, 1e300), complex(1e-20, .5), complex(.5, 1e-20),
           complex(1, 1e-12), complex(-1, 1e-12), complex(1e-12, 1),
           complex(1e-12, -1)]
    for name in ['asinh', 'acosh', 'atanh', 'acoth', 'asech', 'acsch']
}
extra.update({
    'sinh': [complex(710, .5), complex(-710, .5), complex(1e-300, 1e-300)],
    'cosh': [complex(710, .5), complex(-710, .5), complex(1e-300, 1e-300)],
    'tanh': [complex(700, .5), complex(-700, .5), complex(20, .5), complex(1e-300, 1e-300)],
    'coth': [complex(700, .5), complex(-700, .5), complex(20, .5), complex(1e-300, 1e-300)],
    'sech': [complex(700, .5), complex(-700, .5), complex(1e-300, 1e-300)],
    'csch': [complex(700, .5), complex(-700, .5), complex(1e-300, 1e-300)],
    'sec': [complex(.5, 700), complex(.5, -700), complex(1e-300, 1e-300)],
    'csc': [complex(.5, 700), complex(.5, -700), complex(1e-300, 1e-300)],
})
rows = []
for name, function in functions.items():
    for z in common + extra.get(name, []):
        result = function(z)
        assert math.isfinite(result.real) and math.isfinite(result.imag), (name, z)
        rows.append({'operation': name, 'input': [z.real, z.imag],
                     'expected': [result.real, result.imag]})
path = Path(__file__).resolve().parent.parent / 'tests/fixtures/complex-reference.json'
path.write_text(json.dumps(rows, indent=2, allow_nan=False) + '\n')
print(f'Generated {len(rows)} reference cases.')
