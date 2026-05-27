export type ImageMime = 'image/webp' | 'image/jpeg';

export type ResponsiveSizeKey = '170' | '236' | '474' | '736' | 'orig';

export const RESPONSIVE_SIZES: ResponsiveSizeKey[] = ['170', '236', '474', '736', 'orig'];

export type ImageVariant = {
  url: string;
  width: number;
  height: number;
  type: ImageMime;
};

export type ResponsiveImages = Record<ResponsiveSizeKey, ImageVariant>;

export type Pin = {
  id: string;
  description: string;
  descriptionLower: string;
  width: number;
  height: number;
  dominantColor: string;
  responsive: ResponsiveImages;
  createdAt: number;
};

export type NewImageVariant = {
  blob: Blob;
  width: number;
  height: number;
  type: ImageMime;
};

export type NewResponsiveImages = Record<ResponsiveSizeKey, NewImageVariant>;

export type NewPin = {
  description: string;
  width: number;
  height: number;
  dominantColor: string;
  responsive: NewResponsiveImages;
};
