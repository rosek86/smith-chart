#!/usr/bin/env bash
# Use only with a disposable checkout of the Pages repository.
set -euo pipefail

build_dir=$(cd "${1:?Pass the built site directory}" && pwd)
target_dir=$(cd "${2:?Pass a disposable target repository checkout}" && pwd)
source_revision=${GITHUB_SHA:-local}
workflow_file="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pages-workflow.yml"

if [[ ! -f "$build_dir/index.html" || ! -d "$target_dir/.git" ]]; then
  echo 'Expected a built index.html and a standalone target Git checkout.' >&2
  exit 1
fi
if [[ "$build_dir" == "$target_dir" || "$build_dir" == "$target_dir/"* || "$target_dir" == "$build_dir/"* ]]; then
  echo 'The build and deployment checkout must not contain one another.' >&2
  exit 1
fi
if [[ -n "$(git -C "$target_dir" status --porcelain)" ]]; then
  echo 'The deployment checkout must be clean.' >&2
  exit 1
fi

cd "$target_dir"
remote_branch=$(git ls-remote --heads origin refs/heads/gh-pages)
if [[ -n "$remote_branch" ]]; then
  git fetch --depth=1 origin gh-pages
  git checkout -B gh-pages FETCH_HEAD
else
  git switch --orphan gh-pages
fi

# Remove obsolete assets from this generated branch; keep Git metadata and custom domains.
rsync -a --delete --exclude=/.git/ --exclude=/CNAME "$build_dir/" "$target_dir/"
mkdir -p .github/workflows
cp "$workflow_file" .github/workflows/pages.yml
touch .nojekyll
git add --all
if git diff --cached --quiet; then
  echo 'The published site already matches this build.'
  exit 0
fi
git -c user.name='github-actions[bot]' \
    -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
    commit -m "Deploy smith-chart ${source_revision}"
git push origin HEAD:refs/heads/gh-pages
