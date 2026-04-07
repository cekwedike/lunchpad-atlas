import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function LeaderboardLoading() {
  return (
    <div className="space-y-8 pb-10">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-indigo-600 to-violet-700 p-[1px]">
        <div className="rounded-[1.95rem] bg-slate-950 px-6 py-10 sm:px-10">
          <Skeleton className="h-4 w-40 rounded-full bg-white/10" />
          <Skeleton className="mt-4 h-12 w-64 max-w-full bg-white/10 sm:h-14" />
          <Skeleton className="mt-3 h-4 w-full max-w-md bg-white/10" />
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-8 w-36 rounded-full bg-white/10" />
            <Skeleton className="h-8 w-28 rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-slate-200/80">
          <CardContent className="space-y-4 p-6 pt-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-amber-200/50 bg-gradient-to-br from-slate-900 to-indigo-950">
          <CardContent className="space-y-4 p-6 pt-6">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-14 w-24 bg-white/10" />
            <Skeleton className="h-5 w-48 bg-white/10" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className={cn(i === 1 ? 'scale-105 border-amber-200' : 'border-slate-200')}>
            <CardContent className="space-y-3 p-4 text-center">
              <Skeleton className={cn('mx-auto rounded-2xl bg-slate-200', i === 1 ? 'h-20 w-20' : 'h-14 w-14')} />
              <Skeleton className="mx-auto h-4 w-24" />
              <Skeleton className="mx-auto h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-slate-100 pb-3 last:border-0">
                <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
