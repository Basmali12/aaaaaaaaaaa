// --- إعدادات النظام ---
const ADMIN_PIN = "1972";
const DELETE_PIN = "121";
let db = JSON.parse(localStorage.getItem('noorHusseinDB')) || { customers: [] };
let activeCustomer = null;
let currentCart = [];
let targetCustomerId = null; // للمستخدم القادم عبر الرابط

// --- تشغيل النظام ---
window.onload = function() {
    // التحقق هل الرابط يحتوي على ID زبون؟
    const urlParams = new URLSearchParams(window.location.search);
    const linkedId = urlParams.get('id');

    if (linkedId) {
        // سيناريو الزبون
        targetCustomerId = parseInt(linkedId);
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('client-login-screen').style.display = 'flex';
    } else {
        // سيناريو الأدمن
        document.getElementById('admin-login-screen').style.display = 'flex';
    }
};

// --- عمليات تسجيل الدخول ---
function checkAdminLogin() {
    const pin = document.getElementById('adminPinInput').value;
    if (pin === ADMIN_PIN) {
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-app-container').style.display = 'block';
        
        // تشغيل الانميشن
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 1000);
        }, 2000);
        
        renderCustomerList();
    } else {
        alert("الرمز خطأ!");
    }
}

function checkClientLogin() {
    const pass = document.getElementById('clientPassInput').value;
    const customer = db.customers.find(c => c.id === targetCustomerId);
    
    if (customer && customer.password === pass) {
        document.getElementById('client-login-screen').style.display = 'none';
        document.getElementById('client-view-container').style.display = 'block';
        renderClientView(customer);
    } else {
        alert("كلمة المرور غير صحيحة أو الرابط تالف");
    }
}

// --- واجهة الزبون (للمشاهدة فقط) ---
function renderClientView(c) {
    document.getElementById('clientViewName').innerText = c.name;
    const debt = c.totalSales - c.totalPaid;
    
    document.getElementById('cvSales').innerText = c.totalSales.toLocaleString();
    document.getElementById('cvPaid').innerText = c.totalPaid.toLocaleString();
    document.getElementById('cvDebt').innerText = debt.toLocaleString();

    const list = document.getElementById('cvTransList');
    list.innerHTML = '';
    
    [...c.transactions].reverse().forEach(t => {
        list.innerHTML += `
            <div style="background:white; padding:10px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; color:${t.type === 'sale' ? 'red' : 'green'}">
                    <strong>${t.type === 'sale' ? 'فاتورة' : 'تسديد'}</strong>
                    <span>${t.amount.toLocaleString()}</span>
                </div>
                <small>${t.date}</small>
            </div>
        `;
    });
}

// --- عمليات الأدمن ---

function openAddCustomerModal() {
    document.getElementById('addCustomerModal').style.display = 'block';
}

function closeAddCustomerModal() {
    document.getElementById('addCustomerModal').style.display = 'none';
}

function confirmAddCustomer() {
    const name = document.getElementById('newCName').value;
    const phone = document.getElementById('newCPhone').value;
    const pass = document.getElementById('newCPass').value;

    if (!name || !pass) return alert("الاسم وكلمة المرور مطلوبان");

    const newC = {
        id: Date.now(),
        name: name,
        phone: phone,
        password: pass, // حفظ كلمة المرور
        totalSales: 0,
        totalPaid: 0,
        transactions: []
    };

    db.customers.push(newC);
    saveData();
    renderCustomerList();
    
    // تنظيف
    document.getElementById('newCName').value = '';
    document.getElementById('newCPhone').value = '';
    document.getElementById('newCPass').value = '';
    closeAddCustomerModal();
    selectCustomer(newC.id);
}

function selectCustomer(id) {
    activeCustomer = db.customers.find(c => c.id === id);
    document.getElementById('headerCustomerName').innerText = activeCustomer.name;
    
    // توليد الرابط الخاص
    const baseUrl = window.location.href.split('?')[0];
    const uniqueLink = `${baseUrl}?id=${activeCustomer.id}`;
    document.getElementById('customerShareLink').value = uniqueLink;

    refreshCustomerViews();
    switchTab('tab-invoice');
}

function copyLink() {
    const linkInput = document.getElementById('customerShareLink');
    linkInput.select();
    document.execCommand("copy");
    alert("تم نسخ الرابط! أرسله للزبون مع كلمة المرور الخاصة به.");
}

function deleteCustomer() {
    if (!activeCustomer) return;
    
    const pin = prompt("تحذير: الحذف نهائي! أدخل الرمز السري للحذف (121):");
    
    if (pin === DELETE_PIN) {
        db.customers = db.customers.filter(c => c.id !== activeCustomer.id);
        saveData();
        alert("تم حذف سجلات الزبون بالكامل.");
        clearSelection();
    } else {
        alert("رمز الحذف خطأ.");
    }
}

// --- الوظائف المساعدة والأساسية (نفس السابقة مع تحديثات بسيطة) ---

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

function clearSelection() {
    activeCustomer = null;
    document.getElementById('headerCustomerName').innerText = 'لم يتم التحديد';
    switchTab('tab-customers');
}

// عمليات السلة
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
        date: new Date().toLocaleDateString('ar-EG'),
        items: [...currentCart],
        amount: totalAmount
    });
    saveData();
    currentCart = [];
    renderCart();
    alert('تم حفظ الفاتورة');
    switchTab('tab-reports');
    refreshCustomerViews();
}

function processPayment() {
    const amount = parseFloat(document.getElementById('paymentInput').value);
    if (!amount) return alert('أدخل المبلغ');
    activeCustomer.totalPaid += amount;
    activeCustomer.transactions.push({ type: 'pay', date: new Date().toLocaleDateString('ar-EG'), amount: amount });
    saveData();
    document.getElementById('paymentInput').value = '';
    alert('تم التسديد');
    refreshCustomerViews();
}

function refreshCustomerViews() {
    if (!activeCustomer) return;
    const currentDebt = activeCustomer.totalSales - activeCustomer.totalPaid;
    document.getElementById('currentDebtDisplay').innerText = currentDebt.toLocaleString();
    document.getElementById('repSales').innerText = activeCustomer.totalSales.toLocaleString();
    document.getElementById('repPaid').innerText = activeCustomer.totalPaid.toLocaleString();
    document.getElementById('repDebt').innerText = currentDebt.toLocaleString();
    
    const list = document.getElementById('transList');
    list.innerHTML = '';
    [...activeCustomer.transactions].reverse().forEach(t => {
        list.innerHTML += `
            <div style="background:white; padding:10px; border-bottom:1px solid #eee; margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; color:${t.type === 'sale' ? 'red' : 'green'}">
                    <strong>${t.type === 'sale' ? 'فاتورة' : 'تسديد'}</strong>
                    <span>${t.amount.toLocaleString()}</span>
                </div>
                <small>${t.date}</small>
            </div>`;
    });
}

function saveData() {
    localStorage.setItem('noorHusseinDB', JSON.stringify(db));
}
