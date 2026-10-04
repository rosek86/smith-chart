# Repository guidance

- Treat this repository as a reusable library. Keep the demo as a consumer of its public API.
- Keep documentation, comments, UI labels, descriptions, and error messages in English.
- Use descriptive private field names without a leading underscore; ESLint enforces this.
- Run `npm run lint:fix` and `npm run format` for automatic cleanup. `npm run check` includes lint and formatting checks.
- Keep the TypeScript aliases: `@typescript/native` supplies the TypeScript 7 compiler; `typescript` supplies the TypeScript 6 API required by ESLint.
- Keep the public API exported from `src/index.ts`. Preserve compatibility unless a breaking change is explicitly part of the task.
- Use `.js` extensions for relative imports inside `src/`; TypeScript resolves them to source files and emits valid ESM imports.
- Keep RF calculations and parsing independent of the DOM. Do not import `demo/` from `src/` or access browser globals at module load time.
- Keep consumer documentation and working examples in `README.md`, contributor instructions in `CONTRIBUTING.md`, and demo deployment instructions in `docs/deployment.md`.
- Library output belongs in `dist/lib/`; demo output belongs in `dist/demo/`. Never include demo assets, tests, or deployment credentials in the npm package.
- For code or packaging changes, run `npm run check`. For rendering or interaction changes, also run `npm run test:e2e` against the built demo. For packaging changes, run `npm run check:package` to pack and install the library in a separate consumer project and check imports and types.
- Documentation-only changes need link/example review and `git diff --check`, not a full test run.
- The sibling `smith-app-ng` repository is a legacy Angular application. Do not modify it as a side effect of library changes.

See `CONTRIBUTING.md` for setup, architecture, and known technical debt.
