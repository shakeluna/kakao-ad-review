/* config.js - Application configuration */

const Config = {
  // Google Apps Script Web App URL (배포 후 여기에 입력)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxDJWLpGePg4r9MKvjd2lBPp4vBFCwAfykNcSHaC7SpxlUzxCKhWs3bCd8vzGUsH7Tx/exec',

  // Secret token (Code.gs의 SECRET_TOKEN과 동일해야 함)
  SECRET_TOKEN: 'adreview2026',

  // 배치 저장 설정
  BATCH_SIZE: 5,            // 5건마다 자동 flush
  FLUSH_INTERVAL: 30000,    // 30초마다 미전송분 자동 flush

  // 업로드 청크 크기
  UPLOAD_CHUNK_SIZE: 500,   // 500행 단위로 분할 업로드

  // Google Spreadsheet URL (바로가기 링크용)
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1rCmmA3EgLTctjqEGRfoQJk0MTzNdajWkql50DkQkmyA/edit',
};
