# Simple Display Switcher GNOME Extension

A GNOME extension that adds "only use display" options to the existing display switcher functionality (Super+P).

## Dependencies

- GNOME Shell - [switchMonitor.js](https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/switchMonitor.js)
- `glib-compile-schemas` (usually part of `libglib2.0-bin` or `glib2-devel`)

## Features

- **Individual Display Isolation:** Adds "Only use Display X" options for every connected monitor.
- **Configurable Apply Method:** Toggle between Method 1 (Persistent/Instant) and Method 2 (Temporary/Confirmation Dialog) via settings.
- **Seamless Integration:** Overrides the native Super+P menu without changing the look and feel of GNOME.

## Installation

### Manual Installation

1. **Create the extension directory structure:**
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/simple-display-switcher@dollique.com/schemas
   ```

2. **Copy the extension files to the directory:**
   ```bash
   # From your development folder
   cp metadata.json extension.js prefs.js stylesheet.css ~/.local/share/gnome-shell/extensions/simple-display-switcher@dollique.com/
   cp schemas/org.gnome.shell.extensions.simple-display-switcher.gschema.xml ~/.local/share/gnome-shell/extensions/simple-display-switcher@dollique.com/schemas/
   ```

3. **Compile the Settings Schema (Required):**
   This step is mandatory for the extension to read your preferences.
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/simple-display-switcher@dollique.com/schemas/
   ```

## Testing and Deployment

### Restart GNOME Shell

1. **Restart the Shell:**
   - **On X11:** Press `Alt+F2`, type `r`, and press Enter.
   - **On Wayland:** You must Log Out or kill the session using `pkill -3 gnome-shell` (which also logs you out).

2. **Enable the extension:**
   ```bash
   gnome-extensions enable simple-display-switcher@dollique.com
   ```

## Usage

1. Press `Super+P` to open the display switcher menu.
2. Select any of the new "Only use Display..." options.
3. **Preferences:** Open the "Extensions" app or "Extension Manager", locate "Simple Display Switcher", and click the settings button to toggle "Instant Apply" mode.

## Troubleshooting

### Settings/Preferences Errors
If the extension fails to load or settings won't open, verify the schema is compiled:
```bash
ls ~/.local/share/gnome-shell/extensions/simple-display-switcher@dollique.com/schemas/gschemas.compiled
```
If this file is missing, repeat Step 3 of the installation.

### View Real-time Logs
To see debug output and DBus errors:
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```
