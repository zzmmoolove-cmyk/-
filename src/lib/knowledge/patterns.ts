// 格局知识库：基于星曜落宫的经典格局判定 + 解读。
// 判定函数只依赖排盘结果（星曜所在宫位），不涉及体系分歧。

import type { Palace } from '../../types';

export type Pattern = {
  name: string;
  type: '吉' | '凶' | '中';
  desc: string;
  match: (palaces: Palace[]) => boolean;
};

const P = (palaces: Palace[], name: string): Palace | undefined =>
  palaces.find((p) => p.name === name);

const hasMajor = (p: Palace | undefined, ...names: string[]): boolean =>
  !!p && names.some((n) => p.majorStars.some((s) => s.name === n));

const hasStar = (p: Palace | undefined, ...names: string[]): boolean =>
  !!p && names.some((n) => [...p.majorStars, ...p.minorStars].some((s) => s.name === n));

/** 命宫三方四正：命宫、迁移（对宫）、财帛、官禄 */
const mingSanFang = (palaces: Palace[]): (Palace | undefined)[] => [
  P(palaces, '命宫'),
  P(palaces, '迁移'),
  P(palaces, '财帛'),
  P(palaces, '官禄'),
];

const branch = (p: Palace | undefined): string => p?.earthlyBranch ?? '';

export const PATTERNS: Pattern[] = [
  {
    name: '紫府同宫',
    type: '吉',
    desc: '紫微、天府同宫，帝王与库星相会，主贵气且能聚财，格局宏大、稳重有成。',
    match: (ps) =>
      ps.some((p) => hasMajor(p, '紫微') && hasMajor(p, '天府')),
  },
  {
    name: '君臣庆会',
    type: '吉',
    desc: '紫微坐命，辅弼昌曲魁钺等吉星会照，如帝王得贤臣，主贵显、得人助、格局高。',
    match: (ps) => {
      const ming = P(ps, '命宫');
      return hasMajor(ming, '紫微') && hasStar(ming, '左辅', '右弼', '文昌', '文曲', '天魁', '天钺');
    },
  },
  {
    name: '紫微朝垣',
    type: '吉',
    desc: '紫微坐命宫，帝星得位，主贵气、有领导力，格局清贵。',
    match: (ps) => hasMajor(P(ps, '命宫'), '紫微'),
  },
  {
    name: '天府朝垣',
    type: '吉',
    desc: '天府坐命宫，库星得位，主稳重、善理财守成，家业丰足。',
    match: (ps) => hasMajor(P(ps, '命宫'), '天府'),
  },
  {
    name: '日月并明',
    type: '吉',
    desc: '太阳、太阴同宫于丑未，日月交辉，主光明磊落、贵气与名望并重。',
    match: (ps) =>
      ps.some((p) => hasMajor(p, '太阳') && hasMajor(p, '太阴')),
  },
  {
    name: '日月反背',
    type: '凶',
    desc: '太阳落陷（戌亥）、太阴落陷（辰巳），日月失辉，主劳碌、付出难有回报、易怀才不遇。',
    match: (ps) =>
      ps.some((p) => hasMajor(p, '太阳') && ['戌', '亥'].includes(branch(p))) &&
      ps.some((p) => hasMajor(p, '太阴') && ['辰', '巳'].includes(branch(p))),
  },
  {
    name: '七杀朝斗',
    type: '吉',
    desc: '七杀坐命于寅申，将星得地，主开创、威权、大起大落而后有成，为将帅之格。',
    match: (ps) => {
      const ming = P(ps, '命宫');
      return hasMajor(ming, '七杀') && ['寅', '申'].includes(branch(ming));
    },
  },
  {
    name: '杀破狼',
    type: '中',
    desc: '七杀、破军、贪狼在命宫三方会合，主大变动、大开大合，宜开创，但一生起伏较大。',
    match: (ps) => {
      const sf = mingSanFang(ps);
      return sf.some((p) => hasMajor(p, '七杀')) &&
        sf.some((p) => hasMajor(p, '破军')) &&
        sf.some((p) => hasMajor(p, '贪狼'));
    },
  },
  {
    name: '机月同梁',
    type: '中',
    desc: '天机、太阴、天同、天梁会照命宫三方，主谋略与文职，宜企划、行政、文教，为文人之格。',
    match: (ps) => {
      const sf = mingSanFang(ps);
      return sf.some((p) => hasMajor(p, '天机', '太阴', '天同', '天梁'));
    },
  },
  {
    name: '武曲天府',
    type: '吉',
    desc: '武曲、天府同宫于子午，财星与库星相会，主财库充盈、善理财经营。',
    match: (ps) =>
      ps.some((p) => hasMajor(p, '武曲') && hasMajor(p, '天府')),
  },
  {
    name: '廉贞天相',
    type: '吉',
    desc: '廉贞、天相同宫于子午，才华与辅佐之才兼备，主事业有成、得人缘。',
    match: (ps) =>
      ps.some((p) => hasMajor(p, '廉贞') && hasMajor(p, '天相')),
  },
  {
    name: '天同天梁',
    type: '吉',
    desc: '天同、天梁同宫于寅申，福星与荫星相会，主福寿双全、逢凶化吉。',
    match: (ps) =>
      ps.some((p) => hasMajor(p, '天同') && hasMajor(p, '天梁')),
  },
  {
    name: '巨日同宫',
    type: '吉',
    desc: '巨门、太阳同宫，口才与贵气相济，主以口才、专业扬名，宜传播、法律、教育。',
    match: (ps) =>
      ps.some((p) => hasMajor(p, '巨门') && hasMajor(p, '太阳')),
  },
  {
    name: '马头带箭',
    type: '中',
    desc: '贪狼、擎羊同宫于午坐命，欲望与冲劲并起，成则大富大贵，败则动荡不安。',
    match: (ps) => {
      const ming = P(ps, '命宫');
      return hasMajor(ming, '贪狼') && hasStar(ming, '擎羊') && branch(ming) === '午';
    },
  },
  {
    name: '石中隐玉',
    type: '中',
    desc: '巨门坐命且化忌，如玉藏石中，才华内敛、历经磨砺而后显达，须防口舌是非。',
    match: (ps) => {
      const ming = P(ps, '命宫');
      return hasMajor(ming, '巨门') && ming!.majorStars.some((s) => s.name === '巨门' && s.mutagen === '忌');
    },
  },
];
