'use strict';
/**
 * M-style instrument cluster pictures.
 * Drawn on the centre screen as a preview, and on the real cluster
 * when Cluster renderer is installed. Stock lamps sit under this picture.
 */
const { withAlpha } = require('./kit/canvas');

const STYLES = [
    { id: 'off', name: 'Stock' },
    { id: 'm2', name: 'M2' },
    { id: 'm3', name: 'M3' },
];

const ICE = '#1cb5e0';
const NAVY = '#163a8a';
const RED = '#e10600';

function frac(look, s) {
    const redline = Number(look.redline) || 7000;
    const rpm = s.rpmN || 0;
    return Math.max(0, Math.min(1, rpm / redline));
}

function plate(cv, b, blink) {
    const r = Math.max(10, b.h * 0.05);
    cv.roundRect(b.x, b.y, b.w, b.h, r, '#07090c');
    if (blink) cv.strokeRoundRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4, r, 3, RED);
}

function stripesH(cv, x, y, w, h) {
    const a = w / 3;
    cv.fillRect(x, y, a, h, ICE);
    cv.fillRect(x + a, y, a, h, NAVY);
    cv.fillRect(x + a * 2, y, w - a * 2, h, RED);
}

function stripesV(cv, x, y, w, h) {
    const a = h / 3;
    cv.fillRect(x, y, w, a, ICE);
    cv.fillRect(x, y + a, w, a, NAVY);
    cv.fillRect(x, y + a * 2, w, h - a * 2, RED);
}

function dial(cv, cx, cy, r, f, blink) {
    const a0 = -120;
    const sweep = 240;
    const zone = 0.82;
    cv.arc(cx, cy, r * 0.78, r, a0, a0 + sweep, withAlpha('#ffffff', 0.14), { round: true });
    cv.arc(cx, cy, r * 0.78, r, a0 + sweep * zone, a0 + sweep, withAlpha(RED, 0.45), { round: true });
    const ink = blink ? RED : '#f4f7fb';
    if (f > 0.015) cv.arc(cx, cy, r * 0.78, r, a0, a0 + sweep * Math.min(f, zone), ink, { round: true });
    if (f > zone) cv.arc(cx, cy, r * 0.78, r, a0 + sweep * zone, a0 + sweep * f, RED, { round: true });
    cv.circle(cx, cy, r * 0.62, '#07090c');
}

function drawM2(cv, b, s, look) {
    plate(cv, b, look.blink);
    const r = b.h * 0.34;
    const cx = b.x + b.w * 0.2;
    const cy = b.y + b.h * 0.46;
    dial(cv, cx, cy, r, frac(look, s), look.blink);
    cv.text(s.rpm === '--' ? '--' : s.rpm, cx, cy + r * 0.08, r * 0.32, '#d5dbe2', { align: 'center', font: 'num' });
    cv.text('rpm', cx, cy + r * 0.38, r * 0.16, '#7d8792', { align: 'center', font: 'bold' });
    cv.text(s.speed, b.x + b.w * 0.54, b.y + b.h * 0.58, b.h * 0.46, '#ffffff', { align: 'center', font: 'num' });
    cv.text(s.unit, b.x + b.w * 0.54, b.y + b.h * 0.74, b.h * 0.09, '#8b949e', { align: 'center', font: 'bold' });
    cv.text(s.gear, b.x + b.w * 0.84, b.y + b.h * 0.56, b.h * 0.4, look.blink ? RED : '#ffffff', { align: 'center', font: 'gear' });
    const sh = Math.max(5, b.h * 0.045);
    stripesH(cv, b.x + b.w * 0.08, b.y + b.h - sh - b.h * 0.07, b.w * 0.22, sh);
}

function drawM3(cv, b, s, look) {
    plate(cv, b, look.blink);
    const f = frac(look, s);
    const x = b.x + b.w * 0.06;
    const y = b.y + b.h * 0.14;
    const w = b.w * 0.88;
    const h = Math.max(10, b.h * 0.07);
    const n = 24;
    const gap = Math.max(3, w * 0.006);
    const sw = (w - gap * (n - 1)) / n;
    const lit = Math.round(f * n);
    const zone = 20;
    for (let i = 0; i < n; i++) {
        const hot = i >= zone;
        const on = i < lit;
        let c = withAlpha('#ffffff', 0.12);
        if (on && hot) c = RED;
        else if (on) c = look.blink ? RED : '#f4f7fb';
        else if (hot) c = withAlpha(RED, 0.35);
        cv.roundRect(x + i * (sw + gap), y, sw, h, Math.max(2, h * 0.3), c);
    }
    cv.text(s.speed, b.x + b.w * 0.36, b.y + b.h * 0.7, b.h * 0.42, '#ffffff', { align: 'center', font: 'num' });
    cv.text(s.unit, b.x + b.w * 0.36, b.y + b.h * 0.84, b.h * 0.08, '#8b949e', { align: 'center', font: 'bold' });
    cv.text(s.rpm === '--' ? '' : s.rpm + ' rpm', b.x + b.w * 0.62, b.y + b.h * 0.78, b.h * 0.1, '#9aa3ad', { align: 'center', font: 'bold' });
    cv.text(s.gear, b.x + b.w * 0.84, b.y + b.h * 0.68, b.h * 0.36, look.blink ? RED : '#ffffff', { align: 'center', font: 'gear' });
    const swd = Math.max(6, b.w * 0.012);
    stripesV(cv, b.x + b.w * 0.93, b.y + b.h * 0.42, swd, b.h * 0.36);
}

function drawCluster(cv, area, id, s, look) {
    const b = { x: area.nx, y: area.ny, w: area.nw, h: area.nh };
    if (id === 'm3') drawM3(cv, b, s, look);
    else if (id === 'm2') drawM2(cv, b, s, look);
}

module.exports = { STYLES, drawCluster };
