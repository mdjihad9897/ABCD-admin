// Firebase Realtime Database Reference
let db;

document.addEventListener('DOMContentLoaded', () => {
    // নিশ্চিত হওয়া যে Firebase সঠিকভাবে লোড হয়েছে
    if (typeof firebase !== 'undefined') {
        db = firebase.database();
        initLiveListeners();
    } else {
        alert("Firebase initialize করা সম্ভব হয়নি! দয়া করে api.js চেক করুন।");
    }
});

// Admin Global State
const AdminState = {
    products: [],
    categories: [],
    banners: [],
    orders: [],
    messages: [],
    usersCount: 0
};

// ----------------------------------------------------------------------
// FIREBASE LIVE REALTIME SYNC ENGINE (Updated)
// ----------------------------------------------------------------------
function initLiveListeners() {
    // ১. মোট ইউজার কাউন্ট (আগে থেকেই আছে)
    db.ref('users').on('value', snapshot => {
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        AdminState.usersCount = count;
        document.getElementById('stat-users').innerText = count;
    });

    // ২. নতুন: মোট অর্ডার কাউন্ট করার লজিক (এটি যোগ

    // ২. লাইভ প্রোডাক্ট সিঙ্ক
    db.ref('products').on('value', snapshot => {
        AdminState.products = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                AdminState.products.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
        }
        renderInventoryUI();
        renderCategorySelector();
    });

    // ৩. লাইভ ক্যাটাগরি সিঙ্ক
    db.ref('categories').on('value', snapshot => {
        AdminState.categories = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                AdminState.categories.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
        }
        renderCategoriesUI();
        renderCategorySelector();
    });

    // ৪. লাইভ ব্যানার স্লাইডার সিঙ্ক
    db.ref('banners').on('value', snapshot => {
        AdminState.banners = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                AdminState.banners.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
        }
        renderBannersUI();
    });

    // ৫. লাইভ অর্ডার ও স্ট্যাটাস ট্র্যাকিং
    db.ref('orders').on('value', snapshot => {
        AdminState.orders = [];
        let pending = 0, success = 0, cancelled = 0;
        let totalOrders = 0;

        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const order = { id: childSnapshot.key, ...childSnapshot.val() };
                AdminState.orders.push(order);
                totalOrders++;

                if (order.status === 'pending') pending++;
                else if (order.status === 'success') success++;
                else if (order.status === 'cancelled') cancelled++;
            });
            // অর্ডারগুলো নতুন থেকে পুরনো হিসেবে সাজানোর জন্য (Reverse Order)
            AdminState.orders.reverse();
        }

        document.getElementById('stat-orders').innerText = totalOrders;
        document.getElementById('stat-pending').innerText = pending;
        document.getElementById('stat-success').innerText = success;
        document.getElementById('stat-cancelled').innerText = cancelled;

        renderOrdersUI();
    });

    // ৬. লাইভ কাস্টমার মেসেজ সিঙ্ক
    db.ref('messages').on('value', snapshot => {
        AdminState.messages = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                AdminState.messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            AdminState.messages.reverse();
        }
        renderMessagesUI();
    });
}

// ----------------------------------------------------------------------
// WRITE OPERATIONS (DATA ADD)
// ----------------------------------------------------------------------

// প্রোডাক্ট অ্যাড
async function handleProductSubmit(e) {
    e.preventDefault();
    const productData = {
        title: document.getElementById('p-title').value,
        categoryId: document.getElementById('p-category').value,
        price: Number(document.getElementById('p-price').value),
        oldPrice: Number(document.getElementById('p-oldprice').value) || null,
        thumbnail: document.getElementById('p-image').value,
        description: document.getElementById('p-desc').value,
        createdAt: new Date().toISOString()
    };

    try {
        await db.ref('products').push(productData);
        document.getElementById('product-form').reset();
    } catch (err) {
        alert("প্রোডাক্ট যোগ করতে সমস্যা হয়েছে: " + err.message);
    }
}

// ক্যাটাগরি অ্যাড
async function handleCategorySubmit(e) {
    e.preventDefault();
    const catData = {
        name: document.getElementById('cat-name').value,
        icon: document.getElementById('cat-image').value
    };

    try {
        await db.ref('categories').push(catData);
        document.getElementById('category-form').reset();
    } catch (err) {
        alert("ক্যাটাগরি যোগ করতে সমস্যা হয়েছে: " + err.message);
    }
}

// ব্যানার ও লিংক অ্যাড
async function handleBannerSubmit(e) {
    e.preventDefault();
    const bannerData = {
        imageUrl: document.getElementById('banner-url').value,
        link: document.getElementById('banner-link').value,
        createdAt: new Date().toISOString()
    };

    try {
        await db.ref('banners').push(bannerData);
        document.getElementById('banner-form').reset();
    } catch (err) {
        alert("ব্যানার যোগ করতে সমস্যা হয়েছে: " + err.message);
    }
}

// ----------------------------------------------------------------------
// DELETE & UPDATE OPERATIONS
// ----------------------------------------------------------------------
async function deleteProduct(id) {
    if(confirm("প্রোডাক্টটি ডিলিট করতে চান?")) {
        await db.ref('products').child(id).remove();
    }
}

async function deleteCategory(id) {
    if(confirm("ক্যাটাগরি টি ডিলিট করতে চান?")) {
        await db.ref('categories').child(id).remove();
    }
}

async function deleteBanner(id) {
    if(confirm("ব্যানারটি ডিলিট করতে চান?")) {
        await db.ref('banners').child(id).remove();
    }
}

