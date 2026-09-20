import React from 'react';
import {
	AbsoluteFill,
	Audio,
	Sequence,
	interpolate,
	staticFile,
	useCurrentFrame,
} from 'remotion';
import {Video} from '@remotion/media';
import {editData, TOTAL_WITH_END_CARD} from './data';
import {getSegmentTransform} from './segmentTransform';
import {CaptionOverlay} from './components/CaptionOverlay';
import {KeywordStack} from './components/KeywordStack';
import {MotionGraphicsCelula} from './components/MotionGraphicsCelula';
import {EndCard} from './components/EndCard';

const allCaptions = editData.segments.flatMap((s) => s.captions);
const hookKeywords = editData.keywordEvents.filter((k) => k.word !== 'UPADACITINIBE');
const revealKeyword = editData.keywordEvents.filter((k) => k.word === 'UPADACITINIBE');

export const Main: React.FC = () => {
	const frame = useCurrentFrame();
	const inMotionGraphics =
		frame >= editData.motionGraphics.startFrame && frame < editData.motionGraphics.endFrame;

	const fadeOutOpacity = interpolate(
		frame,
		[TOTAL_WITH_END_CARD - 15, TOTAL_WITH_END_CARD],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	return (
		<AbsoluteFill style={{backgroundColor: '#000000'}}>
			{editData.segments.map((segment) => {
				const isEmphasis = editData.zoomEmphasisIndices.includes(segment.index);
				return (
					<Sequence
						key={segment.index}
						from={Math.round(segment.editedStart * editData.fps)}
						durationInFrames={segment.durationFrames}
					>
						<SegmentVideo segment={segment} isEmphasis={isEmphasis} />
					</Sequence>
				);
			})}

			<Sequence
				from={editData.motionGraphics.startFrame}
				durationInFrames={editData.motionGraphics.endFrame - editData.motionGraphics.startFrame}
			>
				<MotionGraphicsInner />
			</Sequence>

			{!inMotionGraphics && <CaptionOverlay captions={allCaptions} frame={frame} />}
			<KeywordStack events={hookKeywords} frame={frame} />
			<KeywordStack events={revealKeyword} frame={frame} big />

			<Audio src={staticFile('audio/voice.wav')} />

			{editData.sfxEvents.map((event, i) => (
				<Sequence key={i} from={event.frame} durationInFrames={30}>
					<Audio src={staticFile(`sfx/${event.type}.wav`)} />
				</Sequence>
			))}

			<Sequence from={editData.totalFrames} durationInFrames={TOTAL_WITH_END_CARD - editData.totalFrames}>
				<EndCardInner />
			</Sequence>

			<AbsoluteFill style={{backgroundColor: '#000000', opacity: fadeOutOpacity}} />
		</AbsoluteFill>
	);
};

const SegmentVideo: React.FC<{segment: (typeof editData.segments)[number]; isEmphasis: boolean}> = ({
	segment,
	isEmphasis,
}) => {
	const frame = useCurrentFrame();
	const {scale, translateXPercent} = getSegmentTransform(segment, frame, isEmphasis);

	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Video
				src={staticFile('CRU.mp4')}
				trimBefore={segment.trimBeforeFrames}
				trimAfter={segment.trimBeforeFrames + segment.durationFrames}
				muted
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					transform: `scale(${scale}) translateX(${translateXPercent}%)`,
					filter: 'contrast(1.08) saturate(1.15) brightness(1.02) sepia(0.06)',
				}}
			/>
		</AbsoluteFill>
	);
};

const MotionGraphicsInner: React.FC = () => {
	const frame = useCurrentFrame();
	return <MotionGraphicsCelula localFrame={frame} />;
};

const EndCardInner: React.FC = () => {
	const frame = useCurrentFrame();
	return <EndCard localFrame={frame} />;
};
