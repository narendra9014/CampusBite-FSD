import React, { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000/api";
const categories = ["All", "South Indian", "Snacks", "Meals", "Drinks", "Desserts"];
const money = n => `₹${Number(n || 0).toFixed(0)}`;
const emojiByCategory = { "South Indian":"🥞", Snacks:"🍔", Meals:"🍛", Drinks:"🥤", Desserts:"🍰" };

async function request(path, options = {}) {
  const token = localStorage.getItem("cb_token");
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

function Brand({small=false}) {
  return <div className={`brand ${small ? "brand-small" : ""}`}><span className="brand-mark">🍊</span><span>Campus<span className="brand-accent">Bite</span><i className="brand-dot">.</i></span></div>;
}
function Pill({children, tone="orange"}) { return <span className={`pill pill-${tone}`}>{children}</span>; }
function FoodCard({food, qty, onAdd, onInc, onDec}) {
  return <article className="food-card">
    <div className={`food-art art-${food.category?.toLowerCase().replaceAll(" ","-") || "snacks"}`}>
      <span className="food-emoji">{food.emoji || emojiByCategory[food.category] || "🍽️"}</span>
      <span className="food-art-sticker">CAMPUS<br/>FAV ✦</span>
      <span className="food-art-spark">✳</span>
    </div>
    <div className="food-info">
      <div className="food-name-row"><h3>{food.name}</h3><span className="veg-dot" title="Vegetarian">●</span></div>
      <p className="food-desc">{food.description || "Freshly prepared, full of flavor."}</p>
      <div className="food-bottom"><strong>{money(food.price)}</strong>
        {qty > 0 ? <div className="stepper"><button onClick={onDec}>−</button><b>{qty}</b><button onClick={onInc}>+</button></div>
          : <button className="add-btn" onClick={onAdd}>ADD <span>＋</span></button>}
      </div>
    </div>
  </article>;
}
function Login({onAuth}) {
  const [mode,setMode] = useState("student");
  const [isRegister,setIsRegister] = useState(false);
  const [name,setName] = useState(""); const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const path = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister ? {name,email,password} : {email,password,role:mode};
      const data = await request(path,{method:"POST",body:JSON.stringify(body)});
      localStorage.setItem("cb_token",data.token); localStorage.setItem("cb_user",JSON.stringify(data.user)); onAuth(data.user);
    } catch(err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="auth-page">
    <div className="auth-art"><div className="auth-orbit orbit-one"></div><div className="auth-orbit orbit-two"></div>
      <div className="auth-copy"><Pill tone="lime">THE CAMPUS FOOD CLUB</Pill><h1>Big cravings.<br/><em>Zero queues.</em></h1>
        <p>Your favorite canteen bites, delivered to your pickup screen. Made for campus life.</p>
        <div className="auth-food-float">🍕 <span>🥤</span> 🍟 <b>🍜</b></div>
        <div className="auth-footnote">✳ Freshly cooked · Student powered · Campus loved</div>
      </div>
    </div>
    <section className="auth-panel"><Brand/><div className="auth-form-wrap">
      <Pill>WELCOME TO THE TABLE</Pill><h2>{isRegister ? "Join the feast." : "Your next bite awaits."}</h2>
      <p className="muted">{isRegister ? "Create your student account to start ordering." : "Sign in and make lunch break legendary."}</p>
      {!isRegister && <div className="role-switch"><button className={mode==="student"?"selected":""} onClick={()=>setMode("student")}>🎓 Student</button><button className={mode==="admin"?"selected":""} onClick={()=>setMode("admin")}>🛠 Admin</button></div>}
      <form onSubmit={submit} className="auth-form">
        {isRegister && <label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
        <label>College email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@college.edu"/></label>
        <label>Password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
        {error && <div className="error-box">⚠ {error}</div>}
        <button className="primary-btn full" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account →" : "Let me in →"}</button>
      </form>
      <p className="auth-toggle">{isRegister ? "Already part of the club?" : "New around here?"} <button onClick={()=>{setIsRegister(!isRegister);setError("")}}>{isRegister?"Sign in":"Create student account"}</button></p>
      {mode==="admin" && !isRegister && <div className="demo-hint">Demo admin: <b>admin@campusbite.com</b> · <b>Admin@123</b></div>}
    </div><span className="auth-bottom">© CampusBite · Built on campus, made for cravings</span></section>
  </main>;
}

function App() {
  const [user,setUser] = useState(()=>{try{return JSON.parse(localStorage.getItem("cb_user"))}catch{return null}});
  const [foods,setFoods] = useState([]); const [orders,setOrders] = useState([]);
  const [cart,setCart] = useState({}); const [page,setPage] = useState("menu");
  const [category,setCategory] = useState("All"); const [search,setSearch] = useState("");
  const [toast,setToast] = useState(""); const [loading,setLoading] = useState(true);
  const [editing,setEditing] = useState(null);
  const [foodForm,setFoodForm] = useState({name:"",price:"",category:"Snacks",emoji:"🍔",description:""});
  const admin = user?.role === "admin";
  const qtyCount = Object.values(cart).reduce((a,b)=>a+b,0);
  const cartItems = useMemo(()=>foods.filter(f=>cart[f._id]).map(f=>({...f,qty:cart[f._id]})),[foods,cart]);
  const total = cartItems.reduce((sum,item)=>sum+item.price*item.qty,0);
  const filtered = foods.filter(f=>(category==="All"||f.category===category)&&`${f.name} ${f.category}`.toLowerCase().includes(search.toLowerCase()));
  const notify = msg => {setToast(msg);setTimeout(()=>setToast(""),3000);};

  async function loadFoods(){try{setFoods(await request("/foods"))}catch(e){notify(e.message)}finally{setLoading(false)}}
  async function loadOrders(){try{setOrders(await request(admin?"/orders":"/orders/my"))}catch(e){notify(e.message)}}
  useEffect(()=>{if(user){loadFoods();loadOrders()}},[user]);
  useEffect(()=>{if(user && page==="orders")loadOrders();},[page]);
  function updateQty(id,n){setCart(old=>{const next={...old};if(n<=0)delete next[id];else next[id]=n;return next;});}
  async function placeOrder(){
    if(!cartItems.length)return;
    try {await request("/orders",{method:"POST",body:JSON.stringify({items:cartItems.map(i=>({foodId:i._id,qty:i.qty}))})});
      setCart({});await loadOrders();setPage("orders");notify("Order placed! The canteen is on it 🎉");
    }catch(e){notify(e.message)}
  }
  async function saveFood(e){
    e.preventDefault();
    try{
      if(editing) await request(`/foods/${editing}`,{method:"PUT",body:JSON.stringify(foodForm)});
      else await request("/foods",{method:"POST",body:JSON.stringify(foodForm)});
      setFoodForm({name:"",price:"",category:"Snacks",emoji:"🍔",description:""});setEditing(null);await loadFoods();notify(editing?"Food updated ✨":"New food added ✨");
    }catch(e){notify(e.message)}
  }
  function startEdit(food){setEditing(food._id);setFoodForm({name:food.name,price:String(food.price),category:food.category,emoji:food.emoji,description:food.description||""});}
  async function deleteFood(id){if(!confirm("Delete this menu item?"))return;try{await request(`/foods/${id}`,{method:"DELETE"});await loadFoods();notify("Item removed from menu");}catch(e){notify(e.message)}}
  async function changeStatus(id,status){try{await request(`/orders/${id}/status`,{method:"PATCH",body:JSON.stringify({status})});await loadOrders();notify("Order status updated");}catch(e){notify(e.message)}}
  function logout(){localStorage.removeItem("cb_token");localStorage.removeItem("cb_user");setUser(null);setCart({});setPage("menu");}

  if(!user)return <Login onAuth={setUser}/>;
  const studentNav=[["menu","Discover","✳"],["cart","My bag",`🛍${qtyCount?` · ${qtyCount}`:""}`],["orders","My orders","↗"]];
  const adminNav=[["dashboard","Overview","▦"],["manage-food","Menu studio","✳"],["manage-orders","Order desk","↗"]];
  const nav=admin?adminNav:studentNav;
  const currentTitle=({menu:"Discover the delicious.",cart:"Your craving list.",orders:"Your order journey.",dashboard:"The canteen pulse.", "manage-food":"Menu studio.", "manage-orders":"Order desk."})[page]||"Discover the delicious.";

  return <div className="app-shell">
    <aside className="sidebar"><Brand/><div className="campus-tag"><span className="pulse-dot"></span> MITS CAMPUS · LIVE</div>
      <div className="side-label">YOUR SPACE</div><nav className="side-nav">{nav.map(([key,label,ico])=><button key={key} className={page===key?"active":""} onClick={()=>setPage(key)}><span className="nav-icon">{ico}</span>{label}{key==="cart"&&qtyCount>0&&<span className="nav-count">{qtyCount}</span>}</button>)}</nav>
      <div className="sidebar-promo"><span>✦ LUNCH BREAK, UPGRADED</span><div>Good food.<br/><em>Good mood.</em></div><div className="promo-emoji">🍜🍟🥤</div></div>
      <div className="sidebar-user"><div className="avatar">{user.name?.[0]?.toUpperCase()||"C"}</div><div className="user-details"><b>{user.name}</b><small>{admin?"Canteen admin":"Campus student"}</small></div><button className="logout-btn" title="Logout" onClick={logout}>↗</button></div>
    </aside>
    <main className="main-area"><header className="topbar"><div><span className="breadcrumb">CAMPUSBITE <span>/</span> {page.replace("-"," ").toUpperCase()}</span><div className="mobile-brand"><Brand small/></div></div>
      <div className="topbar-right"><span className="open-pill"><span className="pulse-dot"></span> CANTEEN OPEN</span><div className="top-avatar">{user.name?.[0]?.toUpperCase()}</div></div></header>
      <div className="content">
        {toast&&<div className="toast">✳ {toast}</div>}
        <div className="page-heading"><div><Pill tone="lime">{admin?"ADMIN CONTROL":"YOUR CAMPUS FOOD CLUB"}</Pill><h1>{currentTitle}</h1><p>{admin?"A little overview of what’s cooking across campus.":"Crave it. Tap it. Pick it up. No queue, no chaos."}</p></div><div className="heading-sticker">MADE<br/>WITH <span>♥</span><br/>ON CAMPUS</div></div>

        {page==="menu"&&<>
          <section className="hero-banner"><div className="hero-copy"><Pill tone="dark">THE LUNCH BREAK EDITION</Pill><h2>Hungry minds.<br/><em>Happy tummies.</em></h2><p>Campus classics, made fresh. Your next favorite is one tap away.</p><button className="hero-cta" onClick={()=>document.getElementById("menu-grid")?.scrollIntoView({behavior:"smooth"})}>Explore the menu <span>↓</span></button></div>
            <div className="hero-illustration"><div className="hero-sun"></div><span className="hero-food hero-food-one">🥘</span><span className="hero-food hero-food-two">🥤</span><span className="hero-food hero-food-three">🍟</span><div className="hero-burst">FRESH<br/>AF!</div><div className="hero-scribble">✳ YUM</div></div>
            <div className="hero-vertical">CAMPUS FLAVOUR CLUB — VOL. 01</div>
          </section>
          <div className="section-title" id="menu-grid"><div><span className="eyebrow">WHAT’S ON THE MENU</span><h2>Pick your mood <span>✳</span></h2></div><div className="search-box"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your cravings…"/></div></div>
          <div className="category-row">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={category===c?"chosen":""}>{c==="All"?"✳":emojiByCategory[c]||"✳"} {c}</button>)}</div>
          {loading?<div className="loading-state">🍳 Whipping up the menu…</div>:<div className="food-grid">{filtered.map(food=><FoodCard key={food._id} food={food} qty={cart[food._id]||0} onAdd={()=>updateQty(food._id,1)} onInc={()=>updateQty(food._id,(cart[food._id]||0)+1)} onDec={()=>updateQty(food._id,(cart[food._id]||0)-1)}/>)}</div>}
          {!filtered.length&&!loading&&<div className="empty-state"><span>🍽️</span><h3>No bites found</h3><p>Try another category or search term.</p></div>}
          <div className="bottom-note">✳ MADE FOR MITS · SERVED WITH A SIDE OF HAPPINESS ✳</div>
        </>}

        {page==="cart"&&<section className="cart-layout"><div className="cart-main"><div className="section-title"><div><span className="eyebrow">THE GOOD STUFF</span><h2>Your bag <span>🛍</span></h2></div><Pill>{cartItems.length} ITEMS</Pill></div>
          {!cartItems.length?<div className="empty-state"><span>🛍️</span><h3>Your bag is taking a nap.</h3><p>Add something delicious from the menu.</p><button className="primary-btn" onClick={()=>setPage("menu")}>Explore menu →</button></div>:
          cartItems.map(item=><div className="cart-item" key={item._id}><div className="cart-item-art">{item.emoji||"🍽️"}</div><div className="cart-item-info"><b>{item.name}</b><small>{item.category} · {money(item.price)} each</small><strong>{money(item.price*item.qty)}</strong></div><div className="stepper"><button onClick={()=>updateQty(item._id,item.qty-1)}>−</button><b>{item.qty}</b><button onClick={()=>updateQty(item._id,item.qty+1)}>+</button></div></div>)}
        </div><aside className="bill-card"><span className="eyebrow">THE DAMAGE (IN A GOOD WAY)</span><h3>Bill details</h3><div className="bill-line"><span>Item total</span><b>{money(total)}</b></div><div className="bill-line"><span>Campus pickup</span><b className="free">FREE</b></div><div className="bill-line"><span>Taxes</span><b>Included</b></div><div className="bill-divider"></div><div className="bill-total"><span>To pay</span><strong>{money(total)}</strong></div><button disabled={!cartItems.length} className="primary-btn full" onClick={placeOrder}>Place my order <span>→</span></button><p className="bill-note">✳ Pickup at the canteen counter when it’s ready.</p></aside></section>}

        {page==="orders"&&<><div className="section-title"><div><span className="eyebrow">YOUR FOOD TIMELINE</span><h2>Orders in motion <span>↗</span></h2></div><button className="outline-btn" onClick={loadOrders}>↻ Refresh</button></div>
          {!orders.length?<div className="empty-state"><span>🍜</span><h3>No orders yet!</h3><p>Your delicious story starts with the menu.</p><button className="primary-btn" onClick={()=>setPage("menu")}>Find a bite →</button></div>:<div className="orders-grid">{orders.map(o=><article className="order-card" key={o._id}><div className="order-top"><div><span className="eyebrow">ORDER #{String(o._id).slice(-6).toUpperCase()}</span><small>{new Date(o.createdAt).toLocaleString()}</small></div><Pill tone={o.status==="Ready"?"lime":o.status==="Collected"?"dark":"orange"}>{o.status}</Pill></div><div className="order-foods">{o.items.map((it,i)=><div key={i}><span>{it.emoji||"🍽️"} {it.name} <small>× {it.qty}</small></span><b>{money(it.price*it.qty)}</b></div>)}</div><div className="order-total"><span>Order total</span><strong>{money(o.total)}</strong></div><div className={`status-track status-${o.status.toLowerCase()}`}><div className="track-step"><span>1</span><small>Placed</small></div><div className="track-line"></div><div className="track-step"><span>2</span><small>Preparing</small></div><div className="track-line"></div><div className="track-step"><span>3</span><small>Ready</small></div></div>{o.status==="Ready"&&<div className="pickup-banner">🎉 Your order is ready! Head to the pickup counter.</div>}</article>)}</div>}
        </>}

        {page==="dashboard"&&<><div className="stats-grid"><div className="stat-card stat-orange"><span>ALL ORDERS</span><strong>{orders.length}</strong><small>✳ Orders received</small></div><div className="stat-card stat-lime"><span>IN THE KITCHEN</span><strong>{orders.filter(o=>o.status==="Preparing").length}</strong><small>🍳 Being prepared</small></div><div className="stat-card stat-purple"><span>READY TO PICK UP</span><strong>{orders.filter(o=>o.status==="Ready").length}</strong><small>🛍 Waiting at counter</small></div><div className="stat-card stat-dark"><span>MENU ITEMS</span><strong>{foods.length}</strong><small>✳ Available bites</small></div></div><div className="dashboard-bottom"><div className="dash-note"><span>✳ TODAY’S REMINDER</span><h3>Keep the good food<br/><em>coming hot.</em></h3><p>Update order status so students can plan their pickup without standing in a queue.</p></div><div className="dash-latest"><div className="section-title"><h2>Latest orders</h2><button className="outline-btn" onClick={()=>setPage("manage-orders")}>View all →</button></div>{orders.slice(0,4).map(o=><div className="latest-row" key={o._id}><span className="latest-emoji">🍱</span><div><b>{o.studentName}</b><small>{o.items.length} item types · {new Date(o.createdAt).toLocaleTimeString()}</small></div><strong>{money(o.total)}</strong><Pill>{o.status}</Pill></div>)}</div></div></>}

        {page==="manage-food"&&<div className="admin-food-layout"><section className="admin-form-card"><span className="eyebrow">{editing?"EDIT THE RECIPE":"ADD A NEW BITE"}</span><h2>{editing?"Tweak your menu.":"Make it delicious."}</h2><form className="food-admin-form" onSubmit={saveFood}><label>Food name<input required value={foodForm.name} onChange={e=>setFoodForm({...foodForm,name:e.target.value})} placeholder="e.g. Ghee karam dosa"/></label><div className="form-two"><label>Price (₹)<input type="number" min="1" required value={foodForm.price} onChange={e=>setFoodForm({...foodForm,price:e.target.value})} placeholder="50"/></label><label>Emoji<input value={foodForm.emoji} onChange={e=>setFoodForm({...foodForm,emoji:e.target.value})} placeholder="🥞"/></label></div><label>Category<select value={foodForm.category} onChange={e=>setFoodForm({...foodForm,category:e.target.value})}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><label>Description<input value={foodForm.description} onChange={e=>setFoodForm({...foodForm,description:e.target.value})} placeholder="Fresh, spicy, made with love…"/></label><button className="primary-btn full">{editing?"Save changes →":"Add to menu ✳"}</button>{editing&&<button type="button" className="outline-btn full" onClick={()=>{setEditing(null);setFoodForm({name:"",price:"",category:"Snacks",emoji:"🍔",description:""})}}>Cancel edit</button>}</form></section>
          <section className="admin-list"><div className="section-title"><div><span className="eyebrow">CURRENT MENU</span><h2>On the menu <span>✳</span></h2></div><Pill>{foods.length} ITEMS</Pill></div>{foods.map(f=><div className="admin-food-row" key={f._id}><span className="admin-food-emoji">{f.emoji||"🍽️"}</span><div><b>{f.name}</b><small>{f.category}</small></div><strong>{money(f.price)}</strong><button className="icon-action" onClick={()=>startEdit(f)}>✎</button><button className="icon-action delete-action" onClick={()=>deleteFood(f._id)}>×</button></div>)}</section></div>}

        {page==="manage-orders"&&<><div className="section-title"><div><span className="eyebrow">KITCHEN CONTROL CENTER</span><h2>Orders on the board <span>↗</span></h2></div><button className="outline-btn" onClick={loadOrders}>↻ Refresh</button></div>{!orders.length?<div className="empty-state"><span>🍳</span><h3>All quiet in the kitchen</h3><p>New student orders will show up here.</p></div>:<div className="admin-orders">{orders.map(o=><article className="admin-order-card" key={o._id}><div className="admin-order-head"><div><span className="eyebrow">ORDER #{String(o._id).slice(-6).toUpperCase()}</span><h3>{o.studentName}</h3><small>{new Date(o.createdAt).toLocaleString()}</small></div><Pill>{o.status}</Pill></div><div className="order-foods">{o.items.map((it,i)=><div key={i}><span>{it.emoji||"🍽️"} {it.name} <small>× {it.qty}</small></span><b>{money(it.price*it.qty)}</b></div>)}</div><div className="admin-order-foot"><strong>{money(o.total)}</strong><label>UPDATE STATUS<select value={o.status} onChange={e=>changeStatus(o._id,e.target.value)}>{["Placed","Preparing","Ready","Collected"].map(s=><option key={s}>{s}</option>)}</select></label></div></article>)}</div>}</>}
      </div>
    </main>
    {qtyCount>0&&!admin&&page==="menu"&&<button className="floating-cart" onClick={()=>setPage("cart")}><span>🛍 {qtyCount} item{qtyCount>1?"s":""}</span><b>{money(total)} · View bag →</b></button>}
  </div>;
}
export default App;
