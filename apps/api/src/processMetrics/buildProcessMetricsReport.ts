import type { EventLoopDelaySummary } from "#api/processMetrics/EventLoopDelaySummary";
import type { GarbageCollectionSummary } from "#api/processMetrics/GarbageCollectionSummary";
import type { MemorySummary } from "#api/processMetrics/MemorySummary";
import type { ProcessMetricsReport } from "#api/processMetrics/ProcessMetricsReport";
import type { ProcessMetricsSample } from "#api/processMetrics/ProcessMetricsSample";
import type { RoomCounts } from "#api/processMetrics/RoomCounts";

type Params = {
  previous: ProcessMetricsSample;
  current: ProcessMetricsSample;
  eventLoopDelay: EventLoopDelaySummary;
  garbageCollection: GarbageCollectionSummary;
  memory: MemorySummary;
  roomCounts: RoomCounts;
};

type SearchShareParams = { searchActiveMs: number; processCpuMs: number };

const BYTES_PER_MEBIBYTE = 1024 * 1024;

function roundToThousandths(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function toMebibytes(bytes: number): number {
  return Math.round(bytes / BYTES_PER_MEBIBYTE);
}

function getSearchShare({ searchActiveMs, processCpuMs }: SearchShareParams): number {
  if (processCpuMs <= 0) {
    return 0;
  }
  return roundToThousandths(Math.min(1, searchActiveMs / processCpuMs));
}

export function buildProcessMetricsReport({
  previous,
  current,
  eventLoopDelay,
  garbageCollection,
  memory,
  roomCounts,
}: Params): ProcessMetricsReport {
  const intervalMs = Math.max(1, current.atMs - previous.atMs);
  const processCpuMs = (current.processCpuMicros - previous.processCpuMicros) / 1_000;
  const searchActiveMs = current.search.activeMs - previous.search.activeMs;
  const mainThreadActiveMs = current.mainThreadActiveMs - previous.mainThreadActiveMs;
  return {
    intervalMs,
    processCpuCores: roundToThousandths(processCpuMs / intervalMs),
    mainThreadUtilization: roundToThousandths(mainThreadActiveMs / intervalMs),
    eventLoopDelayP99Ms: roundToThousandths(eventLoopDelay.p99Ms),
    eventLoopDelayMaxMs: roundToThousandths(eventLoopDelay.maxMs),
    garbageCollectionPauses: garbageCollection.pauses,
    garbageCollectionTotalMs: roundToThousandths(garbageCollection.totalMs),
    garbageCollectionMaxMs: roundToThousandths(garbageCollection.maxMs),
    heapUsedMb: toMebibytes(memory.heapUsedBytes),
    heapLimitMb: toMebibytes(memory.heapLimitBytes),
    residentMb: toMebibytes(memory.residentBytes),
    searchBusyCores: roundToThousandths(searchActiveMs / intervalMs),
    searchShareOfProcessCpu: getSearchShare({ searchActiveMs, processCpuMs }),
    searchesStarted: current.search.started - previous.search.started,
    searchesCompleted: current.search.completed - previous.search.completed,
    searchDeadlineFallbacks: current.search.fallbacks.deadline - previous.search.fallbacks.deadline,
    searchCapacityFallbacks: current.search.fallbacks.capacity - previous.search.fallbacks.capacity,
    searchErrorFallbacks: current.search.fallbacks.error - previous.search.fallbacks.error,
    ...roomCounts,
  };
}
