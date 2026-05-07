
// ---------- Config ----------
const WEBHOOKS = {
    gpt: "https://n8n-smartmarketer.duckdns.org/webhook/873bf322-b3db-4e92-99ec-d50579be2583",
};

const ACCENT =
    getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#E8B86A";
const charts = {};

// Chart.js global defaults
Chart.defaults.color = "#8C8E96";
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.tooltip.backgroundColor = "#15181F";
Chart.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,0.14)";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleColor = "#ECEBE6";
Chart.defaults.plugins.tooltip.bodyColor = "#ECEBE6";

// ---------- DOM refs ----------
const els = {
    form: document.getElementById("analyzeForm"),
    brand: document.getElementById("brand"),
    queries: document.getElementById("queries"),
    submitBtn: document.getElementById("submitBtn"),
    status: document.getElementById("status"),
    nextZone: document.getElementById("nextZone"),
    sheetLinkSecondary: document.getElementById("sheetLinkSecondary"),
    newScanLink: document.getElementById("newScanLink"),
    actionDashboard: document.getElementById("actionDashboard"),
    actionCompetitor: document.getElementById("actionCompetitor"),
    analysisSection: document.getElementById("analysisSection"),
    engineBadge: document.getElementById("engineBadge"),
    totalRows: document.getElementById("totalRows"),
    avgScore: document.getElementById("avgScore"),
    urlMentions: document.getElementById("urlMentions"),
    competitorsCount: document.getElementById("competitorsCount"),
    resultsBody: document.getElementById("resultsBody"),
};

// Default values for quick testing
window.addEventListener("load", () => {
    els.brand.value = "My Brand";
    els.queries.value = "best running shoes, top rated sneakers";
});

// ---------- Helpers ----------
function showStatus(type, html) {
    els.status.className = "status show " + type;
    els.status.innerHTML = html;
}
function clearStatus() {
    els.status.className = "status";
    els.status.innerHTML = "";
}

function showNextZone(sheetUrl) {
    els.sheetLinkSecondary.href = sheetUrl;
    els.nextZone.classList.add("show");
    setTimeout(
        () =>
            els.nextZone.scrollIntoView({ behavior: "smooth", block: "start" }),
        100,
    );
}

function resetUI() {
    els.nextZone.classList.remove("show");
    els.analysisSection.classList.remove("show");
    Object.values(charts).forEach((c) => c?.destroy?.());
    Object.keys(charts).forEach((k) => delete charts[k]);
}

// ---------- Action card handlers (placeholders for now) ----------
els.actionDashboard.addEventListener("click", () => {
    // For now just reveal the analysis section if we have data.
    // In the unified tool, this would trigger the dashboard render step.
    if (els.resultsBody.children.length > 0) {
        els.analysisSection.classList.add("show");
        els.analysisSection.scrollIntoView({ behavior: "smooth" });
    } else {
        showStatus(
            "info",
            "Dashboard view will render here once the row-data path is wired up. (Sheet path returned a Google Sheet — dashboard rendering from that sheet is the next integration step.)",
        );
    }
});

els.actionCompetitor.addEventListener("click", () => {
    showStatus(
        "info",
        "Competitor Report generation will be wired to its webhook in the next step.",
    );
});

