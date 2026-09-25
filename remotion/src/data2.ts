import raw from './data2.json';
import type {Caption, KeywordEvent, SfxEvent, Segment} from './data';

export interface EditData2 {
	fps: number;
	width: number;
	height: number;
	totalFrames: number;
	segments: Segment[];
	keywordEvents: KeywordEvent[];
	sfxEvents: SfxEvent[];
	zoomEmphasisIndices: number[];
	motionGraphics1: {startFrame: number; endFrame: number};
	motionGraphics2: {startFrame: number; endFrame: number};
	crop: {sourceWidth: number; sourceHeight: number; cropWidth: number; cropX: number};
}

export const editData2 = raw as EditData2;

export const END_CARD_FRAMES_2 = 110;
export const TOTAL_WITH_END_CARD_2 = editData2.totalFrames + END_CARD_FRAMES_2;

export type {Caption};
