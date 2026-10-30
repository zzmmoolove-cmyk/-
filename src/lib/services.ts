import type { ServiceType } from '../types';

export const SERVICE_LABELS: Record<ServiceType, string> = {
  naming: '起名',
  dates: '择日',
  synastry: '合盘',
  team: '团队',
};

export function serviceLabel(type: ServiceType): string {
  return SERVICE_LABELS[type] ?? type;
}
