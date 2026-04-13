import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface AlertProps {
  variant?: 'error' | 'info';
  children: ReactNode;
}

export function Alert({ variant = 'error', children }: AlertProps) {
  const variants = {
    error: {
      container: 'bg-[#FEF2F2] border-[#DC2626]',
      icon: 'text-[#DC2626]',
      text: 'text-[#991B1B]',
    },
    info: {
      container: 'bg-[#F3F8FE] border-[#23415B]',
      icon: 'text-[#23415B]',
      text: 'text-[#23415B]',
    },
  };

  const style = variants[variant];

  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-lg ${style.container}`}
      role="alert"
    >
      <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.icon}`} />
      <p className={`text-sm ${style.text}`}>{children}</p>
    </div>
  );
}
