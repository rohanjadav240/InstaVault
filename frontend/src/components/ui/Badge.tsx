import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors border',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-violet-600/20 text-violet-300 border-violet-500/30',
        reel: 'border-transparent bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
        post: 'border-transparent bg-blue-500/20 text-blue-300 border-blue-500/30',
        story: 'border-transparent bg-amber-500/20 text-amber-300 border-amber-500/30',
        igtv: 'border-transparent bg-purple-500/20 text-purple-300 border-purple-500/30',
        secondary: 'border-transparent bg-[#222232] text-slate-300',
        success: 'border-transparent bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        warning: 'border-transparent bg-amber-500/20 text-amber-300 border-amber-500/30',
        destructive: 'border-transparent bg-red-500/20 text-red-300 border-red-500/30',
        outline: 'text-slate-300 border-[#2f2f42]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

