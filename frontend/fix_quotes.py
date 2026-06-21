import os

base_dir = r'C:\Users\anshu\OneDrive\Desktop\Vocaria AI\vocaria\frontend\src\pages'
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            if r"\'Instrument Serif, serif\'" in content:
                content = content.replace(r"\'Instrument Serif, serif\'", "'Instrument Serif, serif'")
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print('Fixed', path)
