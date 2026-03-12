import ExcelJS from 'exceljs';
async function readSLA() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('c:/Users/ayuas/Downloads/petroflow-digital-automation/OGFZA/OGFZA-SLA. Updated.xlsx');
    workbook.eachSheet((sheet, id) => {
        console.log(`Sheet: ${sheet.name}`);
        sheet.eachRow((row, rowNumber) => {
            console.log(`Row ${rowNumber}: ${JSON.stringify(row.values)}`);
            if (rowNumber > 5) return false; // Limit output
        });
    });
}
readSLA().catch(console.error);
