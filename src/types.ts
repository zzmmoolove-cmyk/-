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
  /** 出生地纬度（上升星座用；随城市自动带入） */
  latitude?: number;
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

export type ClientCategory = 'family' | 'friend' | 'work' | 'client' | 'celebrity' | 'other';

/** 一条用户档案：姓名/关系 + 出生信息 + 排盘设置 */
export type UserRecord = {
  id: string;
  name: string;
  relation: Relation;
  note: string;
  savedAt: string;
  updatedAt: string;
  category?: ClientCategory;
  isExample?: boolean;
  payload: BirthInput & ChartOptions;
};

export type ServiceType = 'naming' | 'dates' | 'synastry' | 'investment' | 'team';
export type ServiceStatus = 'draft' | 'delivered';

export type ServiceDraft = {
  type: ServiceType;
  title: string;
  summary: string;
  detail: string;
  clientIds?: string[];
  clientNames?: string[];
};

export type ServiceRecord = {
  id: string;
  type: ServiceType;
  title: string;
  summary: string;
  detail: string;
  clientIds: string[];
  clientNames: string[];
  createdAt: string;
  status: ServiceStatus;
};

export type ReadingRecord = {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  rangeLabel: string;
  view: 'chart' | 'card' | 'summary';
  palace: string;
  layers: {
    decadal: number | null;
    yearly: number | null;
    monthly: number | null;
    daily: string | null;
  };
  summary: string;
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
