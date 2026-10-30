import { useMemo } from 'react';
import type { ReadingRecord, ServiceRecord, UserRecord } from '../types';
import { encodeChart } from '../lib/chartcode';
import ServiceRecordList from './ServiceRecordList';
import { buildBaziProfile } from '../lib/bazi';
import { buildAstroPerson, sunSignOfDate } from '../lib/astroSynastry';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

export default function ClientProfileSheet({
  user,
  readings,
  services,
  onClose,
  onOpenChart,
  onEdit,
  onNewService,
  onOpenReading,
  onOpenService,
  onDelete,
}: {
  user: UserRecord;
  readings: ReadingRecord[];
  services: ServiceRecord[];
  onClose: () => void;
  onOpenChart: () => void;
  onEdit: () => void;
  onNewService: () => void;
  onOpenReading: (r: ReadingRecord) => void;
  onOpenService: (id: string) => void;
  onDelete: () => void;
}) {
  const mine = readings.filter((r) => r.clientId === user.id);
  const myServices = services.filter((s) => s.clientIds.includes(user.id));

  const bazi = useMemo(() => {
    try { return buildBaziProfile(user.payload, user.name, user.payload.gender); } catch { return null; }
  }, [user]);

  const astro = useMemo(() => {
    try {
      return buildAstroPerson({
        name: user.name,
        date: user.payload.birthday,
        time: user.payload.clockTime || '12:00',
        longitude: user.payload.longitude,
        latitude: user.payload.latitude ?? 30,
        useTrueSolar: user.payload.useTrueSolar,
        sign: sunSignOfDate(user.payload.birthday).sign,
      });
    } catch { return null; }
  }, [user]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="client-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="client-sheet-head">
          <div>
            <div className="inspector-eyebrow">客户档案</div>
            <h2>{user.name} <span>{user.relation}</span></h2>
            <p>{user.payload.birthday} {user.payload.clockTime} · {user.payload.gender} · {user.payload.useTrueSolar ? '真太阳时' : '北京时间'}</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="client-sheet-body">
          <div className="sheet-rows">
            <div><span>出生</span><b>{user.payload.birthday} {user.payload.clockTime}</b></div>
            <div><span>历法</span><b>{user.payload.birthdayType === 'lunar' ? '农历' : '公历'}</b></div>
            <div><span>经度</span><b>{user.payload.longitude}°E</b></div>
            <div><span>备注</span><b>{user.note || '—'}</b></div>
          </div>

          <div className="sheet-section">
            <div className="sheet-section-head">
              <h3>三系统档案</h3>
              <span className="dim">紫微 / 八字 / 星座</span>
            </div>
            <div className="profile-three">
              {bazi && (
                <div>
                  <em>八字</em>
                  <b>日主 {bazi.dayMaster}{bazi.dayMasterEl} · {bazi.strength}</b>
                  <span>用神初判 {bazi.usefulGods.join('、') || '—'}｜{bazi.pillars.map((p) => `${p.stem}${p.branch}`).join(' ')}</span>
                </div>
              )}
              {astro && (
                <div>
                  <em>星座</em>
                  <b>太阳{astro.sun.sign} · 上升{astro.rising.sign}</b>
                  <span>下降{astro.descendant.sign}｜{astro.note}</span>
                </div>
              )}
            </div>
          </div>

          <div className="sheet-section">
            <div className="sheet-section-head">
              <h3>解盘记录</h3>
              <span className="dim">{mine.length} 条</span>
            </div>
            {mine.length ? (
              <div className="reading-records">
                {mine.map((r) => (
                  <button key={r.id} className="reading-record" onClick={() => onOpenReading(r)}>
                    <div>
                      <b>{r.rangeLabel}</b>
                      <span>{r.palace} · {r.view === 'card' ? '宫位卡' : r.view === 'summary' ? '综述' : '命盘'}</span>
                    </div>
                    <em>{r.createdAt}</em>
                  </button>
                ))}
              </div>
            ) : (
              <p className="dim">还没有解盘记录。点“开始解盘”，在解盘页保存一条。</p>
            )}
          </div>

          <div className="sheet-section">
            <div className="sheet-section-head">
              <h3>服务记录</h3>
              <span className="dim">{myServices.length} 条</span>
            </div>
            <ServiceRecordList records={myServices} onOpen={onOpenService} emptyText="还没有服务记录。到「服务」生成起名 / 择日 / 合盘后保存。" />
          </div>
        </div>

        <div className="client-sheet-actions">
          <button className="btn" onClick={onOpenChart}>{mine.length ? '继续解盘' : '开始解盘'}</button>
          <button className="btn ghost" onClick={onNewService}>新建服务</button>
          <button className="btn ghost" onClick={onEdit}>编辑资料</button>
          <button
            className="btn ghost"
            onClick={async () => { await copyText(encodeChart(user.payload)); }}
            title="复制安星码"
          >
            分享安星码
          </button>
          <button className="btn ghost danger-text" onClick={() => { if (window.confirm(`删除客户「${user.name}」？`)) onDelete(); }}>删除</button>
        </div>
      </div>
    </div>
  );
}
