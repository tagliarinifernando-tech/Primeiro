import React from 'react';

/**
 * Classic anamorphic-lens streak flare: a thin horizontal blue-cyan bar
 * through a bright point light, with a warm core hotspot and a touch of
 * chromatic fringing. Positioned in OUTPUT pixel space (already run through
 * the same crop/punch-in transform as the video) so its size stays constant
 * on screen while its position tracks the real light source as the shot
 * zooms/pans.
 */
export const AnamorphicFlare: React.FC<{x: number; y: number; intensity?: number}> = ({
	x,
	y,
	intensity = 1,
}) => {
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				transform: 'translate(-50%, -50%)',
				mixBlendMode: 'screen',
				opacity: 0.85 * intensity,
				pointerEvents: 'none',
			}}
		>
			{/* main horizontal streak */}
			<div
				style={{
					position: 'absolute',
					left: -900,
					top: -3,
					width: 1800,
					height: 6,
					background:
						'linear-gradient(90deg, rgba(120,180,255,0) 0%, rgba(140,190,255,0.35) 30%, rgba(200,225,255,0.9) 47%, #FFFFFF 50%, rgba(200,225,255,0.9) 53%, rgba(140,190,255,0.35) 70%, rgba(120,180,255,0) 100%)',
					filter: 'blur(3px)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: -500,
					top: -14,
					width: 1000,
					height: 28,
					background:
						'linear-gradient(90deg, rgba(90,160,255,0) 0%, rgba(90,160,255,0.25) 45%, rgba(150,200,255,0.5) 50%, rgba(90,160,255,0.25) 55%, rgba(90,160,255,0) 100%)',
					filter: 'blur(10px)',
				}}
			/>

			{/* chromatic fringing above/below the streak */}
			<div
				style={{
					position: 'absolute',
					left: -260,
					top: -12,
					width: 520,
					height: 3,
					background:
						'linear-gradient(90deg, rgba(255,120,90,0) 0%, rgba(255,140,100,0.45) 50%, rgba(255,120,90,0) 100%)',
					filter: 'blur(2px)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: -260,
					top: 9,
					width: 520,
					height: 3,
					background:
						'linear-gradient(90deg, rgba(80,220,255,0) 0%, rgba(80,220,255,0.4) 50%, rgba(80,220,255,0) 100%)',
					filter: 'blur(2px)',
				}}
			/>

			{/* bright core hotspot at the light itself */}
			<div
				style={{
					position: 'absolute',
					left: -34,
					top: -34,
					width: 68,
					height: 68,
					borderRadius: '50%',
					background:
						'radial-gradient(circle, #FFFFFF 0%, rgba(255,244,214,0.85) 25%, rgba(255,220,160,0.35) 50%, rgba(255,220,160,0) 75%)',
					filter: 'blur(1.5px)',
				}}
			/>
		</div>
	);
};
