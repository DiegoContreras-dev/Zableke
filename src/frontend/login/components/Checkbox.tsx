import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="peer sr-only"
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={`
              relative block w-5 h-5 rounded border-2 cursor-pointer
              transition-all duration-150
              peer-checked:border-[#23415B]
              peer-focus:ring-2 peer-focus:ring-[#23415B]/50
              peer-disabled:cursor-not-allowed peer-disabled:opacity-60
              border-[#E5E7EB] bg-white
              after:content-[''] after:absolute after:top-1/2 after:left-1/2
              after:w-2.5 after:h-2.5 after:rounded-full after:bg-[#23415B]
              after:-translate-x-1/2 after:-translate-y-1/2
              after:scale-0 after:transition-transform after:duration-150
              peer-checked:after:scale-100
              ${className}
            `}
          />
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className="text-sm text-[#3E3E3E] cursor-pointer select-none font-normal"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
