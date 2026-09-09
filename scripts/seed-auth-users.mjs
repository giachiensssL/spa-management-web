import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(filename) {
  try {
    const envPath = resolve(__dirname, "..", filename);
    const envContent = readFileSync(envPath, "utf-8");
    const vars = {};
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }
    return vars;
  } catch (e) {
    return {};
  }
}

const envVars = Object.assign({}, loadEnv(".env"), loadEnv(".env.local"));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("ERROR: Thieu VITE_SUPABASE_URL. Kiem tra file .env");
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: Thieu SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Chay lai voi: $env:SUPABASE_SERVICE_ROLE_KEY=... && node scripts/seed-auth-users.mjs");
  process.exit(1);
}

console.log("URL:", SUPABASE_URL);
console.log("Key (first 20):", SERVICE_ROLE_KEY.slice(0, 20) + "...");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  { email: "manager@spa.vn",      password: "Manager@123",   role: "manager",      vn_name: "Hoang Thi Mai"   },
  { email: "receptionist@spa.vn", password: "Reception@123", role: "receptionist", vn_name: "Le Ngoc Anh"     },
  { email: "therapist@spa.vn",    password: "Therapist@123", role: "therapist",    vn_name: "Nguyen Thi Huong"},
];

const VN_NAMES = {
  "Hoang Thi Mai":    "Ho\u00e0ng Th\u1ecb Mai",
  "Le Ngoc Anh":      "L\u00ea Ng\u1ecdc Anh",
  "Nguyen Thi Huong": "Nguy\u1ec5n Th\u1ecb H\u01b0\u01a1ng",
};

async function run() {
  console.log("\nBat dau seed tai khoan demo...\n");

  const { data: allUsersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Khong the lay danh sach users:", listErr.message);
    console.error("Kiem tra lai SERVICE_ROLE_KEY co dung khong");
    process.exit(1);
  }

  const allUsers = allUsersData.users;

  for (const demo of DEMO_USERS) {
    console.log("-- Xu ly:", demo.email);
    const existing = allUsers.find(function(u) {
      return u.email && u.email.toLowerCase() === demo.email.toLowerCase();
    });

    let userId;

    if (existing) {
      console.log("   User da ton tai, cap nhat password...");
      const upRes = await supabase.auth.admin.updateUserById(existing.id, {
        password: demo.password,
        email_confirm: true,
      });
      if (upRes.error) console.error("   LOI:", upRes.error.message);
      else console.log("   Password OK");
      userId = existing.id;
    } else {
      console.log("   Tao user moi...");
      const crRes = await supabase.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: { demo: true, role: demo.role },
      });
      if (crRes.error) {
        console.error("   LOI tao:", crRes.error.message);
        continue;
      }
      userId = crRes.data.user.id;
      console.log("   Tao thanh cong, id:", userId);
    }

    const vnName = VN_NAMES[demo.vn_name];
    const empRes = await supabase.from("employees").select("id, full_name").eq("full_name", vnName).maybeSingle();
    const empId = empRes.data ? empRes.data.id : null;

    const profRes = await supabase.from("profiles").upsert({
      id: userId,
      username: demo.email.split("@")[0],
      role: demo.role,
      full_name: vnName,
      employee_id: empId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (profRes.error) console.error("   Profile LOI:", profRes.error.message);
    else console.log("   Profile OK (employee:", empRes.data ? empRes.data.full_name : "khong tim thay", ")");
    console.log("");
  }

  console.log("=== HOAN THANH ===");
  console.log("manager@spa.vn          Manager@123");
  console.log("receptionist@spa.vn     Reception@123");
  console.log("therapist@spa.vn        Therapist@123");
}

run().catch(function(err) { console.error("Loi:", err); process.exit(1); });
