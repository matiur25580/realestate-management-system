import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const uidFromToken = ()=>{ try{ const t=localStorage.getItem('token'); return JSON.parse(atob(t.split('.')[1])).id; }catch(e){ return null; } };
const card = { background:'#1e293b', padding:'14px', borderRadius:'10px', minWidth:'130px', flex:'1' };
const inp = { padding:'8px', borderRadius:'6px', border:'1px solid #475569' };
const btn = (bg)=> ({ background:bg, color:'#fff', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer' });

export default function Dashboard(){
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
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [ftype, setFtype] = useState('');
  const [fcity, setFcity] = useState('');
  const [form, setForm] = useState({ title:'', type:'Flat', price:'', area:'', address:'', city:'', image:'', ownerEmailOrId:'' });
  const [rentForm, setRentForm] = useState({ propertyId:'', tenantEmailOrId:'', amount:'', month:'' });

  const load = async ()=>{
    try{
      let url='/properties?';
      if(search) url+='search='+encodeURIComponent(search)+'&';
      if(ftype) url+='type='+ftype+'&';
      if(fcity) url+='city='+encodeURIComponent(fcity)+'&';
      const res = await api.get(url); setProps(res.data);
    }catch(e){}
    try{
      if(isTenant){
        setBookings((await api.get('/bookings/my')).data);
        setMaint((await api.get('/maintenance/my')).data);
        setRents((await api.get('/rents/my')).data);
      } else if(isMaint){
        setMaint((await api.get('/maintenance/all')).data);
      } else {
        setBookings((await api.get('/bookings/all')).data);
        setMaint((await api.get('/maintenance/all')).data);
        setRents((await api.get('/rents/all')).data);
        setStats((await api.get('/analytics/summary')).data);
      }
    }catch(e){}
  };
  useEffect(()=>{ load(); },[]);

  const myProps = isOwner ? props.filter(p=> String(p.ownerId)===String(uid) || String(p.owner)===String(uid)) : props;

  const addProp = async (e)=>{
    e.preventDefault();
    try{ await api.post('/properties', { ...form, price: Number(form.price) }); }
    catch(err){ return alert(err.response?.data?.msg || 'Failed'); }
    setForm({ title:'', type:'Flat', price:'', area:'', address:'', city:'', image:'', ownerEmailOrId:'' });
    load();
  };
  const delProp = async (id)=>{ if(!confirm('Delete property?')) return; await api.delete('/properties/'+id); load(); };
  const bookProp = async (id)=>{
    const msg = prompt('Booking message:'); if(!msg) return;
    await api.post('/bookings', { propertyId: id, message: msg });
    alert('Booking request sent'); load();
  };
  const reqMaint = async (id)=>{
    const issue = prompt('Maintenance issue:'); if(!issue) return;
    await api.post('/maintenance', { propertyId: id, issue });
    alert('Maintenance requested'); load();
  };
  const updateBooking = async (id, status)=>{ await api.put('/bookings/'+id, { status }); load(); };
  const updateMaint = async (id, status)=>{ await api.put('/maintenance/'+id, { status }); load(); };
  const addRent = async (e)=>{
    e.preventDefault();
    try{
      await api.post('/rents', { ...rentForm, amount: Number(rentForm.amount) });
      setRentForm({ propertyId:'', tenantEmailOrId:'', amount:'', month:'' });
      load(); alert('Rent record added');
    }catch(err){ alert(err.response?.data?.message || 'Failed'); }
  };
  const markRentPaid = async (id)=>{ await api.put('/rents/'+id, { status:'paid' }); load(); };

  const tabs = isMaint
    ? [['tasks','My Tasks'],['properties','Properties']]
    : [['properties', isOwner?'My Properties':'Properties'],
       ['bookings', isTenant?'My Bookings':'Bookings'],
       ['maintenance', isTenant?'My Maintenance':'Maintenance'],
       ['rents', isTenant?'My Rents':'Rents']];

  const stColor = (s)=> s==='approved'||s==='paid'||s==='done' ? '#22c55e' : (s==='rejected' ? '#ef4444' : '#f59e0b');

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',color:'#fff',padding:'16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
        <h2 style={{margin:0}}>{role.toUpperCase()} - {user?.fullName}</h2>
        <button onClick={()=>{logout(); nav('/login');}} style={btn('#ef4444')}>Logout</button>
      </div>
      <p style={{color:'#94a3b8'}}>ID: {user?.uniqueId}</p>

      {(isStaff||isOwner) && stats && (
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',margin:'12px 0'}}>
          <div style={card}><small style={{color:'#94a3b8'}}>Properties</small><h3 style={{margin:'4px 0'}}>{stats.properties}</h3></div>
          <div style={card}><small style={{color:'#94a3b8'}}>Bookings (pending)</small><h3 style={{margin:'4px 0'}}>{stats.bookings} ({stats.pendingBookings})</h3></div>
          <div style={card}><small style={{color:'#94a3b8'}}>Maintenance (open)</small><h3 style={{margin:'4px 0'}}>{stats.maintenance} ({stats.openMaint})</h3></div>
          <div style={card}><small style={{color:'#94a3b8'}}>Rent Due ₹</small><h3 style={{margin:'4px 0',color:'#f59e0b'}}>{stats.pendingAmount}</h3></div>
          <div style={card}><small style={{color:'#94a3b8'}}>Rent Collected ₹</small><h3 style={{margin:'4px 0',color:'#22c55e'}}>{stats.collectedAmount}</h3></div>
        </div>
      )}

      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',margin:'12px 0'}}>
        {tabs.map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{padding:'10px 18px',borderRadius:'8px',border:'none',background: tab===key ? '#3b82f6' : '#1e293b', color:'#fff', fontWeight: tab===key?'bold':'normal', cursor:'pointer'}}>{label}</button>
        ))}
      </div>

      {tab==='properties' && (<>
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
          <div key={p._id} style={{background:'#1e293b',padding:'12px',margin:'8px 0',borderRadius:'10px'}}>
            {p.image && <img src={p.image} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}} />}
            <b>{p.title}</b> - {p.type} - ₹{p.price}<br/>
            <small style={{color:'#94a3b8'}}>{p.address}, {p.city} | {p.area} sqft</small>
            <div style={{marginTop:'8px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {isTenant && <><button onClick={()=>bookProp(p._id)} style={btn('#3b82f6')}>Book</button><button onClick={()=>reqMaint(p._id)} style={btn('#f59e0b')}>Maintenance</button></>}
              {isStaff && <button onClick={()=>delProp(p._id)} style={btn('#ef4444')}>Delete</button>}
            </div>
          </div>
        ))}
        {myProps.length===0 && <p style={{color:'#94a3b8'}}>No properties found.</p>}
      </>)}

      {tab==='bookings' && (<>
        <h3>{isTenant ? 'My Bookings' : 'Bookings ('+bookings.length+')'}</h3>
        {bookings.map(b=>(
          <div key={b._id} style={{background:'#1e293b',padding:'10px',margin:'6px 0',borderRadius:'8px'}}>
            <b>{b.property?.title}</b>{b.tenant?.fullName && <> by {b.tenant.fullName}</>} - <span style={{color:stColor(b.status)}}>{b.status||'pending'}</span>
            {b.message && <div><small style={{color:'#94a3b8'}}>{b.message}</small></div>}
            {(isStaff||isOwner) && b.status!=='approved' && b.status!=='rejected' && (
              <div style={{marginTop:'6px',display:'flex',gap:'6px'}}>
                <button onClick={()=>updateBooking(b._id,'approved')} style={btn('#22c55e')}>Approve</button>
                <button onClick={()=>updateBooking(b._id,'rejected')} style={btn('#ef4444')}>Reject</button>
              </div>
            )}
          </div>
        ))}
        {bookings.length===0 && <p style={{color:'#94a3b8'}}>No bookings.</p>}
      </>)}

      {(tab==='maintenance'||tab==='tasks') && (<>
        <h3>{isTenant ? 'My Maintenance Requests' : isMaint ? 'Assigned Tasks' : 'Maintenance ('+maint.length+')'}</h3>
        {maint.map(m=>(
          <div key={m._id} style={{background:'#334155',padding:'10px',margin:'6px 0',borderRadius:'8px'}}>
            <b>{m.property?.title}</b> - {m.issue}
            {m.tenant?.fullName && <><br/><small style={{color:'#94a3b8'}}>by {m.tenant.fullName}</small></>} - <span style={{color:stColor(m.status)}}>{m.status||'pending'}</span>
            {(isStaff||isOwner||isMaint) && m.status!=='done' && (
              <div style={{marginTop:'6px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                <button onClick={()=>updateMaint(m._id,'in-progress')} style={btn('#f59e0b')}>Start</button>
                <button onClick={()=>updateMaint(m._id,'done')} style={btn('#22c55e')}>Done</button>
              </div>
            )}
          </div>
        ))}
        {maint.length===0 && <p style={{color:'#94a3b8'}}>No maintenance requests.</p>}
      </>)}

      {tab==='rents' && (<>
        <h3>{isTenant ? 'My Rents' : 'Rents ('+rents.length+')'}</h3>
        {(isStaff||isOwner) && (
          <form onSubmit={addRent} style={{display:'grid',gap:'8px',maxWidth:'500px',marginBottom:'16px',background:'#1e293b',padding:'14px',borderRadius:'10px'}}>
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
          <div key={r._id} style={{background:'#1e293b',padding:'10px',margin:'6px 0',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <b>{r.property?.title}</b> - {r.month} - ₹{r.amount}
              {r.tenant?.fullName && <><br/><small style={{color:'#94a3b8'}}>{r.tenant.fullName}</small></>}
              {' '}- <span style={{color:stColor(r.status)}}>{r.status}</span>
            </div>
            {r.status!=='paid' && (
              isTenant
                ? <button onClick={()=>markRentPaid(r._id)} style={btn('#22c55e')}>Pay Now</button>
                : <button onClick={()=>markRentPaid(r._id)} style={btn('#3b82f6')}>Mark Paid</button>
            )}
          </div>
        ))}
        {rents.length===0 && <p style={{color:'#94a3b8'}}>No rent records.</p>}
      </>)}
    </div>
  );
}
