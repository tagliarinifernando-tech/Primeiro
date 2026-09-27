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
	align?: 'center' | 'left';
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
				fontStyle: emphasis ? 'italic' : undefined,
				fontSize: emphasis ? baseFontSize * 3.1 : undefined,
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
	align = 'center',
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

	// group words into lines: an emphasized word breaks onto its own line,
	// so it reads as a standalone accent rather than sitting inline mid-sentence
	type Words = NonNullable<typeof active.words>;
	const lineGroups: Words[] = [];
	if (hasWords) {
		let current: Words = [];
		for (const w of active.words!) {
			if (w.emphasis) {
				if (current.length) lineGroups.push(current);
				lineGroups.push([w]);
				current = [];
			} else {
				current.push(w);
			}
		}
		if (current.length) lineGroups.push(current);
	}

	const justify = align === 'left' ? 'flex-start' : 'center';
	const resolvedTopPercent = active.topPercent ?? topPercent ?? 55;
	// Anchor by the BOTTOM of a single base-size line at topPercent, not the
	// top: a caption with no emphasis line renders identically to before, but
	// one with an oversized emphasis line (which can add 100+px of extra
	// height) grows upward from that fixed bottom instead of downward past
	// the bottom edge of the frame.
	const oneLineHeightPx = resolvedFontSize * 1.3;

	return (
		<div
			style={{
				position: 'absolute',
				bottom: `calc(${100 - resolvedTopPercent}% - ${oneLineHeightPx}px)`,
				left: 0,
				right: 0,
				display: 'flex',
				justifyContent: justify,
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
					textAlign: align,
					lineHeight: 1.3,
					textShadow: '0 2px 8px rgba(0,0,0,0.7)',
					letterSpacing: uppercase ? 1 : undefined,
					display: hasWords ? 'flex' : undefined,
					flexDirection: hasWords ? 'column' : undefined,
					alignItems: hasWords ? justify : undefined,
					gap: hasWords ? '0.05em' : undefined,
				}}
			>
				{hasWords
					? lineGroups.map((line, li) => (
							<div key={li} style={{display: 'flex', flexWrap: 'wrap', justifyContent: justify}}>
								{line.map((w, i) => (
									<AnimatedWord
										key={i}
										text={uppercase && !w.emphasis ? w.text.toUpperCase() : w.text}
										wordStartFrame={w.startFrame}
										frame={frame}
										emphasis={w.emphasis}
										baseFontSize={resolvedFontSize}
									/>
								))}
							</div>
					  ))
					: uppercase
					? active.text.toUpperCase()
					: active.text}
			</div>
		</div>
	);
};
