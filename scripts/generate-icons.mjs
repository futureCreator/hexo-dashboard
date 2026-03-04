import sharp from "sharp";
import { writeFileSync } from "fs";

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0052FF"/>
  <text x="256" y="320" font-family="serif" font-size="280" font-weight="bold" text-anchor="middle" fill="white">H</text>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svgIcon))
    .resize(size, size)
    .png()
    .toFile(`./public/icons/icon-${size}x${size}.png`);
  console.log(`Generated ${size}x${size}`);
}

// Apple touch icon (180x180)
await sharp(Buffer.from(svgIcon))
  .resize(180, 180)
  .png()
  .toFile(`./public/icons/apple-touch-icon.png`);
console.log("Generated apple-touch-icon 180x180");

// Favicon (32x32)
await sharp(Buffer.from(svgIcon))
  .resize(32, 32)
  .png()
  .toFile(`./public/favicon.png`);
console.log("Generated favicon 32x32");
