'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  ComponentType,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotchPosition = 'top' | 'bottom';

export interface NotchItemData {
  id: string;
  label: string;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

export interface NotchWingProps {
  position?: NotchPosition;
  className?: string;
}

export function NotchLeftWing({ position = 'top', className }: NotchWingProps) {
  const isBottom = position === 'bottom';

  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      shapeRendering="geometricPrecision"
      className={cn(
        'pointer-events-none absolute right-full size-2.5 md:size-4 overflow-visible select-none text-zinc-950 transition-colors duration-200',
        isBottom ? 'bottom-0' : 'top-0',
        className
      )}
    >
      <path
        d={
          isBottom
            ? 'M 0 20 C 11.046 20 20 11.046 20 0 H 21 V 21 H 0 Z'
            : 'M 0 0 C 11.046 0 20 8.954 20 20 H 21 V -1 H 0 Z'
        }
        fill="currentColor"
      />
    </svg>
  );
}

export function NotchRightWing({ position = 'top', className }: NotchWingProps) {
  const isBottom = position === 'bottom';

  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      shapeRendering="geometricPrecision"
      className={cn(
        'pointer-events-none absolute left-full size-2.5 md:size-4 overflow-visible select-none text-zinc-950 transition-colors duration-200',
        isBottom ? 'bottom-0' : 'top-0',
        className
      )}
    >
      <path
        d={
          isBottom
            ? 'M 20 20 C 8.954 20 0 11.046 0 0 H -1 V 21 H 20 Z'
            : 'M 20 0 C 8.954 0 0 8.954 0 20 H -1 V -1 H 20 Z'
        }
        fill="currentColor"
      />
    </svg>
  );
}

export interface NotchItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  id: string;
  label: string;
  isActive: boolean;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

export const NotchItem = forwardRef<HTMLButtonElement, NotchItemProps>(
  (
    {
      id,
      label,
      isActive,
      icon: Icon,
      badge,
      disabled,
      className,
      onClick,
      onSelect,
      ...props
    },
    ref
  ) => {
    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onSelect(id);
      onClick?.(event);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!disabled) {
          onSelect(id);
        }
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors outline-none select-none',
          'focus-visible:ring-2 focus-visible:ring-zinc-400',
          isActive
            ? 'font-semibold text-zinc-100'
            : 'text-zinc-400 hover:text-zinc-200',
          disabled && 'cursor-not-allowed pointer-events-none opacity-40',
          className
        )}
        {...props}
      >
        {isActive && (
          <motion.span
            layoutId="notch-active-pill"
            className="absolute inset-0 rounded-full bg-zinc-800"
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
          />
        )}

        <span className="relative z-10 flex items-center gap-1.5">
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span>{label}</span>
          {badge && (
            <span className="rounded-full bg-zinc-700 px-1.5 py-0.2 text-[10px] font-bold text-zinc-300">
              {badge}
            </span>
          )}
        </span>
      </button>
    );
  }
);
NotchItem.displayName = 'NotchItem';

export interface NotchDropdownItemProps {
  item: NotchItemData;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function NotchDropdownItem({
  item,
  isSelected,
  onSelect,
}: NotchDropdownItemProps) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      disabled={item.disabled}
      onClick={() => onSelect(item.id)}
      className={cn(
        'group flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors outline-none select-none',
        isSelected
          ? 'bg-zinc-800 text-zinc-100 font-semibold'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
        item.disabled && 'cursor-not-allowed opacity-40 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            className={cn(
              'size-3.5 shrink-0 transition-colors',
              isSelected ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'
            )}
          />
        )}
        <span>{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
            {item.badge}
          </span>
        )}
      </div>

      {isSelected && <Check className="size-3 text-zinc-200 shrink-0" />}
    </button>
  );
}
