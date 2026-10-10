// Google Drive & Google Sheets Live Synchronization Service
// Integrates with user's Google Drive account (e.g. muhammadcmcziad@gmail.com)
// Automatically creates & syncs "nurse time" spreadsheet and hospital backup

import { Department, Nurse, ShiftRecord, HospitalNotice } from '../types';
import { INITIAL_NURSES } from '../data/mockData';
import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
const auth = getAuth(app);

declare const google: any;

export interface GoogleDriveUser {
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleDriveFileInfo {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface GoogleSyncState {
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  accessToken: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  folderId: string | null;
  folderName: string | null;
  lastSyncedAt: string | null;
  autoSyncEnabled: boolean;
}

const STORAGE_KEYS = {
  TOKEN: 'careshift_gdrive_access_token',
  USER_EMAIL: 'careshift_gdrive_user_email',
  USER_NAME: 'careshift_gdrive_user_name',
  SHEET_ID: 'careshift_gdrive_sheet_id',
  SHEET_URL: 'careshift_gdrive_sheet_url',
  FOLDER_ID: 'careshift_gdrive_folder_id',
  LAST_SYNC: 'careshift_gdrive_last_sync',
  AUTO_SYNC: 'careshift_gdrive_auto_sync',
};

// Verified OAuth Client ID from Google Cloud project
const GOOGLE_CLIENT_ID = firebaseConfig.oAuthClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '781937578324-nddfq2g5rsr0f5u14khtkvij2gj3lpj8.apps.googleusercontent.com';

// Direct Google sign in supporting Firebase Auth popup with GIS fallback
export async function signInWithGoogle(targetEmail?: string): Promise<{ accessToken: string; user: GoogleDriveUser }> {
  // 1. Try Firebase Auth popup with account chooser
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

    const customParams: Record<string, string> = {
      prompt: 'select_account',
    };
    if (targetEmail) {
      customParams.login_hint = targetEmail;
    }
    provider.setCustomParameters(customParams);

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (token) {
      return {
        accessToken: token,
        user: {
          email: result.user.email || targetEmail,
          name: result.user.displayName || undefined,
          picture: result.user.photoURL || undefined,
        },
      };
    }
  } catch (firebaseErr: any) {
    console.warn('Firebase Auth popup attempted, falling back to GIS Token client:', firebaseErr);
  }

  // 2. Fallback to Google Identity Services token client
  const tokenResult = await requestGoogleToken(targetEmail);
  const profile = await getGoogleUserProfile(tokenResult.accessToken);
  return {
    accessToken: tokenResult.accessToken,
    user: {
      email: profile.email || targetEmail,
      name: profile.name,
      picture: profile.picture,
    },
  };
}

export async function disconnectGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('SignOut error:', e);
  }
  clearGoogleSyncState();
}

export function clearGoogleSyncState(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

// Request OAuth token using Google Identity Services (GIS)
export function requestGoogleToken(hintEmail?: string): Promise<{ accessToken: string; expiresIn?: number }> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
        // If GIS script not yet loaded or blocked, give a descriptive error
        reject(new Error('Google Identity Services (GSI) ئامادە نییە لە پەڕەکەدا. تکایە پەیجەکە تازە بکەرەوە (Refresh) یان دڵنیابەرەوە ئینتەرنێت هەیە.'));
        return;
      }

      const clientConfig: any = {
        client_id: GOOGLE_CLIENT_ID,
        scope: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' '),
        callback: (response: any) => {
          if (response.error) {
            console.error('Google OAuth token error:', response);
            reject(new Error(response.error_description || response.error || 'پەسەندکردنی چوونەژوورەوەی گووگڵ ڕەتکرایەوە.'));
            return;
          }
          if (response.access_token) {
            resolve({
              accessToken: response.access_token,
              expiresIn: response.expires_in,
            });
          } else {
            reject(new Error('تۆکنی گووگڵ بەردەست نەبوو.'));
          }
        },
      };

      if (hintEmail) {
        clientConfig.hint = hintEmail;
      }

      const client = google.accounts.oauth2.initTokenClient(clientConfig);

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      console.error('Error invoking Google token client:', err);
      reject(new Error(err?.message || 'هەڵەیەک لە دەستپێکردنی Google OAuth ڕوویدا.'));
    }
  });
}

