import raw from './data.json';

export interface CaptionWord {
	text: string;
	startFrame: number;
	endFrame: number;
}

export interface Caption {
	startFrame: number;
	endFrame: number;
	text: string;
	words?: CaptionWord[];
}

export interface Segment {
	index: number;
	sourceStart: number;
	sourceEnd: number;
	editedStart: number;
	editedEnd: number;
	durationFrames: number;
	trimBeforeFrames: number;
	text: string;
	captions: Caption[];
}

export interface KeywordEvent {
	frame: number;
	endFrame: number;
	word: string;
}

export interface SfxEvent {
	frame: number;
	type: 'hit' | 'pop' | 'whoosh';
}

export interface EditData {
	fps: number;
	width: number;
	height: number;
	totalFrames: number;
	segments: Segment[];
	keywordEvents: KeywordEvent[];
	sfxEvents: SfxEvent[];
	zoomEmphasisIndices: number[];
	motionGraphics: {startFrame: number; endFrame: number};
}

export const editData = raw as EditData;

export const END_CARD_FRAMES = 110; // ~3.7s at 30fps
export const TOTAL_WITH_END_CARD = editData.totalFrames + END_CARD_FRAMES;
