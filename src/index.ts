import { importExcel } from "./services/excel.service";

const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ 엑셀 파일 경로를 입력하세요.');
  process.exit(1);
}

importExcel(filePath).catch(console.error);
