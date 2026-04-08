import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as SwitchMonitor from 'resource:///org/gnome/shell/ui/switchMonitor.js';

let _origInit = null;
let _origFinish = null;
let _settings = null;

const BUS_NAME = 'org.gnome.Mutter.DisplayConfig';
const OBJECT_PATH = '/org/gnome/Mutter/DisplayConfig';
const INTERFACE_NAME = 'org.gnome.Mutter.DisplayConfig';

export default class SimpleDisplaySwitcherExtension extends Extension {
    enable() {
        _origInit = SwitchMonitor.SwitchMonitorPopup.prototype._init;
        _origFinish = SwitchMonitor.SwitchMonitorPopup.prototype._finish;
        
        try { _settings = this.getSettings(); } catch (e) { }

        SwitchMonitor.SwitchMonitorPopup.prototype._init = function() {
            _origInit.call(this);
            const monitors = global.backend.get_monitor_manager().get_monitors();

            if (monitors.length > 1) {
                const useMainLabel = _settings ? _settings.get_boolean('use-main-display-label') : true;
                const useHardwareNames = _settings ? _settings.get_boolean('use-display-names') : false;

                monitors.forEach((monitor, i) => {
                    const connector = monitor.get_connector();
                    let labelText = '';

                    if (i === 0 && useMainLabel) {
                        labelText = 'Main Display Only';
                    } else if (useHardwareNames) {
                        labelText = `${connector} Only`;
                    } else {
                        labelText = `Display ${i + 1} Only`;
                    }

                    const box = new St.BoxLayout({ style_class: 'alt-tab-app', vertical: true });
                    const icon = new St.Icon({
                        icon_name: i === 0 ? 'shell-display-built-in-only-symbolic' : 'shell-display-external-only-symbolic',
                        icon_size: 96,
                    });
                    box.add_child(icon);
                    const labelActor = new St.Label({ text: labelText, x_align: Clutter.ActorAlign.CENTER });
                    box.add_child(labelActor);

                    this._switcherList.addItem(box, labelActor);
                    this._items.push({ label: labelText, connector: connector, isCustomMonitor: true });
                });
            }
        };

        SwitchMonitor.SwitchMonitorPopup.prototype._finish = function() {
            const item = this._items[this._selectedIndex];
            const usePersistent = _settings ? _settings.get_boolean('use-persistent-apply') : true;

            if (item && item.isCustomMonitor) {
                Gio.DBus.session.call(
                    BUS_NAME, OBJECT_PATH, INTERFACE_NAME, 'GetCurrentState',
                    null, null, Gio.DBusCallFlags.NONE, -1, null,
                    (conn, res) => {
                        try {
                            const unpacked = conn.call_finish(res).deepUnpack();
                            const serial = unpacked[0];
                            const physicalMonitors = unpacked[1];
                            let targetMode = '';

                            for (const monitorData of physicalMonitors) {
                                if (monitorData[0][0] === item.connector) {
                                    const modes = monitorData[1]; 
                                    let bestMode = modes[0][0]; 
                                    for (const mode of modes) {
                                        if (mode[6] && (mode[6]['is-current'] || mode[6]['is-preferred'])) {
                                            bestMode = mode[0];
                                            break;
                                        }
                                    }
                                    targetMode = bestMode;
                                    break;
                                }
                            }

                            const variant = GLib.Variant.new('(uua(iiduba(ssa{sv}))a{sv})', [
                                serial, usePersistent ? 1 : 2, 
                                [[0, 0, 1.0, 0, true, [[item.connector, targetMode, {}]]]],
                                {}
                            ]);

                            conn.call(BUS_NAME, OBJECT_PATH, INTERFACE_NAME, 'ApplyMonitorsConfig', variant, null, Gio.DBusCallFlags.NONE, -1, null, (c, r) => { try { c.call_finish(r); } catch (err) {} });
                        } catch (e) { }
                    }
                );
                this.fadeAndDestroy();
                return;
            }
            _origFinish.call(this);
        };
    }

    disable() {
        if (_origInit) {
            SwitchMonitor.SwitchMonitorPopup.prototype._init = _origInit;
            SwitchMonitor.SwitchMonitorPopup.prototype._finish = _origFinish;
        }
        _settings = null;
    }
}