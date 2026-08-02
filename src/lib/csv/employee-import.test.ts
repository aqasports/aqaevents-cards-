import { describe, it, expect } from "vitest";
import { parseEmployeeCsv } from "./employee-import";

describe("parseEmployeeCsv Pure Utility Function", () => {
  it("should parse valid employee CSV text correctly", () => {
    const csv = `fullName,email,phone,department
Amine Benali,amine@company.dz,+213550123456,Engineering
Sarah Khelifi,sarah@company.dz,+213660987654,HR
Karim Mansouri,karim@company.dz,+213770112233,Finance`;

    const result = parseEmployeeCsv(csv);
    expect(result.totalRows).toBe(3);
    expect(result.errors.length).toBe(0);
    expect(result.valid.length).toBe(3);

    expect(result.valid[0]).toEqual({
      rowNumber: 2,
      fullName: "Amine Benali",
      email: "amine@company.dz",
      phone: "+213550123456",
      department: "Engineering",
    });
  });

  it("should handle missing optional header variations gracefully", () => {
    const csv = `Full Name,Email Address,Mobile,Dept
Yacine Zouari,yacine@tech.dz,0555112233,Marketing`;

    const result = parseEmployeeCsv(csv);
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].fullName).toBe("Yacine Zouari");
    expect(result.valid[0].email).toBe("yacine@tech.dz");
    expect(result.valid[0].department).toBe("Marketing");
  });

  it("should report error for missing required fullName", () => {
    const csv = `fullName,email,phone,department
,invalid@company.dz,+213550000000,Sales`;

    const result = parseEmployeeCsv(csv);
    expect(result.valid.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain("Missing or invalid fullName");
  });

  it("should report error when both email and phone are missing", () => {
    const csv = `fullName,email,phone,department
Mohamed Lazreg,,,Operations`;

    const result = parseEmployeeCsv(csv);
    expect(result.valid.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain("At least one contact method");
  });

  it("should report error for malformed email", () => {
    const csv = `fullName,email,phone,department
Nour Hamdi,not-an-email,+213550000000,Sales`;

    const result = parseEmployeeCsv(csv);
    expect(result.valid.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain("Malformed email address");
  });

  it("should report error for malformed phone number", () => {
    const csv = `fullName,email,phone,department
Nour Hamdi,nour@company.dz,123,Sales`;

    const result = parseEmployeeCsv(csv);
    expect(result.valid.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain("Malformed phone number");
  });

  it("should catch duplicate email or phone within the same file", () => {
    const csv = `fullName,email,phone,department
User One,user1@company.dz,+213550111111,IT
User Two,user1@company.dz,+213550222222,IT
User Three,user3@company.dz,+213550111111,IT`;

    const result = parseEmployeeCsv(csv);
    expect(result.valid.length).toBe(1); // Only row 1 is valid
    expect(result.errors.length).toBe(2);
    expect(result.errors[0].reason).toContain("Duplicate email address in file");
    expect(result.errors[1].reason).toContain("Duplicate phone number in file");
  });

  it("should return error for empty CSV text", () => {
    const result1 = parseEmployeeCsv("");
    expect(result1.errors[0].reason).toContain("Empty CSV file");

    const result2 = parseEmployeeCsv("   \n\n ");
    expect(result2.errors[0].reason).toContain("Empty CSV file");
  });

  it("should return error when fullName header is missing", () => {
    const csv = `email,phone,department
test@company.dz,+213550000000,IT`;

    const result = parseEmployeeCsv(csv);
    expect(result.errors[0].reason).toContain("Missing required header: fullName");
  });
});
