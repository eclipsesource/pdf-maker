import { FontStore } from './font-loader.js';
import { ImageStore } from './image-loader.js';

export type MakerCtx = {
  fontStore: FontStore;
  imageStore: ImageStore;
  guides?: boolean;
};
