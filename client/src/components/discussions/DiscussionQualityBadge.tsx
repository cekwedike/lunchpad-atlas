import { Badge } from '@/components/ui/badge';
import { Sparkles, Award, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityBadge {
  label: string;
  score: number;
}

interface DiscussionQualityBadgeProps {
  badge: QualityBadge;
  className?: string;
}

export function DiscussionQualityBadge({ badge, className }: DiscussionQualityBadgeProps) {
  const getBadgeStyles = () => {
    switch (badge.label) {
      case 'High Quality':
        return {
          variant: 'default' as const,
          icon: <Award className="h-3 w-3" />,
          className: 'bg-purple-600 hover:bg-purple-700 text-white',
        };
      case 'Insightful':
        return {
          variant: 'secondary' as const,
          icon: <Sparkles className="h-3 w-3" />,
          className: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      case 'Helpful':
        return {
          variant: 'outline' as const,
          icon: <Heart className="h-3 w-3" />,
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: null,
          className: '',
        };
    }
  };

  const { icon, className: badgeClassName } = getBadgeStyles();

  return (
    <Badge className={cn('flex items-center gap-1 text-xs font-semibold', badgeClassName, className)}>
      {icon}
      {badge.label}
    </Badge>
  );
}

interface QualityScoreIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QualityScoreIndicator({
  score,
  showLabel = true,
  size = 'md',
  className,
}: QualityScoreIndicatorProps) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-purple-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const getProgressColor = () => {
    if (score >= 80) return 'bg-purple-600';
    if (score >= 70) return 'bg-blue-600';
    if (score >= 60) return 'bg-green-600';
    if (score >= 40) return 'bg-yellow-600';
    return 'bg-gray-400';
  };

  const sizeClasses = {
    sm: { text: 'text-xs', bar: 'h-1', width: 'w-12' },
    md: { text: 'text-sm', bar: 'h-1.5', width: 'w-16' },
    lg: { text: 'text-base', bar: 'h-2', width: 'w-20' },
  };

  const { text, bar, width } = sizeClasses[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative rounded-full bg-gray-200 overflow-hidden', width, bar)}>
        <div
          className={cn('h-full transition-all duration-300', getProgressColor())}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('font-semibold', text, getScoreColor())}>
          {score}/100
        </span>
      )}
    </div>
  );
}
