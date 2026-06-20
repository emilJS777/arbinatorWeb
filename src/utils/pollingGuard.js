const POLL_BACKOFF_BASE_MS = 5000;
const POLL_BACKOFF_MAX_MS = 60000;

export const createPollingRuntime = () => ({
  loadDebugInFlight: false,
  groups: {},
});

export const isUnavailableResponse = response => {
  const status = Number(response?.status || response?.rawError?.response?.status || 0);
  return status === 0 || status === 503;
};

export const backoffDelayForFailures = failures =>
  Math.min(POLL_BACKOFF_MAX_MS, POLL_BACKOFF_BASE_MS * (2 ** Math.max(0, failures - 1)));

const pollGroup = (runtime, name) => {
  if (!runtime.groups[name]) {
    runtime.groups[name] = {inFlight: false, failures: 0, nextAllowedAt: 0};
  }
  return runtime.groups[name];
};

export const runPollingGroup = async ({runtime, name, requests, onUnavailableChange = () => {}, now = Date.now}) => {
  const group = pollGroup(runtime, name);
  const currentTime = now();
  if (group.inFlight || currentTime < group.nextAllowedAt) {
    return {skipped: true, responses: []};
  }

  group.inFlight = true;
  try {
    const settled = await Promise.allSettled(requests.map(requestFactory => requestFactory()));
    const responses = settled.map(result =>
      result.status === "fulfilled"
        ? result.value
        : {data: {success: false, obj: {msg: result.reason?.message || "Request failed"}}, status: result.reason?.response?.status || 0}
    );
    const has503 = responses.some(isUnavailableResponse);
    if (has503) {
      group.failures += 1;
      group.nextAllowedAt = now() + backoffDelayForFailures(group.failures);
      onUnavailableChange(true);
    } else {
      group.failures = 0;
      group.nextAllowedAt = 0;
      onUnavailableChange(false);
    }
    return {skipped: false, responses};
  } finally {
    group.inFlight = false;
  }
};
