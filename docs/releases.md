# npm releases

The first planned registry release is **smithkit 0.1.0**. Local package metadata
is not evidence of a published version. Do not advertise `npm install smithkit`
as available until the registry release succeeds.

## API scope for 0.1.x

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
a patch release. Update the manifest, lockfile, changelog, and README archive example
together. A stable 1.0 release should follow validation in real consuming applications.

## Release candidate validation

1. Merge the intended feature PRs and release-preparation PR through the normal
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
   `artifacts/smithkit-0.1.0.tgz`. Source changes require a new verification run.
4. Review [the 0.1.0 release notes](releases/0.1.0.md), update the changelog's release
   date when cutting the release, and verify the final committed state again.

`prepare:release` does not publish, create tags, or create a GitHub Release.
CI uploads the tested archive and manifest as `smithkit-package`. Manual dispatch
of `release.yml` performs verification only and uploads `npm-package`.

## Publication prerequisites

- The intended npm owner must be signed in locally for the first publication.
  Verify with `npm whoami`; use `npm login` if needed.
- Check `npm view smithkit name version maintainers --json`. A 404 means the registry
  currently has no visible package; it does not reserve the name or guarantee that
  npm will accept publication.
- The GitHub repository uses an environment named `npm`. Its name must exactly
  match the trusted-publisher configuration after the first package is published.
- Trusted publishing is configured on npm for the package, not through a GitHub
  secret. GitHub environment existence alone does not prove that trust is configured.

## First publication (one time)

1. Sign in to npm as the intended package owner with `npm login`, then check
   `npm whoami` and verify that `smithkit` is still available or owned by that account.
2. Prepare the archive using the steps above, then publish that exact tested file:

   ```sh
   npm publish ./artifacts/smithkit-0.1.0.tgz --access public --ignore-scripts
   ```

   Complete npm's account/2FA prompts. This is the publication step; preparation
   and a dry run cannot verify publishing authorization. Do not repack after the
   consumer checks or publish an archive whose recorded commit is not the release commit.

3. In npm package settings, configure a GitHub Actions trusted publisher:
   owner **rosek86**, repository **smithkit**, workflow **release.yml**,
   environment **npm**, with direct `npm publish` allowed.
4. Record the exact manifest commit with tag `v0.1.0` and create its GitHub Release
   using the prepared notes. The workflow verifies the tag and rebuilds the archive.
   If the registry already contains the identical archive, publication is skipped.
   If the same version has different integrity, the workflow fails rather than
   attempting to overwrite it. Registry/network errors also stop publication.

## Subsequent releases

1. Update the version and changelog, commit the tested changes, and push them.
2. Create the matching tag (for example `v0.1.1`) and publish its GitHub Release.
3. `release.yml` verifies the tag against `package.json`, runs `prepare:release`,
   and uploads the exact tested archive and manifest.
4. A separate job publishes that exact archive using OIDC and provenance. It has
   no long-lived npm token and does not run package scripts during publication.

The workflow supports normal `x.y.z` versions. Prerelease versions and dist-tags
need an explicit workflow change. Failed publication can be rerun after fixing
account configuration. An identical existing archive is skipped; a different
archive requires a new version.

Trusted publishing requires npm CLI 11.5.1+ and Node.js 22.14.0+; the workflow uses
Node.js 24. See the [official npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).
