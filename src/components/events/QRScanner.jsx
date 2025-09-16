import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function QRScanner({ onScanResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  }, [stream]);

  const startQRDetection = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    
    const scan = () => {
      if (!isScanning || !video.videoWidth || !video.videoHeight) {
        requestAnimationFrame(scan);
        return;
      }

      // Ensure canvas has proper dimensions before getting image data
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        try {
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const qrResult = detectQRCode(imageData);
          if (qrResult) {
            onScanResult(qrResult);
            stopCamera();
            return;
          }
        } catch (error) {
          console.error('QR detection error:', error);
        }
      }

      requestAnimationFrame(scan);
    };

    // Wait for video to be ready
    if (video.readyState >= video.HAVE_VIDEO) {
      scan();
    } else {
      video.addEventListener('loadeddata', scan, { once: true });
    }
  }, [isScanning, onScanResult, stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for the video to be ready before starting detection
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current.play().then(() => {
            setIsScanning(true);
            // Small delay to ensure video dimensions are available
            setTimeout(() => {
              startQRDetection();
            }, 500);
          }).catch(err => {
            console.error('Error playing video:', err);
            setError('Unable to start video playback.');
          });
        });
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Unable to access camera. Please ensure camera permissions are granted.');
      }
    }
  }, [startQRDetection]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Simplified QR detection - in production, use a proper QR library
  const detectQRCode = (imageData) => {
    // This is a placeholder. In a real implementation, you would:
    // 1. Use a library like qr-scanner or jsqr
    // 2. Process the image data to find QR patterns
    // 3. Decode the QR code content
    
    // For demo purposes, we'll simulate finding a QR code
    // In reality, this would analyze the image data
    return null;
  };

  const handleManualInput = () => {
    const qrCode = prompt('Enter QR code data manually (e.g., registration code):');
    if (qrCode && qrCode.trim()) {
      onScanResult(qrCode.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            QR Code Scanner
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover rounded-lg bg-gray-100"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-green-500 w-48 h-48 rounded-lg animate-pulse">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500"></div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            {isScanning ? 'Position the QR code within the frame' : error ? 'Camera unavailable' : 'Initializing camera...'}
          </p>
          <Button variant="outline" onClick={handleManualInput} className="w-full">
            Enter Code Manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}