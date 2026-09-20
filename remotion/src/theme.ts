import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

const LATIN_RANGE =
	'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT_RANGE =
	'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const fontFamily = 'Montserrat';

for (const weight of ['500', '700', '900']) {
	loadFont({
		family: fontFamily,
		url: staticFile(`fonts/montserrat-latin-${weight}-normal.woff2`),
		weight,
		unicodeRange: LATIN_RANGE,
	});
	loadFont({
		family: fontFamily,
		url: staticFile(`fonts/montserrat-latin-ext-${weight}-normal.woff2`),
		weight,
		unicodeRange: LATIN_EXT_RANGE,
	});
}

export const theme = {
	fontFamily,
	captionColor: '#FFFFFF',
	captionSize: 40,
	accentColor: '#FFFFFF',
	insertBg: '#0E0E10',
	insertBgLight: '#F4F2ED',
	endCardBg: '#0E0E10',
	glow: '0 0 6px rgba(255,255,255,0.9), 0 0 18px rgba(255,255,255,0.6), 0 0 36px rgba(255,255,255,0.35)',
};

export const presenter = {
	name: 'Fernando Tagliarini',
	credential: 'CRM-SP 139.154',
	tagline: 'dermatologia que conecta',
	instagram: '@drfernandotagliarini' as string | undefined,
};
