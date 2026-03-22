interface ToggleProps {
  options: [string, string];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function Toggle({ options, value, onChange, className = '' }: ToggleProps) {
  return (
    <div className={`inline-flex rounded-xl bg-white/10 p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
            ${value === option
              ? 'bg-accent text-primary-dark shadow-sm'
              : 'text-neutral-300 hover:text-white'
            }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
