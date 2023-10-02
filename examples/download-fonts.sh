#!/bin/sh
# Downloads DejaVu Sans Condensed fonts to fonts/ folder
# Usage: ./download-fonts.sh

cd "$(dirname "$0")"

# Create a fonts folder
mkdir -p fonts
cd fonts/

# Download the zip file
wget https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.zip

# Extract the zip file
unzip dejavu-fonts-ttf-2.37.zip

# Move the ttf files to the fonts folder
mv dejavu-fonts-ttf-2.37/ttf/DejaVuSansCondensed.ttf ./
mv dejavu-fonts-ttf-2.37/ttf/DejaVuSansCondensed-Bold.ttf ./
mv dejavu-fonts-ttf-2.37/ttf/DejaVuSansCondensed-Oblique.ttf ./
mv dejavu-fonts-ttf-2.37/ttf/DejaVuSansCondensed-BoldOblique.ttf ./

# Remove the zip file and the extracted folder
rm -rf dejavu-fonts-ttf-2.37.zip dejavu-fonts-ttf-2.37/
