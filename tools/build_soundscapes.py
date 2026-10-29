#!/usr/bin/env python3
"""Breathe Soundscape Synthesis & Mastering Pipeline.

Builds all meditative/binaural/adaptive tracks via multi-layer modal & harmonic
synthesis, processes CC0 nature field recordings from input_sounds/, applies
seamless circular crossfade looping and EBU R128 (-18 LUFS) normalization, and
exports clean 44.1 kHz stereo MP3 files into music/.
"""

import math
import random
import struct
import subprocess
import wave
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = BASE_DIR / "input_sounds"
MUSIC_DIR = BASE_DIR / "music"
SW_FILE = BASE_DIR / "sw.js"

SAMPLE_RATE = 44100
TWO_PI = 2.0 * math.pi


def write_stereo_wav(path: Path, left, right, sample_rate=SAMPLE_RATE):
    path.parent.mkdir(parents=True, exist_ok=True)
    n = len(left)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        chunk = 16384
        for start in range(0, n, chunk):
            end = min(start + chunk, n)
            buf = bytearray()
            for i in range(start, end):
                sl = max(-0.98, min(0.98, left[i]))
                sr = max(-0.98, min(0.98, right[i]))
                buf.extend(struct.pack("<hh", int(sl * 32767.0), int(sr * 32767.0)))
            wf.writeframes(buf)


def generate_brown_stereo(total_samples, seed=108, leak=0.993):
    rng = random.Random(seed)
    bl = [0.0] * total_samples
    br = [0.0] * total_samples
    ll = 0.0
    lr = 0.0
    scale = 1.0 - leak
    for i in range(total_samples):
        ll = ll * leak + rng.uniform(-1.0, 1.0) * scale
        lr = lr * leak + rng.uniform(-1.0, 1.0) * scale
        bl[i] = ll
        br[i] = lr
    peak = max(max(abs(x) for x in bl), max(abs(x) for x in br), 1e-6)
    inv = 1.0 / peak
    for i in range(total_samples):
        bl[i] *= inv
        br[i] *= inv
    return bl, br


