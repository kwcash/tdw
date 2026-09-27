#!/usr/bin/env bash
# One-time toolchain install for build.sh (Ubuntu/Debian; run as root or with sudo).
# macOS: brew install pandoc poppler openjdk && brew install --cask mactex-no-gui,
# plus the Noto Serif CJK TC font; then fetch epubcheck as below.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  pandoc texlive-xetex texlive-latex-recommended texlive-latex-extra \
  texlive-fonts-recommended lmodern fonts-noto-cjk poppler-utils \
  default-jre-headless python3 curl unzip
# epubcheck 5 (the distro package is the older 4.x line)
mkdir -p /opt/epubcheck
curl -sSL -o /tmp/epubcheck.zip \
  https://github.com/w3c/epubcheck/releases/download/v5.2.1/epubcheck-5.2.1.zip
unzip -q -o /tmp/epubcheck.zip -d /opt/epubcheck
echo "epubcheck at /opt/epubcheck/epubcheck-5.2.1/epubcheck.jar"
