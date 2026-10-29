import { useState } from 'react';
import type { Astrolabe, ChartOptions, UserRecord } from '../types';
import NamingTool from './NamingTool';
import DateSelectTool from './DateSelectTool';
import SynastryTool from './SynastryTool';

type ToolKey = 'naming' | 'dates' | 'synastry' | 'team';

const TOOLS: { key: ToolKey; label: string; hint: string }[] = [
  { key: 'naming', label: '起名', hint: '四柱五行 + 字库 + 音律' },
  { key: 'dates', label: '择日', hint: '黄历宜忌 + 生肖冲煞' },
  { key: 'synastry', label: '合盘', hint: '双人关系结构 + 分享卡' },
  { key: 'team', label: '团队', hint: '下一版' },
];

export default function ToolsPanel({
  astrolabe,
  users,
  activeUserId,
  userName,
  userLabel,
  options,
}: {
  astrolabe: Astrolabe | null;
  users: UserRecord[];
  activeUserId: string | null;
  userName?: string;
  userLabel?: string;
  options: ChartOptions;
}) {
  const [tool, setTool] = useState<ToolKey>('naming');
  const defaultSurname = userName ? Array.from(userName)[0] : '';

  return (
    <div className="panel tools-panel">
      <div className="tool-nav">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            className={`tool-nav-item ${tool === t.key ? 'active' : ''}`}
            onClick={() => setTool(t.key)}
          >
            <b>{t.label}</b>
            <span>{t.hint}</span>
          </button>
        ))}
      </div>

      {tool === 'naming' && (
        <NamingTool astrolabe={astrolabe} userLabel={userLabel} defaultSurname={defaultSurname} />
      )}
      {tool === 'dates' && <DateSelectTool astrolabe={astrolabe} userLabel={userLabel} />}
      {tool === 'synastry' && (
        <SynastryTool
          astrolabe={astrolabe}
          users={users}
          activeUserId={activeUserId}
          userName={userName || userLabel?.split(' · ')[0] || '你'}
          options={options}
        />
      )}
      {tool === 'team' && (
        <div className="tool-pane">
          <div className="tool-intro">
            <h3>团队 / 性格测评</h3>
            <p>把命盘翻译成「沟通风格 / 团队角色 / 压力反应」的报告，卖给 HR 与团队建设。客单高，但需要销售能力和岗位角色模型，适合后期。</p>
          </div>
          <div className="team-roadmap">
            <div><b>01</b><span>定义 6–8 个团队角色（推进者 / 协调者 / 洞察者 / 执行者…）</span></div>
            <div><b>02</b><span>把命宫、福德、官禄的主星与三方四正映射到角色评分</span></div>
            <div><b>03</b><span>输出个人一页纸 + 团队配置建议，而不是「算命」</span></div>
            <div><b>04</b><span>先做 3 家团队的免费试点，换案例与转介绍</span></div>
          </div>
          <p className="tool-note">这一版先留入口，不生成报告。等你确定角色模型和交付模板，再接入。</p>
        </div>
      )}
    </div>
  );
}
