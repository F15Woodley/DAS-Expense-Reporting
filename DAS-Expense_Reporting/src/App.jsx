export default function TravelExpenseMVPScreens() {
  const shell = "min-h-screen bg-slate-50 text-slate-900 p-6";
  const card = "bg-white rounded-2xl shadow-sm border border-slate-200";
  const section = "grid gap-6 mb-8";
  const label = "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white";
  const buttonPrimary = "rounded-xl px-4 py-2 text-sm font-medium bg-slate-900 text-white";
  const buttonSecondary = "rounded-xl px-4 py-2 text-sm font-medium border border-slate-300 bg-white";
  const badge = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700";

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

  return (
    <div className={shell}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500 mb-2">MVP Concept</div>
            <h1 className="text-3xl font-bold tracking-tight">Travel Expense Tool for QuickBooks</h1>
            <p className="text-slate-600 mt-2 max-w-3xl">
              Mobile-friendly intake, approval workflow, and clean export to QuickBooks with project coding and receipt attachment.
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
            <h2 className="text-2xl font-semibold">1. Submit Expense Screen</h2>
            <span className={badge}>Employee View</span>
          </div>
          <div className={`${card} p-6 grid lg:grid-cols-3 gap-6`}>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              <div>
                <div className={label}>Traveler</div>
                <input className={input} defaultValue="Ross Woodley" />
              </div>
              <div>
                <div className={label}>Trip / Project</div>
                <select className={input} defaultValue="USGS Site Visit – Denver">
                  <option>USGS Site Visit – Denver</option>
                  <option>Client Meeting – Tampa</option>
                  <option>MAPPS Montana</option>
                </select>
              </div>
              <div>
                <div className={label}>Expense Type</div>
                <select className={input} defaultValue="Hotel">
                  <option>Airfare</option>
                  <option>Hotel</option>
                  <option>Rental Car</option>
                  <option>Fuel</option>
                  <option>Meals</option>
                  <option>Parking / Tolls</option>
                  <option>Mileage</option>
                </select>
              </div>
              <div>
                <div className={label}>Payment Method</div>
                <select className={input} defaultValue="Personal Card">
                  <option>Company Card</option>
                  <option>Personal Card</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <div className={label}>Vendor</div>
                <input className={input} defaultValue="Hilton Denver City Center" />
              </div>
              <div>
                <div className={label}>Date</div>
                <input className={input} defaultValue="2026-03-11" />
              </div>
              <div>
                <div className={label}>Amount</div>
                <input className={input} defaultValue="$318.42" />
              </div>
              <div>
                <div className={label}>Billable to Client?</div>
                <select className={input} defaultValue="Yes">
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <div className={label}>Business Purpose</div>
                <textarea className={`${input} min-h-24`} defaultValue="Lodging for USGS coordination meetings and site visit." />
              </div>
              <div>
                <div className={label}>QuickBooks Class</div>
                <input className={input} defaultValue="Travel" />
              </div>
              <div>
                <div className={label}>Customer / Project Code</div>
                <input className={input} defaultValue="GPSCv5-241" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50">
                <div className="text-sm font-medium">Upload Receipt</div>
                <p className="text-sm text-slate-500 mt-2">Drag receipt image or PDF here</p>
                <button className={`${buttonSecondary} mt-4 w-full`}>Choose File</button>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-sm font-semibold text-emerald-800">OCR Suggestion</div>
                <div className="text-sm text-emerald-900 mt-2 space-y-1">
                  <div>Vendor: Hilton Denver City Center</div>
                  <div>Amount: $318.42</div>
                  <div>Date: Mar 11, 2026</div>
                  <div>Suggested category: Hotel</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={`${buttonSecondary} flex-1`}>Save Draft</button>
                <button className={`${buttonPrimary} flex-1`}>Submit</button>
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
              <input className={input} defaultValue="Search by traveler, trip, vendor..." />
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
                  <div className="text-sm text-slate-600">Traveler: {trip.traveler}</div>
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
                      <td className="py-3 pr-4"><span className={badge}>{row.status}</span></td>
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
                      <td className="py-3 pr-4"><span className={badge}>{row.status}</span></td>
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
              <button className={`${buttonPrimary} w-full`}>Export Approved Items to QuickBooks</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
