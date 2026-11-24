#!/bin/zsh
set -euo pipefail
project_dir=${0:A:h}
if [[ -f "$project_dir/reports/ColorMatchingLab.html" ]]; then
  open "$project_dir/reports/ColorMatchingLab.html"
else
  open "$project_dir/index.html"
fi
