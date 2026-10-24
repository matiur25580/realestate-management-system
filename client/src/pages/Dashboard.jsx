import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
export default function Dashboard(){
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [props, setProps] = useState([]);
  const [form, setForm] = useState({ title:'', type:'Flat', price:'', area:'', address:'', city:'' });
  const load = async ()=>{ const res = await api.get('/properties'); setProps(res.data); };
  useEffect(()=>{ load(); },[]);
  const addProp = async (e)=>{
    e.preventDefault();
    await api.post('/properties', { ...form, price: Number(form.price) });
    setForm({ title:'', type:'Flat', price:'', area:'', address:'', city:'' });
    load();
  };
  const del = async (id)=>{ if(!confirm('Delete?')) return; await api.delete(`/properties/${id}`); load(); };
  return (
    <div style={{background:'#0f172a',minHeight:'100vh',color:'#fff',padding:'20px'}}>
      <div style={{display:'flex',justifyContent:'space-between'}}>
        <h2>Welcome {user?.fullName} ({user?.role})</h2>
        <button onClick={()=>{logout(); nav('/login');}}>Logout</button>
      </div>
      <p>Unique ID: {user?.uniqueId}</p>
      <h3>Add Property</h3>
      <form onSubmit={addProp} style={{display:'grid',gap:'8px',maxWidth:'500px'}}>
        <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required style={{padding:'8px'}} />
        <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{padding:'8px'}}>
          <option>Flat</option><option>House</option><option>Office</option><option>Shop</option>
        </select>
        <input placeholder="Price" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required style={{padding:'8px'}} />
        <input placeholder="Area sqft" value={form.area} onChange={e=>setForm({...form,area:e.target.value})} required style={{padding:'8px'}} />
        <input placeholder="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} required style={{padding:'8px'}} />
        <input placeholder="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} required style={{padding:'8px'}} />
        <button type="submit" style={{padding:'10px',background:'#22c55e',color:'#fff',border:'none'}}>Add Property</button>
      </form>
      <h3>Properties ({props.length})</h3>
      {props.map(p=>(
        <div key={p._id} style={{background:'#1e293b',padding:'12px',margin:'8px 0',borderRadius:'8px',display:'flex',justifyContent:'space-between'}}>
          <div><b>{p.title}</b> - {p.type} - ₹{p.price}<br/><small>{p.address}, {p.city}</small></div>
          <button onClick={()=>del(p._id)} style={{background:'#ef4444',color:'#fff',border:'none',height:'fit-content',padding:'6px 10px'}}>Delete</button>
        </div>
      ))}
    </div>
  );
}
