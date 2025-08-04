import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, X, QrCode, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const { toast } = useToast();

  // 检查是否为原生应用
  const isNative = Capacitor.isNativePlatform();

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
      if (isNative && isScanning) {
        BarcodeScanner.showBackground();
        BarcodeScanner.stopScan();
        document.body.style.background = '';
      }
    };
  }, [isNative, isScanning]);

  const startScan = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
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
          throw new Error('需要摄像头权限才能扫描二维码');
        }
      } else {
        // Web browser scanning
        if (!videoRef.current) {
          throw new Error('视频元素未准备好');
        }

        // 检查是否为HTTPS环境 (本地开发环境除外)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          throw new Error('二维码扫描需要在安全连接(HTTPS)下使用');
        }

        // 检查浏览器是否支持相机
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('当前浏览器不支持相机功能');
        }

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
            returnDetailedScanResult: true
          }
        );
        
        await qrScannerRef.current.start();
        
        // 检查相机是否真的启动了
        if (!qrScannerRef.current.hasFlash && !await QrScanner.hasCamera()) {
          throw new Error('未检测到可用的摄像头');
        }
      }
    } catch (error: any) {
      console.error('Error scanning QR code:', error);
      
      let errorMessage = '无法启动二维码扫描器';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '需要允许访问摄像头权限，请在浏览器设置中允许摄像头访问';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到可用的摄像头设备';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '当前设备不支持相机功能';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的应用';
      } else if (error.name === 'AbortError') {
        errorMessage = '摄像头启动被中断';
      } else if (error.name === 'SecurityError') {
        errorMessage = '安全限制，请确保在安全连接(HTTPS)环境下使用';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setIsScanning(false);
      
      toast({
        title: '扫描失败',
        description: errorMessage,
        variant: 'destructive'
      });
      
      stopScan();
    }
  };

  const stopScan = () => {
    if (isNative) {
      BarcodeScanner.showBackground();
      BarcodeScanner.stopScan();
      document.body.style.background = '';
    } else {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    }
    setIsScanning(false);
    setError(null);
  };

  const handleClose = () => {
    if (isScanning) {
      stopScan();
    }
    setIsOpen(false);
  };

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
          {error ? (
            // 错误状态
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <p className="text-destructive mb-4 font-medium">扫描失败</p>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    setError(null);
                    startScan();
                  }} 
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  重试扫描
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleClose}
                  className="w-full"
                >
                  关闭
                </Button>
              </div>
            </div>
          ) : !isScanning ? (
            // 准备状态
            <div className="text-center py-4">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                点击下方按钮开始扫描核验码
              </p>
              <div className="space-y-2">
                <Button onClick={startScan} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  开始扫描
                </Button>
                {!isNative && (
                  <p className="text-xs text-muted-foreground">
                    请确保允许浏览器访问摄像头权限
                  </p>
                )}
              </div>
            </div>
          ) : (
            // 扫描状态
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
                    autoPlay
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