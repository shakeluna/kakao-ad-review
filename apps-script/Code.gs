/**
 * Google Apps Script - Ad Review Tool Proxy
 *
 * 시트 구조:
 *   Target — 심사 대상 데이터 (Excel 업로드 → 여기에 저장, 프론트엔드가 읽음)
 *   Result — 심사 완료 데이터 (검수 결과 전체 행이 여기에 추가됨)
 *
 * 설정 방법:
 * 1. 이 코드를 스프레드시트의 Extensions > Apps Script에 붙여넣기
 * 2. SPREADSHEET_ID 확인 (아래 이미 입력됨)
 * 3. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. 배포 URL을 복사하여 프론트엔드 config.js의 APPS_SCRIPT_URL에 입력
 */

// ============ CONFIGURATION ============
var SPREADSHEET_ID = '1rCmmA3EgLTctjqEGRfoQJk0MTzNdajWkql50DkQkmyA';
var SECRET_TOKEN = 'adreview2026';
var TARGET_SHEET = 'Target';
var RESULT_SHEET = 'Result';

// ============ HELPERS ============

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getTargetSheet() {
  return getSS().getSheetByName(TARGET_SHEET);
}

function getResultSheet() {
  return getSS().getSheetByName(RESULT_SHEET);
}

// ============ GET HANDLER ============

function doGet(e) {
  try {
    if (e.parameter.token !== SECRET_TOKEN) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    var action = e.parameter.action;

    if (action === 'getData')        return handleGetData(e.parameter);
    if (action === 'getAdvertisers') return handleGetAdvertisers();
    if (action === 'getStatus')      return handleGetStatus();

    return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ============ POST HANDLER ============

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.token !== SECRET_TOKEN) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    var action = body.action;

    if (action === 'upload') return handleUpload(body);
    if (action === 'review') return handleReview(body);

    return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ============ READ: Target 시트에서 데이터 읽기 ============

function handleGetData(params) {
  var sheet = getTargetSheet();
  if (!sheet) return jsonResponse({ success: true, data: [], count: 0 });

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonResponse({ success: true, data: [], count: 0 });

  var headers = values[0];
  var advertiser = params.advertiser || 'ALL';
  var advCol = headers.indexOf('advertiser');

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (advertiser !== 'ALL' && advCol >= 0 && values[i][advCol] !== advertiser) {
      continue;
    }
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    rows.push(row);
  }

  return jsonResponse({ success: true, data: rows, count: rows.length });
}

function handleGetAdvertisers() {
  var sheet = getTargetSheet();
  if (!sheet) return jsonResponse({ success: true, advertisers: [] });

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonResponse({ success: true, advertisers: [] });

  var advCol = values[0].indexOf('advertiser');
  if (advCol < 0) return jsonResponse({ success: true, advertisers: [] });

  var seen = {};
  for (var i = 1; i < values.length; i++) {
    var v = values[i][advCol];
    if (v) seen[v] = true;
  }

  return jsonResponse({ success: true, advertisers: Object.keys(seen).sort() });
}

function handleGetStatus() {
  var sheet = getTargetSheet();
  if (!sheet) return jsonResponse({ success: true, total: 0, reviewed: 0, pass: 0, fail: 0 });

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var hrCol = headers.indexOf('Human_Result');

  var total = values.length - 1;
  var reviewed = 0, pass = 0, fail = 0;

  if (hrCol >= 0) {
    for (var i = 1; i < values.length; i++) {
      var v = values[i][hrCol];
      if (v) {
        reviewed++;
        if (v === 'Pass') pass++;
        else if (v === 'Fail') fail++;
      }
    }
  }

  return jsonResponse({ success: true, total: total, reviewed: reviewed, pass: pass, fail: fail });
}

// ============ WRITE: Target 시트에 Excel 데이터 업로드 ============

function handleUpload(body) {
  var ss = getSS();
  var sheet = ss.getSheetByName(TARGET_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TARGET_SHEET);
  }

  var headers = body.headers;
  var rows = body.rows;
  var isFirstChunk = body.chunkIndex === 0;
  var isAppend = body.append === true;

  if (isFirstChunk && !isAppend) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  if (isFirstChunk && isAppend) {
    var existing = sheet.getDataRange().getValues();
    if (existing.length === 0 || (existing.length === 1 && existing[0].join('') === '')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  if (rows.length > 0) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rows.length, headers.length).setValues(rows);
  }

  return jsonResponse({
    success: true,
    chunk: body.chunkIndex,
    rowsWritten: rows.length
  });
}

