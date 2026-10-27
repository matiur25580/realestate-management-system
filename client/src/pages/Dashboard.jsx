import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import LiveDateTime from '../components/LiveDateTime';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const uidFromToken = ()=>{ try{ const t=localStorage.getItem('token'); return JSON.parse(atob(t.split('.')[1])).id; }catch(e){ return null; } };
const card = { background:'var(--app-card)', padding:'14px', borderRadius:'10px', minWidth:'130px', flex:'1' };
const inp = { padding:'8px', borderRadius:'6px', border:'1px solid #475569' };
const btn = (bg)=> ({ background:bg, color:'var(--app-text)', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer' });
const COLORS = ['#22c55e','#f59e0b','#ef4444','#3b82f6','#8b5cf6'];
const ROLE_META = {
  admin:{label:'Admin Dashboard', color:'#ef4444'},
  agent:{label:'Agent Dashboard', color:'#3b82f6'},
  owner:{label:'Owner Dashboard', color:'#22c55e'},
  tenant:{label:'Tenant Dashboard', color:'#f59e0b'},
  maintenance:{label:'Maintenance Dashboard', color:'#8b5cf6'},
};
const fmtD = (d)=> d ? new Date(d).toLocaleDateString() : '';

export default function Dashboard(){
  const toast = useToast();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const role = (user?.role||'').toLowerCase();
  const isStaff = role==='admin'||role==='agent';
  const isOwner = role==='owner';
  const isTenant = role==='tenant';
  const isMaint = role==='maintenance';
  const uid = uidFromToken();

  const [tab, setTab] = useState(role==='maintenance' ? 'tasks' : 'properties');
  const [props, setProps] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [maint, setMaint] = useState([]);
  const [rents, setRents] = useState([]);
  const [leases, setLeases] = useState([]);
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [search, setSearch] = useState('');
  const [ftype, setFtype] = useState('');
  const [fcity, setFcity] = useState('');
  const [form, setForm] = useState({ title:'', type:'Flat', price:'', area:'', address:'', city:'', image:'', ownerEmailOrId:'' });
  const [rentForm, setRentForm] = useState({ propertyId:'', tenantEmailOrId:'', amount:'', month:'' });
  const [leaseForm, setLeaseForm] = useState({ propertyId:'', tenantEmailOrId:'', startDate:'', endDate:'', monthlyRent:'', deposit:'', terms:'' });
  const [revSummary, setRevSummary] = useState({});
  const [revFor, setRevFor] = useState(null);
  const [revList, setRevList] = useState([]);
  const [wishItems, setWishItems] = useState([]);
  const [maintStaff, setMaintStaff] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expForm, setExpForm] = useState({ propertyId:'', title:'', category:'Other', amount:'', date:'', notes:'' });

  const approveProp = async (id)=>{ try{ await api.put('/properties/'+id+'/approve'); toast.success('Property approved & live'); load(); }catch(e){ toast.error('Failed'); } };
  const rejectProp = async (id)=>{ try{ await api.put('/properties/'+id+'/reject'); toast.success('Property rejected'); load(); }catch(e){ toast.error('Failed'); } };
  const payCommission = async (id)=>{ try{ await api.put('/commissions/'+id+'/pay'); toast.success('Commission marked paid'); setCommissions((await api.get('/commissions/all')).data); }catch(e){ toast.error('Failed'); } };
  const addExpense = async (e)=>{ e.preventDefault(); try{ await api.post('/expenses', expForm); toast.success('Expense added'); setExpForm({ propertyId:'', title:'', category:'Other', amount:'', date:'', notes:'' }); setExpenses((await api.get('/expenses/my')).data); }catch(err){ toast.error(err.response?.data?.msg||'Failed'); } };
  const delExpense = async (id)=>{ try{ await api.delete('/expenses/'+id); toast.success('Deleted'); setExpenses(expenses.filter(x=>x._id!==id)); }catch(e){ toast.error('Failed'); } };
  const setMaintPriority = async (id, priority)=>{ try{ await api.put('/maintenance/'+id, { priority }); setMaint(maint.map(m=> m._id===id ? {...m, priority} : m)); toast.success('Priority set to '+priority); }catch(e){ toast.error('Failed'); } };
  const assignMaint = async (id, userId)=>{ try{ await api.put('/maintenance/'+id, { assignedTo: userId }); toast.success(userId?'Task assigned':'Unassigned'); load(); }catch(e){ toast.error('Failed'); } };
  const renewLease = (l)=>{ setLeaseForm({ propertyId: l.property?._id||l.property||'', tenantEmailOrId: l.tenant?.email||'', startDate: l.endDate?l.endDate.slice(0,10):'', endDate:'', monthlyRent: l.monthlyRent||'', deposit: l.deposit||'', terms: l.terms||'' }); toast.info('Form pre-filled — notun end date diye submit koro'); window.scrollTo({top:0,behavior:'smooth'}); };
  const load = async ()=>{
    try{
      let url='/properties?';
      if(search) url+='search='+encodeURIComponent(search)+'&';
      if(ftype) url+='type='+ftype+'&';
      if(fcity) url+='city='+encodeURIComponent(fcity)+'&';
      const res = await api.get(url); setProps(res.data);
    }catch(e){}
    try{ setRevSummary((await api.get('/reviews/summary')).data); }catch(e){}
    try{
      if(isTenant){
        setBookings((await api.get('/bookings/my')).data);
        setMaint((await api.get('/maintenance/my')).data);
        setRents((await api.get('/rents/my')).data);
        setLeases((await api.get('/leases/my')).data);
        setWishItems((await api.get('/wishlist/my')).data.filter(x=>x.property));
        setStats((await api.get('/analytics/summary')).data);
      } else if(isMaint){
        setMaint((await api.get('/maintenance/all')).data);
      } else {
        setBookings((await api.get('/bookings/all')).data);
        setMaint((await api.get('/maintenance/all')).data);
        setRents((await api.get('/rents/all')).data);
        setLeases((await api.get('/leases/all')).data);
        setStats((await api.get('/analytics/summary')).data);
        setCharts((await api.get('/analytics/charts')).data);
        try{ if(role==='admin'){ const u = await api.get('/users/all'); const arr = u.data.users||u.data||[]; setMaintStaff(arr.filter(x=> (x.role||'').toLowerCase()==='maintenance')); } }catch(e){}
        try{ if(role==='admin'||role==='agent') setCommissions((await api.get(role==='admin'?'/commissions/all':'/commissions/my')).data); }catch(e){}
        try{ if(isOwner) setExpenses((await api.get('/expenses/my')).data); }catch(e){}
      }
    }catch(e){}
  };
  useEffect(()=>{ load(); },[]);

  const _allProps = isOwner ? props.filter(p=> String(p.ownerId)===String(uid) || String(p.owner)===String(uid)) : props;
  const myProps = isTenant ? _allProps.filter(p=> p.status==='approved' || !p.status) : _allProps;
  const wishIds = wishItems.map(w=>String(w.property._id));

  const addProp = async (e)=>{
    e.preventDefault();
    try{ await api.post('/properties', { ...form, price: Number(form.price) }); }
    catch(err){ return toast.error(err.response?.data?.msg || 'Failed'); }
    setForm({ title:'', type:'Flat', price:'', area:'', address:'', city:'', image:'', ownerEmailOrId:'' });
    load(); toast.success('Property added'+(role==='admin'?'':' — pending admin approval'));
  };
  const delProp = async (id)=>{ if(!confirm('Delete property?')) return; try{ await api.delete('/properties/'+id); toast.success('Property deleted'); load(); }catch(e){ toast.error('Failed'); } };
  const bookProp = async (id)=>{
    const msg = prompt('Booking message:'); if(!msg) return;
    try{ await api.post('/bookings', { propertyId: id, message: msg }); toast.success('Booking request sent'); load(); }
    catch(e){ toast.error(e.response?.data?.msg||'Failed'); }
  };
  const reqMaint = async (id)=>{
    const issue = prompt('Maintenance issue:'); if(!issue) return;
    try{ await api.post('/maintenance', { propertyId: id, issue }); toast.success('Maintenance requested'); load(); }
    catch(e){ toast.error(e.response?.data?.msg||'Failed'); }
  };
  const updateBooking = async (id, status)=>{ try{ await api.put('/bookings/'+id, { status }); toast.success(status==='approved'?'Booking approved, tenant notified':'Booking rejected, tenant notified'); load(); }catch(e){ toast.error('Failed'); } };
  const cancelBooking = async (id)=>{ if(!confirm('Cancel this booking?')) return; try{ await api.delete('/bookings/'+id); toast.success('Booking cancelled'); load(); }catch(e){ toast.error(e.response?.data?.msg||'Failed'); } };
  const updateMaint = async (id, status)=>{ try{ await api.put('/maintenance/'+id, { status }); toast.success('Marked: '+status); load(); }catch(e){ toast.error('Failed'); } };
  const addRent = async (e)=>{
    e.preventDefault();
    try{
      await api.post('/rents', { ...rentForm, amount: Number(rentForm.amount) });
      setRentForm({ propertyId:'', tenantEmailOrId:'', amount:'', month:'' });
      load(); toast.success('Rent record added, tenant ke email geche');
    }catch(err){ toast.error(err.response?.data?.message || 'Failed'); }
  };
  const markRentPaid = async (id)=>{ try{ await api.put('/rents/'+id, { status:'paid' }); toast.success('Marked as paid'); load(); }catch(e){ toast.error('Failed'); } };
  const addLease = async (e)=>{
    e.preventDefault();
    try{
      await api.post('/leases', leaseForm);
      setLeaseForm({ propertyId:'', tenantEmailOrId:'', startDate:'', endDate:'', monthlyRent:'', deposit:'', terms:'' });
      load(); toast.success('Lease created, tenant ke email geche');
    }catch(err){ toast.error(err.response?.data?.message || 'Failed'); }
  };
  const updateLease = async (id, status)=>{ if(!confirm('Lease '+status+'?')) return; try{ await api.put('/leases/'+id, { status }); toast.success('Lease '+status); load(); }catch(e){ toast.error('Failed'); } };
  const toggleWish = async (pid)=>{
    try{
      const res = await api.post('/wishlist', { propertyId: pid });
      if(res.data.saved){ const w = await api.get('/wishlist/my'); setWishItems((w.data||[]).filter(x=>x.property)); toast.success('Added to wishlist'); }
      else { setWishItems(wishItems.filter(w=>w.property && String(w.property._id)!==String(pid))); toast.info('Removed from wishlist'); }
    }catch(e){ toast.error('Failed'); }
  };

  const addReview = async (pid)=>{
    const rating = prompt('Rating (1-5):'); if(!rating) return;
    const r = parseInt(rating);
    if(!r || r<1 || r>5) return toast.error('Rating must be 1-5');
    const comment = prompt('Review comment (optional):') || '';
    try{ await api.post('/reviews', { propertyId: pid, rating: r, comment }); toast.success('Review added'); }
    catch(err){ return toast.error(err.response?.data?.message||'Failed'); }
    setRevSummary((await api.get('/reviews/summary')).data);
    if(revFor===pid) setRevList((await api.get('/reviews/property/'+pid)).data.reviews);
  };
  const toggleReviews = async (pid)=>{
    if(revFor===pid){ setRevFor(null); return; }
    try{ setRevList((await api.get('/reviews/property/'+pid)).data.reviews); setRevFor(pid); }
    catch(e){ toast.error('Failed to load reviews'); }
  };
  const delReview = async (rid, pid)=>{
    if(!confirm('Delete review?')) return;
    try{ await api.delete('/reviews/'+rid);
      setRevList((await api.get('/reviews/property/'+pid)).data.reviews);
      setRevSummary((await api.get('/reviews/summary')).data); toast.success('Review deleted');
    }catch(e){ toast.error('Failed'); }
  };
  const downloadReceipt = async (id, month)=>{
    try{
      const res = await api.get('/rents/'+id+'/receipt', { responseType:'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], {type:'application/pdf'}));
      const a = document.createElement('a');
      a.href=url; a.download='rent-receipt-'+month+'.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    }catch(e){ toast.error('Download failed'); }
  };

  const tabs = isMaint
    ? [['tasks','My Tasks'],['properties','Properties']]
    : isTenant
      ? [['properties','Properties'],['wishlist','Wishlist'],['bookings','My Bookings'],['maintenance','My Maintenance'],['rents','My Rents'],['leases','My Leases']]
      : (()=>{ const st=[['properties', isOwner?'My Properties':'Properties'],['bookings','Bookings'],['maintenance','Maintenance'],['rents','Rents'],['leases','Leases']];
        if(role==='admin'||role==='agent') st.push(['commissions','Commissions']);
        if(isOwner) st.push(['expenses','Expenses']);
        return st; })();

  const prioColor = (x)=> x==='urgent' ? '#ef4444' : x==='high' ? '#f59e0b' : x==='low' ? '#22c55e' : '#3b82f6';
  const stColor = (s)=> s==='approved'||s==='paid'||s==='done'||s==='active' ? '#22c55e' : (s==='rejected'||s==='expired' ? '#ef4444' : '#f59e0b');

  return (
    <div style={{background:'var(--app-bg)',minHeight:'100vh',color:'var(--app-text)',padding:'16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <h2 style={{margin:0}}>{(ROLE_META[role]||{}).label||'Dashboard'}</h2>
            <span style={{background:(ROLE_META[role]||{}).color||'#64748b',color:'#fff',padding:'3px 12px',borderRadius:20,fontSize:12,fontWeight:'bold'}}>{role.toUpperCase()}</span>
          </div>
          <div style={{color:'var(--app-muted)',fontSize:13,marginTop:4}}>Welcome, {user?.fullName}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}><LiveDateTime /><NotificationBell role={role} /><ThemeToggle /><button onClick={()=>{logout(); nav('/login',{replace:true});}} style={btn('#ef4444')}>Logout</button></div>
      </div>
      <p style={{color:'var(--app-muted)'}}>ID: {user?.uniqueId}</p>

      {(isStaff||isOwner||isTenant) && stats && (
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',margin:'12px 0'}}>
          {isTenant ? (<>
            <div style={card}><small style={{color:'var(--app-muted)'}}>My Bookings (pending)</small><h3 style={{margin:'4px 0'}}>{stats.bookings} ({stats.pendingBookings})</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>My Maintenance (open)</small><h3 style={{margin:'4px 0'}}>{stats.maintenance} ({stats.openMaint})</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Rent Due ₹</small><h3 style={{margin:'4px 0',color:'#f59e0b'}}>{stats.pendingAmount}</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Rent Paid ₹</small><h3 style={{margin:'4px 0',color:'#22c55e'}}>{stats.collectedAmount}</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Active Leases</small><h3 style={{margin:'4px 0'}}>{stats.activeLeases}</h3></div>
          </>) : (<>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Properties</small><h3 style={{margin:'4px 0'}}>{stats.properties}</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Bookings (pending)</small><h3 style={{margin:'4px 0'}}>{stats.bookings} ({stats.pendingBookings})</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Maintenance (open)</small><h3 style={{margin:'4px 0'}}>{stats.maintenance} ({stats.openMaint})</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Rent Due ₹</small><h3 style={{margin:'4px 0',color:'#f59e0b'}}>{stats.pendingAmount}</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Rent Collected ₹</small><h3 style={{margin:'4px 0',color:'#22c55e'}}>{stats.collectedAmount}</h3></div>
          </>)}
        </div>
      )}

      {(isStaff||isOwner) && charts && (
        <div style={{margin:'12px 0',display:'grid',gap:'12px'}}>
          <div style={{background:'var(--app-card)',padding:'14px',borderRadius:'10px'}}>
            <b>Monthly Rent Collected</b>
            {charts.monthlyData.length>0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.monthlyData}>
                  <XAxis dataKey="month" stroke="var(--app-muted)" fontSize={12} />
                  <YAxis stroke="var(--app-muted)" fontSize={12} />
                  <Tooltip contentStyle={{background:'var(--app-bg)',border:'1px solid var(--app-border)'}} />
                  <Bar dataKey="amount" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{color:'var(--app-muted)'}}>No rent data yet.</p>}
          </div>
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
            <div style={{background:'var(--app-card)',padding:'14px',borderRadius:'10px',flex:'1',minWidth:'260px'}}>
              <b>Bookings by Status</b>
              {charts.bookingData.length>0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={charts.bookingData} dataKey="value" nameKey="name" outerRadius={70} label>
                      {charts.bookingData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{background:'var(--app-bg)',border:'1px solid var(--app-border)'}} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{color:'var(--app-muted)'}}>No booking data yet.</p>}
            </div>
            <div style={{background:'var(--app-card)',padding:'14px',borderRadius:'10px',flex:'1',minWidth:'260px'}}>
              <b>Properties by Type</b>
              {charts.typeData.length>0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={charts.typeData} dataKey="value" nameKey="name" outerRadius={70} label>
                      {charts.typeData.map((e,i)=><Cell key={i} fill={COLORS[(i+2)%COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{background:'var(--app-bg)',border:'1px solid var(--app-border)'}} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{color:'var(--app-muted)'}}>No property data yet.</p>}
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',margin:'12px 0'}}>
        {tabs.map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{padding:'10px 18px',borderRadius:'8px',border:'none',background: tab===key ? '#3b82f6' : 'var(--app-card)', color:'var(--app-text)', fontWeight: tab===key?'bold':'normal', cursor:'pointer'}}>{label}</button>
        ))}
      </div>

      {tab==='properties' && (<>
        {role==='admin' && (<>
          <h3>⏳ Pending Approvals ({props.filter(p=>p.status==='pending').length})</h3>
          {props.filter(p=>p.status==='pending').map(p=>(
            <div key={p._id} style={{background:'var(--app-card)',padding:'12px',margin:'8px 0',borderRadius:'10px',borderLeft:'4px solid #f59e0b'}}>
              <b>{p.title}</b> - {p.type} - ₹{p.price}{(p.status||'approved')!=='approved' && <span style={{fontSize:'11px',fontWeight:'bold',padding:'2px 8px',borderRadius:'10px',background:p.status==='pending'?'#f59e0b':'#ef4444',color:'#fff',marginLeft:'6px'}}>{(p.status||'').toUpperCase()}</span>}<br/>
              <small style={{color:'var(--app-muted)'}}>{p.address}, {p.city} | {p.area} sqft</small>
              <div style={{marginTop:'8px',display:'flex',gap:'8px'}}>
                <button onClick={()=>approveProp(p._id)} style={btn('#22c55e')}>Approve</button>
                <button onClick={()=>rejectProp(p._id)} style={btn('#ef4444')}>Reject</button>
              </div>
            </div>
          ))}
          {props.filter(p=>p.status==='pending').length===0 && <p style={{color:'var(--app-muted)'}}>No pending approvals.</p>}
        </>)}
        {isStaff && (<>
          <div style={{display:'flex',gap:'8px',margin:'10px 0',flexWrap:'wrap'}}>
            <input placeholder="Search title..." value={search} onChange={e=>setSearch(e.target.value)} style={inp} />
            <select value={ftype} onChange={e=>setFtype(e.target.value)} style={inp}>
              <option value="">All Types</option><option>Flat</option><option>House</option><option>Office</option><option>Shop</option>
            </select>
            <input placeholder="City..." value={fcity} onChange={e=>setFcity(e.target.value)} style={inp} />
            <button onClick={load} style={btn('#3b82f6')}>Search</button>
          </div>
          <h3>Add Property</h3>
          <form onSubmit={addProp} style={{display:'grid',gap:'8px',maxWidth:'500px',marginBottom:'20px'}}>
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required style={inp} />
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
              <option>Flat</option><option>House</option><option>Office</option><option>Shop</option>
            </select>
            <input placeholder="Price" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required style={inp} />
            <input placeholder="Area sqft" value={form.area} onChange={e=>setForm({...form,area:e.target.value})} required style={inp} />
            <input placeholder="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} required style={inp} />
            <input placeholder="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} required style={inp} />
            <input placeholder="Image URL (optional)" value={form.image} onChange={e=>setForm({...form,image:e.target.value})} style={inp} />
            <input placeholder="Owner Email or ID (optional)" value={form.ownerEmailOrId} onChange={e=>setForm({...form,ownerEmailOrId:e.target.value})} style={inp} />
            <button type="submit" style={btn('#22c55e')}>Add Property</button>
          </form>
        </>)}
        <h3>{isOwner ? 'My Properties' : 'Properties ('+myProps.length+')'}</h3>
        {myProps.map(p=>(
          <div key={p._id} style={{background:'var(--app-card)',padding:'12px',margin:'8px 0',borderRadius:'10px'}}>
            {p.image && <img src={p.image} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}} />}
            <b>{p.title}</b> - {p.type} - ₹{p.price}<br/>
            <small style={{color:'var(--app-muted)'}}>{p.address}, {p.city} | {p.area} sqft</small>
            {revSummary[p._id] && (
              <div style={{marginTop:'4px'}}>
                <span>⭐ {revSummary[p._id].avg}</span>{' '}
                <small style={{color:'var(--app-muted)'}}>({revSummary[p._id].count} reviews)</small>{' '}
                <button onClick={()=>toggleReviews(p._id)} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:'12px'}}>{revFor===p._id?'Hide':'View'}</button>
              </div>
            )}
            {revFor===p._id && (
              <div style={{marginTop:'6px',background:'var(--app-bg)',padding:'8px',borderRadius:'6px'}}>
                {revList.map(rv=>(
                  <div key={rv._id} style={{padding:'6px 0',borderBottom:'1px solid var(--app-card)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px'}}>
                    <div><b>{rv.tenant?.fullName}</b>: {'⭐'.repeat(rv.rating)}<br/><small style={{color:'var(--app-muted)'}}>{rv.comment}</small></div>
                    {isStaff && <button onClick={()=>delReview(rv._id, p._id)} style={btn('#ef4444')}>X</button>}
                  </div>
                ))}
                {revList.length===0 && <small style={{color:'var(--app-muted)'}}>No reviews yet.</small>}
              </div>
            )}
            <div style={{marginTop:'8px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {isTenant && <><button onClick={()=>bookProp(p._id)} style={btn('#3b82f6')}>Book</button><button onClick={()=>reqMaint(p._id)} style={btn('#f59e0b')}>Maintenance</button><button onClick={()=>addReview(p._id)} style={btn('#8b5cf6')}>Review</button><button onClick={()=>toggleWish(p._id)} style={{background:'var(--app-card)',border:'1px solid #ef4444',borderRadius:'6px',padding:'8px 12px',cursor:'pointer',fontSize:'16px'}}>{wishIds.includes(String(p._id))?'❤️':'🤍'}</button></>}
              {isStaff && <button onClick={()=>delProp(p._id)} style={btn('#ef4444')}>Delete</button>}
            </div>
          </div>
        ))}
        {myProps.length===0 && <p style={{color:'var(--app-muted)'}}>No properties found.</p>}
      </>)}

      {tab==='wishlist' && (<>
        <h3>My Wishlist ({wishItems.length})</h3>
        {wishItems.map(w=>(
          <div key={w._id} style={{background:'var(--app-card)',padding:'12px',margin:'8px 0',borderRadius:'10px'}}>
            {w.property.image && <img src={w.property.image} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}} />}
            <b>{w.property.title}</b> - {w.property.type} - ₹{w.property.price}<br/>
            <small style={{color:'var(--app-muted)'}}>{w.property.city}</small>
            <div style={{marginTop:'8px',display:'flex',gap:'8px'}}>
              <button onClick={()=>bookProp(w.property._id)} style={btn('#3b82f6')}>Book</button>
              <button onClick={()=>toggleWish(w.property._id)} style={btn('#ef4444')}>Remove ❤️</button>
            </div>
          </div>
        ))}
        {wishItems.length===0 && <p style={{color:'var(--app-muted)'}}>No favorites yet. Tap 🤍 on properties.</p>}
      </>)}

      {tab==='bookings' && (<>
        <h3>{isTenant ? 'My Bookings' : 'Bookings ('+bookings.length+')'}</h3>
        {bookings.map(b=>(
          <div key={b._id} style={{background:'var(--app-card)',padding:'10px',margin:'6px 0',borderRadius:'8px'}}>
            <b>{b.property?.title}</b>{b.tenant?.fullName && <> by {b.tenant.fullName}</>} - <span style={{color:stColor(b.status)}}>{b.status||'pending'}</span>
            {b.message && <div><small style={{color:'var(--app-muted)'}}>{b.message}</small></div>}
            {(isStaff||isOwner) && b.status!=='approved' && b.status!=='rejected' && (
              <div style={{marginTop:'6px',display:'flex',gap:'6px'}}>
                <button onClick={()=>updateBooking(b._id,'approved')} style={btn('#22c55e')}>Approve</button>
                <button onClick={()=>updateBooking(b._id,'rejected')} style={btn('#ef4444')}>Reject</button>
              </div>
            )}
            {isTenant && (b.status==='pending'||!b.status) && (
              <div style={{marginTop:'6px'}}>
                <button onClick={()=>cancelBooking(b._id)} style={btn('#ef4444')}>Cancel Booking</button>
              </div>
            )}
          </div>
        ))}
        {bookings.length===0 && <p style={{color:'var(--app-muted)'}}>No bookings.</p>}
      </>)}

      {(tab==='maintenance'||tab==='tasks') && (<>
        <h3>{isTenant ? 'My Maintenance Requests' : isMaint ? 'Assigned Tasks' : 'Maintenance ('+maint.length+')'}</h3>
        {maint.map(m=>(
          <div key={m._id} style={{background:'var(--app-border)',padding:'10px',margin:'6px 0',borderRadius:'8px',borderLeft:'4px solid '+prioColor(m.priority||'medium')}}>
            <b>{m.property?.title}</b> - {m.issue}
            <span style={{fontSize:'11px',fontWeight:'bold',padding:'2px 8px',borderRadius:'10px',background:prioColor(m.priority||'medium'),color:'#fff',marginLeft:'6px'}}>{(m.priority||'medium').toUpperCase()}</span>
            {isMaint && String(m.assignedTo?._id||m.assignedTo)===String(uid) && <span style={{fontSize:'11px',fontWeight:'bold',marginLeft:'6px'}}>⭐ MY TASK</span>}
            {m.tenant?.fullName && <><br/><small style={{color:'var(--app-muted)'}}>by {m.tenant.fullName}</small></>} - <span style={{color:stColor(m.status)}}>{m.status||'pending'}</span>
            {m.assignedTo?.fullName && <><br/><small style={{color:'var(--app-muted)'}}>👷 {m.assignedTo.fullName}</small></>}
            {(isStaff||isOwner||isMaint) && (
              <div style={{marginTop:'6px',display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                {m.status!=='done' && <><button onClick={()=>updateMaint(m._id,'in-progress')} style={btn('#f59e0b')}>Start</button><button onClick={()=>updateMaint(m._id,'done')} style={btn('#22c55e')}>Done</button></>}
                <select value={m.priority||'medium'} onChange={e=>setMaintPriority(m._id,e.target.value)} style={inp} title="Priority">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                {role==='admin' && (
                  <select value={m.assignedTo?._id||m.assignedTo||''} onChange={e=>assignMaint(m._id,e.target.value)} style={inp} title="Assign staff">
                    <option value="">Assign staff...</option>
                    {maintStaff.map(u=><option key={u._id} value={u._id}>{u.fullName}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        ))}
        {maint.length===0 && <p style={{color:'var(--app-muted)'}}>No maintenance requests.</p>}
      </>)}

      {tab==='rents' && (<>
        <h3>{isTenant ? 'My Rents' : 'Rents ('+rents.length+')'}</h3>
        {(isStaff||isOwner) && (
          <form onSubmit={addRent} style={{display:'grid',gap:'8px',maxWidth:'500px',marginBottom:'16px',background:'var(--app-card)',padding:'14px',borderRadius:'10px'}}>
            <b>Add Rent Record</b>
            <select value={rentForm.propertyId} onChange={e=>setRentForm({...rentForm,propertyId:e.target.value})} required style={inp}>
              <option value="">Select Property</option>
              {myProps.map(p=><option key={p._id} value={p._id}>{p.title} - {p.city}</option>)}
            </select>
            <input placeholder="Tenant Email or ID" value={rentForm.tenantEmailOrId} onChange={e=>setRentForm({...rentForm,tenantEmailOrId:e.target.value})} required style={inp} />
            <input placeholder="Amount ₹" type="number" value={rentForm.amount} onChange={e=>setRentForm({...rentForm,amount:e.target.value})} required style={inp} />
            <input type="month" value={rentForm.month} onChange={e=>setRentForm({...rentForm,month:e.target.value})} required style={inp} />
            <button type="submit" style={btn('#22c55e')}>Add Rent</button>
          </form>
        )}
        {rents.map(r=>(
          <div key={r._id} style={{background:'var(--app-card)',padding:'10px',margin:'6px 0',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <b>{r.property?.title}</b> - {r.month} - ₹{r.amount}
              {r.tenant?.fullName && <><br/><small style={{color:'var(--app-muted)'}}>{r.tenant.fullName}</small></>}
              {' '}- <span style={{color:stColor(r.status)}}>{r.status}</span>
            </div>
            <div style={{display:'flex',gap:'6px'}}>
              {r.status==='paid' && <button onClick={()=>downloadReceipt(r._id, r.month)} style={btn('#8b5cf6')}>Receipt</button>}
              {r.status!=='paid' && (
                isTenant
                  ? <button onClick={()=>markRentPaid(r._id)} style={btn('#22c55e')}>Pay Now</button>
                  : <button onClick={()=>markRentPaid(r._id)} style={btn('#3b82f6')}>Mark Paid</button>
              )}
            </div>
          </div>
        ))}
        {rents.length===0 && <p style={{color:'var(--app-muted)'}}>No rent records.</p>}
      </>)}

      {tab==='commissions' && (<>
        <h3>Commissions</h3>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',margin:'12px 0'}}>
          <div style={card}><small style={{color:'var(--app-muted)'}}>Total Earned ₹</small><h3 style={{margin:'4px 0'}}>{commissions.reduce((a,c)=>a+Number(c.amount||0),0)}</h3></div>
          <div style={card}><small style={{color:'var(--app-muted)'}}>Pending ₹</small><h3 style={{margin:'4px 0',color:'#f59e0b'}}>{commissions.filter(c=>c.status==='pending').reduce((a,c)=>a+Number(c.amount||0),0)}</h3></div>
          <div style={card}><small style={{color:'var(--app-muted)'}}>Paid ₹</small><h3 style={{margin:'4px 0',color:'#22c55e'}}>{commissions.filter(c=>c.status==='paid').reduce((a,c)=>a+Number(c.amount||0),0)}</h3></div>
        </div>
        <small style={{color:'var(--app-muted)'}}>2% of property price on every approved booking.</small>
        {commissions.map(c=>(
          <div key={c._id} style={{background:'var(--app-card)',padding:'12px',margin:'8px 0',borderRadius:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
            <div>
              <b>{c.property?.title||'Property'}</b> <small style={{color:'var(--app-muted)'}}>({c.percent}%)</small><br/>
              <span style={{fontSize:'18px',fontWeight:'800'}}>₹{c.amount}</span>{' '}
              <span style={{color:stColor(c.status),fontWeight:'bold',fontSize:'12px'}}>{c.status.toUpperCase()}</span><br/>
              {role==='admin' && c.agentId?.fullName && <small style={{color:'var(--app-muted)'}}>Agent: {c.agentId.fullName} ({c.agentId.email})</small>}
            </div>
            {role==='admin' && c.status==='pending' && <button onClick={()=>payCommission(c._id)} style={btn('#22c55e')}>Mark Paid</button>}
          </div>
        ))}
        {commissions.length===0 && <p style={{color:'var(--app-muted)'}}>No commissions yet.</p>}
      </>)}

      {tab==='expenses' && (<>
        <h3>Expenses & Profit</h3>
        {(()=>{ const myIds = new Set(myProps.map(p=>String(p._id)));
          const collected = rents.filter(rt=> myIds.has(String(rt.property?._id||rt.property)) && rt.status==='paid').reduce((a,rt)=>a+Number(rt.amount||0),0);
          const spent = expenses.reduce((a,e)=>a+Number(e.amount||0),0);
          return (
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap',margin:'12px 0'}}>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Rent Collected ₹</small><h3 style={{margin:'4px 0',color:'#22c55e'}}>{collected}</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Total Expenses ₹</small><h3 style={{margin:'4px 0',color:'#ef4444'}}>{spent}</h3></div>
            <div style={card}><small style={{color:'var(--app-muted)'}}>Net Profit ₹</small><h3 style={{margin:'4px 0',color:collected-spent>=0?'#22c55e':'#ef4444'}}>{collected-spent}</h3></div>
          </div> ); })()}
        <form onSubmit={addExpense} style={{display:'grid',gap:'8px',maxWidth:'500px',marginBottom:'16px',background:'var(--app-card)',padding:'14px',borderRadius:'10px'}}>
          <b>Add Expense</b>
          <select value={expForm.propertyId} onChange={e=>setExpForm({...expForm,propertyId:e.target.value})} required style={inp}>
            <option value="">Select Property</option>
            {myProps.map(p=><option key={p._id} value={p._id}>{p.title} - {p.city}</option>)}
          </select>
          <input placeholder="Title (e.g. Plumbing repair)" value={expForm.title} onChange={e=>setExpForm({...expForm,title:e.target.value})} required style={inp} />
          <select value={expForm.category} onChange={e=>setExpForm({...expForm,category:e.target.value})} style={inp}>
            <option>Maintenance</option><option>Repair</option><option>Tax</option><option>Insurance</option><option>Utilities</option><option>Other</option>
          </select>
          <input placeholder="Amount ₹" type="number" value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} required style={inp} />
          <input type="date" value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})} style={inp} />
          <input placeholder="Notes (optional)" value={expForm.notes} onChange={e=>setExpForm({...expForm,notes:e.target.value})} style={inp} />
          <button type="submit" style={btn('#22c55e')}>Add Expense</button>
        </form>
        {expenses.map(e=>(
          <div key={e._id} style={{background:'var(--app-card)',padding:'12px',margin:'8px 0',borderRadius:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px'}}>
            <div>
              <b>{e.title}</b> <small style={{color:'var(--app-muted)'}}>({e.category})</small><br/>
              <span style={{fontWeight:'800'}}>₹{e.amount}</span>{' '}
              <small style={{color:'var(--app-muted)'}}>{e.property?.title}{e.date && ' | '+new Date(e.date).toLocaleDateString()}</small>
              {e.notes && <><br/><small style={{color:'var(--app-muted)'}}>{e.notes}</small></>}
            </div>
            <button onClick={()=>delExpense(e._id)} style={btn('#ef4444')}>Delete</button>
          </div>
        ))}
        {expenses.length===0 && <p style={{color:'var(--app-muted)'}}>No expenses yet.</p>}
      </>)}

      {tab==='leases' && (<>
        <h3>{isTenant ? 'My Leases' : 'Leases ('+leases.length+')'}</h3>
        {(isStaff||isOwner) && (
          <form onSubmit={addLease} style={{display:'grid',gap:'8px',maxWidth:'500px',marginBottom:'16px',background:'var(--app-card)',padding:'14px',borderRadius:'10px'}}>
            <b>New Lease Agreement</b>
            <select value={leaseForm.propertyId} onChange={e=>setLeaseForm({...leaseForm,propertyId:e.target.value})} required style={inp}>
              <option value="">Select Property</option>
              {myProps.map(p=><option key={p._id} value={p._id}>{p.title} - {p.city}</option>)}
            </select>
            <input placeholder="Tenant Email or ID" value={leaseForm.tenantEmailOrId} onChange={e=>setLeaseForm({...leaseForm,tenantEmailOrId:e.target.value})} required style={inp} />
            <label style={{fontSize:'12px',color:'var(--app-muted)'}}>Start Date</label>
            <input type="date" value={leaseForm.startDate} onChange={e=>setLeaseForm({...leaseForm,startDate:e.target.value})} required style={inp} />
            <label style={{fontSize:'12px',color:'var(--app-muted)'}}>End Date</label>
            <input type="date" value={leaseForm.endDate} onChange={e=>setLeaseForm({...leaseForm,endDate:e.target.value})} required style={inp} />
            <input placeholder="Monthly Rent ₹" type="number" value={leaseForm.monthlyRent} onChange={e=>setLeaseForm({...leaseForm,monthlyRent:e.target.value})} required style={inp} />
            <input placeholder="Deposit ₹ (optional)" type="number" value={leaseForm.deposit} onChange={e=>setLeaseForm({...leaseForm,deposit:e.target.value})} style={inp} />
            <textarea placeholder="Terms & conditions (optional)" value={leaseForm.terms} onChange={e=>setLeaseForm({...leaseForm,terms:e.target.value})} style={{...inp,minHeight:'60px'}} />
            <button type="submit" style={btn('#22c55e')}>Create Lease</button>
          </form>
        )}
        {leases.map(l=>(
          <div key={l._id} style={{background:'var(--app-card)',padding:'12px',margin:'8px 0',borderRadius:'10px',borderLeft: l.status==='active'&&l.daysRemaining<=30&&l.daysRemaining>=0 ? '4px solid #f59e0b' : '4px solid transparent'}}>
            <b>{l.property?.title}</b>{l.tenant?.fullName && <> - {l.tenant.fullName}</>}<br/>
            <small style={{color:'var(--app-muted)'}}>Period: {fmtD(l.startDate)} → {fmtD(l.endDate)}</small><br/>
            <span>Monthly: ₹{l.monthlyRent} | Deposit: ₹{l.deposit}</span><br/>
            {l.terms && <small style={{color:'var(--app-muted)'}}>Terms: {l.terms}</small>}
            <div style={{marginTop:'6px'}}>
              <span style={{color:stColor(l.status),fontWeight:'bold'}}>{l.status.toUpperCase()}</span>
              {(isStaff||isOwner) && l.status==='active' && <button onClick={()=>renewLease(l)} style={{...btn('#8b5cf6'),marginLeft:'8px',padding:'6px 12px'}}>Renew</button>}
              {l.status==='active' && l.daysRemaining>=0 && l.daysRemaining<=30 && <span style={{color:'#f59e0b'}}> — Expiring in {l.daysRemaining} days!</span>}
              {l.status==='active' && l.daysRemaining>30 && <small style={{color:'var(--app-muted)'}}> — {l.daysRemaining} days left</small>}
              {l.status==='expired' && <span style={{color:'#ef4444'}}> — Expired</span>}
            </div>
            {(isStaff||isOwner) && l.status==='active' && (
              <button onClick={()=>updateLease(l._id,'terminated')} style={{...btn('#ef4444'),marginTop:'6px'}}>Terminate</button>
            )}
          </div>
        ))}
        {leases.length===0 && <p style={{color:'var(--app-muted)'}}>No leases yet.</p>}
      </>)}
    </div>
  );
}
