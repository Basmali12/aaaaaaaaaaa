// ==========================================
// إعدادات النظام والثوابت
// ==========================================
const ADMIN_PIN = "1972";  // رمز الأدمن
const DELETE_PIN = "121";  // رمز الحذف
let db = JSON.parse(localStorage.getItem('noorHusseinDB')) || { customers: [] };
let activeCustomer = null; // الزبون المحدد حالياً في لوحة الأدمن
let currentCart = [];      // سلة المشتريات الحالية
let targetCustomerId = null; // معرف الزبون القادم من الرابط

// ==========================================
// نقطة البداية (Boot Sequence)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // 1. إخفاء جميع الشاشات كإجراء احترازي أولي
    hideAllScreens();

    // 2. تحليل الرابط لمعرفة نوع المستخدم
    const urlParams = new URLSearchParams(window.location.search);
    const linkedId = urlParams.get('id');

    if (linkedId) {
        // --- مسار الزبون (Client Mode) ---
        targetCustomerId = parseInt(linkedId);
        const customer = db.customers.find(c => c.id === targetCustomerId);
        
        if (customer) {
            // الزبون موجود، ننتقل لشاشة تسجيل دخول الزبون
            document.getElementById('client-welcome-name').innerText = customer.name;
            showScreen('screen-client-login');
        } else {
            // الرابط غير صالح
            alert('عذراً، هذا الرابط غير صالح أو تم حذف حساب الزبون.');
            // تنظيف الرابط في المتصفح والعودة للأدمن
            window.history.replaceState({}, document.title, window.location.pathname);
            showScreen('screen-admin-login');
        }
    } else {
        // --- مسار الأدمن (Admin Mode) ---
        showScreen('screen-admin-login');
    }
}

// دالة التنقل بين الشاشات الرئيسية
function showScreen(screenId) {
    hideAllScreens();
    const screen = document.getElementById(screenId);
    if(screen) {
        screen.classList.add('active-screen');
    }
}

function hideAllScreens() {
    document.querySelectorAll('.app-section').forEach(el => {
        el.classList.remove('active-screen');
    });
}

// ==========================================
// منطق الزبون (Client Logic)
// ==========================================
function checkClientLogin() {
    const pass = document.getElementById('clientPassInput').value;
    const customer = db.customers.find(c => c.id === targetCustomerId);
    
    if (customer && customer.password === pass) {
        showScreen('screen-client-view');
        fillClientViewData(customer);
    } else {
        alert("كلمة المرور غير صحيحة!");
        document.getElementById('clientPassInput').value = '';
    }
}

function fillClientViewData(c) {
    document.getElementById('cvName').innerText = c.name;
    const debt = c.totalSales - c.totalPaid;
    
    document.getElementById('cvSales').innerText = c.totalSales.toLocaleString();
    document.getElementById('cvPaid').innerText = c.totalPaid.toLocaleString();
    document.getElementById('cvDebt').innerText = debt.toLocaleString();

    const list = document.getElementById('cvTransList');
    list.innerHTML = '';
    
    // عرض السجل (للقراءة فقط)
    [...c.transactions].reverse().forEach(t => {
        let details = '';
        if (t.type === 'sale') {
            details = `<div style="font-size:11px; color:#666; margin-top:4px;">${t.items.map(i => i.name).join(' + ')}</div>`;
        }
        
        list.innerHTML += `
            <div style="background:white; padding:12px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:bold; color:${t.type === 'sale' ? '#c0392b' : '#27ae60'}">
                        ${t.type === 'sale' ? '<i class="fas fa-file-invoice"></i> فاتورة' : '<i class="fas fa-money-bill-wave"></i> تسديد'}
                    </div>
                    <div style="font-weight:bold; font-size:1.1rem;">${t.amount.toLocaleString()}</div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                     <div style="font-size:11px; color:#999;">${t.date}</div>
                </div>
                ${details}
            </div>
        `;
    });
}

// ==========================================
// منطق الأدمن (Admin Logic)
// ==========================================
function checkAdminLogin() {
    const pin = document.getElementById('adminPinInput').value;
    if (pin === ADMIN_PIN) {
        showScreen('screen-admin-app');
        
        // تشغيل شاشة الترحيب لمرة واحدة
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 1000);
            }
        }, 1200);
        
        renderCustomerList();
    } else {
        alert("الرمز السري غير صحيح");
        document.getElementById('adminPinInput').value = '';
    }
}

// --- إدارة التبويبات الداخلية للأدمن ---
function switchTab(tabId) {
    // منع دخول صفحات البيع/التسديد/التقارير بدون اختيار زبون
    if ((tabId === 'tab-invoice' || tabId === 'tab-payment' || tabId === 'tab-reports') && !activeCustomer) {
        alert('الرجاء اختيار زبون من القائمة أولاً');
        switchTab('tab-customers');
        return;
    }

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
}

