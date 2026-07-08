import { renderToString } from '@elitjs/dom';
import { styles } from '@elitjs/style';
import {
  clearCapturedRenderedVNode,
  getCapturedRenderedVNode,
  getDesktopRenderOptions,
  type DesktopRenderOptions,
} from '@elitjs/render-context';
import { DESKTOP_WINDOW_CREATED_KEY } from './constants';
import { getDesktopAutoRenderGlobals } from './globals';
import { buildDesktopAutoHtml } from './html';
import { installDesktopMessageHandler } from './message-handler';
import { installDesktopRenderTracking } from './tracking';

export function completeDesktopAutoRender(options: DesktopRenderOptions = {}): void {
  installDesktopRenderTracking();

  const globalScope = getDesktopAutoRenderGlobals();
  const capturedRender = getCapturedRenderedVNode();
  if (!capturedRender || capturedRender.target !== 'desktop') {
    return;
  }

  if (globalScope[DESKTOP_WINDOW_CREATED_KEY] || typeof globalScope.createWindow !== 'function') {
    return;
  }

  const resolvedOptions = {
    title: 'Elit Desktop',
    width: 1080,
    height: 720,
    center: true,
    autoClose: false,
    ...options,
    ...getDesktopRenderOptions(),
  };

  installDesktopMessageHandler({
    title: resolvedOptions.title,
    autoClose: resolvedOptions.autoClose,
  });

  globalScope.createWindow({
    title: resolvedOptions.title,
    width: resolvedOptions.width,
    height: resolvedOptions.height,
    center: resolvedOptions.center,
    icon: resolvedOptions.icon,
    html: buildDesktopAutoHtml({
      css: styles.render(),
      markup: renderToString(capturedRender.vNode),
      title: resolvedOptions.title,
    }),
  });

  clearCapturedRenderedVNode();
}