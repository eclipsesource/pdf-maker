import type { FontStore } from './font-loader.ts';
import type { ImageStore } from './image-loader.ts';

export type MakerCtx = {
  fontStore: FontStore;
  imageStore: ImageStore;
  guides?: boolean;
};