// Get Google User Profile info
export async function getGoogleUserProfile(accessToken: string): Promise<GoogleDriveUser> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    }
  } catch (e) {
    console.warn('Could not fetch user profile info:', e);
  }
  return {};
}

// Search or create a folder in Google Drive
export async function getOrCreateDriveFolder(accessToken: string, folderName = 'CareShift - CMC HOSPITAL'): Promise<{ id: string; name: string }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Search for existing folder
    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`, {
      headers,
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return {
          id: searchData.files[0].id,
          name: searchData.files[0].name,
        };
      }
    }

    // 2. Create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      return {
        id: createData.id,
        name: createData.name || folderName,
      };
    }
  } catch (err) {
    console.warn('Folder creation warning:', err);
  }

  return { id: 'root', name: 'My Drive' };
}

// Search for or create "nurse time" spreadsheet in Google Drive
export async function getOrCreateNurseTimeSpreadsheet(
  accessToken: string,
  folderId?: string,
  spreadsheetTitle = 'nurse time'
): Promise<{ id: string; url: string; title: string }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Search for existing spreadsheet by title
    let query = `mimeType='application/vnd.google-apps.spreadsheet' and name='${spreadsheetTitle}' and trashed=false`;
    if (folderId && folderId !== 'root') {
      query += ` and '${folderId}' in parents`;
    }

    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&spaces=drive`, {
      headers,
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        return {
          id: file.id,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          title: file.name,
        };
      }
    }

    // 2. Create brand new spreadsheet using Sheets API
    const sheetCreateRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: {
          title: spreadsheetTitle,
        },
        sheets: [
          { properties: { title: 'Shifts (شیفتەکان)' } },
          { properties: { title: 'Nurses (پەرستاران)' } },
          { properties: { title: 'Departments (بەشەکان)' } },
          { properties: { title: 'Notices (ئاگادارییەکان)' } },
        ],
      }),
    });

    if (sheetCreateRes.ok) {
      const sheetData = await sheetCreateRes.json();
      const spreadsheetId = sheetData.spreadsheetId;
      const url = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // If folder is specified, move the created file into the folder
      if (folderId && folderId !== 'root') {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&fields=id,parents`, {
            method: 'PATCH',
            headers,
          });
        } catch (e) {
          console.warn('Could not move file to folder:', e);
        }
      }

      return {
        id: spreadsheetId,
        url,
        title: spreadsheetTitle,
      };
    }
  } catch (err) {
    console.error('Spreadsheet create error:', err);
  }

  throw new Error('نەتوانرا فایلی "nurse time" لە Google Drive دروست بکرێت یان بدۆزرێتەوە.');
}

// Share file or folder in Google Drive with an email (e.g. muhammadcmcziad@gmail.com)
export async function shareDriveFileWithEmail(
  accessToken: string,
  fileId: string,
  email: string,
  role: 'writer' | 'reader' = 'writer'
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        type: 'user',
        emailAddress: email,
      }),
    });

    if (res.ok) {
      return { success: true };
    }
    const errData = await res.json().catch(() => null);
    return { success: false, message: errData?.error?.message || `Status: ${res.status}` };
  } catch (e: any) {
    return { success: false, message: e?.message };
  }
}

// Helpers to format submission timestamp for Google Sheets
export function formatSubmissionTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function formatSubmissionDateTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const datePart = d.toLocaleDateString('en-CA');
    const timePart = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${datePart} ${timePart}`;
  } catch {
    return '';
  }
}

