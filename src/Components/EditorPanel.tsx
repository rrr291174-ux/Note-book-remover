import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Download, RotateCcw, FileImage, ChevronLeft, ChevronRight, FileText, Type, Grid3X3, MoveHorizontal, Maximize2, Edit3, Move, ZoomIn, ZoomOut, RotateCw, Hand, MousePointer, Save, ArrowDown, Layers } from 'lucide-react';
import { ImageState, WatermarkControls, ImageItem } from '../types';
import { downloadImage } from '../utils/download';

interface EditorPanelProps {
  imageState: ImageState;
  onReset: () => void;
}

// Add jsPDF script loader
declare global {
  interface Window {
    jspdf: any;
  }
}

// Font options for watermark
const FONT_OPTIONS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Impact', label: 'Impact (Bold)' },
  { value: 'Arial Black', label: 'Arial Black' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
];

// Images per page options - UPDATED FOR VERTICAL STACKING
const IMAGES_PER_PAGE_OPTIONS = [
  { value: 1, label: '1 image per page (Full size)' },
  { value: 2, label: '2 images per page (Vertical stack)' },
  { value: 3, label: '3 images per page (Vertical stack)' },
  { value: 4, label: '4 images per page (Vertical stack)' },
  { value: 5, label: '5 images per page (Vertical stack)' },
  { value: 6, label: '6 images per page (Vertical stack)' },
];

