import { decodeBase64 } from './base64.ts';
import { readRelativeFile } from './fs.ts';

export type DataLoaderConfig = {
  resourceRoot?: string;
};

export type DataLoader = (
  url: string,
  config?: DataLoaderConfig,
) => DataLoaderResult | Promise<DataLoaderResult>;

export type DataLoaderResult = {
  data: Uint8Array;
};

export function createDataLoader(config?: DataLoaderConfig): DataLoader {
  const loaders: Record<string, DataLoader> = {
    http: loadHttp,
    https: loadHttp,
    data: loadData,
    file: loadFile,
  };

  return async function (url: string): Promise<DataLoaderResult> {
    const schema = getUrlSchema(url).slice(0, -1);
    const loader = loaders[schema];
    if (!loader) {
      throw new Error(`URL not supported: '${url}'`);
    }
    return await loader(url, config);
  };
}

function getUrlSchema(url: string) {
  try {
    return new URL(url).protocol;
  } catch {
    throw new Error(`Invalid URL: '${url}'`);
  }
}

function loadData(url: string) {
  if (!url.startsWith('data:')) {
    throw new Error(`Not a data URL: '${url}'`);
  }
  const endOfHeader = url.indexOf(',');
  if (endOfHeader === -1) {
    throw new Error(`Invalid data URL: '${url}'`);
  }
  const header = url.slice(5, endOfHeader);
  if (!header.endsWith(';base64')) {
    throw new Error(`Unsupported encoding in data URL: '${url}'`);
  }
  const dataPart = url.slice(endOfHeader + 1);
  const data = new Uint8Array(decodeBase64(dataPart));
  return { data };
}

async function loadHttp(url: string) {
  if (!url.startsWith('http:') && !url.startsWith('https:')) {
    throw new Error(`Not a http(s) URL: '${url}'`);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Received ${response.status} ${response.statusText}`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  return { data };
}

async function loadFile(url: string, config?: DataLoaderConfig) {
  if (!url.startsWith('file:')) {
    throw new Error(`Not a file URL: '${url}'`);
  }
  if (!config?.resourceRoot) {
    throw new Error('No resource root defined');
  }
  const urlPath = decodeURIComponent(new URL(url).pathname);
  const relPath = urlPath.replace(/^\//g, '');
  const data = new Uint8Array(await readRelativeFile(config.resourceRoot, relPath));
  return { data };
}
