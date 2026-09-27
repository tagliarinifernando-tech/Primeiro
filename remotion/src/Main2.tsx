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
import {editData2} from './data2';
import {getSegmentTransform} from './segmentTransform';
import {getCropTransform, sourceWidth, sourceHeight} from './cropTransform';
import {CaptionOverlay} from './components/CaptionOverlay';
import {KeywordStack} from './components/KeywordStack';
import {MotionGraphicsBeforeAfter} from './components/MotionGraphicsBeforeAfter';
import {MotionGraphicsMissions} from './components/MotionGraphicsMissions';
import {AnamorphicFlare} from './components/AnamorphicFlare';
import {theme} from './theme';

// Bright ceiling spotlight, in SOURCE pixel coordinates - the camera is a
// fixed tripod shot for the whole take, so one anchor works throughout.
const FLARE_ANCHOR = {x: 973, y: 207};

const allCaptions = editData2.segments.flatMap((s) => s.captions);

// J-cut: delay every internal video cut by a few frames relative to its
// matching audio/caption cut, so the next line is already heard while the
// previous shot lingers. The very first and last edges stay unshifted.
const JCUT_FRAMES = 3;
const segmentCount = editData2.segments.length;

const getJCutWindow = (segment: (typeof editData2.segments)[number]) => {
	const i = segment.index;
	const fromFrame =
		Math.round(segment.editedStart * editData2.fps) + (i > 0 ? JCUT_FRAMES : 0);
	const toFrame =
		Math.round(segment.editedEnd * editData2.fps) + (i < segmentCount - 1 ? JCUT_FRAMES : 0);
	const durationInFrames = toFrame - fromFrame;
	const trimBefore = segment.trimBeforeFrames + (i > 0 ? JCUT_FRAMES : 0);
	return {fromFrame, durationInFrames, trimBefore};
};

export const Main2: React.FC = () => {
	const frame = useCurrentFrame();
	const inMg1 =
		frame >= editData2.motionGraphics1.startFrame && frame < editData2.motionGraphics1.endFrame;
	const inMg2 =
		frame >= editData2.motionGraphics2.startFrame && frame < editData2.motionGraphics2.endFrame;

	const fadeOutOpacity = interpolate(
		frame,
		[editData2.totalFrames - 15, editData2.totalFrames],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	return (
		<AbsoluteFill style={{backgroundColor: '#000000'}}>
			{editData2.segments.map((segment) => {
				const isEmphasis = editData2.zoomEmphasisIndices.includes(segment.index);
				const {fromFrame, durationInFrames, trimBefore} = getJCutWindow(segment);
				return (
					<Sequence key={segment.index} from={fromFrame} durationInFrames={durationInFrames}>
						<SegmentVideo2
							segment={segment}
							isEmphasis={isEmphasis}
							trimBefore={trimBefore}
							durationInFrames={durationInFrames}
						/>
					</Sequence>
				);
			})}

			<Sequence
				from={editData2.motionGraphics1.startFrame}
				durationInFrames={editData2.motionGraphics1.endFrame - editData2.motionGraphics1.startFrame}
			>
				<MotionGraphicsBeforeAfterInner />
			</Sequence>

			<Sequence
				from={editData2.motionGraphics2.startFrame}
				durationInFrames={editData2.motionGraphics2.endFrame - editData2.motionGraphics2.startFrame}
			>
				<MotionGraphicsMissionsInner />
			</Sequence>

			{!inMg1 && !inMg2 && (
				<CaptionOverlay
					captions={allCaptions}
					frame={frame}
					fontFamily={theme.dynamicFontFamily}
					fontWeight={400}
					fontSize={46}
					uppercase
					topPercent={72}
				/>
			)}
			<KeywordStack
				events={editData2.keywordEvents}
				frame={frame}
				position="right"
				fontSize={120}
			/>

			<Audio src={staticFile('audio/voice2.wav')} />
			<Audio src={staticFile('audio/ambience2.wav')} />

			{editData2.sfxEvents.map((event, i) => (
				<Sequence key={i} from={event.frame} durationInFrames={30}>
					<Audio src={staticFile(`sfx/${event.type}.wav`)} />
				</Sequence>
			))}

			{/* distant PA boarding chime, twice, well clear of speech */}
			<Sequence from={345} durationInFrames={60}>
				<Audio src={staticFile('sfx/chime.wav')} />
			</Sequence>
			<Sequence from={1830} durationInFrames={60}>
				<Audio src={staticFile('sfx/chime.wav')} />
			</Sequence>

			<AbsoluteFill style={{backgroundColor: '#000000', opacity: fadeOutOpacity}} />
		</AbsoluteFill>
	);
};

const SegmentVideo2: React.FC<{
	segment: (typeof editData2.segments)[number];
	isEmphasis: boolean;
	trimBefore: number;
	durationInFrames: number;
}> = ({segment, isEmphasis, trimBefore, durationInFrames}) => {
	const frame = useCurrentFrame();
	const {scale, translateXPercent} = getSegmentTransform(segment, frame, isEmphasis);
	const {translateX, translateY, totalScale} = getCropTransform(scale, translateXPercent);
	const flareX = translateX + FLARE_ANCHOR.x * totalScale;
	const flareY = translateY + FLARE_ANCHOR.y * totalScale;

	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Video
				src={staticFile('CRU2.mov')}
				trimBefore={trimBefore}
				trimAfter={trimBefore + durationInFrames}
				muted
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: sourceWidth,
					height: sourceHeight,
					transformOrigin: '0 0',
					transform: `translate(${translateX}px, ${translateY}px) scale(${totalScale})`,
					filter: 'contrast(1.08) saturate(1.15) brightness(1.02) sepia(0.06)',
				}}
			/>
			<AnamorphicFlare x={flareX} y={flareY} />
		</AbsoluteFill>
	);
};

const MotionGraphicsBeforeAfterInner: React.FC = () => {
	const frame = useCurrentFrame();
	return <MotionGraphicsBeforeAfter localFrame={frame} />;
};

const MotionGraphicsMissionsInner: React.FC = () => {
	const frame = useCurrentFrame();
	return <MotionGraphicsMissions localFrame={frame} />;
};
