
import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { IMGCHEST_API_KEY } from '../config';

interface ImageCropperModalProps {
  imageUrl: string;
  onCropUploadComplete: (uploadedImageUrl: string) => void;
  onCancel: () => void;
}

// Function to generate a cropped image blob from a source image and crop data
function getCroppedImgBlob(
  image: HTMLImageElement,
  crop: Crop
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Set canvas dimensions to the actual cropped size in original image pixels
  // to maintain high resolution.
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject(new Error('Canvas context is not available.'));
  }

  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,      // Source X from original image
    crop.y * scaleY,      // Source Y from original image
    crop.width * scaleX,  // Source width from original image
    crop.height * scaleY, // Source height from original image
    0,                    // Destination X on canvas
    0,                    // Destination Y on canvas
    canvas.width,         // Destination width on canvas (full canvas)
    canvas.height         // Destination height on canvas (full canvas)
  );


  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      'image/jpeg',
      0.95 // Increased quality
    );
  });
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ imageUrl, onCropUploadComplete, onCancel }) => {
  const aspect = 2 / 3;
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl.trim())}`;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      width,
      height
    );
    const centeredCrop = centerCrop(initialCrop, width, height);
    setCrop(centeredCrop);
    setCompletedCrop(centeredCrop);
  }
  
  const handleCropAndUpload = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsUploading(true);
    setUploadError(null);

    try {
        const croppedBlob = await getCroppedImgBlob(imgRef.current, completedCrop);
        if (!croppedBlob) {
            throw new Error('Failed to create image blob for upload.');
        }

        const formData = new FormData();
        formData.append('images[]', croppedBlob, 'image.jpeg');
        formData.append('privacy', 'hidden');
        
        const uploadResponse = await fetch('https://api.imgchest.com/v1/post', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${IMGCHEST_API_KEY}`,
                'Accept': 'application/json',
            },
            body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
            const errorMessage = uploadResult.error?.message || `Failed to upload to ImgChest. Status: ${uploadResponse.status}`;
            console.error("ImgChest Error Body:", uploadResult);
            throw new Error(errorMessage);
        }
        
        const directImageUrl = uploadResult?.data?.images?.[0]?.link;

        if (!directImageUrl) {
            console.error("ImgChest Response did not contain a direct image URL at 'data.images[0].link':", uploadResult);
            throw new Error('ImgChest upload was successful, but a direct image link was not found in the response.');
        }

        onCropUploadComplete(directImageUrl);

    } catch (error) {
        console.error('Crop and upload process failed:', error);
        setUploadError(`An error occurred: ${error.message}. Please try again or check the console.`);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Crop Image (2:3 aspect ratio)</h2>
          <button onClick={onCancel} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex justify-center items-center bg-gray-100">
          {loadError ? (
              <p className="text-red-500 font-semibold p-4 text-center">{loadError}</p>
          ) : (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              minWidth={100}
              minHeight={150}
              ruleOfThirds
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={proxyUrl}
                onLoad={onImageLoad}
                style={{ maxHeight: '70vh' }}
                crossOrigin="anonymous" // Required for canvas operations
                onError={() => setLoadError('Failed to load image via proxy. The URL may be invalid, the host may be down, or it may be blocking proxies.')}
              />
            </ReactCrop>
          )}
        </div>
        <div className="p-4 bg-gray-50 border-t flex flex-col items-end gap-3">
          {uploadError && <p className="text-sm text-red-600 font-medium w-full text-right">{uploadError}</p>}
          <div className="flex justify-end items-center gap-4">
            <button onClick={onCancel} className="px-5 py-2 text-gray-700 bg-white border border-gray-300 font-semibold rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
            <button 
                onClick={handleCropAndUpload} 
                disabled={!completedCrop || !!loadError || isUploading} 
                className="px-5 py-2 w-36 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Uploading...
                </>
              ) : 'Save Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
