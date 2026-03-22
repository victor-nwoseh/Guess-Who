interface AvatarProps {
  name: string;
  gender?: 'male' | 'female';
  size?: number;
}

export default function Avatar({ name, gender = 'male', size = 80 }: AvatarProps) {
  const isMale = gender === 'male';
  const bgColor = isMale ? '#1e3a5f' : '#5f1e3a';
  const silhouetteColor = isMale ? '#3b82f6' : '#ec4899';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-lg"
        role="img"
        aria-label={`${gender} avatar`}
      >
        {/* Background */}
        <rect width="80" height="80" rx="8" fill={bgColor} />

        {/* Head */}
        <circle cx="40" cy="28" r="14" fill={silhouetteColor} />

        {/* Shoulders / body */}
        <ellipse cx="40" cy="72" rx="26" ry="22" fill={silhouetteColor} />
      </svg>
      <span className="text-white text-xs font-medium text-center truncate max-w-[80px]">
        {name}
      </span>
    </div>
  );
}
