
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzlcqQtsqEl8kg-sopXOXa165kp7KUslTf-I8mcWxJTRQQmqfYIj6FxtyKCT1uhXeON/exec';

// --- 狀態管理 ---
let state = {
    view: 'HOME', // HOME, SHOP, DETAIL, LOGIN, MEMBER, CHECKOUT, SUCCESS
    products: [],
    cart: JSON.parse(localStorage.getItem('bhg_cart')) || [],
    user: JSON.parse(localStorage.getItem('bhg_user')) || null,
    selectedProduct: null,
    isLoading: false,
    authMode: 'LOGIN',
    modalQuantity: 1,
    isCartOpen: false,
    memberTab: 'PROFILE', // PROFILE, ORDERS, ADMIN_MEMBERS
    orders: [],
    allMembers: [],
    isSubmitting: false,
    filterStatus: '全部'
};

// --- 工具與格式化 ---
const formatPrice = (p) => `NT$ ${Number(p).toLocaleString()}`;
const formatDate = (d) => d ? d.toString().split(' ')[0].split('T')[0] : '';
const formatPhone = (p) => {
    if (!p) return '';
    let s = p.toString().replace(/[']/g, '');
    return (s.length === 9 && !s.startsWith('0')) ? '0' + s : s;
};

const getStableImageUrl = (url) => {
    if (!url || typeof url !== 'string') return 'https://placehold.co/600x600?text=BHG';
    const match = url.match(/\/file\/d\/([^\/\\\?#]+)/) || url.match(/id=([^\/\\\?#&]+)/);
    return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000` : url;
};

// --- API 核心 ---
async function apiPost(action, data) {
    try {
        const res = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action, data }) });
        return await res.json();
    } catch (e) {
        console.error("API Error", e);
        return { status: 'error', message: '連線失敗' };
    }
}

async function fetchProducts() {
    state.isLoading = true; render();
    try {
        const res = await fetch(`${GAS_API_URL}?action=getProducts&t=${Date.now()}`);
        const result = await res.json();
        if (result.status === 'success') state.products = result.data;
    } catch (e) { console.error(e); }
    state.isLoading = false; render();
}

async function fetchMemberData() {
    if (!state.user) return;
    if (state.memberTab === 'ORDERS') {
        const res = await apiPost('getOrders', { m_id: state.user.m_id, m_level: state.user.m_level });
        if (res.status === 'success') state.orders = res.data;
    } else if (state.memberTab === 'ADMIN_MEMBERS' && state.user.m_level === 'Admin') {
        const res = await apiPost('getAllMembers', { m_level: state.user.m_level });
        if (res.status === 'success') state.allMembers = res.data;
    }
    render();
}

// --- 事件處理器 (全域掛載) ---
window.setView = (v, params = null) => {
    state.view = v;
    if (params) state.selectedProduct = params;
    window.scrollTo(0,0);
    render();
};

window.toggleCart = (open) => {
    state.isCartOpen = open;
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (open) {
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        drawer.classList.add('translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
    }
    renderCart();
};

window.openModal = (productId) => {
    state.selectedProduct = state.products.find(p => p.p_id === productId);
    state.modalQuantity = 1;
    document.getElementById('quantity-modal').classList.remove('hidden');
    renderModal();
};

window.closeModal = () => document.getElementById('quantity-modal').classList.add('hidden');

window.updateModalQty = (d) => {
    state.modalQuantity = Math.max(1, state.modalQuantity + d);
    document.getElementById('modal-qty-display').innerText = state.modalQuantity;
};

window.addToCart = (productId, qty) => {
    const product = state.products.find(p => p.p_id === productId);
    const existing = state.cart.find(i => i.p_id === productId);
    if (existing) existing.quantity += qty;
    else state.cart.push({ ...product, quantity: qty });
    
    localStorage.setItem('bhg_cart', JSON.stringify(state.cart));
    closeModal();
    renderNavbar();
    toggleCart(true);
};

window.handleLogout = () => {
    state.user = null;
    localStorage.removeItem('bhg_user');
    setView('HOME');
};

window.setMemberTab = (tab) => {
    state.memberTab = tab;
    fetchMemberData();
};

window.handleCheckout = async () => {
    const addr = document.getElementById('checkout-addr').value;
    if (!addr.trim()) return alert("請填寫收件地址");
    state.isSubmitting = true; render();
    const res = await apiPost('createOrder', {
        m_id: state.user.m_id,
        o_items: state.cart,
        o_total: state.cart.reduce((a, b) => a + (Number(b.p_price) * b.quantity), 0),
        o_shipping_addr: addr
    });
    if (res.status === 'success') {
        state.cart = [];
        localStorage.removeItem('bhg_cart');
        setView('SUCCESS');
        fetchProducts();
    } else alert(res.message);
    state.isSubmitting = false; render();
};

// --- 渲染引擎 ---
function renderNavbar() {
    const nav = document.getElementById('navbar');
    const count = state.cart.reduce((a, b) => a + b.quantity, 0);
    nav.innerHTML = `
        <h1 class="text-2xl font-serif font-black botanical-green cursor-pointer tracking-tighter" onclick="setView('HOME')">BAO HONG GIRL</h1>
        <div class="flex items-center gap-8">
            <button onclick="setView('SHOP')" class="text-xs font-black text-gray-400 hover:text-botanical-green transition-colors uppercase tracking-[0.2em]">全系列產品</button>
            <button onclick="setView('${state.user ? 'MEMBER' : 'LOGIN'}')" class="text-xs font-black text-gray-400 hover:text-botanical-green transition-colors uppercase tracking-[0.2em]">
                ${state.user ? state.user.m_name : '會員專區'}
            </button>
            <button onclick="toggleCart(true)" class="relative bg-gray-50 p-3 rounded-2xl hover:bg-gray-100 transition-all border border-gray-100">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                ${count > 0 ? `<span class="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold ring-4 ring-white">${count}</span>` : ''}
            </button>
        </div>
    `;
}

function renderCart() {
    const drawer = document.getElementById('cart-drawer');
    const total = state.cart.reduce((a, b) => a + (Number(b.p_price) * b.quantity), 0);
    drawer.innerHTML = `
        <div class="flex flex-col h-full">
            <div class="p-8 border-b border-gray-100 flex justify-between items-center">
                <h2 class="text-2xl font-serif font-bold">我的購物袋</h2>
                <button onclick="toggleCart(false)" class="p-2 text-gray-400">✕</button>
            </div>
            <div class="flex-1 overflow-y-auto p-8 space-y-6">
                ${state.cart.length === 0 ? '<p class="text-center text-gray-400 italic py-20">購物袋是空的</p>' : 
                    state.cart.map(item => `
                    <div class="flex gap-4">
                        <img src="${getStableImageUrl(item.p_image)}" class="w-20 h-20 object-cover rounded-xl bg-gray-50" />
                        <div class="flex-1">
                            <h4 class="font-bold text-sm">${item.p_name}</h4>
                            <p class="text-xs text-gray-400">數量: ${item.quantity}</p>
                            <p class="text-botanical-green font-black text-sm">${formatPrice(Number(item.p_price) * item.quantity)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="p-8 border-t border-gray-100">
                <div class="flex justify-between items-center mb-6">
                    <span class="text-gray-400 font-bold uppercase text-[10px] tracking-widest">總計金額</span>
                    <span class="text-2xl font-serif font-bold botanical-green">${formatPrice(total)}</span>
                </div>
                <button onclick="state.user ? setView('CHECKOUT') : setView('LOGIN')" class="w-full bg-botanical-green text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50" ${state.cart.length === 0 ? 'disabled' : ''}>立即結帳</button>
            </div>
        </div>
    `;
}

function renderModal() {
    const modal = document.getElementById('quantity-modal');
    if (!state.selectedProduct) return;
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50 backdrop-blur-md" onclick="closeModal()"></div>
        <div class="relative bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 class="text-2xl font-serif font-bold mb-2 text-center">${state.selectedProduct.p_name}</h3>
            <p class="text-botanical-green font-black mb-8 text-center text-lg">${formatPrice(state.selectedProduct.p_price)}</p>
            <div class="flex items-center justify-between bg-gray-50 rounded-3xl p-2 mb-8 border border-gray-100">
                <button onclick="updateModalQty(-1)" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm hover:bg-gray-100 transition-colors text-xl font-bold">-</button>
                <span id="modal-qty-display" class="w-20 text-center text-2xl font-black">${state.modalQuantity}</span>
                <button onclick="updateModalQty(1)" class="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm hover:bg-gray-100 transition-colors text-xl font-bold">+</button>
            </div>
            <button onclick="addToCart('${state.selectedProduct.p_id}', state.modalQuantity)" class="w-full bg-botanical-green text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl">確認加入購物袋</button>
        </div>
    `;
}

function render() {
    renderNavbar();
    const content = document.getElementById('main-content');
    
    if (state.isLoading) {
        content.innerHTML = `<div class="min-h-[70vh] flex flex-col items-center justify-center gap-8"><div class="w-20 h-20 border-4 border-gray-100 border-t-botanical-green rounded-full animate-spin"></div><p class="text-botanical-green font-black uppercase text-[11px] tracking-[0.5em]">Syncing Boutique...</p></div>`;
        return;
    }

    switch (state.view) {
        case 'HOME':
            content.innerHTML = `
                <header class="py-24 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <span class="text-[11px] font-black botanical-green uppercase tracking-[0.6em] mb-4 block">Superior Health Care</span>
                    <h2 class="text-7xl md:text-9xl font-serif font-bold botanical-green mb-10 tracking-tighter leading-none">優雅與純粹<br/>的並存</h2>
                    <p class="text-gray-400 text-lg leading-loose mb-16 max-w-2xl mx-auto font-medium">專為現代女性打造，從大自然中汲取靈感，為您的每一天注入純淨活力。</p>
                    <button onclick="setView('SHOP')" class="bg-botanical-green text-white px-16 py-6 rounded-full font-black text-xs shadow-2xl transition-all hover:scale-105">探索系列產品</button>
                </header>
            `;
            break;
        case 'SHOP':
            content.innerHTML = `
                <div class="animate-in fade-in duration-800">
                    <h2 class="text-4xl font-serif font-bold tracking-tight mb-8">Boutique Collection</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                        ${state.products.map(p => `
                            <div class="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-50 hover:shadow-2xl transition-all p-8 flex flex-col">
                                <div class="relative overflow-hidden rounded-[1.5rem] mb-6 aspect-square">
                                    <img src="${getStableImageUrl(p.p_image)}" class="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-700" onclick="setView('DETAIL', ${JSON.stringify(p).replace(/"/g, '&quot;')})" />
                                    ${Number(p.p_stock) <= 0 ? '<div class="absolute inset-0 bg-white/60 flex items-center justify-center"><span class="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 bg-white px-4 py-2 rounded-full border">已售罄 Sold Out</span></div>' : ''}
                                </div>
                                <h4 class="font-bold text-lg mb-2">${p.p_name}</h4>
                                <p class="text-xs text-gray-400 mb-6 line-clamp-2">${p.p_desc || '頂級草本精華，為您帶來全方位呵護。'}</p>
                                <div class="flex justify-between items-center mt-auto">
                                    <span class="font-black text-xl">${formatPrice(p.p_price)}</span>
                                    <button onclick="openModal('${p.p_id}')" class="bg-botanical-green text-white p-4 rounded-xl shadow-xl transition-all hover:scale-110" ${Number(p.p_stock) <= 0 ? 'disabled' : ''}>
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
        case 'DETAIL':
            const p = state.selectedProduct;
            content.innerHTML = `
                <div class="py-12 animate-in fade-in duration-800">
                    <button onclick="setView('SHOP')" class="mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 hover:text-botanical-green flex items-center gap-2 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                        返回商品清單
                    </button>
                    <div class="flex flex-col lg:flex-row gap-20">
                        <div class="w-full lg:w-1/2"><img src="${getStableImageUrl(p.p_image)}" class="w-full aspect-square object-cover rounded-[4rem] shadow-2xl bg-white" /></div>
                        <div class="flex-1 flex flex-col justify-center">
                            <div class="flex items-center gap-4 mb-4"><span class="text-[13px] font-black botanical-green uppercase tracking-[0.5em]">${p.p_category || '純淨護理'}</span></div>
                            <h1 class="text-6xl font-serif font-bold mb-8 leading-[1.1] tracking-tighter">${p.p_name}</h1>
                            <p class="text-4xl font-black botanical-green mb-12">${formatPrice(p.p_price)}</p>
                            <div class="space-y-8 mb-12">
                                <div><h5 class="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">商品簡介</h5><p class="text-gray-500 leading-relaxed">${p.p_desc || '無提供描述'}</p></div>
                                <div><h5 class="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">成分說明</h5><p class="text-gray-500 text-sm leading-relaxed">${p.p_ingredients || '天然植物萃取精華'}</p></div>
                            </div>
                            <button onclick="openModal('${p.p_id}')" class="w-full bg-botanical-green text-white py-8 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:scale-[1.02] transition-all" ${Number(p.p_stock) <= 0 ? 'disabled' : ''}>
                                ${Number(p.p_stock) > 0 ? '立即加入購物袋' : '暫無庫存'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'LOGIN':
            content.innerHTML = `
                <div class="max-w-md mx-auto py-12 animate-in fade-in zoom-in-95 duration-700">
                    <div class="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-gray-50">
                        <header class="text-center mb-12">
                            <span class="text-[11px] font-black botanical-green uppercase tracking-[0.5em] mb-4 block">Boutique Access</span>
                            <h2 class="text-4xl font-serif font-bold">歡迎歸來</h2>
                        </header>
                        <form id="login-form" class="space-y-6">
                            <div><label class="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">電子郵件 Email</label><input type="email" id="login-email" required class="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none" /></div>
                            <div><label class="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">密碼 Password</label><input type="password" id="login-pwd" required class="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none" /></div>
                            <button type="submit" class="w-full bg-botanical-green text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">登入帳戶</button>
                        </form>
                    </div>
                </div>
            `;
            document.getElementById('login-form').onsubmit = async (e) => {
                e.preventDefault();
                state.isLoading = true; render();
                const res = await apiPost('loginMember', { m_email: document.getElementById('login-email').value, m_password: document.getElementById('login-pwd').value });
                if (res.status === 'success') {
                    state.user = res.data;
                    localStorage.setItem('bhg_user', JSON.stringify(res.data));
                    setView('SHOP');
                } else alert(res.message);
                state.isLoading = false; render();
            };
            break;
        case 'MEMBER':
            content.innerHTML = `
                <div class="max-w-6xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div class="flex flex-col lg:flex-row gap-8">
                        <div class="lg:w-64 space-y-2">
                            <button onclick="setMemberTab('PROFILE')" class="w-full text-left px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${state.memberTab === 'PROFILE' ? 'bg-botanical-green text-white shadow-xl' : 'text-gray-400 hover:bg-white'}">個人基本資料</button>
                            <button onclick="setMemberTab('ORDERS')" class="w-full text-left px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${state.memberTab === 'ORDERS' ? 'bg-botanical-green text-white shadow-xl' : 'text-gray-400 hover:bg-white'}">
                                ${state.user.m_level === 'Admin' ? '全站訂單管理' : '歷史訂單紀錄'}
                            </button>
                            ${state.user.m_level === 'Admin' ? `<button onclick="setMemberTab('ADMIN_MEMBERS')" class="w-full text-left px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${state.memberTab === 'ADMIN_MEMBERS' ? 'bg-botanical-green text-white shadow-xl' : 'text-gray-400 hover:bg-white'}">會員名單管理</button>` : ''}
                            <button onclick="handleLogout()" class="w-full text-left px-8 py-4 text-[11px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors mt-8">安全登出帳戶</button>
                        </div>
                        <div class="flex-1 bg-white rounded-[3rem] p-8 md:p-16 shadow-2xl border border-gray-50 min-h-[600px]">
                            ${renderMemberTabContent()}
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'CHECKOUT':
            content.innerHTML = `
                <div class="max-w-4xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700">
                    <div class="bg-white rounded-[3rem] p-10 md:p-20 shadow-2xl border border-gray-50">
                        <h2 class="text-5xl font-serif font-bold mb-12 tracking-tight">結帳確認</h2>
                        <div class="space-y-8 mb-16">
                            ${state.cart.map(item => `<div class="flex justify-between items-center text-sm font-bold"><span>${item.p_name} x ${item.quantity}</span><span>${formatPrice(Number(item.p_price) * item.quantity)}</span></div>`).join('')}
                            <div class="pt-8 border-t border-gray-100 flex justify-between items-end">
                                <span class="text-gray-400 uppercase text-[10px] font-black tracking-widest">總計金額</span>
                                <span class="text-3xl font-serif font-bold botanical-green">${formatPrice(state.cart.reduce((a, b) => a + (Number(b.p_price) * b.quantity), 0))}</span>
                            </div>
                        </div>
                        <div class="space-y-8">
                            <label class="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block">收件地址 Shipping Address</label>
                            <textarea id="checkout-addr" required class="w-full bg-gray-50 border-none rounded-3xl p-6 outline-none min-h-[120px] text-lg font-medium">${state.user.m_address || ''}</textarea>
                        </div>
                        <button onclick="handleCheckout()" class="w-full bg-botanical-green text-white py-8 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl mt-16 disabled:bg-gray-200">
                            ${state.isSubmitting ? '正在處理中...' : '確認下單'}
                        </button>
                    </div>
                </div>
            `;
            break;
        case 'SUCCESS':
            content.innerHTML = `
                <div class="min-h-[60vh] flex flex-col items-center justify-center text-center">
                    <div class="w-24 h-24 bg-botanical-green/10 rounded-full flex items-center justify-center mb-10"><svg class="w-12 h-12 botanical-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg></div>
                    <h2 class="text-6xl font-serif font-bold mb-6 tracking-tight">訂單已完成同步</h2>
                    <p class="text-gray-400 text-lg mb-12 italic">感謝您的信任，訂單明細已同步至雲端。</p>
                    <button onclick="setView('SHOP')" class="bg-botanical-green text-white px-16 py-6 rounded-full font-black text-xs shadow-2xl hover:scale-105 transition-all">繼續選購</button>
                </div>
            `;
            break;
    }
}

function renderMemberTabContent() {
    if (state.memberTab === 'PROFILE') {
        return `
            <div>
                <h2 class="text-4xl font-serif font-bold mb-12">個人資料概覽</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div><label class="text-[9px] font-black uppercase text-gray-300 mb-2 block">姓名</label><p class="font-bold text-lg">${state.user.m_name}</p></div>
                    <div><label class="text-[9px] font-black uppercase text-gray-300 mb-2 block">電話</label><p class="font-bold text-lg">${formatPhone(state.user.m_phone)}</p></div>
                    <div><label class="text-[9px] font-black uppercase text-gray-300 mb-2 block">電子郵件</label><p class="font-bold text-gray-400">${state.user.m_email}</p></div>
                    <div><label class="text-[9px] font-black uppercase text-gray-300 mb-2 block">地址</label><p class="font-bold text-gray-400">${state.user.m_address || '未設定'}</p></div>
                </div>
            </div>
        `;
    } else if (state.memberTab === 'ORDERS') {
        return `
            <h2 class="text-4xl font-serif font-bold mb-12">訂單紀錄</h2>
            <div class="space-y-6">
                ${state.orders.length === 0 ? '<p class="text-center py-20 italic text-gray-400">目前尚無訂單</p>' : 
                    state.orders.map(o => `
                    <div class="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
                        <div class="flex justify-between items-center mb-4">
                            <span class="font-black botanical-green">${o.o_id}</span>
                            <span class="text-xs text-gray-400">${o.o_created_at}</span>
                        </div>
                        <div class="text-sm font-bold mb-4">${JSON.parse(o.o_items).map(i => `${i.p_name} x ${i.qty}`).join(', ')}</div>
                        <div class="flex justify-between items-end">
                            <span class="px-4 py-1.5 rounded-full text-[10px] font-black bg-white border border-gray-100">${o.o_status}</span>
                            <span class="text-xl font-black">${formatPrice(o.o_total)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (state.memberTab === 'ADMIN_MEMBERS') {
        return `
            <h2 class="text-4xl font-serif font-bold mb-12">全站會員清單</h2>
            <table class="w-full text-left text-sm">
                <tr class="text-gray-400 uppercase text-[10px] font-black">
                    <th class="py-4">姓名</th><th class="py-4">信箱</th><th class="py-4">級別</th>
                </tr>
                ${state.allMembers.map(m => `
                    <tr class="border-b border-gray-50">
                        <td class="py-4 font-bold">${m.m_name}</td>
                        <td class="py-4 text-gray-400">${m.m_email}</td>
                        <td class="py-4 font-black botanical-green">${m.m_level}</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }
    return '';
}

// --- 初始化 ---
fetchProducts();
document.getElementById('cart-drawer-overlay').onclick = () => toggleCart(false);
