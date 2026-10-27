import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle(){
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      style={{
        width: 42, height: 42, borderRadius: '50%',
        border: '1px solid var(--app-border)',
        background: 'var(--app-card)', color: 'var(--app-text)',
        fontSize: 20, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
