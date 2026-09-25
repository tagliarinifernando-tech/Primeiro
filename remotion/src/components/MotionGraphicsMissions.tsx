import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {theme} from '../theme';

/** Quick "duas missões" title-card beat (~2.3s) between the hook and the explanation. */
export const MotionGraphicsMissions: React.FC<{localFrame: number}> = ({localFrame}) => {
	const {fps} = useVideoConfig();
	const titleOpacity = interpolate(localFrame, [0, 8], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const badge1 = spring({frame: localFrame - 10, fps, config: {damping: 12}, durationInFrames: 10});
	const badge2 = spring({frame: localFrame - 24, fps, config: {damping: 12}, durationInFrames: 10});

	const Badge: React.FC<{n: number; s: number}> = ({n, s}) => (
		<div
			style={{
				width: 120,
				height: 120,
				borderRadius: 60,
				border: '3px solid #FFFFFF',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				transform: `scale(${s})`,
				opacity: s,
			}}
		>
			<div
				style={{
					fontFamily: theme.fontFamily,
					fontWeight: 900,
					fontSize: 60,
					color: '#FFFFFF',
					textShadow: theme.glow,
				}}
			>
				{n}
			</div>
		</div>
	);

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				backgroundColor: theme.insertBg,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 50,
			}}
		>
			<div
				style={{
					fontFamily: theme.fontFamily,
					fontWeight: 700,
					fontSize: 36,
					letterSpacing: 3,
					color: 'rgba(255,255,255,0.75)',
					opacity: titleOpacity,
				}}
			>
				DUAS MISSÕES
			</div>
			<div style={{display: 'flex', gap: 60}}>
				<Badge n={1} s={badge1} />
				<Badge n={2} s={badge2} />
			</div>
		</div>
	);
};
