import { monitorEventLoopDelay, performance, PerformanceObserver, type ELDHistogram } from "node:perf_hooks";
import { getHeapStatistics } from "node:v8";
import type { LiveSearchWorkerUsage } from "#api/bot/search/LiveSearchWorkerUsage";
import { buildProcessMetricsReport } from "#api/processMetrics/buildProcessMetricsReport";
import type { EventLoopDelaySummary } from "#api/processMetrics/EventLoopDelaySummary";
import type { GarbageCollectionSummary } from "#api/processMetrics/GarbageCollectionSummary";
import type { MemorySummary } from "#api/processMetrics/MemorySummary";
import type { ProcessMetricsSample } from "#api/processMetrics/ProcessMetricsSample";
import type { RoomCounts } from "#api/processMetrics/RoomCounts";
import { log } from "#api/logger";

const PROCESS_METRICS_INTERVAL_MS = 60_000;
const EVENT_LOOP_DELAY_RESOLUTION_MS = 10;
const NANOSECONDS_PER_MILLISECOND = 1_000_000;

type Params = { readSearchUsage: () => LiveSearchWorkerUsage; countRooms: () => RoomCounts };

function drainEventLoopDelay(histogram: ELDHistogram): EventLoopDelaySummary {
  const summary = {
    p99Ms: histogram.percentile(99) / NANOSECONDS_PER_MILLISECOND,
    maxMs: histogram.max / NANOSECONDS_PER_MILLISECOND,
  };
  histogram.reset();
  return summary;
}

function emptyGarbageCollection(): GarbageCollectionSummary {
  return { pauses: 0, totalMs: 0, maxMs: 0 };
}

function readMemory(): MemorySummary {
  const { heapUsed, rss } = process.memoryUsage();
  return { heapUsedBytes: heapUsed, heapLimitBytes: getHeapStatistics().heap_size_limit, residentBytes: rss };
}

export function startProcessMetricsLog({ readSearchUsage, countRooms }: Params): () => void {
  function readSample(): ProcessMetricsSample {
    const { user, system } = process.cpuUsage();
    return {
      atMs: performance.now(),
      processCpuMicros: user + system,
      mainThreadActiveMs: performance.eventLoopUtilization().active,
      search: readSearchUsage(),
    };
  }
  const eventLoopDelayHistogram = monitorEventLoopDelay({ resolution: EVENT_LOOP_DELAY_RESOLUTION_MS });
  eventLoopDelayHistogram.enable();
  let garbageCollection = emptyGarbageCollection();
  const garbageCollectionObserver = new PerformanceObserver((entries) => {
    for (const entry of entries.getEntries()) {
      garbageCollection.pauses += 1;
      garbageCollection.totalMs += entry.duration;
      garbageCollection.maxMs = Math.max(garbageCollection.maxMs, entry.duration);
    }
  });
  garbageCollectionObserver.observe({ entryTypes: ["gc"] });
  let previous = readSample();
  const timer = setInterval(() => {
    const current = readSample();
    log(
      "[aegis/api] process metrics",
      buildProcessMetricsReport({
        previous,
        current,
        eventLoopDelay: drainEventLoopDelay(eventLoopDelayHistogram),
        garbageCollection,
        memory: readMemory(),
        roomCounts: countRooms(),
      }),
    );
    garbageCollection = emptyGarbageCollection();
    previous = current;
  }, PROCESS_METRICS_INTERVAL_MS);
  timer.unref();
  return () => {
    clearInterval(timer);
    eventLoopDelayHistogram.disable();
    garbageCollectionObserver.disconnect();
  };
}
