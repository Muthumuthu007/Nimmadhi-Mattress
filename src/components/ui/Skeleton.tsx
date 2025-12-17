import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'circular' | 'rectangular';
    className?: string;
    animation?: 'pulse' | 'shimmer' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width,
    height,
    variant = 'rectangular',
    className = '',
    animation = 'shimmer',
}) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'text':
                return 'h-4 rounded';
            case 'circular':
                return 'rounded-full';
            case 'rectangular':
            default:
                return 'rounded-lg';
        }
    };

    const getAnimationClass = () => {
        switch (animation) {
            case 'pulse':
                return 'animate-pulse';
            case 'shimmer':
                return 'skeleton-shimmer';
            case 'none':
            default:
                return '';
        }
    };

    const widthStyle = width
        ? typeof width === 'number'
            ? `${width}px`
            : width
        : '100%';

    const heightStyle = height
        ? typeof height === 'number'
            ? `${height}px`
            : height
        : variant === 'text'
            ? '1rem'
            : '100%';

    return (
        <div
            className={`bg-gray-200 ${getVariantStyles()} ${getAnimationClass()} ${className}`}
            style={{
                width: widthStyle,
                height: heightStyle,
                backgroundImage:
                    animation === 'shimmer'
                        ? 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)'
                        : undefined,
                backgroundSize: animation === 'shimmer' ? '200% 100%' : undefined,
            }}
            aria-label="Loading..."
            role="status"
        />
    );
};
