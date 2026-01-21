'use client';

/**
 * KPI Card Component
 * 
 * V2.0: Displays a single KPI metric with stale indicator
 * Uses shadcn/ui Card primitive
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon, RefreshCw } from 'lucide-react';
import type { KPICardProps } from '../types';

export function KPICard({
    title,
    value,
    subtitle,
    trend,
    icon,
    isLoading = false,
    isStale = false,
}: KPICardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn(
            'transition-all duration-200',
            isStale && 'opacity-75 border-dashed'
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="flex items-center gap-1">
                    {isStale && (
                        <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin" />
                    )}
                    {icon && (
                        <div className="h-4 w-4 text-muted-foreground">
                            {icon}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-2 mt-1">
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                    {trend && (
                        <div className={cn(
                            'flex items-center text-xs font-medium',
                            trend.isPositive ? 'text-green-600' : 'text-red-600'
                        )}>
                            {trend.isPositive ? (
                                <ArrowUpIcon className="h-3 w-3 mr-0.5" />
                            ) : (
                                <ArrowDownIcon className="h-3 w-3 mr-0.5" />
                            )}
                            {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
