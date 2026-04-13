import { forwardRef, InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hasError, className = '', type = 'text', ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-2 font-medium text-[#3E3E3E]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`
            w-full px-4 py-3
            bg-white border rounded-lg
            text-[#3E3E3E] placeholder:text-[#9CA3AF]
            transition-all duration-150
            ${
              hasError || error
                ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                : 'border-[#E5E7EB] focus:border-[#23415B] focus:ring-2 focus:ring-[#23415B]/20'
            }
            ${props.disabled ? 'bg-[#F3F8FE] cursor-not-allowed opacity-60' : ''}
            outline-none
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-[#DC2626]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
