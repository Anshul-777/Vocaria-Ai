import sounddevice as sd
import numpy as np
from scipy.io import wavfile
import time

def test_microphone():
    print("\n--- MICROPHONE TEST ---")
    duration = 5  # seconds
    fs = 48000    # Sample rate

    print("Checking default input device...")
    try:
        device_info = sd.query_devices(sd.default.device[0], 'input')
        print(f"Device: {device_info['name']}")
    except Exception as e:
        print(f"Could not query device info: {e}")
    
    print("\nGet ready... RECORDING STARTS IN 2 SECONDS!")
    time.sleep(2)
    
    print("\n[RECORDING NOW] PLEASE SPEAK FOR 5 SECONDS...")
    
    # Record audio
    try:
        recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
        sd.wait()  # Wait until recording is finished
    except Exception as e:
        print(f"\n❌ FAILED TO RECORD! Error: {e}")
        return
        
    print("[RECORDING FINISHED]")
    
    # Check max amplitude
    max_amp = np.max(np.abs(recording))
    print(f"\nMax Amplitude recorded: {max_amp:.6f} (Scale is 0.0 to 1.0)")
    
    if max_amp < 0.001:
        print("[ERROR]: The audio is almost completely silent. Your Windows microphone is either muted, disabled, or no hardware is feeding sound to it.")
    elif max_amp < 0.05:
        print("[WARNING]: Audio was captured, but it is extremely quiet.")
    else:
        print("[SUCCESS]: Strong audio signal detected!")

    # Save to file
    out_file = 'test_mic_recording.wav'
    wavfile.write(out_file, fs, recording)
    print(f"\nSaved raw audio to {out_file} in your backend folder. You can play it locally to confirm.")

if __name__ == "__main__":
    test_microphone()
