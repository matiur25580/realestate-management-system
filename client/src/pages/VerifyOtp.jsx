import { useState, useEffect } from 'react'
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
export default function VerifyOtp(){
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [sec, setSec] = useState(300);
  const nav = useNavigate();
  const email = localStorage.getItem('pendingEmail');
  useEffect(()=>{
    if(sec<=0) return;
    const t = setTimeout(()=>setSec(sec-1),1000);
    return ()=>clearTimeout(t);
  },[sec]);
  const verify = async (e)=>{
    e.preventDefault();
    try{
      const res = await api.post('/auth/verify-otp', { email, otp });
      toast.success(res.data.message);
      nav('/login');
    }catch(err){ toast.error(err.response?.data?.message); }
  };
  const mins = Math.floor(sec/60);
  const secs = sec%60;
  return (
    <div style={{minHeight:'100vh',display:'flex',justifyContent:'center',alignItems:'center',background:'var(--app-bg)',color:'var(--app-text)'}}>
      <form onSubmit={verify} style={{background:'var(--app-card)',padding:'30px',borderRadius:'12px',width:'90%',maxWidth:'360px'}}>
        <h3>Verify OTP</h3>
        <p>Sent to {email}</p>
        <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit OTP" style={{width:'100%',padding:'10px',margin:'10px 0'}} required />
        <p>Time left: {mins}:{secs<10?'0':''}{secs}</p>
        {sec===0 && <p style={{color:'#f87171'}}>Resend button - register again to get new OTP</p>}
        <button type="submit" style={{width:'100%',padding:'12px',background:'#3b82f6',color:'var(--app-text)',border:'none',borderRadius:'8px'}}>Verify</button>
      </form>
    </div>
  );
}
