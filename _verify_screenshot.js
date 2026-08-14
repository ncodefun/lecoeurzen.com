const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('headless');
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
	const win = new BrowserWindow({ width: 1280, height: 900, show: false });
	await win.loadURL('http://localhost:5008/');
	await new Promise(r => setTimeout(r, 800));
	await win.webContents.executeJavaScript("document.getElementById('sidebar').querySelector('.post-btn').click()");
	await new Promise(r => setTimeout(r, 2000));
	const debug = await win.webContents.executeJavaScript(`
		(() => {
			const d = document.getElementById('postExemple');
			const cs = getComputedStyle(d);
			const r = d.getBoundingClientRect();
			return JSON.stringify({open: d.open, opacity: cs.opacity, bg: cs.backgroundColor, rect: r, display: cs.display, position: cs.position});
		})()
	`);
	console.log('DEBUG', debug);
	await win.webContents.executeJavaScript("document.getElementById('postExemple').style.setProperty('opacity','1','important'); document.getElementById('postExemple').style.setProperty('scale','1','important')");
	await new Promise(r => setTimeout(r, 100));
	const img = await win.webContents.capturePage();
	require('fs').writeFileSync(path.join(__dirname, '_verify_screenshot.png'), img.toPNG());
	app.quit();
});