// Export all hospital data (Shifts, Nurses, Departments, Notices) to Google Sheets
export async function exportAllDataToGoogleDrive(
  accessToken: string,
  spreadsheetId: string,
  data: {
    departments: Department[];
    nurses: Nurse[];
    shifts: ShiftRecord[];
    notices?: HospitalNotice[];
  }
): Promise<{ success: boolean; message: string }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const getDeptName = (id: string) => {
    const d = data.departments.find(dep => dep.id === id);
    return d ? d.nameKu : id;
  };

  // 1. Shifts Tab
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
    'تۆمارکراو لەلایەن (Logged By)',
    'تێبینی (Notes)',
  ];

  const shiftRows = data.shifts.map(s => [
    s.id,
    s.nurseId,
    s.nurseNameKu || s.nurseNameEn,
    getDeptName(s.departmentId),
    s.date,
    formatSubmissionTime(s.createdAt),
    formatSubmissionDateTime(s.createdAt),
    s.shiftType === 'morning' ? 'بەیانیان (Morning)' : s.shiftType === 'evening' ? 'ئێواران (Evening)' : s.shiftType === 'night' ? 'شەوان (Night)' : s.shiftType === 'on_call' ? 'ئۆنکۆڵ (On-Call)' : '٢٤ کاتژمێری',
    s.startTime,
    s.endTime,
    String(s.hours),
    String(s.extraHours || 0),
    String((Number(s.hours) || 0) + (Number(s.extraHours) || 0)),
    s.status === 'approved' ? 'پەسەندکراو (Approved)' : s.status === 'rejected' ? 'ڕەتکراوە (Rejected)' : 'چاوەڕوانکراو (Pending)',
    s.patientBedRoom || '',
    s.loggedBy || 'admin',
    s.notes || '',
  ]);

  // 2. Nurses Tab
  const nurseHeaders = [
    'ئایدی (Nurse ID)',
    'ناوی چواری بە کوردی (Kurdish Name)',
    'ناوی ئینگلیزی (English Name)',
    'بەش (Department)',
    'پلەی وەزیفی (Role / Rank)',
    'کۆدی PIN',
    'ژمارەی مۆبایل (Phone)',
    'ئیمەیڵ (Email)',
    'دۆخی کارکردن (Status)',
    'زۆرترین کاتژمێری مانگانە (Max Hours)',
    'بەرواری دەستبەکاربوون (Joined Date)',
    'تێبینی (Notes)',
  ];

  const nurseRows = data.nurses.map(n => {
    const initNurse = INITIAL_NURSES.find(inr => inr.id.toLowerCase() === n.id.toLowerCase() || inr.fullNameKu === n.fullNameKu);
    const resolvedPin = (n.id === 'A001' || n.id === 'E001')
      ? (n.pin || '1234')
      : n.id === 'A003'
        ? (n.pin || '2233')
        : (n.id === 'A008' || n.id === 'E008')
          ? '11223344'
          : (n.pin && n.pin !== '1234')
            ? n.pin
            : (initNurse?.pin || n.pin || '1234');

    return [
      n.id,
      n.fullNameKu,
      n.fullNameEn || '',
      getDeptName(n.departmentId),
      n.role,
      resolvedPin,
      n.phone,
      n.email || '',
      n.status,
      String(n.maxMonthlyHours || 160),
      n.joinedDate,
      n.notes || '',
    ];
  });

  // 3. Departments Tab
  const deptHeaders = [
    'ئایدی بەش (Dept ID)',
    'ناوی بەش (Kurdish Name)',
    'English Name',
    'کۆدی کورتکراوە (Code)',
    'نهۆم (Floor)',
    'ژمارەی قەرەوێڵە (Beds)',
    'ژمارەی ناوخۆیی (Phone Ext)',
    'ڕوونکردنەوە (Description)',
  ];

  const deptRows = data.departments.map(d => [
    d.id,
    d.nameKu,
    d.nameEn,
    d.code,
    d.floor || 'نهۆمی ١',
    String(d.bedCapacity || 20),
    d.phoneExtension || '100',
    d.descriptionKu || '',
  ]);

  // 1. Inspect existing tabs in the spreadsheet to find where nurses/shifts live
  let existingSheets: { id?: number; title: string }[] = [];
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, { headers });
    if (metaRes.ok) {
      const metaJson = await metaRes.json();
      existingSheets = (metaJson.sheets || []).map((s: any) => ({
        id: s.properties?.sheetId,
        title: s.properties?.title || '',
      }));
    }
  } catch (metaErr) {
    console.warn('Could not inspect sheet tabs:', metaErr);
  }

  // Determine the best sheet tab name for Nurses
  let nurseSheetTitle = 'Nurses (پەرستاران)';
  let shiftSheetTitle = 'Shifts (شیفتەکان)';
  let deptSheetTitle = 'Departments (بەشەکان)';

  if (existingSheets.length > 0) {
    const existingTitles = existingSheets.map(s => s.title);
    
    // Find nurse tab
    const foundNurse = existingTitles.find(t => 
      t.toLowerCase().includes('nurse') || 
      t.includes('پەرستار') || 
      t.toLowerCase().includes('staff') ||
      t.toLowerCase().includes('roster')
    );
    if (foundNurse) {
      nurseSheetTitle = foundNurse;
    } else if (existingTitles.length === 1) {
      // If user has only one sheet (e.g. "Sheet1" or "nurse time"), write nurses there!
      nurseSheetTitle = existingTitles[0];
    }

    // Find shift tab
    const foundShift = existingTitles.find(t => 
      t.toLowerCase().includes('shift') || 
      t.includes('شیفت')
    );
    if (foundShift) {
      shiftSheetTitle = foundShift;
    }

    // Find dept tab
    const foundDept = existingTitles.find(t => 
      t.toLowerCase().includes('dept') || 
      t.toLowerCase().includes('department') || 
      t.includes('بەش')
    );
    if (foundDept) {
      deptSheetTitle = foundDept;
    }

    // If desired tabs don't exist and there are multiple sheets, add any missing tabs
    const desiredTabs = ['Nurses (پەرستاران)', 'Shifts (شیفتەکان)', 'Departments (بەشەکان)'];
    const missingTabs = desiredTabs.filter(d => !existingTitles.includes(d) && d !== nurseSheetTitle && d !== shiftSheetTitle && d !== deptSheetTitle);
    if (missingTabs.length > 0 && existingTitles.length > 1) {
      try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            requests: missingTabs.map(title => ({
              addSheet: { properties: { title } }
            }))
          })
        });
      } catch (addErr) {
        console.warn('Could not auto-add missing sheet tabs:', addErr);
      }
    }
  }

  // Execute updates using batchUpdate values
  const nurseEndCol = colToLetter(nurseHeaders.length - 1);
  const shiftEndCol = colToLetter(shiftHeaders.length - 1);
  const deptEndCol = colToLetter(deptHeaders.length - 1);

  const payloadData: Array<{ range: string; values: any[][] }> = [
    {
      range: `'${nurseSheetTitle}'!A1:${nurseEndCol}${nurseRows.length + 1}`,
      values: [nurseHeaders, ...nurseRows],
    },
  ];

  if (shiftSheetTitle !== nurseSheetTitle) {
    payloadData.push({
      range: `'${shiftSheetTitle}'!A1:${shiftEndCol}${shiftRows.length + 1}`,
      values: [shiftHeaders, ...shiftRows],
    });
  }

  if (deptSheetTitle !== nurseSheetTitle && deptSheetTitle !== shiftSheetTitle) {
    payloadData.push({
      range: `'${deptSheetTitle}'!A1:${deptEndCol}${deptRows.length + 1}`,
      values: [deptHeaders, ...deptRows],
    });
  }

  const payload = {
    valueInputOption: 'USER_ENTERED',
    data: payloadData,
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }
  );

  if (!updateRes.ok) {
    // If batchUpdate fails, update the first sheet directly with nurses data
    const fallbackRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:L${nurseRows.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          range: `A1:L${nurseRows.length + 1}`,
          values: [nurseHeaders, ...nurseRows],
        }),
      }
    );

    if (!fallbackRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(`نەتوانرا داتاکان هەناردەی شیتەکە بکرێن: ${err?.error?.message || updateRes.statusText}`);
    }
  }

  return {
    success: true,
    message: `سەرجەم داتاکان (${data.nurses.length} پەرستار، ${data.shifts.length} شیفت، ${data.departments.length} بەش) لەناو Google Drive و Google Sheets خەزن کران.`,
  };
}

