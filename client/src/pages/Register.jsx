import { useState } from 'react'
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle';
import { pageWrap, card, logo, title, subtitle, label, inp, btn, link, footer } from '../components/authStyles';

export default function Register(){
  const toast = useToast();
  const [form, setForm] = useState({ fullName:'', email:'', contactNumber:'', dob:'', role:'Tenant', password:'', confirm:'' });
  const nav = useNavigate();
  const set = (k)=> (e)=> setForm({...form,[k]:e.target.value});

  const handle = async (e)=>{
    e.preventDefault();
    if(form.password !== form.confirm) return toast.error('Password mismatch');
    if(form.dob.length !== 8) return toast.error('DOB must be DDMMYYYY 8 digits');
    try{
      await api.post('/auth/register', form);
      localStorage.setItem('pendingEmail', form.email);
      nav('/verify-otp');
    }catch(err){ toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={pageWrap}>
      <div style={{position:'fixed',top:16,right:16,zIndex:50}}><ThemeToggle /></div>
      <form onSubmit={handle} style={card}>
        <div style={logo}>🏠</div>
        <h2 style={title}>Create Account</h2>
        <p style={subtitle}>Join RealEstate Pro today</p>

        <label style={label}>Full Name</label>
        <input placeholder="Enter your full name" value={form.fullName} onChange={set('fullName')} className="auth-inp" style={inp} required />

        <label style={label}>Email</label>
        <input placeholder="Enter email address" type="email" value={form.email} onChange={set('email')} className="auth-inp" style={inp} required />

        <label style={label}>Contact Number</label>
        <input placeholder="Enter contact number" value={form.contactNumber} onChange={set('contactNumber')} className="auth-inp" style={inp} required />

        <label style={label}>Date of Birth</label>
        <input placeholder="DDMMYYYY (8 digits)" value={form.dob} onChange={set('dob')} className="auth-inp" style={inp} required />

        <label style={label}>Account Role</label>
        <select value={form.role} onChange={set('role')} className="auth-inp" style={inp}>
          <option>Admin</option><option>Agent</option><option>Owner</option><option>Tenant</option><option>Maintenance</option>
        </select>

        <label style={label}>Password</label>
        <input type="password" placeholder="Create password" value={form.password} onChange={set('password')} className="auth-inp" style={inp} required />

        <label style={label}>Confirm Password</label>
        <input type="password" placeholder="Confirm password" value={form.confirm} onChange={set('confirm')} className="auth-inp" style={inp} required />

        <button type="submit" className="auth-btn" style={btn('#22c55e')}>Send OTP</button>
        <p style={footer}>Already have an account? <Link to="/login" style={link}>Login</Link></p>
      </form>
    </div>
  );
}
