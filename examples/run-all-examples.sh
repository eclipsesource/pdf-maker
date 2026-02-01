#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -d "fonts" ]; then
  echo "Fonts not found. Run ./download-fonts.sh first."
  exit 1
fi

for file in *.ts; do
  echo "Running $file..."
  node "$file"
done

echo "All examples completed."
