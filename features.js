// ====== features.js ======

let actionDocId = "";
let actionAmount = 0;
let currentUid = null;
let homeUnsubscribe = null;
let queryUnsubscribe = null;
let dailyUnsubscribe = null;
let expenseChart = null; 
let inOutChart = null; 

let currentViewDate = new Date();
let currentStatView = 'all'; 
let statsData = {
    all: { income: 0, expense: 0, categories: {} },
    mine: { income: 0, expense: 0, categories: {} },
    partner: { income: 0, expense: 0, categories: {}, name: "另一半" }
};

// ================= 介面與分頁控制 =================
function switchTab(tabName, element) {
    document.getElementById('tab-home').classList.remove('active');
    document.getElementById('tab-stats').classList.remove('active');
    document.getElementById('tab-' + tabName).classList.add('active');
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    element.classList.add('active');
}

function checkSpecialFields() {
    const mainCat = document.getElementById("main-category").value;
    const subCat = document.getElementById("sub-category").value;
    const recordTypeSelect = document.getElementById("record-type");
    const customSubCatInput = document.getElementById("custom-sub-cat");

    recordTypeSelect.style.display = (subCat === "麻將" || mainCat === "其他") ? "block" : "none";
    customSubCatInput.style.display = (mainCat === "其他" && subCat === "自訂...") ? "block" : "none";
}
setTimeout(checkSpecialFields, 100);

// ================= 日期切換與滑動邏輯 =================
function updateDateDisplay() {
    const today = new Date(); today.setHours(0,0,0,0);
    const view = new Date(currentViewDate); view.setHours(0,0,0,0);
    
    const yyyy = view.getFullYear();
    const mm = String(view.getMonth() + 1).padStart(2, '0');
    const dd = String(view.getDate()).padStart(2, '0');
    
    let dateText = `${yyyy}-${mm}-${dd}`;
    if (view.getTime() === today.getTime()) dateText += " (今天)";
    else if (view.getTime() === today.getTime() - 86400000) dateText += " (昨天)";
    
    document.getElementById('current-view-date').innerText = dateText;
    
    const nextBtn = document.getElementById('next-day-btn');
    if (view >= today) {
        nextBtn.disabled = true; nextBtn.style.opacity = 0.5;
    } else {
        nextBtn.disabled = false; nextBtn.style.opacity = 1;
    }
}

function prevDay() { currentViewDate.setDate(currentViewDate.getDate() - 1); loadHomeExpenses(currentUid); }
function nextDay() {
    const today = new Date(); today.setHours(0,0,0,0);
    const view = new Date(currentViewDate); view.setHours(0,0,0,0);
    if (view >= today) return; 
    currentViewDate.setDate(currentViewDate.getDate() + 1);
    loadHomeExpenses(currentUid); 
}

let touchStartXDaily = 0, touchEndXDaily = 0;
function setupDailySwipe() {
    const swipeArea = document.getElementById('daily-swipe-container');
    if (swipeArea) {
        swipeArea.addEventListener('touchstart', e => { touchStartXDaily = e.changedTouches[0].screenX; }, {passive: true});
        swipeArea.addEventListener('touchend', e => {
            touchEndXDaily = e.changedTouches[0].screenX;
            if (touchEndXDaily < touchStartXDaily - 50) nextDay(); 
            if (touchEndXDaily > touchStartXDaily + 50) prevDay(); 
        }, {passive: true});
    }
}

let currentChartSlide = 0;
function switchChartSlide(index) {
    currentChartSlide = index;
    document.getElementById('chart-carousel').style.transform = `translateX(-${index * 50}%)`;
    document.getElementById('dot-0').style.background = index === 0 ? '#4CAF50' : '#ddd';
    document.getElementById('dot-0').style.width = index === 0 ? '20px' : '8px';
    document.getElementById('dot-0').style.borderRadius = index === 0 ? '4px' : '50%';
    document.getElementById('dot-1').style.background = index === 1 ? '#4CAF50' : '#ddd';
    document.getElementById('dot-1').style.width = index === 1 ? '20px' : '8px';
    document.getElementById('dot-1').style.borderRadius = index === 1 ? '4px' : '50%';
}

