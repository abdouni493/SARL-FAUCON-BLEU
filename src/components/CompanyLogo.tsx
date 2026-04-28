interface CompanyLogoProps {
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DEFAULT_LOGO = '/default-logo.svg';

export default function CompanyLogo({ 
  logoUrl, 
  size = 'md',
  className = '' 
}: CompanyLogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
  };

  // Guard: Return null while loading to prevent placeholder flash
  if (!logoUrl) return null;

  // Validate URL is a non-empty string
  const isValidUrl = typeof logoUrl === 'string' && logoUrl.trim().length > 0;
  const finalUrl = isValidUrl ? logoUrl : DEFAULT_LOGO;

  console.log('🔷 CompanyLogo Render:', {
    inputUrl: logoUrl,
    finalUrl: finalUrl,
    isDefault: finalUrl === DEFAULT_LOGO,
    size: size
  });

  return (
    <div
      className={`${sizes[size]} rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0 border-2 border-gray-200 ${className}`}
    >
      <img
        src={finalUrl}
        alt="Company Logo"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Prevent infinite fallback loop - only switch once
          if (!e.currentTarget.src.includes('default-logo.svg')) {
            console.error('🔴 Image failed to load:', finalUrl);
            e.currentTarget.src = DEFAULT_LOGO;
          }
        }}
        onLoad={() => {
          console.log('✅ Image loaded successfully:', finalUrl);
        }}
      />
    </div>
  );
}