def synth_singing_bowls(duration_sec=64):
    """Synthesize Tibetan Singing Bowls (struck & rimmed modal bronze bowls)."""
    print("Synthesizing Tibetan Singing Bowls (singing-bowls)...")
    n = int(duration_sec * SAMPLE_RATE)
    left, right = generate_brown_stereo(n, seed=432, leak=0.996)

    # Scale down warm air floor
    for i in range(n):
        left[i] *= 0.05
        right[i] *= 0.05

    # Continuous warm rimmed singing bowl pad underneath (F#2 = 185 Hz, C#3 = 277.18 Hz)
    for i in range(n):
        t = i / SAMPLE_RATE
        swell1 = 0.55 + 0.45 * math.sin(TWO_PI * (t / 16.0))
        swell2 = 0.55 + 0.45 * math.sin(TWO_PI * (t / 21.333) + 1.4)
        rim_l = (
            0.14 * math.sin(TWO_PI * 185.0 * t) * swell1
            + 0.09 * math.sin(TWO_PI * 277.18 * t) * swell2
            + 0.04 * math.sin(TWO_PI * 370.0 * t + 0.5) * swell1
        )
        rim_r = (
            0.14 * math.sin(TWO_PI * 185.45 * t) * swell1
            + 0.09 * math.sin(TWO_PI * 277.65 * t) * swell2
            + 0.04 * math.sin(TWO_PI * 370.6 * t + 0.5) * swell1
        )
        left[i] += rim_l
        right[i] += rim_r

    # Modal bowl strikes scheduled across the 64s cycle (aligned with 4s/8s/16s grid)
    # Each strike: (start_sec, fundamental_hz, pan_left, pan_right, amp)
    strikes = [
        (1.0, 185.0, 0.85, 0.65, 0.34),     # Deep F#3 bowl
        (9.0, 277.18, 0.65, 0.85, 0.28),    # Fifth C#4 bowl
        (17.0, 246.94, 0.80, 0.70, 0.30),   # B3 warm bowl
        (25.0, 185.0, 0.70, 0.85, 0.34),    # Deep F#3 bowl
        (33.0, 370.0, 0.85, 0.65, 0.22),    # High octave F#4 bowl
        (41.0, 277.18, 0.65, 0.85, 0.29),   # Fifth C#4 bowl
        (49.0, 185.0, 0.78, 0.78, 0.34),    # Deep F#3 bowl
        (56.5, 246.94, 0.68, 0.82, 0.26),   # B3 warm bowl
    ]

    for start_t, f0, pan_l, pan_r, amp in strikes:
        start_idx = int(start_t * SAMPLE_RATE)
        strike_len = int(min(18.0, duration_sec - start_t) * SAMPLE_RATE)
        # Modal ratios of a hand-hammered Tibetan singing bowl:
        # Mode 1: 1.000 ( + beat frequency +0.65 Hz)
        # Mode 2: 2.756 ( + beat frequency +1.20 Hz)
        # Mode 3: 5.404 (soft wooden mallet shimmer)
        for k in range(strike_len):
            dt = k / SAMPLE_RATE
            # Soft padded mallet attack (45ms smooth raised-cosine ramp)
            if dt < 0.045:
                att = 0.5 * (1.0 - math.cos(math.pi * dt / 0.045))
            else:
                att = 1.0
            env1 = att * math.exp(-dt / 6.5)
            env2 = att * math.exp(-dt / 3.2)
            env3 = att * math.exp(-dt / 1.1)

            m1_l = math.sin(TWO_PI * f0 * dt) + 0.65 * math.sin(TWO_PI * (f0 + 0.62) * dt)
            m1_r = math.sin(TWO_PI * (f0 + 0.62) * dt) + 0.65 * math.sin(TWO_PI * f0 * dt)

            f2 = f0 * 2.756
            m2_l = 0.28 * math.sin(TWO_PI * f2 * dt)
            m2_r = 0.28 * math.sin(TWO_PI * (f2 + 1.15) * dt)

            f3 = f0 * 5.404
            m3 = 0.07 * math.sin(TWO_PI * f3 * dt)

            sig_l = amp * (m1_l * 0.62 * env1 + m2_l * env2 + m3 * env3) * pan_l
            sig_r = amp * (m1_r * 0.62 * env1 + m2_r * env2 + m3 * env3) * pan_r

            idx = start_idx + k
            if idx < n:
                left[idx] += sig_l
                right[idx] += sig_r

    for i in range(n):
        left[i] = math.tanh(left[i] * 1.15) * 0.88
        right[i] = math.tanh(right[i] * 1.15) * 0.88

    wav_path = INPUT_DIR / "singing-bowls.wav"
    write_stereo_wav(wav_path, left, right)
    return wav_path


