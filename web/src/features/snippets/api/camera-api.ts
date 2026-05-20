import { Camera, CameraDirection, CameraErrorCode, EncodingType } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

function normalizeImageType(format: string | undefined): string {
  switch ((format ?? '').toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'heic':
      return 'image/heic'
    case 'heif':
      return 'image/heif'
    default:
      return 'image/jpeg'
  }
}

/**
 * Camera capture is only a native path; web still relies on the browser file input fallback.
 */
export function canUseNativeCamera(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Takes a native camera photo and converts the returned media URI into a File that the OCR upload path already understands.
 */
export async function captureOcrImage(): Promise<File | null> {
  try {
    const photo = await Camera.takePhoto({
      quality: 90,
      correctOrientation: true,
      encodingType: EncodingType.JPEG,
      cameraDirection: CameraDirection.Rear,
    })

    if (!photo.webPath) {
      throw new Error('Camera returned no image path')
    }

    const response = await fetch(photo.webPath)
    const blob = await response.blob()
    const type = blob.type || normalizeImageType(photo.metadata?.format)
    const extension = type.split('/')[1] || 'jpg'
    return new File([blob], `camera-capture.${extension}`, { type })
  } catch (reason) {
    const error = reason as { code?: string; message?: string }
    if (
      error?.code === CameraErrorCode.TakePhotoCancelled ||
      error?.message?.toLowerCase().includes('cancel')
    ) {
      return null
    }
    throw reason
  }
}
