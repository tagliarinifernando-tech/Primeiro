import {editData2} from './data2';

const {sourceWidth, sourceHeight, cropWidth, cropX} = editData2.crop;
const {width: compWidth, height: compHeight} = editData2;

const baseScale = compWidth / cropWidth;
const cropCenterX = cropX + cropWidth / 2;
const sourceCenterY = sourceHeight / 2;

/**
 * Punch-in zoom stays centered on the crop window (i.e. the presenter),
 * regardless of zoom factor. translateXPercent nudges that center by a
 * percentage of the OUTPUT frame width, for the "respirar" micro-reposition.
 */
export const getCropTransform = (punchScale: number, translateXPercent: number) => {
	const totalScale = baseScale * punchScale;
	const translateX =
		compWidth / 2 - cropCenterX * totalScale + compWidth * (translateXPercent / 100);
	const translateY = compHeight / 2 - sourceCenterY * totalScale;
	return {translateX, translateY, totalScale};
};

export {sourceWidth, sourceHeight};
