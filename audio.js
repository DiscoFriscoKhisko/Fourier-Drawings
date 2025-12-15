// Audio engine for Fourier Drawings
// Simplified and reliable version

let audioContext = null;
let isPlaying = false;

// Sound output
let oscillator = null;
let gainNode = null;

// Microphone input
let micStream = null;
let micSource = null;
let analyser = null;
let dataArray = null;
let isRecording = false;

// Settings
const MIN_PITCH = 80;
const MAX_PITCH = 800;
const MIN_FREQ = 100;
const MAX_FREQ = 400;

// ============================================
// INITIALIZATION
// ============================================

function initAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log('Audio initialized');
}

// ============================================
// SOUND OUTPUT (Drawing → Sound)
// ============================================

function playDrawing(fourierX, fourierY) {
  if (!audioContext) initAudio();
  if (audioContext.state === 'suspended') audioContext.resume();

  stopSound();

  oscillator = audioContext.createOscillator();
  gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 200;

  gainNode.gain.value = 0;
  gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  isPlaying = true;
}

function updateSoundPosition(x, y, canvasWidth, canvasHeight) {
  if (!isPlaying || !oscillator) return;

  const normY = Math.max(0, Math.min(1, y / canvasHeight));
  const freq = MIN_FREQ + (1 - normY) * (MAX_FREQ - MIN_FREQ);

  oscillator.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.02);
}

function stopSound() {
  if (!audioContext) return;

  if (gainNode) {
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
  }
  if (oscillator) {
    try {
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {}
    oscillator = null;
  }
  isPlaying = false;
}

function updateSound(progress) {}

function isAudioPlaying() {
  return isPlaying;
}

// ============================================
// MICROPHONE INPUT
// ============================================

async function startMicrophoneInput() {
  if (!audioContext) initAudio();
  if (audioContext.state === 'suspended') await audioContext.resume();

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micSource = audioContext.createMediaStreamSource(micStream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;

    micSource.connect(analyser);
    dataArray = new Float32Array(analyser.fftSize);

    isRecording = true;
    console.log('Microphone started');
    return true;
  } catch (err) {
    console.error('Microphone error:', err);
    return false;
  }
}

function stopMicrophoneInput() {
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  if (micSource) {
    micSource.disconnect();
    micSource = null;
  }
  isRecording = false;
  console.log('Microphone stopped');
}

// ============================================
// PITCH DETECTION (Simple autocorrelation)
// ============================================

function getPitch() {
  if (!analyser || !isRecording) return null;

  analyser.getFloatTimeDomainData(dataArray);

  // Check volume
  let rms = 0;
  for (let i = 0; i < dataArray.length; i++) {
    rms += dataArray[i] * dataArray[i];
  }
  rms = Math.sqrt(rms / dataArray.length);

  if (rms < 0.01) return null; // Too quiet

  // Autocorrelation
  const sampleRate = audioContext.sampleRate;
  const minPeriod = Math.floor(sampleRate / MAX_PITCH);
  const maxPeriod = Math.floor(sampleRate / MIN_PITCH);

  let bestCorr = 0;
  let bestPeriod = 0;

  for (let period = minPeriod; period < maxPeriod; period++) {
    let corr = 0;
    for (let i = 0; i < dataArray.length - period; i++) {
      corr += dataArray[i] * dataArray[i + period];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestPeriod = period;
    }
  }

  if (bestPeriod === 0) return null;

  const pitch = sampleRate / bestPeriod;
  if (pitch < MIN_PITCH || pitch > MAX_PITCH) return null;

  return pitch;
}

function isRecordingAudio() {
  return isRecording;
}

function pitchToY(pitch, canvasHeight) {
  if (pitch === null) return canvasHeight / 2;

  const norm = (pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH);
  const clamped = Math.max(0, Math.min(1, norm));

  // High pitch = top (low Y)
  return canvasHeight * 0.1 + (1 - clamped) * canvasHeight * 0.8;
}

function getVolume() {
  if (!analyser || !isRecording) return 0;

  analyser.getFloatTimeDomainData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }

  return Math.min(1, Math.sqrt(sum / dataArray.length) * 8);
}
