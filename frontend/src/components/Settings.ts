export interface Settings {
  textScale: number;
  playbackRate: number;
  colorBlind: boolean;
}

export const defaultSettings: Settings = {
  textScale: 1,
  playbackRate: 1,
  colorBlind: false,
};
