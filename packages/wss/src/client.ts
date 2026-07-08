import { WebSocket } from '@elitjs/ws';

/**
 * WebSocket Secure client class.
 */
export class WSSClient extends WebSocket {
  constructor(address: string | URL, protocols?: string | string[], options?: any) {
    const urlString = typeof address === 'string' ? address : address.toString();
    const secureUrl = urlString.replace(/^ws:\/\//i, 'wss://');

    super(secureUrl, protocols, options);
  }
}

/**
 * Create WebSocket Secure client.
 */
export function createWSSClient(address: string | URL, protocols?: string | string[], options?: any): WSSClient {
  return new WSSClient(address, protocols, options);
}