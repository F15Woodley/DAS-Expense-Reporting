import { useEffect, useMemo, useRef, useState } from "react";
import { expenseService } from "./expenseService";

export default function TravelExpenseApp() {
  const shell = "min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6";
  const card = "bg-white rounded-2xl shadow-sm border border-slate-200";
  const section = "grid gap-6 mb-8";
  const label =
    "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const input =
    "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white";
  const buttonPrimary =
    "rounded-xl px-4 py-2.5 text-sm font-medium bg-slate-900 text-white";
  const buttonSecondary =
    "rounded-xl px-4 py-2.5 text-sm font-medium border border-slate-300 bg-white";
  const badge =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700";

  const trips = [
    {
      name: "USGS Site Visit – Denver",
      code: "GPSCv5-241",
      status: "Active",
      traveler: "Ross Woodley",
    },
    {
      name: "Client Meeting – Tampa",
      code: "TBW-109",
      status: "Pending Approval",
      traveler: "Danielle Molisee",
    },
    {
      name: "Conference – MAPPS Montana",
      code: "MAPPS-26",
      status: "Exported",
      traveler: "Ross Woodley",
    },
  ];

  const expenses = [
    {
      vendor: "Delta Air Lines",
      date: "Mar 11, 2026",
      amount: "$482.16",
      category: "Airfare",
      payment: "Company Card",
      status: "Ready",
    },
    {
      vendor: "Hilton Denver City Center",
      date: "Mar 11, 2026",
      amount: "$318.42",
      category: "Hotel",
      payment: "Personal Card",
      status: "Needs Approval",
    },
    {
      vendor: "Uber",
      date: "Mar 12, 2026",
      amount: "$36.18",
      category: "Ground Transport",
      payment: "Company Card",
      status: "Missing Receipt",
    },
    {
      vendor: "Shell",
      date: "Mar 12, 2026",
      amount: "$54.80",
      category: "Fuel",
      payment: "Cash",
      status: "Ready",
    },
  ];

  const queue = [
    {
      employee: "Ross Woodley",
      trip: "USGS Site Visit – Denver",
      total: "$854.58",
      items: 3,
      issue: "1 personal-card reimbursement",
      status: "Awaiting PM",
    },
    {
      employee: "Danielle Molisee",
      trip: "Client Meeting – Tampa",
      total: "$218.11",
      items: 2,
      issue: "Meal over policy limit",
      status: "Needs Review",
    },
    {
      employee: "Michael Wasielewski",
      trip: "Aircraft Ferry – PR",
      total: "$1,442.07",
      items: 5,
      issue: "All receipts attached",
      status: "Approved",
    },
  ];

  const defaultMobileInbox = [
    {
      title: "To submit",
      count: 3,
      note: "Receipts waiting for details",
    },
    {
      title: "Pending approval",
      count: 2,
      note: "Sent to PM or finance",
    },
    {
      title: "Returned",
      count: 1,
      note: "Needs receipt or coding fix",
    },
    {
      title: "Approved",
      count: 12,
      note: "Ready or exported",
    },
  ];

  const fileRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitState, setSubmitState] = useState("idle");
  const [savedExpenses, setSavedExpenses] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [form, setForm] = useState({
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
  });
 
  const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(",")[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  
const extractReceiptData = async (file) => {
  setIsExtracting(true);
  setExtractionError("");

  try {
    const fileBase64 = await fileToBase64(file);

    const response = await fetch("/api/extract-receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileBase64,
        mimeType: file.type || "application/octet-stream",
        filename: file.name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Receipt extraction failed");
    }

    setForm((prev) => ({
      ...prev,
      vendor: data.vendor || prev.vendor,
      date: data.date || prev.date,
      amount: data.amount || prev.amount,
      expenseType: data.expenseType || prev.expenseType,
    }));
  } catch (error) {
    console.error("extractReceiptData failed", error);
    setExtractionError(error.message || "Could not extract receipt data");
  } finally {
    setIsExtracting(false);
  }
};
  
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const records = await expenseService.list();
        setSavedExpenses(records);
      } catch (error) {
        console.error("Failed to load expenses:", error);
        setSavedExpenses([]);
      }
    };

    loadExpenses();
  }, []);

  const mobileInbox = useMemo(() => {
    const drafts = savedExpenses.filter((item) => item.status === "Draft").length;
    const pending = savedExpenses.filter(
      (item) => item.status === "Submitted"
    ).length;
    const approved = savedExpenses.filter(
      (item) => item.status === "Approved"
    ).length;

    return [
      {
        title: "To submit",
        count: drafts || defaultMobileInbox[0].count,
        note: "Receipts waiting for details",
      },
      {
        title: "Pending approval",
        count: pending || defaultMobileInbox[1].count,
        note: "Sent to PM or finance",
      },
      {
        title: "Returned",
        count: defaultMobileInbox[2].count,
        note: "Needs receipt or coding fix",
      },
      {
        title: "Approved",
        count: approved || defaultMobileInbox[3].count,
        note: "Ready or exported",
      },
    ];
  }, [savedExpenses]);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const inferExpenseType = (name) => {
    const n = name.toLowerCase();
    if (n.includes("hotel") || n.includes("hilton") || n.includes("marriott"))
      return "Hotel";
    if (n.includes("delta") || n.includes("air") || n.includes("flight"))
      return "Airfare";
    if (n.includes("uber") || n.includes("lyft") || n.includes("taxi"))
      return "Ground Transport";
    if (n.includes("shell") || n.includes("fuel") || n.includes("chevron"))
      return "Fuel";
    if (n.includes("meal") || n.includes("restaurant")) return "Meals";
    if (n.includes("avis") || n.includes("hertz") || n.includes("enterprise"))
      return "Rental Car";
    return "Hotel";
  };

  const inferVendor = (name) =>
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b(receipt|img|scan|invoice)\b/gi, "")
      .trim() || "Receipt Upload";

  const handleFile = async (file) => {
  console.log("handleFile triggered", file);

  if (!file) return;

  const vendor = inferVendor(file.name);
  const expenseType = inferExpenseType(file.name);

  setSelectedFile(file);
  setSubmitState("receipt-loaded");

  setForm((prev) => ({
    ...prev,
    vendor,
    expenseType,
  }));

  console.log("file type:", file.type);

  const supportedTypes = ["application/pdf"];
  const isImage = file.type && file.type.startsWith("image/");
  const isPdf = supportedTypes.includes(file.type);

  if (isImage || isPdf) {
    console.log("calling extractReceiptData...");
    await extractReceiptData(file);
    persistExpense("Draft");
  } else {
    console.log("NOT calling extractReceiptData (unsupported type)");
  }
};
  const handleInputChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const persistExpense = async (status) => {
    try {
      console.log("persistExpense started", { status, form, selectedFile });

      const numericAmount =
        Number(String(form.amount).replace(/[^\d.]/g, "")) || 0;

      const receiptPath = selectedFile
        ? await expenseService.uploadReceipt(selectedFile)
        : null;

      console.log("receipt uploaded", { receiptPath });

      const record = {
        traveler: form.traveler,
        trip: form.trip,
        expense_type: form.expenseType,
        payment_method: form.paymentMethod,
        vendor: form.vendor,
        expense_date: form.date || null,
        amount: numericAmount,
        billable: form.billable === "Yes",
        business_purpose: form.businessPurpose,
        qb_class: form.qbClass,
        project_code: form.projectCode,
        status,
        file_name: selectedFile?.name || null,
        receipt_path: receiptPath,
      };

      console.log("saving record to supabase", record);

      const saved = await expenseService.saveExpense(record);

      console.log("saved to supabase OK", saved);

      setSavedExpenses((prev) => [saved, ...prev].slice(0, 8));
    } catch (error) {
      console.error("Failed to save expense:", error);
      alert(`Could not save expense. See browser console for details. ${error?.message || ''}`)
    }
  };

  const handleSubmit = async () => {
    await persistExpense("Submitted");
    setSubmitState("submitted");
  };

  const handleSaveDraft = async () => {
    await persistExpense("Draft");
    setSubmitState("draft");
  };

  const handleClearSaved = () => {
    setSavedExpenses([]);
    setSubmitState("idle");
  };

 const getFieldConfidence = () => {
  const amountNum = Number(String(form.amount).replace(/[^\d.]/g, ""));
  const hasVendor = !!form.vendor?.trim();
  const hasDate = !!form.date?.trim();
  const hasType = !!form.expenseType?.trim();
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;

  const score =
    (hasVendor ? 1 : 0) +
    (hasDate ? 1 : 0) +
    (hasType ? 1 : 0) +
    (hasAmount ? 1 : 0);

  if (score === 4) {
    return {
      label: "High confidence",
      style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  if (score >= 2) {
    return {
      label: "Review recommended",
      style: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: "Low confidence",
    style: "bg-rose-50 text-rose-700 border-rose-200",
  };
}; 

  const confidence = getFieldConfidence();

  const validationWarnings = [];

if (!form.vendor?.trim()) validationWarnings.push("Vendor is missing.");
if (!form.date?.trim()) validationWarnings.push("Date is missing.");
if (!form.amount?.trim()) validationWarnings.push("Amount is missing.");
if (!form.projectCode?.trim()) validationWarnings.push("Project code is missing.");

const numericAmount = Number(String(form.amount).replace(/[^\d.]/g, ""));
if (Number.isFinite(numericAmount) && numericAmount > 75 && !selectedFile) {
  validationWarnings.push("Receipt should be attached for expenses over $75.");
}

  return (
    <div className={shell}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500 mb-2">
              Backend-Ready MVP
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Travel Expense Tool for QuickBooks
            </h1>
            <p className="text-slate-600 mt-2 max-w-3xl">
              This version is connected to Supabase for real expense storage and
              receipt uploads.
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <button className={buttonSecondary}>Admin Settings</button>
            <button className={buttonPrimary}>New Expense</button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            ["Open Trips", "12"],
            ["Pending Expenses", "37"],
            ["Awaiting Approval", "9"],
            ["Ready for QuickBooks", "22"],
          ].map(([title, value]) => (
            <div key={title} className={`${card} p-5`}>
              <div className="text-sm text-slate-500">{title}</div>
              <div className="text-3xl font-bold mt-2">{value}</div>
            </div>
          ))}
        </div>

        <div className={section}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">0. Mobile Quick Submit</h2>
            <span className={badge}>Phone-First Employee View</span>
          </div>

          <div className="grid lg:grid-cols-[420px,1fr] gap-6 items-start">
            <div className={`${card} p-4 md:p-5 max-w-md w-full mx-auto lg:mx-0`}>
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 min-h-[760px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold">Quick Submit</div>
                    <div className="text-xs text-slate-500">
                      Designed for travel days
                    </div>
                  </div>
                  <span className={badge}>Ross</span>
                </div>

                <div className="grid gap-3 mb-4">
                  <button
                    className={`${buttonPrimary} h-14 text-base`}
                    onClick={() => fileRef.current?.click()}
                  >
                    📸 Snap Receipt
                  </button>
                  <button
                    className={`${buttonSecondary} h-14 text-base`}
                    onClick={() => fileRef.current?.click()}
                  >
                    📄 Upload Receipt / PDF
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {mobileInbox.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        {item.title}
                      </div>
                      <div className="text-2xl font-bold mt-1">{item.count}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {item.note}
                      </div>
                    </div>
                  ))}
                </div>

<div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 mb-4">
  <div className="text-sm font-semibold">Receipt captured</div>
  <div className="text-xs text-slate-500 mt-1">
    Preview + OCR happens first, typing second.
  </div>

  {isExtracting && (
    <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
      Extracting receipt details with AI...
    </div>
  )}

  {extractionError && (
    <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
      {extractionError}
    </div>
  )}

  {selectedFile ? (
    <div className="mt-4 space-y-3">
      {selectedFile?.type === "application/pdf" && previewUrl ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
          <object
            data={previewUrl}
            type="application/pdf"
            className="w-full h-64"
          >
            <div className="p-3 text-sm text-slate-600">
              PDF preview not available in this browser.
            </div>
          </object>
        </div>
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt="Receipt preview"
          className="w-full h-40 object-cover rounded-xl border border-slate-200"
        />
      ) : (
        <div className="rounded-xl border border-slate-200 p-3 text-sm bg-slate-50">
          File selected: {selectedFile?.name}
        </div>
      )}

      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm space-y-1">
        <div>
          <span className="font-medium">Vendor:</span> {form.vendor}
        </div>
        <div>
          <span className="font-medium">Amount:</span> {form.amount}
        </div>
        <div>
          <span className="font-medium">Date:</span> {form.date}
        </div>
        <div>
          <span className="font-medium">Suggested type:</span> {form.expenseType}
        </div>
      </div>
    </div>
  ) : (
    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-500">
      No receipt selected yet.
    </div>
  )}
