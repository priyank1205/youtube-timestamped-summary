// Fidelity check for the rebuilt folder picker: the reference capture's exact
// contents, drawn at 2× on the same 24 pt margin, to diff against
// capture/macos reference shots (1856 × 992 px).
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { MacOpenPanel, MacTheme, OpenPanelSpec } from '../ui/MacOpenPanel';

export function referenceSpec(theme: MacTheme): OpenPanelSpec {
  return {
    theme, width: 880, message: 'Select the extension directory.',
    sidebar: [
      { items: [{ icon: 'clock', label: 'Recents' }, { icon: 'folder.badge.person.crop', label: 'Shared' }] },
      { title: 'Favorites', items: [
        { icon: 'appstore', label: 'Applic…' }, { icon: 'arrow.down.circle', label: 'Downl…' }, { icon: 'folder', label: 'Tutorials' },
        { icon: 'doc', label: 'Docum…' }, { icon: 'menubar.dock.rectangle', label: 'Desktop' }, { icon: 'folder', label: 'Vibeco…' }, { icon: 'doc', label: 'Docum…' },
      ] },
      { title: 'Locations', items: [{ icon: 'icloud', label: 'iCloud…' }, { icon: 'house', label: 'priyank' }] },
    ],
    sideKnob: { top: 17.5, h: 391 },
    path: { icon: 'folder', label: 'Downloads' },
    columns: [
      { groups: [
        { title: 'Previous 30 Days', rows: [{ icon: 'library', name: 'Library', folder: true }, { icon: 'folder', name: 'private', folder: true, sel: 'inactive' }] },
        { title: 'August', rows: [{ icon: 'system', name: 'System', folder: true }] },
        { title: '2021', rows: [{ icon: 'users', name: 'Users', folder: true }] },
        { title: 'Earlier', rows: [] },
      ], knob: { top: 97, h: 225 } },
      { groups: [{ title: 'Previous 30 Days', rows: ['etc', 'tftpboot', 'tmp', 'var'].map((n) => ({ icon: 'folder' as const, name: n, folder: true, sel: n === 'tmp' ? 'inactive' as const : undefined })) }] },
    ],
    hScroll: { x: 3, w: 248 },
  };
}

export const PickerTest: React.FC<{ theme: MacTheme }> = ({ theme }) => (
  <AbsoluteFill style={{ background: theme === 'dark' ? 'rgb(21,23,24)' : 'rgb(188,188,188)' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 928, height: 496, transform: 'scale(2)', transformOrigin: '0 0' }}>
      <div style={{ position: 'absolute', left: 24, top: 24 }}>
        <MacOpenPanel spec={referenceSpec(theme)} />
      </div>
    </div>
  </AbsoluteFill>
);
