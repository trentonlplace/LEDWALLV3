/**
 * Camera utility functions
 */

import { CAMERA_CONFIG, ERROR_MESSAGES } from '../config/constants';
import type { CameraConstraints, VideoResolution } from '../types';

/**
 * Get optimal camera constraints
 */
export function getCameraConstraints(): CameraConstraints {
  return {
    video: {
      width: { ideal: CAMERA_CONFIG.DEFAULT_RESOLUTION.width },
      height: { ideal: CAMERA_CONFIG.DEFAULT_RESOLUTION.height },
    },
  };
}

/**
 * Request camera access with enhanced error handling
 */
export async function requestCameraAccess(): Promise<MediaStream> {
  // Check if mediaDevices is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(ERROR_MESSAGES.CAMERA_NOT_SUPPORTED);
  }

  try {
    const constraints = getCameraConstraints();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    let errorMessage = 'Failed to access webcam. ';
    
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage += ERROR_MESSAGES.CAMERA_PERMISSION_DENIED;
          break;
        case 'NotFoundError':
          errorMessage += ERROR_MESSAGES.CAMERA_NOT_FOUND;
          break;
        case 'NotSupportedError':
          errorMessage += ERROR_MESSAGES.CAMERA_NOT_SUPPORTED_BROWSER;
          break;
        case 'NotReadableError':
          errorMessage += ERROR_MESSAGES.CAMERA_IN_USE;
          break;
        default:
          errorMessage += error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Stop camera stream and cleanup
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

/**
 * Get video element resolution
 */
export function getVideoResolution(video: HTMLVideoElement): VideoResolution {
  return {
    width: video.videoWidth,
    height: video.videoHeight,
  };
}

/**
 * Validate video dimensions
 */
export function validateVideoResolution(video: HTMLVideoElement): boolean {
  const resolution = getVideoResolution(video);
  return resolution.width > 0 && resolution.height > 0;
}

/**
 * Calculate scaling factors between display and video resolution
 */
export function calculateScaling(
  video: HTMLVideoElement,
  rect: DOMRect
): { scaleX: number; scaleY: number } {
  return {
    scaleX: video.videoWidth / rect.width,
    scaleY: video.videoHeight / rect.height,
  };
}