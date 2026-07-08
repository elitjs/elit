import { DESKTOP_MESSAGE_HANDLER_KEY } from './constants';
import { getDesktopAutoRenderGlobals } from './globals';

function resolveDesktopBridgePayloadRoute(payload: string | null | undefined): string | undefined {
  if (!payload) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (typeof parsed === 'string' && parsed.trim()) {
      return parsed.trim();
    }

    if (
      parsed
      && typeof parsed === 'object'
      && 'route' in parsed
      && typeof parsed.route === 'string'
      && parsed.route.trim()
    ) {
      return parsed.route.trim();
    }
  } catch {
    // Ignore malformed JSON payloads.
  }

  return undefined;
}

export function installDesktopMessageHandler(options: { title: string; autoClose?: boolean }): void {
  const globalScope = getDesktopAutoRenderGlobals();
  let routeHistory: string[] = [];
  let routeIndex = -1;

  const applyResolvedTitle = (suffix?: string): void => {
    if (suffix) {
      globalScope.windowSetTitle?.(`${options.title} - ${suffix}`);
      return;
    }

    const activeRoute = routeIndex >= 0 ? routeHistory[routeIndex] : undefined;
    globalScope.windowSetTitle?.(activeRoute ? `${options.title} - ${activeRoute}` : options.title);
  };

  const navigateToRoute = (route: string): void => {
    const normalizedRoute = route.trim();
    if (!normalizedRoute) {
      return;
    }

    if (routeIndex < routeHistory.length - 1) {
      routeHistory = routeHistory.slice(0, routeIndex + 1);
    }

    routeHistory.push(normalizedRoute);
    routeIndex = routeHistory.length - 1;
    applyResolvedTitle();
  };

  const navigateBack = (): void => {
    if (routeIndex > 0) {
      routeIndex -= 1;
    } else {
      routeIndex = -1;
    }

    applyResolvedTitle();
  };

  const navigateForward = (): void => {
    if (routeIndex + 1 >= routeHistory.length) {
      return;
    }

    routeIndex += 1;
    applyResolvedTitle();
  };

  const clearRoute = (): void => {
    routeIndex = -1;
    applyResolvedTitle();
  };

  if (globalScope[DESKTOP_MESSAGE_HANDLER_KEY] || typeof globalScope.onMessage !== 'function') {
    return;
  }

  globalScope.onMessage((message) => {
    try {
      const bridgeMessage = JSON.parse(message) as {
        type?: string;
        action?: string | null;
        route?: string | null;
        payload?: string | null;
      };

      if (bridgeMessage.type === 'bridge') {
        if (bridgeMessage.action === 'desktop:ping') {
          applyResolvedTitle('IPC OK');
          return;
        }

        if (bridgeMessage.action === 'desktop:quit') {
          globalScope.windowQuit?.();
          return;
        }

        if (bridgeMessage.action === 'desktop:back') {
          navigateBack();
          return;
        }

        if (bridgeMessage.action === 'desktop:forward') {
          navigateForward();
          return;
        }

        if (bridgeMessage.action === 'desktop:clear-route') {
          clearRoute();
          return;
        }

        const nextRoute = (typeof bridgeMessage.route === 'string' && bridgeMessage.route.trim())
          ? bridgeMessage.route.trim()
          : bridgeMessage.action === 'desktop:navigate'
            ? resolveDesktopBridgePayloadRoute(bridgeMessage.payload)
            : undefined;

        if (nextRoute) {
          navigateToRoute(nextRoute);
          return;
        }
      }
    } catch {
      // Ignore non-JSON desktop messages.
    }

    if (message === 'desktop:ready') {
      applyResolvedTitle();
      if (options.autoClose) {
        globalScope.windowQuit?.();
      }
      return;
    }

    if (message === 'desktop:ping') {
      applyResolvedTitle('IPC OK');
      return;
    }

    if (message === 'desktop:quit') {
      globalScope.windowQuit?.();
      return;
    }

    if (message === 'desktop:back') {
      navigateBack();
      return;
    }

    if (message === 'desktop:forward') {
      navigateForward();
      return;
    }

    if (message === 'desktop:clear-route') {
      clearRoute();
    }
  });

  globalScope[DESKTOP_MESSAGE_HANDLER_KEY] = true;
}