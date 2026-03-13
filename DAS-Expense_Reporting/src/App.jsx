import { useEffect, useMemo, useRef, useState } from "react";

const trips = [
  { name: "USGS Site Visit – Denver", code: "GPSCv5-241", status: "Active", traveler: "Ross Woodley" },
  { name: "Client Meeting – Tampa", code: "TBW-109", status: "Pending Approval", traveler: "Danielle Molisee" },
  { name: "Conference – MAPPS Montana", code: "MAPPS-26", status: "Exported", traveler: "Ross Woodley" },
];

const expenses = [
  { vendor: "Delta Air Lines", date: "Mar 11, 2026", amount: "$482.16", category: "Airfare", payment: "Company Card", status: "Ready" },
  { vendor: "Hilton Denver City Center", date: "Mar 11, 2026", amount: "$318.42", category: "Hotel", payment: "Personal Card", status: "Needs Approval" },
  { vendor: "Uber", date: "Mar 12, 2026", amount: "$36.18", category: "Ground Transport", payment: "Company Card", status: "Missing Receipt" },
  { vendor: "Shell", date: "Mar 12, 2026", amount: "$54.80", category: "Fuel", payment: "Cash", status: "Ready" },
];

const queue = [
  { employee: "Ross Woodley", trip: "USGS Site Visit – Denver", total: "$854.58", items: 3, issue: "1 personal-card reimbursement", status: "Awaiting PM" },
  { employee: "Danielle Molisee", trip: "Client Meeting – Tampa", total: "$218.11", items: 2, issue: "Meal over policy limit", status: "Needs Review" },
  { employee: "Michael Wasielewski", trip: "Aircraft Ferry – PR", total: "$1,442.07", items: 5, issue: "All receipts attached", status: "Approved" },
];

const DEFAULT_FORM = {
  traveler: "Ross Woodley",
  trip: "USGS Site Visit – Denver",
  expenseType: "Hotel",
  paymentMethod: "Personal Card",
  vendor: "Hilton Denver City Center",
  date: "2026-03-11",
  amount: "$318.42",
  billable: "Yes",
  businessPurpose: "Lodging for USGS coordination meetings and site visit.",
  qbClass: "Travel",
  projectCode: "GPSCv5-241",
};

const DEFAULT_MOBILE_INBOX = [
  { title: "To submit", count: 3, note: "Receipts waiting for details" },
  { title: "Pending approval", count: 2, note: "Sent to PM or finance" },
  { title: "Returned", count: 1, note: "Needs receipt or coding fix" },
  { title: "Approved", count: 12, note: "Ready or exported" },
];

const styles = {
  shell: "min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6",
  card: "bg-white rounded-2xl shadow-sm border border-slate-200",
  section: "grid gap-6 mb-8",
  label: "text-xs font-semibold uppercase tracking-wide text-slate-500",
  input: "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white",
  buttonPrimary: "rounded-xl px-4 py-2.5 text-sm font-medium bg-slate-900 text-white",
  buttonSecondary: "rounded-xl px-4 py-2.5 text-sm font-medium border border-slate-300 bg-white",
  badge: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700",
};

// lib / business logic layer
function inferExpenseType(name = "") {
  const n = name.toLowerCase();
  if (n.includes("hotel") || n.includes("hilton") || n.includes("marriott")) return "Hotel";
  if (n.includes("delta") || n.includes("air") || n.includes("flight")) return "Airfare";
  if (n.includes("uber") || n.includes("lyft") || n.includes("taxi")) return "Ground Transport";
  if (n.includes("shell") || n.includes("fuel") || n.includes("chevron")) return "Fuel";
  if (n.includes("meal") || n.includes("restaurant")) return "Meals";
  return "Hotel";
}

function inferVendor(name = "") {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b(receipt|img|scan|invoice)\b/gi, "")
      .trim() || "Receipt Upload"
  );
}

