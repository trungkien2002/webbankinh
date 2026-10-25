const decoder = new TextDecoder();
const LIMIT = 20_000_000;
function crc32(bytes: Uint8Array) {
  let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;
}
export async function excelParts(bytes: Uint8Array) {
  if(bytes.length<22||bytes.length>10_000_000)throw new Error('File XLSX rỗng, hỏng hoặc vượt 10 MB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const range=(p:number,n:number)=>{if(!Number.isSafeInteger(p)||p<0||p+n>bytes.length)throw new Error('Cấu trúc ZIP không hợp lệ.');};
  const u16=(p:number)=>{range(p,2);return view.getUint16(p,true);},u32=(p:number)=>{range(p,4);return view.getUint32(p,true);};
  let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}
  if(end<0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))throw new Error('Không hỗ trợ ZIP nhiều phần hoặc file hỏng.');
  const count=u16(end+10),directory=u32(end+16),directoryEnd=directory+u32(end+12);
  if(count>200||directoryEnd!==end)throw new Error('File Excel quá nhiều thành phần hoặc ZIP không hợp lệ.');
  const files:Record<string,Uint8Array>={};let pos=directory,total=0;
  for(let i=0;i<count;i++){
    range(pos,46);if(u32(pos)!==0x02014b50)throw new Error('ZIP không hợp lệ.');
    const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16),size=u32(pos+20),unpacked=u32(pos+24),nameLength=u16(pos+28);
    const next=pos+46+nameLength+u16(pos+30)+u16(pos+32);range(pos,next-pos);if(next>directoryEnd)throw new Error('ZIP không hợp lệ.');
    const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLength)),local=u32(pos+42);
    if(flags&1||![0,8].includes(method)||unpacked>LIMIT||local+30>directory)throw new Error('File mã hóa hoặc định dạng ZIP không được hỗ trợ.');
    range(local,30);if(u32(local)!==0x04034b50||u16(local+8)!==method)throw new Error('ZIP không hợp lệ.');
    const offset=local+30+u16(local+26)+u16(local+28);range(offset,size);if(offset+size>directory)throw new Error('ZIP không hợp lệ.');
    if(/^(xl\/worksheets\/[^/]+\.xml|xl\/sharedStrings\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels)$/.test(name)){
      if(files[name])throw new Error('File Excel có thành phần trùng.');
      let data=bytes.subarray(offset,offset+size);
      if(total+unpacked>LIMIT)throw new Error('Dữ liệu Excel vượt 20 MB.');
      if(method===8){
        const reader=new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        const chunks:Uint8Array[]=[];let length=0;
        try{for(;;){const item=await reader.read();if(item.done)break;length+=item.value.length;if(total+length>LIMIT||length>unpacked)throw new Error('Dữ liệu giải nén vượt giới hạn.');chunks.push(item.value);}}
        catch(e){await reader.cancel().catch(()=>{});throw e;}
        data=new Uint8Array(length);let p=0;for(const chunk of chunks){data.set(chunk,p);p+=chunk.length;}
      }
      if(data.length!==unpacked||crc32(data)!==crc)throw new Error('File Excel bị lỗi dữ liệu (CRC).');
      total+=data.length;files[name]=data;
    }
    pos=next;
  }
  if(pos!==directoryEnd)throw new Error('ZIP không hợp lệ.');return files;
}
export async function readExcel(file: File):Promise<unknown[][]>{
  if(!/\.xlsx$/i.test(file.name))throw new Error('Chỉ nhận file .xlsx.');
  if(file.size>10_000_000)throw new Error('File vượt 10 MB.');
  const files=await excelParts(new Uint8Array(await file.arrayBuffer()));
  const xml=(key:string)=>{const data=files[key];if(!data)throw new Error(`Thiếu thành phần Excel: ${key}`);const text=decoder.decode(data);
    if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('Không hỗ trợ khai báo thực thể XML.');
    const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('XML trong file Excel bị lỗi.');return doc;};
  let sheet='xl/worksheets/sheet1.xml';
  if(files['xl/workbook.xml']&&files['xl/_rels/workbook.xml.rels']){
    const first=xml('xl/workbook.xml').getElementsByTagName('sheet')[0];const rel=first?.getAttribute('r:id');
    const link=Array.from(xml('xl/_rels/workbook.xml.rels').getElementsByTagName('Relationship')).find(r=>r.getAttribute('Id')===rel);
    const target=link?.getAttribute('Target')||'';
    if(link?.getAttribute('TargetMode')==='External'||!/^\/?(xl\/)?worksheets\/[^/]+\.xml$/.test(target))throw new Error('Worksheet không hợp lệ.');
    sheet=target.startsWith('/')?target.slice(1):target.startsWith('xl/')?target:`xl/${target}`;
  }
  const shared=files['xl/sharedStrings.xml']?Array.from(xml('xl/sharedStrings.xml').getElementsByTagName('si')).map(si=>Array.from(si.getElementsByTagName('t')).map(n=>n.textContent||'').join('')):[];
  const rows:unknown[][]=[];
  for(const row of Array.from(xml(sheet).getElementsByTagName('row'))){
    const r=Number(row.getAttribute('r')||rows.length+1);if(!Number.isInteger(r)||r<1||r>10001||rows[r-1])throw new Error('Số dòng Excel không hợp lệ hoặc vượt 10.000 dòng dữ liệu.');
    const values:unknown[]=[];
    for(const cell of Array.from(row.getElementsByTagName('c'))){
      if(cell.getElementsByTagName('f').length)throw new Error('Hãy đổi công thức thành giá trị trước khi nhập Excel.');
      const ref=cell.getAttribute('r')||'',letters=/^([A-Z]+)\d+$/i.exec(ref)?.[1]?.toUpperCase()||'';let col=0;
      for(const c of letters)col=col*26+c.charCodeAt(0)-64;if(col<1||col>100)throw new Error('Cột Excel không hợp lệ hoặc quá 100 cột.');
      const raw=cell.getElementsByTagName('v')[0]?.textContent||'',type=cell.getAttribute('t');
      if(type==='s'&&(!/^\d+$/.test(raw)||shared[Number(raw)]===undefined))throw new Error('Chuỗi dùng chung Excel không hợp lệ.');
      values[col-1]=type==='s'?shared[Number(raw)]:type==='inlineStr'?Array.from(cell.getElementsByTagName('t')).map(n=>n.textContent||'').join(''):raw;
    }
    while(rows.length<r-1)rows.push([]);rows[r-1]=values;
  }
  if(!rows.length)throw new Error('Excel trống.');return rows;
}
