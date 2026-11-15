'use strict';
/**
 * The style chosen on the centre screen, drawn on the windshield.
 * Cluster renderer (robertnisipeanu/idrive-apps, ID7 and ID8) owns the glass.
 * This file only sends it one transparent picture. Dark pixels stay see-through.
 */
const { Canvas } = require('./kit/canvas');
const { HudClaim } = require('./kit/hud_claim');
let ClusterRender = null;
try { ClusterRender = require('./cluster_render_client').ClusterRender; } catch (e) { /* client missing */ }

function sceneOf(targets) {
    const m = /(?:^|,)\s*hud:(\d+)x(\d+)/.exec(String(targets || ''));
    if (!m) return { w: 800, h: 480, box: { x: 140, y: 96, w: 480, h: 168 } };
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w <= 420) return { w: w, h: h, box: { x: 6, y: 4, w: Math.max(40, w - 12), h: Math.max(40, h - 8) } };
    return { w: w, h: h, box: { x: 140, y: 96, w: 480, h: 168 } };
}

function startHud(log, draw) {
    const state = { live: false, note: 'Glass: install Cluster renderer' };
    if (!ClusterRender) return { update() {}, status: () => state.note };

    let cr = null;
    let layer = 0;
    let scene = sceneOf('');
    let claim = null;
    let last = '';
    try { claim = new HudClaim('c365_drive', log); } catch (e) { /* claim file unavailable */ }

    function paint(style, snap) {
        if (!layer || !cr) return;
        const cv = new Canvas(scene.w, scene.h);
        const b = scene.box;
        draw(cv, {
            nx: b.x,
            ny: b.y,
            nw: b.w,
            nh: b.h,
        }, style, snap, true);
        cr.pixels(layer, null, Buffer.from(cv.d.buffer, cv.d.byteOffset, cv.d.length));
    }

    function arm() {
        scene = sceneOf(cr.targets);
        layer = cr.image({
            target: 'hud',
            klass: 'overlay',
            z: 0,
            x: 0,
            y: 0,
            w: scene.w,
            h: scene.h,
            fps: 10,
            sampling: 'bilinear',
        });
        if (!layer) {
            state.live = false;
            state.note = 'Glass: HUD layer refused';
            return;
        }
        state.live = true;
        state.note = 'Glass: on the projection';
        if (claim) claim.hold(true);
        last = '';
        if (log) log.info('hud: ' + scene.w + 'x' + scene.h);
    }

    try {
        cr = new ClusterRender('c365_drive');
        cr.on('ready', () => {
            try { arm(); } catch (e) { if (log) log.warn('hud: ' + e.message); }
        });
        cr.on('disconnected', () => {
            layer = 0;
            state.live = false;
            state.note = 'Glass: Cluster renderer stopped';
            if (claim) claim.hold(false);
        });
        cr.connect();
    } catch (e) {
        state.note = 'Glass: ' + e.message;
        if (log) log.warn('hud: ' + e.message);
    }

    return {
        update(style, snap) {
            if (!layer) return;
            const key = [style.id, style.accent, style.text, style.red, style.font, style.size, style.height,
                style.redline, style.blink ? 1 : 0, style.cam || '', snap.speed, snap.gear, snap.rpm].join('|');
            if (key === last) return;
            last = key;
            try { paint(style, snap); } catch (e) { if (log) log.warn('hud paint: ' + e.message); }
        },
        status() { return state.note; },
    };
}

module.exports = { startHud };
