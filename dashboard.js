import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Firebase Config ──
const firebaseConfig = {
  apiKey: "AIzaSyB94_Y4ox7f0OvPlTZ2kQ-RQQoAbhlp0CU",
  authDomain: "time-and-task-management-2d8c3.firebaseapp.com",
  projectId: "time-and-task-management-2d8c3",
  storageBucket: "time-and-task-management-2d8c3.firebasestorage.app",
  messagingSenderId: "987578072001",
  appId: "1:987578072001:web:f10a27db2b915690364d40"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── State ──
let allData     = [];
let filtered    = [];
let chartColors = ["#e53935","#2196f3","#4caf50","#ffc107","#9c27b0","#ff5722","#009688","#607d8b"];


window.loadData = async function () {
  const btn = document.getElementById("btn-refresh");
  btn.classList.add("spinning");
  showLoading(true);

  try {
    const q = query(collection(db, "responses"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);

    allData = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id:                 doc.id,
        timestamp:          d.timestamp?.toDate?.() || null,
        route:              d.route              || "",
        stoppage:           d.stoppage           || "",
        commute_time:       d.commute_time       || "",
        physical_issue:     d.physical_issue     || "",
        destination:        d.destination        || "",
        early_access:       !!d.early_access,
        contact_method:     d.contact_method     || "",
        whatsapp:           d.whatsapp           || "",
        messenger:          d.messenger          || "",
        name:               d.name               || "",
        session:            d.session            || "",
        product_suggestion: d.product_suggestion || "",
        snack_interest:     d.snack_interest      || 0,
        drink_choice:       d.drink_choice       || "",
        price_range:        d.price_range        || "",
        energy_impact:      d.energy_impact      || 0
      };
    });

    populateRouteFilter();
    applyFilters();
    document.getElementById("last-refresh").textContent =
      "Updated " + new Date().toLocaleTimeString();
  } catch (err) {
    console.error("Firestore error:", err);
    document.getElementById("last-refresh").textContent = "Error loading data";
  }

  btn.classList.remove("spinning");
  showLoading(false);
};

function showLoading(show) {
  document.getElementById("loading-overlay")
    .classList.toggle("hidden", !show);
}

function populateRouteFilter() {
  const sel = document.getElementById("f-route");
  const current = sel.value;
  while (sel.options.length > 1) sel.remove(1);

  const routes = [...new Set(allData.map(d => d.route).filter(Boolean))].sort();
  routes.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  });
  sel.value = current;
}

window.applyFilters = function () {
  const fRoute    = document.getElementById("f-route").value;
  const fStop     = document.getElementById("f-stop").value;
  const fEarly    = document.getElementById("f-early").value;
  const fPhysical = document.getElementById("f-physical").value;
  const fDest     = document.getElementById("f-dest").value;

  filtered = allData.filter(d => {
    if (fRoute    && d.route          !== fRoute)              return false;
    if (fStop     && d.stoppage       !== fStop)               return false;
    if (fEarly    && String(d.early_access) !== fEarly)        return false;
    if (fPhysical && d.physical_issue !== fPhysical)           return false;
    if (fDest     && d.destination    !== fDest)               return false;
    return true;
  });

  const hasFilter = fRoute || fStop || fEarly || fPhysical || fDest;
  document.getElementById("filter-result").textContent =
    hasFilter
      ? `Showing ${filtered.length} of ${allData.length} responses`
      : "";

  renderAll();
};

window.clearFilters = function () {
  ["f-route","f-stop","f-early","f-physical","f-dest"]
    .forEach(id => document.getElementById(id).value = "");
  applyFilters();
};

