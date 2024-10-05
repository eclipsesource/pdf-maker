# Running the examples

## Prerequisites

- A recent version of [Node], [Bun], or [Deno].

## Download fonts

Fonts are not included in the repository, but can be downloaded using
the `download-fonts.sh` script. This places the downloaded fonts in the
`fonts` directory.

```sh
$ ./download-fonts.sh
```

## Install dependencies

In the examples directory, use your favorite installer to install the
`pdfmkr` dependency.

```sh
$ cd examples
$ npm install
# OR
$ yarn install
# OR
$ bun install
```

If you're using [Deno], you can skip this step.

## Run the examples

```sh
$ node src/hello-world.js
# OR
$ bun run src/hello-world.js
# OR
$ deno run --allow-read --allow-write src/hello-world.js
```

### Pro-tip: watch mode

While experimenting with the examples, you can use the `--watch` flag to
automatically re-create a PDF when the file changes, e.g.:

```sh
$ bun run --watch src/hello-world.js
```

[Node]: https://nodejs.org/en/
[Bun]: https://bun.sh/
[Deno]: https://deno.land/
