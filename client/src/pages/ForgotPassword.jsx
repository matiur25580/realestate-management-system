import { useState, useRef, useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle';;
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword(){
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['','','','','','']);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [seconds, setSeconds] = useState(300);
  const nav = useNavigate();
  const boxRefs = useRef([]);

  useEffect(()=>{
    if(step!==2 || seconds<=0) return;
    const t = setTimeout(()=> setSeconds(seconds-1), 1000);
    return ()=> clearTimeout(t);
  },[step, seconds]);

  const fmt = (s)=> Math.floor(s/60)+':'+String(s%60).padStart(2,'0');

  const sendOtp = async (e)=>{
    e.preventDefault();
    if(!email.trim()) return alert('Enter your email');
    try{
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      alert(res.data.message);
      setStep(2); setSeconds(300); setOtp(['','','','','','']);
      setTimeout(()=> boxRefs.current[0]?.focus(), 100);
    }catch(err){ alert(err.response?.data?.message || 'Failed to send OTP'); }
  };

  const handleBox = (i, v)=>{
    if(!/^[0-9]?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) boxRefs.current[i+1]?.focus();
  };

  const resetPw = async (e)=>{
    e.preventDefault();
    const code = otp.join('');
    if(code.length!==6) return alert('Enter 6-digit OTP');
    if(newPassword.length<6) return alert('Password minimum 6 characters');
    if(newPassword!==confirm) return alert('Passwords do not match');
    try{
      const res = await api.post('/auth/reset-password', { email: email.trim(), otp: code, newPassword });
      alert(res.data.message);
      nav('/login');
    }catch(err){ alert(err.response?.data?.message || 'Reset failed'); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',justifyContent:'center',alignItems:'center',background:'var(--app-bg)',color:'var(--app-text)',padding:'20px'}}>
      <div style={{position:'fixed',top:16,right:16,zIndex:50}}><ThemeToggle /></div>
      {step===1 ? (
        <form onSubmit={sendOtp} style={{width:'100%',maxWidth:'400px',background:'var(--app-card)',padding:'30px',borderRadius:'12px'}}>
          <h2 style={{textAlign:'center'}}>Forgot Password</h2>
          <p style={{textAlign:'center',color:'var(--app-muted)',fontSize:'14px'}}>Registered email dao, OTP jabe</p>
          <label>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Registered email" style={{width:'100%',padding:'10px',margin:'8px 0'}} required />
          <button type="submit" style={{width:'100%',padding:'12px',background:'#3b82f6',border:'none',color:'var(--app-text)',borderRadius:'8px',marginTop:'10px'}}>Send OTP</button>
          <p style={{textAlign:'center',marginTop:'12px'}}><Link to="/login" style={{color:'#60a5fa'}}>Back to Login</Link></p>
        </form>
      ) : (
        <form onSubmit={resetPw} style={{width:'100%',maxWidth:'400px',background:'var(--app-card)',padding:'30px',borderRadius:'12px'}}>
          <h2 style={{textAlign:'center'}}>Reset Password</h2>
          <p style={{textAlign:'center',color:'var(--app-muted)',fontSize:'14px'}}>OTP sent to {email}</p>
          <label>6-digit OTP</label>
          <div style={{display:'flex',gap:'8px',justifyContent:'center',margin:'10px 0'}}>
            {otp.map((d,i)=>(
              <input key={i} ref={el=>boxRefs.current[i]=el} value={d} onChange={e=>handleBox(i,e.target.value)} onKeyDown={e=>{ if(e.key==='Backspace' && !otp[i] && i>0) boxRefs.current[i-1]?.focus(); }} maxLength={1} inputMode="numeric" style={{width:'45px',height:'50px',textAlign:'center',fontSize:'20px',borderRadius:'8px',border:'1px solid #475569',background:'var(--app-bg)',color:'var(--app-text)'}} />
            ))}
          </div>
          <p style={{textAlign:'center',color: seconds>0 ? '#22c55e' : '#ef4444'}}>{seconds>0 ? `OTP valid: ${fmt(seconds)}` : 'OTP expired'}</p>
          {seconds<=0 && <button type="button" onClick={sendOtp} style={{width:'100%',padding:'10px',background:'#f59e0b',border:'none',color:'var(--app-text)',borderRadius:'8px',marginBottom:'8px'}}>Resend OTP</button>}
          <label>New Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password (min 6)" style={{width:'100%',padding:'10px',margin:'8px 0'}} required />
            <span onClick={()=>setShow(!show)} style={{position:'absolute',right:'10px',top:'18px',cursor:'pointer'}}>👁️</span>
          </div>
          <label>Confirm Password</label>
          <input type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm new password" style={{width:'100%',padding:'10px',margin:'8px 0'}} required />
          <button type="submit" style={{width:'100%',padding:'12px',background:'#22c55e',border:'none',color:'var(--app-text)',borderRadius:'8px',marginTop:'10px'}}>Reset Password</button>
          <p style={{textAlign:'center',marginTop:'12px'}}><Link to="/login" style={{color:'#60a5fa'}}>Back to Login</Link></p>
        </form>
      )}
    </div>
  );
}
