export const pageWrap = {
  minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center',
  background:'var(--app-bg)', color:'var(--app-text)', padding:'20px', boxSizing:'border-box',
  backgroundImage:'radial-gradient(circle at 15% 15%, rgba(59,130,246,0.14), transparent 42%), radial-gradient(circle at 85% 85%, rgba(34,197,94,0.10), transparent 42%)'
};
export const card = {
  width:'100%', maxWidth:'420px', boxSizing:'border-box', background:'var(--app-card)',
  padding:'32px 28px', borderRadius:'16px', border:'1px solid var(--app-border)',
  boxShadow:'0 12px 40px rgba(0,0,0,0.35)'
};
export const logo = {
  width:'58px', height:'58px', borderRadius:'16px', margin:'0 auto 12px',
  background:'linear-gradient(135deg,#3b82f6,#22c55e)', display:'flex',
  alignItems:'center', justifyContent:'center', fontSize:'30px',
  boxShadow:'0 6px 18px rgba(59,130,246,0.35)'
};
export const title = { margin:'0 0 4px', fontSize:'22px', textAlign:'center', fontWeight:'800' };
export const subtitle = { textAlign:'center', color:'var(--app-muted)', fontSize:'13px', margin:'0 0 20px' };
export const label = { display:'block', fontSize:'13px', fontWeight:'600', margin:'14px 0 6px' };
export const inp = {
  width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:'8px',
  border:'1px solid var(--app-border)', background:'var(--app-bg)',
  color:'var(--app-text)', fontSize:'14px', outline:'none', margin:'0'
};
export const btn = (bg)=>({
  width:'100%', boxSizing:'border-box', padding:'13px', background:bg, border:'none',
  color:'#fff', borderRadius:'8px', marginTop:'18px', fontSize:'15px',
  fontWeight:'700', cursor:'pointer', transition:'filter 0.2s'
});
export const link = { color:'#60a5fa', textDecoration:'none', fontSize:'14px', fontWeight:'600' };
export const footer = { textAlign:'center', marginTop:'18px', fontSize:'14px', color:'var(--app-muted)' };
export const otpBox = {
  width:'46px', height:'52px', boxSizing:'border-box', textAlign:'center', fontSize:'20px',
  fontWeight:'700', borderRadius:'8px', border:'1px solid var(--app-border)',
  background:'var(--app-bg)', color:'var(--app-text)', outline:'none'
};
