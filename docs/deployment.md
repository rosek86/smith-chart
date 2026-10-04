# Demo deployment

This guide is for maintainers of the demo site. Library users do not need to configure GitHub Pages.

Target URL: **https://rosek86.github.io/smith-app/**.
Source code and the workflow live in `rosek86/smith-chart`. The demo build output (`dist/demo/`) is
published to the separate `gh-pages` branch of `rosek86/smith-app`.

Pipeline: push to the default `master` branch → `npm ci` → type checking → unit tests
→ build → browser tests → artifact → commit and push to `smith-app/gh-pages`.
Pull requests run checks without publishing. You can also select **Run workflow**
on the default branch. The workflow also supports renaming the branch to `main`.

### One-time setup

1. Create a dedicated deployment key outside the repository:

   ```sh
   ssh-keygen -t ed25519 -C smith-chart-pages -f ~/.ssh/smith-app-pages -N ''
   ```

2. In **smith-app → Settings → Deploy keys**, add the contents of
   `~/.ssh/smith-app-pages.pub` and select **Allow write access**.
3. In **smith-chart → Settings → Secrets and variables → Actions → Secrets**,
   add a secret named **`SMITH_APP_DEPLOY_KEY`** containing the private key from
   `~/.ssh/smith-app-pages`.
4. In the **Variables** tab of the same repository, add
   **`SMITH_APP_DEPLOY_ENABLED` = `true`**. Without this variable, tests run
   but deployment remains disabled.
5. Push this repository's changes to GitHub and run the workflow. The first
   deployment creates the `gh-pages` branch in `smith-app`.
6. In **smith-app → Settings → Pages**, select **Deploy from a branch**,
   branch **gh-pages**, and folder **/(root)**. Once the Pages workflow finishes,
   the demo will be available at the target URL.

If a legacy Pages site still serves the old application after switching branches,
request its first rebuild once:

```sh
gh api repos/rosek86/smith-app/pages/builds --method POST
```

Confirm the published commit with `gh api repos/rosek86/smith-app/pages/builds/latest`.
Subsequent pushes to `gh-pages` trigger Pages builds automatically.

The key is needed because the standard `GITHUB_TOKEN` cannot write to another
repository. The workflow downloads the exact artifact that passed the tests,
preserves `gh-pages` history, removes obsolete hashed assets, and adds `.nojekyll`.
It does not overwrite `master` in `smith-app`, so the old Angular application remains
available in its history and on the original branch. An existing `CNAME` on
`gh-pages` is preserved. Vite generates relative asset URLs (`base: './'`) that
support the `/smith-app/` path.

To disable automatic deployment, set `SMITH_APP_DEPLOY_ENABLED` to `false`.
To restore the old application, change the Pages source from `gh-pages` back to
the original `master` branch.

Documentation: [Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site),
[checkout with an SSH key](https://github.com/actions/checkout),
[D3 event handling](https://d3js.org/d3-selection/events).
