import type { FontStore } from './font-store.ts';
import type { ImageLoader } from './image-loader.ts';

export type MakerCtx = {
  fontStore: FontStore;
  imageLoader: ImageLoader;
  guides?: boolean;
};
