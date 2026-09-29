'use client';

import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Input } from './input';
import { Icon } from './icon';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={isVisible ? 'text' : 'password'} className={`pr-10 ${className}`} {...props} />
      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        <Icon name={isVisible ? 'eyeOff' : 'eye'} className="h-4 w-4" />
      </button>
    </div>
  );
}
