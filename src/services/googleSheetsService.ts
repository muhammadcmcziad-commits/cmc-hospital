// Google Sheets integration service for Hospital Management App
// Uses Google Workspace OAuth scopes (https://www.googleapis.com/auth/spreadsheets)

import { Department, Nurse, ShiftRecord } from '../types';
import { INITIAL_NURSES } from '../data/mockData';
import { colToLetter, formatSubmissionTime, formatSubmissionDateTime } from './googleDriveService';

export interface SyncProgress {
  status: 'idle' | 'authorizing' | 'fetching' | 'syncing' | 'exporting' | 'success' | 'error';
  message: string;
  details?: string;
  count?: number;
}

export interface SheetParseResult {
  spreadsheetTitle?: string;
  departments: Array<Omit<Department, 'id'> & { id?: string }>;
  nurses: Array<Omit<Nurse, 'id'> & { id?: string }>;
  shifts: Array<Omit<ShiftRecord, 'id' | 'createdAt'> & { id?: string }>;
  rawRowsCount: number;
}

// Extract Spreadsheet ID from URL or return raw ID
export function extractSpreadsheetId(input: string): string {
  const clean = input.trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
}

// Fetch sheet metadata and values using Google Sheets REST API v4 or Public CSV export fallback
export async function fetchSpreadsheetData(
  spreadsheetId: string,
  accessToken?: string
): Promise<{ title: string; sheets: { title: string; values: string[][] }[] }> {
  // If access token is provided, use Google Sheets v4 REST API
  if (accessToken && accessToken.trim()) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json',
    };

    const metaRes迷 = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`,
      { headers }
    );

    if (metaRes迷.ok) {
      const metaData = await metaRes迷.json();
      const title = metaData.properties?.title || 'nurse time';
      const sheetNames: string[] = (metaData.sheets || []).map(
        (s: { properties?: { title?: string } }) => s.properties?.title || 'Sheet1'
      );

      const rangesQuery = (sheetNames.length > 0 ? sheetNames : ['Sheet1'])
        .map(name => `ranges=${encodeURIComponent(name)}`)
        .join('&');

      const valuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=FORMATTED_VALUE`,
        { headers }
      );

      if (valuesRes.ok) {
        const valuesData不易 = await valuesRes.json();
        const valueRanges = valuesData不易.valueRanges || [];
        return {
          title,
          sheets: sheetNames.map((sheetTitle, idx) => ({
            title: sheetTitle,
            values: (valueRanges[idx]?.values || []) as string[][],
          })),
        };
      }
    }
  }

  // Fallback: Fetch directly using Google Sheets export/gviz CSV endpoint (works seamlessly for "Anyone with the link" sheets)
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    const res = await fetch(csvUrl);
    
    if (res.ok) {
      const csvText = await res.text();
      const rows = parseCSVText(csvText);
      return {
        title: 'nurse time',
        sheets: [
          {
            title: 'Roster',
            values: rows,
          },
        ],
      };
    }
  } catch (err) {
    console.warn('CSV export endpoint attempt failed:', err);
  }

  // Alternative GViz endpoint fallback
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
    const gvizRes = await fetch(gvizUrl);
    if (gvizRes.ok) {
      const csvText = await gvizRes.text();
      const rows不易 = parseCSVText(csvText);
      return {
        title: 'nurse time',
        sheets: [
          {
            title: 'nurse time',
            values: rows不易,
          },
        ],
      };
    }
  } catch (err) {
    console.warn('GViz CSV endpoint failed:', err);
  }

  throw new Error(
    `نەتوانرا پەیوەندی بە فایلی "nurse time" بکرێت. تکایە لە بەشی Shareـی گووگڵ شیتەکەدا دڵنیابەرەوە کە "Anyone with the link can view" چالاکە، یان کۆدی OAuth Access Token دابنێ.`
  );
}

