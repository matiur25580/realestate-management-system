import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
export default function Dashboard(){
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [props, setProps] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [maint, setMaint] = useState([]);
  const [form, setForm] = useState({ title:'', type:'Flat', price:'', area:'', address:'', city:'' });
  const role = (user?.role || '').toLowerCase();
  const isStaff = role==='admin' || role==='agent';

  const load = async ()=>{
    const res = await api.get('/properties'); setProps(res.data);
    try{
      if(role==='tenant'){
        const b = await api.get('/bookings/my'); setBookings(b.data);
        const m = await api.get('/maintenance/my'); setMaint(m.data);
      } else {
        const b = await api.get('/bookings/all'); setBookings(b.data);
        const m = await api.get('/maintenance/all'); setMaint(m.data);
      }
    }catch(e){}
  };
  useEffect(()=>{ load(); },[]);

  const addProp = async (e)=>{
    e.preventDefault();
    await api.post('/properties', { ...form, price: Number(form.price) });
    setForm({ title:'', type:'Flat', price:'', area:'', address:'', city:'' });
    load();
  };
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
  const updateBooking = async (id, status)=>{ await api.put(`/bookings/${id}`, { status }); load(); };

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',color:'#fff',padding:'20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>{role.toUpperCase()} - {user?.fullName}</h2>
        <button onClick={()=>{logout(); nav('/login');}} style={{padding:'8px 16px'}}>Logout</button>
      </div>
      <p>ID: {user?.uniqueId} | role:[{user?.role}]</p>

      {isStaff ? (
        <>
          <h3>Add Property</h3>
          <form onSubmit={addProp} style={{display:'grid',gap:'8px',maxWidth:'500px',marginBottom:'20px'}}>
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required style={{padding:'8px',color:'#000'}} />
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{padding:'8px',color:'#000'}}>
              <option>Flat</option><option>House</option><option>Office</option><option>Shop</option>
            </select>
            <input placeholder="Price" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required style={{padding:'8px',color:'#000'}} />
            <input placeholder="Area sqft" value={form.area} onChange={e=>setForm({...form,area:e.target.value})} required style={{padding:'8px',color:'#000'}} />
            <input placeholder="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} required style={{padding:'8px',color:'#000'}} />
            <input placeholder="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} required style={{padding:'8px',color:'#000'}} />
            <button type="submit" style={{padding:'10px',background:'#22c55e',color:'#fff',border:'none'}}>Add Property</button>
          </form>

          <h3>All Bookings ({bookings.length})</h3>
          {bookings.map(b=>(
            <div key={b._id} style={{background:'#1e293b',padding:'10px',margin:'6px 0',borderRadius:'8px'}}>
              <b>{b.property?.title}</b> by {b.tenant?.fullName} - {b.status}
              <div style={{marginTop:'6px'}}>
                <button onClick={()=>updateBooking(b._id,'approved')} style={{marginRight:'6px'}}>Approve</button>
                <button onClick={()=>updateBooking(b._id,'rejected')}>Reject</button>
              </div>
            </div>
          ))}
          <h3>Maintenance ({maint.length})</h3>
          {maint.map(m=>(
            <div key={m._id} style={{background:'#334155',padding:'10px',margin:'6px 0',borderRadius:'8px'}}>
              <b>{m.property?.title}</b> - {m.issue} - {m.status}
            </div>
          ))}
        </>
      ) : <p style={{color:'yellow'}}>Staff view not enabled - role=[{user?.role}]</p>}

      <h3>Properties ({props.length})</h3>
      {props.map(p=>(
        <div key={p._id} style={{background:'#1e293b',padding:'12px',margin:'8px 0',borderRadius:'8px'}}>
          <b>{p.title}</b> - {p.type} - ₹{p.price}<br/>
          <small>{p.address}, {p.city}</small>
          {role==='tenant' && (
            <div style={{marginTop:'8px'}}>
              <button onClick={()=>bookProp(p._id)} style={{marginRight:'8px'}}>Book</button>
              <button onClick={()=>reqMaint(p._id)}>Maintenance</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
