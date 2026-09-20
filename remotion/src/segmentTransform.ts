import {interpolate} from 'remotion';
import type {Segment} from './data';

const BASE_SCALE = 1.0;
const PUNCH_SCALE = 1.18;
const EMPHASIS_SCALE = 1.3;
const MICRO_TRANSLATE_PERCENT = 2;
const CREEP_ZOOM_MIN_FRAMES = 180; // 6s @30fps
const CREEP_ZOOM_AMOUNT = 0.025;

export const getSegmentTransform = (
	segment: Segment,
	localFrame: number,
	isEmphasis: boolean,
) => {
	if (isEmphasis) {
		return {scale: EMPHASIS_SCALE, translateXPercent: 0};
	}

	const isOdd = segment.index % 2 === 1;
	let scale = isOdd ? PUNCH_SCALE : BASE_SCALE;
	const translateXPercent = isOdd ? MICRO_TRANSLATE_PERCENT : -MICRO_TRANSLATE_PERCENT;

	if (segment.durationFrames >= CREEP_ZOOM_MIN_FRAMES) {
		const creep = interpolate(localFrame, [0, segment.durationFrames], [0, CREEP_ZOOM_AMOUNT], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});
		scale += creep;
	}

	return {scale, translateXPercent};
};
