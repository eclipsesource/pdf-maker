import { FontStore } from './font-loader.ts';
import { ImageStore } from './image-loader.ts';

export type MakerCtx = {
  fontStore: FontStore;
  imageStore: ImageStore;
  guides?: boolean;
};
