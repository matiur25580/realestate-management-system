import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register(){
  const [form, setForm] = useState({ fullName:'', email:'', contactNumber:'', dob:'', role:'Tenant', password:'', confirm:'' });
  const nav = useNavigate();
  const handle = async (e)=>{
    e.preventDefault();
    if(form.password !== form.confirm) return alert('Password mismatch');
    if(form.dob.length !== 8) return alert('DOB must be DDMMYYYY 8 digits');
    try{
      await api.post('/auth/register', form);
      localStorage.setItem('pendingEmail', form.email);
      nav('/verify-otp');
    }catch(err){ alert(err.response?.data?.message || 'Failed'); }
  };
  return (
    <div style={{minHeight:'100vh',display:'flex',justifyContent:'center',alignItems:'center',background:'#0f172a',color:'#fff',padding:'20px'}}>
      <form onSubmit={handle} style={{width:'100%',maxWidth:'420px',background:'#1e293b',padding:'28px',borderRadius:'12px'}}>
        <h2 style={{textAlign:'center'}}>Register</h2>
        <input placeholder="Full Name" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} style={{width:'100%',padding:'10px',margin:'6px 0'}} required />
        <input placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{width:'100%',padding:'10px',margin:'6px 0'}} required />
        <input placeholder="Contact Number" value={form.contactNumber} onChange={e=>setForm({...form,contactNumber:e.target.value})} style={{width:'100%',padding:'10px',margin:'6px 0'}} required />
        <input placeholder="DOB DDMMYYYY" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})} style={{width:'100%',padding:'10px',margin:'6px 0'}} required />
        <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={{width:'100%',padding:'10px',margin:'6px 0'}}>
          <option>Admin</option><option>Agent</option><option>Owner</option><option>Tenant</option><option>Maintenance</option>
        </select>
        <input type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={{width:'100%',padding:'10px',margin:'6px 0'}} required />
        <input type="password" placeholder="Confirm Password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} style={{width:'100%',padding:'10px',margin:'6px 0'}} required />
        <button type="submit" style={{width:'100%',padding:'12px',background:'#22c55e',border:'none',color:'#fff',borderRadius:'8px'}}>Send OTP</button>
        <p style={{textAlign:'center'}}>Have account? <Link to="/login" style={{color:'#60a5fa'}}>Login</Link></p>
      </form>
    </div>
  );
}
