#!/bin/bash
set -e

cd "$(dirname "$0")"

for file in *.ts; do
  echo "Running $file..."
  node "$file"
done

echo "All examples completed."
