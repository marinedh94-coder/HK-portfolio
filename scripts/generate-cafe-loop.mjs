import fs from "node:fs";
import path from "node:path";

// Original 3/4 café miniature. No third-party audio samples or melodies.
const sampleRate = 22050;
const bpm = 112;
const beat = 60 / bpm;
const totalBeats = 48;
const duration = totalBeats * beat;
const samples = new Float64Array(Math.round(duration * sampleRate));
const twoPi = Math.PI * 2;

const noteFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

function addNote(midi, startBeat, lengthBeats, volume, voice = "reed") {
  const frequency = noteFrequency(midi);
  const startSample = Math.round(startBeat * beat * sampleRate);
  const noteDuration = lengthBeats * beat;
  const sampleCount = Math.min(
    Math.round((noteDuration + 0.14) * sampleRate),
    samples.length - startSample
  );
  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    const remaining = noteDuration + 0.14 - time;
    const attack = Math.min(1, time / (voice === "reed" ? 0.035 : 0.006));
    const release = Math.min(1, Math.max(0, remaining) / 0.14);
    const phase = twoPi * frequency * time;
    let tone;
    let envelope;
    if (voice === "reed") {
      const vibrato = 0.018 * Math.sin(twoPi * 4.4 * time);
      tone = Math.sin(phase + vibrato) * 0.75
        + Math.sin(2 * phase + vibrato) * 0.17
        + Math.sin(3 * phase + vibrato) * 0.08;
      envelope = attack * release * (0.85 + 0.07 * Math.sin(twoPi * 3.7 * time));
    } else if (voice === "piano") {
      tone = Math.sin(phase) * 0.8
        + Math.sin(2 * phase) * 0.13
        + Math.sin(3 * phase) * 0.07;
      envelope = attack * release * Math.exp(-time * 5.2);
    } else {
      tone = Math.sin(phase) * 0.92 + Math.sin(2 * phase) * 0.08;
      envelope = attack * release * Math.exp(-time * 3.6);
    }
    samples[startSample + i] += tone * envelope * volume;
  }
}

const chords = [
  { notes: [60, 64, 67, 71], bass: 48 },
  { notes: [57, 60, 64, 67], bass: 45 },
  { notes: [62, 65, 69, 72], bass: 50 },
  { notes: [55, 59, 62, 65], bass: 43 },
  { notes: [53, 57, 60, 64], bass: 41 },
  { notes: [52, 55, 59, 62], bass: 40 },
  { notes: [62, 65, 69, 72], bass: 50 },
  { notes: [55, 59, 62, 65], bass: 43 }
];

const melody = [
  [[76, 0, 1], [79, 1, .5], [81, 1.5, .5], [79, 2, 1]],
  [[76, 0, .75], [72, .75, .75], [71, 1.5, .5], [69, 2, 1]],
  [[77, 0, 1], [81, 1, .5], [79, 1.5, .5], [77, 2, 1]],
  [[74, 0, .5], [77, .5, .5], [76, 1, 1], [71, 2, 1]],
  [[72, 0, .75], [76, .75, .75], [79, 1.5, .5], [76, 2, 1]],
  [[74, 0, .75], [72, .75, .75], [71, 1.5, .5], [69, 2, 1]],
  [[77, 0, .5], [76, .5, .5], [74, 1, 1], [72, 2, 1]],
  [[71, 0, .75], [74, .75, .75], [77, 1.5, .5], [79, 2, 1]]
];

for (let bar = 0; bar < 16; bar++) {
  const beginning = bar * 3;
  const chord = chords[bar % 8];
  addNote(chord.bass, beginning, .85, .16, "bass");
  for (const offset of [1, 2]) {
    for (const midi of chord.notes.slice(1)) {
      addNote(midi, beginning + offset, .38, .035, "piano");
    }
  }
  for (const [midi, offset, length] of melody[bar % 8]) {
    const variation = bar >= 8 && bar % 8 === 4 && offset === 1.5 ? 2 : 0;
    addNote(midi + variation, beginning + offset, length * .87, .125, "reed");
  }
}

// A quiet, filtered brushed pulse gives the waltz a gentle beat.
let seed = 9183;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
for (let pulse = 0; pulse < totalBeats; pulse++) {
  const start = Math.round(pulse * beat * sampleRate);
  let filtered = 0;
  for (let i = 0; i < 0.08 * sampleRate && start + i < samples.length; i++) {
    filtered = filtered * 0.86 + (random() * 2 - 1) * 0.14;
    samples[start + i] += filtered * Math.exp(-i / (sampleRate * .018)) * .06;
  }
}

// A small room echo, with gentle edges for seamless looping.
for (const [delaySeconds, strength] of [[.14, .09], [.28, .04]]) {
  const delay = Math.round(delaySeconds * sampleRate);
  for (let i = delay; i < samples.length; i++) samples[i] += samples[i - delay] * strength;
}
const edgeSamples = Math.round(sampleRate * .04);
for (let i = 0; i < edgeSamples; i++) {
  const fade = i / edgeSamples;
  samples[i] *= fade;
  samples[samples.length - 1 - i] *= fade;
}

let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
const gain = Math.min(.78 / Math.max(peak, .001), 1.5);
const pcm = Buffer.alloc(44 + samples.length * 2);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(sampleRate, 24);
pcm.writeUInt32LE(sampleRate * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(samples.length * 2, 40);
for (let i = 0; i < samples.length; i++) {
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * gain)) * 32767), 44 + i * 2);
}

const output = path.resolve("dist/assets/cafe-waltz.wav");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, pcm);
console.log(`Created ${output} (${duration.toFixed(1)}s, original instrumental)`);
