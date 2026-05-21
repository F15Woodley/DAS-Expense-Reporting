import { useEffect, useMemo, useRef, useState } from "react";
import { expenseService } from "./expenseService";
import { supabase } from "./supabaseClient";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function renderPdfToImages(pdfUrl) {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const images = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    images.push(canvas.toDataURL("image/png"));
  }

  return images;
}


const ReceiptViewer = ({ path }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(path, 3600);

      if (error) {
        console.error("Signed URL error:", error);
        return;
      }

      setUrl(data.signedUrl);
    };

    load();
  }, [path]);

  if (!url) {
    return <div className="text-xs text-slate-500">Loading receipt...</div>;
  }

  if (path.toLowerCase().endsWith(".pdf")) {
    return (
      <object
        data={url}
        type="application/pdf"
        className="w-full h-96 rounded border"
      >
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 underline"
        >
          Open PDF
        </a>
      </object>
    );
  }

  return (
    <img
      src={url}
      alt="Receipt"
      className="max-h-64 rounded border"
    />
  );
};

function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviting, setInviting] = useState(false);

  const inviteUser = async () => {
  if (!inviteEmail.trim()) {
    setMessage("Enter an email address.");
    return;
  }

  setInviting(true);
  setMessage("");

  const response = await fetch("/api/invite-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: inviteEmail.trim(),
      role: inviteRole,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    setMessage(result.error || "Could not invite user.");
    setInviting(false);
    return;
  }

  setMessage("User invited successfully.");
  setInviteEmail("");
  setInviteRole("employee");
  await loadUsers();

  setInviting(false);
};

  const loadUsers = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role")
      .order("email", { ascending: true });

    if (error) {
      console.error("Load users error:", error);
      setMessage("Could not load users.");
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  };

useEffect(() => {
  loadUsers();
}, []);

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("Update role error:", error);
      setMessage("Could not update role.");
      return;
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );

    setMessage("User role updated.");
  };

  const resetPassword = async (email) => {
  setMessage("");

  const response = await fetch("/api/reset-user-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const result = await response.json();

  if (!response.ok) {
    setMessage(result.error || "Could not send reset email.");
    return;
  }

  setMessage(`Password reset email sent to ${email}`);
};

const deleteUser = async (userId, email) => {
  const confirmed = window.confirm(
    `Delete user ${email}? This cannot be undone.`
  );

  if (!confirmed) return;

  setMessage("");

  const response = await fetch("/api/delete-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      email,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    setMessage(result.error || "Could not delete user.");
    return;
  }

  setMessage("User deleted.");

  await loadUsers();
};
  
  return (
    <div className="grid gap-6 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Admin Control</h2>
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
          Admin Only
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold">Application Users</h3>

  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-sm font-semibold mb-3">Invite New User</div>

    <div className="grid md:grid-cols-3 gap-3">
      <input
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        value={inviteEmail}
        onChange={(e) => setInviteEmail(e.target.value)}
        placeholder="employee@email.com"
      />

      <select
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        value={inviteRole}
        onChange={(e) => setInviteRole(e.target.value)}
      >
        <option value="employee">employee</option>
        <option value="manager">manager</option>
        <option value="admin">admin</option>
      </select>

      <button
        className="rounded-xl px-4 py-2.5 text-sm font-medium bg-slate-900 text-white disabled:opacity-50"
        disabled={inviting}
        onClick={inviteUser}
      >
        {inviting ? "Inviting..." : "Invite User"}
      </button>
    </div>
  </div>

        

        {message && (
          <div className="my-3 rounded-xl bg-slate-100 p-3 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500 mt-4">Loading users...</div>
        ) : (
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="text-left border-b text-slate-500">
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Change Role</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-3 pr-4">{user.email}</td>
                  <td className="py-3 pr-4">{user.role || "employee"}</td>
<td className="py-3 pr-4">
  <div className="flex flex-wrap items-center gap-2">

    <select
      className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
      value={user.role || "employee"}
      disabled={user.email === "rwoodley@digitalaerial.com"}
      onChange={(e) => updateRole(user.id, e.target.value)}
    >
      <option value="employee">employee</option>
      <option value="manager">manager</option>
      <option value="admin">admin</option>
    </select>

    <button
      className="rounded-xl px-3 py-2 text-xs border border-slate-300 bg-white"
      onClick={() => resetPassword(user.email)}
    >
      Reset Password
    </button>

    {user.email !== "rwoodley@digitalaerial.com" && (
      <button
        className="rounded-xl px-3 py-2 text-xs border border-rose-300 bg-white text-rose-700"
        onClick={() => deleteUser(user.id, user.email)}
      >
        Delete
      </button>
    )}

  </div>

  {user.email === "rwoodley@digitalaerial.com" && (
    <div className="text-xs text-slate-500 mt-1">
      Primary admin protected
    </div>
  )}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

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

  const DEBUG = false;
  const debugLog = (...args) => {
  if (DEBUG) console.log(...args);
};

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
const [editingReceiptPath, setEditingReceiptPath] = useState(null);
const [submitState, setSubmitState] = useState("idle");
const [savedExpenses, setSavedExpenses] = useState([]);
const [currentExpenseId, setCurrentExpenseId] = useState(null);
const [isExporting, setIsExporting] = useState(false); 
const [expandedGroup, setExpandedGroup] = useState(null);
const [expandedDetailId, setExpandedDetailId] = useState(null);
const [lastSavedAt, setLastSavedAt] = useState(null);
const [isExtracting, setIsExtracting] = useState(false);
const [extractionError, setExtractionError] = useState("");
const [view, setView] = useState("user");
const [user, setUser] = useState(null);
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [session, setSession] = useState(null);
const [profile, setProfile] = useState(null);
const [selectedTripKey, setSelectedTripKey] = useState(null);
const [tripSearch, setTripSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("All Statuses");
const [paymentFilter, setPaymentFilter] = useState("All Payment Methods");
const [isMobileView, setIsMobileView] = useState(false);
const [exportMessage, setExportMessage] = useState(null);
const [appMessage, setAppMessage] = useState(null); 
const [tripOptions, setTripOptions] = useState(trips);
const [isAddingTrip, setIsAddingTrip] = useState(false);
const [projectOptions, setProjectOptions] = useState([]);
const [selectedExpense, setSelectedExpense] = useState(null);
const [showExpenseDetails, setShowExpenseDetails] = useState(false);

const openExpenseDetails = (expense) => {
  setSelectedExpense(expense);
  setShowExpenseDetails(true);
};

const closeExpenseDetails = () => {
  setShowExpenseDetails(false);
  setSelectedExpense(null);
};

  const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    setAppMessage("Logout failed. Please try again.");
    return;
  }

  setSession(null);
  setUser(null);
  setProfile(null);
  setSavedExpenses([]);
  setView("user");
  setAppMessage(null);
};
  
  useEffect(() => {
  const getSession = async () => {

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("getSession error:", error);
      return;
    }

    setSession(data.session);
    setUser(data.session?.user ?? null);
  };

  getSession();
}, []);
  useEffect(() => {
  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile:", error);
      setProfile(null);
      return;
    }

    if (!data) {
      const fallbackProfile = {
        id: user.id,
        email: user.email,
        role: "employee",
      };

      debugLog("PROFILE LOADED (fallback)", fallbackProfile);
      setProfile(fallbackProfile);
      return;
    }

    debugLog("PROFILE LOADED", data);
    setProfile(data);
  };

  loadProfile();
}, [user]);

const currentTravelerName =
  profile?.full_name ||
  profile?.email ||
  user?.email ||
  "Unknown User";

useEffect(() => {
  if (!currentTravelerName) return;

  setForm((prev) => ({
    ...prev,
    traveler: currentTravelerName,
  }));
}, [currentTravelerName]);

  useEffect(() => {
  if (!appMessage) return;

  const timer = setTimeout(() => {
    setAppMessage(null);
  }, 4000);

  return () => clearTimeout(timer);
}, [appMessage]);

  useEffect(() => {
  const handleResize = () => {
    setIsMobileView(window.innerWidth < 768);
  };

  handleResize(); // run once on load

window.addEventListener("resize", handleResize);
return () => window.removeEventListener("resize", handleResize);
}, []);

