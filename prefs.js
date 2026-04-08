import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

export default class SimpleSwitcherPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        window.add(page);

        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior',
        });
        
        page.add(behaviorGroup);

        const methodRow = new Adw.SwitchRow({
            title: 'Skip Confirmation Dialog',
            subtitle: 'Apply settings immediately instead of showing a confirmation popup',
        });

        settings.bind('use-persistent-apply', methodRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(methodRow);

        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance and Labels',
        });

        page.add(appearanceGroup);

        const mainLabelRow = new Adw.SwitchRow({
            title: 'Use "Main Display Only"',
            subtitle: 'Always label the first display as "Main Display"',
        });

        settings.bind('use-main-display-label', mainLabelRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(mainLabelRow);

        const hardwareNameRow = new Adw.SwitchRow({
            title: 'Use Hardware Names',
            subtitle: 'Show hardware names (e.g. HDMI-1) instead of generic numbers',
        });

        settings.bind('use-display-names', hardwareNameRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(hardwareNameRow);
    }
}