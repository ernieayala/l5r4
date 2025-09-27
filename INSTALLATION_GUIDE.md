# L5R4 System Installation Guide

## 📋 System Requirements

- **Foundry VTT**: Version 13.x or later
- **Browser**: Modern browser with JavaScript enabled
- **Storage**: ~10MB free space for system files

## 🚀 Installation Methods

### Method 1: Foundry System Browser (Recommended)

This is the easiest method for most users:

1. **Launch Foundry VTT**
2. **Navigate to Setup**
   - Click on the "Game Systems" tab
3. **Install System**
   - Click the "Install System" button
4. **Search for L5R4**
   - In the search box, type: `Legend of the Five Rings 4th Edition`
   - Or search for: `L5R4`
5. **Install**
   - Click "Install" next to the L5R4 system
   - Wait for installation to complete

### Method 2: Manual Installation via Manifest URL

Use this method if the system browser doesn't work or for beta versions:

1. **Open Foundry VTT Setup**
2. **Navigate to Game Systems**
3. **Click "Install System"**
4. **Enter Manifest URL**
   ```
   https://github.com/ernieayala/l5r4/releases/latest/download/system.json
   ```
5. **Click "Install"**
6. **Wait for completion**

### Method 3: Development Installation

For developers or advanced users who want the latest development version:

1. **Locate Foundry Data Directory**
   - Windows: `%LOCALAPPDATA%\FoundryVTT\Data\systems\`
   - macOS: `~/Library/Application Support/FoundryVTT/Data/systems/`
   - Linux: `~/.local/share/FoundryVTT/Data/systems/`

2. **Clone Repository**
   ```bash
   cd [foundry-data-path]/systems/
   git clone https://github.com/ernieayala/l5r4.git
   ```

3. **Install Dependencies**
   ```bash
   cd l5r4
   npm install
   ```

4. **Build CSS**
   ```bash
   npm run build:css
   ```

## 🔧 Post-Installation Setup

### 1. Create a New World

1. **Return to Foundry Setup**
2. **Click "Create World"**
3. **Configure World**
   - **World Title**: Enter your campaign name
   - **Game System**: Select "Legend of the Five Rings 4th Edition"
   - **World Description**: Optional campaign description
4. **Click "Create World"**

### 2. System Settings Configuration

Once in your world, configure these recommended settings:

#### Core Settings
- **System Settings** → **L5R4 Configuration**
  - ✅ **Stance Automation**: Enable for automatic stance effects
  - ✅ **Insight Rank Calculation**: Enable for automatic insight tracking
  - ⚙️ **Roll Dialog Visibility**: Choose when modifier dialogs appear
  - ⚙️ **Ten Dice Rule Variant**: Enable Little Truths variant if desired

#### Foundry Core Settings
- **Configure Settings** → **Core Settings**
  - **Default Token Settings**: Configure for L5R4 characters
  - **Combat Settings**: Set initiative formula to `1d10 + @initiative.total`

### 3. Language Selection

The system supports multiple languages:

1. **Configure Settings** → **Core Settings**
2. **Language Preference**
   - 🇺🇸 English (en)
   - 🇪🇸 Español (es)
   - 🇫🇷 Français (fr)
   - 🇧🇷 Português (Brasil) (pt-BR)
   - 🇩🇪 Deutsch (de)
   - 🇷🇺 Русский (ru)

## ✅ Installation Verification

### Quick Test Checklist

1. **Create Test Actor**
   - Click "Create Actor" in the sidebar
   - Select "PC" type
   - Name it "Test Character"
   - Open the character sheet

2. **Verify Core Features**
   - ✅ Character sheet opens without errors
   - ✅ Traits display correctly (Earth, Air, Fire, Water, Void)
   - ✅ Skills section is populated
   - ✅ XP Manager opens (click XP value)
   - ✅ Dice rolls work (click any trait or skill)

3. **Test Dice Rolling**
   - Click on a trait (should roll XkY)
   - Try typing in chat: `/roll 5k3`
   - Verify L5R4 styled roll results appear

4. **Check Language Files**
   - All UI text should be in your selected language
   - No "l5r4.ui.something" text should appear

## 🐛 Troubleshooting

### Common Issues

#### "System not found" Error
- **Cause**: Manifest URL incorrect or network issue
- **Solution**: 
  1. Verify manifest URL is exactly: `https://github.com/ernieayala/l5r4/releases/latest/download/system.json`
  2. Check internet connection
  3. Try again in a few minutes

