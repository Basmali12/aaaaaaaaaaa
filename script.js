// --- إعدادات النظام ---
const ADMIN_PIN = "1972";
const DELETE_PIN = "121";
let db = JSON.parse(localStorage.getItem('noorHusseinDB')) || { customers: [] };
let activeCustomer = null;
let currentCart = [];
let targetCustomerId = null; 

// --- نقطة البداية (Routing) ---
window.onload = function() {
    // نتحقق من وجود ID في الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const linkedId = urlParams.get('id');

    // إخفاء جميع الشاشات أولاً
    document.getElementById('admin-login-screen').style.display = 'none';
    document.getElementById('client-login-screen').style.display = 'none';
    document.getElementById('client-view-container').style.display = 'none';
    document.getElementById('admin-app-container').style.display = 'none';

    if (linkedId) {
        // --- وضع الزبون ---
        targetCustomerId = parseInt(linkedId);
        // التحقق من وجود الزبون فعلياً
        const exists = db.customers.find(c => c.id === targetCustomerId);
        if(exists) {
            document.getElementById('client-login-screen').style.display = 'flex';
            document.getElementById('client-welcome-name').innerText = exists.name;
        } else {
            alert('الرابط غير صالح أو تم حذف الحساب');
            // تحويل للأدمن في حال الخطأ
            document.getElementById('admin-login-screen').style.display = 'flex';
        }
    } else {
        // --- وضع الأدمن ---
        document.getElementById('admin-login-screen').style.display = 'flex';
    }
};

// --- منطق الزبون (Client Logic) ---
function checkClientLogin() {
    const pass = document.getElementById('clientPassInput').value;
    const customer = db.customers.find(c => c.id === targetCustomerId);
    
    if (customer && customer.password === pass) {
        document.getElementById('client-login-screen').style.display = 'none';
        document.getElementById('client-view-container').style.display = 'block';
        
        // تعبئة البيانات في واجهة المشاهدة فقط
        fillClientViewData(customer);
    } else {
        alert("كلمة المرور غير صحيحة");
    }
}

function fillClientViewData(c) {
    document.getElementById('cvName').innerText = c.name;
    const debt = c.totalSales - c.totalPaid;
    
    document.getElementById('cvSales').innerText = c.totalSales.toLocaleString();
    document.getElementById('cvPaid').innerText = c.totalPaid.toLocaleString();
    document.getElementById('cvDebt').innerText = debt.toLocaleString();

    const list = document.getElementById('cvTransList');
    list.innerHTML = ''; // تفريغ
    
    // استخدام نفس تنسيق السجل ولكن للعرض فقط
    [...c.transactions].reverse().forEach(t => {
        let details = '';
        if (t.type === 'sale') {
            details = `<div style="font-size:11px; color:#555; margin-top:3px;">${t.items.map(i => i.name + ' (' + i.qty + ')').join(' - ')}</div>`;
        }
        
        list.innerHTML += `
            <div style="background:white; padding:12px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column;">
                        <strong style="color:${t.type === 'sale' ? '#c0392b' : '#27ae60'}">
                            ${t.type === 'sale' ? '<i class="fas fa-shopping-bag"></i> فاتورة' : '<i class="fas fa-money-bill-wave"></i> تسديد'}
                        </strong>
                        <small style="color:#999;">${t.date}</small>
                    </div>
                    <span style="font-weight:bold; font-size:1.1rem;">${t.amount.toLocaleString()}</span>
                </div>
                ${details}
            </div>
        `;
    });
}


// --- منطق الأدمن (Admin Logic) ---
function checkAdminLogin() {
    const pin = document.getElementById('adminPinInput').value;
    if (pin === ADMIN_PIN) {
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-app-container').style.display = 'block';
        
        // تشغيل شاشة الترحيب
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 1000);
        }, 1500);
        
        renderCustomerList();
    } else {
        alert("الرمز خطأ!");
    }
}

// ... (باقي دوال الأدمن كما هي) ...

function switchTab(tabId) {
    if ((tabId === 'tab-invoice' || tabId === 'tab-payment' || tabId === 'tab-reports') && !activeCustomer) {
        alert('اختر زبون أولاً');
        switchTab('tab-customers');
        return;
    }
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
}

function openAddCustomerModal() { document.getElementById('addCustomerModal').style.display = 'block'; }
function closeAddCustomerModal() { document.getElementById('addCustomerModal').style.display = 'none'; }

