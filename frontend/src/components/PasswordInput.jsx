import { forwardRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const PasswordInput = forwardRef(({ id, value, onChange, className = '', autoComplete, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name || 'password';

  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        ref={ref}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className={`input w-full pr-12 ${className}`}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {visible ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
