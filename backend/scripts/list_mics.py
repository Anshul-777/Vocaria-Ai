import sounddevice as sd

def list_devices():
    print("\n=== AVAILABLE AUDIO INPUT DEVICES ===")
    devices = sd.query_devices()
    default_in = sd.default.device[0]
    
    for i, dev in enumerate(devices):
        if dev['max_input_channels'] > 0:
            is_default = " (DEFAULT)" if i == default_in else ""
            print(f"[{i}] {dev['name']} - {dev['max_input_channels']} channels{is_default}")
            
if __name__ == "__main__":
    list_devices()