def synth_theta_drone(duration_sec=64):
    """Synthesize Theta Retention Drone (108 Hz root + 4.5 Hz Theta binaural + 54 Hz sub)."""
    print("Synthesizing Theta Retention Drone (theta-drone)...")
    n = int(duration_sec * SAMPLE_RATE)
    bl, br = generate_brown_stereo(n, seed=108432, leak=0.995)

    left = [0.0] * n
    right = [0.0] * n

    # 108 Hz root with 4.5 Hz Theta binaural split (105.75 Hz L, 110.25 Hz R)
    f_sub = 54.0
    f_root_l = 105.75
    f_root_r = 110.25
    f_fifth_l = 162.0
    f_fifth_r = 163.5
    f_oct_l = 216.0
    f_oct_r = 218.25
    f_high = 324.0

    for i in range(n):
        t = i / SAMPLE_RATE
        w1 = 0.82 + 0.18 * math.sin(TWO_PI * (t / 16.0))
        w2 = 0.80 + 0.20 * math.sin(TWO_PI * (t / 32.0) + 0.9)
        w3 = 0.65 + 0.35 * math.sin(TWO_PI * (t / 21.333) + 2.1)

        sub = 0.26 * math.sin(TWO_PI * f_sub * t)
        rl = 0.28 * math.sin(TWO_PI * f_root_l * t) * w1
        rr = 0.28 * math.sin(TWO_PI * f_root_r * t) * w1

        fl = 0.16 * math.sin(TWO_PI * f_fifth_l * t + 0.4) * w2
        fr = 0.16 * math.sin(TWO_PI * f_fifth_r * t + 0.4) * w2

        ol = 0.09 * math.sin(TWO_PI * f_oct_l * t + 1.1) * w3
        or_ = 0.09 * math.sin(TWO_PI * f_oct_r * t + 1.1) * w3

        hl = 0.035 * math.sin(TWO_PI * f_high * t) * w2
        hr = 0.035 * math.sin(TWO_PI * (f_high + 0.8) * t) * w2

        # Soft velvet sub-noise floor
        nl = bl[i] * 0.18 * w1
        nr = br[i] * 0.18 * w1

        left[i] = math.tanh((sub + rl + fl + ol + hl + nl) * 1.1) * 0.88
        right[i] = math.tanh((sub + rr + fr + or_ + hr + nr) * 1.1) * 0.88

    wav_path = INPUT_DIR / "theta-drone.wav"
    write_stereo_wav(wav_path, left, right)
    return wav_path


def synth_harmonic_pad(duration_sec=64):
    """Synthesize Warm Harmonic Pad (lush 432Hz-tuned Cmaj9 ambient pad for coherence)."""
    print("Synthesizing Warm Harmonic Pad (harmonic-pad)...")
    n = int(duration_sec * SAMPLE_RATE)
    bl, br = generate_brown_stereo(n, seed=528, leak=0.996)

    left = [0.0] * n
    right = [0.0] * n

    # Warm Cmaj9 voicing in A=432Hz tuning:
    # C2 (64.22 Hz), G2 (96.22 Hz), C3 (128.43 Hz), E3 (161.82 Hz), G3 (192.43 Hz), B3 (242.45 Hz), D4 (288.33 Hz)
    voices = [
        (64.22, 0.00, 0.22, 32.0, 0.0),
        (96.22, 0.25, 0.18, 21.333, 0.8),
        (128.43, 0.45, 0.20, 16.0, 1.5),
        (161.82, -0.35, 0.15, 21.333, 2.3),
        (192.43, 0.50, 0.13, 16.0, 3.1),
        (242.45, -0.40, 0.08, 32.0, 4.0),
        (288.33, 0.30, 0.06, 21.333, 5.2),
    ]

    for i in range(n):
        t = i / SAMPLE_RATE
        sl = bl[i] * 0.06
        sr = br[i] * 0.06
        for freq, detune, amp, period, phase in voices:
            env = 0.72 + 0.28 * math.sin(TWO_PI * (t / period) + phase)
            # Slow chorus pitch drift
            drift = 0.12 * math.sin(TWO_PI * (t / 12.8) + phase)
            fl = freq - detune * 0.5 + drift
            fr = freq + detune * 0.5 - drift
            # Fundamental + soft 2nd harmonic warmth
            sl += amp * env * (math.sin(TWO_PI * fl * t + phase) + 0.18 * math.sin(TWO_PI * (fl * 2.0) * t))
            sr += amp * env * (math.sin(TWO_PI * fr * t + phase) + 0.18 * math.sin(TWO_PI * (fr * 2.0) * t))

        left[i] = math.tanh(sl * 1.05) * 0.88
        right[i] = math.tanh(sr * 1.05) * 0.88

    wav_path = INPUT_DIR / "harmonic-pad.wav"
    write_stereo_wav(wav_path, left, right)
    return wav_path


def synth_velvet_noise(duration_sec=64):
    """Synthesize Deep Sleep Velvet (ultra-smooth brown/pink blanket + 2.0 Hz Delta warmth)."""
    print("Synthesizing Deep Sleep Velvet (velvet-noise)...")
    n = int(duration_sec * SAMPLE_RATE)
    bl, br = generate_brown_stereo(n, seed=741, leak=0.9965)

    # Apply a second-stage smoothing low-pass filter to remove any high-frequency hiss
    left = [0.0] * n
    right = [0.0] * n
    lp_l = 0.0
    lp_r = 0.0
    alpha = 0.14  # Smooth velvet roll-off

    # 2.0 Hz Delta binaural sub-warmth (71.0 Hz L / 73.0 Hz R) + 108 Hz soft hum
    for i in range(n):
        t = i / SAMPLE_RATE
        lp_l = lp_l + alpha * (bl[i] - lp_l)
        lp_r = lp_r + alpha * (br[i] - lp_r)

        # Slow 16s resting breath wave
        swell = 0.86 + 0.14 * math.sin(TWO_PI * (t / 16.0))
        delta_l = 0.16 * math.sin(TWO_PI * 71.0 * t) + 0.08 * math.sin(TWO_PI * 108.0 * t)
        delta_r = 0.16 * math.sin(TWO_PI * 73.0 * t) + 0.08 * math.sin(TWO_PI * 109.0 * t)

        left[i] = math.tanh((lp_l * 0.72 * swell + delta_l * swell) * 1.1) * 0.88
        right[i] = math.tanh((lp_r * 0.72 * swell + delta_r * swell) * 1.1) * 0.88

    wav_path = INPUT_DIR / "velvet-noise.wav"
    write_stereo_wav(wav_path, left, right)
    return wav_path


