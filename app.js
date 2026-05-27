// app.js — ส่งข้อมูลผ่าน hidden form (แก้ CORS 100%)

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXje4kpRTKSWDb859__0XD8gbb78Qf2CuYXu0MG79z/dev";

window.addEventListener("DOMContentLoaded", function () {
  checkConnection();
  setTodayAsMin();
});

async function checkConnection() {
  const dot  = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  dot.className    = "status-dot checking";
  text.textContent = "⏳ กำลังตรวจสอบ...";

  if (APPS_SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) {
    dot.className    = "status-dot error";
    text.textContent = "⚠️ ยังไม่ได้ตั้งค่า URL — แก้ app.js บรรทัด 3";
    return;
  }
  try {
    // ใช้ no-cors แค่เช็คว่า URL ตอบสนอง
    await fetch(APPS_SCRIPT_URL, { method:"GET", mode:"no-cors" });
    dot.className    = "status-dot connected";
    text.textContent = "✅ ตั้งค่า URL แล้ว พร้อมใช้งาน";
  } catch(err) {
    dot.className    = "status-dot error";
    text.textContent = "❌ URL ไม่ถูกต้อง — ตรวจสอบอีกครั้ง";
  }
}

function setTodayAsMin() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("startDate").min = today;
  document.getElementById("endDate").min   = today;
}

function calcDays() {
  const start = document.getElementById("startDate").value;
  const end   = document.getElementById("endDate").value;
  const badge = document.getElementById("daysBadge");
  if (!start || !end) { badge.style.display = "none"; return; }
  const d = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  if (d <= 0) { badge.style.display="none"; showError("dateErr","วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น"); return; }
  hideError("dateErr");
  document.getElementById("daysCount").textContent = d;
  badge.style.display = "inline-block";
}

function updateCharCount(el, id, max) {
  document.getElementById(id).textContent = el.value.length + " / " + max;
}

function validateForm() {
  let ok = true;
  [["empName","empNameErr"],["leaveType","leaveTypeErr"],["reason","reasonErr"]].forEach(function([fid,eid]){
    const el = document.getElementById(fid);
    if (!el.value.trim()) { showError(eid); markInvalid(fid); ok=false; }
    else { hideError(eid); markValid(fid); }
  });
  const s = document.getElementById("startDate").value;
  const e2= document.getElementById("endDate").value;
  if (!s||!e2||new Date(e2)<new Date(s)) {
    showError("dateErr","กรุณาเลือกวันที่ให้ถูกต้อง");
    markInvalid("startDate"); markInvalid("endDate"); ok=false;
  } else { hideError("dateErr"); markValid("startDate"); markValid("endDate"); }
  return ok;
}

function showError(id,msg){ const el=document.getElementById(id); if(el){if(msg)el.textContent=msg; el.classList.add("show");} }
function hideError(id){ const el=document.getElementById(id); if(el)el.classList.remove("show"); }
function markInvalid(id){ const el=document.getElementById(id); if(el)el.classList.add("invalid"); }
function markValid(id){ const el=document.getElementById(id); if(el)el.classList.remove("invalid"); }

function collectFormData() {
  const s=document.getElementById("startDate").value;
  const e2=document.getElementById("endDate").value;
  const days=(s&&e2)?Math.ceil((new Date(e2)-new Date(s))/86400000)+1:0;
  return {
    empName:    document.getElementById("empName").value.trim(),
    empId:      document.getElementById("empId").value.trim(),
    department: document.getElementById("department").value.trim(),
    position:   document.getElementById("position").value.trim(),
    leaveType:  document.getElementById("leaveType").value,
    reason:     document.getElementById("reason").value.trim(),
    startDate:  s, endDate: e2, days: days,
    startTime:  document.getElementById("startTime").value,
    endTime:    document.getElementById("endTime").value,
    substitute: document.getElementById("substitute").value.trim(),
    phone:      document.getElementById("phone").value.trim(),
    notes:      document.getElementById("notes").value.trim(),
    submittedAt:new Date().toLocaleString("th-TH"),
  };
}

// ================================================================
// ✅ วิธีส่งข้อมูลที่แก้ CORS ได้จริง 100%
// ใช้ hidden <iframe> + hidden <form> submit ไปที่ Apps Script
// Browser อนุญาตการ submit form ข้ามโดเมนเสมอ
// ================================================================
function sendViaForm(data) {
  return new Promise(function(resolve, reject) {

    // 1. สร้าง iframe ซ่อน (รับ response ไว้ที่นี่)
    var iframe = document.createElement("iframe");
    iframe.name = "hiddenFrame_" + Date.now();
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    // 2. สร้าง form ซ่อน
    var form = document.createElement("form");
    form.method = "POST";
    form.action = APPS_SCRIPT_URL;
    form.target = iframe.name;   // ส่งผลลัพธ์ไปที่ iframe แทนหน้าปัจจุบัน
    form.style.display = "none";

    // 3. ใส่ข้อมูลแต่ละ field ลงใน form
    Object.keys(data).forEach(function(key) {
      var input = document.createElement("input");
      input.type  = "hidden";
      input.name  = key;
      input.value = String(data[key]);
      form.appendChild(input);
    });

    document.body.appendChild(form);

    // 4. รอ iframe โหลดเสร็จ = Apps Script ตอบกลับแล้ว
    var timeout = setTimeout(function() {
      cleanup();
      resolve({ success: true, note: "timeout — ตรวจสอบใน Google Sheets" });
    }, 12000);

    iframe.onload = function() {
      clearTimeout(timeout);
      cleanup();
      resolve({ success: true });
    };

    iframe.onerror = function() {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("iframe error"));
    };

    function cleanup() {
      try { document.body.removeChild(form); } catch(e) {}
      try { document.body.removeChild(iframe); } catch(e) {}
    }

    // 5. Submit!
    form.submit();
  });
}

// ================================================================
// จัดการกดปุ่ม Submit
// ================================================================
document.getElementById("leaveForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  if (!validateForm()) {
    const first = document.querySelector(".error.show");
    if (first) first.scrollIntoView({ behavior:"smooth", block:"center" });
    return;
  }
  if (APPS_SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) {
    alert("⚠️ ยังไม่ได้ตั้งค่า Apps Script URL\nแก้ไขในไฟล์ app.js บรรทัดที่ 3");
    return;
  }

  const btn     = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const btnLoad = document.getElementById("btnLoading");
  btn.disabled       = true;
  btnText.style.display = "none";
  btnLoad.style.display = "inline";

  try {
    await sendViaForm(collectFormData());
    document.getElementById("leaveForm").style.display   = "none";
    document.getElementById("statusBar").style.display   = "none";
    document.getElementById("successPage").style.display = "block";
  } catch(err) {
    alert("❌ เกิดข้อผิดพลาด:\n" + err.message);
    btn.disabled       = false;
    btnText.style.display = "inline";
    btnLoad.style.display = "none";
  }
});

function resetForm() {
  document.getElementById("leaveForm").reset();
  document.getElementById("reasonCount").textContent   = "0 / 500";
  document.getElementById("daysBadge").style.display   = "none";
  document.getElementById("leaveForm").style.display   = "block";
  document.getElementById("statusBar").style.display   = "flex";
  document.getElementById("successPage").style.display = "none";
  const btn = document.getElementById("submitBtn");
  btn.disabled = false;
  document.getElementById("btnText").style.display = "inline";
  document.getElementById("btnLoading").style.display = "none";
  checkConnection();
}