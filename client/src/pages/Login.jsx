import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login(){
  const [role, setRole] = useState('Tenant');
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e)=>{
    e.preventDefault();
    try{
      const res = await api.post('/auth/login', { role, emailOrId, password });
      login(res.data);
      nav('/dashboard');
    }catch(err){
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',justifyContent:'center',alignItems:'center',background:'#0f172a',color:'#fff',padding:'20px'}}>
      <form onSubmit={handleLogin} style={{width:'100%',maxWidth:'400px',background:'#1e293b',padding:'30px',borderRadius:'12px'}}>
        <h2 style={{textAlign:'center'}}>RealEstate Login</h2>
        <label>Account Role</label>
        <select value={role} onChange={e=>setRole(e.target.value)} style={{width:'100%',padding:'10px',margin:'8px 0'}}>
          <option>Admin</option><option>Agent</option><option>Owner</option><option>Tenant</option><option>Maintenance</option>
        </select>
        <label>Email or Unique ID</label>
        <input value={emailOrId} onChange={e=>setEmailOrId(e.target.value)} placeholder="Email or Unique ID" style={{width:'100%',padding:'10px',margin:'8px 0'}} required />
        <label>Password</label>
        <div style={{position:'relative'}}>
          <input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" style={{width:'100%',padding:'10px',margin:'8px 0'}} required />
          <span onClick={()=>setShow(!show)} style={{position:'absolute',right:'10px',top:'18px',cursor:'pointer'}}>👁️</span>
        </div>
        <p style={{textAlign:"right",marginTop:"4px"}}><Link to="/forgot-password" style={{color:"#60a5fa",fontSize:"14px"}}>Forgot Password?</Link></p>
        <button type="submit" style={{width:'100%',padding:'12px',background:'#3b82f6',border:'none',color:'#fff',borderRadius:'8px',marginTop:'10px'}}>Login</button>
        <p style={{textAlign:'center',marginTop:'12px'}}>No account? <Link to="/register" style={{color:'#60a5fa'}}>Register</Link></p>
      </form>
    </div>
  );
}
