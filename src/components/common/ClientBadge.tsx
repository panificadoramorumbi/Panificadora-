import React from 'react';
import { getClientColor } from '../../utils/formatters';

interface ClientBadgeProps {
  id?: string | null;
  name: string;
  className?: string;
  onClick?: () => void;
  showAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ClientBadge: React.FC<ClientBadgeProps> = ({
  id,
  name,
  className = '',
  onClick,
  showAvatar = true,
  size = 'md',
}) => {
  const theme = getClientColor(id || name);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const avatarSizes = {
    sm: 'w-3.5 h-3.5 text-[8px]',
    md: 'w-4 h-4 text-[9px]',
    lg: 'w-5 h-5 text-[10px]',
  }[size];

  const content = (
    <span
      className={`inline-flex items-center font-black rounded-full border shadow-2xs transition-all ${
        theme.badge
      } ${sizeClasses} ${onClick ? 'cursor-pointer hover:shadow-xs hover:scale-105 active:scale-95' : ''} ${className}`}
    >
      {showAvatar && (
        <span
          className={`${avatarSizes} rounded-full flex items-center justify-center font-black shrink-0 ${theme.accent}`}
        >
          {initials || 'C'}
        </span>
      )}
      <span className="truncate max-w-[160px] sm:max-w-[220px]">{name}</span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="inline-block text-left focus:outline-hidden"
        title={`Clique para ver apenas os pedidos de ${name}`}
      >
        {content}
      </button>
    );
  }

  return content;
};
