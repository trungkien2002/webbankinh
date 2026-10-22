// Builds a coordinator-review preview without modifying shared integration files.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const preview = path.join(path.dirname(root), 'bao-completion-preview');
fs.mkdirSync(preview, { recursive: true });
for (const dir of ['src']) fs.cpSync(path.join(root, dir), path.join(preview, dir), { recursive: true });
for (const file of ['package.json', 'package-lock.json', 'app.json', 'App.tsx', 'index.ts', 'tsconfig.json', 'vitest.config.ts'])
  fs.copyFileSync(path.join(root, file), path.join(preview, file));
for (const dir of ['node_modules', 'assets', 'data']) {
  const destination = path.join(preview, dir);
  if (!fs.existsSync(destination)) fs.symlinkSync(path.join(root, dir), destination, 'junction');
}
let web = fs.readFileSync(path.join(root, 'src/screens/web.tsx'), 'utf8');
const replace = (before, after) => {
  if (!web.includes(before)) throw new Error('Main changed; review integration anchor: ' + before.slice(0, 100));
  web = web.replace(before, after);
};
replace('import { deleteUnpaidInvoice }', `import { CustomerEdit } from '../components/customer-edit';
import { EmployeeManagement } from '../components/employee-management';
import { InvoiceList } from '../components/invoice-list';
import { ProductEdit } from '../components/product-edit';
import { deleteUnpaidInvoice }`);
replace('  const [modal, setModal] = useState("");', `  const [modal, setModal] = useState("");
  const [customerEditId, setCustomerEditId] = useState('');`);
replace('      {baoDialog &&', `      {!!customerEditId && <Sheet title="Sửa khách hàng" onClose={() => setCustomerEditId('')}><CustomerEdit key={customerEditId} actorId={user!.id} customerId={customerEditId} onSaved={() => { setCustomerEditId(''); refresh(v => v + 1); setNotice('Đã lưu khách hàng.'); }} /></Sheet>}
      {baoDialog &&`);
replace('<MemberDashboard customer={db.customers.find(v => v.id === form.id)!} />', `<View style={{gap:16}}><Button onPress={() => { setCustomerEditId(form.id); setModal(''); }}>Sửa khách hàng</Button><MemberDashboard key={revision} customer={db.customers.find(v => v.id === form.id)!} /></View>`);
replace('· {detail.color || "Sắc màu tự nhiên"}', '· {detail.color || "Sắc màu tự nhiên"} · {detail.shape || "Chưa khai báo dáng"}');
replace(') : ["Thêm sản phẩm", "Sửa sản phẩm"].includes(modal) ? (', `) : modal === 'Sửa sản phẩm' ? (
            <ProductEdit key={form.id} actorId={user!.id} productId={form.id} onSaved={() => { setModal(''); refresh(v => v + 1); setNotice('Đã lưu sản phẩm.'); }} />
          ) : ["Thêm sản phẩm", "Sửa sản phẩm"].includes(modal) ? (`);
const invoiceBranch = web.indexOf('section === "Hóa đơn" ?');
const invoiceStart = web.indexOf('                      <Table', invoiceBranch);
const invoiceEnd = web.indexOf('                    </>', invoiceStart);
if (invoiceStart < 0 || invoiceEnd < 0) throw new Error('Invoice table anchor changed');
web = web.slice(0, invoiceStart) + `<InvoiceList actorId={user!.id} filter={{searchQuery:query,fromDate:from||undefined,toDate:to||undefined,paymentStatus:status as 'all'|'paid'|'pending'|'draft'|'cancelled'}}
                        onDetail={id => setBaoDialog({action:'invoice-detail',id})}
                        onOpen={v => {setDraftId(v.id);setCart(Object.fromEntries(v.items.map(i=>[i.productId,i.quantity])));setCustomer(v.customerId||'');setVoucher(v.voucherCode||'');setSection('Bán hàng tại quầy');}}
                        onDelete={id => {setForm({id});setModal('Xóa hóa đơn');}}
                        onPay={id => {setForm({id});setModal('Thanh toán đơn chờ');}} />
` + web.slice(invoiceEnd);
const employeeRows = web.indexOf('rows={db.employees');
const employeeStart = web.lastIndexOf('                    <Table', employeeRows);
const employeeEnd = web.indexOf('/>', employeeRows) + 2;
if (employeeRows < 0 || employeeStart < 0 || employeeEnd < 2) throw new Error('Employee table anchor changed');
web = web.slice(0, employeeStart) + `<EmployeeManagement actorId={user!.id} query={query} onEdit={id => setBaoDialog({action:'employee-edit',id})} onChanged={() => refresh(v=>v+1)} />` + web.slice(employeeEnd);
fs.writeFileSync(path.join(preview, 'src/screens/web.tsx'), web);
const git = 'C:\\Program Files\\Git\\cmd\\git.exe';
const diff = spawnSync(git, ['diff', '--no-index', '--', path.join(root, 'src/screens/web.tsx'), path.join(preview, 'src/screens/web.tsx')], { encoding: 'utf8' });
if (diff.status !== 1) throw new Error(diff.stderr || 'No integration patch produced');
const patch = diff.stdout.replace(/^diff --git .*$/m, 'diff --git a/src/screens/web.tsx b/src/screens/web.tsx')
  .replace(/^--- .*$/m, '--- a/src/screens/web.tsx').replace(/^\+\+\+ .*$/m, '+++ b/src/screens/web.tsx');
const handoff = path.join(root, 'integration');
fs.mkdirSync(handoff, { recursive: true });
fs.writeFileSync(path.join(handoff, 'bao-completion.patch'), patch);
console.log('Preview prepared: ' + preview);
console.log('Patch for Kien review: integration/bao-completion.patch (not applied to shared files)');
