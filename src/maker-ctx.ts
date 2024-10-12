import type { FontStore } from './font-store.ts';
import type { ImageStore } from './image-loader.ts';

export type MakerCtx = {
  fontStore: FontStore;
  imageStore: ImageStore;
  guides?: boolean;
};
