// Draws the "Notice of Exorcism" share card onto a canvas and copies/saves it.
(function (root) {
  'use strict';

  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = test;
    }
    ctx.fillText(line, x, y);
    return y + lh;
  }

  function drawCard(cv, info, fmt, url) {
    const W = 900, H = 560;
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');

    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#f6ead0'); bg.addColorStop(1, '#e5d0a0');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#3b2358'; c.lineWidth = 8; c.strokeRect(18, 18, W - 36, H - 36);
    c.lineWidth = 2; c.strokeRect(32, 32, W - 64, H - 64);

    c.textAlign = 'center'; c.fillStyle = '#3b2358';
    c.font = 'bold 52px Georgia, serif';
    c.fillText('NOTICE OF EXORCISM', W / 2, 105);
    c.font = 'italic 20px Georgia, serif'; c.fillStyle = '#6b4f8a';
    c.fillText('Official correspondence from the Office of the Landlord', W / 2, 138);

    c.fillStyle = '#1f9e8f'; c.font = 'bold 34px Georgia, serif';
    c.fillText(info.houseName, W / 2, 200);

    c.textAlign = 'left'; c.fillStyle = '#2a1a40'; c.font = '26px Georgia, serif';
    const rows = [
      ['Total rent collected', fmt(info.total)],
      ['Spookiest tenant', info.spookiest],
      ['Exorcisms performed', String(info.exorcisms)],
      ['Spectral Essence gained', '+' + fmt(info.essence)],
    ];
    let y = 262;
    for (const [k, v] of rows) {
      c.fillStyle = '#6b4f8a'; c.fillText(k + ':', 90, y);
      c.fillStyle = '#2a1a40'; c.font = 'bold 26px Georgia, serif'; c.fillText(v, 400, y); c.font = '26px Georgia, serif';
      y += 44;
    }

    c.textAlign = 'center'; c.fillStyle = '#3b2358'; c.font = 'italic 28px Georgia, serif';
    wrap(c, '"You have 30 days to vacate the afterlife."', W / 2, 468, 700, 34);

    c.font = '16px Georgia, serif'; c.fillStyle = '#6b4f8a';
    c.fillText(`Haunted Landlord  -  Your tenants are dead, your rent is not.  -  ${url}`, W / 2, 520);

    // stamp
    c.save();
    c.translate(720, 330); c.rotate(-0.28);
    c.strokeStyle = 'rgba(176,32,48,0.85)'; c.fillStyle = 'rgba(176,32,48,0.85)'; c.lineWidth = 6;
    c.strokeRect(-110, -34, 220, 68);
    c.textAlign = 'center'; c.font = 'bold 40px Georgia, serif';
    c.fillText('EXORCISED', 0, 14);
    c.restore();

    // ghost doodle
    c.save();
    c.translate(790, 150);
    c.fillStyle = '#ffffff'; c.strokeStyle = '#3b2358'; c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-28, 50); c.lineTo(-28, -4); c.arc(0, -4, 28, Math.PI, 0); c.lineTo(28, 50);
    c.lineTo(14, 40); c.lineTo(0, 50); c.lineTo(-14, 40); c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = '#3b2358';
    c.beginPath(); c.arc(-10, -6, 4, 0, 7); c.arc(10, -6, 4, 0, 7); c.fill();
    c.restore();
  }

  function toBlob(cv) { return new Promise((res) => cv.toBlob(res, 'image/png')); }

  async function copy(cv) {
    try {
      const blob = await toBlob(cv);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch (e) { return false; }
  }

  async function save(cv, name) {
    const blob = await toBlob(cv);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (name || 'notice-of-exorcism') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  root.HLShare = { drawCard, copy, save };
})(typeof window !== 'undefined' ? window : globalThis);
