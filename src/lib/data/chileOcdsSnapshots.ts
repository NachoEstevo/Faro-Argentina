export interface ChileOcdsSnapshotPeriod {
  year: number;
  month: number;
  limit: number;
}

export interface ChileOcdsSnapshotFile {
  fileName: string;
  rawPath: string;
  year: number;
  month: number;
}

export interface ChileOcdsSnapshotPlanOptions {
  override?: string;
  currentYear?: number;
  currentMonth?: number;
  currentLimit?: number;
  historicalYears?: number[];
  historicalMonth?: number;
  historicalLimit?: number;
}

const chileOcdsFilePattern = /^chilecompra-ocds-procesos-(\d{4})-(\d{2})\.sample\.json$/;

export function buildChileOcdsSnapshotPlan({
  override,
  currentYear = 2026,
  currentMonth = 1,
  currentLimit = 500,
  historicalYears = [2019, 2020, 2021, 2022, 2023, 2024, 2025],
  historicalMonth = 1,
  historicalLimit = 25,
}: ChileOcdsSnapshotPlanOptions = {}): ChileOcdsSnapshotPeriod[] {
  const periods = override?.trim()
    ? parseChileOcdsPeriodOverride(override, currentLimit)
    : [
      ...historicalYears.map((year) => ({
        year,
        month: historicalMonth,
        limit: historicalLimit,
      })),
      {
        year: currentYear,
        month: currentMonth,
        limit: currentLimit,
      },
    ];

  return dedupePeriods(periods)
    .filter((period) => isValidPeriod(period))
    .sort(comparePeriods);
}

export function buildChileOcdsRawPath(period: Pick<ChileOcdsSnapshotPeriod, "year" | "month">): string {
  return `data/official/cl/${buildChileOcdsFileName(period)}`;
}

export function buildChileOcdsFileName(period: Pick<ChileOcdsSnapshotPeriod, "year" | "month">): string {
  return `chilecompra-ocds-procesos-${period.year}-${padMonth(period.month)}.sample.json`;
}

export function buildChileOcdsListUrl(period: ChileOcdsSnapshotPeriod): string {
  return `https://api.mercadopublico.cl/APISOCDS/OCDS/listaOCDSAgnoMes/${period.year}/${period.month}/0/${period.limit}`;
}

export function selectChileOcdsSnapshotFiles(fileNames: string[]): ChileOcdsSnapshotFile[] {
  return fileNames
    .flatMap((fileName) => {
      const match = chileOcdsFilePattern.exec(fileName);
      if (!match) return [];
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (!isValidPeriod({ year, month, limit: 1 })) return [];
      return [{
        fileName,
        rawPath: `data/official/cl/${fileName}`,
        year,
        month,
      }];
    })
    .sort(compareSnapshotFiles);
}

function parseChileOcdsPeriodOverride(override: string, defaultLimit: number): ChileOcdsSnapshotPeriod[] {
  return override
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .flatMap((token) => {
      const match = /^(\d{4})-(\d{1,2})(?::(\d+))?$/.exec(token);
      if (!match) return [];
      return [{
        year: Number(match[1]),
        month: Number(match[2]),
        limit: match[3] ? Number(match[3]) : defaultLimit,
      }];
    });
}

function dedupePeriods(periods: ChileOcdsSnapshotPeriod[]): ChileOcdsSnapshotPeriod[] {
  const byKey = new Map<string, ChileOcdsSnapshotPeriod>();
  for (const period of periods) {
    byKey.set(`${period.year}-${period.month}`, period);
  }
  return Array.from(byKey.values());
}

function comparePeriods(left: ChileOcdsSnapshotPeriod, right: ChileOcdsSnapshotPeriod): number {
  return left.year - right.year || left.month - right.month;
}

function compareSnapshotFiles(left: ChileOcdsSnapshotFile, right: ChileOcdsSnapshotFile): number {
  return left.year - right.year || left.month - right.month || left.fileName.localeCompare(right.fileName);
}

function isValidPeriod(period: ChileOcdsSnapshotPeriod): boolean {
  return Number.isInteger(period.year) &&
    period.year >= 2000 &&
    period.year <= 2100 &&
    Number.isInteger(period.month) &&
    period.month >= 1 &&
    period.month <= 12 &&
    Number.isInteger(period.limit) &&
    period.limit > 0;
}

function padMonth(month: number): string {
  return String(month).padStart(2, "0");
}
