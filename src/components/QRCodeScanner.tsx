import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, X, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import QrScanner from 'qr-scanner';

interface QRCodeScannerProps {
  onScanSuccess: (code: string) => void;
  children: React.ReactNode;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkSupport = async () => {
      const isNativePlatform = Capacitor.isNativePlatform();
      setIsNative(isNativePlatform);
      
      if (isNativePlatform) {
        setIsSupported(true);
      } else {
        // Check if camera is available for web
        const hasCamera = await QrScanner.hasCamera();
        setIsSupported(hasCamera);
      }
    };
    
    checkSupport();
  }, []);

  const startScan = async () => {
    try {
      setIsScanning(true);
      
      if (isNative) {
        // Native app scanning
        const status = await BarcodeScanner.checkPermission({ force: true });
        
        if (status.granted) {
          document.body.style.background = 'transparent';
          BarcodeScanner.hideBackground();
          
          const result = await BarcodeScanner.startScan();
          
          if (result.hasContent) {
            onScanSuccess(result.content);
            setIsOpen(false);
            toast({
              title: '扫描成功',
              description: `识别到核验码: ${result.content}`
            });
          }
        } else {
          toast({
            title: '权限错误',
            description: '需要摄像头权限才能扫描二维码',
            variant: 'destructive'
          });
        }
      } else {
        // Web browser scanning
        if (videoRef.current) {
          qrScannerRef.current = new QrScanner(
            videoRef.current,
            (result) => {
              onScanSuccess(result.data);
              setIsOpen(false);
              toast({
                title: '扫描成功',
                description: `识别到核验码: ${result.data}`
              });
              stopScan();
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
            }
          );
          
          await qrScannerRef.current.start();
        }
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      toast({
        title: '扫描失败',
        description: '无法启动二维码扫描器',
        variant: 'destructive'
      });
      setIsScanning(false);
      stopScan();
    }
  };

  const stopScan = () => {
    if (isNative) {
      BarcodeScanner.showBackground();
      BarcodeScanner.stopScan();
      document.body.style.background = '';
    } else {
      qrScannerRef.current?.stop();
      qrScannerRef.current?.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    if (isScanning) {
      stopScan();
    }
    setIsOpen(false);
  };

  // For web browsers, show a simple fallback
  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>二维码扫描</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              二维码扫描功能需要在移动设备上使用
            </p>
            <p className="text-sm text-muted-foreground">
              请在手机或平板电脑上打开此应用以使用扫描功能
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>扫描二维码</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isScanning ? (
            <div className="text-center py-4">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                点击下方按钮开始扫描核验码
              </p>
              <Button onClick={startScan} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                开始扫描
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="relative">
                {isNative ? (
                  <div className="animate-pulse bg-muted rounded-lg h-64 flex items-center justify-center">
                    <p className="text-muted-foreground">正在扫描...</p>
                  </div>
                ) : (
                  <video 
                    ref={videoRef}
                    className="w-full h-64 rounded-lg bg-black"
                    playsInline
                    muted
                  />
                )}
                <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse"></div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                将二维码对准摄像头
              </p>
              <Button 
                variant="outline" 
                onClick={stopScan}
                className="mt-4 w-full"
              >
                <X className="h-4 w-4 mr-2" />
                停止扫描
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeScanner;