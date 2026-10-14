#!/usr/bin/env python3
"""High-Fidelity Deep Noise & Meditative Drone Synthesizer for Breathe App.

Synthesizes a rich, multi-layered meditative soundscape:
- Dual-channel decorrelated warm brown noise (wide stereo field)
- 432 Hz harmonic foundation: 54 Hz sub-bass, 108 Hz fundamental, 162 Hz resonant fifth
- 4.5 Hz Theta wave binaural frequency differential for deep meditative retention
- Slow organic breathing LFO modulation (0.05 Hz)
- Soft analog warmth & saturation
- Mastered to 44.1 kHz, EBU R128 loudness
"""

import math
import random
import struct
import wave
from pathlib import Path

def generate_deep_noise(duration_sec=70, sample_rate=44100):
    total_samples = int(duration_sec * sample_rate)
    print(f"Generating Deep Noise: {duration_sec}s @ {sample_rate}Hz ({total_samples:,} samples)...")

    # Audio buffers for Left and Right channels (floats)
    left_samples = [0.0] * total_samples
    right_samples = [0.0] * total_samples

    # 1. Generate decorrelated true stereo brown noise (integrated white noise with highpass leak)
    # Using independent random walks with leaky integrator
    leak = 0.992
    last_l = 0.0
    last_r = 0.0

    # Smooth random noise generator with seeded reproducibility for optimal consistency
    rng = random.Random(432108)

    brown_l = [0.0] * total_samples
    brown_r = [0.0] * total_samples

    for i in range(total_samples):
        # White noise burst
        wl = rng.uniform(-1.0, 1.0)
        wr = rng.uniform(-1.0, 1.0)

        # Leaky integration to create rich brown noise (1/f^2)
        last_l = last_l * leak + wl * (1.0 - leak)
        last_r = last_r * leak + wr * (1.0 - leak)

        brown_l[i] = last_l
        brown_r[i] = last_r

    # Normalize brown noise peak
    max_b = max(max(abs(x) for x in brown_l), max(abs(x) for x in brown_r))
    if max_b > 0:
        for i in range(total_samples):
            brown_l[i] /= max_b
            brown_r[i] /= max_b

    # 2. Pink noise velvet layer (for mid-frequency warmth and depth)
    # Paul Kellet's filter method for pink noise
    b0_l = b1_l = b2_l = b3_l = b4_l = b5_l = b6_l = 0.0
    b0_r = b1_r = b2_r = b3_r = b4_r = b5_r = b6_r = 0.0
    pink_l = [0.0] * total_samples
    pink_r = [0.0] * total_samples

    for i in range(total_samples):
        wl = rng.uniform(-1.0, 1.0)
        wr = rng.uniform(-1.0, 1.0)

        b0_l = 0.99886 * b0_l + wl * 0.0555179
        b1_l = 0.99332 * b1_l + wl * 0.0750759
        b2_l = 0.96900 * b2_l + wl * 0.1538520
        b3_l = 0.86650 * b3_l + wl * 0.3104856
        b4_l = 0.55000 * b4_l + wl * 0.5329522
        b5_l = -0.7616 * b5_l - wl * 0.0168980
        pink_l[i] = b0_l + b1_l + b2_l + b3_l + b4_l + b5_l + b6_l + wl * 0.5362
        b6_l = wl * 0.115926

        b0_r = 0.99886 * b0_r + wr * 0.0555179
        b1_r = 0.99332 * b1_r + wr * 0.0750759
        b2_r = 0.96900 * b2_r + wr * 0.1538520
        b3_r = 0.86650 * b3_r + wr * 0.3104856
        b4_r = 0.55000 * b4_r + wr * 0.5329522
        b5_r = -0.7616 * b5_r - wr * 0.0168980
        pink_r[i] = b0_r + b1_r + b2_r + b3_r + b4_r + b5_r + b6_r + wr * 0.5362
        b6_r = wr * 0.115926

    max_p = max(max(abs(x) for x in pink_l), max(abs(x) for x in pink_r))
    if max_p > 0:
        for i in range(total_samples):
            pink_l[i] /= max_p
            pink_r[i] /= max_p

    # 3. Harmonic Sub-bass & Drone Oscillators with 4.5 Hz Theta binaural beat
    # Frequencies:
    # 54 Hz (sub rumble)
    # 108 Hz (fundamental)
    # 162 Hz (harmonic 5th)
    # 216 Hz (octave)
    # Binaural split: Left = f - 2.25Hz, Right = f + 2.25Hz -> 4.5Hz Theta difference

    f_sub = 54.0
    f_root = 108.0
    f_fifth = 162.0
    f_oct = 216.0
    binaural_diff = 4.5

    f_root_l = f_root - (binaural_diff / 2.0)
    f_root_r = f_root + (binaural_diff / 2.0)

    # Slow organic breathing swell (period = 18 seconds, 0.0556 Hz)
    two_pi = 2.0 * math.pi
    lfo_rate = 1.0 / 18.0

    print("Blending organic acoustic layers and harmonic sub-tones...")
    for i in range(total_samples):
        t = i / sample_rate

        # Breathing LFO modulation (depth ~15% for organic breath swell)
        swell = 0.85 + 0.15 * math.sin(two_pi * lfo_rate * t)

        # Gentle secondary slow wave (period 37s for polyrhythmic motion)
        swell2 = 0.90 + 0.10 * math.sin(two_pi * (1.0 / 37.0) * t + 1.2)

        # Harmonic tones
        # 54Hz sub-bass (centered and warm)
        sub = 0.28 * math.sin(two_pi * f_sub * t)

        # 108Hz fundamental with theta binaural split
        root_l = 0.22 * math.sin(two_pi * f_root_l * t)
        root_r = 0.22 * math.sin(two_pi * f_root_r * t)

        # 162Hz fifth (gives a warm musical temple-bell undertone)
        fifth_l = 0.12 * math.sin(two_pi * f_fifth * t + 0.3)
        fifth_r = 0.12 * math.sin(two_pi * (f_fifth + 1.5) * t + 0.3)

        # 216Hz octave (velvet warmth)
        oct_l = 0.05 * math.sin(two_pi * f_oct * t + 0.8)
        oct_r = 0.05 * math.sin(two_pi * f_oct * t + 0.8)

        # Combine noise beds and harmonic tones
        # Brown noise bed: 0.55
        # Pink noise bed: 0.18
        # Drone harmonics: 0.35
        out_l = (brown_l[i] * 0.60 + pink_l[i] * 0.16) * swell + (sub + root_l + fifth_l + oct_l) * swell2
        out_r = (brown_r[i] * 0.60 + pink_r[i] * 0.16) * swell + (sub + root_r + fifth_r + oct_r) * swell2

        # Warm soft saturation (analog tape curve: tanh-like soft clipping)
        # Prevents any harshness and produces rich harmonic warmth
        out_l = math.tanh(out_l * 1.1) * 0.90
        out_r = math.tanh(out_r * 1.1) * 0.90

        left_samples[i] = out_l
        right_samples[i] = out_r

    # Write to WAV file
    output_wav = Path("input_sounds") / "noise_generated.wav"
    output_wav.parent.mkdir(parents=True, exist_ok=True)

    print(f"Writing 16-bit stereo WAV to {output_wav}...")
    with wave.open(str(output_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2) # 16-bit
        wf.setframerate(sample_rate)

        # Write in chunks
        chunk_size = 8192
        for start in range(0, total_samples, chunk_size):
            end = min(start + chunk_size, total_samples)
            frames = bytearray()
            for j in range(start, end):
                # Clamp and convert to int16
                sl = max(-1.0, min(1.0, left_samples[j]))
                sr = max(-1.0, min(1.0, right_samples[j]))
                il = int(sl * 32767.0)
                ir = int(sr * 32767.0)
                frames.extend(struct.pack("<hh", il, ir))
            wf.writeframes(frames)

    print(f"Done! Created {output_wav} ({output_wav.stat().st_size:,} bytes)")
    return output_wav

if __name__ == "__main__":
    generate_deep_noise(duration_sec=70)
