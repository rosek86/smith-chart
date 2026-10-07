# npm releases

**smithkit 0.1.0** was published to npm on 2026-10-06. The
[GitHub Release](https://github.com/rosek86/smithkit/releases/tag/v0.1.0) points to
commit `663d8c55a7e06c572ce4c38bce53a79684d855f0` and includes the tested archive
and its manifest. The archive was verified against the published npm package.

## API scope

The supported entry point is `smithkit`; deep imports are not exported. Supported
chart, parser, and RF operations are documented in the README and reviewed in
[api-review.md](api-review.md). Traces and markers use stable IDs; readings expose
units in their field names. Events are discriminated unions with independent
subscriptions, and layer controls do not expose renderer objects. Historical
index-based methods and PascalCase getters are not exported.

The hyperbolic and reciprocal `Complex` operations are implemented with principal
inverse branches and signed-zero handling. Their finite-input contract and pole behavior are covered by the reference tests. Independent reference values and branch-boundary tests
must pass before publishing numerical changes.

During 0.x development, document breaking changes in a minor release and fixes in
a patch release. Update the manifest, lockfile, changelog, and version-specific examples
together. A stable 1.0 release should follow validation in real consuming applications.

## Release candidate validation

1. Merge the intended feature PRs and version/changelog updates through the normal
   review workflow. Use a clean checkout of the exact commit intended for release.
2. Run:

   ```sh
   npm ci
   npx playwright install chromium webkit
   npm run prepare:release
   ```

   This runs source checks, both demo browser suites, package type/runtime checks,
   and the standalone consumer example in both browsers. It packs only once and
   installs that archive for consumer verification.

3. Inspect `artifacts/release-manifest.json`: package name/version, source commit,
   archive filename, SHA-256, npm integrity, packed and unpacked sizes. Keep it with
   the matching archive in `artifacts/`. Source changes require a new verification run.
4. Review the notes for the version being released and the release date in the
   changelog. If publication moves to another day, update the date through a PR
   before preparing the final archive. Verify the final committed state again.

`prepare:release` does not publish, create tags, or create a GitHub Release.
CI uploads the tested archive and manifest as `smithkit-package`. Manual dispatch
of `release.yml` without a `release_tag` performs verification only and uploads
`npm-package`.

## Trusted publisher configuration

The `smithkit` package has a GitHub Actions trusted publisher configured in its
npm package settings:

- Owner: `rosek86`
- Repository: `smithkit`
- Workflow: `release.yml`
- Environment: `npm`
- Direct publication: allowed (`npm publish`)

The workflow uses the matching GitHub environment and `id-token: write` permission.
No long-lived npm token or local npm login is required for automated releases.
Changes to the repository, workflow filename, or environment must also be reflected
in the npm trusted-publisher configuration.

## Creating a release

1. Update the version, lockfile, changelog, release notes, and version-specific
   examples through a PR. Merge it, then validate the final release commit as above.
2. Create the matching tag (for example `v0.2.0`) at that exact commit and publish
   its GitHub Release with the reviewed notes.
3. `release.yml` verifies the tag against `package.json`, runs `prepare:release`,
   and uploads the exact tested archive and manifest.
4. A separate job publishes that exact archive using OIDC and provenance. It has
   no long-lived npm token and does not run package scripts during publication.
5. Confirm the workflow succeeds and the version is available in npm. Check installation
   in an independent project, and attach the workflow's tested archive and manifest
   to the GitHub Release.

Published versions and their tags must continue to identify the original archive.
Documentation changes after a release belong in a new PR; do not move the tag or
repack an existing version to include them.

The workflow supports normal `x.y.z` versions. Prerelease versions and dist-tags
need an explicit workflow change. Failed publication can be rerun after fixing
account configuration. To retry with the current workflow without moving a release
tag, run `release.yml` from the default branch and set `release_tag` to the existing
tag (for example `v0.2.0`). This verifies and publishes that tag's source. The same
input is rejected on other branches. Leave it empty for verification only.
An identical existing archive is skipped; a different archive requires a new version.

Trusted publishing requires npm CLI 11.5.1+ and Node.js 22.14.0+; the workflow uses
Node.js 24. See the [official npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).
