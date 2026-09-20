import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {editData, TOTAL_WITH_END_CARD} from './data';

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			id="Main"
			component={Main}
			durationInFrames={TOTAL_WITH_END_CARD}
			fps={editData.fps}
			width={editData.width}
			height={editData.height}
		/>
	);
};