</div>
                
                <div className="space-y-3 mb-20">
                  <div>
                    <div className={label}>Trip / Project</div>
                    <select
                      className={input}
                      value={form.trip}
                      onChange={(e) => handleInputChange("trip", e.target.value)}
                    >
                      <option>USGS Site Visit – Denver</option>
                      <option>Client Meeting – Tampa</option>
                      <option>MAPPS Montana</option>
                    </select>
                  </div>
                  <div>
                    <div className={label}>Payment Method</div>
                    <select
                      className={input}
                      value={form.paymentMethod}
                      onChange={(e) =>
                        handleInputChange("paymentMethod", e.target.value)
                      }
                    >
                      <option>Company Card</option>
                      <option>Personal Card</option>
                      <option>Cash</option>
                    </select>
                  </div>
                  <div>
                    <div className={label}>Expense Type</div>
                    <select
                      className={input}
                      value={form.expenseType}
                      onChange={(e) =>
                        handleInputChange("expenseType", e.target.value)
                      }
                    >
                      <option>Airfare</option>
                      <option>Hotel</option>
                      <option>Rental Car</option>
                      <option>Fuel</option>
                      <option>Meals</option>
                      <option>Parking / Tolls</option>
                      <option>Mileage</option>
                      <option>Ground Transport</option>
                    </select>
                  </div>
                  <div>
                    <div className={label}>Amount</div>
                    <input
                      className={input}
                      value={form.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                    />
                  </div>
                  <details className="rounded-2xl border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      More details
                    </summary>
                    <div className="grid gap-3 mt-3">
                      <div>
                        <div className={label}>Business Purpose</div>
                        <textarea
                          className={`${input} min-h-20`}
                          value={form.businessPurpose}
                          onChange={(e) =>
                            handleInputChange("businessPurpose", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <div className={label}>Billable to Client?</div>
                        <select
                          className={input}
                          value={form.billable}
                          onChange={(e) =>
                            handleInputChange("billable", e.target.value)
                          }
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-slate-50 to-transparent">
                  <div className="grid grid-cols-2 gap-3">
                    <button className={buttonSecondary} onClick={handleSaveDraft}>
                      Save Draft
                    </button>
                    <button className={buttonPrimary} onClick={handleSubmit}>
                      Submit in 10 sec
                    </button>
                  </div>
                  {submitState === "draft" && (
                    <div className="mt-3 text-xs text-slate-600">
                      Draft saved via Supabase.
                    </div>
                  )}
                  {submitState === "submitted" && (
                    <div className="mt-3 text-xs text-emerald-700">
                      Expense submitted via Supabase.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className={`${card} p-6`}>
                <h3 className="text-xl font-semibold mb-3">
                  What changed in this version
                </h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-700">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <div className="font-semibold mb-1">Live database writes</div>
                    <div>
                      Drafts and submissions now save to the Supabase{" "}
                      <code>expenses</code> table.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <div className="font-semibold mb-1">Receipt uploads</div>
                    <div>
                      Selected files now upload to the <code>receipts</code> bucket.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <div className="font-semibold mb-1">Debug logging</div>
                    <div>
                      Browser console shows save and upload steps to help with
                      troubleshooting.
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold">Recent saved items</h3>
                  <button className={buttonSecondary} onClick={handleClearSaved}>
                    Clear Screen List
                  </button>
                </div>
                {savedExpenses.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No records loaded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedExpenses.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4 bg-white"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-sm">
                              {item.vendor}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {item.trip}
                            </div>
                          </div>
                          <span className={badge}>{item.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3">
                          <div>Amount: {item.amount}</div>
                          <div>
                            Date: {item.expense_date || item.date || "—"}
                          </div>
                          <div>
                            Type: {item.expense_type || item.expenseType || "—"}
                          </div>
                          <div>
                            Payment:{" "}
                            {item.payment_method || item.paymentMethod || "—"}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-2">
                          Receipt: {item.file_name || item.fileName || "None"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Path: {item.receipt_path || "No upload"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className={`${card} p-5`}>
                  <h3 className="text-lg font-semibold mb-3">
                    Next production features
                  </h3>
                  <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
                    <li>Real OCR extraction for vendor, date, and amount.</li>
                    <li>Approval workflow with PM / finance views.</li>
                    <li>QuickBooks export after approval.</li>
                    <li>User-based filtering with Supabase Auth.</li>
                  </ul>
                </div>
                <div className={`${card} p-5`}>
                  <h3 className="text-lg font-semibold mb-3">
                    Best build sequence from here
                  </h3>
                  <ol className="text-sm text-slate-700 space-y-2 list-decimal pl-5">
                    <li>Confirm draft saves to Supabase.</li>
                    <li>Confirm receipt uploads to bucket.</li>
                    <li>Add approval fields and manager queue.</li>
                    <li>Add QuickBooks sync after approval.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={section}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">1. Submit Expense Screen</h2>
            <span className={badge}>Employee View</span>
          </div>
          <div className={`${card} p-6 grid lg:grid-cols-3 gap-6`}>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              <div>
                <div className={label}>Traveler</div>
                <input
                  className={input}
                  value={form.traveler}
                  onChange={(e) =>
                    handleInputChange("traveler", e.target.value)
                  }
                />
              </div>
              <div>
                <div className={label}>Trip / Project</div>
                <select
                  className={input}
                  value={form.trip}
                  onChange={(e) => handleInputChange("trip", e.target.value)}
                >
                  <option>USGS Site Visit – Denver</option>
                  <option>Client Meeting – Tampa</option>
                  <option>MAPPS Montana</option>
                </select>
              </div>
              <div>
                <div className={label}>Expense Type</div>
                <select
                  className={input}
                  value={form.expenseType}
                  onChange={(e) =>
                    handleInputChange("expenseType", e.target.value)
                  }
                >
                  <option>Airfare</option>
                  <option>Hotel</option>
                  <option>Rental Car</option>
                  <option>Fuel</option>
                  <option>Meals</option>
                  <option>Parking / Tolls</option>
                  <option>Mileage</option>
                  <option>Ground Transport</option>
                </select>
              </div>
              <div>
                <div className={label}>Payment Method</div>
                <select
                  className={input}
                  value={form.paymentMethod}
                  onChange={(e) =>
                    handleInputChange("paymentMethod", e.target.value)
                  }
                >
                  <option>Company Card</option>
                  <option>Personal Card</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <div className={label}>Vendor</div>
                <input
                  className={input}
                  value={form.vendor}
                  onChange={(e) => handleInputChange("vendor", e.target.value)}
                />
              </div>
              <div>
                <div className={label}>Date</div>
                <input
                  className={input}
                  value={form.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                />
              </div>
              <div>
                <div className={label}>Amount</div>
                <input
                  className={input}
                  value={form.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                />
              </div>
              <div>
                <div className={label}>Billable to Client?</div>
                <select
                  className={input}
                  value={form.billable}
                  onChange={(e) => handleInputChange("billable", e.target.value)}
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <div className={label}>Business Purpose</div>
                <textarea
                  className={`${input} min-h-24`}
                  value={form.businessPurpose}
                  onChange={(e) =>
                    handleInputChange("businessPurpose", e.target.value)
                  }
                />
              </div>
              <div>
                <div className={label}>QuickBooks Class</div>
                <input
                  className={input}
                  value={form.qbClass}
                  onChange={(e) => handleInputChange("qbClass", e.target.value)}
                />
              </div>
              <div>
                <div className={label}>Customer / Project Code</div>
                <input
                  className={input}
                  value={form.projectCode}
                  onChange={(e) =>
                    handleInputChange("projectCode", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50">
                <div className="text-sm font-medium">Upload Receipt</div>
                <p className="text-sm text-slate-500 mt-2">
                  Drag receipt image or PDF here
                </p>
                <button
                  className={`${buttonSecondary} mt-4 w-full`}
                  onClick={() => fileRef.current?.click()}
                >
                  Choose File
                </button>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-sm font-semibold text-emerald-800">
                  OCR Suggestion
                </div>
                <div className="text-sm text-emerald-900 mt-2 space-y-1">
                  <div>Vendor: {form.vendor}</div>
                  <div>Amount: {form.amount}</div>
                  <div>Date: {form.date}</div>
                  <div>Suggested category: {form.expenseType}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className={`${buttonSecondary} flex-1`}
                  onClick={handleSaveDraft}
                >
                  Save Draft
                </button>
                <button
                  className={`${buttonPrimary} flex-1`}
                  onClick={handleSubmit}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={section}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">2. Trip & Expense List Screen</h2>
            <span className={badge}>Employee / Admin View</span>
          </div>
          <div className={`${card} p-6`}>
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <input
                className={input}
                defaultValue="Search by traveler, trip, vendor..."
              />
              <select className={input} defaultValue="All Statuses">
                <option>All Statuses</option>
                <option>Draft</option>
                <option>Submitted</option>
                <option>Approved</option>
                <option>Exported</option>
              </select>
              <select className={input} defaultValue="All Payment Methods">
                <option>All Payment Methods</option>
                <option>Company Card</option>
                <option>Personal Card</option>
                <option>Cash</option>
              </select>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              {trips.map((trip) => (
                <div key={trip.code} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{trip.name}</div>
                    <span className={badge}>{trip.status}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2">Code: {trip.code}</div>
                  <div className="text-sm text-slate-600">
                    Traveler: {trip.traveler}
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4">Vendor</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Amount</th>
                    <th className="py-3 pr-4">Category</th>
                    <th className="py-3 pr-4">Payment</th>
                    <th className="py-3 pr-4">Status</th>
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
                      <td className="py-3 pr-4">
                        <span className={badge}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={section}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">3. Approval Queue Screen</h2>
            <span className={badge}>Manager / Finance View</span>
          </div>
          <div className={`${card} p-6`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Trip</th>
                    <th className="py-3 pr-4">Items</th>
                    <th className="py-3 pr-4">Total</th>
                    <th className="py-3 pr-4">Policy Note</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Action</th>
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
                      <td className="py-3 pr-4">
                        <span className={badge}>{row.status}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button className={buttonSecondary}>Return</button>
                          <button className={buttonPrimary}>Approve</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={section}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">4. QuickBooks Export Screen</h2>
            <span className={badge}>Finance Admin View</span>
          </div>
          <div className={`${card} p-6 grid lg:grid-cols-3 gap-6`}>
            <div className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200 text-slate-500">
                      <th className="py-3 pr-4">Expense</th>
                      <th className="py-3 pr-4">QB Account</th>
                      <th className="py-3 pr-4">Customer/Job</th>
                      <th className="py-3 pr-4">Receipt</th>
                      <th className="py-3 pr-4">Ready</th>
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
                  <div className="flex justify-between">
                    <span>Ready to export</span>
                    <span>2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blocked</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total value</span>
                    <span>$800.58</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-sm font-semibold text-amber-800">
                  Validation Rules
                </div>
                <ul className="mt-2 text-sm text-amber-900 space-y-1 list-disc pl-4">
                  <li>Receipt required for expenses over $25</li>
                  <li>Project code required on all travel items</li>
                  <li>Personal card items must route for reimbursement</li>
                </ul>
              </div>
              <button className={`${buttonPrimary} w-full`}>
                Export Approved Items to QuickBooks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
