import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {theme, presenter} from '../theme';

export const EndCard: React.FC<{localFrame: number}> = ({localFrame}) => {
	const {fps} = useVideoConfig();
	const scale = spring({frame: localFrame, fps, config: {damping: 16}, durationInFrames: 20});
	const opacity = interpolate(localFrame, [0, 12], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				backgroundColor: theme.endCardBg,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 14,
				opacity,
				transform: `scale(${0.9 + scale * 0.1})`,
			}}
		>
			<div
				style={{
					fontFamily: theme.fontFamily,
					fontWeight: 900,
					fontSize: 56,
					color: '#FFFFFF',
					letterSpacing: 1,
					textAlign: 'center',
				}}
			>
				{presenter.name}
			</div>
			<div
				style={{
					fontFamily: theme.fontFamily,
					fontWeight: 500,
					fontSize: 30,
					color: 'rgba(255,255,255,0.75)',
					letterSpacing: 2,
				}}
			>
				{presenter.credential}
			</div>
			<div
				style={{
					marginTop: 30,
					fontFamily: theme.fontFamily,
					fontWeight: 500,
					fontSize: 26,
					fontStyle: 'italic',
					color: 'rgba(255,255,255,0.9)',
				}}
			>
				{presenter.tagline}
			</div>
			{presenter.instagram ? (
				<div
					style={{
						marginTop: 18,
						fontFamily: theme.fontFamily,
						fontWeight: 700,
						fontSize: 28,
						color: '#FFFFFF',
					}}
				>
					{presenter.instagram}
				</div>
			) : null}
		</div>
	);
};