#### Character Sheet Won't Open
- **Cause**: JavaScript error or module conflict
- **Solution**:
  1. Press F12 to open browser console
  2. Look for red error messages
  3. Disable other modules temporarily
  4. Report errors on GitHub Issues

#### Dice Rolls Not Working
- **Cause**: Dice service not loading properly
- **Solution**:
  1. Refresh the page (F5)
  2. Check browser console for errors
  3. Verify no conflicting dice modules are active

#### Missing Translations
- **Cause**: Language file not loading
- **Solution**:
  1. Verify language selection in Core Settings
  2. Refresh the page
  3. Check if language file exists in system files

#### CSS Styling Issues
- **Cause**: CSS file not loading or cached
- **Solution**:
  1. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
  2. Clear browser cache
  3. Check if l5r4.css exists in system directory

### Advanced Troubleshooting

#### Enable Debug Mode
1. **Core Settings** → **Configure Settings**
2. **Core Settings** → **Compatibility Options**
3. Enable **Debug Mode**
4. Check console for detailed error messages

#### Module Conflicts
If experiencing issues:
1. Disable all modules
2. Test L5R4 system functionality
3. Re-enable modules one by one to identify conflicts

#### File Permissions (Self-Hosted)
Ensure Foundry has read access to:
- `systems/l5r4/` directory
- All subdirectories and files
- Especially `l5r4.js`, `l5r4.css`, and `system.json`

## 🔄 Updating the System

### Automatic Updates (System Browser)
1. **Game Systems** tab in Foundry Setup
2. Look for "Update Available" next to L5R4
3. Click "Update"
4. Restart Foundry

### Manual Updates (Manifest URL)
1. **Game Systems** tab
2. Find L5R4 system
3. Click "Update" or reinstall with latest manifest URL

### Development Updates (Git)
```bash
cd [foundry-data-path]/systems/l5r4/
git pull origin main
npm install
npm run build:css
```

## 📞 Getting Help

### Before Reporting Issues
1. ✅ Check this troubleshooting guide
2. ✅ Verify you're using Foundry v13+
3. ✅ Test with modules disabled
4. ✅ Check browser console for errors (F12)

### Where to Get Help
- **GitHub Issues**: [Report bugs and technical issues](https://github.com/ernieayala/l5r4/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/ernieayala/l5r4/discussions)
- **Foundry Discord**: #system-development channel for general Foundry help

### When Reporting Issues
Please include:
- **Foundry VTT Version**: (e.g., "13.331")
- **L5R4 System Version**: (e.g., "1.0.0")
- **Browser**: (e.g., "Chrome 120.0")
- **Operating System**: (e.g., "Windows 11")
- **Steps to Reproduce**: Detailed steps
- **Console Errors**: Copy any red error messages from F12 console
- **Screenshots**: If applicable

## 🎯 Next Steps

Once installed successfully:

1. **Read the README.md** for feature overview
2. **Check CHANGELOG.MD** for recent changes
3. **Create your first L5R4 character**
4. **Explore the XP Manager** for character advancement
5. **Test dice rolling mechanics** with various roll types
6. **Configure system settings** to your preferences

## 📚 Additional Resources

- **System Documentation**: [README.md](README.md)
- **Change History**: [CHANGELOG.MD](CHANGELOG.MD)
- **Active Effects Guide**: See README.md for complete attribute reference
- **Development Guide**: Contributing section in README.md

---

*Ready to experience the Emerald Empire? Your journey in Rokugan awaits!* 🌸
