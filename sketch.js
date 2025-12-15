// Fourier Drawings - With Buttons

let time = 0;
let path = [];
let drawing = [];
let fourierX;
let fourierY;

let state = 'draw';
let recordX = 0;
let lastPitch = null;
let currentHue = 180;

// Responsive layout
let canvasW, canvasH, panelW;
let isMobile = false;

// Buttons
let buttons = [];

function setup() {
  updateLayout();
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textAlign(LEFT, TOP);
  createButtons();
}

function windowResized() {
  updateLayout();
  resizeCanvas(windowWidth, windowHeight);
  createButtons();
}

function updateLayout() {
  isMobile = windowWidth < 700;

  if (isMobile) {
    canvasW = windowWidth;
    canvasH = windowHeight * 0.6;
    panelW = windowWidth;
  } else {
    panelW = min(220, windowWidth * 0.25);
    canvasW = windowWidth - panelW;
    canvasH = windowHeight;
  }
}

function createButtons() {
  buttons = [];

  let btnW = isMobile ? 70 : 80;
  let btnH = isMobile ? 32 : 36;
  let gap = 10;
  let startX = 20;
  let startY = canvasH - btnH - 15;

  // Record button
  buttons.push({
    x: startX,
    y: startY,
    w: btnW,
    h: btnH,
    label: 'Record',
    key: 'R',
    color: [0, 70, 70],
    hoverColor: [0, 80, 80],
    action: () => {
      if (state === 'draw') startRecording();
      else if (state === 'record') stopRecording();
    },
    isActive: () => state === 'record'
  });

  // Clear button
  buttons.push({
    x: startX + btnW + gap,
    y: startY,
    w: btnW,
    h: btnH,
    label: 'Clear',
    key: 'C',
    color: [220, 30, 40],
    hoverColor: [220, 40, 50],
    action: () => {
      drawing = [];
      path = [];
      time = 0;
      if (state === 'animate') {
        stopSound();
        state = 'draw';
      }
      if (state === 'record') {
        stopMicrophoneInput();
        state = 'draw';
      }
    },
    isActive: () => false
  });

  // Stop/Draw button
  buttons.push({
    x: startX + (btnW + gap) * 2,
    y: startY,
    w: btnW,
    h: btnH,
    label: 'Draw',
    key: 'D',
    color: [200, 50, 50],
    hoverColor: [200, 60, 60],
    action: () => {
      stopSound();
      stopMicrophoneInput();
      state = 'draw';
      drawing = [];
      path = [];
      time = 0;
    },
    isActive: () => state === 'draw'
  });
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    if (state === 'draw') startRecording();
    else if (state === 'record') stopRecording();
  }
  if ((key === 'd' || key === 'D') && state !== 'draw') {
    stopSound();
    stopMicrophoneInput();
    state = 'draw';
    drawing = [];
    path = [];
    time = 0;
  }
  if (key === 'c' || key === 'C') {
    drawing = [];
    path = [];
    time = 0;
    if (state === 'animate') {
      stopSound();
      state = 'draw';
    }
  }
}

function isOverButton(btn) {
  return mouseX > btn.x && mouseX < btn.x + btn.w &&
         mouseY > btn.y && mouseY < btn.y + btn.h;
}

function mousePressed() {
  initAudio();

  // Check buttons first
  for (let btn of buttons) {
    if (isOverButton(btn)) {
      btn.action();
      return;
    }
  }

  // Check if click is in canvas area (not panel)
  if (isMobile) {
    if (mouseY > canvasH) return;
  } else {
    if (mouseX > canvasW) return;
  }

  if (state === 'animate') {
    stopSound();
    state = 'draw';
    drawing = [];
    path = [];
    time = 0;
  } else if (state === 'record') {
    stopRecording();
  }
}

function mouseDragged() {
  // Don't draw if over buttons
  for (let btn of buttons) {
    if (isOverButton(btn)) return;
  }

  if (isMobile) {
    if (mouseY > canvasH) return;
  } else {
    if (mouseX > canvasW) return;
  }

  if (state === 'draw') {
    drawing.push({
      x: mouseX - canvasW / 2,
      y: mouseY - canvasH / 2
    });
  }
}

function touchMoved() {
  mouseDragged();
  return false;
}

function mouseReleased() {
  // Check buttons
  for (let btn of buttons) {
    if (isOverButton(btn)) return;
  }

  if (isMobile) {
    if (mouseY > canvasH) return;
  } else {
    if (mouseX > canvasW) return;
  }

  if (state === 'draw' && drawing.length > 10) {
    startAnimation();
  }
}

async function startRecording() {
  drawing = [];
  recordX = 30;
  lastPitch = null;

  const success = await startMicrophoneInput();
  if (success) {
    state = 'record';
  }
}

function stopRecording() {
  stopMicrophoneInput();

  if (drawing.length > 10) {
    startAnimation();
  } else {
    state = 'draw';
  }
}

