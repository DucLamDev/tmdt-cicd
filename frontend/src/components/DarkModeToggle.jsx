import { useState, useEffect } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button onClick={() => setIsDark(!isDark)} title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
      style={{
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        border: 'none', borderRadius: '50%', width: '36px', height: '36px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: isDark ? '#fbbf24' : '#64748b',
        transition: 'all 0.3s'
      }}>
      {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
    </button>
  );
};

export default DarkModeToggle;