export const DEFAULT_SPREADSHEET_ID = '1JLIc-54GHadPzASFX8Fw0BtrMZhxjPjhXarMbGsfnkU';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1JLIc-54GHadPzASFX8Fw0BtrMZhxjPjhXarMbGsfnkU/edit?usp=drivesdk';

// Helper to convert 0-based column index to Excel/Sheets column letters (A, B, ..., Z, AA, AB, ...)
export function colToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export interface NurseCredentialSyncParams {
  oldId: string;
  newId: string;
  newPin: string;
  fullNameKu: string;
  fullNameEn?: string;
  phone?: string;
  role?: string;
  allNurses: any[];
  allDepartments: any[];
  allShifts: any[];
}

// Automatically syncs a changed nurse ID, PIN/password, or profile to Google Sheets
export async function syncNurseCredentialsToGoogleSheet(
  params: NurseCredentialSyncParams
): Promise<{ success: boolean; message: string }> {
  const syncState = getSavedGoogleSyncState();
  const spreadsheetId = syncState.spreadsheetId || DEFAULT_SPREADSHEET_ID;

  if (!syncState.accessToken) {
    throw new Error('AUTH_REQUIRED');
  }

  const headers = {
    Authorization: `Bearer ${syncState.accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Inspect spreadsheet tabs
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`,
    { headers }
  );

  if (metaRes.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'نەتوانرا پەیوەندی بە Google Sheets بکرێت');
  }

  const meta = await metaRes.json();
  const sheetTabs: { id?: number; title: string }[] = (meta.sheets || []).map((s: any) => ({
    id: s.properties?.sheetId,
    title: s.properties?.title || '',
  }));

  let directRowUpdated = false;

  // Search each tab for the nurse row (to update custom sheet tab directly)
  for (const tab of sheetTabs) {
    try {
      const getValRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab.title)}!A1:Z120`,
        { headers }
      );
      if (!getValRes.ok) continue;

      const valJson = await getValRes.json();
      const rows: any[][] = valJson.values || [];
      if (rows.length === 0) continue;

      const headerRow = (rows[0] || []).map((c: any) => String(c || '').toLowerCase().trim());
      const idColIdx = headerRow.findIndex(h => h.includes('id') || h.includes('ئایدی') || h.includes('کۆد'));
      const pinColIdx = headerRow.findIndex(h => h.includes('pin') || h.includes('pass') || h.includes('وشەی') || h.includes('نهێنی') || h.includes('تێپەڕبوون'));
      const nameColIdx = headerRow.findIndex(h => h.includes('name') || h.includes('ناو') || h.includes('پەرستار'));
      const phoneColIdx = headerRow.findIndex(h => h.includes('phone') || h.includes('مۆبایل') || h.includes('تەلەفۆن'));

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const rowText = row.map(c => String(c || '').trim().toLowerCase());

        const cleanOldId = params.oldId.trim().toLowerCase();
        const cleanNewId = params.newId.trim().toLowerCase();
        const cleanNameKu = params.fullNameKu.trim().toLowerCase();
        const cleanNameEn = (params.fullNameEn || '').trim().toLowerCase();

        const matchesNurse =
          (cleanOldId && rowText.includes(cleanOldId)) ||
          (cleanNewId && rowText.includes(cleanNewId)) ||
          (cleanNameKu && rowText.some(cell => cell.includes(cleanNameKu))) ||
          (cleanNameEn && rowText.some(cell => cell.includes(cleanNameEn)));

        if (matchesNurse && r > 0) {
          // Update ID
          if (idColIdx >= 0) {
            row[idColIdx] = params.newId;
          } else {
            const oldIdIdx = rowText.indexOf(cleanOldId);
            if (oldIdIdx >= 0) row[oldIdIdx] = params.newId;
          }

          // Update PIN / Password
          if (pinColIdx >= 0) {
            row[pinColIdx] = params.newPin;
          } else {
            let pinReplaced = false;
            for (let c = 0; c < row.length; c++) {
              if (c !== idColIdx && c !== nameColIdx && /^\d{3,8}$/.test(String(row[c] || '').trim())) {
                row[c] = params.newPin;
                pinReplaced = true;
                break;
              }
            }
            if (!pinReplaced && row.length > 5) {
              row[5] = params.newPin;
            }
          }

          // Update Name & Phone
          if (nameColIdx >= 0 && params.fullNameKu) row[nameColIdx] = params.fullNameKu;
          if (phoneColIdx >= 0 && params.phone) row[phoneColIdx] = params.phone;

          const endColLetter = colToLetter(Math.max(row.length - 1, 10));
          const rowRange = `'${tab.title}'!A${r + 1}:${endColLetter}${r + 1}`;

          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                range: rowRange,
                values: [row],
              }),
            }
          );
          directRowUpdated = true;
          break;
        }
      }
    } catch (tabErr) {
      console.warn(`Error scanning tab ${tab.title}:`, tabErr);
    }
  }

  // 2. Also export the full dataset to keep structured tabs 100% synchronized
  try {
    const updatedNurses = params.allNurses.map((n: any) => {
      const isTarget = 
        n.id.toUpperCase() === params.oldId.toUpperCase() || 
        n.id.toUpperCase() === params.newId.toUpperCase() || 
        n.fullNameKu === params.fullNameKu;
      if (isTarget) {
        return {
          ...n,
          id: params.newId,
          pin: params.newPin,
          fullNameKu: params.fullNameKu,
          fullNameEn: params.fullNameEn || n.fullNameEn,
          phone: params.phone || n.phone,
          role: params.role || n.role,
        };
      }
      return n;
    });

    await exportAllDataToGoogleDrive(syncState.accessToken, spreadsheetId, {
      departments: params.allDepartments,
      nurses: updatedNurses,
      shifts: params.allShifts,
    });
  } catch (exportErr) {
    console.warn('Batch export follow-up warning:', exportErr);
  }

  saveGoogleSyncState({ lastSyncedAt: new Date().toISOString() });

  return {
    success: true,
    message: directRowUpdated
      ? `ئایدی (${params.newId}) و وشەی نهێنی (${params.newPin}) ڕاستەوخۆ لە ناو Google Sheets (nurse time) گۆڕدرا!`
      : `فایلی Google Sheets (nurse time) بە سەرکەوتوویی بە ئایدی (${params.newId}) و وشەی نهێنی (${params.newPin}) نوێکرایەوە!`,
  };
}

// Automatically syncs a new or updated shift directly to Google Sheets with submission time
export async function syncShiftToGoogleSheet(params: {
  shift: ShiftRecord;
  allShifts: ShiftRecord[];
  allNurses: Nurse[];
  allDepartments: Department[];
}): Promise<{ success: boolean; message?: string }> {
  const syncState = getSavedGoogleSyncState();
  if (!syncState.accessToken) {
    return { success: false, message: 'Google account not connected' };
  }

  const spreadsheetId = syncState.spreadsheetId || DEFAULT_SPREADSHEET_ID;
  const headers = {
    Authorization: `Bearer ${syncState.accessToken}`,
    'Content-Type': 'application/json',
  };

  const getDeptName = (id: string) => {
    const d = params.allDepartments.find(dep => dep.id === id);
    return d ? d.nameKu : id;
  };

  const s = params.shift;
  const newRow = [
    s.id,
    s.nurseId,
    s.nurseNameKu || s.nurseNameEn,
    getDeptName(s.departmentId),
    s.date,
    formatSubmissionTime(s.createdAt),
    formatSubmissionDateTime(s.createdAt),
    s.shiftType === 'morning' ? 'بەیانیان (Morning)' : s.shiftType === 'evening' ? 'ئێواران (Evening)' : s.shiftType === 'night' ? 'شەوان (Night)' : s.shiftType === 'on_call' ? 'ئۆنکۆڵ (On-Call)' : '٢٤ کاتژمێری',
    s.startTime,
    s.endTime,
    String(s.hours),
    String(s.extraHours || 0),
    String((Number(s.hours) || 0) + (Number(s.extraHours) || 0)),
    s.status === 'approved' ? 'پەسەندکراو (Approved)' : s.status === 'rejected' ? 'ڕەتکراوە (Rejected)' : 'چاوەڕوانکراو (Pending)',
    s.patientBedRoom || '',
    s.loggedBy || 'nurse',
    s.notes || '',
  ];

  // Try appending directly to the shifts sheet for lightning-fast real-time update
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`,
      { headers }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const sheetTabs: string[] = (meta.sheets || []).map((st: any) => st.properties?.title || '');
      const shiftTab = sheetTabs.find(t => t.toLowerCase().includes('shift') || t.includes('شیفت'));

      if (shiftTab) {
        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(shiftTab)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              values: [newRow],
            }),
          }
        );
        if (appendRes.ok) {
          saveGoogleSyncState({ lastSyncedAt: new Date().toISOString() });
          return { success: true };
        }
      }
    }
  } catch (err) {
    console.warn('Direct append to sheets failed, falling back to batch update:', err);
  }

  // Fallback: Batch export full shifts dataset
  try {
    await exportAllDataToGoogleDrive(syncState.accessToken, spreadsheetId, {
      departments: params.allDepartments,
      nurses: params.allNurses,
      shifts: params.allShifts,
    });
    saveGoogleSyncState({ lastSyncedAt: new Date().toISOString() });
    return { success: true };
  } catch (exportErr) {
    console.warn('Batch sync fallback failed:', exportErr);
    return { success: false };
  }
}

