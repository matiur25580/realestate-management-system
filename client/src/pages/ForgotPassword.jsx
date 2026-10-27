import { useState, useRef, useEffect } from 'react'
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle';
import { pageWrap, card, logo, title, subtitle, label, inp, btn, link, footer, otpBox } from '../components/authStyles';

export default function ForgotPassword(){
  const toast = useToast();
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
    if(!email.trim()) return toast.error('Enter your email');
    try{
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      toast.success(res.data.message);
      setStep(2); setSeconds(300); setOtp(['','','','','','']);
      setTimeout(()=> boxRefs.current[0]?.focus(), 100);
    }catch(err){ toast.error(err.response?.data?.message || 'Failed to send OTP'); }
  };

  const handleBox = (i, v)=>{
    if(!/^[0-9]?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) boxRefs.current[i+1]?.focus();
  };

  const resetPw = async (e)=>{
    e.preventDefault();
    const code = otp.join('');
    if(code.length!==6) return toast.error('Enter 6-digit OTP');
    if(newPassword.length<6) return toast.error('Password minimum 6 characters');
    if(newPassword!==confirm) return toast.error('Passwords do not match');
    try{
      const res = await api.post('/auth/reset-password', { email: email.trim(), otp: code, newPassword });
      toast.success(res.data.message);
      nav('/login');
    }catch(err){ toast.error(err.response?.data?.message || 'Reset failed'); }
  };

  return (
    <div style={pageWrap}>
      <div style={{position:'fixed',top:16,right:16,zIndex:50}}><ThemeToggle /></div>
      {step===1 ? (
        <form onSubmit={sendOtp} style={card}>
          <div style={logo}>🔑</div>
          <h2 style={title}>Forgot Password</h2>
          <p style={subtitle}>Enter your registered email, we'll send an OTP</p>
          <label style={label}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Registered email address" className="auth-inp" style={inp} required />
          <button type="submit" className="auth-btn" style={btn('#3b82f6')}>Send OTP</button>
          <p style={footer}><Link to="/login" style={link}>← Back to Login</Link></p>
        </form>
      ) : (
        <form onSubmit={resetPw} style={card}>
          <div style={logo}>🔑</div>
          <h2 style={title}>Reset Password</h2>
          <p style={subtitle}>OTP sent to {email}</p>
          <label style={{...label, textAlign:'center'}}>6-digit OTP</label>
          <div style={{display:'flex',gap:'8px',justifyContent:'center',margin:'10px 0'}}>
            {otp.map((d,i)=>(
              <input key={i} ref={el=>boxRefs.current[i]=el} value={d} onChange={e=>handleBox(i,e.target.value)} onKeyDown={e=>{ if(e.key==='Backspace' && !otp[i] && i>0) boxRefs.current[i-1]?.focus(); }} maxLength={1} inputMode="numeric" className="auth-inp" style={otpBox} />
            ))}
          </div>
          <p style={{textAlign:'center',color:seconds>0?'#22c55e':'#ef4444',fontSize:'14px',fontWeight:'600'}}>{seconds>0 ? `OTP valid: ${fmt(seconds)}` : 'OTP expired'}</p>
          {seconds<=0 && <button type="button" onClick={sendOtp} className="auth-btn" style={btn('#f59e0b')}>Resend OTP</button>}
          <label style={label}>New Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="auth-inp" style={{...inp, paddingRight:'42px'}} required />
            <span onClick={()=>setShow(!show)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'18px'}}>👁️</span>
          </div>
          <label style={label}>Confirm Password</label>
          <input type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm new password" className="auth-inp" style={inp} required />
          <button type="submit" className="auth-btn" style={btn('#22c55e')}>Reset Password</button>
          <p style={footer}><Link to="/login" style={link}>← Back to Login</Link></p>
        </form>
      )}
    </div>
  );
}
