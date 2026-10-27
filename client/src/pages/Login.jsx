import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { pageWrap, card, logo, title, subtitle, label, inp, btn, link, footer } from '../components/authStyles';

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
    <div style={pageWrap}>
      <div style={{position:'fixed',top:16,right:16,zIndex:50}}><ThemeToggle /></div>
      <form onSubmit={handleLogin} style={card}>
        <div style={logo}>🏠</div>
        <h2 style={title}>RealEstate Pro</h2>
        <p style={subtitle}>Sign in to your account</p>

        <label style={label}>Account Role</label>
        <select value={role} onChange={e=>setRole(e.target.value)} className="auth-inp" style={inp}>
          <option>Admin</option><option>Agent</option><option>Owner</option><option>Tenant</option><option>Maintenance</option>
        </select>

        <label style={label}>Email or Unique ID</label>
        <input value={emailOrId} onChange={e=>setEmailOrId(e.target.value)} placeholder="Enter email or unique ID" className="auth-inp" style={inp} required />

        <label style={label}>Password</label>
        <div style={{position:'relative'}}>
          <input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" className="auth-inp" style={{...inp, paddingRight:'42px'}} required />
          <span onClick={()=>setShow(!show)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'18px'}}>👁️</span>
        </div>

        <p style={{textAlign:'right',margin:'10px 0 0'}}><Link to="/forgot-password" style={link}>Forgot Password?</Link></p>
        <button type="submit" className="auth-btn" style={btn('#3b82f6')}>Login</button>
        <p style={footer}>No account? <Link to="/register" style={link}>Create one</Link></p>
      </form>
    </div>
  );
}