def synth_adaptive_pranayama(duration_sec=64):
    """Synthesize the 2 tracks for Adaptive Pranayama:
    1. active-flow.wav: Energizing, rhythmic harmonic flow during power breaths
    2. deep-retention.wav: Deep weightless sub-aquatic stillness during breath holds
    """
    print("Synthesizing Adaptive Pranayama: Active Flow (active-flow)...")
    n = int(duration_sec * SAMPLE_RATE)
    bl, br = generate_brown_stereo(n, seed=110220, leak=0.994)

    left_a = [0.0] * n
    right_a = [0.0] * n

    # Active Flow: A2 (110 Hz), E3 (165 Hz), A3 (220 Hz), B3 (247.5 Hz), E4 (330 Hz)
    # With a gentle 3.2-second (20 cycles in 64s) rhythmic harmonic pulse
    for i in range(n):
        t = i / SAMPLE_RATE
        pulse = 0.72 + 0.28 * math.sin(TWO_PI * (t / 3.2) - math.pi / 2.0)
        phrase = 0.85 + 0.15 * math.sin(TWO_PI * (t / 16.0))

        sub = 0.22 * math.sin(TWO_PI * 55.0 * t)
        root_l = 0.24 * math.sin(TWO_PI * 109.8 * t) * pulse
        root_r = 0.24 * math.sin(TWO_PI * 110.2 * t) * pulse

        fifth_l = 0.18 * math.sin(TWO_PI * 164.8 * t + 0.3) * pulse
        fifth_r = 0.18 * math.sin(TWO_PI * 165.2 * t + 0.3) * pulse

        oct_l = 0.14 * math.sin(TWO_PI * 220.0 * t + 0.7) * phrase
        oct_r = 0.14 * math.sin(TWO_PI * 220.6 * t + 0.7) * phrase

        ninth_l = 0.08 * math.sin(TWO_PI * 247.5 * t + 1.2) * pulse * phrase
        ninth_r = 0.08 * math.sin(TWO_PI * 248.1 * t + 1.2) * pulse * phrase

        high_l = 0.06 * math.sin(TWO_PI * 330.0 * t) * (1.0 - 0.4 * pulse)
        high_r = 0.06 * math.sin(TWO_PI * 330.5 * t) * (1.0 - 0.4 * pulse)

        air_l = bl[i] * 0.10 * pulse
        air_r = br[i] * 0.10 * pulse

        left_a[i] = math.tanh((sub + root_l + fifth_l + oct_l + ninth_l + high_l + air_l) * 1.05) * 0.88
        right_a[i] = math.tanh((sub + root_r + fifth_r + oct_r + ninth_r + high_r + air_r) * 1.05) * 0.88

    active_wav = INPUT_DIR / "active-flow.wav"
    write_stereo_wav(active_wav, left_a, right_a)

    print("Synthesizing Adaptive Pranayama: Deep Retention (deep-retention)...")
    left_r = [0.0] * n
    right_r = [0.0] * n

    # Deep Retention: Same A=110Hz harmonic key so crossfading from Active Flow is 100% consonant!
    # Drops the rhythmic pulse into a deep, suspended sub-aquatic 55Hz/110Hz Theta binaural pad
    # with slow crystalline overtone washes and soft bowl resonances
    for i in range(n):
        t = i / SAMPLE_RATE
        slow1 = 0.78 + 0.22 * math.sin(TWO_PI * (t / 32.0))
        slow2 = 0.75 + 0.25 * math.sin(TWO_PI * (t / 21.333) + 1.5)

        sub = 0.28 * math.sin(TWO_PI * 55.0 * t) * slow1
        # 4.0 Hz Theta binaural split around 110 Hz (108.0 Hz L / 112.0 Hz R)
        rl = 0.26 * math.sin(TWO_PI * 108.0 * t) * slow1
        rr = 0.26 * math.sin(TWO_PI * 112.0 * t) * slow1

        fl = 0.15 * math.sin(TWO_PI * 165.0 * t + 0.5) * slow2
        fr = 0.15 * math.sin(TWO_PI * 166.2 * t + 0.5) * slow2

        # Warm major-third / fifth shimmer that slowly floats in and out
        shimmer_env = 0.5 + 0.5 * math.sin(TWO_PI * (t / 16.0) + 0.8)
        sh_l = 0.07 * math.sin(TWO_PI * 275.0 * t) * shimmer_env
        sh_r = 0.07 * math.sin(TWO_PI * 276.0 * t) * shimmer_env

        deep_air_l = bl[i] * 0.12 * slow1
        deep_air_r = br[i] * 0.12 * slow1

        left_r[i] = math.tanh((sub + rl + fl + sh_l + deep_air_l) * 1.1) * 0.88
        right_r[i] = math.tanh((sub + rr + fr + sh_r + deep_air_r) * 1.1) * 0.88

    # Add 4 distant, gentle sub-aquatic bowl chimes during retention
    for st_sec, f_bowl in [(4.0, 220.0), (20.0, 165.0), (36.0, 220.0), (50.0, 165.0)]:
        st_idx = int(st_sec * SAMPLE_RATE)
        b_len = int(12.0 * SAMPLE_RATE)
        for k in range(b_len):
            dt = k / SAMPLE_RATE
            att = 0.5 * (1.0 - math.cos(math.pi * dt / 0.08)) if dt < 0.08 else 1.0
            env = att * math.exp(-dt / 4.8)
            val_l = 0.14 * env * (math.sin(TWO_PI * f_bowl * dt) + 0.25 * math.sin(TWO_PI * f_bowl * 2.756 * dt))
            val_r = 0.14 * env * (math.sin(TWO_PI * (f_bowl + 0.5) * dt) + 0.25 * math.sin(TWO_PI * (f_bowl * 2.756 + 0.9) * dt))
            idx = st_idx + k
            if idx < n:
                left_r[idx] = math.tanh(left_r[idx] + val_l)
                right_r[idx] = math.tanh(right_r[idx] + val_r)

    ret_wav = INPUT_DIR / "deep-retention.wav"
    write_stereo_wav(ret_wav, left_r, right_r)
    return active_wav, ret_wav


if __name__ == "__main__":
    synth_singing_bowls()
    synth_theta_drone()
    synth_harmonic_pad()
    synth_velvet_noise()
    synth_adaptive_pranayama()
    print("All synthesized WAVs written to input_sounds/!")