const loadProjects = async () => {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data, error } = await supabase
    .from("projects")
    .select("project_code")
    .gte("last_used_at", twoYearsAgo.toISOString())
    .order("project_code", { ascending: true });

  if (error) {
    console.error("Project load error:", error);
    return;
  }

  setProjectOptions(data?.map((p) => p.project_code) || []);
};

const loadTrips = async () => {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data, error } = await supabase
    .from("trips")
    .select("name, code")
    .gte("last_used_at", twoYearsAgo.toISOString())
    .order("name", { ascending: true });

  if (error) {
    console.error("Trip load error:", error);
    setTripOptions(trips); // fallback to defaults
    return;
  }

  const savedTrips = data || [];

  // 🔑 merge defaults + saved trips
  const combinedTrips = [...trips, ...savedTrips].filter(
    (trip, index, array) =>
      trip.name &&
      index === array.findIndex((t) => t.name === trip.name)
  );

  setTripOptions(combinedTrips);
};

const emptyForm = {
  traveler: "",
  trip: "",
  expenseType: "",
  paymentMethod: "Company Card",
  vendor: "",
  date: "",
  amount: "",
  billable: "No",
  businessPurpose: "",
  qbClass: "Travel",
  projectCode: "",
  aircraftTailNumber: "",
  fuelGallons: "",
  fuelPricePerGallon: "",
};

const [form, setForm] = useState(emptyForm);
 
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
  expenseType: normalizeExpenseType(
  data.expenseType || prev.expenseType,
  data.vendor || prev.vendor
),

  // Aviation fuel fields from AI
  aircraftTailNumber:
    data.aircraftTailNumber || prev.aircraftTailNumber,
  fuelGallons:
    data.fuelGallons || prev.fuelGallons,
  fuelPricePerGallon:
    data.fuelPricePerGallon || prev.fuelPricePerGallon,
}));
  } catch (error) {
    console.error("extractReceiptData failed", error);
    setExtractionError(error.message || "Could not extract receipt data");
  } finally {
    setIsExtracting(false);
  }
};
  
const handleSignUp = async () => {
  console.log("SIGN UP CLICKED", { authEmail });

  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password: authPassword,
  });

  console.log("SIGN UP RESULT", { data, error });

  if (error) {
    alert(error.message);
  } else {
    alert("Account created. Check email if confirmation is enabled.");
  }
};

const handleSignIn = async () => {

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: authPassword,
  });

  if (error) {
    alert(error.message);
    return;
  }

  setSession(data.session);
  setUser(data.session?.user ?? null);
};

const handleSignOut = async () => {
  await supabase.auth.signOut();
  setSession(null);
  setUser(null);
  setProfile(null);
};
 
useEffect(() => {
  if (!profile || !user) return;

  const loadExpenses = async () => {
    try {
      const scope = view === "manager" ? "manager" : "employee";
      const records = await expenseService.list(scope);
      setSavedExpenses(records);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setSavedExpenses([]);
    }
  };

  loadExpenses();
}, [profile, user, view]);

  useEffect(() => {
  loadTrips();
  loadProjects();
}, []);

useEffect(() => {
  if (
    profile &&
    profile.role !== "manager" &&
    profile.role !== "admin" &&
    view === "manager"
  ) {
    setView("user");
  }
}, [profile, view]);
  
