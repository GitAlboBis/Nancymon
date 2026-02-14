
import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';

const SCALE_FACTOR = 0.5;

const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');
const TMJ_PATH = path.join(ASSETS_DIR, 'house.tmj');
const BG_PATH = path.join(ASSETS_DIR, 'house_bg.png');

async function scaleAssets() {
    console.log(`Starting scaling process with factor: ${SCALE_FACTOR}`);

    // 1. Scale Background Image
    try {
        console.log(`Reading image: ${BG_PATH}`);
        const image = await Jimp.read(BG_PATH);

        console.log(`Original Size: ${image.width}x${image.height}`);

        image.resize({ w: image.width * SCALE_FACTOR, h: image.height * SCALE_FACTOR });

        console.log(`New Size: ${image.width}x${image.height}`);

        await image.write(BG_PATH);
        console.log('✅ Background image scaled and saved.');
    } catch (err) {
        console.error('❌ Error scaling image:', err);
        return;
    }

    // 2. Scale TMJ Map Data
    try {
        console.log(`Reading map data: ${TMJ_PATH}`);
        const rawData = fs.readFileSync(TMJ_PATH, 'utf8');
        const mapData = JSON.parse(rawData);

        // Scale Map Properties
        if (mapData.width) mapData.width = Math.round(mapData.width); // Tile count stays same? No, wait. 
        // Actually, Tiled maps defined by tile count. If we scale the image, we usually want to KEEP tile size (32) and reduce tile count?
        // OR process "infinite" map vs fixed. Use pixel coordinates for scaling objects.

        // Let's assume standard object layer scaling mostly.

        // Scale Layers
        mapData.layers.forEach(layer => {
            if (layer.type === 'imagelayer') {
                if (layer.offsetx) layer.offsetx *= SCALE_FACTOR;
                if (layer.offsety) layer.offsety *= SCALE_FACTOR;
                // imagewidth/height might be metadata, update them
                if (layer.imagewidth) layer.imagewidth *= SCALE_FACTOR;
                if (layer.imageheight) layer.imageheight *= SCALE_FACTOR;
            }

            if (layer.type === 'objectgroup') {
                layer.objects.forEach(obj => {
                    obj.x *= SCALE_FACTOR;
                    obj.y *= SCALE_FACTOR;
                    obj.width *= SCALE_FACTOR;
                    obj.height *= SCALE_FACTOR;

                    // Scale polygon points if they exist
                    if (obj.polygon) {
                        obj.polygon.forEach(point => {
                            point.x *= SCALE_FACTOR;
                            point.y *= SCALE_FACTOR;
                        });
                    }

                    if (obj.polyline) {
                        obj.polyline.forEach(point => {
                            point.x *= SCALE_FACTOR;
                            point.y *= SCALE_FACTOR;
                        });
                    }
                });
            }
        });

        // Note: For tile layers, scaling is trickier. 
        // If the map is tile-based, changing the scale usually means changing tile size OR map dimensions.
        // But here the user says "map is too big", likely meaning the visual representation.
        // Since it's an image-based map ("imagelayer"), we mainly care about Objects matching the new image size.
        // We do NOT change 'tilewidth'/'tileheight' (32) usually, unless the whole game scales.
        // But we MIGHT need to adjust 'width'/'height' (in tiles) if the bounds are enforced.

        // Let's verify existing map type. 
        // It has an imagelayer "house_bg.png".
        // It has object layers.
        // It usually doesn't have tile layers for the background if it's an image map.

        fs.writeFileSync(TMJ_PATH, JSON.stringify(mapData, null, 1)); // 1 space indent to match file style
        console.log('✅ TMJ map data scaled and saved.');

    } catch (err) {
        console.error('❌ Error scaling TMJ:', err);
    }
}

scaleAssets();