function startAnimation() {
  state = 'animate';

  const skip = Math.max(1, Math.floor(drawing.length / 100));
  let x = [];
  let y = [];

  for (let i = 0; i < drawing.length; i += skip) {
    x.push(drawing[i].x);
    y.push(drawing[i].y);
  }

  fourierX = fourierT(x);
  fourierY = fourierT(y);
  fourierX.sort((a, b) => b.amp - a.amp);
  fourierY.sort((a, b) => b.amp - a.amp);

  time = 0;
  path = [];
  currentHue = random(360);

  playDrawing(fourierX, fourierY);
}

function drawFourier(cx, cy, rotation, fourier) {
  let x = cx;
  let y = cy;

  for (let i = 0; i < fourier.length; i++) {
    let prevx = x;
    let prevy = y;
    let radius = fourier[i].amp;
    let angle = fourier[i].phase + time * fourier[i].freq + rotation;
    x += radius * cos(angle);
    y += radius * sin(angle);

    stroke(0, 0, 100, 15);
    strokeWeight(1);
    noFill();
    ellipse(prevx, prevy, radius * 2);

    stroke(currentHue, 60, 100, 50);
    strokeWeight(1.5);
    line(prevx, prevy, x, y);
  }

  fill(currentHue, 80, 100);
  noStroke();
  ellipse(x, y, 6, 6);

  return createVector(x, y);
}

function draw() {
  background(220, 20, 8);
  currentHue = (currentHue + 0.1) % 360;

  if (state === 'draw') {
    drawDrawMode();
  } else if (state === 'record') {
    drawRecordMode();
  } else if (state === 'animate') {
    drawAnimateMode();
  }

  // Draw buttons
  drawButtons();

  // Draw info panel
  drawInfoPanel();
}

function drawButtons() {
  for (let btn of buttons) {
    let isHover = isOverButton(btn);
    let isActive = btn.isActive();

    // Button background
    if (isActive) {
      fill(btn.color[0], btn.color[1] + 20, btn.color[2] + 20);
      stroke(btn.color[0], btn.color[1], 100);
    } else if (isHover) {
      fill(btn.hoverColor[0], btn.hoverColor[1], btn.hoverColor[2]);
      stroke(0, 0, 50);
    } else {
      fill(btn.color[0], btn.color[1], btn.color[2]);
      stroke(0, 0, 30);
    }
    strokeWeight(1);
    rect(btn.x, btn.y, btn.w, btn.h, 6);

    // Button label
    fill(0, 0, 100);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(isMobile ? 11 : 12);

    let label = btn.label;
    if (btn.label === 'Record' && state === 'record') {
      label = 'Stop';
    }
    text(label, btn.x + btn.w / 2, btn.y + btn.h / 2 - 2);

    // Key hint
    fill(0, 0, 60);
    textSize(isMobile ? 8 : 9);
    text(btn.key, btn.x + btn.w / 2, btn.y + btn.h / 2 + 10);
  }
}

function drawDrawMode() {
  fill(0, 0, 100);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(isMobile ? 18 : 22);
  text("Draw something", canvasW / 2, 35);

  fill(0, 0, 60);
  textSize(isMobile ? 11 : 13);
  text("Drag to draw, or click Record for voice input", canvasW / 2, 60);

  if (drawing.length > 1) {
    stroke(50, 80, 100);
    strokeWeight(3);
    noFill();
    beginShape();
    for (let p of drawing) {
      vertex(p.x + canvasW / 2, p.y + canvasH / 2);
    }
    endShape();
  }
}

function drawRecordMode() {
  // Pulsing recording indicator
  let pulse = sin(frameCount * 0.15) * 0.3 + 0.7;
  fill(0, 90, 90, pulse * 100);
  noStroke();
  ellipse(canvasW / 2, 30, 12, 12);

  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(isMobile ? 18 : 22);
  text("Sing or hum!", canvasW / 2, 55);

  fill(0, 0, 60);
  textSize(isMobile ? 11 : 13);
  text("Click Stop when done", canvasW / 2, 80);

  let pitch = getPitch();
  let volume = getVolume();

  if (pitch !== null) {
    if (lastPitch !== null) {
      pitch = lerp(lastPitch, pitch, 0.4);
    }
    lastPitch = pitch;

    let y = pitchToY(pitch, canvasH);
    drawing.push({
      x: recordX - canvasW / 2,
      y: y - canvasH / 2
    });
  }

  if (drawing.length > 1) {
    stroke(0, 70, 100);
    strokeWeight(3);
    noFill();
    beginShape();
    for (let p of drawing) {
      vertex(p.x + canvasW / 2, p.y + canvasH / 2);
    }
    endShape();
  }

  // Volume meter on right
  let meterH = isMobile ? 80 : 120;
  let meterX = canvasW - 30;
  fill(0, 0, 20);
  noStroke();
  rect(meterX, canvasH / 2 - meterH / 2, 12, meterH, 4);

  fill(volume > 0.6 ? color(0, 80, 100) : color(120, 70, 80));
  let levelH = volume * meterH;
  rect(meterX, canvasH / 2 + meterH / 2 - levelH, 12, levelH, 4);

  // Progress bar above buttons
  let progress = (recordX - 30) / (canvasW - 60);
  let barY = canvasH - 70;
  fill(0, 0, 25);
  rect(30, barY, canvasW - 60, 6, 3);
  fill(0, 70, 100);
  rect(30, barY, (canvasW - 60) * progress, 6, 3);

  recordX += isMobile ? 1.5 : 2;
  if (recordX > canvasW - 30) {
    stopRecording();
  }
}