let touchStartXChart = 0, touchEndXChart = 0;
function setupChartSwipe() {
    const swipeArea = document.getElementById('chart-carousel');
    if (swipeArea) {
        swipeArea.addEventListener('touchstart', e => { touchStartXChart = e.changedTouches[0].screenX; }, {passive: true});
        swipeArea.addEventListener('touchend', e => {
            touchEndXChart = e.changedTouches[0].screenX;
            if (touchEndXChart < touchStartXChart - 40) switchChartSlide(1); 
            if (touchEndXChart > touchStartXChart + 40) switchChartSlide(0); 
        }, {passive: true});
    }
}


// ================= 新增、修改與刪除 =================
function addExpense() {
    const mainCat = document.getElementById("main-category").value;
    let subCat = document.getElementById("sub-category").value; 
    const customSubCat = document.getElementById("custom-sub-cat").value.trim();
    const amountInput = document.getElementById("amount").value;
    const user = auth.currentUser;
    const rawAmount = Number(amountInput.replace(/,/g, ''));

    if (!rawAmount || rawAmount <= 0) return alert("請輸入有效的金額！");
    if (mainCat === "其他" && subCat === "自訂...") {
        if (!customSubCat) return alert("請輸入自訂項目的名稱喔！");
        subCat = customSubCat; 
        let savedOthers = JSON.parse(localStorage.getItem("customOthers") || "[]");
        if (!savedOthers.includes(subCat)) {
            savedOthers.push(subCat);
            localStorage.setItem("customOthers", JSON.stringify(savedOthers));
            categories["其他"].push(subCat); 
        }
    }
    if (!user) return alert("尚未登入！");

    let recordType = "expense"; 
    const originalSubCat = document.getElementById("sub-category").value; 
    if (originalSubCat === "麻將" || mainCat === "其他") {
        recordType = document.getElementById("record-type").value; 
    }

    currentViewDate = new Date(); 
    loadHomeExpenses(user.uid); 

    db.collection("users").doc(user.uid).collection("expenses").add({
        nickname: currentNickname, mainCat: mainCat, subCat: subCat, amount: rawAmount, type: recordType, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById("amount").value = "";
        document.getElementById("custom-sub-cat").value = ""; 
        if (mainCat === "其他") {
            updateSubCategories(); document.getElementById("sub-category").value = "自訂..."; checkSpecialFields();
        }
    }).catch(err => alert("新增失敗：" + err.message));
}

function openActionModal(docId, amount) {
    actionDocId = docId; actionAmount = amount; document.getElementById("action-modal").style.display = "flex";
}
function closeActionModal() { document.getElementById("action-modal").style.display = "none"; }
function openEdit() {
    const targetId = actionDocId; const targetAmount = actionAmount; closeActionModal(); 
    const newAmountStr = prompt("請輸入修改後的金額：", targetAmount);
    if (newAmountStr === null) return; 
    const rawNewAmount = Number(newAmountStr.replace(/[^\d]/g, ''));
    if (!rawNewAmount || rawNewAmount <= 0) return alert("請輸入有效的數字金額！");
    db.collection("users").doc(currentUid).collection("expenses").doc(targetId).update({ amount: rawNewAmount });
}
function confirmDelete() {
    const targetId = actionDocId; closeActionModal(); 
    if (confirm("確定要刪除這筆紀錄嗎？")) {
        db.collection("users").doc(currentUid).collection("expenses").doc(targetId).delete();
    }
}

// ================= 圖表與統計邏輯 =================
function changeStatView(view) {
    currentStatView = view;
    ['all', 'mine', 'partner'].forEach(v => {
        const btn = document.getElementById('btn-stat-' + v);
        if (v === view) { btn.style.background = '#4CAF50'; btn.style.color = 'white'; } 
        else { btn.style.background = '#eee'; btn.style.color = '#333'; }
    });
    updateStatDisplay(); 
}

