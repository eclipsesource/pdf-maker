import { FontStore } from './fonts.js';
import { ImageStore } from './images.js';

export type MakerCtx = {
  fontStore: FontStore;
  imageStore: ImageStore;
  guides?: boolean;
};