// Utility to parse CSV into rows and columns handling quotes and commas
function parseCSVText(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

// Smart parser for hospital roster sheets
// Handles multiple formats:
// 1. Dedicated sheets ("Nurses", "Departments", "Shifts")
// 2. Kurdish column headers ("ناوی پەرستار", "بەش", "ئایدی", "کۆد", "شیفت", "بەروار")
// 3. English column headers ("Nurse ID", "Name", "Department", "Shift", "Date")
// 4. Matrix/Grid calendar rosters (dates as columns, nurse names as rows)
export function parseHospitalSpreadsheet(
  sheets: { title: string; values: string[][] }[],
  existingDepartments: Department[],
  existingNurses?: Nurse[]
): SheetParseResult {
  const result: SheetParseResult = {
    departments: [],
    nurses: [],
    shifts: [],
    rawRowsCount: 0,
  };

  const deptMap = new Map<string, string>(); // code/name to deptId
  existingDepartments.forEach(d => {
    deptMap.set(d.id.toLowerCase(), d.id);
    deptMap.set(d.code.toLowerCase(), d.id);
    deptMap.set(d.nameKu.toLowerCase(), d.id);
    deptMap.set(d.nameEn.toLowerCase(), d.id);
  });

  const getOrCreateDeptId = (deptRaw: string): string => {
    const defaultDeptId = existingDepartments.find(d => d.code === 'ER')?.id || existingDepartments[0]?.id || 'dept-1';
    if (!deptRaw) return defaultDeptId;
    const clean = deptRaw.trim();
    const cleanLower = clean.toLowerCase();
    
    // Check known matches against existing departments
    if (cleanLower.includes('er') || cleanLower.includes('فریاکەوتن') || cleanLower.includes('تەواری')) {
      return existingDepartments.find(d => d.code === 'ER' || d.nameKu.includes('فریاکەوتن'))?.id || 'dept-1';
    }
    if (cleanLower.includes('ped') || cleanLower.includes('منداڵ')) {
      return existingDepartments.find(d => d.code === 'PED' || d.nameKu.includes('منداڵ'))?.id || 'dept-4';
    }
    if (cleanLower.includes('nicu') || cleanLower.includes('ساوا') || cleanLower.includes('خدج')) {
      return existingDepartments.find(d => d.code === 'NICU' || d.nameKu.includes('ساوا'))?.id || 'dept-5';
    }
    if (cleanLower.includes('card') || cleanLower.includes('دڵ') || cleanLower.includes('قەستەرە')) {
      return existingDepartments.find(d => d.code === 'CARD' || d.nameKu.includes('دڵ'))?.id || 'dept-3';
    }
    if (cleanLower.includes('gen') || cleanLower.includes('گشتی') || cleanLower.includes('ward')) {
      return existingDepartments.find(d => d.code === 'GEN' || d.nameKu.includes('گشتی'))?.id || 'dept-2';
    }
    if (cleanLower.includes('icu') || cleanLower.includes('چڕ')) {
      return existingDepartments.find(d => d.code === 'NICU' || d.id === 'dept-5')?.id || 'dept-5';
    }

    if (deptMap.has(cleanLower)) {
      return deptMap.get(cleanLower)!;
    }

    // Auto-create new department entry if unique
    const code = clean.substring(0, 4).toUpperCase();
    const newDeptId = `dept-${code.toLowerCase()}-${Date.now().toString(36)}`;
    const newDept: Department = {
      id: newDeptId,
      nameKu: clean,
      nameEn: clean,
      nameAr: clean,
      code,
      iconName: 'Building2',
      color: 'indigo',
      floor: 'نهۆمی ١',
      bedCapacity: 20,
      descriptionKu: `بەشی هاوردەکراو لە خشتەی گووگڵ: ${clean}`,
      descriptionEn: `Imported department: ${clean}`,
      phoneExtension: '100',
    };
    result.departments.push(newDept);
    deptMap.set(cleanLower, newDeptId);
    deptMap.set(code.toLowerCase(), newDeptId);
    return newDeptId;
  };

  const nurseMap = new Map<string, { id: string; nameKu: string; nameEn: string; deptId: string }>();

  // Iterate over all sheets
  for (const sheet of sheets) {
    const rows = sheet.values;
    if (!rows || rows.length === 0) continue;
    result.rawRowsCount += rows.length;

    const sheetLower = sheet.title.toLowerCase();

    // Check if sheet is explicitly for Departments
    if (sheetLower.includes('dept') || sheetLower.includes('بەش') || sheetLower.includes('قسم')) {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length < 2) continue;
        const name = r[0]?.trim() || r[1]?.trim();
        const code = (r[1]?.trim() || name.substring(0, 3)).toUpperCase();
        if (name) {
          getOrCreateDeptId(name);
        }
      }
      continue;
    }

    // Check if sheet is explicitly for Nurses
    if (sheetLower.includes('nurse') || sheetLower.includes('پەرستار') || sheetLower.includes('ممرض') || sheetLower.includes('کارمەند')) {
      const header = rows[0].map(c => (c || '').toLowerCase().trim());
      const idIdx = header.findIndex(h => h.includes('id') || h.includes('ئایدی') || h.includes('کۆد') || h.includes('رقم'));
      const nameIdx = header.findIndex(h => h.includes('name') || h.includes('ناو') || h.includes('اسم'));
      const deptIdx = header.findIndex(h => h.includes('dept') || h.includes('بەش') || h.includes('قسم'));
      const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('مۆبایل') || h.includes('تەلەفۆن') || h.includes('هاتف'));
      const roleIdx = header.findIndex(h => h.includes('role') || h.includes('پلە') || h.includes('پۆست') || h.includes('رتبة'));
      const pinIdx = header.findIndex(h => h.includes('pin') || h.includes('pass') || h.includes('پاسۆرد') || h.includes('تێپەڕ') || h.includes('رمز'));

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        const rawName = nameIdx >= 0 ? r[nameIdx] : r[0];
        if (!rawName || !rawName.trim()) continue;

        const cleanName = rawName.trim();
        const rawId = idIdx >= 0 && r[idIdx] ? r[idIdx].trim() : `NUR-${100 + i}`;
        const rawDept = deptIdx >= 0 && r[deptIdx] ? r[deptIdx].trim() : 'ER';
        const deptId = getOrCreateDeptId(rawDept);
        const phone = phoneIdx >= 0 && r[phoneIdx] ? r[phoneIdx].trim() : '0750 000 0000';
        
        let role: Nurse['role'] = 'registered_nurse';
        const rawRole = (roleIdx >= 0 ? r[roleIdx] : '').toLowerCase();
        if (rawRole.includes('head') || rawRole.includes('بەرپرس') || rawRole.includes('مسؤول')) role = 'head_nurse';
        else if (rawRole.includes('senior') || rawRole.includes('پێشکەوتوو')) role = 'senior_nurse';
        else if (rawRole.includes('trainee') || rawRole.includes('فێرخواز') || rawRole.includes('مبتدئ')) role = 'trainee';

        const matchNurse = (existingNurses || []).find(en => en.id.toLowerCase() === rawId.toLowerCase() || en.fullNameKu.toLowerCase() === cleanName.toLowerCase())
          || INITIAL_NURSES.find(inr => inr.id.toLowerCase() === rawId.toLowerCase() || inr.fullNameKu.toLowerCase() === cleanName.toLowerCase());
        const rawPin = pinIdx >= 0 && r[pinIdx] ? r[pinIdx].trim() : '';
        const resolvedPin = rawPin || matchNurse?.pin || '1234';

        const nurseObj: Nurse = {
          id: rawId,
          pin: resolvedPin,
          fullNameKu: cleanName,
          fullNameEn: cleanName,
          departmentId: deptId,
          role,
          phone,
          status: 'active',
          joinedDate: new Date().toISOString().split('T')[0],
          maxMonthlyHours: 160,
          notes: `هاوردەکراو لە Google Sheets (${sheet.title})`,
        };
        result.nurses.push(nurseObj);
        nurseMap.set(rawId.toLowerCase(), { id: rawId, nameKu: cleanName, nameEn: cleanName, deptId });
        nurseMap.set(cleanName.toLowerCase(), { id: rawId, nameKu: cleanName, nameEn: cleanName, deptId });
      }
      continue;
    }

    // General sheet / Shift Roster sheet parser
    // Check headers to identify columns
    const headerRow = rows[0] || [];
    const headerLower = headerRow.map(h => (h || '').toLowerCase().trim());
    
    const nurseIdx = headerLower.findIndex(h => h.includes('nurse') || h.includes('پەرستار') || h.includes('ناو') || h.includes('name') || h.includes('اسم'));
    const idIdx = headerLower.findIndex(h => h.includes('id') || h.includes('ئایدی') || h.includes('کۆد'));
    const deptIdx = headerLower.findIndex(h => h.includes('dept') || h.includes('بەش') || h.includes('قسم'));
    const dateIdx = headerLower.findIndex(h => h.includes('date') || h.includes('بەروار') || h.includes('تاريخ') || h.includes('ڕۆژ') || h.includes('day'));
    const shiftIdx = headerLower.findIndex(h => h.includes('shift') || h.includes('شیفت') || h.includes('دەوام') || h.includes('نوبة') || h.includes('type'));
    const roomIdx = headerLower.findIndex(h => h.includes('room') || h.includes('bed') || h.includes('ژوور') || h.includes('قەرەوێڵە') || h.includes('سرير'));
    const notesIdx = headerLower.findIndex(h => h.includes('note') || h.includes('تێبینی') || h.includes('ملاحظ'));

    // If it looks like a tabular shift list:
    if (nurseIdx >= 0 || dateIdx >= 0 || shiftIdx >= 0) {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;

        const rawNurseName = nurseIdx >= 0 && r[nurseIdx] ? r[nurseIdx].trim() : '';
        const rawNurseId = idIdx >= 0 && r[idIdx] ? r[idIdx].trim() : '';
        if (!rawNurseName && !rawNurseId) continue;

        const nurseName = rawNurseName || rawNurseId;
        const deptId = deptIdx >= 0 && r[deptIdx] ? getOrCreateDeptId(r[deptIdx]) : existingDepartments[0]?.id || 'dept-1';
        
        // Ensure nurse exists
        let nurseId = rawNurseId;
        if (!nurseId) {
          const found = nurseMap.get(nurseName.toLowerCase());
          if (found) {
            nurseId = found.id;
          } else {
            const matchNurse = (existingNurses || []).find(en => en.fullNameKu.toLowerCase() === nurseName.toLowerCase() || (en.id && en.id.toLowerCase() === nurseName.toLowerCase()))
              || INITIAL_NURSES.find(inr => inr.fullNameKu.toLowerCase() === nurseName.toLowerCase() || inr.id.toLowerCase() === nurseName.toLowerCase());
            const nursePin = matchNurse?.pin || '1234';
            nurseId = matchNurse?.id || `NUR-${200 + i}`;

            result.nurses.push({
              id: nurseId,
              pin: nursePin,
              fullNameKu: matchNurse?.fullNameKu || nurseName,
              fullNameEn: matchNurse?.fullNameEn || nurseName,
              departmentId: deptId,
              role: matchNurse?.role || 'registered_nurse',
              phone: matchNurse?.phone || '0750 000 0000',
              status: 'active',
              joinedDate: matchNurse?.joinedDate || new Date().toISOString().split('T')[0],
              maxMonthlyHours: matchNurse?.maxMonthlyHours || 160,
              notes: `هاوردەکراو لە Google Sheets`,
            });
            nurseMap.set(nurseName.toLowerCase(), { id: nurseId, nameKu: nurseName, nameEn: nurseName, deptId });
          }
        }

        // Shift type detection
        const rawShift = shiftIdx >= 0 && r[shiftIdx] ? r[shiftIdx].trim().toLowerCase() : 'morning';
        let shiftType: ShiftRecord['shiftType'] = 'morning';
        let startTime = '08:00';
        let endTime = '15:00';
        let hours = 7;

        if (rawShift.includes('night') || rawShift.includes('شەو') || rawShift.includes('لیل') || rawShift.includes('N') || rawShift === 'ش') {
          shiftType = 'night';
          startTime = '22:00';
          endTime = '08:00';
          hours = 10;
        } else if (rawShift.includes('even') || rawShift.includes('ئێوارە') || rawShift.includes('عصر') || rawShift.includes('مساء') || rawShift.includes('E') || rawShift === 'ئ') {
          shiftType = 'evening';
          startTime = '15:00';
          endTime = '22:00';
          hours = 7;
        } else if (rawShift.includes('full') || rawShift.includes('٢٤') || rawShift.includes('24') || rawShift.includes('oncall')) {
          shiftType = 'full_day';
          startTime = '08:00';
          endTime = '08:00';
          hours = 24;
        }

        // Date detection
        let dateVal = dateIdx >= 0 && r[dateIdx] ? r[dateIdx].trim() : new Date().toISOString().split('T')[0];
        // Format normalization (e.g. DD/MM/YYYY or MM/DD/YYYY to YYYY-MM-DD)
        if (dateVal.includes('/') || dateVal.includes('.')) {
          const parts = dateVal.split(/[/. -]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              dateVal = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else if (parts[2].length === 4) {
              dateVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }

        const roomBed = roomIdx >= 0 && r[roomIdx] ? r[roomIdx].trim() : undefined;
        const notes = notesIdx >= 0 && r[notesIdx] ? r[notesIdx].trim() : `هاوردەکراو لە ${sheet.title}`;

        result.shifts.push({
          nurseId,
          nurseNameKu: nurseName,
          nurseNameEn: nurseName,
          departmentId: deptId,
          date: dateVal,
          shiftType,
          startTime,
          endTime,
          hours,
          status: 'approved',
          loggedBy: 'admin',
          patientBedRoom: roomBed,
          notes,
        });
      }
    } else {
      // Matrix/Calendar format fallback: Row 0 contains dates or days (e.g. Day 1, Day 2...), Column 0 contains Nurse Names
      if (rows.length > 1 && rows[0].length > 1) {
        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
          const r = rows[rowIdx];
          const nurseName = r[0]?.trim();
          if (!nurseName) continue;

          const nurseId = `NUR-${300 + rowIdx}`;
          const deptId = existingDepartments[0]?.id || 'dept-1';
          
          if (!nurseMap.has(nurseName.toLowerCase())) {
            const matchNurse = (existingNurses || []).find(en => en.fullNameKu.toLowerCase() === nurseName.toLowerCase() || (en.id && en.id.toLowerCase() === nurseName.toLowerCase()))
              || INITIAL_NURSES.find(inr => inr.fullNameKu.toLowerCase() === nurseName.toLowerCase() || inr.id.toLowerCase() === nurseName.toLowerCase());
            const nursePin = matchNurse?.pin || '1234';
            const finalNurseId = matchNurse?.id || nurseId;

            result.nurses.push({
              id: finalNurseId,
              pin: nursePin,
              fullNameKu: matchNurse?.fullNameKu || nurseName,
              fullNameEn: matchNurse?.fullNameEn || nurseName,
              departmentId: deptId,
              role: matchNurse?.role || 'registered_nurse',
              phone: matchNurse?.phone || '0750 000 0000',
              status: 'active',
              joinedDate: matchNurse?.joinedDate || new Date().toISOString().split('T')[0],
              maxMonthlyHours: matchNurse?.maxMonthlyHours || 160,
              notes: `هاوردەکراو لە خشتەی ماتریس`,
            });
            nurseMap.set(nurseName.toLowerCase(), { id: finalNurseId, nameKu: nurseName, nameEn: nurseName, deptId });
          }

          // Parse columns as shifts
          for (let colIdx = 1; colIdx < r.length; colIdx++) {
            const shiftCode = (r[colIdx] || '').trim();
            if (!shiftCode || shiftCode === '-' || shiftCode === 'OFF' || shiftCode === 'پشوودان') continue;

            const headerCol = rows[0][colIdx] || `Day ${colIdx}`;
            let shiftDate = new Date().toISOString().split('T')[0];
            
            // Check if header is a date
            if (headerCol.match(/\d{4}-\d{2}-\d{2}/)) {
              shiftDate = headerCol;
            }

            let shiftType: ShiftRecord['shiftType'] = 'morning';
            let startTime = '08:00';
            let endTime = '15:00';
            let hours = 7;

            const lowerCode = shiftCode.toLowerCase();
            if (lowerCode.includes('n') || lowerCode.includes('شەو') || lowerCode.includes('night')) {
              shiftType = 'night';
              startTime = '22:00';
              endTime = '08:00';
              hours = 10;
            } else if (lowerCode.includes('e') || lowerCode.includes('ئێوارە') || lowerCode.includes('evening')) {
              shiftType = 'evening';
              startTime = '15:00';
              endTime = '22:00';
              hours = 7;
            }

            result.shifts.push({
              nurseId,
              nurseNameKu: nurseName,
              nurseNameEn: nurseName,
              departmentId: deptId,
              date: shiftDate,
              shiftType,
              startTime,
              endTime,
              hours,
              status: 'approved',
              loggedBy: 'admin',
              notes: `شیفتی کۆدی [${shiftCode}] لە ماتریسی ${sheet.title}`,
            });
          }
        }
      }
    }
  }

  return result;
}

