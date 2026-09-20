import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {theme} from '../theme';

/**
 * Conceptual diagram for "elas agem dentro da célula desligando o sinal
 * inflamatório lá no núcleo, como se fosse um botão de desligar a coceira".
 * Beats (local frame, 30fps): membrane in (0-15) -> nucleus in (20-35) ->
 * signal travels in (45-90) -> switch flips off (95-120) -> itch crossed out (135-175) -> hold.
 */
export const MotionGraphicsCelula: React.FC<{localFrame: number}> = ({localFrame}) => {
	const {fps} = useVideoConfig();
	const cx = 540;
	const cy = 940;

	const membraneScale = spring({frame: localFrame, fps, config: {damping: 14}, durationInFrames: 18});
	const nucleusScale = spring({
		frame: localFrame - 20,
		fps,
		config: {damping: 14},
		durationInFrames: 18,
	});

	const signalT = interpolate(localFrame, [45, 90], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const signalOpacity = interpolate(localFrame, [45, 55, 85, 95], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const signalAngle = -Math.PI / 2;
	const signalR = 335;
	const sx = cx + Math.cos(signalAngle) * signalR * (1 - signalT);
	const sy = cy + Math.sin(signalAngle) * signalR * (1 - signalT);

	const switchT = spring({
		frame: localFrame - 95,
		fps,
		config: {damping: 16},
		durationInFrames: 20,
	});
	const switchKnobX = interpolate(switchT, [0, 1], [24, -24]);
	const switchTrackOpacity = interpolate(switchT, [0, 1], [1, 0.35]);

	const crossT = interpolate(localFrame, [135, 175], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const itchOpacity = interpolate(localFrame, [125, 140, 200, 230], [0, 1, 1, 0.5], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const labelOpacity = (from: number) =>
		interpolate(localFrame, [from, from + 10], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				backgroundColor: theme.insertBg,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<svg width={1080} height={1920} viewBox="0 0 1080 1920">
				{/* cell membrane */}
				<circle
					cx={cx}
					cy={cy}
					r={380}
					fill="none"
					stroke="#FFFFFF"
					strokeWidth={4}
					opacity={0.9}
					style={{transform: `scale(${membraneScale})`, transformOrigin: `${cx}px ${cy}px`}}
				/>
				<text
					x={cx}
					y={cy - 420}
					textAnchor="middle"
					fill="#FFFFFF"
					fontFamily={theme.fontFamily}
					fontWeight={700}
					fontSize={34}
					letterSpacing={4}
					opacity={labelOpacity(5)}
				>
					CÉLULA
				</text>

				{/* signal traveling inward */}
				<circle cx={sx} cy={sy} r={14} fill="#FFFFFF" opacity={signalOpacity} />

				{/* nucleus */}
				<circle
					cx={cx}
					cy={cy}
					r={95}
					fill="rgba(255,255,255,0.08)"
					stroke="#FFFFFF"
					strokeWidth={3}
					style={{transform: `scale(${nucleusScale})`, transformOrigin: `${cx}px ${cy}px`}}
				/>
				<text
					x={cx}
					y={cy + 6}
					textAnchor="middle"
					fill="#FFFFFF"
					fontFamily={theme.fontFamily}
					fontWeight={700}
					fontSize={22}
					letterSpacing={2}
					opacity={labelOpacity(30)}
				>
					NÚCLEO
				</text>

				{/* off switch, appears once signal arrives */}
				<g
					transform={`translate(${cx - 60}, ${cy + 170})`}
					opacity={interpolate(localFrame, [90, 100], [0, 1], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					})}
				>
					<rect
						x={0}
						y={0}
						width={120}
						height={56}
						rx={28}
						fill="none"
						stroke="#FFFFFF"
						strokeWidth={3}
						opacity={switchTrackOpacity}
					/>
					<circle cx={60 + switchKnobX} cy={28} r={20} fill="#FFFFFF" />
				</g>

				{/* itch icon + "off" slash */}
				<g transform={`translate(${cx}, ${cy + 430})`} opacity={itchOpacity}>
					<path
						d="M -70 20 Q -35 -30 0 20 Q 35 -30 70 20"
						fill="none"
						stroke="#FFFFFF"
						strokeWidth={5}
						strokeLinecap="round"
					/>
					<text
						x={0}
						y={70}
						textAnchor="middle"
						fill="#FFFFFF"
						fontFamily={theme.fontFamily}
						fontWeight={700}
						fontSize={22}
						letterSpacing={2}
					>
						COCEIRA
					</text>
					<line
						x1={-90}
						y1={-40}
						x2={90}
						y2={40}
						stroke="#FFFFFF"
						strokeWidth={7}
						strokeLinecap="round"
						strokeDasharray={180}
						strokeDashoffset={180 * (1 - crossT)}
					/>
				</g>
			</svg>
		</div>
	);
};
