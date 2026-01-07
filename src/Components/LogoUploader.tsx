import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface LogoUploaderProps {
  logoSrc: string | null;
  onLogoUpload: (logoSrc: string) => void;
}

export function LogoUploader({ logoSrc, onLogoUpload }: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onLogoUpload(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    onLogoUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold flex items-center">
        <ImageIcon className="w-5 h-5 mr-2" />
        Logo Watermark (For PDF)
      </Label>
      
      {logoSrc ? (
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
          <img 
            src={logoSrc} 
            alt="Logo" 
            className="w-16 h-16 object-contain border rounded"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">✅ Logo uploaded</p>
            <p className="text-xs text-gray-500">Will appear on every PDF page</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveLogo}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="logo-upload"
          />
          <label htmlFor="logo-upload" className="cursor-pointer">
            <div className="flex flex-col items-center space-y-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                Click to upload logo
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF (Max 5MB)
              </p>
            </div>
          </label>
        </div>
      )}
      
      <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
        💡 <strong>Tip:</strong> Upload your organization logo to add a professional watermark to every PDF page. The logo will be clickable and link to your Telegram group.
      </p>
    </div>
  );
}