async function updateOrderStatus(orderId, nextStatus) {
    try {
        await db.ref('orders').child(orderId).update({ status: nextStatus });
    } catch (err) {
        alert("স্ট্যাটাস আপডেট ব্যর্থ: " + err.message);
    }
}

// ----------------------------------------------------------------------
// RENDER UI INTEGRATION
// ----------------------------------------------------------------------
function switchAdminTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${tabName}`).classList.add('active');

    const navButtons = document.querySelectorAll('nav button');
    navButtons.forEach(btn => {
        btn.classList.remove('text-slate-900', 'bg-slate-100');
        btn.classList.add('text-slate-400');
    });

    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-slate-900', 'bg-slate-100');
}

function renderCategorySelector() {
    const select = document.getElementById('p-category');
    select.innerHTML = `<option value="">ক্যাটাগরি সিলেক্ট করুন</option>` + 
        AdminState.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderInventoryUI() {
    const pList = document.getElementById('admin-products-list');
    if(!AdminState.products.length) { pList.innerHTML = `<p class='text-center py-4 text-slate-400 text-xs'>কোনো প্রোডাক্ট নেই।</p>`; return; }
    
    pList.innerHTML = AdminState.products.map(p => `
        <div class="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
            <div class="flex items-center gap-2">
                <img src="${p.thumbnail}" class="w-8 h-8 rounded-lg object-cover bg-slate-200">
                <div>
                    <h4 class="font-bold text-slate-800 line-clamp-1">${p.title}</h4>
                    <p class="text-emerald-600 font-bold">৳${p.price}</p>
                </div>
            </div>
            <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');
}

function renderCategoriesUI() {
    const cList = document.getElementById('admin-categories-list');
    if(!AdminState.categories.length) { cList.innerHTML = `<p class='text-center py-4 text-slate-400 text-xs'>কোনো ক্যাটাগরি নেই।</p>`; return; }

    cList.innerHTML = AdminState.categories.map(c => `
        <div class="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
            <div class="flex items-center gap-2">
                <img src="${c.icon}" class="w-8 h-8 rounded-full object-cover bg-slate-200">
                <span class="font-bold text-slate-800">${c.name}</span>
            </div>
            <button onclick="deleteCategory('${c.id}')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');
}

function renderBannersUI() {
    const bList = document.getElementById('admin-banners-list');
    if(!AdminState.banners.length) { bList.innerHTML = `<p class='text-slate-400 text-xs col-span-2 text-center py-4'>কোনো ব্যানার নেই</p>`; return; }

    bList.innerHTML = AdminState.banners.map(b => `
        <div class="relative rounded-xl overflow-hidden border bg-white shadow-sm">
            <img src="${b.imageUrl}" class="w-full h-20 object-cover">
            <div class="p-1 bg-slate-900 text-white text-[10px] truncate">লিংক: ${b.link}</div>
            <button onclick="deleteBanner('${b.id}')" class="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>
    `).join('');
}

function renderOrdersUI() {
    const oList = document.getElementById('admin-orders-list');
    if(!AdminState.orders.length) { oList.innerHTML = `<p class='text-center text-slate-400 py-6 text-xs'>এখনো কোনো অর্ডার আসেনি।</p>`; return; }

    oList.innerHTML = AdminState.orders.map(o => {
        let statusBadge = `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>`;
        if (o.status === 'success') statusBadge = `<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Success</span>`;
        if (o.status === 'cancelled') statusBadge = `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Cancelled</span>`;

        return `
            <div class="bg-slate-50 border p-3 rounded-2xl space-y-2 text-xs">
                <div class="flex justify-between items-center border-b pb-1">
                    <span class="font-mono text-slate-500 text-[10px]">ID: ${o.id.substring(0,8)}...</span>
                    ${statusBadge}
                </div>
                <div class="space-y-1">
                    <p class="text-slate-800"><b class="text-slate-500">নাম:</b> ${o.userName || 'Unknown'}</p>
                    <p class="text-slate-800"><b class="text-slate-500">ফোন:</b> <span class="font-mono">${o.userPhone || 'N/A'}</span></p>
                    <p class="text-slate-800"><b class="text-slate-500">ঠিকানা:</b> ${o.address || 'N/A'}</p>
                    <p class="text-amber-600 font-bold"><b class="text-slate-500">মোট বিল:</b> ৳${o.totalAmount || 0}</p>
                </div>
                
                ${o.status === 'pending' ? `
                <div class="flex gap-2 pt-1">
                    <button onclick="updateOrderStatus('${o.id}', 'success')" class="flex-1 bg-emerald-600 text-white py-1.5 rounded-lg font-bold hover:bg-emerald-700"><i class="fa-solid fa-check mr-1"></i> সাকসেস</button>
                    <button onclick="updateOrderStatus('${o.id}', 'cancelled')" class="flex-1 bg-red-600 text-white py-1.5 rounded-lg font-bold hover:bg-red-700"><i class="fa-solid fa-xmark mr-1"></i> ক্যানসেল</button>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderMessagesUI() {
    const mList = document.getElementById('admin-messages-list');
    if(!AdminState.messages.length) { mList.innerHTML = `<p class='text-center text-slate-400 py-6 text-xs'>কোনো লাইভ মেসেজ নেই।</p>`; return; }

    mList.innerHTML = AdminState.messages.map(m => `
        <div class="bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <div class="flex justify-between font-bold text-slate-700 mb-1">
                <span><i class="fa-solid fa-user text-slate-400 mr-1"></i> ${m.senderName || 'কাস্টমার'} (${m.senderPhone || ''})</span>
            </div>
            <p class="text-slate-600 bg-slate-50 p-2 rounded-lg">${m.text || ''}</p>
        </div>
    `).join('');
}