import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {Caption} from '../data';

interface CaptionStyleProps {
	fontFamily?: string;
	fontWeight?: number;
	fontSize?: number;
	color?: string;
	uppercase?: boolean;
	topPercent?: number;
}

const AnimatedWord: React.FC<{
	text: string;
	wordStartFrame: number;
	frame: number;
	emphasis?: boolean;
	baseFontSize: number;
}> = ({text, wordStartFrame, frame, emphasis, baseFontSize}) => {
	const {fps} = useVideoConfig();
	const local = frame - wordStartFrame;
	const s = spring({frame: local, fps, config: {damping: 12, stiffness: 220}, durationInFrames: 8});
	const opacity = interpolate(local, [0, 4], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const scale = interpolate(s, [0, 1], [1.5, 1]);

	return (
		<span
			style={{
				display: 'inline-block',
				opacity,
				transform: `scale(${scale})`,
				marginRight: emphasis ? '0.12em' : '0.28em',
				marginLeft: emphasis ? '0.08em' : undefined,
				fontFamily: emphasis ? theme.scriptFontFamily : undefined,
				fontSize: emphasis ? baseFontSize * 1.6 : undefined,
				fontWeight: emphasis ? 400 : undefined,
				letterSpacing: emphasis ? 'normal' : undefined,
				textTransform: emphasis ? 'none' : undefined,
				color: emphasis ? theme.accentColor : undefined,
			}}
		>
			{text}
		</span>
	);
};

export const CaptionOverlay: React.FC<{captions: Caption[]; frame: number} & CaptionStyleProps> = ({
	captions,
	frame,
	fontFamily,
	fontWeight,
	fontSize,
	color,
	uppercase,
	topPercent,
}) => {
	const active = captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
	if (!active) return null;

	const localFrame = frame - active.startFrame;
	const opacity = interpolate(localFrame, [0, 3], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const hasWords = active.words && active.words.length > 0;
	const resolvedFontSize = fontSize ?? theme.captionSize;

	return (
		<div
			style={{
				position: 'absolute',
				top: `${active.topPercent ?? topPercent ?? 55}%`,
				left: 0,
				right: 0,
				display: 'flex',
				justifyContent: 'center',
				padding: '0 60px',
				opacity: hasWords ? 1 : opacity,
			}}
		>
			<div
				style={{
					fontFamily: fontFamily ?? theme.fontFamily,
					fontWeight: fontWeight ?? 500,
					fontSize: resolvedFontSize,
					color: color ?? theme.captionColor,
					textAlign: 'center',
					lineHeight: 1.3,
					textShadow: '0 2px 8px rgba(0,0,0,0.7)',
					letterSpacing: uppercase ? 1 : undefined,
				}}
			>
				{hasWords
					? active.words!.map((w, i) => (
							<AnimatedWord
								key={i}
								text={uppercase && !w.emphasis ? w.text.toUpperCase() : w.text}
								wordStartFrame={w.startFrame}
								frame={frame}
								emphasis={w.emphasis}
								baseFontSize={resolvedFontSize}
							/>
					  ))
					: uppercase
					? active.text.toUpperCase()
					: active.text}
			</div>
		</div>
	);
};
