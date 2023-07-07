import bwipjs from 'bwip-js'; // Assuming you are using bwip-js
import axios from 'axios';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config();

const CARD_LOGO = process.env.CARD_LOGO; // Replace with your actual logo url

async function generateCard(number, name, surname) {
  if (!number) return null;

  return new Promise(async (resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: number,
        scale: 4,
        height: 20,
        includetext: true,
        textxalign: "center",
      },
      async (err, pngBuffer) => {
        if (err) {
          reject(err);
        } else {
          try {
            // Fetch the logo image from a URL
            const response = await axios.get(CARD_LOGO, {
              responseType: "arraybuffer",
            });
            const logoBuffer = Buffer.from(response.data, "binary");
            // Resize the images
            const logoHeight = 200;
            const resizedLogoBuffer = await sharp(logoBuffer)
              .resize({ height: logoHeight })
              .toBuffer();
            const barcodeHeight = 300;
            const barcodeWidth = 600;
            const resizedBarcodeBuffer = await sharp(pngBuffer)
              .resize(barcodeWidth, barcodeHeight, {
                fit: sharp.fit.inside,
                position: sharp.gravity.center,
              })
              .toBuffer();

            // Get the width of the resized images
            const [logoMetadata, barcodeMetadata] = await Promise.all([
              sharp(resizedLogoBuffer).metadata(),
              sharp(resizedBarcodeBuffer).metadata(),
            ]);

            const logoWidth = logoMetadata.width;

            // Create SVG text
            const text = `${name} ${surname}`;
            const svgText = `
              <svg width="700" height="${barcodeHeight}">
                <style>
                  .text { fill: #000; font-size: 50px; font-weight: bold;  font-family: 'Roboto', sans-serif;}
                </style>
                <text x="50%" y="50%" text-anchor="middle" class="text">${text}</text>
              </svg>
            `;
            const svgTextBuffer = Buffer.from(svgText);

            // Create a new blank image
            const baseWidth = 720;
            const baseHeight = 840;
            const image = sharp({
              create: {
                width: baseWidth,
                height: baseHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              },
            });

            // Composite the images and the SVG text
            const outputBuffer = await image
              .composite([
                {
                  input: resizedLogoBuffer,
                  top: 70,
                  left: Math.round((baseWidth - logoWidth) / 2),
                },
                {
                  input: svgTextBuffer,
                  top: 250,
                  left: Math.round(baseWidth - 700),
                },
                {
                  input: resizedBarcodeBuffer,
                  top: 500,
                  left: Math.round((baseWidth - barcodeWidth) / 2),
                },
              ])
              .png()
              .toBuffer();

            resolve(outputBuffer);
          } catch (error) {
            reject(error);
          }
        }
      }
    );
  });
}

export default generateCard;
