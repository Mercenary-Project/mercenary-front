export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';
export type SkillLevel = 'BEGINNER' | 'AMATEUR' | 'SEMI_PRO';

export const POSITION_LABEL: Record<Position, string> = {
  GK: '골키퍼', CB: '센터백', LB: '좌측 수비', RB: '우측 수비',
  CDM: '수비형 미드', CM: '중앙 미드', CAM: '공격형 미드',
  LW: '좌측 윙', RW: '우측 윙', ST: '스트라이커'
};

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  BEGINNER: '입문', AMATEUR: '아마추어', SEMI_PRO: '세미프로'
};

export interface PositionSlot {
  position: Position;
  positionLabel: string;
  required: number;
  filled: number;
  available: number;
}

export interface MatchDetail {
  id: number;
  title: string;
  content: string;
  placeName: string;
  district: string;
  matchDate: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  slots: PositionSlot[];
  isFullyBooked: boolean;
}
