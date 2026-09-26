import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {KeywordEvent} from '../data';

const KeywordItem: React.FC<{event: KeywordEvent; frame: number; fontSize: number}> = ({
	event,
	frame,
	fontSize,
}) => {
	const {fps} = useVideoConfig();
	const localFrame = frame - event.frame;
	const scale = spring({
		frame: localFrame,
		fps,
		config: {damping: 12, stiffness: 200, mass: 0.5},
		durationInFrames: 8,
	});

	return (
		<div
			style={{
				fontFamily: theme.fontFamily,
				fontWeight: 900,
				fontSize,
				color: '#FFFFFF',
				textShadow: theme.glow,
				textAlign: 'center',
				transform: `scale(${scale})`,
				letterSpacing: 1,
			}}
		>
			{event.word}
		</div>
	);
};

export const KeywordStack: React.FC<{
	events: KeywordEvent[];
	frame: number;
	big?: boolean;
	position?: 'center' | 'left' | 'right';
	fontSize?: number;
}> = ({events, frame, big, position = 'center', fontSize}) => {
	const active = events.filter((e) => frame >= e.frame && frame < e.endFrame);
	if (active.length === 0) return null;

	const justifyContent =
		position === 'left' ? 'flex-start' : position === 'right' ? 'flex-end' : 'center';
	const sidePadding = position === 'center' ? 0 : 90;

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: justifyContent,
				justifyContent: 'center',
				gap: 18,
				paddingLeft: sidePadding,
				paddingRight: sidePadding,
			}}
		>
			{active.map((e) => (
				<KeywordItem
					key={e.word}
					event={e}
					frame={frame}
					fontSize={fontSize ?? (big ? 76 : 58)}
				/>
			))}
		</div>
	);
};
