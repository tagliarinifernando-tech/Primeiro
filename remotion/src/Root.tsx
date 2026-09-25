import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {editData, TOTAL_WITH_END_CARD} from './data';
import {Main2} from './Main2';
import {editData2, TOTAL_WITH_END_CARD_2} from './data2';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="Main"
				component={Main}
				durationInFrames={TOTAL_WITH_END_CARD}
				fps={editData.fps}
				width={editData.width}
				height={editData.height}
			/>
			<Composition
				id="Reels2"
				component={Main2}
				durationInFrames={TOTAL_WITH_END_CARD_2}
				fps={editData2.fps}
				width={editData2.width}
				height={editData2.height}
			/>
		</>
	);
};
