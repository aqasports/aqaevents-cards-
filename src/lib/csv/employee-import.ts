export interface ParsedEmployeeRow {
  rowNumber: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
}

export interface ImportError {
  rowNumber: number;
  reason: string;
}

export interface CsvImportResult {
  valid: ParsedEmployeeRow[];
  errors: ImportError[];
  totalRows: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{8,20}$/;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseEmployeeCsv(csvText: string): CsvImportResult {
  if (!csvText || !csvText.trim()) {
    return {
      valid: [],
      errors: [{ rowNumber: 0, reason: "Empty CSV file" }],
      totalRows: 0,
    };
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      valid: [],
      errors: [{ rowNumber: 0, reason: "Empty CSV file" }],
      totalRows: 0,
    };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().replace(/[\s_]/g, ""));

  const fullNameIdx = headers.findIndex((h) => h === "fullname" || h === "name" || h === "employee");
  const emailIdx = headers.findIndex((h) => h === "email" || h === "emailaddress");
  const phoneIdx = headers.findIndex((h) => h === "phone" || h === "phonenumber" || h === "mobile");
  const deptIdx = headers.findIndex((h) => h === "department" || h === "dept" || h === "departmentname");

  if (fullNameIdx === -1) {
    return {
      valid: [],
      errors: [{ rowNumber: 0, reason: "Missing required header: fullName" }],
      totalRows: 0,
    };
  }

  const validRows: ParsedEmployeeRow[] = [];
  const errors: ImportError[] = [];

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const seenNames = new Set<string>();

  const dataLines = lines.slice(1);

  dataLines.forEach((line, index) => {
    const rowNumber = index + 2; // Row 1 is header
    const cols = parseCsvLine(line);

    const fullName = cols[fullNameIdx] ? cols[fullNameIdx].trim() : "";
    const emailRaw = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx].trim() : "";
    const phoneRaw = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].trim() : "";
    const departmentRaw = deptIdx !== -1 && cols[deptIdx] ? cols[deptIdx].trim() : "";

    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const phone = phoneRaw || null;
    const department = departmentRaw || null;

    // Check 1: Missing full name
    if (!fullName || fullName.length < 2) {
      errors.push({ rowNumber, reason: "Missing or invalid fullName (at least 2 characters required)" });
      return;
    }

    // Check 2: Either email or phone must be provided
    if (!email && !phone) {
      errors.push({ rowNumber, reason: "At least one contact method (email or phone) is required" });
      return;
    }

    // Check 3: Email format
    if (email && !EMAIL_REGEX.test(email)) {
      errors.push({ rowNumber, reason: `Malformed email address: ${email}` });
      return;
    }

    // Check 4: Phone format
    if (phone && !PHONE_REGEX.test(phone)) {
      errors.push({ rowNumber, reason: `Malformed phone number: ${phone}` });
      return;
    }

    // Check 5: Duplicates in same file
    if (email && seenEmails.has(email)) {
      errors.push({ rowNumber, reason: `Duplicate email address in file: ${email}` });
      return;
    }

    if (phone && seenPhones.has(phone)) {
      errors.push({ rowNumber, reason: `Duplicate phone number in file: ${phone}` });
      return;
    }

    const nameKey = `${fullName.toLowerCase()}|${(department || "").toLowerCase()}`;
    if (seenNames.has(nameKey)) {
      errors.push({ rowNumber, reason: `Duplicate employee name in department in file: ${fullName}` });
      return;
    }

    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    seenNames.add(nameKey);

    validRows.push({
      rowNumber,
      fullName,
      email,
      phone,
      department,
    });
  });

  return {
    valid: validRows,
    errors,
    totalRows: dataLines.length,
  };
}
