/**
 * Helper: Lazy-load http module classes
 */
export function loadHttpClasses(): { IncomingMessage: any; ServerResponse: any } {
  const httpModule = require('@elitjs/http');
  return {
    IncomingMessage: httpModule.IncomingMessage,
    ServerResponse: httpModule.ServerResponse,
  };
}