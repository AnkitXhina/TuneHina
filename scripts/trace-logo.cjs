const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs');

const inputPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c9d226be-4432-4a47-b0fe-651e543867c4\\media__1782222382676.png';
const tempMaskPath = 'temp_mask.png';
const outSvgPath = 'traced_logo.svg';

async function run() {
  try {
    // 1. Threshold the image to create a binary mask (black logo on white background for potrace)
    // The logo is bright on a black background.
    // We want the logo to be black and the background to be white for potrace.
    const { data, info } = await sharp(inputPath)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Invert and threshold: if pixel > 20, make it black (0), else make it white (255)
    for (let i = 0; i < data.length; i++) {
      data[i] = data[i] > 20 ? 0 : 255;
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 1
      }
    })
    .toFile(tempMaskPath);

    console.log('Saved temp mask');

    // 2. Trace the mask
    potrace.trace(tempMaskPath, { 
      threshold: 128, 
      turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
      turdSize: 100, // ignore small noise
      optCurve: true,
      alphamax: 1, // 1 is default corner threshold
      optTolerance: 0.2
    }, (err, svg) => {
      if (err) throw err;
      
      // We got the raw SVG string. We can save it.
      fs.writeFileSync(outSvgPath, svg);
      console.log('Saved traced SVG to', outSvgPath);
    });

  } catch (e) {
    console.error(e);
  }
}

run();