function isReceiptRequired(amount) {
  const numeric = Number(String(amount).replace(/[^\d.]/g, ""));
  return numeric > 25;
}

function getApprovalRoute(form) {
  if (form.paymentMethod === "Personal Card") return "Reimbursement Queue";
  if (form.expenseType === "Fuel") return "Operations Review";
  return "Project Manager Review";
}

function buildExpenseRecord(form, selectedFile, status) {
  return {
    id: Date.now(),
    vendor: form.vendor,
    trip: form.trip,
    amount: form.amount,
    paymentMethod: form.paymentMethod,
    expenseType: form.expenseType,
    date: form.date,
    status,
    fileName: selectedFile?.name || "No receipt attached",
    approvalRoute: getApprovalRoute(form),
    receiptRequired: isReceiptRequired(form.amount),
  };
}

function getMobileInbox(savedExpenses) {
  const drafts = savedExpenses.filter((item) => item.status === "Draft").length;
  const pending = savedExpenses.filter((item) => item.status === "Submitted").length;
  const approved = savedExpenses.filter((item) => item.status === "Approved").length;
  return [
    { title: "To submit", count: drafts || DEFAULT_MOBILE_INBOX[0].count, note: "Receipts waiting for details" },
    { title: "Pending approval", count: pending || DEFAULT_MOBILE_INBOX[1].count, note: "Sent to PM or finance" },
    { title: "Returned", count: DEFAULT_MOBILE_INBOX[2].count, note: "Needs receipt or coding fix" },
    { title: "Approved", count: approved || DEFAULT_MOBILE_INBOX[3].count, note: "Ready or exported" },
  ];
}

// services / data layer
const storageKey = "das-expenses-demo";

function loadSavedExpenses() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveExpensesToStorage(records) {
  window.localStorage.setItem(storageKey, JSON.stringify(records));
}

function clearStoredExpenses() {
  window.localStorage.removeItem(storageKey);
}

// UI components layer
function StatCard({ title, value }) {
  return (
    <div className={`${styles.card} p-5`}>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <span className={styles.badge}>{badge}</span>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <div className={styles.label}>{label}</div>
      {children}
    </div>
  );
}

function MobileInboxCards({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {items.map((item) => (
        <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">{item.title}</div>
          <div className="text-2xl font-bold mt-1">{item.count}</div>
          <div className="text-xs text-slate-500 mt-1">{item.note}</div>
        </div>
      ))}
    </div>
  );
}

function ReceiptPreview({ selectedFile, previewUrl, form }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 mb-4">
      <div className="text-sm font-semibold">Receipt captured</div>
      <div className="text-xs text-slate-500 mt-1">Preview + OCR happens first, typing second.</div>
      {selectedFile ? (
        <div className="mt-4 space-y-3">
          {selectedFile.type.startsWith("image/") && previewUrl ? (
            <img src={previewUrl} alt="Receipt preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
          ) : (
            <div className="rounded-xl border border-slate-200 p-3 text-sm bg-slate-50">PDF selected: {selectedFile.name}</div>
          )}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm space-y-1">
            <div><span className="font-medium">Vendor:</span> {form.vendor}</div>
            <div><span className="font-medium">Amount:</span> {form.amount}</div>
            <div><span className="font-medium">Date:</span> {form.date}</div>
            <div><span className="font-medium">Suggested type:</span> {form.expenseType}</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-500">
          No receipt selected yet.
        </div>
      )}
    </div>
  );
}

