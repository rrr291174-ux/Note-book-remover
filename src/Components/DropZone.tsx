import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { ImageItem } from '../types';

interface DropZoneProps {
  onImagesUpload: (images: ImageItem[]) => void;
}

export function DropZone({ onImagesUpload }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const processFiles = useCallback((files: FileList) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      alert('Please select image files only');
      return;
    }

    const imagePromises = imageFiles.map((file, index) => {
      return new Promise<ImageItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `img-${Date.now()}-${index}`,
              src: e.target?.result as string,
              width: img.width,
              height: img.height,
              name: file.name
            });
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(images => {
      onImagesUpload(images);
    });
  }, [onImagesUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center transition-all
        ${isDragOver 
          ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
          : 'border-gray-300 bg-white hover:border-gray-400'
        }
      `}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-blue-100 rounded-full">
            {isDragOver ? (
              <Upload className="w-8 h-8 text-blue-600 animate-bounce" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragOver ? 'Drop images here' : 'Drop images here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Support for multiple images (JPG, PNG, GIF, WebP)
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}