function updateStatDisplay() {
    const data = statsData[currentStatView];
    document.getElementById('query-expense').innerText = "$" + data.expense.toLocaleString('en-US');
    document.getElementById('query-income').innerText = "$" + data.income.toLocaleString('en-US');
    const qNet = data.income - data.expense;
    const qNetEl = document.getElementById('query-net');
    qNetEl.innerText = (qNet >= 0 ? "+$" : "-$") + Math.abs(qNet).toLocaleString('en-US');
    qNetEl.style.color = qNet >= 0 ? "#4CAF50" : "#d32f2f";
    
    renderExpenseChart(data.categories);
    renderInOutChart(data.income, data.expense);
}

function renderExpenseChart(categoryTotals) {
    const ctx = document.getElementById('expenseChart');
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    if (expenseChart) expenseChart.destroy();
    
    if (labels.length === 0) {
        ctx.style.display = 'none'; document.getElementById('empty-expense-msg').style.display = 'block'; return;
    }
    ctx.style.display = 'block'; document.getElementById('empty-expense-msg').style.display = 'none';
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut', 
        data: { labels: labels, datasets: [{ data: data, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8d6e63', '#26a69a'], borderWidth: 2, borderColor: '#ffffff' }] },
        plugins: [ChartDataLabels],
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '55%',
            plugins: {
                legend: { position: 'bottom' },
                datalabels: { color: '#ffffff', font: { weight: 'bold', size: 14 }, formatter: (value, context) => { let total = context.chart._metasets[context.datasetIndex].total; let percent = Math.round((value / total) * 100); return percent < 5 ? null : percent + '%'; } },
                tooltip: { callbacks: { label: function(context) { let total = context.chart._metasets[context.datasetIndex].total; let percent = Math.round((context.raw / total) * 100); return `${context.label}: $${context.raw.toLocaleString('en-US')} (${percent}%)`; } } }
            }
        }
    });
}

function renderInOutChart(income, expense) {
    const ctx = document.getElementById('inOutChart');
    const ratioText = document.getElementById('inout-ratio-text');
    if (inOutChart) inOutChart.destroy();

    if (income === 0 && expense === 0) {
        ctx.style.display = 'none'; ratioText.innerText = ""; document.getElementById('empty-inout-msg').style.display = 'block'; return;
    }
    ctx.style.display = 'block'; document.getElementById('empty-inout-msg').style.display = 'none';

    let labels = [], data = [], bgColors = [];
    if (income === 0) {
        ratioText.innerText = "⚠️ 無收入紀錄，無法計算比例"; ratioText.style.color = "#999";
        labels = ['支出 (無收入)']; data = [expense]; bgColors = ['#d32f2f'];
    } else {
        const ratio = Math.round((expense / income) * 100);
        ratioText.innerText = `支出佔總收入的 ${ratio}%`;
        if (expense <= income) {
            ratioText.style.color = "#4CAF50";
            labels = ['支出 (已用)', '結餘 (未花)']; data = [expense, income - expense]; bgColors = ['#FF6384', '#4CAF50'];
        } else {
            ratioText.style.color = "#d32f2f"; ratioText.innerText = `⚠️ 超支！支出高達收入的 ${ratio}%`;
            labels = ['已耗盡的收入', '超支金額']; data = [income, expense - income]; bgColors = ['#ff9800', '#d32f2f']; 
        }
    }

    inOutChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: bgColors, borderWidth: 2, borderColor: '#ffffff' }] },
        plugins: [ChartDataLabels],
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '55%',
            plugins: {
                legend: { position: 'bottom' },
                datalabels: { color: '#ffffff', font: { weight: 'bold', size: 14 }, formatter: (value, context) => { let total = context.chart._metasets[context.datasetIndex].total; let percent = Math.round((value / total) * 100); return percent < 5 ? null : percent + '%'; } },
                tooltip: { callbacks: { label: function(context) { return `${context.label}: $${context.raw.toLocaleString('en-US')}`; } } }
            }
        }
    });
}

