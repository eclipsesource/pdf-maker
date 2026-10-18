import type { FontStore } from './font-store.ts';
import type { ImageLoader } from './image-loader.ts';
import type { ShapeCache } from './text.ts';

export type MakerCtx = {
  fontStore: FontStore;
  imageLoader: ImageLoader;
  shapeCache: ShapeCache;
  guides?: boolean;
};
