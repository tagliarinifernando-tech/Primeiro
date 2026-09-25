import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {theme} from '../theme';

/**
 * "De pijama, pelo notebook" (ano passado) vs "passaporte, Viena, presencial"
 * (esse ano). Local frame is relative to this insert's own start (~5.5s / 166f).
 * Beats: left column reveals first (pijama/notebook), divider draws in,
 * right column reveals (passaporte/viena/presencial).
 */
export const MotionGraphicsBeforeAfter: React.FC<{localFrame: number}> = ({localFrame}) => {
	const {fps} = useVideoConfig();

	const headerOpacity = interpolate(localFrame, [0, 10], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const dividerScale = spring({frame: localFrame - 10, fps, config: {damping: 16}, durationInFrames: 15});

	const itemIn = (from: number) =>
		spring({frame: localFrame - from, fps, config: {damping: 13, stiffness: 180}, durationInFrames: 10});

	const leftItems = [
		{label: 'PIJAMA', from: 4},
		{label: 'NOTEBOOK', from: 18},
	];
	const rightItems = [
		{label: 'PASSAPORTE', from: 78},
		{label: 'VIENA', from: 96},
		{label: 'PRESENCIAL', from: 112},
	];

	const Column: React.FC<{
		title: string;
		items: {label: string; from: number}[];
	}> = ({title, items}) => (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					marginTop: 340,
					fontFamily: theme.fontFamily,
					fontWeight: 700,
					fontSize: 30,
					letterSpacing: 3,
					color: 'rgba(255,255,255,0.6)',
					opacity: headerOpacity,
				}}
			>
				{title}
			</div>
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 22,
				}}
			>
				{items.map((it) => {
					const s = itemIn(it.from);
					return (
						<div
							key={it.label}
							style={{
								fontFamily: theme.fontFamily,
								fontWeight: 900,
								fontSize: 52,
								color: '#FFFFFF',
								textShadow: theme.glow,
								textAlign: 'center',
								transform: `scale(${s})`,
								opacity: s,
							}}
						>
							{it.label}
						</div>
					);
				})}
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
			}}
		>
			<Column title="ANO PASSADO" items={leftItems} />
			<div
				style={{
					width: 3,
					backgroundColor: 'rgba(255,255,255,0.5)',
					height: 460,
					alignSelf: 'center',
					transform: `scaleY(${dividerScale})`,
				}}
			/>
			<Column title="ESSE ANO" items={rightItems} />
		</div>
	);
};