function drawAnimateMode() {
  fill(0, 0, 60);
  textAlign(CENTER, CENTER);
  textSize(11);
  text("Playing - Click Draw to restart", canvasW / 2, 20);

  let margin = isMobile ? 60 : 80;
  let vx = drawFourier(canvasW / 2, margin + 20, 0, fourierX);
  let vy = drawFourier(margin, canvasH / 2, HALF_PI, fourierY);

  path.push(createVector(vx.x, vy.y));

  stroke(currentHue, 30, 50, 25);
  strokeWeight(1);
  line(vx.x, vx.y, vx.x, vy.y);
  line(vy.x, vy.y, vx.x, vy.y);

  stroke(currentHue, 80, 100);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let v of path) {
    vertex(v.x, v.y);
  }
  endShape();

  if (path.length > 0) {
    let curr = path[path.length - 1];
    fill(currentHue, 80, 100);
    noStroke();
    ellipse(curr.x, curr.y, 8, 8);
  }

  updateSoundPosition(vx.x, vy.y, canvasW, canvasH);

  time += TWO_PI / fourierY.length;
  if (time > TWO_PI) {
    time = 0;
    path = [];
  }
}

function drawInfoPanel() {
  let panelX, panelY, panelH;

  if (isMobile) {
    panelX = 0;
    panelY = canvasH;
    panelH = windowHeight - canvasH;
  } else {
    panelX = canvasW;
    panelY = 0;
    panelH = windowHeight;
  }

  // Panel background
  fill(220, 15, 12);
  noStroke();
  rect(panelX, panelY, panelW, panelH);

  // Border
  stroke(220, 10, 20);
  strokeWeight(1);
  if (isMobile) {
    line(0, panelY, windowWidth, panelY);
  } else {
    line(panelX, 0, panelX, windowHeight);
  }

  let x = panelX + 15;
  let y = panelY + 12;

  textAlign(LEFT, TOP);

  // Title
  fill(0, 0, 100);
  textSize(isMobile ? 14 : 16);
  textStyle(BOLD);
  text("Fourier Drawings", x, y);

  // Mode badge
  let modeX = isMobile ? x + 125 : x + 130;
  textSize(10);
  textStyle(NORMAL);
  if (state === 'draw') {
    fill(200, 50, 70);
    text("DRAW", modeX, y + 3);
  } else if (state === 'record') {
    fill(0, 80, 100);
    text("REC", modeX, y + 3);
  } else {
    fill(currentHue, 80, 100);
    text("PLAY", modeX, y + 3);
  }

  y += isMobile ? 25 : 30;
  textStyle(NORMAL);

  if (isMobile) {
    // Compact mobile layout
    fill(0, 0, 70);
    textSize(9);
    text("Draw shapes or use Record to capture your voice.", x, y, panelW - 30, 30);
    y += 28;
    text("The Fourier Transform breaks any signal into spinning circles (frequencies).", x, y, panelW - 30, 40);
    y += 35;
    fill(currentHue, 50, 80);
    text("Sound: Drawing controls pitch. Voice pitch controls drawing.", x, y, panelW - 30, 30);

  } else {
    // Desktop layout
    fill(currentHue, 60, 90);
    textSize(11);
    text("WHAT IS THIS?", x, y);
    y += 16;

    fill(0, 0, 70);
    textSize(9);
    text("An interactive Fourier Transform visualizer. Draw any shape and watch it reconstructed by spinning circles (epicycles).", x, y, panelW - 30, 70);
    y += 55;

    fill(currentHue, 60, 90);
    textSize(11);
    text("THE SCIENCE", x, y);
    y += 16;

    fill(0, 0, 70);
    textSize(9);
    text("The Fourier Transform decomposes signals into sine waves. Each circle represents one frequency component.", x, y, panelW - 30, 60);
    y += 55;

    fill(currentHue, 60, 90);
    textSize(11);
    text("SOUND + DRAWING", x, y);
    y += 16;

    fill(0, 0, 70);
    textSize(9);
    text("Draw → Sound: Y position controls pitch.\n\nVoice → Draw: Your pitch becomes Y position.", x, y, panelW - 30, 70);
    y += 65;

    fill(currentHue, 60, 90);
    textSize(11);
    text("KEYBOARD", x, y);
    y += 16;

    fill(0, 0, 70);
    textSize(9);
    text("R - Record\nC - Clear\nD - Draw mode", x, y, panelW - 30, 50);
    y += 50;

    fill(currentHue, 60, 90);
    textSize(11);
    text("INSPIRATION", x, y);
    y += 16;

    fill(0, 0, 60);
    textSize(9);
    text("3Blue1Brown & Coding Train", x, y);
  }
}