function loadDailySummary(uid) {
    if (dailyUnsubscribe) dailyUnsubscribe();
    const today = new Date(); today.setHours(0, 0, 0, 0); 
    dailyUnsubscribe = db.collection("users").doc(uid).collection("expenses")
        .where("timestamp", ">=", today).onSnapshot(snapshot => {
            let expense = 0, income = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if((data.type || "expense") === 'income') income += data.amount;
                else expense += data.amount;
            });
            document.getElementById('daily-expense').innerText = "$" + expense.toLocaleString('en-US');
            document.getElementById('daily-income').innerText = "$" + income.toLocaleString('en-US');
            const net = income - expense;
            const netEl = document.getElementById('daily-net');
            netEl.innerText = (net >= 0 ? "+$" : "-$") + Math.abs(net).toLocaleString('en-US');
            netEl.style.color = net >= 0 ? "#4CAF50" : "#d32f2f";
        });
}

// ⭐ 升級版 renderList，加入 keyword 參數用作過濾
function renderList(snapshot, listMineId, listPartnerId, partnerTitleId, isQuery, keyword = "") {
    const listMine = document.getElementById(listMineId);
    const listPartner = document.getElementById(listPartnerId);
    
    if (isQuery) {
        document.getElementById('query-result-card').style.display = 'block';
        statsData = {
            all: { income: 0, expense: 0, categories: {} },
            mine: { income: 0, expense: 0, categories: {} },
            partner: { income: 0, expense: 0, categories: {}, name: "另一半" }
        };
    }

    listMine.innerHTML = ""; listPartner.innerHTML = ""; 
    let foundPartner = false;

    snapshot.forEach(doc => {
        const data = doc.data();
        
        // ⭐ 關鍵字過濾引擎：不管大小寫，如果輸入的字不包含在分類或名稱裡，就跳過這筆！
        if (isQuery && keyword) {
            const searchStr = (data.mainCat + data.subCat + (data.nickname || "")).toLowerCase();
            if (!searchStr.includes(keyword.toLowerCase())) return; 
        }

        const docId = doc.id; 
        const recordType = data.type || "expense"; 
        const isMine = (data.nickname === currentNickname);
        const amt = data.amount;
        const cat = data.mainCat;
        
        if (isQuery) {
            if (recordType === 'income') statsData.all.income += amt;
            else { statsData.all.expense += amt; statsData.all.categories[cat] = (statsData.all.categories[cat] || 0) + amt; }
            
            if (isMine) {
                if (recordType === 'income') statsData.mine.income += amt;
                else { statsData.mine.expense += amt; statsData.mine.categories[cat] = (statsData.mine.categories[cat] || 0) + amt; }
            } else {
                statsData.partner.name = data.nickname; 
                if (recordType === 'income') statsData.partner.income += amt;
                else { statsData.partner.expense += amt; statsData.partner.categories[cat] = (statsData.partner.categories[cat] || 0) + amt; }
            }
        }
        
        const formattedAmount = Number(data.amount).toLocaleString('en-US');
        const amountColor = recordType === "income" ? "#4CAF50" : "#d32f2f"; 
        const amountSign = recordType === "income" ? "+" : ""; 

        let timeStr = "";
        if (data.timestamp) {
            const dateObj = data.timestamp.toDate();
            timeStr = ` <span style="font-size: 11px; color: #999;">(${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')})</span>`;
        }

        const actionButton = `<span style="margin-left: 10px; cursor: pointer; color: #888; font-size: 18px; padding: 0 5px; font-weight: bold;" onclick="openActionModal('${docId}', ${data.amount})">⋯</span>`;
        const li = `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:5px; font-size: 14px;">
                      <span>${data.mainCat}-${data.subCat}${timeStr}</span> 
                      <div>
                          <span style="color:${amountColor}; font-weight:bold;">${amountSign}$${formattedAmount}</span>
                          ${actionButton}
                      </div>
                    </li>`;
        
        if (isMine) listMine.innerHTML += li;
        else {
            listPartner.innerHTML += li;
            if (!foundPartner) {
                document.getElementById(partnerTitleId).innerText = data.nickname + (isQuery ? "的查詢" : "紀錄");
                foundPartner = true;
            }
        }
    });
    
    if (!foundPartner) document.getElementById(partnerTitleId).innerText = "另一半" + (isQuery ? "的查詢" : "紀錄");

    if (isQuery) {
        document.getElementById('btn-stat-partner').innerText = statsData.partner.name;
        updateStatDisplay(); 
    } else {
        const swipeContainer = document.getElementById('daily-swipe-container');
        const emptyMsg = document.getElementById('empty-daily-msg');
        // 單日模組如果沒有 DOM 內容，顯示空狀態
        if (listMine.innerHTML === "" && listPartner.innerHTML === "") {
            swipeContainer.style.display = 'none'; emptyMsg.style.display = 'block';
        } else {
            swipeContainer.style.display = 'flex'; emptyMsg.style.display = 'none';
        }
    }
}

