import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

export default class SimpleSwitcherPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Create a page
        const page = new Adw.PreferencesPage();
        window.add(page);

        // --- GROUP 1: BEHAVIOR ---
        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior',
        });
        
        page.add(behaviorGroup);

        const methodRow = new Adw.SwitchRow({
            title: 'Skip Confirmation Dialog',
            subtitle: 'Apply settings immediately instead of showing the "Keep Settings" popup.',
        });
        settings.bind('use-persistent-apply', methodRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(methodRow);

        // --- GROUP 2: APPEARANCE ---
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance'
        });
        
        page.add(appearanceGroup);

        const mainLabelRow = new Adw.SwitchRow({
            title: 'Use "Main Display Only"',
            subtitle: 'Label the first display as "Main Display".',
        });
        settings.bind('use-main-display-label', mainLabelRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(mainLabelRow);

        const hardwareNameRow = new Adw.SwitchRow({
            title: 'Use Hardware Names',
            subtitle: 'Show "HDMI-1 Only" instead of "Display 2 Only".',
        });
        settings.bind('use-display-names', hardwareNameRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(hardwareNameRow);
    }
}