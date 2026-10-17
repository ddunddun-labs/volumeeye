export const marketKeys = ['kospi', 'kosdaq', 'upbit', 'bithumb', 'binance'];

export function validateMarketData(data) {
  const fail = message => { throw new Error(message); };
  if (!data || data.schemaVersion !== 1 || typeof data.isSample !== 'boolean') fail('지원하지 않는 데이터 형식');
  if (!data.metadata || data.metadata.unit !== 'KRW' || data.metadata.marketType !== 'spot') fail('거래대금 단위·시장 기준 오류');
  for (const key of ['sources', 'dateBoundary', 'conversion'])
    if (typeof data.metadata[key] !== 'string' || !data.metadata[key].trim()) fail('데이터 집계 설명 누락: ' + key);
  if (typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) || !/(Z|[+-]\d\d:\d\d)$/.test(data.updatedAt)) fail('갱신 시각은 시간대가 포함된 ISO 날짜여야 합니다.');
  if (!Array.isArray(data.rows) || !data.rows.length) fail('일별 데이터가 없습니다.');
  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    if (!row || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) fail('일별 날짜 형식 오류');
    const date = new Date(row.date + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.date) fail('존재하지 않는 날짜: ' + row.date);
    if (i && data.rows[i - 1].date >= row.date) fail('날짜는 중복 없이 오름차순이어야 합니다.');
    for (const market of marketKeys)
      if (row[market] !== null && (!Number.isSafeInteger(row[market]) || row[market] < 0)) fail(row.date + ' 거래대금 오류: ' + market);
  }
  for (const market of marketKeys)
    if (!data.rows.some(row => row[market] !== null)) fail('시장별 데이터가 없습니다: ' + market);
  return data;
}
