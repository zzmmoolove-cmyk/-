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

export type Relation =
  | '本人'
  | '父亲'
  | '母亲'
  | '配偶'
  | '子女'
  | '兄弟'
  | '姐妹'
  | '朋友'
  | '同事'
  | '客户'
  | '其他';

export type UserProfile = {
  name: string;
  relation: Relation;
  note: string;
};

/** 一条用户档案：姓名/关系 + 出生信息 + 排盘设置 */
export type UserRecord = {
  id: string;
  name: string;
  relation: Relation;
  note: string;
  savedAt: string;
  updatedAt: string;
  payload: BirthInput & ChartOptions;
};

export type UserSummary = {
  id: string;
  name: string;
  relation: Relation;
  birthday: string;
  savedAt: string;
};

export type HistoryItem = {
  id: string;
  savedAt: string;
  label: string;
  payload: BirthInput & ChartOptions;
};
