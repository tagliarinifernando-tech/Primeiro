import React from 'react';
import {interpolate} from 'remotion';
import {theme} from '../theme';
import type {Caption} from '../data';

export const CaptionOverlay: React.FC<{captions: Caption[]; frame: number}> = ({
	captions,
	frame,
}) => {
	const active = captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
	if (!active) return null;

	const localFrame = frame - active.startFrame;
	const opacity = interpolate(localFrame, [0, 3], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				position: 'absolute',
				top: '55%',
				left: 0,
				right: 0,
				display: 'flex',
				justifyContent: 'center',
				padding: '0 60px',
				opacity,
			}}
		>
			<div
				style={{
					fontFamily: theme.fontFamily,
					fontWeight: 500,
					fontSize: theme.captionSize,
					color: theme.captionColor,
					textAlign: 'center',
					lineHeight: 1.3,
					textShadow: '0 2px 8px rgba(0,0,0,0.7)',
				}}
			>
				{active.text}
			</div>
		</div>
	);
};
