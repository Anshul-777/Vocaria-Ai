import os, re

files = {
    r'dashboard\Dashboard.tsx': ('Dashboard', 'from-blue-600 to-cyan-500', 'Gauge'),
    r'voices\VoiceLibrary.tsx': ('Voice Profiles', 'from-green-600 to-emerald-500', 'Mic2'),
    r'voices\GeneratePage.tsx': ('Generate Voice', 'from-orange-500 to-red-500', 'Wand2'),
    r'voices\NewVoiceProfile.tsx': ('Clone Voice', 'from-purple-600 to-fuchsia-500', 'Zap'),
    r'agent\VoiceAgent.tsx': ('Vocaria Agent', 'from-indigo-600 to-purple-500', 'Bot'),
    r'detection\DetectionLab.tsx': ('Detection Lab', 'from-red-600 to-rose-500', 'Shield'),
    r'detection\LiveDetection.tsx': ('Live Detection', 'from-rose-500 to-pink-500', 'Activity'),
    r'hub\HubPage.tsx': ('Vocaria Hub', 'from-pink-500 to-orange-400', 'Globe'),
    r'analytics\Analytics.tsx': ('Analytics', 'from-yellow-500 to-amber-500', 'BarChart3'),
    r'benchmarks\BenchmarksPage.tsx': ('Benchmarks', 'from-fuchsia-600 to-pink-500', 'Star'),
    r'quality\QualityPage.tsx': ('Quality Lab', 'from-cyan-500 to-blue-500', 'FlaskConical'),
    r'history\HistoryPage.tsx': ('History', 'from-slate-600 to-gray-500', 'HistoryIcon'), # Wait, lucide-react exports 'History'
    r'audit\AuditPage.tsx': ('Audit Logs', 'from-teal-600 to-emerald-500', 'FileText'),
    r'billing\Billing.tsx': ('Billing', 'from-emerald-600 to-green-500', 'CreditCard'),
    r'settings\SettingsPage.tsx': ('Settings', 'from-gray-700 to-slate-500', 'SettingsIcon') # lucide-react exports 'Settings'
}
# We will use the exact names from lucide-react. Settings -> Settings, History -> History
# So I'll rename them in the config:
files[r'history\HistoryPage.tsx'] = ('History', 'from-slate-600 to-gray-500', 'History')
files[r'settings\SettingsPage.tsx'] = ('Settings', 'from-gray-700 to-slate-500', 'Settings')

base_dir = r'C:\Users\anshu\OneDrive\Desktop\Vocaria AI\vocaria\frontend\src\pages'

def ensure_import(content, icon):
    # Check if icon is already imported from lucide-react
    if re.search(fr'\b{icon}\b', content) and 'lucide-react' in content:
        # It's likely already imported, but let's be safe.
        # Actually, let's just make sure it's in the lucide-react import statement.
        lucide_import_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"]', content)
        if lucide_import_match:
            imports = [i.strip() for i in lucide_import_match.group(1).split(',')]
            if icon not in imports:
                new_imports = lucide_import_match.group(1) + f', {icon}'
                content = content[:lucide_import_match.start(1)] + new_imports + content[lucide_import_match.end(1):]
        else:
            # Add a new import at the top
            content = f"import {{ {icon} }} from 'lucide-react';\n" + content
    else:
        lucide_import_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"]', content)
        if lucide_import_match:
            new_imports = lucide_import_match.group(1) + f', {icon}'
            content = content[:lucide_import_match.start(1)] + new_imports + content[lucide_import_match.end(1):]
        else:
            # Add a new import at the top
            content = f"import {{ {icon} }} from 'lucide-react';\n" + content
    return content

for rel_path, (title, grad, icon) in files.items():
    path = os.path.join(base_dir, rel_path)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
            
        c = ensure_import(c, icon)
        
        # We find the previously generated <h1>
        # <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r {grad}" style={{ fontFamily: 'Instrument Serif, serif' }}>{title}</h1>
        # And replace it with:
        # <div className="flex items-center gap-3 mb-2"><Icon className="w-8 h-8 text-black" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r {grad} animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>{title}</h1></div>
        
        pattern = r'<h1[^>]*bg-gradient-to-r[^>]*>.*?</h1>'
        
        # Color mapping for icon
        # It's better to just use text-black or a dark color
        
        new_h1 = f'<div className="flex items-center gap-3"><{icon} className="w-8 h-8 md:w-10 md:h-10 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r {grad} animate-text-pan" style={{{{ fontFamily: \\\'Instrument Serif, serif\\\' }}}}>{title}</h1></div>'
        
        c2 = re.sub(pattern, new_h1, c, count=1)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c2)
        print('Updated', rel_path)
    else:
        print('Not found', rel_path)
