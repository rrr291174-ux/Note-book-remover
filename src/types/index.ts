export interface ImageState {
  images: ImageItem[];
  isEditorVisible: boolean;
}

export interface ImageItem {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
}

export interface WatermarkControls {
  bannerHeightPercent: number;
  bannerWidthPercent: number;
  bgColor: string;
  textColor: string;
  fontSizeMultiplier: number;
  offsetX: number;
  offsetY: number;
  fontFamily: string;
  watermarkText: string;
  imagesPerPage: number;
  imageSpacing: number;
  imagePadding: number;
  // PDF Professional Settings
  showTopBanner: boolean;
  showJoinButton: boolean;
  // Logo watermark properties
  showLogo: boolean;
  logoSrc: string | null;
  logoSize: number;
  logoPosition: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  logoOpacity: number;
  logoMargin: number;
}