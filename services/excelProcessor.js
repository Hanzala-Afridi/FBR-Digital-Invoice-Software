// services/excelProcessor.js
class ExcelProcessor {
  static async processFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
  }

  static async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}

module.exports = ExcelProcessor;