// --- إدارة الزبائن ---
function openAddCustomerModal() { document.getElementById('addCustomerModal').style.display = 'block'; }
function closeAddCustomerModal() { document.getElementById('addCustomerModal').style.display = 'none'; }

function confirmAddCustomer() {
    const name = document.getElementById('newCName').value;
    const phone = document.getElementById('newCPhone').value;
    const pass = document.getElementById('newCPass').value;

    if (!name || !pass) return alert("الاسم وكلمة المرور مطلوبان لإنشاء حساب");

    const newC = {
        id: Date.now(),
        name: name,
        phone: phone,
        password: pass,
        totalSales: 0,
        totalPaid: 0,
        transactions: []
    };

    db.customers.push(newC);
    saveData();
    renderCustomerList();
    
    // تنظيف الحقول
    document.getElementById('newCName').value = '';
    document.getElementById('newCPhone').value = '';
    document.getElementById('newCPass').value = '';
    closeAddCustomerModal();
    
    // اختيار الزبون الجديد تلقائياً
    selectCustomer(newC.id);
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
    
    // توليد رابط المشاركة
    const baseUrl = window.location.href.split('?')[0];
    const uniqueLink = `${baseUrl}?id=${activeCustomer.id}`;
    document.getElementById('customerShareLink').value = uniqueLink;

    refreshAdminViews();
    switchTab('tab-invoice');
}

function clearSelection() {
    activeCustomer = null;
    document.getElementById('headerCustomerName').innerText = 'لم يتم التحديد';
    switchTab('tab-customers');
}

function copyLink() {
    const linkInput = document.getElementById('customerShareLink');
    linkInput.select();
    document.execCommand("copy");
    alert("تم نسخ الرابط! أرسله للزبون.");
}

function deleteCustomer() {
    if (!activeCustomer) return;
    
    const pin = prompt("للحذف النهائي، أدخل الرمز (121):");
    if (pin === DELETE_PIN) {
        db.customers = db.customers.filter(c => c.id !== activeCustomer.id);
        saveData();
        clearSelection();
        alert("تم حذف الزبون وسجلاته نهائياً.");
    } else {
        alert("رمز الحذف خاطئ!");
    }
}

// --- عمليات البيع (السلة) ---
function addItemToCart() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const qty = parseFloat(document.getElementById('itemQty').value);

    if (!name || !price) return; // يجب أن يكون هناك اسم وسعر على الأقل

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
                <td onclick="removeFromCart(${idx})" style="color:red; cursor:pointer; font-weight:bold;">X</td>
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
    if (currentCart.length === 0) return alert('السلة فارغة!');
    
    const totalAmount = currentCart.reduce((sum, i) => sum + i.total, 0);
    
    activeCustomer.totalSales += totalAmount;
    activeCustomer.transactions.push({
        type: 'sale',
        date: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
        items: [...currentCart],
        amount: totalAmount
    });

    saveData();
    currentCart = [];
    renderCart();
    alert('تم حفظ الفاتورة بنجاح');
    switchTab('tab-reports');
    refreshAdminViews();
}

// --- عمليات التسديد ---
function processPayment() {
    const amount = parseFloat(document.getElementById('paymentInput').value);
    if (!amount) return alert('أدخل المبلغ الواصل');

    activeCustomer.totalPaid += amount;
    activeCustomer.transactions.push({
        type: 'pay',
        date: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
        amount: amount
    });

    saveData();
    document.getElementById('paymentInput').value = '';
    alert('تم تسجيل التسديد');
    refreshAdminViews();
}

// --- تحديث واجهة الأدمن ---
function refreshAdminViews() {
    if (!activeCustomer) return;
    
    const currentDebt = activeCustomer.totalSales - activeCustomer.totalPaid;
    document.getElementById('currentDebtDisplay').innerText = currentDebt.toLocaleString();
    
    document.getElementById('repSales').innerText = activeCustomer.totalSales.toLocaleString();
    document.getElementById('repPaid').innerText = activeCustomer.totalPaid.toLocaleString();
    document.getElementById('repDebt').innerText = currentDebt.toLocaleString();
    
    const list = document.getElementById('transList');
    list.innerHTML = '';
    
    [...activeCustomer.transactions].reverse().forEach(t => {
        let details = '';
        if (t.type === 'sale') {
            details = `<div style="font-size:11px; color:#666;">${t.items.map(i => i.name).join(' + ')}</div>`;
        }
        
        list.innerHTML += `
            <div style="background:white; padding:10px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; color:${t.type === 'sale' ? 'red' : 'green'}">
                    <strong>${t.type === 'sale' ? 'فاتورة' : 'تسديد'}</strong>
                    <span>${t.amount.toLocaleString()}</span>
                </div>
                <small style="color:#aaa;">${t.date}</small>
                ${details}
            </div>
        `;
    });
}

function saveData() {
    localStorage.setItem('noorHusseinDB', JSON.stringify(db));
}
