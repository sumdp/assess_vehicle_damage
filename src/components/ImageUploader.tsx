'use client';

import { useState, useRef } from 'react';

interface ImageUploaderProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  onBack: () => void;
}

export interface UploadedImage {
  file: File;
  preview: string;
  label: string;
}

export default function ImageUploader({ onImagesUploaded, onBack }: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const newImages: UploadedImage[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({
          file,
          preview,
          label: `Damage photo ${images.length + newImages.length + 1}`,
        });
      }
    });
    setImages([...images, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSubmit = () => {
    if (images.length > 0) {
      onImagesUploaded(images);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Damage Photos</h2>
        <p className="text-gray-700 text-sm mb-4">
          Upload clear photos of all vehicle damage. Include multiple angles for accurate assessment.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="space-y-2">
          <div className="text-4xl">📷</div>
          <p className="text-gray-700">
            Drag and drop images here, or <span className="text-blue-600 font-medium cursor-pointer">browse</span>
          </p>
          <p className="text-gray-500 text-sm">Supports: JPG, PNG, HEIC</p>
        </div>
      </div>

      {images.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Uploaded Photos ({images.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.preview}
                  alt={image.label}
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <p className="text-xs text-gray-600 mt-1 truncate">{image.file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={images.length === 0}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
            images.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Analyze Damage ({images.length} photo{images.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