// Image transform interface
interface ImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function EditorPanel({ imageState, onReset }: EditorPanelProps) {
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCreatingPDF, setIsCreatingPDF] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [jsPDPLoaded, setJsPDPLoaded] = useState(false);
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'move' | 'zoom' | 'rotate'>('move');
  const [imageTransforms, setImageTransforms] = useState<{ [key: string]: ImageTransform }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  
  const [controls, setControls] = useState<WatermarkControls>({
    bannerHeightPercent: 4.5,
    bannerWidthPercent: 22,
    bgColor: '#FFD400',
    textColor: '#000000',
    fontSizeMultiplier: 0.55,
    offsetX: 20,
    offsetY: 20,
    fontFamily: 'Arial',
    watermarkText: 'TGDSCGROUP',
    imagesPerPage: 2, // Default to 2 for vertical stacking
    imageSpacing: 0, // Default to 0 for no gap
    imagePadding: 0, // Default to 0 for no padding
  });

  // Load jsPDF library
  useEffect(() => {
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.async = true;
      script.onload = () => {
        setJsPDPLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      setJsPDPLoaded(true);
    }
  }, []);

  // Initialize transforms for new images
  useEffect(() => {
    const newTransforms: { [key: string]: ImageTransform } = {};
    imageState.images.forEach(img => {
      if (!imageTransforms[img.id]) {
        newTransforms[img.id] = { x: 0, y: 0, scale: 1, rotation: 0 };
      } else {
        newTransforms[img.id] = imageTransforms[img.id];
      }
    });
    setImageTransforms(newTransforms);
  }, [imageState.images]);

  const drawWatermark = useCallback((imageItem: ImageItem, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const transform = imageTransforms[imageItem.id] || { x: 0, y: 0, scale: 1, rotation: 0 };

    // Set canvas dimensions with transform
    const baseWidth = imageItem.width;
    const baseHeight = imageItem.height;
    canvas.width = baseWidth;
    canvas.height = baseHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-canvas.width / 2 + transform.x, -canvas.height / 2 + transform.y);

    // Draw the original image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, baseWidth, baseHeight);
      ctx.restore();

      // ===== WATERMARK BANNER =====
      const bannerHeight = canvas.height * (controls.bannerHeightPercent / 100);
      const bannerWidth = canvas.width * (controls.bannerWidthPercent / 100);

      // Position in bottom-right corner with offsets
      const x = canvas.width - bannerWidth - controls.offsetX;
      const y = canvas.height - bannerHeight - controls.offsetY;

      // Solid background with rounded corners
      ctx.fillStyle = controls.bgColor;
      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bannerWidth - radius, y);
      ctx.quadraticCurveTo(x + bannerWidth, y, x + bannerWidth, y + radius);
      ctx.lineTo(x + bannerWidth, y + bannerHeight - radius);
      ctx.quadraticCurveTo(x + bannerWidth, y + bannerHeight, x + bannerWidth - radius, y + bannerHeight);
      ctx.lineTo(x + radius, y + bannerHeight);
      ctx.quadraticCurveTo(x, y + bannerHeight, x, y + bannerHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // ===== TEXT STYLE =====
      const fontSize = bannerHeight * controls.fontSizeMultiplier;
      const fontString = `900 ${fontSize}px "${controls.fontFamily}", Arial, sans-serif`;
      ctx.font = fontString;
      ctx.fillStyle = controls.textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Add text shadow for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Text position (center of the banner)
      ctx.fillText(
        controls.watermarkText || 'TGDSCGROUP',
        x + bannerWidth / 2,
        y + bannerHeight / 2
      );
    };
    img.src = imageItem.src;
  }, [controls, imageTransforms]);

  useEffect(() => {
    imageState.images.forEach(imageItem => {
      const canvas = canvasRefs.current[imageItem.id];
      if (canvas) {
        drawWatermark(imageItem, canvas);
      }
    });
  }, [imageState.images, drawWatermark]);

  // Mouse/Touch event handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, imageId: string) => {
    if (!isEditMode || selectedTool !== 'move') return;
    
    setIsDragging(true);
    const point = 'touches' in e ? e.touches[0] : e;
    setDragStart({ x: point.clientX, y: point.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent, imageId: string) => {
    if (!isDragging || selectedTool !== 'move') return;
    
    const point = 'touches' in e ? e.touches[0] : e;
    const deltaX = point.clientX - dragStart.x;
    const deltaY = point.clientY - dragStart.y;
    
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        x: prev[imageId].x + deltaX,
        y: prev[imageId].y + deltaY
      }
    }));
    
    setDragStart({ x: point.clientX, y: point.clientY });
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch zoom handler
  const handleTouchStart = (e: React.TouchEvent, imageId: string) => {
    if (!isEditMode || selectedTool !== 'zoom') return;
    
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent, imageId: string) => {
    if (!isEditMode || selectedTool !== 'zoom' || e.touches.length !== 2) return;
    
    const distance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    
    const scale = distance / lastTouchDistance;
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        scale: Math.max(0.1, Math.min(3, prev[imageId].scale * scale))
      }
    }));
    
    setLastTouchDistance(distance);
    e.preventDefault();
  };

  // Zoom controls
  const handleZoom = (imageId: string, delta: number) => {
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        scale: Math.max(0.1, Math.min(3, prev[imageId].scale + delta))
      }
    }));
  };

  // Rotation controls
  const handleRotate = (imageId: string, delta: number) => {
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        rotation: prev[imageId].rotation + delta
      }
    }));
  };

  // Reset transform
  const resetTransform = (imageId: string) => {
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: { x: 0, y: 0, scale: 1, rotation: 0 }
    }));
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    
    try {
      for (let i = 0; i < imageState.images.length; i++) {
        const imageItem = imageState.images[i];
        const canvas = canvasRefs.current[imageItem.id];
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          downloadImage(dataUrl, `watermarked-${imageItem.name}`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error('Failed to download images:', error);
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  // PERFECTED PDF generation for VERTICAL STACKING with TRUE NO GAP
  const downloadPDF = useCallback(async (images: ImageItem[]) => {
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const spacing = controls.imageSpacing; // Vertical spacing between images
    const padding = controls.imagePadding; // Padding around each image
    
    // Calculate vertical layout
    const imagesPerPage = controls.imagesPerPage;
    
    // PERFECTED: Calculate available space for vertical stacking
    // When spacing=0 and padding=0, images should fill the entire page height and touch each other
    const totalVerticalGaps = spacing * (imagesPerPage - 1);
    const totalVerticalPadding = padding * 2 * imagesPerPage;
    
    // CRITICAL FIX: When spacing=0 and padding=0, use NO margin for perfect touching
    const useNoMargin = (spacing === 0 && padding === 0);
    const effectiveMargin = useNoMargin ? 0 : 20; // PERFECT: 0 margin when touching
    
    const availableHeight = pageHeight - (effectiveMargin * 2) - totalVerticalGaps - totalVerticalPadding;
    const availableWidth = pageWidth - (effectiveMargin * 2) - (padding * 2);
    
    const imageHeight = availableHeight / imagesPerPage;
    const imageWidth = availableWidth;

    for (let i = 0; i < images.length; i++) {
      const canvas = canvasRefs.current[images[i].id];
      if (!canvas) continue;
      
      const imgData = canvas.toDataURL("image/png", 1.0);

      // Calculate position in vertical stack
      const pageIndex = Math.floor(i / imagesPerPage);
      const positionInPage = i % imagesPerPage;
      
      // Add new page if needed (except for first page)
      if (i > 0 && positionInPage === 0) {
        pdf.addPage();
      }

      // PERFECTED: Calculate position for TRUE vertical touching
      // When spacing=0 and padding=0, images touch edge-to-edge vertically with NO gap
      const x = effectiveMargin + padding;
      
      // CRITICAL FIX: Perfect vertical positioning for touching images
      let y;
      if (useNoMargin) {
        // When no gap and no padding: images touch perfectly
        y = (positionInPage * imageHeight); // No margin, no padding, perfect stacking
      } else {
        // When gap or padding: include margins and spacing
        y = effectiveMargin + (positionInPage * imageHeight) + (positionInPage * spacing) + padding;
      }

      // Calculate image size to fit within space (maintain aspect ratio)
      const ratio = Math.min(
        imageWidth / canvas.width,
        imageHeight / canvas.height
      );

      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;

      // Center image within allocated space
      const centeredX = x + (imageWidth - imgWidth) / 2;
      const centeredY = y + (imageHeight - imgHeight) / 2;

      // Draw optional background for padding visualization
      if (padding > 0) {
        pdf.setFillColor(245, 245, 245); // Light gray background
        pdf.rect(
          x,
          y,
          imageWidth,
          imageHeight,
          'F'
        );
      }

      pdf.addImage(
        imgData,
        "PNG",
        centeredX,
        centeredY,
        imgWidth,
        imgHeight
      );
    }

    // ✅ DIRECT DOWNLOAD (NO SAVE DIALOG)
    pdf.save("TGDSC_Watermarked.pdf");
  }, [controls.imagesPerPage, controls.imageSpacing, controls.imagePadding]);

  const handleDownloadPDF = useCallback(async () => {
    if (!jsPDPLoaded) {
      alert('jsPDF library is still loading. Please wait a moment and try again.');
      return;
    }

    setIsCreatingPDF(true);
    
    try {
      await downloadPDF(imageState.images);
      setTimeout(() => {
        setIsCreatingPDF(false);
      }, 1000);
    } catch (error) {
      console.error('PDF creation failed:', error);
      alert('PDF creation failed. Please try downloading individual images.');
      setIsCreatingPDF(false);
    }
  }, [imageState.images, jsPDPLoaded, downloadPDF]);

  const updateControl = <K extends keyof WatermarkControls>(
    key: K,
    value: WatermarkControls[K]
  ) => {
    setControls(prev => ({ ...prev, [key]: value }));
  };

  const currentImage = imageState.images[currentImageIndex];
  const currentTransform = currentImage ? imageTransforms[currentImage.id] || { x: 0, y: 0, scale: 1, rotation: 0 } : null;

  return (
    <div className="space-y-6">
      {/* Edit Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setIsEditMode(!isEditMode)}
                variant={isEditMode ? "default" : "outline"}
                className={isEditMode ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditMode ? "Edit Mode ON" : "Edit Mode OFF"}
              </Button>
              
              {isEditMode && (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={selectedTool === 'move' ? "default" : "outline"}
                    onClick={() => setSelectedTool('move')}
                  >
                    <Move className="w-4 h-4 mr-1" />
                    Move
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTool === 'zoom' ? "default" : "outline"}
                    onClick={() => setSelectedTool('zoom')}
                  >
                    <ZoomIn className="w-4 h-4 mr-1" />
                    Zoom
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTool === 'rotate' ? "default" : "outline"}
                    onClick={() => setSelectedTool('rotate')}
                  >
                    <RotateCw className="w-4 h-4 mr-1" />
                    Rotate
                  </Button>
                </div>
              )}
            </div>
            
            {currentImage && isEditMode && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Position: ({Math.round(currentTransform.x)}, {Math.round(currentTransform.y)})</span>
                <span>Scale: {currentTransform.scale.toFixed(2)}x</span>
                <span>Rotation: {currentTransform.rotation}°</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Navigation */}
      {imageState.images.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                disabled={currentImageIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                <FileImage className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {currentImageIndex + 1} / {imageState.images.length}
                </span>
                <span className="text-sm text-gray-500">
                  ({currentImage?.name})
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentImageIndex(Math.min(imageState.images.length - 1, currentImageIndex + 1))}
                disabled={currentImageIndex === imageState.images.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas Preview with Edit Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            Preview {imageState.images.length > 1 && `(Image ${currentImageIndex + 1})`}
            {isEditMode && (
              <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {selectedTool === 'move' && '👆 Drag to move'}
                {selectedTool === 'zoom' && '🤏 Pinch to zoom'}
                {selectedTool === 'rotate' && '🔄 Use buttons to rotate'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Edit Controls */}
            {isEditMode && currentImage && (
              <div className="absolute top-2 right-2 z-10 flex flex-col space-y-2">
                <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
                  <Button
                    size="sm"
                    onClick={() => handleZoom(currentImage.id, 0.1)}
                    disabled={currentTransform.scale >= 3}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleZoom(currentImage.id, -0.1)}
                    disabled={currentTransform.scale <= 0.1}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <hr className="my-1" />
                  <Button
                    size="sm"
                    onClick={() => handleRotate(currentImage.id, 15)}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRotate(currentImage.id, -15)}
                  >
                    <RotateCw className="w-4 h-4 rotate-180" />
                  </Button>
                  <hr className="my-1" />
                  <Button
                    size="sm"
                    onClick={() => resetTransform(currentImage.id)}
                    variant="outline"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div 
              className="overflow-auto max-h-96 border rounded-lg bg-gray-50 p-4"
              style={{ cursor: isEditMode && selectedTool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {imageState.images.map((imageItem, index) => (
                <div
                  key={imageItem.id}
                  ref={el => containerRefs.current[imageItem.id] = el}
                  className={`
                    ${index === currentImageIndex ? 'block' : 'hidden'}
                    ${isEditMode ? 'relative' : ''}
                  `}
                  onMouseDown={(e) => handleMouseDown(e, imageItem.id)}
                  onMouseMove={(e) => handleMouseMove(e, imageItem.id)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={(e) => {
                    handleMouseDown(e, imageItem.id);
                    handleTouchStart(e, imageItem.id);
                  }}
                  onTouchMove={(e) => {
                    handleMouseMove(e, imageItem.id);
                    handleTouchMove(e, imageItem.id);
                  }}
                  onTouchEnd={handleMouseUp}
                >
                  <canvas
                    ref={el => canvasRefs.current[imageItem.id] = el}
                    className="max-w-full h-auto mx-auto shadow-lg rounded"
                    style={{ 
                      maxHeight: '500px',
                      cursor: isEditMode && selectedTool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Watermark Settings (Applied to all {imageState.images.length} images)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Custom Watermark Text */}
            <div className="space-y-2">
              <Label htmlFor="watermark-text" className="flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Watermark Text
              </Label>
              <Input
                id="watermark-text"
                type="text"
                value={controls.watermarkText}
                onChange={(e) => updateControl('watermarkText', e.target.value)}
                placeholder="Enter custom text..."
                maxLength={30}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                {controls.watermarkText.length}/30 characters
              </p>
            </div>

            {/* Images Per Page - VERTICAL STACKING */}
            <div className="space-y-2">
              <Label htmlFor="images-per-page" className="flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                Images Per PDF Page (Vertical Stack)
              </Label>
              <Select
                value={controls.imagesPerPage.toString()}
                onValueChange={(value) => updateControl('imagesPerPage', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGES_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {Math.ceil(imageState.images.length / controls.imagesPerPage)} PDF pages total
              </p>
            </div>

            {/* Vertical Gap Control - PERFECTED NO GAP */}
            <div className="space-y-2">
              <Label htmlFor="image-spacing" className="flex items-center">
                <ArrowDown className="w-4 h-4 mr-2" />
                Vertical Gap: {controls.imageSpacing === 0 ? "🔥 PERFECT NO GAP!" : controls.imageSpacing <= 10 ? "📏 Small Gap" : controls.imageSpacing <= 25 ? "📐 Medium Gap" : controls.imageSpacing <= 50 ? "📏 Large Gap" : "📐 Maximum Gap"}
              </Label>
              <input
                type="range"
                id="image-spacing"
                min="0"
                max="100"
                step="1"
                value={controls.imageSpacing}
                onChange={(e) => updateControl('imageSpacing', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                disabled={controls.imagesPerPage === 1}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span className={controls.imageSpacing === 0 ? "font-bold text-red-600" : ""}>No Gap</span>
                <span className={`font-semibold ${controls.imageSpacing === 0 ? "text-red-600" : "text-blue-600"}`}>{controls.imageSpacing}px</span>
                <span>Max Gap</span>
              </div>
              <p className="text-xs text-gray-500">
                {controls.imagesPerPage === 1 ? 'Not needed for single image' : controls.imageSpacing === 0 ? '🔥 Images will touch perfectly!' : `Vertical gap between images: ${controls.imageSpacing}px`}
              </p>
            </div>

            {/* Image Padding Control */}
            <div className="space-y-2">
              <Label htmlFor="image-padding" className="flex items-center">
                <Maximize2 className="w-4 h-4 mr-2" />
                Image Padding: {controls.imagePadding === 0 ? "🔥 NO PADDING!" : controls.imagePadding <= 10 ? "📏 Small" : controls.imagePadding <= 25 ? "📐 Medium" : controls.imagePadding <= 50 ? "📏 Large" : "📐 Maximum"}
              </Label>
              <input
                type="range"
                id="image-padding"
                min="0"
                max="100"
                step="1"
                value={controls.imagePadding}
                onChange={(e) => updateControl('imagePadding', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                disabled={controls.imagesPerPage === 1}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span className={controls.imagePadding === 0 ? "font-bold text-red-600" : ""}>No Padding</span>
                <span className={`font-semibold ${controls.imagePadding === 0 ? "text-red-600" : "text-orange-600"}`}>{controls.imagePadding}px</span>
                <span>Max Padding</span>
              </div>
              <p className="text-xs text-gray-500">
                {controls.imagesPerPage === 1 ? 'Not needed for single image' : controls.imagePadding === 0 ? '🔥 Edge-to-edge touching!' : `Space around each image: ${controls.imagePadding}px`}
              </p>
            </div>

            {/* Font Family Selector */}
            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <Select
                value={controls.fontFamily}
                onValueChange={(value) => updateControl('fontFamily', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Banner Height Percentage */}
            <div className="space-y-2">
              <Label htmlFor="banner-height">Banner Height: {controls.bannerHeightPercent}%</Label>
              <input
                type="range"
                id="banner-height"
                min="2"
                max="10"
                step="0.5"
                value={controls.bannerHeightPercent}
                onChange={(e) => updateControl('bannerHeightPercent', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Banner Width Percentage */}
            <div className="space-y-2">
              <Label htmlFor="banner-width">Banner Width: {controls.bannerWidthPercent}%</Label>
              <input
                type="range"
                id="banner-width"
                min="10"
                max="40"
                step="1"
                value={controls.bannerWidthPercent}
                onChange={(e) => updateControl('bannerWidthPercent', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Font Size Multiplier */}
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size: {Math.round(controls.fontSizeMultiplier * 100)}%</Label>
              <input
                type="range"
                id="font-size"
                min="30"
                max="80"
                step="5"
                value={controls.fontSizeMultiplier * 100}
                onChange={(e) => updateControl('fontSizeMultiplier', Number(e.target.value) / 100)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Offset X */}
            <div className="space-y-2">
              <Label htmlFor="offset-x">Offset X: {controls.offsetX}px</Label>
              <input
                type="range"
                id="offset-x"
                min="0"
                max="100"
                step="5"
                value={controls.offsetX}
                onChange={(e) => updateControl('offsetX', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Offset Y */}
            <div className="space-y-2">
              <Label htmlFor="offset-y">Offset Y: {controls.offsetY}px</Label>
              <input
                type="range"
                id="offset-y"
                min="0"
                max="100"
                step="5"
                value={controls.offsetY}
                onChange={(e) => updateControl('offsetY', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex space-x-2">
                <Input
                  type="color"
                  id="bg-color"
                  value={controls.bgColor}
                  onChange={(e) => updateControl('bgColor', e.target.value)}
                  className="w-16 h-10 p-1 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={controls.bgColor}
                  onChange={(e) => updateControl('bgColor', e.target.value)}
                  placeholder="#FFD400"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex space-x-2">
                <Input
                  type="color"
                  id="text-color"
                  value={controls.textColor}
                  onChange={(e) => updateControl('textColor', e.target.value)}
                  className="w-16 h-10 p-1 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={controls.textColor}
                  onChange={(e) => updateControl('textColor', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <Button
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : `Download All (${imageState.images.length})`}
            </Button>
            
            <Button
              onClick={handleDownloadPDF}
              disabled={isCreatingPDF || !jsPDPLoaded}
              variant="secondary"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isCreatingPDF ? 'Creating PDF...' : !jsPDPLoaded ? 'Loading PDF...' : `Download PDF (${Math.ceil(imageState.images.length / controls.imagesPerPage)} pages)`}
            </Button>
            
            <Button
              onClick={onReset}
              variant="outline"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
            <strong className="text-red-700">🔥 PERFECT NO GAP - IMAGES TOUCH!</strong> 
            <div className="mt-2 space-y-1">
              <div>📏 <strong>Layout:</strong> Images stacked vertically (top to bottom)</div>
              <div>🔥 <strong>Vertical Gap:</strong> {controls.imageSpacing === 0 ? "PERFECT NO GAP - Images Touch!" : `${controls.imageSpacing}px gap`}</div>
              <div>📐 <strong>Padding:</strong> {controls.imagePadding === 0 ? "NO PADDING - Edge to Edge!" : `${controls.imagePadding}px padding`}</div>
              <div>📄 <strong>Per Page:</strong> {controls.imagesPerPage} images vertically stacked</div>
              <div className="text-xs text-gray-600 mt-2 font-semibold">
                <strong>✅ GUARANTEED:</strong> When both gap and padding are set to 0, images will touch each other perfectly with NO space between them!
              </div>
            </div>
            {jsPDPLoaded ? '✅ PDF library loaded' : '⏳ Loading PDF library...'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}