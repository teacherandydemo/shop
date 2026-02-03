
import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, ViewState } from './types.ts';

// 使用最新的部署 URL，確保支援訂單歷史與管理員功能
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzlcqQtsqEl8kg-sopXOXa165kp7KUslTf-I8mcWxJTRQQmqfYIj6FxtyKCT1uhXeON/exec';

const formatPhone = (phone: any) => {
  if (!phone) return "";
  let s = phone.toString().replace(/[']/g, '');
  if (s.length === 9 && !s.startsWith("0")) return "0" + s;
  return s;
};

const formatDate = (date: any) => {
  if (!date) return "";
  let s = date.toString();
  if (s.includes("T")) return s.split("T")[0];
  return s;
};

const getStableImageUrl = (url: string) => {
  if (!url || typeof url !== 'string') return 'https://placehold.co/600x600?text=BHG+Product';
  if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) return url;
  let fileId = '';
  const patterns = [/\/file\/d\/([^\/\\\?#]+)/, /id=([^\/\\\?#&]+)/, /\/d\/([^\/\\\?#]+)/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) { fileId = match[1]; break; }
  }
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
};

// Navbar 組件
const Navbar: React.FC<{
  setView: (v: ViewState) => void,
  isLoggedIn: boolean,
  userName?: string,
  cartCount: number,
  openCart: () => void
}> = ({ setView, isLoggedIn, userName, cartCount, openCart }) => (
  <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-8 py-5 flex items-center justify-between">
    <h1 className="text-2xl font-serif font-black botanical-green cursor-pointer tracking-tighter" onClick={() => setView('HOME')}>BAO HONG GIRL</h1>
    <div className="flex items-center gap-8">
      <button onClick={() => setView('SHOP')} className="text-xs font-black text-gray-400 hover:text-botanical-green transition-colors uppercase tracking-[0.2em]">全系列產品</button>
      <button 
        onClick={() => isLoggedIn ? setView('MEMBER') : setView('LOGIN')} 
        className="text-xs font-black text-gray-400 hover:text-botanical-green transition-colors uppercase tracking-[0.2em]"
      >
        {isLoggedIn ? (userName || '會員') : '會員專區'}
      </button>
      <button onClick={openCart} className="relative bg-gray-50 p-3 rounded-2xl hover:bg-gray-100 transition-all border border-gray-100">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
        {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold ring-4 ring-white">{cartCount}</span>}
      </button>
    </div>
  </nav>
);

// 數量選擇彈窗
const QuantityModal: React.FC<{
  isOpen: boolean,
  product: Product | null,
  quantity: number,
  setQuantity: (q: number) => void,
  onClose: () => void,
  onConfirm: () => void
}> = ({ isOpen, product, quantity, setQuantity, onClose, onConfirm }) => {
  if (!isOpen || !product) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <h3 className="text-2xl font-serif font-bold mb-2 text-center">{product.p_name}</h3>
        <p className="text-botanical-green font-black mb-8 text-center text-lg">NT$ {Number(product.p_price).toLocaleString()}</p>
        <div className="flex items-center justify-between bg-gray-50 rounded-3xl p-2 mb-8 border border-gray-100">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm hover:bg-gray-100 transition-colors text-xl font-bold">-</button>
          <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-20 bg-transparent text-center text-2xl font-black outline-none" />
          <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm hover:bg-gray-100 transition-colors text-xl font-bold">+</button>
        </div>
        <button onClick={onConfirm} className="w-full bg-botanical-green text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/20 hover:scale-[1.02] transition-all">確認加入購物袋</button>
      </div>
    </div>
  );
};

// 購物車抽屜
const CartDrawer: React.FC<{
  isOpen: boolean,
  cart: CartItem[],
  onClose: () => void,
  onCheckout: () => void
}> = ({ isOpen, cart, onClose, onCheckout }) => (
  <>
    <div className={`fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
    <div className={`fixed top-0 right-0 z-[120] h-full w-full max-w-md bg-white shadow-[-30px_0_60px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-serif font-bold">我的購物袋</h2>
          <button onClick={onClose} className="p-2 text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {cart.length === 0 ? (
            <p className="text-center text-gray-400 italic py-20">購物袋是空的</p>
          ) : (
            cart.map(item => (
              <div key={item.p_id} className="flex gap-4">
                <img src={getStableImageUrl(item.p_image)} className="w-20 h-20 object-cover rounded-xl bg-gray-50" alt={item.p_name} />
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{item.p_name}</h4>
                  <p className="text-xs text-gray-400">數量: {item.quantity}</p>
                  <p className="text-botanical-green font-black text-sm">NT$ {(Number(item.p_price) * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-8 border-t border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">總計金額</span>
            <span className="text-2xl font-serif font-bold botanical-green">NT$ {cart.reduce((a, b) => a + (Number(b.p_price) * b.quantity), 0).toLocaleString()}</span>
          </div>
          <button 
            onClick={onCheckout}
            className="w-full bg-botanical-green text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 hover:scale-[1.02] transition-transform" 
            disabled={cart.length === 0}
          >
            立即結帳
          </button>
        </div>
      </div>
    </div>
  </>
);

// 歷史訂單組件
const OrderHistoryView: React.FC<{ orders: any[], filterStatus: string, setFilterStatus: (s: string) => void, isAdmin: boolean }> = ({ orders, filterStatus, setFilterStatus, isAdmin }) => {
  const filteredOrders = filterStatus === '全部' ? orders : orders.filter(o => o.o_status === filterStatus);
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-serif font-bold">{isAdmin ? '全站訂單管理' : '我的訂單紀錄'}</h3>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 ring-botanical-green/10 outline-none cursor-pointer"
        >
          <option value="全部">全部狀態</option>
          <option value="待處理">待處理</option>
          <option value="已完成">已完成</option>
          <option value="已取消">已取消</option>
        </select>
      </div>
      {filteredOrders.length === 0 ? (
        <div className="bg-gray-50 rounded-[2rem] p-12 text-center border border-dashed border-gray-200">
          <p className="text-gray-400 italic">目前沒有符合條件的訂單紀錄</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map(order => (
            <div key={order.o_id} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50 hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">訂單編號</span>
                  <p className="font-black text-lg botanical-green">{order.o_id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">成立日期</span>
                    <p className="text-xs font-bold">{order.o_created_at}</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    order.o_status === '待處理' ? 'bg-amber-50 text-amber-600' :
                    order.o_status === '已完成' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                  }`}>{order.o_status}</span>
                </div>
              </div>
              <div className="border-t border-b border-gray-50 py-6 my-6 space-y-4">
                {JSON.parse(order.o_items || "[]").map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="font-bold">{item.p_name} <span className="text-gray-300 ml-2">x {item.qty}</span></span>
                    <span className="text-gray-400">NT$ {(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-end">
                <div>
                   <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">收件地址</span>
                   <p className="text-xs text-gray-500">{order.o_shipping_addr}</p>
                   {isAdmin && <p className="text-[10px] botanical-green font-bold mt-2">會員 ID: {order.m_id}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">總計</span>
                  <p className="text-xl font-black">NT$ {Number(order.o_total).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 會員名單管理 (管理員)
const MemberListView: React.FC<{ members: any[] }> = ({ members }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h3 className="text-2xl font-serif font-bold">全站會員清單</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100">
          <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
            <th className="py-4 px-2">會員 ID</th>
            <th className="py-4 px-2">姓名</th>
            <th className="py-4 px-2">信箱</th>
            <th className="py-4 px-2">等級</th>
            <th className="py-4 px-2 text-right">註冊日</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {members.map(m => (
            <tr key={m.m_id} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-2 font-bold text-xs">{m.m_id}</td>
              <td className="py-4 px-2 font-bold">{m.m_name}</td>
              <td className="py-4 px-2 text-gray-400">{m.m_email}</td>
              <td className="py-4 px-2"><span className="bg-botanical-green/5 text-botanical-green px-3 py-1 rounded-full text-[10px] font-bold">{m.m_level}</span></td>
              <td className="py-4 px-2 text-right text-gray-300 text-[10px]">{m.m_created_at?.split(' ')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// 登入與註冊視圖
const AuthView: React.FC<{
  authMode: 'LOGIN' | 'REGISTER',
  setAuthMode: (mode: 'LOGIN' | 'REGISTER') => void,
  regForm: any,
  setRegForm: (form: any) => void,
  isAuthProcessing: boolean,
  handleRegister: (e: React.FormEvent) => Promise<void>,
  handleLogin: (e: React.FormEvent) => Promise<void>
}> = ({ authMode, setAuthMode, regForm, setRegForm, isAuthProcessing, handleRegister, handleLogin }) => (
  <div className="max-w-md mx-auto py-12 animate-in fade-in zoom-in-95 duration-700">
    <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-gray-50">
      <header className="text-center mb-12">
        <span className="text-[11px] font-black botanical-green uppercase tracking-[0.5em] mb-4 block">Boutique Access</span>
        <h2 className="text-4xl font-serif font-bold">{authMode === 'LOGIN' ? '歡迎歸來' : '加入會員'}</h2>
      </header>
      {authMode === 'LOGIN' ? (
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">電子郵件 Email</label>
            <input name="m_email" type="email" required className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-botanical-green/10" placeholder="your@email.com" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">密碼 Password</label>
            <input name="m_password" type="password" required className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-botanical-green/10" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isAuthProcessing} className="w-full bg-botanical-green text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50 mt-4">
            {isAuthProcessing ? '驗證中...' : '登入帳戶'}
          </button>
          <div className="text-center pt-8 border-t border-gray-50 mt-8">
            <p className="text-gray-400 text-xs mb-4">還不是會員嗎？</p>
            <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-botanical-green font-black text-[10px] uppercase tracking-widest hover:underline">立即註冊專屬帳號</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-6">
           <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">電子郵件 Email</label>
            <input required type="email" className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-botanical-green/10" value={regForm.m_email} onChange={e => setRegForm({...regForm, m_email: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">設定密碼 Password</label>
            <input required type="password" minLength={6} className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-botanical-green/10" value={regForm.m_password} onChange={e => setRegForm({...regForm, m_password: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">姓名 Full Name</label>
            <input required className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-botanical-green/10" value={regForm.m_name} onChange={e => setRegForm({...regForm, m_name: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">連絡電話 Phone</label>
            <input required className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-botanical-green/10" value={regForm.m_phone} onChange={e => setRegForm({...regForm, m_phone: e.target.value})} />
          </div>
          <button type="submit" disabled={isAuthProcessing} className="w-full bg-botanical-green text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50 mt-4">
            {isAuthProcessing ? '註冊中...' : '建立會員帳號'}
          </button>
          <div className="text-center pt-8 border-t border-gray-50 mt-8">
            <p className="text-gray-400 text-xs mb-4">已經有帳號了？</p>
            <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-botanical-green font-black text-[10px] uppercase tracking-widest hover:underline">返回登入介面</button>
          </div>
        </form>
      )}
    </div>
  </div>
);

// 會員專區整合視圖
const MemberProfileView: React.FC<{
  user: any,
  onLogout: () => void,
  onUpdate: (data: any) => Promise<void>
}> = ({ user, onLogout, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'ORDERS' | 'ADMIN_MEMBERS'>('PROFILE');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ m_name: user.m_name, m_phone: formatPhone(user.m_phone), m_address: user.m_address, m_birthday: formatDate(user.m_birthday) });
  const [isSaving, setIsSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('全部');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (activeTab === 'ORDERS') {
        setIsFetching(true);
        try {
          const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'getOrders', data: { m_id: user.m_id, m_level: user.m_level } }) 
          });
          const result = await response.json();
          if (result.status === 'success') setOrders(result.data);
        } catch (e) { console.error(e); } finally { setIsFetching(false); }
      } else if (activeTab === 'ADMIN_MEMBERS' && user.m_level === 'Admin') {
        setIsFetching(true);
        try {
          const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'getAllMembers', data: { m_level: user.m_level } }) 
          });
          const result = await response.json();
          if (result.status === 'success') setMembers(result.data);
        } catch (e) { console.error(e); } finally { setIsFetching(false); }
      }
    };
    fetchUserData();
  }, [activeTab, user.m_id, user.m_level]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onUpdate({ ...editForm, m_id: user.m_id });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64 space-y-2">
          <button onClick={() => {setActiveTab('PROFILE'); setIsEditing(false);}} className={`w-full text-left px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'PROFILE' ? 'bg-botanical-green text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>個人基本資料</button>
          <button onClick={() => setActiveTab('ORDERS')} className={`w-full text-left px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'ORDERS' ? 'bg-botanical-green text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>
            {user.m_level === 'Admin' ? '全站訂單管理' : '歷史訂單紀錄'}
          </button>
          {user.m_level === 'Admin' && (
            <button onClick={() => setActiveTab('ADMIN_MEMBERS')} className={`w-full text-left px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADMIN_MEMBERS' ? 'bg-botanical-green text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>會員名單管理</button>
          )}
          <div className="pt-8 border-t border-gray-100 mt-8">
            <button onClick={onLogout} className="w-full text-left px-8 py-4 text-[11px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors">安全登出帳戶</button>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-[3rem] p-8 md:p-16 shadow-2xl border border-gray-50 min-h-[600px]">
          {isFetching ? (
            <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-2 border-gray-100 border-t-botanical-green rounded-full animate-spin"></div></div>
          ) : activeTab === 'PROFILE' ? (
            <div>
              <header className="mb-12 flex justify-between items-end">
                <div><span className="text-[11px] font-black botanical-green uppercase tracking-[0.5em] mb-4 block">Membership Gallery</span><h2 className="text-4xl font-serif font-bold">個人資料概覽</h2></div>
                {!isEditing && <button onClick={() => setIsEditing(true)} className="bg-botanical-green text-white px-8 py-3 rounded-full text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">編輯資料</button>}
              </header>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-10">
                    <div><label className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-2 block">會員編號</label><p className="font-bold text-gray-400">{user.m_id}</p></div>
                    <div><label className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-2 block">電子郵件</label><p className="font-bold text-gray-400">{user.m_email}</p></div>
                    <div><label className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-2 block">真實姓名</label>{isEditing ? <input required className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-botanical-green/10 outline-none" value={editForm.m_name} onChange={e => setEditForm({...editForm, m_name: e.target.value})} /> : <p className="font-bold text-lg">{user.m_name}</p>}</div>
                  </div>
                  <div className="space-y-10">
                    <div><label className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-2 block">連絡電話</label>{isEditing ? <input required className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-botanical-green/10 outline-none" value={editForm.m_phone} onChange={e => setEditForm({...editForm, m_phone: e.target.value})} /> : <p className="font-bold text-lg">{formatPhone(user.m_phone)}</p>}</div>
                    <div><label className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-2 block">出生日期</label>{isEditing ? <input type="date" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-botanical-green/10 outline-none" value={editForm.m_birthday} onChange={e => setEditForm({...editForm, m_birthday: e.target.value})} /> : <p className="font-bold text-lg">{formatDate(user.m_birthday)}</p>}</div>
                    <div><label className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-2 block">預設地址</label>{isEditing ? <input className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 ring-botanical-green/10 outline-none" value={editForm.m_address} onChange={e => setEditForm({...editForm, m_address: e.target.value})} /> : <p className="font-bold text-sm text-gray-600 leading-relaxed">{user.m_address}</p>}</div>
                  </div>
                </div>
                {isEditing && (
                  <div className="mt-16 flex gap-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">取消</button>
                    <button type="submit" disabled={isSaving} className="flex-2 w-full bg-botanical-green text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-xl hover:scale-[1.01] transition-all">{isSaving ? "儲存中..." : "確認儲存修改"}</button>
                  </div>
                )}
              </form>
            </div>
          ) : activeTab === 'ORDERS' ? (
            <OrderHistoryView orders={orders} filterStatus={filterStatus} setFilterStatus={setFilterStatus} isAdmin={user.m_level === 'Admin'} />
          ) : (
            <MemberListView members={members} />
          )}
        </div>
      </div>
    </div>
  );
};

// 結帳視圖
const CheckoutView: React.FC<{ cart: CartItem[], user: any, onOrder: (address: string) => void, isProcessing: boolean }> = ({ cart, user, onOrder, isProcessing }) => {
  const [shippingAddr, setShippingAddr] = useState(user.m_address || "");
  const total = cart.reduce((a, b) => a + (Number(b.p_price) * b.quantity), 0);
  return (
    <div className="max-w-4xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-white rounded-[3rem] p-10 md:p-20 shadow-2xl border border-gray-50">
        <h2 className="text-5xl font-serif font-bold mb-12 tracking-tight">結帳確認</h2>
        <div className="space-y-8 mb-16">
          <div className="border-b border-gray-50 pb-4"><span className="text-[11px] font-black botanical-green uppercase tracking-[0.3em]">01 訂單摘要</span></div>
          {cart.map(item => (
            <div key={item.p_id} className="flex justify-between items-center text-sm">
              <div className="flex gap-4 items-center">
                <img src={getStableImageUrl(item.p_image)} className="w-16 h-16 object-cover rounded-2xl bg-gray-50" />
                <div><p className="font-bold">{item.p_name}</p><p className="text-gray-400">數量: {item.quantity}</p></div>
              </div>
              <span className="font-bold">NT$ {(Number(item.p_price) * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between items-end pt-8 border-t border-gray-100">
            <span className="text-gray-400 uppercase text-[10px] font-black tracking-widest">總計金額</span>
            <span className="text-3xl font-serif font-bold botanical-green">NT$ {total.toLocaleString()}</span>
          </div>
        </div>
        <div className="space-y-8">
           <div className="border-b border-gray-50 pb-4"><span className="text-[11px] font-black botanical-green uppercase tracking-[0.3em]">02 配送資訊</span></div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block">收件地址 Shipping Address</label>
            <textarea required className="w-full bg-gray-50 border-none rounded-3xl p-6 outline-none focus:ring-2 ring-botanical-green/10 min-h-[120px] text-lg font-medium" value={shippingAddr} onChange={e => setShippingAddr(e.target.value)} placeholder="請填寫完整收件地址" />
          </div>
        </div>
        <button onClick={() => onOrder(shippingAddr)} disabled={isProcessing || !shippingAddr.trim()} className="w-full bg-botanical-green text-white py-8 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl mt-16 disabled:bg-gray-200 hover:scale-[1.01] transition-all">
          {isProcessing ? '正在建立訂單...' : '確認下單'}
        </button>
      </div>
    </div>
  );
};

// 主程式 App
const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorInfo, setErrorInfo] = useState<{msg: string, details?: string} | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [regForm, setRegForm] = useState({ m_email: '', m_password: '', m_name: '', m_phone: '', m_address: '', m_birthday: '' });
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [productForModal, setProductForModal] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('bhg_user');
    if (savedUser) { 
      try { 
        const parsed = JSON.parse(savedUser); 
        setCurrentUser(parsed); 
        setIsLoggedIn(true); 
      } catch(e) { localStorage.removeItem('bhg_user'); } 
    }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?action=getProducts&t=${Date.now()}`);
      if (!response.ok) throw new Error('伺服器回應錯誤');
      const result = await response.json();
      if (result.status === 'success') setProducts(result.data);
      else throw new Error(result.error || '獲取產品失敗');
    } catch (err: any) { 
      setErrorInfo({ msg: '資料同步失敗', details: '請確認網路連線或稍後再試。' }); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const m_email = formData.get('m_email') as string;
    const m_password = formData.get('m_password') as string;
    setIsAuthProcessing(true);
    try {
      const response = await fetch(GAS_API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'loginMember', data: { m_email, m_password } }) 
      });
      const result = await response.json();
      if (result.status === 'success') { 
        setCurrentUser(result.data); 
        setIsLoggedIn(true); 
        localStorage.setItem('bhg_user', JSON.stringify(result.data)); 
        setView('SHOP'); 
      } else { alert(result.message); }
    } catch (err) { alert('連線異常'); } finally { setIsAuthProcessing(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    try {
      const response = await fetch(GAS_API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'registerMember', data: regForm }) 
      });
      const result = await response.json();
      if (result.status === 'success') { alert('註冊成功！'); setAuthMode('LOGIN'); } else { alert(result.message); }
    } catch (err) { alert('連線異常'); } finally { setIsAuthProcessing(false); }
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      const response = await fetch(GAS_API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'updateMember', data }) 
      });
      const result = await response.json();
      if (result.status === 'success') { 
        const newUser = { ...currentUser, ...data }; 
        setCurrentUser(newUser); 
        localStorage.setItem('bhg_user', JSON.stringify(newUser)); 
        alert('修改成功！'); 
      }
    } catch (err) { alert('連線異常'); }
  };

  const handleCreateOrder = async (address: string) => {
    setIsOrderProcessing(true);
    try {
      const response = await fetch(GAS_API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ 
          action: 'createOrder', 
          data: { 
            m_id: currentUser.m_id, 
            o_items: cart, 
            o_total: cart.reduce((a, b) => a + (Number(b.p_price) * b.quantity), 0), 
            o_shipping_addr: address 
          } 
        }) 
      });
      const result = await response.json();
      if (result.status === 'success') { 
        setCart([]); 
        setView('ORDER_SUCCESS'); 
        fetchProducts(); 
      } else { alert(result.message); }
    } catch (err) { alert('連線異常'); } finally { setIsOrderProcessing(false); }
  };

  return (
    <div className="min-h-screen health-white selection:bg-green-100 selection:text-botanical-green">
      <Navbar setView={setView} isLoggedIn={isLoggedIn} userName={currentUser?.m_name} cartCount={cart.reduce((a, b) => a + b.quantity, 0)} openCart={() => setIsCartDrawerOpen(true)} />
      
      <QuantityModal isOpen={isQuantityModalOpen} product={productForModal} quantity={modalQuantity} setQuantity={setModalQuantity} onClose={() => setIsQuantityModalOpen(false)} onConfirm={() => {
        setCart(prev => {
          const existing = prev.find(item => item.p_id === productForModal!.p_id);
          if (existing) return prev.map(item => item.p_id === productForModal!.p_id ? { ...item, quantity: item.quantity + modalQuantity } : item);
          return [...prev, { ...productForModal!, quantity: modalQuantity }];
        });
        setIsQuantityModalOpen(false); setIsCartDrawerOpen(true);
      }} />

      <CartDrawer isOpen={isCartDrawerOpen} cart={cart} onClose={() => setIsCartDrawerOpen(false)} onCheckout={() => { 
        if (!isLoggedIn) { alert("請先登入"); setView('LOGIN'); } 
        else { setView('CHECKOUT'); } 
        setIsCartDrawerOpen(false); 
      }} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8">
            <div className="w-20 h-20 border-4 border-gray-100 border-t-botanical-green rounded-full animate-spin"></div>
            <p className="text-botanical-green font-black uppercase text-[11px] tracking-[0.5em]">Syncing Boutique...</p>
          </div>
        ) : errorInfo ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-serif font-bold text-rose-600 mb-4">{errorInfo.msg}</h2>
            <p className="mb-8 text-gray-400">{errorInfo.details}</p>
            <button onClick={() => window.location.reload()} className="bg-botanical-green text-white px-8 py-3 rounded-full font-black text-xs hover:scale-105 transition-all">點此重新整理</button>
          </div>
        ) : (
          <>
            {view === 'LOGIN' && <AuthView authMode={authMode} setAuthMode={setAuthMode} regForm={regForm} setRegForm={setRegForm} isAuthProcessing={isAuthProcessing} handleRegister={handleRegister} handleLogin={handleLogin} />}
            {view === 'MEMBER' && currentUser && <MemberProfileView user={currentUser} onLogout={() => { setIsLoggedIn(false); setCurrentUser(null); localStorage.removeItem('bhg_user'); setView('HOME'); }} onUpdate={handleUpdateProfile} />}
            {view === 'CHECKOUT' && currentUser && <CheckoutView cart={cart} user={currentUser} onOrder={handleCreateOrder} isProcessing={isOrderProcessing} />}
            {view === 'ORDER_SUCCESS' && (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-botanical-green/10 rounded-full flex items-center justify-center mb-10"><svg className="w-12 h-12 botanical-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
                <h2 className="text-6xl font-serif font-bold mb-6 tracking-tight">訂單已完成同步</h2>
                <p className="text-gray-400 text-lg mb-12 italic">感謝您的信任，訂單明細已同步至雲端。</p>
                <button onClick={() => setView('SHOP')} className="bg-botanical-green text-white px-16 py-6 rounded-full font-black text-xs shadow-2xl hover:scale-105 transition-all">繼續選購</button>
              </div>
            )}
            {view === 'HOME' && (
              <header className="py-24 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <span className="text-[11px] font-black botanical-green uppercase tracking-[0.6em] mb-4 block">Superior Health Care</span>
                <h2 className="text-7xl md:text-9xl font-serif font-bold botanical-green mb-10 tracking-tighter leading-none">優雅與純粹<br/>的並存</h2>
                <p className="text-gray-400 text-lg leading-loose mb-16 max-w-2xl mx-auto font-medium">專為現代女性打造，從大自然中汲取靈感，為您的每一天注入純淨活力。</p>
                <button onClick={() => setView('SHOP')} className="bg-botanical-green text-white px-16 py-6 rounded-full font-black text-xs shadow-2xl transition-all hover:scale-105">探索系列產品</button>
              </header>
            )}
            {view === 'SHOP' && (
              <div className="animate-in fade-in duration-800">
                <h2 className="text-4xl font-serif font-bold tracking-tight mb-8">Boutique Collection</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                  {products.map(p => (
                    <div key={p.p_id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-50 hover:shadow-2xl transition-all p-8 flex flex-col">
                      <div className="relative overflow-hidden rounded-[1.5rem] mb-6 aspect-square">
                        <img src={getStableImageUrl(p.p_image)} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-700" alt={p.p_name} onClick={() => {setSelectedProduct(p); setView('PRODUCT_DETAIL');}} />
                        {Number(p.p_stock) <= 0 && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 bg-white px-4 py-2 rounded-full border">已售罄 Sold Out</span></div>}
                      </div>
                      <h4 className="font-bold text-lg mb-2">{p.p_name}</h4>
                      <p className="text-xs text-gray-400 mb-6 line-clamp-2">{p.p_desc || '頂級草本精華，為您帶來全方位呵護。'}</p>
                      <div className="flex justify-between items-center mt-auto">
                        <span className="font-black text-xl">NT$ {Number(p.p_price).toLocaleString()}</span>
                        <button onClick={() => {setProductForModal(p); setModalQuantity(1); setIsQuantityModalOpen(true);}} disabled={Number(p.p_stock) <= 0} className="bg-botanical-green text-white p-4 rounded-xl shadow-xl transition-all disabled:bg-gray-100 disabled:text-gray-300 hover:scale-110 active:scale-95">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'PRODUCT_DETAIL' && selectedProduct && (
              <div className="py-12 animate-in fade-in duration-800">
                <button onClick={() => setView('SHOP')} className="mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 hover:text-botanical-green flex items-center gap-2 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  返回商品清單
                </button>
                <div className="flex flex-col lg:flex-row gap-20">
                  <div className="w-full lg:w-1/2"><img src={getStableImageUrl(selectedProduct.p_image)} className="w-full aspect-square object-cover rounded-[4rem] shadow-2xl bg-white" alt={selectedProduct.p_name} /></div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-4"><span className="text-[13px] font-black botanical-green uppercase tracking-[0.5em]">{selectedProduct.p_category}</span><span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full border ${Number(selectedProduct.p_stock) > 0 ? 'border-botanical-green/20 botanical-green' : 'border-rose-200 text-rose-500'}`}>{Number(selectedProduct.p_stock) > 0 ? `現貨 (庫存: ${selectedProduct.p_stock})` : '目前無庫存'}</span></div>
                    <h1 className="text-6xl font-serif font-bold mb-8 leading-[1.1] tracking-tighter">{selectedProduct.p_name}</h1>
                    <p className="text-4xl font-black botanical-green mb-12">NT$ {Number(selectedProduct.p_price).toLocaleString()}</p>
                    <p className="text-gray-500 mb-12 italic leading-relaxed text-lg">{selectedProduct.p_desc || '這款頂級保健食品選用純淨天然成分。'}</p>
                    <button onClick={() => {setProductForModal(selectedProduct); setModalQuantity(1); setIsQuantityModalOpen(true);}} disabled={Number(selectedProduct.p_stock) <= 0} className="w-full bg-botanical-green text-white py-8 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl transition-all hover:scale-[1.02] disabled:opacity-50">
                      {Number(selectedProduct.p_stock) > 0 ? '立即加入購物袋' : '暫無庫存'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="bg-white border-t border-gray-50 py-32 text-center"><h1 className="text-3xl font-serif font-black botanical-green mb-10 tracking-tighter">BAO HONG GIRL</h1><p className="text-gray-300 text-[10px] tracking-[0.5em] uppercase font-black">© 2025 BHG Botanical Science. Purely for Health.</p></footer>
    </div>
  );
};

export default App;
