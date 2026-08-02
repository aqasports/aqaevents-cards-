"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Employee {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  archived: boolean;
  department: { id: string; name: string } | null;
  cards: Array<{ id: string; cardCode: string }>;
  _count: { redemptions: number };
}

export default function PortalEmployeesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "VIEWER";
  const canManage = role === "OWNER" || role === "HR_MANAGER";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Single Add Employee Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [assignCard, setAssignCard] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Bulk CSV Import Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      } else {
        setError("Failed to load employees.");
      }
    } catch {
      setError("Network error loading employee list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newName,
          email: newEmail || undefined,
          phone: newPhone || undefined,
          assignCard,
        }),
      });

      if (res.ok) {
        setMessage("Employee added successfully.");
        setShowAddModal(false);
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        await loadEmployees();
      } else {
        const data = await res.json();
        setMessage(`Failed: ${data.error || "Could not add employee"}`);
      }
    } catch {
      setMessage("Network error creating employee.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCsvPreview() {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/portal/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, commit: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportPreview(data);
      }
    } catch {
      setMessage("Failed to preview CSV import.");
    } finally {
      setImporting(false);
    }
  }

  async function handleCsvCommit() {
    if (!csvText.trim() || !canManage) return;
    setImporting(true);
    try {
      const res = await fetch("/api/portal/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, commit: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`Successfully imported ${data.importedCount || 0} employees.`);
        setShowImportModal(false);
        setCsvText("");
        setImportPreview(null);
        await loadEmployees();
      } else {
        const data = await res.json();
        setMessage(`CSV import failed: ${data.error}`);
      }
    } catch {
      setMessage("Network error processing CSV import.");
    } finally {
      setImporting(false);
    }
  }

  async function toggleDeactivate(employee: Employee) {
    if (!canManage) return;
    try {
      const res = await fetch("/api/portal/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: employee.id,
          archived: !employee.archived,
        }),
      });
      if (res.ok) {
        setMessage(`Employee status updated.`);
        await loadEmployees();
      }
    } catch {
      setMessage("Failed to update status.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white">Employee Roster Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage company staff accounts, card codes, and bulk import rosters
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
            >
              Bulk CSV Import
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shadow-sky-500/10"
            >
              Add Single Employee
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 text-xs font-medium">
          {message}
        </div>
      )}

      {/* Employee List Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading roster...</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No employees registered yet. Click "Add Single Employee" or "Bulk CSV Import" to add staff.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Card Code</th>
                  <th className="p-4">Activities Booked</th>
                  <th className="p-4">Status</th>
                  {canManage && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4 font-bold text-white">{emp.fullName}</td>
                    <td className="p-4 space-y-0.5">
                      {emp.email && <div className="text-slate-300">{emp.email}</div>}
                      {emp.phone && <div className="text-slate-500 font-mono text-[11px]">{emp.phone}</div>}
                    </td>
                    <td className="p-4">
                      {emp.department ? (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px]">
                          {emp.department.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-sky-400">
                      {emp.cards[0]?.cardCode || "No Active Card"}
                    </td>
                    <td className="p-4 font-mono font-bold">{emp._count.redemptions}</td>
                    <td className="p-4">
                      {emp.archived ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold rounded">
                          Inactive
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">
                          Active
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleDeactivate(emp)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition"
                        >
                          {emp.archived ? "Reactivate" : "Deactivate"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Single Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Single Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Salim Benali"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="salim@company.com"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+213555123456"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
                />
              </div>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={assignCard}
                  onChange={(e) => setAssignCard(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-sky-500"
                />
                <span>Auto-generate and assign digital AQA Card</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl"
                >
                  {submitting ? "Adding..." : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-2xl p-6 rounded-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Bulk Employee CSV Import</h3>
            <p className="text-xs text-slate-400">
              Paste CSV text formatted with columns: <code className="text-sky-400 font-mono">fullName, email, phone, departmentName, cardCode</code>
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="fullName,email,phone,departmentName&#10;Karim Meziane,karim@company.com,+213555123456,Engineering&#10;Amira Haddad,amira@company.com,+213555654321,Sales"
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500"
            />

            <div className="flex gap-3">
              <button
                type="button"
                disabled={importing || !csvText.trim()}
                onClick={handleCsvPreview}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700"
              >
                Validate & Preview
              </button>
            </div>

            {importPreview && (
              <div className="space-y-3 border-t border-slate-800 pt-4 text-xs">
                <div className="flex gap-4 text-slate-300 font-medium">
                  <span>Total: <b>{importPreview.totalRows}</b></span>
                  <span className="text-emerald-400">Valid: <b>{importPreview.validRows}</b></span>
                  <span className="text-red-400">Errors: <b>{importPreview.errorRows}</b></span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {importPreview.preview.map((row: any) => (
                    <div
                      key={row.rowNumber}
                      className={`p-2 rounded-lg border ${
                        row.valid ? "bg-emerald-500/5 border-emerald-500/20 text-slate-300" : "bg-red-500/5 border-red-500/20 text-red-400"
                      }`}
                    >
                      Row {row.rowNumber}: {row.data.fullName || "Unnamed"} ({row.data.email || row.data.phone || "no contact"})
                      {!row.valid && <div className="text-[10px] font-sans text-red-400 mt-0.5">{row.errors.join(", ")}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing || !importPreview || importPreview.validRows === 0}
                onClick={handleCsvCommit}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs"
              >
                {importing ? "Importing..." : `Confirm Import (${importPreview?.validRows || 0} valid)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
