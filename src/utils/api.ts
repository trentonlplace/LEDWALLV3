/**
 * API utility functions for LED Wall Mapper
 */

import { API_CONFIG, ERROR_MESSAGES } from '../config/constants';
import type {
  DeviceConnectionRequest,
  DeviceConnectionResponse,
  LEDPowerRequest,
  StartMappingRequest,
  StartMappingResponse,
  MappingStatus,
  LEDPixelRequest,
} from '../types';

/**
 * Enhanced fetch wrapper with error handling and timeout
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
  }
}

/**
 * Device connection API
 */
export async function connectDevice(
  request: DeviceConnectionRequest
): Promise<DeviceConnectionResponse> {
  return apiRequest<DeviceConnectionResponse>('/device/connect', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * LED power control API
 */
export async function toggleLEDPower(
  request: LEDPowerRequest
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/device/power', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Start LED mapping API
 */
export async function startMapping(
  request: StartMappingRequest
): Promise<StartMappingResponse> {
  return apiRequest<StartMappingResponse>('/start_mapping', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get mapping status API
 */
export async function getMappingStatus(): Promise<MappingStatus> {
  return apiRequest<MappingStatus>('/status');
}

/**
 * Set individual LED color for drawing
 */
export async function setLEDPixel(
  request: LEDPixelRequest
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/draw/led', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Set multiple LED colors in batch for better performance
 */
export async function setLEDPixelsBatch(
  pixels: Array<[number, number, number, number]> // [index, r, g, b]
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/draw/led/batch', {
    method: 'POST',
    body: JSON.stringify({ pixels }),
  });
}

/**
 * Health check API
 */
export async function healthCheck(): Promise<{ status: string; serial_connected: boolean }> {
  return apiRequest<{ status: string; serial_connected: boolean }>('/');
}