// Local storage helper for Google Drive settings
export function getSavedGoogleSyncState(): GoogleSyncState {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const email = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  const name = localStorage.getItem(STORAGE_KEYS.USER_NAME);
  const sheetId = localStorage.getItem(STORAGE_KEYS.SHEET_ID);
  const sheetUrl = localStorage.getItem(STORAGE_KEYS.SHEET_URL);
  const folderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID);
  const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  const autoSync = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) === 'true';

  return {
    isConnected: !!(token || email),
    userEmail: email,
    userName: name,
    accessToken: token,
    spreadsheetId: sheetId || DEFAULT_SPREADSHEET_ID,
    spreadsheetUrl: sheetUrl || DEFAULT_SPREADSHEET_URL,
    folderId: folderId,
    folderName: 'CareShift - نەخۆشخانەی فریاکەوتن',
    lastSyncedAt: lastSync,
    autoSyncEnabled: autoSync,
  };
}

export function saveGoogleSyncState(state: Partial<GoogleSyncState>): void {
  if (state.accessToken !== undefined) {
    if (state.accessToken) localStorage.setItem(STORAGE_KEYS.TOKEN, state.accessToken);
    else localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
  if (state.userEmail !== undefined) {
    if (state.userEmail) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, state.userEmail);
    else localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
  if (state.userName !== undefined) {
    if (state.userName) localStorage.setItem(STORAGE_KEYS.USER_NAME, state.userName);
    else localStorage.removeItem(STORAGE_KEYS.USER_NAME);
  }
  if (state.spreadsheetId !== undefined) {
    if (state.spreadsheetId) localStorage.setItem(STORAGE_KEYS.SHEET_ID, state.spreadsheetId);
    else localStorage.removeItem(STORAGE_KEYS.SHEET_ID);
  }
  if (state.spreadsheetUrl !== undefined) {
    if (state.spreadsheetUrl) localStorage.setItem(STORAGE_KEYS.SHEET_URL, state.spreadsheetUrl);
    else localStorage.removeItem(STORAGE_KEYS.SHEET_URL);
  }
  if (state.folderId !== undefined) {
    if (state.folderId) localStorage.setItem(STORAGE_KEYS.FOLDER_ID, state.folderId);
    else localStorage.removeItem(STORAGE_KEYS.FOLDER_ID);
  }
  if (state.lastSyncedAt !== undefined) {
    if (state.lastSyncedAt) localStorage.setItem(STORAGE_KEYS.LAST_SYNC, state.lastSyncedAt);
    else localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }
  if (state.autoSyncEnabled !== undefined) {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, String(state.autoSyncEnabled));
  }
}
