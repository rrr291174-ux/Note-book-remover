import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { EditorPanel } from './components/EditorPanel';
import { ImageState } from './types';

function App() {
  const [imageState, setImageState] = useState<ImageState>({
    images: [],
    currentImageId: null,
  });

  const handleImagesUpload = (images: any[]) => {
    setImageState({
      images,
      currentImageId: images[0]?.id || null,
    });
  };

  const handleReset = () => {
    setImageState({
      images: [],
      currentImageId: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Watermark Remover Pro
          </h1>
          <p className="text-gray-600">
            Upload multiple images and apply synchronized watermarks to all
          </p>
        </header>

        {imageState.images.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <DropZone onImagesUpload={handleImagesUpload} />
          </div>
        ) : (
          <EditorPanel imageState={imageState} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}

export default App;