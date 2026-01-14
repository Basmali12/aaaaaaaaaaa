// قاعدة بيانات محلية بسيطة
let db = JSON.parse(localStorage.getItem('debtAppDB')) || { customers: [] };
let currentCustomer = null;
let currentCart = [];

// البحث عن زبون أو انشائه
function searchCustomer() {
    const name = document.getElementById('customerName').value.trim();
    if (!name) return alert('الرجاء كتابة اسم الزبون');

    let customer = db.customers.find(c => c.name === name);
    
    if (!customer) {
        if(confirm('الزبون غير موجود، هل تريد إنشاء ملف جديد له؟')) {
            customer = {
                id: Date.now(),
                name: name,
                phone: document.getElementById('customerPhone').value,
                alt: document.getElementById('customerAlt').value,
                totalSales: 0,
                totalPaid: 0,
                transactions: []
            };
            db.customers.push(customer);
            saveData();
        } else {
            return;
        }
    }
    
    loadCustomer(customer);
}

function loadCustomer(customer) {
    currentCustomer = customer;
    document.getElementById('customerId').value = customer.id;
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerPhone').value = customer.phone;
    document.getElementById('customerAlt').value = customer.alt;
    
    updateTotals();
    // تفريغ السلة الحالية عند تغيير الزبون
    currentCart = []; 
    renderCart();
}

// إضافة مادة للفاتورة المؤقتة
function addItem() {
    const item = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const qty = parseFloat(document.getElementById('itemQty').value);

    if (!item || !price || !qty) return alert('أدخل بيانات المادة');

    currentCart.push({ item, price, qty, total: price * qty });
    
    // مسح الحقول
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    
    renderCart();
}

function renderCart() {
    const tbody = document.querySelector('#invoiceTable tbody');
    tbody.innerHTML = '';
    
    currentCart.forEach((row, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${row.item}</td>
                <td>${row.price}</td>
                <td>${row.qty}</td>
                <td>${row.total}</td>
                <td><button onclick="removeFromCart(${index})" style="background:red; padding:2px 8px;">X</button></td>
            </tr>
        `;
    });
}

function removeFromCart(index) {
    currentCart.splice(index, 1);
    renderCart();
}

// حفظ الفاتورة (إضافة دين)
function saveInvoice() {
    if (!currentCustomer) return alert('اختر زبوناً أولاً');
    if (currentCart.length === 0) return alert('السلة فارغة');

    const invoiceTotal = currentCart.reduce((sum, item) => sum + item.total, 0);
    
    currentCustomer.totalSales += invoiceTotal;
    currentCustomer.transactions.push({
        type: 'sale',
        date: new Date().toLocaleDateString(),
        items: [...currentCart],
        amount: invoiceTotal
    });

    saveData();
    updateTotals();
    currentCart = [];
    renderCart();
    alert('تم حفظ الفاتورة وإضافتها للدين');
}

// نافذة التسديد
function openPaymentModal() {
    if (!currentCustomer) return alert('اختر زبوناً أولاً');
    document.getElementById('paymentModal').style.display = 'block';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function submitPayment() {
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    if (!amount || amount <= 0) return alert('أدخل مبلغ صحيح');

    currentCustomer.totalPaid += amount;
    currentCustomer.transactions.push({
        type: 'payment',
        date: new Date().toLocaleDateString(),
        amount: amount
    });

    saveData();
    updateTotals();
    closePaymentModal();
    alert('تم تسديد المبلغ بنجاح');
}

// تحديث الأرقام
function updateTotals() {
    if (!currentCustomer) return;
    
    document.getElementById('totalSales').value = currentCustomer.totalSales;
    document.getElementById('totalPaid').value = currentCustomer.totalPaid;
    
    const debt = currentCustomer.totalSales - currentCustomer.totalPaid;
    document.getElementById('totalDebt').value = debt;
}

// حذف الزبون
function deleteCurrentCustomer() {
    if (!currentCustomer) return;
    if (confirm('هل أنت متأكد من حذف هذا الزبون وجميع ديونه؟ لا يمكن التراجع!')) {
        db.customers = db.customers.filter(c => c.id !== currentCustomer.id);
        saveData();
        clearForm();
        alert('تم الحذف');
    }
}

function clearForm() {
    currentCustomer = null;
    currentCart = [];
    document.querySelectorAll('input').forEach(i => i.value = '');
    renderCart();
}

function showInfo() {
    alert('نظام إدارة الديون - الإصدار 1.0\nمطور للتجربة والاستخدام الشخصي.');
}

function printStatement() {
    if (!currentCustomer) return alert('اختر زبون لطباعته');
    window.print();
}

function saveData() {
    localStorage.setItem('debtAppDB', JSON.stringify(db));
}

// PWA Install Logic
let deferredPrompt;
const installBox = document.getElementById('install-container');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBox.style.display = 'block';
});

installBtn.addEventListener('click', (e) => {
    installBox.style.display = 'none';
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
    });
});