// ============ WRITE: 검수 결과 저장 ============
// 1) Target 시트의 해당 행에 Human_Result 등 업데이트 (진행 추적)
// 2) Result 시트에 전체 행(원본+검수결과) 추가 (개발자용 출력)

function handleReview(body) {
  var ss = getSS();

  // --- Target 시트 업데이트 ---
  var targetSheet = ss.getSheetByName(TARGET_SHEET);
  if (!targetSheet) {
    return jsonResponse({ success: false, error: 'Target sheet not found' });
  }

  var targetValues = targetSheet.getDataRange().getValues();
  var targetHeaders = targetValues[0];

  // Ensure review columns exist in Target
  var reviewCols = [
    'Human_Result', 'Human_Image_Reason', 'Human_Vertical_Reason',
    'Human_Custom_Reason', 'AI_Human_Match', 'reviewed_at'
  ];

  var headersChanged = false;
  for (var c = 0; c < reviewCols.length; c++) {
    if (targetHeaders.indexOf(reviewCols[c]) === -1) {
      targetHeaders.push(reviewCols[c]);
      headersChanged = true;
      for (var r = 0; r < targetValues.length; r++) {
        targetValues[r].push('');
      }
    }
  }

  if (headersChanged) {
    targetSheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
    // Extend rows to match
    for (var r2 = 1; r2 < targetValues.length; r2++) {
      while (targetValues[r2].length < targetHeaders.length) {
        targetValues[r2].push('');
      }
    }
  }

  // Build identifier -> row index map
  var idCol = targetHeaders.indexOf('identifier');
  if (idCol < 0) {
    return jsonResponse({ success: false, error: 'identifier column not found in Target' });
  }

  var idToRow = {};
  for (var i = 1; i < targetValues.length; i++) {
    idToRow[String(targetValues[i][idCol])] = i;
  }

  // Column index map
  var colMap = {};
  for (var k = 0; k < reviewCols.length; k++) {
    colMap[reviewCols[k]] = targetHeaders.indexOf(reviewCols[k]);
  }

  // Apply reviews to Target
  var reviews = body.reviews;
  var updated = 0;

  for (var ri = 0; ri < reviews.length; ri++) {
    var review = reviews[ri];
    var rowIdx = idToRow[String(review.identifier)];
    if (rowIdx === undefined) continue;

    for (var ci = 0; ci < reviewCols.length; ci++) {
      var col = reviewCols[ci];
      if (review[col] !== undefined) {
        targetValues[rowIdx][colMap[col]] = review[col];
      }
    }

    // Write updated row to Target
    targetSheet.getRange(rowIdx + 1, 1, 1, targetHeaders.length).setValues([targetValues[rowIdx]]);
    updated++;
  }

  // --- Result 시트에 추가 ---
  var resultSheet = ss.getSheetByName(RESULT_SHEET);
  if (!resultSheet) {
    resultSheet = ss.insertSheet(RESULT_SHEET);
  }

  // Result 시트 헤더 설정 (비어있으면)
  var resultData = resultSheet.getDataRange().getValues();
  if (resultData.length === 0 || (resultData.length === 1 && resultData[0].join('') === '')) {
    resultSheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
  }

  // 검수 완료된 행을 Result에 추가
  var resultRows = [];
  for (var rj = 0; rj < reviews.length; rj++) {
    var rev = reviews[rj];
    var srcRowIdx = idToRow[String(rev.identifier)];
    if (srcRowIdx === undefined) continue;

    // Use the updated targetValues row (has both original + review data)
    resultRows.push(targetValues[srcRowIdx].slice());
  }

  if (resultRows.length > 0) {
    var resultLastRow = resultSheet.getLastRow();
    resultSheet.getRange(resultLastRow + 1, 1, resultRows.length, targetHeaders.length)
      .setValues(resultRows);
  }

  return jsonResponse({ success: true, updated: updated, resultAppended: resultRows.length });
}
