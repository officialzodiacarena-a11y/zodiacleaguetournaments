export function mapLeagueRpcError(message: string): { status: number; code: string; message: string } {
  const code = message.split(':')[0]?.trim() || 'UNKNOWN';

  switch (code) {
    case 'FORBIDDEN':
      return { status: 403, code, message: 'ไม่มีสิทธิ์ทำรายการนี้' };
    case 'NOT_VLP_CIRCUIT':
      return { status: 409, code, message: 'รายการนี้ใช้ได้เฉพาะลีก VLP' };
    case 'CIRCUIT_NOT_FOUND':
    case 'TOURNAMENT_NOT_FOUND':
    case 'SEASON_NOT_FOUND':
    case 'TEAM_NOT_FOUND':
    case 'TX_NOT_FOUND':
    case 'MOVE_NOT_FOUND':
      return { status: 404, code, message: 'ไม่พบข้อมูล' };
    case 'INVALID_TIER':
    case 'INVALID_PLACEMENTS':
    case 'INVALID_DECISION':
    case 'INVALID_NEXT_SEASON':
    case 'REASON_REQUIRED':
    case 'POINTS_REQUIRED':
    case 'REASON_AND_KEY_REQUIRED':
    case 'CANNOT_REVERSE_REVERSAL':
      return { status: 400, code, message: `ข้อมูลไม่ถูกต้อง: ${code}` };
    case 'ALREADY_REVERSED':
    case 'ALREADY_DECIDED':
    case 'KEY_ALREADY_USED_WITH_DIFFERENT_VALUE':
    case 'PENDING_MOVES':
    case 'NEXT_SEASON_MISMATCH':
    case 'SEASON_QUARTER_MISSING':
      return { status: 409, code, message: `ทำรายการซ้ำหรือยังไม่พร้อม: ${code}` };
    default:
      return { status: 500, code, message: 'ระบบขัดข้อง ลองใหม่อีกครั้ง' };
  }
}
