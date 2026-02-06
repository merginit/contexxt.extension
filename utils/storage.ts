export interface ExtensionSettings {
  showAlt: 'always' | 'hover' | 'no-hover' | 'never';
  showUrl: 'always' | 'hover' | 'no-hover' | 'never';
  enableCtrlClick: boolean;
}

export const defaultSettings: ExtensionSettings = {
  showAlt: 'never',
  showUrl: 'always',
  enableCtrlClick: false,
};

export const settingsStorage = storage.defineItem<ExtensionSettings>(
  'local:settings',
  {
    defaultValue: defaultSettings,
  }
);
