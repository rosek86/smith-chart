# npm releases

The first planned registry release is **smithkit 0.1.0**. Local package metadata
is not evidence of a published version. Do not advertise `npm install smithkit`
as available until the registry release succeeds.

## API scope for 0.1.x

The supported entry point is `smithkit`; deep imports are not exported. Supported
chart, parser, and RF operations are documented in the README. Existing PascalCase
getters remain available. Dataset numbers are array indices, so removing an entry
shifts subsequent indices; marker events always report the current index.

The hyperbolic and reciprocal `Complex` operations are implemented with principal
inverse branches and signed-zero handling. The README documents their finite-input
contract and pole behavior. Independent reference values and branch-boundary tests
must pass before publishing numerical changes.

During 0.x development, document breaking changes in a minor release and fixes in
a patch release. Update the manifest, lockfile, changelog, and README archive example
together. A stable 1.0 release should follow validation in real consuming applications.

## First publication (one time)

1. Sign in to npm as the intended package owner with `npm login`, then check
   `npm whoami` and verify that `smithkit` is still available or owned by that account.
2. From the intended clean release commit, run:

   ```sh
   npm ci
   npm run check
   npx playwright install chromium
   npm run test:e2e
   npm run check:package
   npm pack
   npm publish ./smithkit-0.1.0.tgz --access public --ignore-scripts
   ```

   Complete npm's account/2FA prompts. This command publishes the real package,
   not a placeholder. Do not run it until the release is ready.

3. In npm package settings, configure a GitHub Actions trusted publisher:
   owner **rosek86**, repository **smith-chart**, workflow **release.yml**,
   environment **npm**, with direct `npm publish` allowed.
4. Record the published commit with the matching Git tag. The initial version was
   published manually; avoid triggering its automated publish again. Configure the
   workflow before publishing a GitHub Release for the next version.

## Subsequent releases

1. Update the version and changelog, commit the tested changes, and push them.
2. Create the matching tag (for example `v0.1.1`) and publish its GitHub Release.
3. `release.yml` verifies the tag against `package.json`, runs checks and browser
   tests, installs the tarball in an isolated consumer, and uploads the package.
4. A separate job publishes that exact archive using OIDC and provenance. It has
   no long-lived npm token and does not run package scripts during publication.

The workflow supports normal `x.y.z` versions. Prerelease versions and dist-tags
need an explicit workflow change. Failed publication can be rerun after fixing
account configuration; an already published version must not be republished.

Trusted publishing requires npm CLI 11.5.1+ and Node.js 22.14.0+; the workflow uses
Node.js 24. See the [official npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).