function confirmAddCustomer() {
    const name = document.getElementById('newCName').value;
    const phone = document.getElementById('newCPhone').value;
    const pass = document.getElementById('newCPass').value;

    if (!name || !pass) return alert("الاسم وكلمة المرور مطلوبان");

    const newC = {
        id: Date.now(),
        name: name,
        phone: phone,
        password: pass, 
        totalSales: 0, totalPaid: 0, transactions: []
    };

    db.customers.push(newC);
    saveData();
    renderCustomerList();
    document.getElementById('newCName').value = '';
    document.getElementById('newCPass').value = '';
    closeAddCustomerModal();
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

function filterCustomers() { renderCustomerList(document.getElementById('customerSearchInput').value); }

function selectCustomer(id) {
    activeCustomer = db.customers.find(c => c.id === id);
    document.getElementById('headerCustomerName').innerText = activeCustomer.name;
    
    // إنشاء الرابط
    const baseUrl = window.location.href.split('?')[0];
    const uniqueLink = `${baseUrl}?id=${activeCustomer.id}`;
    document.getElementById('customerShareLink').value = uniqueLink;

    refreshAdminViews(); // تحديث شاشات الأدمن
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
    alert("تم النسخ!");
}

function deleteCustomer() {
    if (!activeCustomer) return;
    const pin = prompt("للحذف النهائي أدخل الرمز (121):");
    if (pin === DELETE_PIN) {
        db.customers = db.customers.filter(c => c.id !== activeCustomer.id);
        saveData();
        alert("تم الحذف.");
        clearSelection();
    } else {
        alert("الرمز خطأ.");
    }
}

// Cart & Invoice
function addItemToCart() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const qty = parseFloat(document.getElementById('itemQty').value);
    if (!name || !price) return;
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
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.price}</td><td>${item.qty}</td><td onclick="removeFromCart(${idx})" style="color:red;cursor:pointer">X</td></tr>`;
    });
    document.getElementById('cartTotal').innerText = total.toLocaleString();
}

function removeFromCart(idx) { currentCart.splice(idx, 1); renderCart(); }

function saveInvoice() {
    if (currentCart.length === 0) return alert('السلة فارغة');
    const totalAmount = currentCart.reduce((sum, i) => sum + i.total, 0);
    activeCustomer.totalSales += totalAmount;
    activeCustomer.transactions.push({
        type: 'sale',
        date: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
        items: [...currentCart],
        amount: totalAmount
    });
    saveData();
    currentCart = [];
    renderCart();
    alert('تم الحفظ');
    switchTab('tab-reports');
    refreshAdminViews();
}

function processPayment() {
    const amount = parseFloat(document.getElementById('paymentInput').value);
    if (!amount) return alert('أدخل المبلغ');
    activeCustomer.totalPaid += amount;
    activeCustomer.transactions.push({ 
        type: 'pay', 
        date: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}), 
        amount: amount 
    });
    saveData();
    document.getElementById('paymentInput').value = '';
    alert('تم التسديد');
    refreshAdminViews();
}

// تحديث شاشات الأدمن (يختلف عن الزبون)
function refreshAdminViews() {
    if (!activeCustomer) return;
    const currentDebt = activeCustomer.totalSales - activeCustomer.totalPaid;
    document.getElementById('currentDebtDisplay').innerText = currentDebt.toLocaleString();
    
    // تقرير الأدمن
    document.getElementById('repSales').innerText = activeCustomer.totalSales.toLocaleString();
    document.getElementById('repPaid').innerText = activeCustomer.totalPaid.toLocaleString();
    document.getElementById('repDebt').innerText = currentDebt.toLocaleString();
    
    const list = document.getElementById('transList');
    list.innerHTML = '';
    [...activeCustomer.transactions].reverse().forEach(t => {
         let details = '';
        if (t.type === 'sale') {
            details = `<div style="font-size:11px; color:#555;">${t.items.map(i => i.name).join(' - ')}</div>`;
        }
        list.innerHTML += `
            <div style="background:white; padding:10px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; color:${t.type === 'sale' ? 'red' : 'green'}">
                    <strong>${t.type === 'sale' ? 'فاتورة' : 'تسديد'}</strong>
                    <span>${t.amount.toLocaleString()}</span>
                </div>
                <small>${t.date}</small>
                ${details}
            </div>`;
    });
}

function saveData() { localStorage.setItem('noorHusseinDB', JSON.stringify(db)); }