// Push local shifts and nurses back to Google Sheets
export async function exportToGoogleSheet(
  spreadsheetId: string,
  accessToken: string,
  nurses: Nurse[],
  departments: Department[],
  shifts: ShiftRecord[]
): Promise<boolean> {
  const getDeptName = (id: string) => {
    const d = departments.find(dep => dep.id === id);
    return d ? d.nameKu : id;
  };

  // 1. Prepare Shifts Tab Data
  const shiftHeaders = [
    'کۆدی شیفت (Shift ID)',
    'ئایدی پەرستار (Nurse ID)',
    'ناوی پەرستار (Nurse Name)',
    'بەش (Department)',
    'بەرواری شیفت (Shift Date)',
    'تایمی داخیلکردن (Submission Time)',
    'بەروار و کاتی داخیلکردن (Logged Timestamp)',
    'جۆری شیفت (Shift Type)',
    'کاتی دەستپێک (Start Time)',
    'کاتی کۆتایی (End Time)',
    'کاتژمێری بنیات (Base Hours)',
    'زیادە یان کەمکردن (Extra/Minus)',
    'کۆی کاتژمێر (Total Net Hours)',
    'دۆخ (Status)',
    'ژوور / قەرەوێڵە (Room/Bed)',
    'تێبینی (Notes)'
  ];

  const shiftRows = shifts.map(s => [
    s.id,
    s.nurseId,
    s.nurseNameKu || s.nurseNameEn,
    getDeptName(s.departmentId),
    s.date,
    formatSubmissionTime(s.createdAt),
    formatSubmissionDateTime(s.createdAt),
    s.shiftType,
    s.startTime,
    s.endTime,
    String(s.hours),
    String(s.extraHours || 0),
    String((Number(s.hours) || 0) + (Number(s.extraHours) || 0)),
    s.status,
    s.patientBedRoom || '',
    s.notes || ''
  ]);

  // 2. Prepare Nurses Tab Data
  const nurseHeaders = [
    'ئایدی (Nurse ID)',
    'ناوی چواری (Full Name)',
    'بەش (Department)',
    'پلە / پۆست (Role)',
    'تەلەفۆن (Phone)',
    'ئیمەیڵ (Email)',
    'دۆخ (Status)',
    'بەرواری دەستبەکاربوون (Joined Date)',
    'تێبینی (Notes)'
  ];

  const nurseRows = nurses.map(n => [
    n.id,
    n.fullNameKu,
    getDeptName(n.departmentId),
    n.role,
    n.phone,
    n.email || '',
    n.status,
    n.joinedDate,
    n.notes || ''
  ]);

  // Write shifts
  const shiftEndCol = colToLetter(shiftHeaders.length - 1);
  const writeShiftsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:${shiftEndCol}${shiftRows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `A1:${shiftEndCol}${shiftRows.length + 1}`,
        majorDimension: 'ROWS',
        values: [shiftHeaders, ...shiftRows],
      }),
    }
  );

  if (!writeShiftsRes.ok) {
    const err = await writeShiftsRes.json().catch(() => ({}));
    throw new Error(`شکستی هێنا لە ناردنی داتا بۆ شیفتەکان: ${err?.error?.message || writeShiftsRes.statusText}`);
  }

  return true;
}
