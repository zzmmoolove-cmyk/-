export type Star = {
  name: string;
  type: string;
  brightness?: string;
  mutagen?: string;
};

export type Decadal = {
  range: [number, number];
  heavenlyStem: string;
  earthlyBranch: string;
};

export type Palace = {
  index: number;
  name: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Star[];
  minorStars: Star[];
  adjectiveStars: Star[];
  changsheng12: string;
  boshi12: string;
  decadal: Decadal;
  ages: number[];
};

export type Astrolabe = {
  gender: string;
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  sign: string;
  zodiac: string;
  fiveElementsClass: string;
  soul: string;
  body: string;
  palaces: Palace[];
  decadalList: Decadal[];
};

export type BirthInput = {
  birthday: string;
  /** 钟表时间 HH:MM（出生时刻） */
  clockTime: string;
  gender: '男' | '女';
  birthdayType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  fixLeap: boolean;
  /** 是否启用真太阳时校正 */
  useTrueSolar: boolean;
  /** 出生地经度（真太阳时用） */
  longitude: number;
};

export type ChartOptions = {
  algorithm: 'default' | 'zhongzhou';
  yearDivide: 'normal' | 'exact';
  ageDivide: 'normal' | 'birthday';
  horoscopeDivide: 'normal' | 'exact';
  dayDivide: 'current' | 'forward';
};

export type HistoryItem = {
  id: string;
  savedAt: string;
  label: string;
  payload: BirthInput & ChartOptions;
};
