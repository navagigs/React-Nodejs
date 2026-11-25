const XLSX = require('./node_modules/xlsx');
const JSZip = require('./node_modules/jszip');
const fs = require('fs');

const categories = { pendapatan_proyek: 'Pendapatan proyek', pendapatan_jasa: 'Pendapatan jasa' };
const header = ['transaction_date','category','description','amount','payment_method','account_id','invoice_no','customer_name','notes','external_ref','project_id'];
const sample = ['2026-01-01', 'pendapatan_proyek', 'test', '1000000', 'transfer', '1', '', 'Pelanggan', '', '', ''];
const ws = XLSX.utils.aoa_to_sheet([header, sample]);
const validations = [];
const addList = (columnName, values) => {
  const index = header.indexOf(columnName);
  if (index < 0 || !values.length) return;
  const col = XLSX.utils.encode_col(index);
  const formula = '"' + values.map((v)=>String(v).replace(/"/g,'""')).join(',') + '"';
  validations.push({ sqref: `${col}2:${col}1000`, formula1: formula });
};
addList('category', Object.keys(categories));
addList('payment_method', ['cash','transfer','bank','other']);
addList('account_id', ['1','2']);
addList('project_id', ['10','11']);

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
const zip = new JSZip();
// load async
JSZip.loadAsync(array).then(async (z) => {
  let sheetXml = await z.file('xl/worksheets/sheet1.xml').async('string');
  const dvXml = `<dataValidations count="${validations.length}">${validations.map((item) => `<dataValidation type="list" allowBlank="1" showDropDown="0" sqref="${item.sqref}"><formula1>${item.formula1}</formula1></dataValidation>`).join('')}</dataValidations>`;
  sheetXml = sheetXml.replace('</worksheet>', dvXml + '</worksheet>');
  z.file('xl/worksheets/sheet1.xml', sheetXml);
  const buf = await z.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('/tmp/test.xlsx', buf);
  // print sheet xml snippet
  const z2 = await JSZip.loadAsync(buf);
  const xml = await z2.file('xl/worksheets/sheet1.xml').async('string');
  console.log(xml.slice(xml.indexOf('<dataValidations'), xml.indexOf('</worksheet>')) );
}).catch(e=>console.error(e));
