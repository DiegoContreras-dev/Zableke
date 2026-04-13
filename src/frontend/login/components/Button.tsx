import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    w-full px-6 py-3 rounded-lg
    font-medium
    transition-all duration-150
    disabled:cursor-not-allowed disabled:opacity-60
    flex items-center justify-center gap-2
    min-h-[44px]
  `;

  const variants = {
    primary: `
      bg-[#23415B] text-white
      hover:bg-[#1a2f43]
      focus:ring-2 focus:ring-[#23415B]/50 focus:outline-none
    `,
    secondary: `
      bg-white text-[#23415B]
      border-2 border-[#23415B]
      hover:bg-[#F3F8FE]
      focus:ring-2 focus:ring-[#23415B]/50 focus:outline-none
    `,
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}
