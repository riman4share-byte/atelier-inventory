import ExcelJS from 'exceljs';

const file = 'C:/Users/KAIS/Downloads/atelier-documents/Riman-Fashion-Dresses.xlsx';
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const s = wb.worksheets[0];
console.log('  sheet:', s.name, '| rows:', s.rowCount, '| columns:', s.columnCount);
console.log('  real Excel table:', JSON.stringify(Object.keys(s.tables ?? {})));
console.log('  logo images embedded:', s.getImages().length);
console.log('  the header row:');
s.getRow(5).values.slice(1).forEach((v, i) => {
  if (v) console.log(`    col ${i}: ${v}`);
});
console.log('  a price cell:');
const price = s.getRow(6).getCell(8);
console.log('   ', JSON.stringify(price.value), '| numFmt:', price.numFmt);
console.log('  the footer:');
for (let r = 1; r <= s.rowCount; r++) {
  const v = s.getRow(r).getCell(1).value;
  if (typeof v === 'string' && v.startsWith('Prepared by')) console.log('   ', JSON.stringify(v));
}
