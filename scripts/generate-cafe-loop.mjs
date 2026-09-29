import fs from "node:fs";
import path from "node:path";

// Original slow 4/4 instrumental: felt piano, warm pad, and soft room ambience.
// No third-party samples or borrowed melodies are used.
const sampleRate = 24000;
const bpm = 68;
const beat = 60 / bpm;
const totalBeats = 32;
const duration = totalBeats * beat;
const left = new Float64Array(Math.round(duration * sampleRate));
const right = new Float64Array(left.length);
const twoPi = Math.PI * 2;
const noteFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

function mixNote(target, midi, startBeat, lengthBeats, volume, voice, detune = 0) {
  const frequency = noteFrequency(midi) * 2 ** (detune / 1200);
  const start = Math.round(startBeat * beat * sampleRate);
  const noteDuration = lengthBeats * beat;
  const tail = voice === "pad" ? 1.45 : voice === "bass" ? .9 : 1.1;
  const count = Math.min(Math.round((noteDuration + tail) * sampleRate), target.length - start);

  for (let index = 0; index < count; index++) {
    const time = index / sampleRate;
    const remaining = noteDuration + tail - time;
    const phase = twoPi * frequency * time;
    let tone = 0;
    let envelope = 0;

    if (voice === "pad") {
      const attack = Math.min(1, time / 1.15);
      const release = Math.min(1, Math.max(0, remaining) / 1.45);
      tone = Math.sin(phase) * .76
        + Math.sin(phase * .5) * .13
        + Math.sin(phase * 2) * .07
        + Math.sin(phase * 1.003) * .04;
      envelope = attack * release * (.94 + .035 * Math.sin(twoPi * .12 * time));
    } else if (voice === "bass") {
      const attack = Math.min(1, time / .12);
      const release = Math.min(1, Math.max(0, remaining) / .9);
      tone = Math.sin(phase) * .9 + Math.sin(phase * 2) * .1;
      envelope = attack * release * Math.exp(-time * .32);
    } else {
      const attack = Math.min(1, time / .018);
      const release = Math.min(1, Math.max(0, remaining) / 1.1);
      const softDecay = .24 + .76 * Math.exp(-time * 1.35);
      tone = Math.sin(phase) * .84
        + Math.sin(phase * 2) * .09
        + Math.sin(phase * 3) * .035
        + Math.sin(phase * .998) * .035;
      envelope = attack * release * softDecay;
    }
    target[start + index] += tone * envelope * volume;
  }
}

function addStereoNote(midi, startBeat, lengthBeats, volume, voice, pan = 0) {
  const leftGain = Math.sqrt((1 - pan) / 2);
  const rightGain = Math.sqrt((1 + pan) / 2);
  mixNote(left, midi, startBeat, lengthBeats, volume * leftGain, voice, -1.8);
  mixNote(right, midi, startBeat, lengthBeats, volume * rightGain, voice, 1.8);
}

const progression = [
  { bass: 36, pad: [48, 55, 59, 62, 64], piano: [55, 59, 62, 64], top: 71 }, // Cmaj9
  { bass: 47, pad: [47, 52, 55, 59, 62], piano: [52, 55, 59, 62], top: 67 }, // Em7/B
  { bass: 45, pad: [45, 52, 55, 59, 60], piano: [52, 55, 59, 60], top: 64 }, // Am9
  { bass: 43, pad: [43, 50, 55, 59, 64], piano: [50, 55, 59, 64], top: 62 }, // G6
  { bass: 41, pad: [41, 48, 52, 55, 57], piano: [48, 52, 55, 57], top: 60 }, // Fmaj9
  { bass: 40, pad: [40, 48, 52, 55, 59], piano: [48, 52, 55, 59], top: 64 }, // C/E
  { bass: 38, pad: [38, 45, 48, 52, 53], piano: [45, 48, 52, 53], top: 57 }, // Dm9
  { bass: 43, pad: [43, 50, 53, 57, 59], piano: [50, 53, 57, 59], top: 62 }, // G13
];

for (let bar = 0; bar < progression.length; bar++) {
  const start = bar * 4;
  const chord = progression[bar];

  addStereoNote(chord.bass, start, 3.8, .068, "bass", -.08);
  chord.pad.forEach((note, index) => addStereoNote(note, start, 3.85, .022, "pad", (index - 2) * .12));

  chord.piano.forEach((note, index) => {
    addStereoNote(note, start + .12 + index * .045, 2.25, .036, "piano", (index - 1.5) * .18);
  });
  chord.piano.slice(1).forEach((note, index) => {
    addStereoNote(note + 12, start + 2.55 + index * .08, 1.05, .018, "piano", .18 + index * .12);
  });
  addStereoNote(chord.top, start + 3.2, .62, .014, "piano", .32);
}

// Soft stereo room reflections; long and quiet so the harmony breathes.
for (const [delaySeconds, strength, cross] of [[.23, .105, .025], [.47, .055, .018], [.81, .025, .012]]) {
  const delay = Math.round(delaySeconds * sampleRate);
  for (let index = delay; index < left.length; index++) {
    const oldLeft = left[index - delay];
    const oldRight = right[index - delay];
    left[index] += oldLeft * strength + oldRight * cross;
    right[index] += oldRight * strength + oldLeft * cross;
  }
}

// Gentle fade at the loop boundary prevents a click without adding a rhythmic gap.
const edge = Math.round(sampleRate * .72);
for (let index = 0; index < edge; index++) {
  const fadeIn = Math.sin((index / edge) * Math.PI / 2) ** 2;
  const fadeOut = Math.cos((index / edge) * Math.PI / 2) ** 2;
  left[index] *= fadeIn;
  right[index] *= fadeIn;
  left[left.length - 1 - index] *= fadeOut;
  right[right.length - 1 - index] *= fadeOut;
}

let peak = 0;
for (let index = 0; index < left.length; index++) {
  peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
}
const gain = Math.min(.64 / Math.max(peak, .001), 5);
const channels = 2;
const bytesPerSample = 2;
const pcm = Buffer.alloc(44 + left.length * channels * bytesPerSample);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(channels, 22);
pcm.writeUInt32LE(sampleRate, 24);
pcm.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
pcm.writeUInt16LE(channels * bytesPerSample, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(left.length * channels * bytesPerSample, 40);
for (let index = 0; index < left.length; index++) {
  const offset = 44 + index * 4;
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[index] * gain)) * 32767), offset);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[index] * gain)) * 32767), offset + 2);
}

const output = path.resolve("dist/assets/gentle-editorial-piano.wav");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, pcm);
console.log(`Created ${output} (${duration.toFixed(1)}s, original stereo instrumental, peak ${peak.toFixed(3)})`);
