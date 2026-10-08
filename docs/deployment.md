# Demo deployment

This guide is for maintainers of the demo site. Library users do not need to configure GitHub Pages.

Target URL: **https://rosek86.github.io/smithkit/**.
The source, checks, and deployment workflow all live in `rosek86/smithkit`.
GitHub Pages serves the built demo from `dist/demo/`, not the source files on `main`.

## Pipeline

A push to `main` runs `.github/workflows/ci.yml`:

1. Install dependencies and Chromium/WebKit.
2. Run `npm run prepare:release` to check the source, build the library and demo,
   test both browsers, and verify the packed library and standalone consumer.
3. Upload `dist/demo/` as the `github-pages` artifact.
4. Deploy that exact artifact with `actions/deploy-pages` after checks pass.

Pull requests run the same checks and upload artifacts without deploying.
You can also select **Actions → Check and publish Smith chart → Run workflow**
on `main` to retry a deployment. Runs on other branches cannot deploy.
Preparing a release archive does not publish the npm package.

The deployment job uses the `github-pages` environment and a short-lived
`GITHUB_TOKEN` with `pages: write` and `id-token: write`. No deployment key,
personal access token, separate repository, or generated Git branch is needed.
The check job retains read-only repository permissions.

## Repository setup

1. In **smithkit → Settings → Pages**, select **GitHub Actions** as the source.
2. In **Settings → Environments → github-pages**, allow deployments from `main`.
3. Merge the workflow into `main`. Its successful run publishes the demo.
4. In the repository's **About** settings, enable **Use your GitHub Pages website**.
   The generated link points to `/smithkit/`.

## Verification

Check that both the `check` and `deploy` jobs succeed. The deployment job exposes
its URL from the Pages action output; open it and verify the chart loads and the
controls work. A successful build alone does not confirm publication.

Vite generates relative asset URLs (`base: './'`). Browser tests serve the built
demo under `/smithkit/`, matching the public site path. The Pages artifact contains
`index.html` at its root, the integration gallery under `examples/`, and shared
built assets. Example links and generated asset URLs work under the project path
and on direct navigation to nested pages.

To stop automatic publication temporarily while retaining checks, disable the
`deploy` job in `.github/workflows/ci.yml` through a pull request. To unpublish the
site, use **Settings → Pages → Unpublish site**.

Documentation: [custom GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
