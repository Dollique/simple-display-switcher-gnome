import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as SwitchMonitor from 'resource:///org/gnome/shell/ui/switchMonitor.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// DBus Constants
const BUS_NAME = 'org.gnome.Mutter.DisplayConfig';
const OBJECT_PATH = '/org/gnome/Mutter/DisplayConfig';
const INTERFACE_NAME = 'org.gnome.Mutter.DisplayConfig';

// UI Configuration
const Config = {
    ICON_SIZE: 96,
    MAIN_DISPLAY_LABEL: 'Main Display Only',
    MAIN_ICON: 'shell-display-built-in-only-symbolic',
    EXTERNAL_ICON: 'shell-display-external-only-symbolic',
};

// Mutter Apply Methods
const ApplyMethod = {
    PERSISTENT: 1, // Method 1: Instant apply
    TEMPORARY: 2,  // Method 2: Shows "Keep Changes" dialog
};

export default class SimpleDisplaySwitcherExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._origInit = SwitchMonitor.SwitchMonitorPopup.prototype._init;
        this._origFinish = SwitchMonitor.SwitchMonitorPopup.prototype._finish;

        const extension = this;

        // extend the SwitchMonitorPopup class to add our custom monitor options and handle their selection
        SwitchMonitor.SwitchMonitorPopup.prototype._init = function() {
            extension._origInit.call(this);
            const monitors = global.backend.get_monitor_manager().get_monitors();

            if (monitors.length > 1) {
                const useMainLabel = extension._settings.get_boolean('use-main-display-label');
                const useHardwareNames = extension._settings.get_boolean('use-display-names');

                monitors.forEach((monitor, i) => {
                    const connector = monitor.get_connector();
                    let labelText;

                    if (i === 0 && useMainLabel) {
                        labelText = Config.MAIN_DISPLAY_LABEL;
                    } else if (useHardwareNames) {
                        labelText = `${connector} Only`;
                    } else {
                        labelText = `Display ${i + 1} Only`;
                    }

                    const box = new St.BoxLayout({
                        style_class: 'alt-tab-app',
                        vertical: true,
                    });

                    const icon = new St.Icon({
                        icon_name: i === 0 ? Config.MAIN_ICON : Config.EXTERNAL_ICON,
                        icon_size: Config.ICON_SIZE,
                    });
                    box.add_child(icon);

                    const labelActor = new St.Label({
                        text: labelText,
                        x_align: Clutter.ActorAlign.CENTER,
                    });
                    box.add_child(labelActor);

                    this._switcherList.addItem(box, labelActor);
                    this._items.push({
                        label: labelText,
                        connector,
                        isCustomMonitor: true,
                    });
                });
            }
        };

        // Override the _finish method to apply the selected monitor configuration when a custom monitor option is chosen
        SwitchMonitor.SwitchMonitorPopup.prototype._finish = function() {
            const item = this._items[this._selectedIndex];
            const usePersistent = extension._settings.get_boolean('use-persistent-apply');

            if (item?.isCustomMonitor) {
                const connection = Gio.DBus.session;
                // connection.call is an asynchronous GIO method used to talk to the system bus
                connection.call(
                    BUS_NAME,           // The destination (org.gnome.Mutter.DisplayConfig)
                    OBJECT_PATH,        // The object path (/org/gnome/Mutter/DisplayConfig)
                    INTERFACE_NAME,     // The specific interface to use
                    'GetCurrentState',  // The method name: fetches serial, physical, and logical monitor data
                    null,               // (GVariant) Parameters: GetCurrentState takes no input parameters
                    null,               // (GVariantType) Expected return type: null lets GJS infer it
                    Gio.DBusCallFlags.NONE, // Flags: standard call, no special requirements
                    -1,                 // Timeout: -1 means use the default system timeout
                    null,               // Cancellable: allows you to cancel the request (not needed here)
                    (conn, res) => {
                        try {
                            const unpacked = conn.call_finish(res).deepUnpack(); // unpacked is a tuple: [serial (u), physicalMonitors (a(iiduba(ssa{sv})))]
                            const serial = unpacked[0]; // A unique number representing the current state of the display configuration
                            const physicalMonitors = unpacked[1]; // An array of all physical monitors detected by the system, each with its supported modes and properties
                            let targetMode = '';

                            // Loop through all physical monitors detected by the system
                            for (const monitorData of physicalMonitors) {
                                // monitorData[0] contains the monitor identification info
                                // monitorData[0][0] is the connector string (e.g., 'DP-1' or 'HDMI-1')
                                if (monitorData[0][0] === item.connector) {
                                    
                                    // monitorData[1] is an array of all supported video modes for this monitor
                                    const modes = monitorData[1];
                                    
                                    // Default to the very first mode available in case no preferred mode is found
                                    // mode[0] is the Mode ID (a string like '1920x1080@60')
                                    let bestMode = modes[0][0]; 
                                    
                                    for (const mode of modes) {
                                        // mode[6] is a dictionary (a{sv}) of extra properties for that mode
                                        // We check 'is-current' to keep the resolution the user is currently using
                                        // We check 'is-preferred' as a fallback (usually the monitor's native resolution)
                                        if (mode[6]?.['is-current'] || mode[6]?.['is-preferred']) {
                                            bestMode = mode[0];
                                            break;
                                        }
                                    }
                                    
                                    // Store the ID of the mode we want to apply to this connector
                                    targetMode = bestMode;
                                    break; // Stop looking; we found our monitor
                                }
                            }

                            // Use the defined ApplyMethod enum for readability
                            const method = usePersistent ? ApplyMethod.PERSISTENT : ApplyMethod.TEMPORARY;

                            // GLib.Variant.new defines the data structure Mutter expects for 'ApplyMonitorsConfig'
                            const configVariant = GLib.Variant.new('(uua(iiduba(ssa{sv}))a{sv})', [
                                // 1. (u) Serial: A unique number to ensure we are modifying the current state
                                serial, 

                                // 2. (u) Method: 1 for Persistent (Method 1), 2 for Temporary (Method 2)
                                method, 

                                // 3. (a(...)) Logical Monitors: An array of monitor layouts
                                [
                                    [
                                        0,    // (i) X-coordinate of the monitor (0 = top-left)
                                        0,    // (i) Y-coordinate of the monitor (0 = top-left)
                                        1.0,  // (d) Scale (1.0 = 100%, 2.0 = 200%)
                                        0,    // (u) Rotation (0 = normal, 1 = 90 deg, etc.)
                                        true, // (b) Primary: whether this is the main monitor
                                        
                                        // (a(ssa{sv})) Physical Monitors: The hardware assigned to this layout
                                        [
                                            [
                                                item.connector, // (s) Connector ID (e.g., 'HDMI-1')
                                                targetMode,     // (s) Mode ID (e.g., '1920x1080@60')
                                                {}              // (a{sv}) Extra properties (empty for default)
                                            ]
                                        ]
                                    ]
                                ],

                                // 4. (a{sv}) Global Properties: Extra configuration (usually empty)
                                {}, 
                            ]);

                            // Call the Mutter method to apply our new monitor configuration
                            connection.call(
                                BUS_NAME, OBJECT_PATH, INTERFACE_NAME, 'ApplyMonitorsConfig',
                                configVariant, null, Gio.DBusCallFlags.NONE, -1, null,
                                (dbusConnection, taskResult) => {
                                    try {
                                        dbusConnection.call_finish(taskResult);
                                    } catch (err) {
                                        logError(err);
                                    }
                                }
                            );
                        } catch (e) {
                            logError(e);
                        }
                    }
                );

                // If using temporary apply, we can immediately close the popup since the "Keep Changes" dialog will appear
                this.fadeAndDestroy();
                return;
            }

            extension._origFinish.call(this);
        };
    }

    disable() {
        // Restore original methods to ensure we don't leave any side effects
        SwitchMonitor.SwitchMonitorPopup.prototype._init = this._origInit;
        SwitchMonitor.SwitchMonitorPopup.prototype._finish = this._origFinish;
        this._origInit = null;
        this._origFinish = null;
        this._settings = null;
    }
}