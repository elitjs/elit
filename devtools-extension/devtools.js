function detectElit() {
    return new Promise((resolve) => {
        chrome.devtools.inspectedWindow.eval(
            '!!(window.__ELIT_DEVTOOLS__ || window.e || window.t)',
            (result, info) => {
                if (chrome.runtime.lastError || info) return resolve(false);
                resolve(result === true);
            },
        );
    });
}

(async () => {
    const hasElit = await detectElit();
    const icon = hasElit ? 'icon32.png' : 'icon32-bw.png';
    chrome.devtools.panels.create('Elit', icon, 'panel.html');
})();