function SavedItemsPanel({ savedExpenses, onClear }) {
  return (
    <div className={`${styles.card} p-5`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">Recent saved items</h3>
        <button className={styles.buttonSecondary} onClick={onClear}>Clear Demo Data</button>
      </div>
      {savedExpenses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No demo records yet. Save a draft or submit an expense to populate this panel.
        </div>
      ) : (
        <div className="space-y-3">
          {savedExpenses.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{item.vendor}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.trip}</div>
                </div>
                <span className={styles.badge}>{item.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3">
                <div>Amount: {item.amount}</div>
                <div>Date: {item.date}</div>
                <div>Type: {item.expenseType}</div>
                <div>Payment: {item.paymentMethod}</div>
              </div>
              <div className="text-xs text-slate-500 mt-2">Receipt: {item.fileName}</div>
              <div className="text-xs text-slate-500 mt-1">Route: {item.approvalRoute}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileQuickSubmit({
  fileRef,
  form,
  mobileInbox,
  selectedFile,
  previewUrl,
  submitState,
  onFileSelect,
  onChange,
  onSaveDraft,
  onSubmit,
}) {
  return (
    <div className={`${styles.card} p-4 md:p-5 max-w-md w-full mx-auto lg:mx-0`}>
      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 min-h-[760px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold">Quick Submit</div>
            <div className="text-xs text-slate-500">Designed for travel days</div>
          </div>
          <span className={styles.badge}>Ross</span>
        </div>

        <div className="grid gap-3 mb-4">
          <button className={`${styles.buttonPrimary} h-14 text-base`} onClick={() => fileRef.current?.click()}>📸 Snap Receipt</button>
          <button className={`${styles.buttonSecondary} h-14 text-base`} onClick={() => fileRef.current?.click()}>📄 Upload Receipt / PDF</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files?.[0])}
          />
        </div>

        <MobileInboxCards items={mobileInbox} />
        <ReceiptPreview selectedFile={selectedFile} previewUrl={previewUrl} form={form} />

        <div className="space-y-3 mb-20">
          <FormField label="Trip / Project">
            <select className={styles.input} value={form.trip} onChange={(e) => onChange("trip", e.target.value)}>
              <option>USGS Site Visit – Denver</option>
              <option>Client Meeting – Tampa</option>
              <option>MAPPS Montana</option>
            </select>
          </FormField>

          <FormField label="Payment Method">
            <select className={styles.input} value={form.paymentMethod} onChange={(e) => onChange("paymentMethod", e.target.value)}>
              <option>Company Card</option>
              <option>Personal Card</option>
              <option>Cash</option>
            </select>
          </FormField>

          <FormField label="Expense Type">
            <select className={styles.input} value={form.expenseType} onChange={(e) => onChange("expenseType", e.target.value)}>
              <option>Airfare</option>
              <option>Hotel</option>
              <option>Rental Car</option>
              <option>Fuel</option>
              <option>Meals</option>
              <option>Parking / Tolls</option>
              <option>Mileage</option>
              <option>Ground Transport</option>
            </select>
          </FormField>

          <FormField label="Amount">
            <input className={styles.input} value={form.amount} onChange={(e) => onChange("amount", e.target.value)} />
          </FormField>

          <details className="rounded-2xl border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-medium">More details</summary>
            <div className="grid gap-3 mt-3">
              <FormField label="Business Purpose">
                <textarea className={`${styles.input} min-h-20`} value={form.businessPurpose} onChange={(e) => onChange("businessPurpose", e.target.value)} />
              </FormField>
              <FormField label="Billable to Client?">
                <select className={styles.input} value={form.billable} onChange={(e) => onChange("billable", e.target.value)}>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </FormField>
            </div>
          </details>
        </div>

        <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-slate-50 to-transparent">
          <div className="grid grid-cols-2 gap-3">
            <button className={styles.buttonSecondary} onClick={onSaveDraft}>Save Draft</button>
            <button className={styles.buttonPrimary} onClick={onSubmit}>Submit in 10 sec</button>
          </div>
          {submitState === "draft" && <div className="mt-3 text-xs text-slate-600">Draft saved locally in this demo view.</div>}
          {submitState === "submitted" && <div className="mt-3 text-xs text-emerald-700">Expense submitted in demo mode. Next step: save to database + workflow queue.</div>}
        </div>
      </div>
    </div>
  );
}

function DesktopExpenseForm({ form, fileRef, onChange, onSaveDraft, onSubmit }) {
  return (
    <div className={`${styles.card} p-6 grid lg:grid-cols-3 gap-6`}>
      <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
        <FormField label="Traveler"><input className={styles.input} value={form.traveler} onChange={(e) => onChange("traveler", e.target.value)} /></FormField>
        <FormField label="Trip / Project">
          <select className={styles.input} value={form.trip} onChange={(e) => onChange("trip", e.target.value)}>
            <option>USGS Site Visit – Denver</option>
            <option>Client Meeting – Tampa</option>
            <option>MAPPS Montana</option>
          </select>
        </FormField>
        <FormField label="Expense Type">
          <select className={styles.input} value={form.expenseType} onChange={(e) => onChange("expenseType", e.target.value)}>
            <option>Airfare</option><option>Hotel</option><option>Rental Car</option><option>Fuel</option><option>Meals</option><option>Parking / Tolls</option><option>Mileage</option><option>Ground Transport</option>
          </select>
        </FormField>
        <FormField label="Payment Method">
          <select className={styles.input} value={form.paymentMethod} onChange={(e) => onChange("paymentMethod", e.target.value)}>
            <option>Company Card</option><option>Personal Card</option><option>Cash</option>
          </select>
        </FormField>
        <FormField label="Vendor"><input className={styles.input} value={form.vendor} onChange={(e) => onChange("vendor", e.target.value)} /></FormField>
        <FormField label="Date"><input className={styles.input} value={form.date} onChange={(e) => onChange("date", e.target.value)} /></FormField>
        <FormField label="Amount"><input className={styles.input} value={form.amount} onChange={(e) => onChange("amount", e.target.value)} /></FormField>
        <FormField label="Billable to Client?">
          <select className={styles.input} value={form.billable} onChange={(e) => onChange("billable", e.target.value)}>
            <option>Yes</option><option>No</option>
          </select>
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Business Purpose"><textarea className={`${styles.input} min-h-24`} value={form.businessPurpose} onChange={(e) => onChange("businessPurpose", e.target.value)} /></FormField>
        </div>
        <FormField label="QuickBooks Class"><input className={styles.input} value={form.qbClass} onChange={(e) => onChange("qbClass", e.target.value)} /></FormField>
        <FormField label="Customer / Project Code"><input className={styles.input} value={form.projectCode} onChange={(e) => onChange("projectCode", e.target.value)} /></FormField>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50">
          <div className="text-sm font-medium">Upload Receipt</div>
          <p className="text-sm text-slate-500 mt-2">Drag receipt image or PDF here</p>
          <button className={`${styles.buttonSecondary} mt-4 w-full`} onClick={() => fileRef.current?.click()}>Choose File</button>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-sm font-semibold text-emerald-800">OCR Suggestion</div>
          <div className="text-sm text-emerald-900 mt-2 space-y-1">
            <div>Vendor: {form.vendor}</div>
            <div>Amount: {form.amount}</div>
            <div>Date: {form.date}</div>
            <div>Suggested category: {form.expenseType}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className={`${styles.buttonSecondary} flex-1`} onClick={onSaveDraft}>Save Draft</button>
          <button className={`${styles.buttonPrimary} flex-1`} onClick={onSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
}

export default function TravelExpenseRefactoredApp() {
  const fileRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitState, setSubmitState] = useState("idle");
  const [savedExpenses, setSavedExpenses] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    setSavedExpenses(loadSavedExpenses());
  }, []);

  useEffect(() => {
    saveExpensesToStorage(savedExpenses);
  }, [savedExpenses]);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const mobileInbox = useMemo(() => getMobileInbox(savedExpenses), [savedExpenses]);

  const handleInputChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setSubmitState("receipt-loaded");
    setForm((prev) => ({
      ...prev,
      vendor: inferVendor(file.name),
      expenseType: inferExpenseType(file.name),
    }));
  };

  const persistExpense = (status) => {
    const record = buildExpenseRecord(form, selectedFile, status);
    setSavedExpenses((prev) => [record, ...prev].slice(0, 8));
  };

  const handleSubmit = () => {
    persistExpense("Submitted");
    setSubmitState("submitted");
  };

  const handleSaveDraft = () => {
    persistExpense("Draft");
    setSubmitState("draft");
  };

  const handleClearSaved = () => {
    setSavedExpenses([]);
    clearStoredExpenses();
    setSubmitState("idle");
  };

  return (
    <div className={styles.shell}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500 mb-2">Refactored MVP Concept</div>
            <h1 className="text-3xl font-bold tracking-tight">Travel Expense Tool for QuickBooks</h1>
            <p className="text-slate-600 mt-2 max-w-3xl">
              Organized into UI components, business rules, and storage services so the app can scale cleanly into a real internal platform.
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <button className={styles.buttonSecondary}>Admin Settings</button>
            <button className={styles.buttonPrimary}>New Expense</button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[["Open Trips", "12"], ["Pending Expenses", "37"], ["Awaiting Approval", "9"], ["Ready for QuickBooks", "22"]].map(([title, value]) => (
            <StatCard key={title} title={title} value={value} />
          ))}
        </div>

        <div className={styles.section}>
          <SectionHeader title="0. Mobile Quick Submit" badge="Phone-First Employee View" />
          <div className="grid lg:grid-cols-[420px,1fr] gap-6 items-start">
            <MobileQuickSubmit
              fileRef={fileRef}
              form={form}
              mobileInbox={mobileInbox}
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              submitState={submitState}
              onFileSelect={handleFile}
              onChange={handleInputChange}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
            />

            <div className="grid gap-4">
              <div className={`${styles.card} p-6`}>
                <h3 className="text-xl font-semibold mb-3">Refactor outcome</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-700">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <div className="font-semibold mb-1">UI layer</div>
                    <div>Screens are now split into reusable components like MobileQuickSubmit, SavedItemsPanel, and DesktopExpenseForm.</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <div className="font-semibold mb-1">Business logic layer</div>
                    <div>Rules like receipt requirement, approval routing, and OCR-style inference live in helper functions.</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <div className="font-semibold mb-1">Data layer</div>
                    <div>Browser persistence is isolated in storage functions so Supabase can replace it cleanly later.</div>
                  </div>
                </div>
              </div>

              <SavedItemsPanel savedExpenses={savedExpenses} onClear={handleClearSaved} />

              <div className="grid md:grid-cols-2 gap-4">
                <div className={`${styles.card} p-5`}>
                  <h3 className="text-lg font-semibold mb-3">Best next production step</h3>
                  <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
                    <li>Replace localStorage service with Supabase database and storage.</li>
                    <li>Add real employee authentication and roles.</li>
                    <li>Move mock data into live queries.</li>
                    <li>Route submitted items into actual approval queues.</li>
                  </ul>
                </div>
                <div className={`${styles.card} p-5`}>
                  <h3 className="text-lg font-semibold mb-3">Recommended future file split</h3>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap">{`src/
  components/
    MobileQuickSubmit.jsx
    DesktopExpenseForm.jsx
    SavedItemsPanel.jsx
  lib/
    expenseRules.js
    workflow.js
  services/
    expenseStorage.js
    supabaseClient.js`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <SectionHeader title="1. Submit Expense Screen" badge="Employee View" />
          <DesktopExpenseForm
            form={form}
            fileRef={fileRef}
            onChange={handleInputChange}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
          />
        </div>

        <div className={styles.section}>
          <SectionHeader title="2. Trip & Expense List Screen" badge="Employee / Admin View" />
          <div className={`${styles.card} p-6`}>
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <input className={styles.input} defaultValue="Search by traveler, trip, vendor..." />
              <select className={styles.input} defaultValue="All Statuses">
                <option>All Statuses</option><option>Draft</option><option>Submitted</option><option>Approved</option><option>Exported</option>
              </select>
              <select className={styles.input} defaultValue="All Payment Methods">
                <option>All Payment Methods</option><option>Company Card</option><option>Personal Card</option><option>Cash</option>
              </select>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              {trips.map((trip) => (
                <div key={trip.code} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{trip.name}</div>
                    <span className={styles.badge}>{trip.status}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2">Code: {trip.code}</div>
                  <div className="text-sm text-slate-600">Traveler: {trip.traveler}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4">Vendor</th><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Category</th><th className="py-3 pr-4">Payment</th><th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((row) => (
                    <tr key={row.vendor + row.date} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium">{row.vendor}</td>
                      <td className="py-3 pr-4">{row.date}</td>
                      <td className="py-3 pr-4">{row.amount}</td>
                      <td className="py-3 pr-4">{row.category}</td>
                      <td className="py-3 pr-4">{row.payment}</td>
                      <td className="py-3 pr-4"><span className={styles.badge}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <SectionHeader title="3. Approval Queue Screen" badge="Manager / Finance View" />
          <div className={`${styles.card} p-6`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4">Employee</th><th className="py-3 pr-4">Trip</th><th className="py-3 pr-4">Items</th><th className="py-3 pr-4">Total</th><th className="py-3 pr-4">Policy Note</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((row) => (
                    <tr key={row.employee + row.trip} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium">{row.employee}</td>
                      <td className="py-3 pr-4">{row.trip}</td>
                      <td className="py-3 pr-4">{row.items}</td>
                      <td className="py-3 pr-4">{row.total}</td>
                      <td className="py-3 pr-4">{row.issue}</td>
                      <td className="py-3 pr-4"><span className={styles.badge}>{row.status}</span></td>
                      <td className="py-3 pr-4"><div className="flex gap-2"><button className={styles.buttonSecondary}>Return</button><button className={styles.buttonPrimary}>Approve</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <SectionHeader title="4. QuickBooks Export Screen" badge="Finance Admin View" />
          <div className={`${styles.card} p-6 grid lg:grid-cols-3 gap-6`}>
            <div className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200 text-slate-500">
                      <th className="py-3 pr-4">Expense</th><th className="py-3 pr-4">QB Account</th><th className="py-3 pr-4">Customer/Job</th><th className="py-3 pr-4">Receipt</th><th className="py-3 pr-4">Ready</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Delta Air Lines / $482.16", "Travel: Airfare", "GPSCv5-241", "Attached", "Yes"],
                      ["Hilton Denver / $318.42", "Travel: Lodging", "GPSCv5-241", "Attached", "Yes"],
                      ["Uber / $36.18", "Travel: Ground", "GPSCv5-241", "Missing", "No"],
                    ].map((r) => (
                      <tr key={r[0]} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium">{r[0]}</td>
                        <td className="py-3 pr-4">{r[1]}</td>
                        <td className="py-3 pr-4">{r[2]}</td>
                        <td className="py-3 pr-4">{r[3]}</td>
                        <td className="py-3 pr-4">{r[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-sm font-semibold">Export Summary</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Ready to export</span><span>2</span></div>
                  <div className="flex justify-between"><span>Blocked</span><span>1</span></div>
                  <div className="flex justify-between"><span>Total value</span><span>$800.58</span></div>
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-sm font-semibold text-amber-800">Validation Rules</div>
                <ul className="mt-2 text-sm text-amber-900 space-y-1 list-disc pl-4">
                  <li>Receipt required for expenses over $25</li>
                  <li>Project code required on all travel items</li>
                  <li>Personal card items must route for reimbursement</li>
                </ul>
              </div>
              <button className={`${styles.buttonPrimary} w-full`}>Export Approved Items to QuickBooks</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
