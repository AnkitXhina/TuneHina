import { lyricsManager } from './src/providers/lyrics/LyricsManager.js';

async function test() {
  const dummySong = {
    id: "HhqjeUzz",
    name: "Shape of You",
    type: "song",
    duration: 233,
    explicitContent: false,
    hasLyrics: true,
    album: { id: "123", name: "Divide" },
    artists: { primary: [{ id: "1", name: "Ed Sheeran", type: "artist", image: [] }], featured: [], all: [] },
    image: [],
    downloadUrl: []
  };

  try {
    const result = await lyricsManager.getLyrics(dummySong, (status) => console.log('STATUS:', status));
    console.log('RESULT:', result ? (result.synced ? 'HAS SYNCED' : 'HAS PLAIN') : 'NULL');
  } catch (e) {
    console.error('ERROR:', e);
  }
}
test();