const mobileInbox = useMemo(() => {
  const drafts = savedExpenses.filter((item) => item.status === "Draft").length;
  const pending = savedExpenses.filter(
    (item) => item.status === "Submitted"
  ).length;
  const approved = savedExpenses.filter(
    (item) => item.status === "Approved"
  ).length;
  const returned = savedExpenses.filter(
    (item) => item.status === "Returned"
  ).length;

  return [
    {
      title: "To submit",
      count: drafts,
      note: "Receipts waiting for details",
    },
    {
      title: "Pending approval",
      count: pending,
      note: "Sent to PM or finance",
    },
    {
      title: "Returned",
      count: returned,
      note: "Needs receipt or coding fix",
    },
    {
      title: "Approved",
      count: approved,
      note: "Ready or exported",
    },
  ];
}, [savedExpenses]);

  const managerGroups = useMemo(() => {
  const submittedItems = savedExpenses.filter(
    (item) => (item.status || "").toLowerCase() === "submitted"
  );

  const groups = {};

  for (const item of submittedItems) {
    const traveler = item.traveler || "Unknown Traveler";
    const trip = item.trip || "Unknown Trip";
    const key = `${traveler}__${trip}__${item.project_code || "No Code"}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        traveler,
        trip,
        projectCode: item.project_code || "No Code",
        items: [],
        total: 0,
        itemCount: 0,
        hasPersonalCard: false,
        hasMissingReceipt: false, 
      };
    }
    const amount = Number(item.amount) || 0;

    groups[key].items.push(item);
    groups[key].total += amount;
    groups[key].itemCount += 1;

if ((item.payment_method || "").toLowerCase() === "personal card") {
  groups[key].hasPersonalCard = true;
}

if (!item.receipt_path) {
  groups[key].hasMissingReceipt = true;
}

if (!item.project_code) {
  groups[key].missingProject = true;
}
  }

  return Object.values(groups);
}, [savedExpenses]);

const userTripGroups = useMemo(() => {
  const groups = {};

  for (const item of savedExpenses) {
    const tripName = item.trip || "Unassigned Trip";
    const tripCode = item.project_code || "No Code";
    const key = `${tripName}__${tripCode}`;
    
    if (!groups[key]) {
      groups[key] = {
        key, // ✅ ADD THIS
        name: tripName,
        code: tripCode,
        traveler: item.traveler || "—",
        statuses: [],
        latestCreatedAt: item.created_at || null, // ✅ ADD THIS
      };
}

    if (item.status) {
      groups[key].statuses.push(item.status);
    }
    
      if (
      item.created_at &&
      (!groups[key].latestCreatedAt ||
        item.created_at > groups[key].latestCreatedAt)
    ) {
      groups[key].latestCreatedAt = item.created_at;
    }
  }

  return Object.values(groups).map((group) => {
    let status = "Active";

    if (group.statuses.some((s) => s === "Submitted")) status = "Pending Approval";
    if (group.statuses.some((s) => s === "Returned")) status = "Returned";
    if (group.statuses.some((s) => s === "Draft")) status = "Draft";
    if (group.statuses.every((s) => s === "Approved")) status = "Approved";

    return {
      ...group,
      status,
    };
  });
}, [savedExpenses]);

  useEffect(() => {
  if (!savedExpenses?.length) return;

  setTripOptions((prev = []) => {
    const fromExpenses = savedExpenses
      .filter((item) => item.trip)
      .map((item) => ({
        name: item.trip,
        code: item.project_code || "",
      }));

    const combined = [...prev, ...fromExpenses];

    return combined.filter(
      (trip, index, array) =>
        trip?.name &&
        index ===
          array.findIndex(
            (t) =>
              t?.name?.toLowerCase() === trip.name.toLowerCase()
          )
    );
  });
}, [savedExpenses]);

const filteredTripExpenses = useMemo(() => {
  let rows = savedExpenses;

  // Filter by selected trip
  if (selectedTripKey) {
    rows = rows.filter((item) => {
      const tripName = item.trip || "Unassigned Trip";
      const tripCode = item.project_code || "No Code";
      const key = `${tripName}__${tripCode}`;
      return key === selectedTripKey;
    });
  }

  // Search filter
  if (tripSearch.trim()) {
    const q = tripSearch.trim().toLowerCase();

    rows = rows.filter((item) => {
      return (
        String(item.vendor || "").toLowerCase().includes(q) ||
        String(item.trip || "").toLowerCase().includes(q) ||
        String(item.traveler || "").toLowerCase().includes(q) ||
        String(item.project_code || "").toLowerCase().includes(q)
      );
    });
  }

  // Status filter
  if (statusFilter !== "All Statuses") {
    rows = rows.filter((item) => item.status === statusFilter);
  }

  // Payment filter
if (paymentFilter !== "All Payment Methods") {
  rows = rows.filter((item) => {
    const paymentValue =
      item.payment_method || item.payment || item.paymentMethod || "";
    return paymentValue === paymentFilter;
  });
}

  return rows;
}, [savedExpenses, selectedTripKey, tripSearch, statusFilter, paymentFilter]);
  
  
  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

const role = profile?.role ?? "employee";

const isManager =
  role === "manager" || role === "admin";

const isEmployee =
  role === "employee";

const isAdmin =
  role === "admin";

  if (!session) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Expense Login</h1>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
          />

          <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl px-4 py-2.5 text-sm font-medium bg-slate-900 text-white"
            onClick={handleSignIn}
          >
            Sign In
          </button>
          
          <button
            type="button"
            className="rounded-xl px-4 py-2.5 text-sm font-medium border border-slate-300 bg-white"
            onClick={handleSignUp}
          >
            Sign Up
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}   

const getQBAccount = (expenseType) => {
  switch ((expenseType || "").toLowerCase()) {
    case "airfare":
      return "Travel: Airfare";
    case "lodging":
      return "Travel: Lodging";
    case "meals":
      return "Travel: Meals";
    case "ground":
    case "ground transport":
    case "rental car":
    case "taxi":
    case "uber":
        return "Travel: Ground";
    case "Miscellaneous":
      return "Travel:Miscellaneous";
    default:
      return "Travel:Miscellaneous";
  }
};

const hasReceipt = (item) => Boolean(item.receipt_path);

const getExportBlockReason = (item) => {
  if ((item.status || "").toLowerCase().trim() !== "approved") {
  return "Not approved";
}
  if (!item.project_code) return "Missing project code";
  if (Number(item.amount || 0) > 25 && !hasReceipt(item)) return "Missing receipt";
  if (item.payment_method === "Personal Card") return "Reimbursement flow";
  return null;
};

const isExportReady = (item) => !getExportBlockReason(item);

console.log("expenses for export screen:", savedExpenses);
console.log(
  "expense statuses:",
  savedExpenses.map((item) => ({
    id: item.id,
    vendor: item.vendor,
    status: item.status,
    amount: item.amount,
  }))
);

const exportItems = savedExpenses
  .filter((item) => (item.status || "").toLowerCase().trim() === "approved")
  .map((item) => ({
    ...item,
    qbAccount: getQBAccount(item.expense_type),
    customerJob: item.project_code || "Missing",
    receiptStatus: hasReceipt(item) ? "Attached" : "Missing",
    blockReason: getExportBlockReason(item),
    ready: isExportReady(item),
  }));

const readyExportItems = exportItems.filter((item) => item.ready);
const blockedExportItems = exportItems.filter((item) => !item.ready);

const totalExportValue = exportItems.reduce(
  (sum, item) => sum + Number(item.amount || 0),
  0
);

const readyExportValue = readyExportItems.reduce(
  (sum, item) => sum + Number(item.amount || 0),
  0
);

const exportedCount = savedExpenses.filter(
  (item) => (item.status || "").toLowerCase().trim() === "exported"
).length;

const exportedItems = savedExpenses
  .filter((item) => (item.status || "").toLowerCase().trim() === "exported")
  .sort(
    (a, b) => new Date(b.exported_at || 0) - new Date(a.exported_at || 0)
  );

  const exportedBatches = Object.values(
  exportedItems.reduce((acc, item) => {
    const batchId = item.export_batch_id || "No Batch ID";

    if (!acc[batchId]) {
      acc[batchId] = {
        batchId,
        exportedAt: item.exported_at || null,
        items: [],
        total: 0,
        itemCount: 0,
      };
    }

    acc[batchId].items.push(item);
    acc[batchId].total += Number(item.amount || 0);
    acc[batchId].itemCount += 1;

    if (
      item.exported_at &&
      (!acc[batchId].exportedAt ||
        new Date(item.exported_at) > new Date(acc[batchId].exportedAt))
    ) {
      acc[batchId].exportedAt = item.exported_at;
    }

    return acc;
  }, {})
).sort(
  (a, b) => new Date(b.exportedAt || 0) - new Date(a.exportedAt || 0)
);
  
if (session && !profile) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-sm text-slate-600">Loading profile...</div>
            </div>
          );
        }

  
  const inferExpenseType = (name) => {
    const n = name.toLowerCase();
    if (n.includes("hotel") || n.includes("hilton") || n.includes("marriott"))
      return "Hotel";
if (
  n.includes("delta") ||
  n.includes("southwest") ||
  n.includes("american airlines") ||
  n.includes("united airlines") ||
  n.includes("jetblue") ||
  n.includes("flight")
)
  return "Airfare";
    if (n.includes("uber") || n.includes("lyft") || n.includes("taxi"))
      return "Ground Transport";
if (
  n.includes("avgas") ||
  n.includes("jet") ||
  n.includes("airport") ||
  n.includes("fbo") ||
  n.includes("okeechobee")
)
  return "Aviation Fuel";

if (n.includes("shell") || n.includes("chevron") || n.includes("wawa"))
  return "Vehicle Fuel";
    if (n.includes("meal") || n.includes("restaurant")) return "Meals";
    if (n.includes("avis") || n.includes("hertz") || n.includes("enterprise"))
      return "Rental Car";
    return "Hotel";
  };

  const normalizeExpenseType = (type, vendor = "") => {
  const t = String(type || "").toLowerCase();
  const v = String(vendor || "").toLowerCase();

  if (
    t === "fuel" &&
    (v.includes("airport") ||
      v.includes("fbo") ||
      v.includes("okeechobee") ||
      v.includes("avgas") ||
      v.includes("jet a"))
  ) {
    return "Aviation Fuel";
  }

  if (t === "fuel") {
    return "Vehicle Fuel";
  }

  return type;
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
    setSubmitState("receipt-loaded");
  } else {
    console.log("NOT calling extractReceiptData (unsupported type)");
  }
};
  const handleInputChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

 const handleTripChange = (value) => {
  if (value === "__new__") {
    setIsAddingTrip(true);
setForm((prev) => ({
  ...prev,
  trip: "",
  projectCode: "",
}));
setExpandedGroup(null);
    return;
  }
}; 

  const saveProjectOption = async (projectCode) => {
  const cleanCode = projectCode?.trim();
  if (!cleanCode) return;

  const { error } = await supabase
    .from("projects")
    .upsert(
      {
        project_code: cleanCode,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "project_code" }
    );

  if (error) console.error("Project save error:", error);
};

const saveTripOption = async (tripName, projectCode) => {
  const cleanName = tripName?.trim();
  if (!cleanName) return;

  const { error } = await supabase
    .from("trips")
    .upsert(
      {
        name: cleanName,
        code: projectCode?.trim() || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "name" }
    );

  if (error) console.error("Trip save error:", error);
};
  const persistExpense = async (status) => {
    try {
      console.log("persistExpense started", { status, form, selectedFile });

      const numericAmount =
        Number(String(form.amount).replace(/[^\d.]/g, "")) || 0;

  const receiptPath = selectedFile
    ? await expenseService.uploadReceipt(selectedFile, user.id)
    : editingReceiptPath;
      
      console.log("receipt uploaded", { receiptPath });

const record = {
  user_id: user.id,
  traveler: currentTravelerName,
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

  // Aviation fuel fields
  aircraft_tail_number: form.aircraftTailNumber || null,
  fuel_gallons: form.fuelGallons
    ? Number(form.fuelGallons)
    : null,
  fuel_price_per_gallon: form.fuelPricePerGallon
    ? Number(form.fuelPricePerGallon)
    : null,

  status,
  file_name: selectedFile?.name || null,
  receipt_path: receiptPath,
};

      console.log("SIGNED IN USER", user);
      console.log("RECORD BEING INSERTED", record);
      
      console.log("saving record to supabase", record);

     let saved;

      if (currentExpenseId) {
        saved = await expenseService.updateExpense(currentExpenseId, record);
      } else {
        saved = await expenseService.saveExpense(record);
      }

      console.log("saved to supabase OK", saved);
await saveProjectOption(form.projectCode);
await saveTripOption(form.trip, form.projectCode);

setTripOptions((prev) => {
  const cleanTrip = form.trip?.trim();
  const cleanCode = form.projectCode?.trim();

  if (!cleanTrip) return prev;

  const withoutDuplicate = prev.filter(
    (trip) => trip.name.toLowerCase() !== cleanTrip.toLowerCase()
  );

  return [
    ...withoutDuplicate,
    {
      name: cleanTrip,
      code: cleanCode || "",
    },
  ].sort((a, b) => a.name.localeCompare(b.name));
});

await loadProjects();
await loadTrips();

      setSavedExpenses((prev) => {
        const withoutSaved = prev.filter((item) => item.id !== saved.id);
        return [saved, ...withoutSaved].slice(0, 8);
      });
      setLastSavedAt(new Date());
      setCurrentExpenseId(saved.id || null);
    } catch (error) {
      console.error("Failed to save expense:", error);
     setAppMessage({
      type: "error",
      text: `Could not save expense. ${error?.message || ""}`,
    });
    }
  };

  const canTransitionStatus = (from, to) => {
  const current = String(from || "").trim();
  const next = String(to || "").trim();

  const allowedTransitions = {
    Draft: ["Submitted"],
    Submitted: ["Approved", "Returned"],
    Returned: ["Submitted"],
    Approved: ["Exported"],
    Exported: [],
  };

  return (allowedTransitions[current] || []).includes(next);
};

const handleSubmit = async () => {
  setAppMessage(null);
  
  const numericAmount = Number(String(form.amount).replace(/[^\d.]/g, ""));

  if (
  !form.trip?.trim() ||
  !form.projectCode?.trim() ||
  !form.vendor?.trim() ||
  !form.date?.trim() ||
  !numericAmount
) {
  setAppMessage({
  type: "error",
  text: "Please complete trip, project code, vendor, date, and amount before submitting.",
});
  return;
  }

  await persistExpense("Submitted");
  setSubmitState("submitted");
  setCurrentExpenseId(null);
  setForm({
  ...emptyForm,
  traveler: currentTravelerName,
});
  setSelectedFile(null);

  setAppMessage({
  type: "success",
  text: "Expense submitted successfully.",
});
};

const handleSaveDraft = async () => {
  setAppMessage(null);

  await persistExpense("Draft");
  setSubmitState("draft");
  setCurrentExpenseId(null);
  setForm({
  ...emptyForm,
  traveler: currentTravelerName,
});
  setSelectedFile(null);
  setEditingReceiptPath(null);

  setAppMessage({
    type: "success",
    text: "Draft saved successfully.",
  });
};

  const handleClearSaved = () => {
    setSavedExpenses([]);
    setSubmitState("idle");
  };

const handleEditExpense = (item) => {
  setCurrentExpenseId(item.id);

  setForm({
    traveler: item.traveler || "",
    trip: item.trip || "",
    expenseType: item.expense_type || item.expenseType || "",
    paymentMethod: item.payment_method || item.paymentMethod || "",
    vendor: item.vendor || "",
    date: item.expense_date || item.date || "",
    amount:
      item.amount !== null && item.amount !== undefined
        ? Number(item.amount).toFixed(2)
        : "",
    billable: item.billable ? "Yes" : "No",
    businessPurpose: item.business_purpose || item.businessPurpose || "",
    qbClass: item.qb_class || item.qbClass || "Travel",
    projectCode: item.project_code || item.projectCode || "",

    aircraftTailNumber: item.aircraft_tail_number || "",
fuelGallons:
  item.fuel_gallons !== null && item.fuel_gallons !== undefined
    ? String(item.fuel_gallons)
    : "",
fuelPricePerGallon:
  item.fuel_price_per_gallon !== null &&
  item.fuel_price_per_gallon !== undefined
    ? String(item.fuel_price_per_gallon)
    : "",
    
  });

  setSelectedFile(null);
  setEditingReceiptPath(item.receipt_path || null);
  setSubmitState("idle");
  window.scrollTo({ top: 0, behavior: "smooth" });
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

const handleDeleteExpense = async (id) => {
  const confirmed = window.confirm("Delete this draft?");

  if (!confirmed) return;

  try {
    await expenseService.deleteExpense(id);

    setSavedExpenses((prev) => prev.filter((item) => item.id !== id));

    if (currentExpenseId === id) {
      setCurrentExpenseId(null);
      setForm({
  ...emptyForm,
  traveler: currentTravelerName,
});
      setSelectedFile(null);
      setEditingReceiptPath(null);
      setSubmitState("idle");
    }
  } catch (error) {
    console.error("Delete failed:", error);
    setAppMessage({
    type: "error",
    text: "Could not delete draft.",
  });
  }
};
  
const handleSubmitExpense = async (item) => {
  setAppMessage(null);

  const numericAmount = Number(String(item.amount || "").replace(/[^\d.]/g, ""));

  if (
    !item.trip?.trim() ||
    !item.project_code?.trim() ||
    !item.vendor?.trim() ||
    !(item.expense_date || item.date)?.trim() ||
    !numericAmount
  ) {
    setAppMessage({
      type: "error",
      text: "This item is missing required fields. Edit it before submitting.",
    });
    return;
  }

  try {
    await expenseService.updateExpense(item.id, {
      status: "Submitted",
    });

    setSavedExpenses((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, status: "Submitted" } : row
      )
    );

    setAppMessage({
      type: "success",
      text: "Expense submitted successfully.",
    });
  } catch (error) {
    console.error("Submit existing expense failed:", error);
    setAppMessage({
      type: "error",
      text: `Could not submit expense. ${error?.message || ""}`,
    });
  }
};

const handlePrintExpense = async (item) => {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    setAppMessage({
      type: "error",
      text: "Popup blocked. Please allow popups to print expenses.",
    });
    return;
  }

  let receiptHtml = `<div style="color:#64748b;">No receipt attached</div>`;

  if (item.receipt_path) {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(item.receipt_path, 3600);

    if (!error && data?.signedUrl) {
      const isPdf = String(item.receipt_path).toLowerCase().endsWith(".pdf");

      if (isPdf) {
  try {
    const pdfImages = await renderPdfToImages(data.signedUrl);

receiptHtml = `
  <div style="margin-top:12px;">
    ${pdfImages
      .map(
        (imageUrl) => `
          <img
            src="${imageUrl}"
            alt="Receipt PDF page"
            style="width:100%; max-width:100%; margin-bottom:16px; border:1px solid #cbd5e1; border-radius:8px;"
          />
        `
      )
      .join("")}
  </div>
`;
  } catch (pdfError) {
    console.error("PDF render error:", pdfError);

    receiptHtml = `
      <div style="margin-top:12px;">
        <div style="font-weight:600; margin-bottom:8px;">Receipt PDF could not be rendered</div>
        <div style="font-size:13px; color:#475569;">
          The PDF receipt is attached but could not be displayed in the printout.
        </div>
      </div>
    `;
  }
} else {
receiptHtml = `
  <div style="margin-top:12px;">
    <img
      src="${data.signedUrl}"
      alt="Receipt"
      style="max-width:100%; max-height:900px; border:1px solid #cbd5e1; border-radius:8px;"
    />
  </div>
`;
      }
    }
 }
  const printedAt = new Date().toLocaleString();
  const amount =
    item.amount !== null && item.amount !== undefined
      ? `$${Number(item.amount).toFixed(2)}`
      : "—";

const isAviationFuelExpense =
  String(item.expense_type || item.expenseType || "").toLowerCase() ===
  "aviation fuel";

const fuelDetailsHtml = isAviationFuelExpense
  ? `
    <div class="field">
      <div class="label">Aircraft Tail Number</div>
      <div class="value">${item.aircraft_tail_number || item.aircraftTailNumber || "—"}</div>
    </div>
    <div class="field">
      <div class="label">Gallons</div>
      <div class="value">${item.fuel_gallons || "—"}</div>
    </div>
    <div class="field">
      <div class="label">Price Per Gallon</div>
      <div class="value">${
      item.fuel_price_per_gallon
        ? `$${Number(item.fuel_price_per_gallon).toFixed(2)}`
          : "—"
      }</div>
    </div>
  `
  : "";

  const html = `
    <html>
      <head>
        <title>Expense Print</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #0f172a;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 24px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
          }
          .title {
            font-size: 28px;
            font-weight: 700;
          }
          .meta {
            font-size: 12px;
            color: #475569;
            text-align: right;
          }
          .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            background: #e2e8f0;
            margin-top: 8px;
          }
          .section {
            margin-top: 24px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 24px;
          }
          .field {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .label {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
          }
          .value {
            font-size: 14px;
            font-weight: 500;
          }
          .full {
            grid-column: 1 / -1;
          }
          @media print {
            body {
              padding: 16px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">DAS Expense Report</div>
            <div class="status">${item.status || "—"}</div>
          </div>
          <div class="meta">
            <div><strong>Printed:</strong> ${printedAt}</div>
            <div><strong>Expense ID:</strong> ${item.id || "—"}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Expense Details</div>
          <div class="grid">
            <div class="field">
              <div class="label">Traveler</div>
              <div class="value">${item.traveler || "—"}</div>
            </div>
            <div class="field">
              <div class="label">Trip / Project</div>
              <div class="value">${item.trip || "—"}</div>
            </div>
            <div class="field">
              <div class="label">Project Code</div>
              <div class="value">${item.project_code || "—"}</div>
            </div>
            <div class="field">
              <div class="label">Expense Date</div>
              <div class="value">${item.expense_date || item.date || "—"}</div>
            </div>
            <div class="field">
              <div class="label">Vendor</div>
              <div class="value">${item.vendor || "—"}</div>
            </div>
            <div class="field">
              <div class="label">Amount</div>
              <div class="value">${amount}</div>
            </div>
            <div class="field">
              <div class="label">Expense Type</div>
              <div class="value">${item.expense_type || item.expenseType || "—"}</div>
            </div>
            ${fuelDetailsHtml}
            <div class="field">
              <div class="label">Payment Method</div>
              <div class="value">${item.payment_method || item.paymentMethod || "—"}</div>
            </div>
            <div class="field">
              <div class="label">Billable</div>
              <div class="value">${item.billable ? "Yes" : "No"}</div>
            </div>
            <div class="field">
              <div class="label">QuickBooks Class</div>
              <div class="value">${item.qb_class || item.qbClass || "—"}</div>
            </div>
            <div class="field full">
              <div class="label">Business Purpose</div>
              <div class="value">${item.business_purpose || item.businessPurpose || "—"}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Receipt</div>
          ${receiptHtml}
        </div>

    <script>
  window.onload = () => {
    setTimeout(() => {
      window.print();
    }, 500);
  };
</script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
  
const handleApprove = async (id) => {
  try {
    const expense = savedExpenses.find((item) => item.id === id);

    if (!expense || !canTransitionStatus(expense.status, "Approved")) {
      setAppMessage({
      type: "error",
      text: "This expense cannot be moved to Approved from its current status.",
    });
      return;
    }

    await expenseService.updateExpenseStatus(id, "Approved");

    setSavedExpenses((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Approved" } : item
      )
    );
  } catch (error) {
    console.error("Approve failed:", error, "Expense ID:", id);
    setAppMessage({
  type: "error",
  text: `Could not approve expense. ${error?.message || "Check browser console."}`,
});
  }
};
  
const handleReject = async (id) => {
  try {
    const expense = savedExpenses.find((item) => item.id === id);

    if (!expense || !canTransitionStatus(expense.status, "Returned")) {
      setAppMessage({
      type: "error",
      text: "This expense cannot be moved to Returned from its current status.",
    });
      return;
    }

    await expenseService.updateExpenseStatus(id, "Returned");

    setSavedExpenses((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Returned" } : item
      )
    );
  } catch (error) {
    console.error("Return failed:", error, "Expense ID:", id);
    setAppMessage({
    type: "error",
    text: `Could not return expense. ${error?.message || "Check browser console."}`,
  });
  }
};


  const downloadQuickBooksCsv = (items) => {
  const headers = [
    "TxnDate",
    "Vendor",
    "Account",
    "Amount",
    "CustomerJob",
    "Memo",
    "PaymentMethod",
    "Traveler",
    "Trip",
    "ProjectCode",
    "ExpenseType",
    "ReceiptAttached",
    "ExpenseId",
  ];

  const escapeCsv = (value) => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = items.map((item) => [
    item.expense_date || "",
    item.vendor || "",
    item.qbAccount || "",
    Number(item.amount || 0).toFixed(2),
    item.customerJob || "",
    item.trip || item.business_purpose || "",
    item.payment_method || "",
    item.traveler || "",
    item.trip || "",
    item.project_code || "",
    item.expense_type || "",
    item.receipt_path ? "Yes" : "No",
    item.id || "",
  ]);

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `quickbooks-desktop-export-${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const downloadExportHistoryCsv = (items) => {
  const headers = [
    "ExportBatchId",
    "ExportedAt",
    "TxnDate",
    "Vendor",
    "Amount",
    "Account",
    "CustomerJob",
    "Traveler",
    "Trip",
    "ProjectCode",
    "ExpenseType",
    "PaymentMethod",
    "ReceiptAttached",
    "ExpenseId",
    "Status",
  ];


  const escapeCsv = (value) => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = items.map((item) => [
    item.export_batch_id || "",
    item.exported_at || "",
    item.expense_date || "",
    item.vendor || "",
    Number(item.amount || 0).toFixed(2),
    getQBAccount(item.expense_type),
    item.project_code || "",
    item.traveler || "",
    item.trip || "",
    item.project_code || "",
    item.expense_type || "",
    item.payment_method || "",
    item.receipt_path ? "Yes" : "No",
    item.id || "",
    item.status || "",
  ]);

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `quickbooks-export-history-${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

  const downloadSingleBatchCsv = (batchId) => {
  const batchItems = exportedItems.filter(
    (item) => (item.export_batch_id || "No Batch ID") === batchId
  );

  downloadExportHistoryCsv(batchItems);
};
  
const handleExportApproved = async () => {
  const exportableItems = readyExportItems.filter(
    (item) => item.status === "Approved" && !item.exported_at
  );

  if (!exportableItems.length || isExporting) return;

  setExportMessage(null);
  setIsExporting(true);

  try {
    const exportBatchId = `EXP-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
    const exportedAt = new Date().toISOString();

    const invalidItems = exportableItems.filter(
      (item) => !canTransitionStatus(item.status, "Exported")
    );

    if (invalidItems.length > 0) {
      setExportMessage({
        type: "error",
        text: "One or more items are not in a valid status for export.",
      });
      return;
    }

const stampedExportItems = exportableItems.map((item) => ({
  ...item,
  status: "Exported",
  exported_at: exportedAt,
  export_batch_id: exportBatchId,
}));

downloadQuickBooksCsv(stampedExportItems);

for (const item of stampedExportItems) {
  await expenseService.updateExpense(item.id, {
    status: "Exported",
    exported_at: exportedAt,
    export_batch_id: exportBatchId,
  });
}

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    setSavedExpenses(data || []);

    setExportMessage({
      type: "success",
      text: `Downloaded QuickBooks Desktop CSV and exported ${exportableItems.length} item${
        exportableItems.length === 1 ? "" : "s"
      } in batch ${exportBatchId}.`,
    });

  } catch (error) {
    console.error("Export failed:", error);
    setExportMessage({
      type: "error",
      text: `Could not export approved items. ${error?.message || ""}`,
    });
  } finally {
    setIsExporting(false);
  }
};
  
  return (
    <div className={shell}>
      <div className="max-w-7xl mx-auto">
        
<div className="flex gap-2 mb-4">
  <button
    className={`px-3 py-1 rounded-lg text-sm ${
      view === "user"
        ? "bg-slate-900 text-white"
        : "bg-slate-200 text-slate-800"
    }`}
    onClick={() => setView("user")}
  >
    My Expenses
  </button>

  {(isManager || profile?.role === "admin") && (
    <button
      className={`px-3 py-1 rounded-lg text-sm ${
        view === "manager"
          ? "bg-slate-900 text-white"
          : "bg-slate-200 text-slate-800"
      }`}
      onClick={() => setView("manager")}
    >
      Approval Queue
    </button>
  )}

  {profile?.role === "admin" && (
    <button
      className={`px-3 py-1 rounded-lg text-sm ${
        view === "admin"
          ? "bg-slate-900 text-white"
          : "bg-slate-200 text-slate-800"
      }`}
      onClick={() => setView("admin")}
    >
      Admin
    </button>
  )}
</div>    
        
<div className="mb-8 flex items-start justify-between gap-4">
  
  {/* LEFT SIDE (your existing content) */}
  <div>
    <div className="text-sm font-medium text-slate-500 mb-2">
      Production Environment
    </div>
    <h1 className="text-3xl font-bold tracking-tight">
      DAS Expense Tool for QuickBooks
    </h1>
    <p className="text-slate-600 mt-2 max-w-3xl">
      This version is connected to Supabase for real expense storage and
      receipt uploads.
    </p>

    {appMessage && (
      <div
        className={`mt-4 rounded-2xl border p-4 text-sm ${
          appMessage.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}
      >
        {appMessage.text}
      </div>
    )}
  </div>

  {/* RIGHT SIDE (ADD THIS) */}
  <div className="flex flex-col items-end gap-2">
    
    {user && (
      <span className="text-sm text-slate-500">
        {user.email}
      </span>
    )}

    <button
      className={buttonSecondary}
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</div>

     <div className={`grid gap-4 mb-8 ${view === "manager" ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
  {[
    [
      "To Submit",
      String(
        savedExpenses.filter(
          (item) => String(item.status).toLowerCase() === "draft"
        ).length
      ),
    ],
    [
      "Pending Approval",
      String(
        savedExpenses.filter(
          (item) => String(item.status).toLowerCase() === "submitted"
        ).length
      ),
    ],
    [
      "Returned",
      String(
        savedExpenses.filter(
          (item) => String(item.status).toLowerCase() === "returned"
        ).length
      ),
    ],
    [
      "Approved",
      String(
        savedExpenses.filter(
          (item) => String(item.status).toLowerCase() === "approved"
        ).length
      ),
    ],
    ...(view === "manager"
      ? [
          [
            "Exported",
            String(exportedCount),
          ],
        ]
      : []),
  ].map(([title, value]) => (
    <div key={title} className={`${card} p-5`}>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  ))}
</div>

        {view === "user" && isMobileView && (
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
) : editingReceiptPath ? (
  <div className="mt-4 space-y-3">
    <ReceiptViewer path={editingReceiptPath} />

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
<div>
  <div className={label}>Trip / Project</div>

  <select
    className={input}
    value={form.trip}
    onChange={(e) => {
      const value = e.target.value;
      const matchedTrip = tripOptions.find((trip) => trip.name === value);

      setForm((prev) => ({
        ...prev,
        trip: value,
        projectCode: matchedTrip?.code || prev.projectCode,
      }));
    }}
  >
    <option value="">Select saved trip/project</option>

    {(tripOptions || []).map((trip) => (
      <option key={trip.name} value={trip.name}>
        {trip.name}
      </option>
    ))}
  </select>

  <input
    className={`${input} mt-2`}
    value={form.trip}
    onChange={(e) =>
      setForm((prev) => ({
        ...prev,
        trip: e.target.value,
      }))
    }
    placeholder="Or type new trip/project"
  />
</div>

<div>
  <div className={label}>Project Code</div>

  <input
    className={input}
    value={form.projectCode}
    onChange={(e) =>
      setForm((prev) => ({
        ...prev,
        projectCode: e.target.value,
      }))
    }
    placeholder="Enter project code"
  />
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
              <option>Aviation Fuel</option>
              <option>Ground Transport</option>
              <option>Hotel</option>
              <option>Meals</option>
              <option>Mileage</option>
              <option>Miscellaneous</option>
              <option>Parking / Tolls</option>
              <option>Rental Car</option>
              <option>Vehicle Fuel</option>
                    </select>
                  </div>

  {form.expenseType === "Aviation Fuel" && (
  <>
    <div>
      <div className={label}>Aircraft Tail Number</div>
      <input
        className={input}
        value={form.aircraftTailNumber}
        onChange={(e) =>
          handleInputChange(
            "aircraftTailNumber",
            e.target.value.toUpperCase()
          )
        }
        placeholder="N207SS"
      />
    </div>

    <div>
      <div className={label}>Gallons</div>
      <input
        className={input}
        type="number"
        step="0.01"
        value={form.fuelGallons}
        onChange={(e) =>
          handleInputChange("fuelGallons", e.target.value)
        }
        placeholder="123.45"
      />
    </div>

    <div>
      <div className={label}>Price Per Gallon</div>
      <input
        className={input}
        type="number"
        step="0.001"
        value={form.fuelPricePerGallon}
        onChange={(e) =>
          handleInputChange(
            "fuelPricePerGallon",
            e.target.value
          )
        }
        placeholder="6.89"
      />
    </div>
  </>
)}
                    <div>
              <div className={label}>Vendor</div>
              <input
                className={input}
                value={form.vendor}
                onChange={(e) => handleInputChange("vendor", e.target.value)}
                placeholder="Vendor name"
              />
            </div>
            
            <div>
              <div className={label}>Date</div>
              <input
                className={input}
                value={form.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                placeholder="YYYY-MM-DD"
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
                      Submit
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
                  {lastSavedAt && (
                    <div className="mt-2 text-xs text-emerald-700">
                      Draft auto-saved ✓ {lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
                 <h3 className="text-lg font-semibold">
                  {view === "manager" ? "Approval Queue" : "Recent saved items"}
                </h3>
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
                 {savedExpenses
                .filter((item) => {
                  if (view === "manager") {
                    return false; // hide individual rows in manager view
                  }
                  return true;
                })
                .map((item) => (
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
                        <div className="text-xs mt-2">
                            Status: <span className="font-semibold">{item.status}</span>
                          </div>
                  {["draft", "returned"].includes(String(item.status).toLowerCase()) && (
                    <div className="flex gap-2 mt-3">
                      <button
                        className={buttonSecondary}
                        onClick={() => handleEditExpense(item)}
                      >
                        Edit
                      </button>
                  
                      <button
                        className="rounded-xl px-4 py-2.5 text-sm font-medium border border-rose-300 bg-white text-rose-700"
                        onClick={() => handleDeleteExpense(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                        
                  {view === "manager" && String(item.status).toLowerCase() === "submitted" ? (
                    <div className="flex gap-2 mt-3">
                      <button
                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg"
                        onClick={() => handleApprove(item.id)}
                      >
                        Approve
                      </button>
                  
                      <button
                        className="px-3 py-1 text-xs bg-rose-600 text-white rounded-lg"
                        onClick={() => handleReject(item.id)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
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
  )} 
        
        {view === "user" && !isMobileView && (
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
    value={isAddingTrip ? "__new__" : form.trip}
    onChange={(e) => {
      const value = e.target.value;

      if (value === "__new__") {
        setIsAddingTrip(true);
        setForm((prev) => ({
          ...prev,
          trip: "",
          projectCode: "",
        }));
        return;
      }

      const matchedTrip = tripOptions.find((trip) => trip.name === value);

      setIsAddingTrip(false);
      setForm((prev) => ({
        ...prev,
        trip: value,
        projectCode: matchedTrip?.code || prev.projectCode || "",
      }));
    }}
  >
    <option value="">Select saved trip/project</option>

    {(tripOptions || []).map((trip) => (
      <option key={trip.name} value={trip.name}>
        {trip.name}
      </option>
    ))}

    <option value="__new__">+ Add new trip/project</option>
  </select>
</div>

{isAddingTrip && (
  <>
    <div>
      <div className={label}>New Trip / Project Name</div>
      <input
        className={input}
        value={form.trip}
        onChange={(e) => handleInputChange("trip", e.target.value)}
        placeholder="Example: Escambia County Site Visit"
      />
    </div>

    <div>
      <div className={label}>Customer / Project Code</div>
      <input
        className={input}
        value={form.projectCode}
        onChange={(e) => handleInputChange("projectCode", e.target.value)}
        placeholder="Example: GPSCv5-241"
      />
    </div>
  </>
)}
            
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
              <option>Aviation Fuel</option>
              <option>Ground Transport</option>
              <option>Hotel</option>
              <option>Meals</option>
              <option>Mileage</option>
              <option>Miscellaneous</option>
              <option>Parking / Tolls</option>
              <option>Rental Car</option>
              <option>Vehicle Fuel</option>
                </select>
              </div>

{form.expenseType === "Aviation Fuel" && (
  <>
    <div>
      <div className={label}>Aircraft Tail Number</div>
      <input
        className={input}
        value={form.aircraftTailNumber}
        onChange={(e) =>
          handleInputChange(
            "aircraftTailNumber",
            e.target.value.toUpperCase()
          )
        }
        placeholder="N207SS"
      />
    </div>

    <div>
      <div className={label}>Gallons</div>
      <input
        className={input}
        type="number"
        step="0.01"
        value={form.fuelGallons}
        onChange={(e) =>
          handleInputChange("fuelGallons", e.target.value)
        }
        placeholder="123.45"
      />
    </div>

    <div>
      <div className={label}>Price Per Gallon</div>
      <input
        className={input}
        type="number"
        step="0.001"
        value={form.fuelPricePerGallon}
        onChange={(e) =>
          handleInputChange(
            "fuelPricePerGallon",
            e.target.value
          )
        }
        placeholder="6.89"
      />
    </div>
  </>
)}
              
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

{!isAddingTrip && (
  <div>
    <div className={label}>Customer / Project Code</div>

    <input
      list="project-code-options"
      className={input}
      value={form.projectCode}
      onChange={(e) =>
        setForm((prev) => ({
          ...prev,
          projectCode: e.target.value,
        }))
      }
      placeholder="Start typing project code"
    />

    <datalist id="project-code-options">
      {(projectOptions || []).map((project) => (
        <option key={project} value={project} />
      ))}
    </datalist>
  </div>
)}

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
            
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

{selectedFile || editingReceiptPath ? (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="text-sm font-medium mb-3">Receipt Preview</div>

    {selectedFile ? (
      selectedFile.type === "application/pdf" ? (
        <object
          data={previewUrl}
          type="application/pdf"
          className="w-full h-64 rounded border"
        >
          <div className="text-sm text-slate-500 p-3">
            PDF preview not available
          </div>
        </object>
      ) : (
        <img
          src={previewUrl}
          alt="Receipt preview"
          className="w-full max-h-64 object-contain rounded border"
        />
      )
    ) : (
      <ReceiptViewer path={editingReceiptPath} />
    )}
  </div>
) : null}
              
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
  )}

          {view === "user" && !isMobileView && (
            <div className={section}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">2. Trip & Expense List Screen</h2>
            <span className={badge}>Employee / Admin View</span>
          </div>
          <div className={`${card} p-6`}>
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <input
            className={input}
            placeholder="Search by traveler, trip, vendor..."
            value={tripSearch}
            onChange={(e) => setTripSearch(e.target.value)}
          />
          <select
            className={input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Statuses</option>
            <option>Draft</option>
            <option>Submitted</option>
            <option>Returned</option>
            <option>Approved</option>
          </select>
          <select
            className={input}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option>All Payment Methods</option>
            <option>Company Card</option>
            <option>Personal Card</option>
            <option>Cash</option>
          </select>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {userTripGroups.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 lg:col-span-3">
              No trips yet.
            </div>
          ) : (
            userTripGroups.map((trip) => (
              <div
                key={`${trip.name}-${trip.code}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{trip.name}</div>
                  <span className={badge}>{trip.status}</span>
                </div>
                <div className="text-sm text-slate-600 mt-2">Code: {trip.code}</div>
                <div className="text-sm text-slate-600">
                  Traveler: {trip.traveler}
                </div>
              </div>
            ))
          )}
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
            <th className="py-3 pr-4">Actions</th>
          </tr>
                </thead>
           <tbody>
  {filteredTripExpenses.map((row) => {
    const rowStatus = String(row.status || "").toLowerCase();

    const canEdit =
      rowStatus === "draft" || rowStatus === "returned";

    return (
      <tr key={row.id} className="border-b border-slate-100 align-top">
        <td className="py-3 pr-4 font-medium">
          {row.vendor || "—"}
        </td>

        <td className="py-3 pr-4">
          {row.expense_date || row.date || "—"}
        </td>

        <td className="py-3 pr-4">
          {row.amount !== null && row.amount !== undefined
            ? `$${Number(row.amount).toFixed(2)}`
            : "—"}
        </td>

        <td className="py-3 pr-4">
          {row.expense_type || row.expenseType || "—"}
        </td>

        <td className="py-3 pr-4">
          {row.payment_method ||
            row.payment ||
            row.paymentMethod ||
            "—"}
        </td>

<td className="py-3 pr-4">
  <div className="flex flex-wrap gap-2">
    <span className={badge}>{row.status || "—"}</span>

    {row.exported_at && (
      <span className={`${badge} bg-emerald-100 text-emerald-800`}>
        Exported
      </span>
    )}
  </div>
</td>

        {/* 🔴 NEW COLUMN */}
        <td className="py-3 pr-4">
          <div className="flex flex-wrap gap-2">
            
            {canEdit && (
              <>
                {/* EDIT */}
                <button
                  className={buttonSecondary}
                  onClick={() => handleEditExpense(row)}
                >
                  Edit
                </button>
        
                {/* DELETE */}
                <button
                  className="rounded-xl px-4 py-2.5 text-sm font-medium border border-rose-300 bg-white text-rose-700"
                  onClick={() => handleDeleteExpense(row.id)}
                >
                  Delete
                </button>
        
                {/* SUBMIT */}
                <button
                  className={buttonPrimary}
                  onClick={() => handleSubmitExpense(row)}
                >
                  Submit
                </button>
              </>
            )}
        
            {/* ✅ PRINT (ALWAYS AVAILABLE) */}
            <button
              className={buttonSecondary}
              onClick={() => handlePrintExpense(row)}
            >
              Print
            </button>
        
          </div>
        </td>
      </tr>
    );
  })}
</tbody>
              </table>
            </div>
          </div>
        </div>
)}

{view === "manager" && isManager && (
  <div className={section}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">3. Approval Queue Screen</h2>
              <span className={badge}>Manager / Finance View</span>
            </div>
        
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold">Approval Queue</h3>
              </div>
        
             {view === "manager" && managerGroups.length > 0 && (
              <div className="mb-4 space-y-3">
                {managerGroups.map((group) => (
                <div
                  key={group.key}
                  onClick={() =>
                    setExpandedGroup(expandedGroup === group.key ? null : group.key)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer"
                >
                    <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">{group.traveler}</div>
                <div className="text-xs text-slate-500 mt-1">{group.trip}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Project Code: {group.projectCode}
                </div>
              
                <div className="flex gap-2 mt-2 flex-wrap">
                  {group.hasPersonalCard && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Personal Card
                    </span>
                  )}
              
                  {group.hasMissingReceipt && (
                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                      Missing Receipt
                    </span>
                  )}
                </div>
              </div>
                      <span className={badge}>
                        {group.itemCount} item{group.itemCount === 1 ? "" : "s"}
                      </span>
                    </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      className="px-3 py-1 text-xs bg-emerald-700 text-white rounded"
                      onClick={async (e) => {
                        e.stopPropagation();
                        for (const item of group.items) {
                        try {
                          await handleApprove(item.id);
                        } catch (e) {
                          console.error("Bulk approve failed for item:", item);
                        }
                      }
                      }}
                    >
                      Approve All
                    </button>
                  
                    <button
                      className="px-3 py-1 text-xs bg-rose-700 text-white rounded"
                      onClick={async (e) => {
                        e.stopPropagation();
                        for (const item of group.items) {
                      try {
                        await handleReject(item.id);
                      } catch (e) {
                        console.error("Bulk reject failed for item:", item);
                      }
                    }
                      }}
                    >
                      Reject All
                    </button>
                  </div>
            
<div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3">
  <div>Total: ${group.total.toFixed(2)}</div>
  <div>
    <div className="flex flex-wrap gap-2">

  {group.missingReceipt && (
    <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded">
      Missing receipt 
    </span>
  )}

  {group.missingProject && (
    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
      Missing project code
    </span>
  )}
</div>
  </div>
</div>

{expandedGroup === group.key && (
  <div className="mt-4 space-y-3">
    {group.items.map((item) => (
      <div
        key={item.id}
        className="rounded-xl border border-slate-200 p-3 bg-white"
      >
        <div className="flex justify-between items-start">
          <div className="text-sm font-medium">{item.vendor}</div>

          <div className="text-right">
            <div className="text-sm">${item.amount}</div>
        <button
          className="mt-2 px-2 py-1 text-xs bg-blue-600 text-white rounded"
          onClick={(e) => {
            e.stopPropagation();
            openExpenseDetails(item);
          }}
        >
          Details
        </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 mt-1">
          {(item.expense_type || "—")} • {(item.payment_method || "—")}
        </div>

        <div className="text-xs text-slate-500 mt-1">
          {(item.expense_date || item.date || "—")}
        </div>

        {false && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500 mb-2">
              Receipt: {item.file_name || "No file name"}
            </div>

            {item.receipt_path ? (
              <ReceiptViewer path={item.receipt_path} />
            ) : (
              <div className="text-xs text-rose-600">
                No receipt uploaded.
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                className="px-2 py-1 text-xs bg-emerald-600 text-white rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(item.id);
                }}
              >
                Approve
              </button>

              <button
                className="px-2 py-1 text-xs bg-rose-600 text-white rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(item.id);
                }}
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
)}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
)}

{view === "manager" && isManager && (
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
                <th className="py-3 pr-4">Payment</th>
                <th className="py-3 pr-4">Receipt</th>
                <th className="py-3 pr-4">Ready</th>
              </tr>
            </thead>
            <tbody>
              {exportItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-slate-500">
                    No approved expenses available for export yet.
                  </td>
                </tr>
              ) : (
                exportItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">
                        {item.vendor || "Unnamed Expense"} / ${Number(item.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.expense_type || "Uncategorized"}
                      </div>
                    </td>
                    <td className="py-3 pr-4">{item.qbAccount}</td>
                    <td className="py-3 pr-4">{item.customerJob}</td>
                    <td className="py-3 pr-4">{item.payment_method || "Unknown"}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          item.receiptStatus === "Attached"
                            ? "text-green-700 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {item.receiptStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.ready
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.ready ? "Yes" : "No"}
                      </span>
                      {!item.ready && (
                        <div className="mt-1 text-xs text-slate-500">
                          {item.blockReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
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
              <span>{readyExportItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Blocked</span>
              <span>{blockedExportItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Ready value</span>
              <span>${readyExportValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total value</span>
              <span>${totalExportValue.toFixed(2)}</span>
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

        {exportMessage && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              exportMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {exportMessage.text}
          </div>
        )}

        <button
          className={`${buttonPrimary} w-full disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={
  isExporting ||
  !savedExpenses.some(
    (item) => item.status === "Approved" && !item.exported_at
  )
}
          onClick={handleExportApproved}
        >
          {isExporting ? "Exporting..." : "Download QuickBooks Desktop CSV"}
        </button>
      </div>
    </div>
  </div>
)}
        
{view === "manager" && isManager && (
  <div className={section}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">5. Export History</h2>
        <span className={badge}>Finance View</span>
      </div>

      <button
        className={buttonSecondary}
        onClick={() => downloadExportHistoryCsv(exportedItems)}
        disabled={!exportedItems.length}
      >
        Download All History CSV
      </button>
    </div>

    <div className={`${card} p-6`}>
      <div className="text-sm text-slate-500 mb-4">
        Export batches: {exportedBatches.length}
      </div>

      {exportedBatches.length === 0 ? (
        <div className="text-sm text-slate-500">No exported batches yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-4">Batch ID</th>
                <th className="py-3 pr-4">Exported</th>
                <th className="py-3 pr-4">Items</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {exportedBatches.map((batch) => (
                <tr key={batch.batchId} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium">
                    {batch.batchId}
                  </td>
                  <td className="py-3 pr-4">
                    {batch.exportedAt
                      ? new Date(batch.exportedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {batch.itemCount}
                  </td>
                  <td className="py-3 pr-4">
                    ${batch.total.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      className={buttonSecondary}
                      onClick={() => downloadSingleBatchCsv(batch.batchId)}
                    >
                      Download Batch CSV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
)}

{view === "admin" && profile?.role === "admin" ? (
  <AdminUsersScreen />
) : null}

{showExpenseDetails && selectedExpense && (
  <div className="fixed inset-0 z-50 bg-black/40">
    <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
        <div>
          <div className="text-lg font-semibold">Expense Details</div>
          <div className="text-sm text-slate-500">
            Review and print expense submission
          </div>
        </div>

        <button className={buttonSecondary} onClick={closeExpenseDetails}>
          Close
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold">
                {selectedExpense.vendor || "Expense"}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                {selectedExpense.expense_type || "Uncategorized"}
              </div>
            </div>

            <div className="text-2xl font-bold">
              ${Number(selectedExpense.amount || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
            <div>
              <div className={label}>Traveler</div>
              <div className="text-sm mt-1">{selectedExpense.traveler || "—"}</div>
            </div>

            <div>
              <div className={label}>Trip</div>
              <div className="text-sm mt-1">{selectedExpense.trip || "—"}</div>
            </div>

            <div>
              <div className={label}>Project Code</div>
              <div className="text-sm mt-1">{selectedExpense.project_code || "—"}</div>
            </div>

            <div>
              <div className={label}>Payment Method</div>
              <div className="text-sm mt-1">{selectedExpense.payment_method || "—"}</div>
            </div>

            <div>
              <div className={label}>Expense Date</div>
              <div className="text-sm mt-1">{selectedExpense.expense_date || "—"}</div>
            </div>

            <div>
              <div className={label}>Business Purpose</div>
              <div className="text-sm mt-1 whitespace-pre-wrap">
                {selectedExpense.business_purpose || "—"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold mb-3">Receipt Preview</div>

            {selectedExpense.receipt_path ? (
              <ReceiptViewer path={selectedExpense.receipt_path} />
            ) : (
              <div className="text-sm text-rose-600">No receipt uploaded.</div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 flex gap-3">
          <button className={buttonSecondary} onClick={() => window.print()}>
            Print
          </button>

          <button
            className="px-4 py-2.5 text-sm font-medium bg-emerald-700 text-white rounded-xl"
            onClick={() => handleApprove(selectedExpense.id)}
          >
            Approve
          </button>

          <button
            className="px-4 py-2.5 text-sm font-medium bg-rose-700 text-white rounded-xl"
            onClick={() => handleReject(selectedExpense.id)}
          >
            Return
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  </div>
);
}