function renderAll() {
  renderKPIs();
  renderBarChart("chart-route",    countBy(filtered, "route"),        true);
  renderBarChart("chart-stop",     countBy(filtered, "stoppage"),     false);
  renderBarChart("chart-drink",    countBy(filtered, "drink_choice"), false);
  renderBarChart("chart-price",    countBy(filtered, "price_range"),  false);
  renderDonut("chart-time",     "legend-time",     countBy(filtered, "commute_time"));
  renderDonut("chart-physical", "legend-physical", countBy(filtered, "physical_issue"));
  renderDonut("chart-dest",     "legend-dest",     countBy(filtered, "destination"));
  renderScaleChart("chart-snack",  "avg-snack",  filtered, "snack_interest",  "সপ্তাহে");
  renderScaleChart("chart-energy", "avg-energy", filtered, "energy_impact",   "Tutoring impact");
  renderAvgEnergyChart();
  renderEarlyAccess();
  renderSuggestions();
  renderTable();
}

function renderKPIs() {
  const total     = filtered.length;
  const early     = filtered.filter(d => d.early_access).length;
  const wa        = filtered.filter(d => d.contact_method === "WhatsApp").length;
  const msg       = filtered.filter(d => d.contact_method === "Messenger").length;
  const physical  = filtered.filter(d =>
    d.physical_issue === "প্রায়ই হয়" || d.physical_issue === "মাঝে মাঝে হয়"
  ).length;
  const energyVals = filtered.map(d => d.energy_impact).filter(v => v > 0);
  const avgEnergy = energyVals.length
    ? (energyVals.reduce((a,b) => a+b, 0) / energyVals.length).toFixed(1)
    : "—";

  animateCount("kv-total",    total);
  animateCount("kv-early",    early);
  animateCount("kv-whatsapp", wa);
  animateCount("kv-messenger",msg);
  animateCount("kv-physical", physical);
  document.getElementById("kv-energy").textContent =
    avgEnergy !== "—" ? avgEnergy + "/5" : "—";
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(start + (target - start) * ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderBarChart(containerId, counts, sorted) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  let entries = Object.entries(counts);
  if (sorted) entries.sort((a,b) => b[1] - a[1]);
  const total = entries.reduce((s,[,v]) => s+v, 0);
  if (!entries.length) { container.innerHTML = '<div class="empty-state">No data</div>'; return; }

  entries.forEach(([label, count], i) => {
    const pct = total ? Math.round(count / total * 100) : 0;
    const color = chartColors[i % chartColors.length];
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <div class="bar-label" title="${label}">${label || "—"}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:0%;background:${color}" data-pct="${pct}">
          ${pct >= 12 ? `<span class="bar-pct">${pct}%</span>` : ""}
        </div>
      </div>
      <div class="bar-count">${count}</div>
    `;
    container.appendChild(row);
  });

  requestAnimationFrame(() => {
    container.querySelectorAll(".bar-fill").forEach(el => {
      el.style.width = el.dataset.pct + "%";
    });
  });
}

function renderDonut(canvasId, legendId, counts) {
  const canvas = document.getElementById(canvasId);
  const legendEl = document.getElementById(legendId);
  if (!canvas || !legendEl) return;

  const ctx = canvas.getContext("2d");
  const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const total = entries.reduce((s,[,v]) => s+v, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!total) {
    ctx.fillStyle = "#333";
    ctx.font = "12px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data", canvas.width/2, canvas.height/2);
    legendEl.innerHTML = "";
    return;
  }

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const outerR = Math.min(cx, cy) - 4;
  const innerR = outerR * 0.58;
  let angle = -Math.PI / 2;

  entries.forEach(([, count], i) => {
    const slice = (count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = chartColors[i % chartColors.length];
    ctx.fill();
    angle += slice;
  });

  // Inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg-2").trim() || "#161616";
  ctx.fill();

  // Center text
  ctx.fillStyle = "#f0f0f0";
  ctx.font = `bold 20px Syne, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total, cx, cy);

  // Legend
  legendEl.innerHTML = entries.map(([label, count], i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${chartColors[i % chartColors.length]}"></div>
      <span>${label || "—"}</span>
      <span class="legend-val">${count}</span>
    </div>
  `).join("");
}

function renderScaleChart(containerId, avgId, data, field, label) {
  const container = document.getElementById(containerId);
  const avgEl     = document.getElementById(avgId);
  if (!container) return;

  const counts = {1:0, 2:0, 3:0, 4:0, 5:0};
  let sum = 0, n = 0;
  data.forEach(d => {
    const v = d[field];
    if (v >= 1 && v <= 5) {
      counts[v]++;
      sum += v;
      n++;
    }
  });

  const max = Math.max(...Object.values(counts), 1);
  const avg = n ? (sum/n).toFixed(2) : null;

  container.innerHTML = [1,2,3,4,5].map(i => {
    const h = Math.round((counts[i] / max) * 100);
    const color = `hsl(${(i-1)*25 + 0}, 75%, ${40 + i*5}%)`;
    return `
      <div class="scale-col">
        <div class="scale-count">${counts[i]}</div>
        <div class="scale-bar-wrap">
          <div class="scale-bar" style="height:0%;background:${color}" data-h="${h}"></div>
        </div>
        <div class="scale-num">${i}</div>
      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    container.querySelectorAll(".scale-bar").forEach(el => {
      el.style.height = el.dataset.h + "%";
    });
  });

  avgEl.innerHTML = avg
    ? `Average: <strong>${avg}</strong> / 5 &nbsp;·&nbsp; ${n} responses`
    : `No data yet`;
}

// =============================================
//  AVG ENERGY GAUGE CHART (NEW)
// =============================================

function renderAvgEnergyChart() {
  const canvas = document.getElementById("chart-energy-gauge");
  if (!canvas) return;

  const vals = filtered.map(d => d.energy_impact).filter(v => v >= 1 && v <= 5);
  const avg = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H * 0.72;
  const r  = Math.min(W, H * 1.4) * 0.38;
  const startAngle = Math.PI;
  const endAngle   = 2 * Math.PI;

  // Background arc track
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = "#252525";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.stroke();

  // Gradient fill arc
  if (avg !== null) {
    const fraction = (avg - 1) / 4; // 1–5 maps to 0–1
    const fillEnd  = startAngle + fraction * Math.PI;

    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0,   "#ff6f6f");
    grad.addColorStop(0.5, "#e53935");
    grad.addColorStop(1,   "#b71c1c");

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, fillEnd);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.stroke();

    // Needle dot at tip
    const needleX = cx + r * Math.cos(fillEnd);
    const needleY = cy + r * Math.sin(fillEnd);
    ctx.beginPath();
    ctx.arc(needleX, needleY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#e53935";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Scale ticks (1–5)
  for (let i = 0; i <= 4; i++) {
    const angle = Math.PI + (i / 4) * Math.PI;
    const tx = cx + (r + 22) * Math.cos(angle);
    const ty = cy + (r + 22) * Math.sin(angle);
    ctx.fillStyle = "#555";
    ctx.font = "bold 10px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i + 1, tx, ty);
  }

  // Center value text
  if (avg !== null) {
    ctx.fillStyle = "#f0f0f0";
    ctx.font = "bold 26px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(avg.toFixed(1), cx, cy - 10);

    ctx.fillStyle = "#555";
    ctx.font = "11px Syne, sans-serif";
    ctx.fillText("out of 5", cx, cy + 14);

    ctx.fillStyle = "#e53935";
    ctx.font = "bold 10px Syne, sans-serif";
    ctx.fillText(`${vals.length} responses`, cx, cy + 30);
  } else {
    ctx.fillStyle = "#555";
    ctx.font = "bold 22px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("—", cx, cy - 4);
  }
}

// =============================================
//  EARLY ACCESS (MODIFIED)
// =============================================

function renderEarlyAccess() {
  const earlyUsers = filtered.filter(d => d.early_access);
  const el = document.getElementById("early-stats");
  if (!el) return;

  // Only count users with valid contact
  const validUsers = earlyUsers.filter(d => hasValidContact(d));
  const wa  = earlyUsers.filter(d => d.contact_method === "WhatsApp").length;
  const msg = earlyUsers.filter(d => d.contact_method === "Messenger").length;

  const sessions = countBy(earlyUsers, "session");
  const topSession = Object.entries(sessions).sort((a,b)=>b[1]-a[1])[0];

  el.innerHTML = `
    <div class="early-card">
      <div class="early-card-label">Total Partners</div>
      <div class="early-card-value">${earlyUsers.length}</div>
      <div class="early-card-sub">${allData.length ? Math.round(earlyUsers.length/allData.length*100) : 0}% of all responses</div>
    </div>
  `;

  if (validUsers.length) {
    const listHtml = `
      <div style="margin-top:1.25rem;">
        <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);margin-bottom:.6rem;">
          Contact List <span style="color:var(--accent);margin-left:6px;">${validUsers.length} contactable</span>
        </div>
        <div class="early-contact-list">
          ${validUsers.map((d, i) => {
            const contactVal = d.contact_method === "WhatsApp" ? d.whatsapp : d.messenger;
            const icon = d.contact_method === "WhatsApp" ? "📱" : "💬";
            return `
              <div class="early-contact-item">
                <span class="ec-name">${escHtml(d.name)}</span>
                <span class="ec-session">${escHtml(d.session) || "—"}</span>
                <span class="ec-contact ${d.contact_method === 'WhatsApp' ? 'contact-wa' : 'contact-msg'}">
                  ${icon} ${escHtml(contactVal)}
                </span>
                <button class="btn-message" onclick="openMessageModal(${i})">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  Message
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
    el.insertAdjacentHTML("beforeend", listHtml);

    // Store valid users in a data attribute for modal access
    el.dataset.validUsers = JSON.stringify(validUsers.map(d => ({
      name: d.name,
      session: d.session,
      route: d.route,
      stoppage: d.stoppage,
      contact_method: d.contact_method,
      whatsapp: d.whatsapp,
      messenger: d.messenger
    })));
  }
}

function hasValidContact(d) {
  if (!d.name || !d.name.trim()) return false;
  if (d.contact_method === "WhatsApp")  return !!(d.whatsapp && d.whatsapp.trim());
  if (d.contact_method === "Messenger") return !!(d.messenger && d.messenger.trim());
  return false;
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

// ── Message Modal ──
window.openMessageModal = function(index) {
  const statsEl = document.getElementById("early-stats");
  const users = JSON.parse(statsEl.dataset.validUsers || "[]");
  const person = users[index];
  if (!person) return;

  const template = `Hi ${person.name}, thank you for joining the DU BUS Early Access program! 🚌\n\nWe're thrilled to have you as one of our first partners. Your feedback matters a lot to us.\n\nWe will keep you updated on new features and improvements to your commute experience on Route ${person.route || "–"} from ${person.stoppage || "–"}.\n\nLooking forward to your valuable insights!\n\n– DU BUS Team`;

  const modal = document.getElementById("message-modal");
  document.getElementById("modal-person-name").textContent    = person.name;
  document.getElementById("modal-person-session").textContent = person.session || "—";
  document.getElementById("modal-person-contact").textContent =
    (person.contact_method === "WhatsApp" ? "📱 " + person.whatsapp : "💬 " + person.messenger);
  document.getElementById("modal-message-text").value = template;

  // Store person data for "Done" click
  modal.dataset.personJson = JSON.stringify(person);
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
};

window.closeMessageModal = function() {
  const modal = document.getElementById("message-modal");
  modal.classList.remove("active");
  document.body.style.overflow = "";
};

window.sendMessage = function() {
  const modal = document.getElementById("message-modal");
  const person = JSON.parse(modal.dataset.personJson || "{}");
  const text   = document.getElementById("modal-message-text").value;

  closeMessageModal();

  if (person.contact_method === "WhatsApp") {
    const cleanNum = person.whatsapp.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "").replace(/^0/, "88");
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`, "_blank");
  } else if (person.contact_method === "Messenger") {
    window.open(`https://www.messenger.com/t/${encodeURIComponent(person.messenger)}?text=${encodeURIComponent(text)}`, "_blank");
  }
};

// Close on backdrop click
document.addEventListener("click", e => {
  if (e.target.id === "message-modal") closeMessageModal();
});

// =============================================
//  SUGGESTIONS
// =============================================

function renderSuggestions() {
  const el = document.getElementById("suggestions-wrap");
  if (!el) return;

  const suggestions = filtered
    .map(d => d.product_suggestion?.trim())
    .filter(Boolean);

  if (!suggestions.length) {
    el.innerHTML = '<span class="suggestions-empty">No product suggestions yet.</span>';
    return;
  }

  el.innerHTML = suggestions.map(s =>
    `<span class="suggestion-tag">${escHtml(s)}</span>`
  ).join("");
}

// =============================================
//  TABLE
// =============================================

window.renderTable = function () {
  const search = (document.getElementById("table-search")?.value || "").toLowerCase();
  const body   = document.getElementById("table-body");
  const footer = document.getElementById("table-footer");
  if (!body) return;

  const rows = filtered.filter(d => {
    if (!search) return true;
    return (
      d.name.toLowerCase().includes(search)     ||
      d.route.toLowerCase().includes(search)    ||
      d.stoppage.toLowerCase().includes(search) ||
      d.whatsapp.includes(search)               ||
      d.session.toLowerCase().includes(search)
    );
  });

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="15" class="empty-state">No matching responses</td></tr>`;
    footer.textContent = "";
    return;
  }

  body.innerHTML = rows.map((d, i) => `
    <tr>
      <td style="color:var(--text-3)">${i + 1}</td>
      <td>${d.timestamp ? formatDate(d.timestamp) : "—"}</td>
      <td style="color:var(--text-1);font-weight:600">${d.route || "—"}</td>
      <td>${d.stoppage || "—"}</td>
      <td>${d.commute_time || "—"}</td>
      <td>${d.physical_issue || "—"}</td>
      <td>${d.destination || "—"}</td>
      <td>${d.early_access
        ? '<span class="badge-yes">YES</span>'
        : '<span class="badge-no">NO</span>'}</td>
      <td class="${d.contact_method === 'WhatsApp' ? 'contact-wa' : d.contact_method === 'Messenger' ? 'contact-msg' : ''}">
        ${d.contact_method === "WhatsApp"
          ? "📱 " + (d.whatsapp || "—")
          : d.contact_method === "Messenger"
            ? "💬 " + (d.messenger || "—")
            : "—"}
      </td>
      <td style="color:var(--text-1)">${d.name || "—"}</td>
      <td>${d.session || "—"}</td>
      <td>${d.drink_choice || "—"}</td>
      <td>${d.price_range || "—"}</td>
      <td style="color:var(--accent);font-weight:700">${d.snack_interest || "—"}</td>
      <td style="color:var(--accent);font-weight:700">${d.energy_impact || "—"}</td>
    </tr>
  `).join("");

  footer.textContent = `Showing ${rows.length} response${rows.length !== 1 ? "s" : ""}`;
};

// =============================================
//  CSV EXPORT
// =============================================

window.exportCSV = function () {
  const headers = [
    "Timestamp","Route","Stoppage","Commute Time","Physical Issue",
    "Destination","Early Access","Contact Method","WhatsApp","Messenger",
    "Name","Session","Product Suggestion","Snack Interest","Drink Choice",
    "Price Range","Energy Impact"
  ];

  const rows = filtered.map(d => [
    d.timestamp ? formatDate(d.timestamp) : "",
    d.route, d.stoppage, d.commute_time, d.physical_issue,
    d.destination, d.early_access ? "Yes" : "No",
    d.contact_method, d.whatsapp, d.messenger,
    d.name, d.session, d.product_suggestion,
    d.snack_interest, d.drink_choice, d.price_range, d.energy_impact
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url,
    download: `du_bus_responses_${new Date().toISOString().slice(0,10)}.csv`
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// =============================================
//  UTILITIES
// =============================================

function countBy(arr, key) {
  return arr.reduce((acc, d) => {
    const v = d[key];
    if (v !== undefined && v !== null && v !== "") {
      acc[v] = (acc[v] || 0) + 1;
    }
    return acc;
  }, {});
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
});
