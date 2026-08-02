import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { nanoid } from "nanoid";

export const csvRowSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-]{8,15}$/, "Invalid phone number format")
    .optional()
    .nullable()
    .or(z.literal("")),
  departmentName: z.string().optional().nullable().or(z.literal("")),
  cardCode: z.string().optional().nullable().or(z.literal("")),
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;

export interface CsvImportRowResult {
  rowNumber: number;
  data: Partial<CsvRowInput>;
  valid: boolean;
  errors: string[];
  isDuplicate?: boolean;
}

export interface CsvImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  preview: CsvImportRowResult[];
  importedCount?: number;
}

export function parseCsvText(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      let key = header;
      if (key === "nom" || key === "name") key = "fullname";
      if (key === "telephone" || key === "mobile") key = "phone";
      if (key === "department" || key === "dept") key = "departmentname";
      if (key === "card") key = "cardcode";

      if (key === "fullname") row["fullName"] = values[idx] || "";
      else if (key === "email") row["email"] = values[idx] || "";
      else if (key === "phone") row["phone"] = values[idx] || "";
      else if (key === "departmentname") row["departmentName"] = values[idx] || "";
      else if (key === "cardcode") row["cardCode"] = values[idx] || "";
      else row[header] = values[idx] || "";
    });

    rows.push(row);
  }

  return rows;
}

export async function processEmployeeCsvImport(
  csvText: string,
  organizationId: string,
  commit: boolean = false
): Promise<CsvImportSummary> {
  const rawRows = parseCsvText(csvText);

  if (rawRows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      preview: [],
    };
  }

  // Check required column presence
  const firstRow = rawRows[0];
  if (!("fullName" in firstRow)) {
    return {
      totalRows: rawRows.length,
      validRows: 0,
      errorRows: rawRows.length,
      duplicateRows: 0,
      preview: [
        {
          rowNumber: 1,
          data: firstRow,
          valid: false,
          errors: ["Missing required header column 'fullName' (or 'name' / 'nom')"],
        },
      ],
    };
  }

  // Fetch existing clients & cards for deduplication
  const existingClients = await prisma.client.findMany({
    where: { organizationId },
    select: { id: true, email: true, phone: true, fullName: true },
  });

  const existingEmails = new Set(existingClients.map((c) => c.email?.toLowerCase()).filter(Boolean));
  const existingPhones = new Set(existingClients.map((c) => c.phone?.replace(/\s+/g, "")).filter(Boolean));

  // Fetch existing departments for org
  const existingDepts = await prisma.department.findMany({
    where: { organizationId },
  });
  const deptMap = new Map<string, string>(existingDepts.map((d) => [d.name.toLowerCase(), d.id]));

  const seenInBatchEmails = new Set<string>();
  const seenInBatchPhones = new Set<string>();

  const preview: CsvImportRowResult[] = [];
  let validRowsCount = 0;
  let errorRowsCount = 0;
  let duplicateRowsCount = 0;

  const validItemsToCommit: Array<{
    fullName: string;
    email: string | null;
    phone: string | null;
    departmentName: string | null;
    cardCode: string | null;
  }> = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // header is row 1
    const raw = rawRows[i];

    const cleanEmail = raw.email?.trim().toLowerCase() || null;
    const cleanPhone = raw.phone?.trim().replace(/\s+/g, "") || null;
    const cleanName = raw.fullName?.trim() || "";

    const validation = csvRowSchema.safeParse({
      fullName: cleanName,
      email: cleanEmail || undefined,
      phone: cleanPhone || undefined,
      departmentName: raw.departmentName?.trim() || undefined,
      cardCode: raw.cardCode?.trim() || undefined,
    });

    const rowErrors: string[] = [];

    if (!validation.success) {
      validation.error.issues.forEach((issue) => {
        rowErrors.push(`${issue.path.join(".")}: ${issue.message}`);
      });
    }

    if (!cleanEmail && !cleanPhone) {
      rowErrors.push("At least one contact method (email or phone) is required");
    }

    let isDup = false;
    if (cleanEmail && (existingEmails.has(cleanEmail) || seenInBatchEmails.has(cleanEmail))) {
      isDup = true;
      rowErrors.push(`Duplicate email found: ${cleanEmail}`);
    }
    if (cleanPhone && (existingPhones.has(cleanPhone) || seenInBatchPhones.has(cleanPhone))) {
      isDup = true;
      rowErrors.push(`Duplicate phone found: ${cleanPhone}`);
    }

    if (rowErrors.length > 0) {
      errorRowsCount++;
      if (isDup) duplicateRowsCount++;
      preview.push({
        rowNumber: rowNum,
        data: raw,
        valid: false,
        errors: rowErrors,
        isDuplicate: isDup,
      });
    } else {
      validRowsCount++;
      if (cleanEmail) seenInBatchEmails.add(cleanEmail);
      if (cleanPhone) seenInBatchPhones.add(cleanPhone);

      preview.push({
        rowNumber: rowNum,
        data: raw,
        valid: true,
        errors: [],
        isDuplicate: false,
      });

      validItemsToCommit.push({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        departmentName: raw.departmentName?.trim() || null,
        cardCode: raw.cardCode?.trim() || null,
      });
    }
  }

  let importedCount = 0;

  if (commit && validItemsToCommit.length > 0) {
    for (const item of validItemsToCommit) {
      let deptId: string | null = null;

      if (item.departmentName) {
        const lowerDept = item.departmentName.toLowerCase();
        if (deptMap.has(lowerDept)) {
          deptId = deptMap.get(lowerDept)!;
        } else {
          // Auto-create department if it doesn't exist
          const newDept = await prisma.department.create({
            data: {
              organizationId,
              name: item.departmentName,
            },
          });
          deptId = newDept.id;
          deptMap.set(lowerDept, deptId);
        }
      }

      // Create client
      const client = await prisma.client.create({
        data: {
          fullName: item.fullName,
          email: item.email,
          phone: item.phone,
          organizationId,
          departmentId: deptId,
        },
      });

      // Create or assign card
      const publicToken = nanoid(12);
      const cardCode = item.cardCode || `AQA-CORP-${nanoid(6).toUpperCase()}`;

      await prisma.card.create({
        data: {
          clientId: client.id,
          publicToken,
          cardCode,
          status: "active",
        },
      });

      importedCount++;
    }
  }

  return {
    totalRows: rawRows.length,
    validRows: validRowsCount,
    errorRows: errorRowsCount,
    duplicateRows: duplicateRowsCount,
    preview,
    importedCount: commit ? importedCount : undefined,
  };
}
