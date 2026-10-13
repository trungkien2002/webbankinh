// Headless Chrome verification of the exported local demo, no added dependency.
// Run: npm run build:web, then node scripts/verify-bao.cjs
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(r => setTimeout(r, ms));
const output = path.join(root, 'artifacts');
fs.mkdirSync(output, { recursive: true });
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = path.join(output, 'browser-profile', String(Date.now()));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, 'dist', '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(path.join(root, 'dist') + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data); });
});
let chrome, ws;
const errors = [], results = [];
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  chrome = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let devPort;
  for (let n = 0; n < 100; n++) {
    try { devPort = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; } catch { await pause(100); }
  }
  assert(devPort, 'Chrome remote debugging did not start');
  const targets = await (await fetch(`http://127.0.0.1:${devPort}/json/list`)).json();
  const target = targets.find(t => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { const handler = pending.get(message.id); if (handler) { pending.delete(message.id); message.error ? handler.reject(new Error(JSON.stringify(message.error))) : handler.resolve(message.result); } }
    if (message.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(message.params.exceptionDetails));
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ': ' + r.exceptionDetails.exception?.description);
    return r.result.value;
  };
  const wait = async predicate => { for (let n = 0; n < 80; n++) { if (await evaluate(predicate)) return; await pause(100); } throw new Error('Timeout: ' + predicate); };
  const click = async (text, index = 0) => {
    const expression = `(() => { const list = [...document.querySelectorAll('[role="button"]')].filter(e => e.innerText.trim() === ${JSON.stringify(text)} || e.getAttribute('aria-label') === ${JSON.stringify(text)}); const e=list[${index}]; if (!e) throw new Error('Button missing: '+${JSON.stringify(text)}); e.click(); })()`;
    await evaluate(expression); await pause(160);
  };
  const fill = async (label, value) => {
    await evaluate(`(() => { const e=[...document.querySelectorAll('input,textarea')].filter(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}).at(-1); if(!e) throw new Error('Field missing: '+${JSON.stringify(label)}); const setter=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set; setter.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await pause(70);
  };
  const data = () => evaluate(`JSON.parse(localStorage.getItem('webbankinh_db'))`);
  const textHas = text => wait(`document.body.innerText.includes(${JSON.stringify(text)})`);
  const success = name => { results.push(name); console.log('PASS ' + name); };
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const url = `http://127.0.0.1:${server.address().port}`;
  await call('Page.navigate', { url });
  await textHas('Chiếc kính dành cho bạn.');
  await click('Quản lý cửa hàng'); await fill('Mật khẩu', 'Demo@123'); await click('Đăng nhập'); await textHas('Tổng quan');
  success('Login demo');
  await click('Phân loại kính'); await click('Sửa', 0);
  await fill('Tên phân loại', 'Gọng demo Bảo'); await fill('Chất liệu / quy cách', 'Titan demo'); await click('Lưu');
  assert((await data()).categories.some(c => c.name === 'Gọng demo Bảo' && c.material === 'Titan demo'));
  await click('Chi tiết', 0); await textHas('Titan demo'); await click('Đóng');
  success('LSP003/LSP007 category edit and detail');
  await click('Sản phẩm'); await click('+ Thêm sản phẩm');
  await fill('Mã sản phẩm', 'BAOTEST'); await fill('Tên kính', 'Gọng fixture Bảo');
  await fill('Giá bán', '500000'); await fill('Tồn kho', '3'); await click('Lưu sản phẩm');
  const added = (await data()).products.find(p => p.sku === 'BAOTEST');
  assert.equal(added.productType, 'Gọng kính'); assert.equal(added.categoryId, 'CAT001');
  success('Regression: category rename preserves product type during product creation');
  await click('Sản phẩm'); await click('Hết hàng'); await click('Giá giảm');
  await click('Còn hàng'); await textHas('Còn hàng');
  success('SP004 product list, stock filter and sort');
  await click('Voucher'); await click('+ Thêm voucher');
  await fill('Mã voucher', 'BAO10'); await fill('Tên chương trình', 'Demo Bảo'); await fill('Mức giảm', '10'); await fill('Đến ngày (YYYY-MM-DD)', '2099-12-31'); await click('Lưu');
  assert((await data()).vouchers.some(v => v.code === 'BAO10'));
  success('VC001 voucher create');
  await click('Bán hàng tại quầy');
  const beforeDraft = (await data()).invoices.length;
  await evaluate(`(() => { const button=[...document.querySelectorAll('[role="button"]')].find(e=>e.innerText.trim()==='Tạo hóa đơn mới'); button.click(); button.click(); })()`);
  await pause(200);
  assert.equal((await data()).invoices.length, beforeDraft + 1, 'Double click creates one draft');
  const draft = (await data()).invoices.at(-1);
  await click('Thêm vào giỏ', 0);
  const withItem = (await data()).invoices.find(i => i.id === draft.id);
  assert(withItem.items.length === 1);
  await call('Page.reload'); await textHas('Chiếc kính dành cho bạn.'); await click('Quản lý cửa hàng'); await click('Bán hàng tại quầy');
  await textHas(draft.invoiceCode);
  success('BH001 create draft, save cart and restore after reload');
  await click('Khách hàng / thông số đo mắt');
  const customer = (await data()).customers[0];
  await click(`${customer.fullName} · ${customer.phone}`); await click('Có đo mắt');
  for (const [label, value] of Object.entries({ 'SPH phải': '-1.5', 'CYL phải': '-0.5', 'AXIS phải': '90', 'SPH trái': '-1', 'CYL trái': '0', 'AXIS trái': '0', 'PD (mm)': '62' })) await fill(label, value);
  await click('Lưu');
  assert((await data()).invoices.find(i => i.id === draft.id).prescription.sphereRight === -1.5);
  await fill('Mã ưu đãi', 'BAO10'); await click('Thanh toán');
  assert((await data()).invoices.find(i => i.id === draft.id).paymentStatus === 'paid');
  success('BH005 measurements and existing checkout integration');
  await click('Hóa đơn'); await click('Chi tiết', 0); await textHas('PD: 62');
  const beforePrint = JSON.stringify((await data()).invoices);
  await evaluate(`window.__printCount=0;window.__printHtml='';window.open=()=>({document:{write:(h)=>window.__printHtml=h,close:()=>{}},focus:()=>{},print:()=>window.__printCount++})`);
  await click('In / Lưu PDF');
  assert(await evaluate('window.__printCount===1 && window.__printHtml.includes("SPH")'));
  const printHtml = await evaluate('window.__printHtml');
  assert.equal(JSON.stringify((await data()).invoices), beforePrint);
  await click('Đóng');
  success('HD003 snapshots and print adapter (mocked print dialog, no payment mutation)');
  await click('Khách hàng'); await textHas('Số lần mua / lần gần nhất');
  success('KH003 customer list and paid purchase summary');
  await click('Nhân viên'); await click('Sửa', 1);
  await fill('Ca làm', 'Sáng demo'); await fill('Chi nhánh', 'Demo 1'); await click('Lưu');
  assert((await data()).employees[1].shift === 'Sáng demo');
  success('NV002 employee edit');
  const desktop = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, 'bao-desktop.png'), Buffer.from(desktop.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click('Bán hàng tại quầy'); await pause(300);
  const narrow = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, 'bao-narrow.png'), Buffer.from(narrow.data, 'base64'));
  assert(await evaluate('document.documentElement.scrollWidth <= 395'), 'Narrow layout overflows body');
  success('Narrow viewport 390px without body overflow');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  // Keep the session while navigating to login, then reset to test revocation.
  await evaluate(`sessionStorage.removeItem('elan_demo_session')`); await pause(1800);
  await textHas('Quên mật khẩu'); await click('Quên mật khẩu');
  await fill('Email', 'admin@example.com'); await click('Tạo mã OTP demo');
  const otp = await evaluate(`Object.entries(JSON.parse(localStorage.getItem('elan_reset_challenges'))).at(-1)[1].code`);
  await fill('Mã OTP', otp); await fill('Mật khẩu mới (ít nhất 8 ký tự)', 'BaoDemo123'); await fill('Nhập lại mật khẩu mới', 'BaoDemo123'); await click('Đổi mật khẩu');
  await textHas('Đã xử lý yêu cầu.'); await click('Đóng');
  await fill('Mật khẩu', 'BaoDemo123'); await click('Đăng nhập'); await textHas('Tổng quan');
  success('DN003 local OTP reset and login with new password');
  const frame = await call('Page.getFrameTree');
  await call('Page.setDocumentContent', { frameId: frame.frameTree.frame.id, html: printHtml });
  const pdf = await call('Page.printToPDF', { printBackground: true, paperWidth: 8.27, paperHeight: 11.69 });
  const pdfBytes = Buffer.from(pdf.data, 'base64');
  assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');
  fs.writeFileSync(path.join(output, 'bao-invoice.pdf'), pdfBytes);
  const invoiceScreenshot = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, 'bao-invoice.png'), Buffer.from(invoiceScreenshot.data, 'base64'));
  success('Invoice HTML rendered to actual PDF with Chrome');
  assert.equal(errors.length, 0, 'Browser runtime errors: ' + errors.join('\n'));
  fs.writeFileSync(path.join(output, 'bao-browser-results.json'), JSON.stringify({ results, runtimeErrors: errors, limits: ['Native not tested', 'System print dialog mocked; PDF generated from invoice template by Chrome', 'Data belongs to a temporary Chrome profile'] }, null, 2));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (ws) ws.close();
  if (chrome) chrome.kill();
  await new Promise(resolve => server.close(resolve));
});