function loadHomeExpenses(uid) {
    updateDateDisplay(); 
    if (homeUnsubscribe) homeUnsubscribe();
    
    const start = new Date(currentViewDate); start.setHours(0,0,0,0);
    const end = new Date(currentViewDate); end.setHours(23,59,59,999);

    homeUnsubscribe = db.collection("users").doc(uid).collection("expenses")
        .where("timestamp", ">=", start).where("timestamp", "<=", end).orderBy("timestamp", "desc")
        .onSnapshot(snapshot => renderList(snapshot, 'list-mine', 'list-partner', 'partner-title', false));
}

// ================= ⭐ 查詢功能 (支援所有時間與關鍵字) =================
function toggleDateInputs() {
    const type = document.getElementById('query-type').value;
    document.getElementById('date-range-inputs').style.display = type === 'custom' ? 'flex' : 'none';
}

function executeQuery() {
    if (!currentUid) return;
    const type = document.getElementById('query-type').value;
    const keyword = document.getElementById('search-keyword').value.trim(); // 讀取搜尋關鍵字
    
    let queryRef = db.collection("users").doc(currentUid).collection("expenses");
    
    // 如果不是「所有時間」，才加上時間過濾
    if (type !== 'all') {
        let start, end;
        if (type === 'month') {
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (type === 'custom') {
            const startVal = document.getElementById('start-date').value;
            const endVal = document.getElementById('end-date').value;
            if (!startVal || !endVal) return alert("請選擇完整的開始與結束日期！");
            start = new Date(startVal + "T00:00:00");
            end = new Date(endVal + "T23:59:59");
        }
        queryRef = queryRef.where("timestamp", ">=", start).where("timestamp", "<=", end);
    }
    
    queryRef = queryRef.orderBy("timestamp", "desc");
                 
    if (queryUnsubscribe) queryUnsubscribe();
    
    // ⭐ 把抓到的關鍵字丟給 renderList 去過濾
    queryUnsubscribe = queryRef.onSnapshot(snapshot => 
        renderList(snapshot, 'query-list-mine', 'query-list-partner', 'query-partner-title', true, keyword)
    );
}

function loadExpenses(uid) {
    currentUid = uid;
    setupDailySwipe(); 
    setupChartSwipe(); 
    loadDailySummary(uid);
    loadHomeExpenses(uid);
    document.getElementById('query-type').value = 'month';
    toggleDateInputs();
    executeQuery();
    unsubscribe = () => {
        if (homeUnsubscribe) homeUnsubscribe();
        if (queryUnsubscribe) queryUnsubscribe();
        if (dailyUnsubscribe) dailyUnsubscribe();
    };
}