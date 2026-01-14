// --- تهيئة البيانات ---
let db = JSON.parse(localStorage.getItem('noorHusseinDB')) || { customers: [] };
let activeCustomer = null;
let currentCart = [];

// --- تشغيل شاشة البداية ---
window.onload = function() {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 1000);
    }, 2500);
    renderCustomerList();
    updateGrandTotal();
};

// --- التنقل بين التبويبات ---
function switchTab(tabId) {
    // منع دخول تبويبات العمليات بدون اختيار زبون
    if ((tabId === 'tab-invoice' || tabId === 'tab-payment' || tabId === 'tab-reports') && !activeCustomer) {
        alert('الرجاء اختيار زبون من القائمة الرئيسية أولاً');
        switchTab('tab-customers');
        return;
    }

    // إخفاء الكل وإظهار المطلوب
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // تحديث الأزرار السفلية
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');

    if(activeCustomer) refreshCustomerViews();
}

// --- إدارة الزبائن ---
function addNewCustomerPrompt() {
    const name = prompt("أدخل اسم الزبون الجديد:");
    if (name) {
        const newC = {
            id: Date.now(),
            name: name,
            totalSales: 0,
            totalPaid: 0,
            transactions: [] // {type: 'sale'|'pay', date, items?, amount}
        };
        db.customers.push(newC);
        saveData();
        renderCustomerList();
        selectCustomer(newC.id);
    }
}

function renderCustomerList(filterText = '') {
    const list = document.getElementById('customerListContainer');
    list.innerHTML = '';
    
    const filtered = db.customers.filter(c => c.name.includes(filterText));
    
    filtered.forEach(c => {
        const debt = c.totalSales - c.totalPaid;
        const div = document.createElement('div');
        div.className = 'customer-item';
        div.onclick = () => selectCustomer(c.id);
        div.innerHTML = `
            <div>
                <strong>${c.name}</strong><br>
                <small style="color:${debt > 0 ? 'red' : 'green'}">الدين: ${debt.toLocaleString()}</small>
            </div>
            <i class="fas fa-chevron-left" style="color:#ccc"></i>
        `;
        list.appendChild(div);
    });
}

function filterCustomers() {
    renderCustomerList(document.getElementById('customerSearchInput').value);
}

function selectCustomer(id) {
    activeCustomer = db.customers.find(c => c.id === id);
    document.getElementById('headerCustomerName').innerText = activeCustomer.name;
    refreshCustomerViews();
    switchTab('tab-invoice'); // ذهاب تلقائي للبيع
}

function clearSelection() {
    activeCustomer = null;
    document.getElementById('headerCustomerName').innerText = 'لم يتم التحديد';
    switchTab('tab-customers');
}

// --- عمليات البيع (الفاتورة) ---
function addItemToCart() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const qty = parseFloat(document.getElementById('itemQty').value);

    if (!name || !price) return alert('أكمل البيانات');

    currentCart.push({ name, price, qty, total: price * qty });
    document.getElementById('itemName').value = '';
    document.getElementById('itemName').focus();
    renderCart();
}

function renderCart() {
    const tbody = document.querySelector('#cartTable tbody');
    tbody.innerHTML = '';
    let total = 0;
    currentCart.forEach((item, idx) => {
        total += item.total;
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.price}</td>
                <td>${item.qty}</td>
                <td><i class="fas fa-trash" style="color:red; cursor:pointer" onclick="removeFromCart(${idx})"></i></td>
            </tr>
        `;
    });
    document.getElementById('cartTotal').innerText = total.toLocaleString();
}

function removeFromCart(idx) {
    currentCart.splice(idx, 1);
    renderCart();
}

function saveInvoice() {
    if (currentCart.length === 0) return alert('السلة فارغة');
    
    const totalAmount = currentCart.reduce((sum, i) => sum + i.total, 0);
    
    activeCustomer.totalSales += totalAmount;
    activeCustomer.transactions.push({
        type: 'sale',
        date: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG'),
        items: [...currentCart],
        amount: totalAmount
    });

    saveData();
    currentCart = [];
    renderCart();
    alert('تم حفظ الدين بنجاح');
    switchTab('tab-reports'); // الذهاب للسجل لرؤية العملية
}

// --- عمليات التسديد ---
function processPayment() {
    const amount = parseFloat(document.getElementById('paymentInput').value);
    if (!amount) return alert('أدخل المبلغ');

    activeCustomer.totalPaid += amount;
    activeCustomer.transactions.push({
        type: 'pay',
        date: new Date().toLocaleDateString('ar-EG'),
        amount: amount
    });

    saveData();
    document.getElementById('paymentInput').value = '';
    alert('تم التسديد');
    switchTab('tab-reports');
}

// --- التحديث والعرض ---
function refreshCustomerViews() {
    if (!activeCustomer) return;
    
    // حساب الدين الحالي
    const currentDebt = activeCustomer.totalSales - activeCustomer.totalPaid;
    document.getElementById('currentDebtDisplay').innerText = currentDebt.toLocaleString();
    
    // تحديث تقرير السجل
    document.getElementById('repSales').innerText = activeCustomer.totalSales.toLocaleString();
    document.getElementById('repPaid').innerText = activeCustomer.totalPaid.toLocaleString();
    document.getElementById('repDebt').innerText = currentDebt.toLocaleString();

    // قائمة العمليات
    const list = document.getElementById('transList');
    list.innerHTML = '';
    // عرض من الأحدث للأقدم
    [...activeCustomer.transactions].reverse().forEach(t => {
        let details = '';
        if (t.type === 'sale') {
            details = `<small>مواد: ${t.items.map(i => i.name).join(', ')}</small>`;
        }
        
        list.innerHTML += `
            <div style="background:white; padding:10px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; color:${t.type === 'sale' ? 'red' : 'green'}">
                    <strong>${t.type === 'sale' ? 'فاتورة دين' : 'تسديد نقدي'}</strong>
                    <span>${t.amount.toLocaleString()}</span>
                </div>
                <div style="font-size:12px; color:#777;">${t.date}</div>
                ${details}
            </div>
        `;
    });
}

function updateGrandTotal() {
    const total = db.customers.reduce((sum, c) => sum + (c.totalSales - c.totalPaid), 0);
    document.getElementById('grandTotalDebt').innerText = total.toLocaleString();
}

function saveData() {
    localStorage.setItem('noorHusseinDB', JSON.stringify(db));
    updateGrandTotal();
}

function printReport() {
    window.print();
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_noor_hussein.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// --- PWA Installer ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-bar').style.display = 'block';
});

document.getElementById('installBtn').addEventListener('click', () => {
    document.getElementById('install-bar').style.display = 'none';
    deferredPrompt.prompt();
});