els.newScanLink.addEventListener("click", (e) => {
    e.preventDefault();
    resetUI();
    clearStatus();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- Form submit ----------
els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const engineId = e.submitter?.value || "gpt";
    const targetWebhook = WEBHOOKS[engineId];

    const brand = els.brand.value.trim();
    const queries = els.queries.value
        .split(",")
        .map((q) => q.trim())
        .filter(Boolean);

    if (queries.length === 0) {
        showStatus("error", "Please enter at least one query.");
        return;
    }

    resetUI();
    els.submitBtn.disabled = true;
    els.submitBtn.classList.add("loading");
    els.submitBtn.innerHTML = "Running scan";

    showStatus(
        "loading",
        "Connecting to the visibility engine. We're collecting rankings across your queries — this usually takes 10–12 minutes.",
    );

    try {
        const response = await fetch(targetWebhook, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            mode: "cors",
            body: JSON.stringify({ Brand: brand, Query: queries }),
        });

        if (!response.ok) throw new Error("HTTP " + response.status);

        const data = await response.json();

        // Two response shapes: a Google Sheet object, or an array of result rows.
        const fileResult =
            data?.mimeType === "application/vnd.google-apps.spreadsheet"
                ? data
                : Array.isArray(data) &&
                    data[0]?.mimeType ===
                    "application/vnd.google-apps.spreadsheet"
                    ? data[0]
                    : null;

        if (fileResult) {
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${fileResult.id}`;
            showStatus(
                "success",
                `<strong>Scan complete.</strong> Your report <em>${fileResult.name || "Visibility Report"}</em> is ready.
           <a class="sheet-link" href="${sheetUrl}" target="_blank" rel="noopener">📄 Open spreadsheet ↗</a>`,
            );
            showNextZone(sheetUrl);
        } else if (Array.isArray(data) && data.length > 0) {
            // Inline data path
            els.engineBadge.textContent = (engineId || "gpt").toUpperCase();
            displayResults(data);
            createCharts(data);
            els.analysisSection.classList.add("show");
            showStatus(
                "success",
                `Scan complete — processed ${data.length} rows.`,
            );
            showNextZone("#");
        } else {
            showStatus(
                "info",
                "The scan ran but returned no usable data. Try different queries.",
            );
        }
    } catch (err) {
        console.error(err);
        showStatus(
            "error",
            `Could not complete the scan: ${err.message}. Check the webhook connection.`,
        );
    } finally {
        els.submitBtn.disabled = false;
        els.submitBtn.classList.remove("loading");
        els.submitBtn.innerHTML =
            'Run Visibility Scan <span class="arrow">→</span>';
    }
});

// ---------- Render: table ----------
function displayResults(rows) {
    els.resultsBody.innerHTML = "";
    let totalScore = 0,
        urlCount = 0;
    const competitors = new Set();

    rows.forEach((row) => {
        const query = row.query || "";
        const comp = row.competitor || "";
        const rank = parseInt(row.ranks) || 0;
        const score = parseInt(row.visibilityScore) || 0;
        const m1 = row.mention1 === true || row.mention1 === "true";
        const m2 = row.mention2 === true || row.mention2 === "true";

        totalScore += score;
        if (m1) urlCount++;
        if (comp) competitors.add(comp);

        const scoreCls =
            score > 70 ? "badge-ok" : score > 40 ? "badge-warn" : "badge-bad";
        const rankCls =
            rank > 0 && rank <= 3
                ? "badge-ok"
                : rank <= 5
                    ? "badge-warn"
                    : "badge-bad";

        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td><strong>${query}</strong></td>
        <td>${comp}</td>
        <td><span class="badge ${rankCls}">#${rank || "–"}</span></td>
        <td><span class="badge ${scoreCls}">${score}</span></td>
        <td><span class="badge ${m1 ? "badge-ok" : "badge-bad"}">${m1 ? "✓" : "✗"}</span></td>
        <td><span class="badge ${m2 ? "badge-ok" : "badge-bad"}">${m2 ? "✓" : "✗"}</span></td>`;
        els.resultsBody.appendChild(tr);
    });

    els.totalRows.textContent = rows.length;
    els.avgScore.textContent = rows.length
        ? Math.round(totalScore / rows.length)
        : 0;
    els.urlMentions.textContent = urlCount;
    els.competitorsCount.textContent = competitors.size;
}

// ---------- Render: charts ----------
function createCharts(rows) {
    const axis = {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#8C8E96" },
    };

    const queryScores = {},
        compCount = {};
    const rankDist = { "Top 3": 0, "4–6": 0, "7–10": 0, "11+": 0 };
    let inUrl = 0,
        notInUrl = 0;

    rows.forEach((row) => {
        const q = row.query || "Unknown";
        const s = parseInt(row.visibilityScore) || 0;
        (queryScores[q] = queryScores[q] || []).push(s);

        const c = row.competitor || "Unknown";
        compCount[c] = (compCount[c] || 0) + 1;

        const r = parseInt(row.ranks) || 0;
        if (r > 0 && r <= 3) rankDist["Top 3"]++;
        else if (r <= 6) rankDist["4–6"]++;
        else if (r <= 10) rankDist["7–10"]++;
        else rankDist["11+"]++;

        if (row.mention1 === true || row.mention1 === "true") inUrl++;
        else notInUrl++;
    });

    const avgByQuery = Object.entries(queryScores).map(([q, arr]) => ({
        q,
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    }));
    const topComp = Object.entries(compCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    charts.score = new Chart(document.getElementById("scoreChart"), {
        type: "bar",
        data: {
            labels: avgByQuery.map((x) => x.q),
            datasets: [
                {
                    data: avgByQuery.map((x) => x.avg),
                    backgroundColor: ACCENT,
                    borderRadius: 6,
                    barThickness: 22,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ...axis, beginAtZero: true, max: 100 },
                x: { ...axis, grid: { display: false } },
            },
        },
    });

    charts.competitor = new Chart(
        document.getElementById("competitorChart"),
        {
            type: "bar",
            data: {
                labels: topComp.map((c) => c[0]),
                datasets: [
                    {
                        data: topComp.map((c) => c[1]),
                        backgroundColor: ACCENT,
                        borderRadius: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: { legend: { display: false } },
                scales: { x: axis, y: { ...axis, grid: { display: false } } },
            },
        },
    );

    charts.rank = new Chart(document.getElementById("rankChart"), {
        type: "doughnut",
        data: {
            labels: Object.keys(rankDist),
            datasets: [
                {
                    data: Object.values(rankDist),
                    backgroundColor: ["#7FBF8C", "#E8B86A", "#D97A6F", "#5C5E66"],
                    borderColor: "#15181F",
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { padding: 16, usePointStyle: true },
                },
            },
        },
    });

    charts.url = new Chart(document.getElementById("urlChart"), {
        type: "doughnut",
        data: {
            labels: ["Brand in URL", "Not in URL"],
            datasets: [
                {
                    data: [inUrl, notInUrl],
                    backgroundColor: [ACCENT, "rgba(255,255,255,0.08)"],
                    borderColor: "#15181F",
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { padding: 16, usePointStyle: true },
                },
            },
        },
    });
}