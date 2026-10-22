/** Browser-only OOXML reader/writer for the first worksheet. No network, no macros. */
const enc = new TextEncoder();
const dec = new TextDecoder();
const u16 = (v: DataView, p: number) => v.getUint16(p, true);
const u32 = (v: DataView, p: number) => v.getUint32(p, true);

async function unzipFirstSheet(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && u32(v, end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Không tìm thấy cấu trúc ZIP của file Excel.');
  const total = u16(v, end + 10);
  if (total > 200) throw new Error('File Excel có quá nhiều thành phần.');
  let pos = u32(v, end + 16);
  const files: Record<string, Uint8Array> = {};
  let unpacked = 0;
  for (let i = 0; i < total; i++) {
    if (pos + 46 > bytes.length || u32(v, pos) !== 0x02014b50) throw new Error('ZIP không hợp lệ.');
    const method = u16(v, pos + 10), size = u32(v, pos + 20), outSize = u32(v, pos + 24);
    const nameSize = u16(v, pos + 28), extra = u16(v, pos + 30), comment = u16(v, pos + 32);
    const name = dec.decode(bytes.subarray(pos + 46, pos + 46 + nameSize));
    const local = u32(v, pos + 42);
    const offset = local + 30 + u16(v, local + 26) + u16(v, local + 28);
    if (offset + size > bytes.length || unpacked + outSize > 20_000_000) throw new Error('File Excel vượt giới hạn 20 MB hoặc bị lỗi.');
    if (/^(xl\/worksheets\/sheet\d+\.xml|xl\/sharedStrings\.xml)$/.test(name)) {
      let data = bytes.subarray(offset, offset + size);
      if (method === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ giải nén XLSX.');
        const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        data = new Uint8Array(await new Response(stream).arrayBuffer());
      } else if (method !== 0) throw new Error('Định dạng nén không được hỗ trợ.');
      files[name] = data;
      unpacked += data.length;
    }
    pos += 46 + nameSize + extra + comment;
  }
  return files;
}

export async function readExcel(file: File): Promise<unknown[][]> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Chỉ nhận file .xlsx.');
  if (file.size > 10_000_000) throw new Error('File vượt quá 10 MB.');
  const files = await unzipFirstSheet(new Uint8Array(await file.arrayBuffer()));
  const xml = (data: Uint8Array) => new DOMParser().parseFromString(dec.decode(data), 'application/xml');
  const shared: string[] = [];
  if (files['xl/sharedStrings.xml']) {
    const doc = xml(files['xl/sharedStrings.xml']);
    for (const si of Array.from(doc.getElementsByTagName('si'))) shared.push(Array.from(si.getElementsByTagName('t')).map(n => n.textContent || '').join(''));
  }
  const sheet = files['xl/worksheets/sheet1.xml'] || files[Object.keys(files).filter(k => k.startsWith('xl/worksheets/sheet')).sort()[0]];
  if (!sheet) throw new Error('Không tìm thấy worksheet trong Excel.');
  const doc = xml(sheet);
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML trong file Excel không hợp lệ.');
  const rows: unknown[][] = [];
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    const rowIndex = Number(row.getAttribute('r') || rows.length + 1);
    if (!Number.isInteger(rowIndex) || rowIndex < 1 || rowIndex > 10001) throw new Error('Số dòng Excel vượt giới hạn.');
    const values: unknown[] = [];
    for (const cell of Array.from(row.getElementsByTagName('c'))) {
      const ref = cell.getAttribute('r') || '';
      const letters = /^[A-Z]+/i.exec(ref)?.[0]?.toUpperCase() || '';
      let col = 0;
      for (const letter of letters) col = col * 26 + letter.charCodeAt(0) - 64;
      if (col < 1 || col > 100) throw new Error('Cột Excel không hợp lệ hoặc quá giới hạn.');
      const type = cell.getAttribute('t');
      const raw = cell.getElementsByTagName('v')[0]?.textContent || '';
      values[col - 1] = type === 's' ? (shared[Number(raw)] ?? '') : type === 'inlineStr' ? Array.from(cell.getElementsByTagName('t')).map(n => n.textContent || '').join('') : raw;
    }
    while (rows.length < rowIndex - 1) rows.push([]);
    rows[rowIndex - 1] = values;
  }
  if (!rows.length) throw new Error('Excel trống.');
  return rows;
}

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) { c ^= b; for (let n = 0; n < 8; n++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); }
  return (c ^ 0xffffffff) >>> 0;
}
const xmlEscape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function makeZip(files: Record<string, string>): Blob {
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  const w16 = (v: DataView, p: number, n: number) => v.setUint16(p, n, true);
  const w32 = (v: DataView, p: number, n: number) => v.setUint32(p, n >>> 0, true);
  for (const [name, content] of Object.entries(files)) {
    const n = enc.encode(name), b = enc.encode(content), crc = crc32(b);
    const local = new Uint8Array(30 + n.length); const l = new DataView(local.buffer);
    w32(l,0,0x04034b50); w16(l,4,20); w32(l,14,crc); w32(l,18,b.length); w32(l,22,b.length); w16(l,26,n.length); local.set(n,30);
    const dir = new Uint8Array(46+n.length); const d = new DataView(dir.buffer);
    w32(d,0,0x02014b50); w16(d,4,20); w16(d,6,20); w32(d,16,crc); w32(d,20,b.length); w32(d,24,b.length); w16(d,28,n.length); w32(d,42,offset); dir.set(n,46);
    parts.push(local,b); central.push(dir); offset += local.length+b.length;
  }
  const size = central.reduce((s,b)=>s+b.length,0); const end = new Uint8Array(22); const e = new DataView(end.buffer);
  w32(e,0,0x06054b50); w16(e,8,central.length); w16(e,10,central.length); w32(e,12,size); w32(e,16,offset);
  return new Blob([...parts,...central,end].map(b => new Uint8Array(b)), {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
export function downloadExcelTemplate(kind: 'category'|'product') {
  const headers = kind === 'category' ? ['Tên','Mô tả','Chất liệu'] : ['SKU','Barcode','Số lượng','Lô'];
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${headers.map((h,i)=>`<c r="${String.fromCharCode(65+i)}1" t="inlineStr"><is><t>${xmlEscape(h)}</t></is></c>`).join('')}</row></sheetData></worksheet>`;
  const files = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Import" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
  };
  const url = URL.createObjectURL(makeZip(files)); const link = document.createElement('a'); link.href=url; link.download = kind === 'category'?'mau-phan-loai.xlsx':'mau-nhap-ton.xlsx'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
